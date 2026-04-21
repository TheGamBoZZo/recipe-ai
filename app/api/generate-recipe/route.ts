import { auth } from "@/lib/auth";
import { callAI } from "@/lib/ai";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { ingredients, cuisine, dietary, servings } = await req.json();

  const prompt = `You are an expert chef and culinary writer. Generate a complete, delicious recipe using the provided ingredients.

Ingredients available: ${ingredients}
${cuisine ? `Cuisine style: ${cuisine}` : ""}
${dietary ? `Dietary requirements: ${dietary}` : ""}
${servings ? `Servings: ${servings}` : "Servings: 4"}

Respond ONLY with valid JSON in this exact structure (no markdown, no explanation):
{
  "title": "Recipe Name",
  "description": "A mouth-watering 2-sentence description of the dish",
  "prepTime": "15 mins",
  "cookTime": "30 mins",
  "servings": 4,
  "difficulty": "Easy|Medium|Hard",
  "cuisine": "Italian",
  "tags": ["vegetarian", "quick"],
  "ingredients": [
    "200g pasta",
    "2 cloves garlic, minced"
  ],
  "steps": [
    "Bring a large pot of salted water to a boil.",
    "While water heats, mince the garlic and slice the vegetables."
  ]
}

Be creative, specific with quantities and techniques. Make it genuinely delicious.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await callAI({
          prompt,
          maxTokens: 1500,
          onChunk: (text) => controller.enqueue(encoder.encode(text)),
        });
        controller.close();
      } catch (err) {
        console.error("[generate-recipe] All providers failed:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
