import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
        const anthropicStream = client.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        });

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
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
