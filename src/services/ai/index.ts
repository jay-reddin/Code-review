export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type ChatResult = { content: string; provider: 'pollinations' | 'puter'; model?: string };

export interface AIProvider {
  name: 'pollinations' | 'puter';
  available: () => Promise<boolean>;
  chat: (messages: ChatMessage[], options?: { model?: string; timeoutMs?: number; signal?: AbortSignal }) => Promise<ChatResult>;
}

async function withTimeout<T>(p: Promise<T>, ms: number, msg = 'Request timed out'): Promise<T> {
  let t: any;
  const timeout = new Promise<never>((_, reject) => (t = setTimeout(() => reject(new Error(msg)), ms)));
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t);
  }
}

// Pollinations primary provider
export const pollinationsProvider: AIProvider = {
  name: 'pollinations',
  available: async () => true,
  chat: async (messages, options) => {
    const body = {
      messages,
      model: options?.model ?? 'openai/gpt-4o-mini',
      seed: Math.floor(Math.random() * 1e9),
    };

    const url = 'https://text.pollinations.ai/';
    const timeoutMs = options?.timeoutMs ?? 30000;
    const maxAttempts = 2;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const controller = new AbortController();
      const signal = controller.signal;
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`Pollinations error ${res.status}`);
        const raw = await res.text();
        let text: string | null = null;
        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed === 'string') text = parsed;
          else if (parsed && typeof parsed === 'object' && parsed.content) text = String(parsed.content);
        } catch (e) {
          // not JSON, fallback to raw text
        }
        if (!text) text = raw;
        if (!text) throw new Error('Empty response');
        return { content: String(text), provider: 'pollinations' as const, model: body.model };
      } catch (err: any) {
        clearTimeout(timer);
        // if aborted due to timeout, treat as timeout
        if (err.name === 'AbortError' || (err.message && err.message.toLowerCase().includes('timed out'))) {
          // retry unless last attempt
          if (attempt < maxAttempts - 1) {
            // exponential backoff
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            continue;
          }
          throw new Error('Request timed out');
        }
        // for other errors, retry once then bubble
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    throw new Error('Pollinations failed after retries');
  },
};

// Puter secondary provider
export const puterProvider: AIProvider = {
  name: 'puter',
  available: async () => Boolean(window.puter?.ai?.chat),
  chat: async (messages, options) => {
    const api = window.puter?.ai;
    if (!api?.chat) throw new Error('Puter AI not available');
    const r = await withTimeout(api.chat({ messages, model: options?.model }), options?.timeoutMs ?? 30000);
    if (!r?.content) throw new Error('Empty response');
    return { content: r.content, provider: 'puter', model: options?.model };
  },
};

export async function dualChat(messages: ChatMessage[], opts?: { preferred?: 'pollinations' | 'puter'; model?: string; timeoutMs?: number }) {
  const order: AIProvider[] = [];
  if (opts?.preferred === 'puter') order.push(puterProvider, pollinationsProvider);
  else order.push(pollinationsProvider, puterProvider);

  let lastError: unknown = null;
  for (const provider of order) {
    try {
      if (!(await provider.available())) continue;
      return await provider.chat(messages, { model: opts?.model, timeoutMs: opts?.timeoutMs });
    } catch (e) {
      lastError = e;
      // try next
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All providers failed');
}
