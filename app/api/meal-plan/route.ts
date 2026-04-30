import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"] as const;
type MealType = typeof MEAL_TYPES[number];

function getWeekStart(date: Date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekStart = getWeekStart(new Date(searchParams.get("week") || Date.now()));
  if (!weekStart) return NextResponse.json({ error: "Invalid week" }, { status: 400 });

  const plan = await prisma.mealPlan.findUnique({
    where: { userId_weekStart: { userId: session.user.id, weekStart } },
    include: { slots: { include: { recipe: true } } },
  });

  return NextResponse.json(plan || { slots: [] });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { week, dayOfWeek, mealType, recipeId } = body as Record<string, unknown>;

  // Validate inputs
  const weekStart = getWeekStart(new Date(week as string));
  if (!weekStart) return NextResponse.json({ error: "Invalid week" }, { status: 400 });

  if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6)
    return NextResponse.json({ error: "Invalid dayOfWeek" }, { status: 400 });

  if (!MEAL_TYPES.includes(mealType as MealType))
    return NextResponse.json({ error: "Invalid mealType" }, { status: 400 });

  if (typeof recipeId !== "string" || recipeId.length > 50)
    return NextResponse.json({ error: "Invalid recipeId" }, { status: 400 });

  // Verify the recipe belongs to this user before assigning it
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe || recipe.userId !== session.user.id)
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  let plan = await prisma.mealPlan.findUnique({
    where: { userId_weekStart: { userId: session.user.id, weekStart } },
  });
  if (!plan) {
    plan = await prisma.mealPlan.create({ data: { userId: session.user.id, weekStart } });
  }

  const existing = await prisma.mealSlot.findFirst({
    where: { mealPlanId: plan.id, dayOfWeek: dayOfWeek as number, mealType: mealType as string },
  });

  if (existing) {
    await prisma.mealSlot.update({ where: { id: existing.id }, data: { recipeId: recipeId as string } });
  } else {
    await prisma.mealSlot.create({ data: { mealPlanId: plan.id, dayOfWeek: dayOfWeek as number, mealType: mealType as string, recipeId: recipeId as string } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { slotId } = body as Record<string, unknown>;
  if (typeof slotId !== "string" || slotId.length > 50)
    return NextResponse.json({ error: "Invalid slotId" }, { status: 400 });

  // Verify ownership before deleting
  const slot = await prisma.mealSlot.findUnique({
    where: { id: slotId },
    include: { mealPlan: true },
  });
  if (!slot || slot.mealPlan.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.mealSlot.delete({ where: { id: slotId } });
  return NextResponse.json({ ok: true });
}
