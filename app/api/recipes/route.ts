import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Allowed fields — never spread raw user input directly into Prisma
const ALLOWED_TAGS = 50;
const MAX_STRING   = 2000;
const MAX_ARRAY    = 100;

function sanitiseString(val: unknown, max = MAX_STRING): string {
  if (typeof val !== "string") return "";
  return val.slice(0, max).trim();
}

function sanitiseStringArray(val: unknown, maxItems = MAX_ARRAY): string[] {
  if (!Array.isArray(val)) return [];
  return val.slice(0, maxItems).map((s) => sanitiseString(s));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });

  const recipes = await prisma.recipe.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(recipes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const b = body as Record<string, unknown>;

  // Whitelist and sanitise every field — never trust raw AI output directly
  const recipe = await prisma.recipe.create({
    data: {
      userId:      session.user.id,
      title:       sanitiseString(b.title, 200)       || "Untitled Recipe",
      description: sanitiseString(b.description, 500) || "",
      cuisine:     sanitiseString(b.cuisine, 100),
      prepTime:    sanitiseString(b.prepTime, 50),
      cookTime:    sanitiseString(b.cookTime, 50),
      difficulty:  sanitiseString(b.difficulty, 20),
      servings:    typeof b.servings === "number" && b.servings > 0 && b.servings < 100
                     ? Math.floor(b.servings) : null,
      ingredients: sanitiseStringArray(b.ingredients),
      steps:       sanitiseStringArray(b.steps),
      tags:        sanitiseStringArray(b.tags, ALLOWED_TAGS),
    },
  });

  return NextResponse.json(recipe, { status: 201 });
}
