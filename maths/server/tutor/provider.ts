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
