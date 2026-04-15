import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function getWeekStart(date: Date) {
  const d = new Date(date);
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
  const weekStart = getWeekStart(
    new Date(searchParams.get("week") || Date.now())
  );

  const plan = await prisma.mealPlan.findUnique({
    where: { userId_weekStart: { userId: session.user.id, weekStart } },
    include: { slots: { include: { recipe: true } } },
  });

  return NextResponse.json(plan || { slots: [] });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const { week, dayOfWeek, mealType, recipeId } = await req.json();
  const weekStart = getWeekStart(new Date(week));

  let plan = await prisma.mealPlan.findUnique({
    where: { userId_weekStart: { userId: session.user.id, weekStart } },
  });

  if (!plan) {
    plan = await prisma.mealPlan.create({
      data: { userId: session.user.id, weekStart },
    });
  }

  // Upsert slot
  const existing = await prisma.mealSlot.findFirst({
    where: { mealPlanId: plan.id, dayOfWeek, mealType },
  });

  if (existing) {
    await prisma.mealSlot.update({
      where: { id: existing.id },
      data: { recipeId },
    });
  } else {
    await prisma.mealSlot.create({
      data: { mealPlanId: plan.id, dayOfWeek, mealType, recipeId },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const { slotId } = await req.json();
  await prisma.mealSlot.delete({ where: { id: slotId } });
  return NextResponse.json({ ok: true });
}
