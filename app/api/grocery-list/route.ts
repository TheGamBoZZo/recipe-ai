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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  const { week } = await req.json();
  const weekStart = getWeekStart(new Date(week));

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

  const prompt = `Consolidate these recipe ingredients into an organized grocery list. Combine duplicates, sum quantities where possible. Group by category.

${allIngredients}

Respond ONLY with valid JSON (no markdown):
{
  "categories": [
    {
      "name": "Produce",
      "items": ["3 cloves garlic", "1 large onion", "2 tomatoes"]
    }
  ]
}`;

  try {
    const text = await callAI({ prompt, maxTokens: 1000 });
    const clean = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(clean);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
