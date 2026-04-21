/**
 * AI Client — Gemini first, OpenRouter (free) as fallback
 *
 * Gemini free tier resets daily at midnight Pacific.
 * OpenRouter free models kick in automatically if Gemini is rate-limited.
 *
 * Add to .env.local:
 *   GEMINI_API_KEY=AIza...        (aistudio.google.com/app/apikey)
 *   OPENROUTER_API_KEY=sk-or-...  (openrouter.ai/settings/keys)
 */

export type StreamChunkCallback = (text: string) => void;

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function callGemini(
  prompt: string,
  maxTokens: number,
  onChunk?: StreamChunkCallback
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) throw new Error("No GEMINI_API_KEY");

  const streaming = !!onChunk;
  const model = "gemini-2.0-flash";
  const action = streaming ? "streamGenerateContent" : "generateContent";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  if (streaming) {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim().replace(/^,/, "");
        if (!trimmed || trimmed === "[" || trimmed === "]") continue;
        try {
          const parsed = JSON.parse(trimmed);
          const text: string = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (text) {
            full += text;
            onChunk!(text);
          }
        } catch {
          // partial JSON chunk — keep buffering
        }
      }
    }
    return full;
  } else {
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
}

// ─── OpenRouter (free models) ─────────────────────────────────────────────────
// Tries each free model in order until one works.
// All are $0 — no billing needed, just a free OpenRouter account.

const FREE_MODELS = [
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B"    },
  { id: "deepseek/deepseek-r1:free",              label: "DeepSeek R1"       },
  { id: "deepseek/deepseek-chat-v3-0324:free",    label: "DeepSeek V3"       },
  { id: "google/gemma-3-27b-it:free",             label: "Gemma 3 27B"       },
  { id: "mistralai/mistral-7b-instruct:free",     label: "Mistral 7B"        },
  { id: "qwen/qwen3-8b:free",                     label: "Qwen3 8B"          },
  { id: "openrouter/free",                        label: "OpenRouter auto"   },
];

async function callOpenRouterModel(
  modelId: string,
  label: string,
  prompt: string,
  maxTokens: number,
  onChunk?: StreamChunkCallback
): Promise<string> {
  const streaming = !!onChunk;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Mise Recipe AI",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: maxTokens,
      stream: streaming,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter (${label}) HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  if (streaming) {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          const text: string = json.choices?.[0]?.delta?.content ?? "";
          if (text) {
            full += text;
            onChunk!(text);
          }
        } catch {
          // partial SSE chunk
        }
      }
    }
    return full;
  } else {
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
}

async function callOpenRouter(
  prompt: string,
  maxTokens: number,
  onChunk?: StreamChunkCallback
): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("No OPENROUTER_API_KEY");

  let lastErr: unknown;
  for (const { id, label } of FREE_MODELS) {
    try {
      console.log(`[AI]   ↳ trying ${label}...`);
      const result = await callOpenRouterModel(id, label, prompt, maxTokens, onChunk);
      console.log(`[AI]   ✓ ${label} succeeded`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 120) : String(err);
      console.warn(`[AI]   ✗ ${label} failed: ${msg}`);
      lastErr = err;
    }
  }
  throw lastErr;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function callAI({
  prompt,
  maxTokens = 1500,
  onChunk,
}: {
  prompt: string;
  maxTokens?: number;
  onChunk?: StreamChunkCallback;
}): Promise<string> {
  const providers = [
    { name: "Gemini",      fn: callGemini      },
    { name: "OpenRouter",  fn: callOpenRouter  },
  ];

  let lastError: unknown;

  for (const { name, fn } of providers) {
    try {
      console.log(`[AI] Trying ${name}...`);
      const result = await fn(prompt, maxTokens, onChunk);
      console.log(`[AI] ✓ ${name} succeeded`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("No ")) {
        console.log(`[AI] Skipping ${name} — no API key set`);
      } else {
        console.warn(`[AI] ✗ ${name} failed: ${msg.slice(0, 200)}`);
      }
      lastError = err;
    }
  }

  throw new Error(
    `All AI providers failed. ` +
    `Check that GEMINI_API_KEY and/or OPENROUTER_API_KEY are set in .env.local. ` +
    `Last error: ${lastError instanceof Error ? lastError.message.slice(0, 200) : lastError}`
  );
}
