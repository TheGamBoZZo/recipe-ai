import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `Consolidate these recipe ingredients into an organized grocery list. Combine duplicates, sum quantities where possible. Group by category.

${allIngredients}

Respond ONLY with valid JSON (no markdown):
{
  "categories": [
    {
      "name": "Produce",
      "items": ["3 cloves garlic", "1 large onion", "2 tomatoes"]
    }
  ]
}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(clean);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
