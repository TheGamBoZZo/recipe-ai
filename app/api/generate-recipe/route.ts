import { auth } from "@/lib/auth";
import { callAI } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

const MAX_INGREDIENTS = 30;
const MAX_STRING      = 100;

function sanitise(val: unknown, max = MAX_STRING): string {
  if (typeof val !== "string") return "";
  // Strip any HTML/script tags — AI output passes through here
  return val.replace(/<[^>]*>/g, "").slice(0, max).trim();
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  // Rate limit: 5 recipe generations per user per minute
  const { allowed, retryAfterMs } = rateLimit(session.user.id, { maxRequests: 5, windowMs: 60_000 });
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment before generating again." }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }

  const b = body as Record<string, unknown>;

  // Sanitise all inputs
  const selectedIngredients = Array.isArray(b.selectedIngredients)
    ? b.selectedIngredients.slice(0, MAX_INGREDIENTS).map((i) => sanitise(i))
    : [];

  if (selectedIngredients.length === 0)
    return new Response("No ingredients provided", { status: 400 });

  const cuisine  = sanitise(b.cuisine);
  const cookTime = sanitise(b.cookTime, 30);
  const halal    = b.halal === true;
  const servings = typeof b.servings === "string" && ["1","2","4","6","8"].includes(b.servings)
    ? b.servings : "4";

  const prompt = `You are an expert chef. Generate a delicious recipe using primarily these ingredients the user already has.

User's ingredients: ${selectedIngredients.join(", ")}
${cuisine ? `Cuisine style: ${cuisine}` : ""}
Servings: ${servings}
${cookTime ? `IMPORTANT: Total cook + prep time must be ${cookTime} or less.` : ""}
${halal ? "HALAL ONLY: Absolutely NO pork, bacon, ham, lard, gelatin, alcohol, wine, beer, or any pork-derived products." : ""}

Mark each ingredient with HAS: (user has it) or NEED: (must buy, keep minimal).

Respond ONLY with valid JSON:
{
  "title": "Recipe Name",
  "description": "2-sentence description",
  "prepTime": "10 mins",
  "cookTime": "20 mins",
  "servings": 4,
  "difficulty": "Easy",
  "cuisine": "Italian",
  "tags": ["quick"],
  "ingredients": ["HAS:200g chicken breast", "NEED:1 lemon"],
  "steps": ["Step one.", "Step two."]
}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await callAI({ prompt, maxTokens: 1500, onChunk: (text) => controller.enqueue(encoder.encode(text)) });
        controller.close();
      } catch (err) {
        console.error("[generate-recipe] All providers failed:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" },
  });
}
