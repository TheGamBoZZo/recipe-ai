import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callAI } from "@/lib/ai";
import { NextResponse } from "next/server";

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
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

// GET all lists for the user
export async function PUT(req: Request) {
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

  // Get meal plan for that week
  const plan = await prisma.mealPlan.findUnique({
    where: { userId_weekStart: { userId: session.user.id, weekStart } },
    include: { slots: { include: { recipe: true } } },
  });

  if (!plan || plan.slots.length === 0) {
    return NextResponse.json({ categories: [] });
  }

  const allIngredients = plan.slots
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
    // Extract JSON robustly
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    const parsed = JSON.parse(start !== -1 ? clean.slice(start, end + 1) : clean);
    categories = parsed.categories ?? [];
  } catch {
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
