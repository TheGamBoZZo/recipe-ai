import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callAI } from "@/lib/ai";
import { NextResponse } from "next/server";

// Build a date range covering the entire week (Mon 00:00 to Sun 23:59 UTC)
// so we catch meal plans regardless of what time/timezone they were created in
function getWeekRange(date: Date): { gte: Date; lte: Date } {
  const d = new Date(date);
  // Normalise to UTC midnight
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return { gte: monday, lte: sunday };
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d;
}

// GET — load a saved grocery list for a given week
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null, { status: 401 });

  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week");
  if (!week) return NextResponse.json(null, { status: 400 });

  const weekStart = getWeekStart(new Date(week));

  const list = await prisma.groceryList.findUnique({
    where: { userId_weekStart: { userId: session.user.id, weekStart } },
    include: { categories: { include: { items: true } } },
  });

  return NextResponse.json(list);
}

// PUT — get all saved lists for the user
export async function PUT(_req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const lists = await prisma.groceryList.findMany({
    where: { userId: session.user.id },
    include: { categories: { include: { items: true } } },
    orderBy: { weekStart: "desc" },
  });

  return NextResponse.json(lists);
}

// POST — generate and save a grocery list for a week
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const { week } = await req.json();
  const weekStart = getWeekStart(new Date(week));
  const weekRange = getWeekRange(new Date(week));

  console.log(`[grocery] Looking for meal plans between ${weekRange.gte.toISOString()} and ${weekRange.lte.toISOString()}`);

  // Use a date range query instead of exact match to handle timezone offsets
  const plans = await prisma.mealPlan.findMany({
    where: {
      userId: session.user.id,
      weekStart: weekRange,
    },
    include: { slots: { include: { recipe: true } } },
  });

  console.log(`[grocery] Found ${plans.length} meal plan(s)`);

  // Flatten all slots from all matching plans
  const allSlots = plans.flatMap((p) => p.slots);

  console.log(`[grocery] Total slots: ${allSlots.length}`);

  if (allSlots.length === 0) {
    // Debug: show what plans exist for this user
    const allPlans = await prisma.mealPlan.findMany({
      where: { userId: session.user.id },
      select: { weekStart: true, id: true },
    });
    console.log(`[grocery] All plans for user:`, allPlans.map(p => p.weekStart.toISOString()));
    return NextResponse.json({ categories: [] });
  }

  const allIngredients = allSlots
    .map((s) => `${s.recipe.title}:\n${s.recipe.ingredients.join("\n")}`)
    .join("\n\n");

  const prompt = `Consolidate these recipe ingredients into an organized grocery list. Combine duplicates, sum quantities. Group by category.

${allIngredients}

Respond ONLY with valid JSON (no markdown):
{
  "categories": [
    { "name": "Produce", "items": ["3 cloves garlic", "1 large onion"] }
  ]
}`;

  let categories: { name: string; items: string[] }[] = [];

  try {
    const text = await callAI({ prompt, maxTokens: 1000 });
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    const parsed = JSON.parse(start !== -1 ? clean.slice(start, end + 1) : clean);
    categories = parsed.categories ?? [];
  } catch (e) {
    console.error("[grocery] AI failed:", e);
    return NextResponse.json({ categories: [] });
  }

  if (categories.length === 0) return NextResponse.json({ categories: [] });

  // Upsert: delete existing list for this week then create fresh
  await prisma.groceryList.deleteMany({
    where: { userId: session.user.id, weekStart },
  });

  const saved = await prisma.groceryList.create({
    data: {
      userId: session.user.id,
      weekStart,
      categories: {
        create: categories.map((cat) => ({
          name: cat.name,
          items: {
            create: cat.items.map((text) => ({ text, checked: false })),
          },
        })),
      },
    },
    include: { categories: { include: { items: true } } },
  });

  return NextResponse.json(saved);
}

// DELETE — remove a grocery list
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const { week } = await req.json();
  const weekStart = getWeekStart(new Date(week));

  await prisma.groceryList.deleteMany({
    where: { userId: session.user.id, weekStart },
  });

  return NextResponse.json({ ok: true });
}