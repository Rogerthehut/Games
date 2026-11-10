import Anthropic from "@anthropic-ai/sdk";

export interface Completion { text: string; refused: boolean }
export interface CompletionRequest {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
}
/** The tutor only needs this one capability, so tests can swap in a scripted model. */
export interface Provider { complete(req: CompletionRequest): Promise<Completion> }

export interface AnthropicConfig {
  model: string;
  effort: "low" | "medium" | "high";
  maxTokens: number;
  timeoutMs: number;
}

export const DEFAULT_CONFIG: AnthropicConfig = {
  model: process.env.TUTOR_MODEL ?? "claude-opus-5-5",
  effort: (process.env.TUTOR_EFFORT as AnthropicConfig["effort"]) ?? "low",
  // The reply is short, but thinking tokens count towards max_tokens, so leave generous room.
  maxTokens: 4000,
  timeoutMs: 30_000,
};

export class AnthropicProvider implements Provider {
  private client: Anthropic;
  constructor(private cfg: AnthropicConfig = DEFAULT_CONFIG, client?: Anthropic) {
    // Reads ANTHROPIC_API_KEY from the environment. Never logged, never sent to the browser.
    this.client = client ?? new Anthropic({ timeout: cfg.timeoutMs, maxRetries: 2 });
  }

  async complete(req: CompletionRequest): Promise<Completion> {
    const res = await this.client.beta.messages.create({
      model: this.cfg.model,
      max_tokens: this.cfg.maxTokens,
      system: req.system,
      messages: req.messages,
      output_config: { effort: this.cfg.effort },
      // Safety classifiers can decline a request. Let the API retry on a fallback model instead of failing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (res.stop_reason === "refusal") return { text: "", refused: true };
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    return { text, refused: false };
  }
}

/** For tests and local development without a key: replies follow a script. */
export class ScriptedProvider implements Provider {
  calls: CompletionRequest[] = [];
  constructor(private script: (req: CompletionRequest, n: number) => Completion | Promise<Completion> | Error) {}
  async complete(req: CompletionRequest): Promise<Completion> {
    this.calls.push(req);
    const out = await this.script(req, this.calls.length);
    if (out instanceof Error) throw out;
    return out;
  }
}

/* ------------------------------------------------------------------ OpenRouter */

export interface OpenRouterConfig {
  apiKey: string;
  /** "openrouter/free" lets OpenRouter pick a free model that suits the request. Any id ending ":free" is a free model. */
  model: string;
  baseUrl: string;
  referer: string;
  title: string;
  maxTokens: number;
  timeoutMs: number;
  /** "deny" only uses providers that do not keep or train on prompts. Most free models then stop working, which is the safe default for children's messages. */
  dataCollection: "deny" | "allow";
  only: string[];
  allowFallbacks?: boolean;
}

export function openRouterConfig(env: NodeJS.ProcessEnv = process.env): OpenRouterConfig {
  const fb = (env.OPENROUTER_ALLOW_FALLBACKS ?? "").trim().toLowerCase();
  return {
    apiKey: env.OPENROUTER_API_KEY ?? "",
    model: env.OPENROUTER_MODEL || "openrouter/free",
    baseUrl: (env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, ""),
    referer: env.OPENROUTER_REFERER || "https://quarter.example",
    title: "quarter Maths tutor",
    maxTokens: 1500,
    timeoutMs: 60_000,
    dataCollection: (env.OPENROUTER_DATA_COLLECTION ?? "deny").trim().toLowerCase() === "allow" ? "allow" : "deny",
    only: (env.OPENROUTER_PROVIDER_ONLY ?? "").split(",").map((x) => x.trim()).filter(Boolean),
    allowFallbacks: ["false", "0", "no"].includes(fb) ? false : ["true", "1", "yes"].includes(fb) ? true : undefined,
  };
}

/** The routing part of the request body: only what is set. */
export function openRouterRouting(cfg: Pick<OpenRouterConfig, "dataCollection" | "only" | "allowFallbacks">) {
  const provider: { only?: string[]; allow_fallbacks?: boolean; data_collection?: "deny" } = {};
  if (cfg.dataCollection === "deny") provider.data_collection = "deny";
  if (cfg.only.length) provider.only = cfg.only;
  if (cfg.allowFallbacks !== undefined) provider.allow_fallbacks = cfg.allowFallbacks;
  return Object.keys(provider).length ? { provider } : {};
}

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Talks to OpenRouter (OpenAI chat-completions format). Free models are slower, rate limited and less reliable, so the tutor's own checks
 * (screening, the answer-leak check, the stock-hint fallback) matter more here. Throws when no usable answer comes back, which the tutor
 * turns into "unavailable".
 */
export class OpenRouterProvider implements Provider {
  /** Which model actually answered the last request (the free router varies). A model name only, never any message text. */
  lastModel = "";
  constructor(private cfg: OpenRouterConfig = openRouterConfig(), private fetchFn: FetchFn = (url, init) => fetch(url, init)) {}

  private post(messages: { role: string; content: string }[], maxTokens: number) {
    return this.fetchFn(`${this.cfg.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(this.cfg.timeoutMs),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.cfg.apiKey}`,
        "HTTP-Referer": this.cfg.referer,
        "X-Title": this.cfg.title,
      },
      body: JSON.stringify({ model: this.cfg.model, messages, max_tokens: maxTokens, ...openRouterRouting(this.cfg) }),
    });
  }

  /** A 402 that says "can only afford N" is retried once with fewer tokens. */
  private async affordable(messages: { role: string; content: string }[], max: number) {
    let res = await this.post(messages, max);
    if (res.status === 402) {
      const m = /can only afford (\d+)/.exec(await res.clone().text().catch(() => ""));
      const afford = m ? Number(m[1]) - 8 : 0;
      if (afford >= 200 && afford < max) res = await this.post(messages, afford);
    }
    return res;
  }

  async complete(req: CompletionRequest): Promise<Completion> {
    if (!this.cfg.apiKey) throw new Error("OPENROUTER_API_KEY is not set.");
    const messages = [{ role: "system", content: req.system }, ...req.messages];
    let max = this.cfg.maxTokens;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.affordable(messages, max);
      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 200).replace(/\s+/g, " ");
        // never include message text in the error: only the status and OpenRouter's own explanation
        if (res.status === 404 && /data policy|no endpoints/i.test(detail)) throw new Error("No model is available under the privacy setting (OPENROUTER_DATA_COLLECTION=deny).");
        throw new Error(`OpenRouter ${res.status}: ${detail}`);
      }
      const j = (await res.json()) as { model?: string; choices?: { message?: { content?: string | null }; finish_reason?: string }[] };
      this.lastModel = j.model ?? this.cfg.model;
      const choice = j.choices?.[0];
      if (choice?.finish_reason === "content_filter") return { text: "", refused: true };
      const text = (choice?.message?.content ?? "").trim();
      if (text) return { text, refused: false };
      // Thinking models can spend the whole allowance thinking and send nothing: ask once more with more room.
      if (choice?.finish_reason === "length" && max < 4000 && attempt === 0) { max = Math.min(max * 4, 4000); continue; }
      throw new Error(`The model ${this.lastModel} sent back no answer. Try another model.`);
    }
    throw new Error("The model sent back no answer.");
  }
}
