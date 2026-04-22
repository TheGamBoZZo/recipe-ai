import { auth } from "@/lib/auth";
import { callAI } from "@/lib/ai";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { selectedIngredients, cuisine, servings, halal, cookTime } = await req.json();
  const userHas = selectedIngredients as string[];

  const prompt = `You are an expert chef. Generate a delicious recipe using primarily these ingredients the user already has.

User's ingredients: ${userHas.join(", ")}
${cuisine ? `Cuisine style: ${cuisine}` : ""}
Servings: ${servings || 4}
${cookTime ? `IMPORTANT: Total cook + prep time must be ${cookTime} or less. Keep it achievable in that time.` : ""}
${halal ? "HALAL ONLY: Absolutely NO pork, bacon, ham, lard, gelatin, alcohol, wine, beer, or any pork-derived products. Use halal-certified alternatives only." : ""}

In the ingredients list, mark each with HAS: or NEED: prefix:
- HAS: = ingredient the user already has
- NEED: = additional essential ingredient they must buy (keep these minimal)

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "title": "Recipe Name",
  "description": "A mouth-watering 2-sentence description",
  "prepTime": "10 mins",
  "cookTime": "20 mins",
  "servings": 4,
  "difficulty": "Easy",
  "cuisine": "Italian",
  "tags": ["quick"],
  "ingredients": [
    "HAS:200g chicken breast",
    "HAS:3 cloves garlic",
    "NEED:1 lemon"
  ],
  "steps": [
    "Season the chicken with salt and pepper.",
    "Heat oil in a pan over medium-high heat."
  ]
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
