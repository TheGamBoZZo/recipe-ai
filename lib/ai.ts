/**
 * AI Client — Gemini first, OpenRouter (free) as fallback
 *
 * OpenRouter strategy:
 * 1. Fetch live free models from the OpenRouter /models API at runtime
 * 2. Try each one in order
 * 3. Always end with "openrouter/free" — their built-in auto-router that
 *    picks whatever free model is available right now
 *
 * This means the list never goes stale.
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
  const action = streaming ? "streamGenerateContent" : "generateContent";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:${action}?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
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
          if (text) { full += text; onChunk!(text); }
        } catch { /* partial chunk */ }
      }
    }
    return full;
  } else {
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
}

// ─── OpenRouter ───────────────────────────────────────────────────────────────

// Fetch currently live free model IDs from OpenRouter's models API.
// Cached for the process lifetime so we don't hit it on every request.
let cachedFreeModelIds: string[] | null = null;

async function getLiveFreeModels(apiKey: string): Promise<string[]> {
  if (cachedFreeModelIds) return cachedFreeModelIds;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models?supported_parameters=max_tokens", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`models API ${res.status}`);

    const data = await res.json();
    // A model is free when both input and output pricing are "0"
    const freeIds: string[] = (data.data ?? [])
      .filter((m: { pricing: { prompt: string; completion: string } }) =>
        m.pricing?.prompt === "0" && m.pricing?.completion === "0"
      )
      .map((m: { id: string }) => m.id)
      .slice(0, 10); // cap at 10 to keep failover fast

    console.log(`[AI] OpenRouter: found ${freeIds.length} live free models`);
    cachedFreeModelIds = [...freeIds, "openrouter/free"]; // always end with the auto-router
    return cachedFreeModelIds;
  } catch (err) {
    console.warn("[AI] Could not fetch OpenRouter model list, falling back to auto-router:", err);
    return ["openrouter/free"];
  }
}

async function callOpenRouterModel(
  modelId: string,
  prompt: string,
  maxTokens: number,
  onChunk?: StreamChunkCallback,
  apiKey?: string
): Promise<string> {
  const streaming = !!onChunk;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
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
          if (text) { full += text; onChunk!(text); }
        } catch { /* partial SSE chunk */ }
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

  const apiKey = process.env.OPENROUTER_API_KEY;
  const models = await getLiveFreeModels(apiKey);

  let lastErr: unknown;
  for (const modelId of models) {
    try {
      console.log(`[AI]   ↳ trying ${modelId}`);
      const result = await callOpenRouterModel(modelId, prompt, maxTokens, onChunk, apiKey);
      console.log(`[AI]   ✓ ${modelId} succeeded`);
      return result;
    } catch (err) {
      console.warn(`[AI]   ✗ ${modelId} failed: ${err instanceof Error ? err.message.slice(0, 120) : err}`);
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
    { name: "Gemini",     fn: callGemini     },
    { name: "OpenRouter", fn: callOpenRouter },
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
    `All AI providers failed. Gemini quota resets daily at midnight Pacific. ` +
    `Make sure GEMINI_API_KEY and OPENROUTER_API_KEY are both set in .env.local. ` +
    `Last error: ${lastError instanceof Error ? lastError.message.slice(0, 200) : lastError}`
  );
}
