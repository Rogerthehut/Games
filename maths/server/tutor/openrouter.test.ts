import { describe, expect, it } from "vitest";
import type { TutorContext, TutorRequest } from "../../src/tutor/types";
import { handleTutor } from "./handler";
import { Limiter } from "./policy";
import { OpenRouterProvider, openRouterConfig, openRouterRouting, type OpenRouterConfig } from "./provider";

const cfg = (over: Partial<OpenRouterConfig> = {}): OpenRouterConfig => ({ ...openRouterConfig({ OPENROUTER_API_KEY: "sk-or-test" } as NodeJS.ProcessEnv), ...over });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ok = (content: string | null, extra: Record<string, unknown> = {}) => json({ model: "vendor/some-model:free", choices: [{ message: { content }, finish_reason: "stop", ...extra }] });

/** A fake network: answers from a list, remembers every request. */
function net(...replies: (Response | (() => Response))[]) {
  const calls: { url: string; init: RequestInit; body: Record<string, any> }[] = [];
  const fetchFn = async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: JSON.parse(String(init.body)) });
    const r = replies[Math.min(calls.length - 1, replies.length - 1)];
    return typeof r === "function" ? r() : r.clone();
  };
  return { calls, fetchFn };
}
const ask = { system: "You are a tutor.", messages: [{ role: "user" as const, content: "How do I start?" }] };

describe("OpenRouter provider: the request", () => {
  it("sends the system prompt first, the headers OpenRouter asks for, and a safe routing default", async () => {
    const n = net(ok("Try the first step."));
    const p = new OpenRouterProvider(cfg({ referer: "https://example.org" }), n.fetchFn);
    expect(await p.complete(ask)).toEqual({ text: "Try the first step.", refused: false });
    const [c] = n.calls;
    expect(c.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const h = c.init.headers as Record<string, string>;
    expect(h.authorization).toBe("Bearer sk-or-test");
    expect(h["HTTP-Referer"]).toBe("https://example.org");
    expect(h["X-Title"]).toBeTruthy();
    expect(c.body.model).toBe("openrouter/free");
    expect(c.body.messages).toEqual([{ role: "system", content: "You are a tutor." }, { role: "user", content: "How do I start?" }]);
    expect(c.body.max_tokens).toBe(1500);
    // children's messages: providers that keep or train on prompts are refused unless someone opts in
    expect(c.body.provider).toEqual({ data_collection: "deny" });
    expect(p.lastModel).toBe("vendor/some-model:free");
  });

  it("only drops the privacy filter when explicitly told to", () => {
    expect(openRouterConfig({} as NodeJS.ProcessEnv).dataCollection).toBe("deny");
    expect(openRouterConfig({ OPENROUTER_DATA_COLLECTION: "deny" } as NodeJS.ProcessEnv).dataCollection).toBe("deny");
    expect(openRouterConfig({ OPENROUTER_DATA_COLLECTION: "nonsense" } as NodeJS.ProcessEnv).dataCollection).toBe("deny");
    expect(openRouterConfig({ OPENROUTER_DATA_COLLECTION: "allow" } as NodeJS.ProcessEnv).dataCollection).toBe("allow");
    expect(openRouterRouting({ dataCollection: "allow", only: [], allowFallbacks: undefined })).toEqual({});
  });

  it("passes provider and fallback choices through", () => {
    const env = { OPENROUTER_PROVIDER_ONLY: "minimax, other", OPENROUTER_ALLOW_FALLBACKS: "false", OPENROUTER_DATA_COLLECTION: "deny", OPENROUTER_MODEL: "x/y:free" } as NodeJS.ProcessEnv;
    const c = openRouterConfig(env);
    expect(c.model).toBe("x/y:free");
    expect(openRouterRouting(c)).toEqual({ provider: { data_collection: "deny", only: ["minimax", "other"], allow_fallbacks: false } });
  });

  it("refuses to run without a key, and never sends a request", async () => {
    const n = net(ok("hi"));
    await expect(new OpenRouterProvider(cfg({ apiKey: "" }), n.fetchFn).complete(ask)).rejects.toThrow(/OPENROUTER_API_KEY/);
    expect(n.calls).toHaveLength(0);
  });
});

describe("OpenRouter provider: free models misbehave", () => {
  it("asks again with more room when a thinking model spends everything thinking", async () => {
    const n = net(ok("", { finish_reason: "length" }), ok("Here is a hint."));
    const out = await new OpenRouterProvider(cfg(), n.fetchFn).complete(ask);
    expect(out.text).toBe("Here is a hint.");
    expect(n.calls.map((c) => c.body.max_tokens)).toEqual([1500, 4000]);
  });

  it("gives up, with the model name, when there is still no answer", async () => {
    const n = net(ok("", { finish_reason: "length" }));
    await expect(new OpenRouterProvider(cfg(), n.fetchFn).complete(ask)).rejects.toThrow(/sent back no answer/);
    expect(n.calls).toHaveLength(2);
    const stop = net(ok(null));
    await expect(new OpenRouterProvider(cfg(), stop.fetchFn).complete(ask)).rejects.toThrow(/vendor\/some-model:free sent back no answer/);
    expect(stop.calls).toHaveLength(1);
  });

  it("retries a 402 'can only afford' once with fewer tokens", async () => {
    const n = net(json({ error: { message: "This request requires more credits. You can only afford 900." } }, 402), ok("Fine."));
    expect((await new OpenRouterProvider(cfg(), n.fetchFn).complete(ask)).text).toBe("Fine.");
    expect(n.calls.map((c) => c.body.max_tokens)).toEqual([1500, 892]);
  });

  it("does not retry when it could afford too little, and says so without echoing the child's words", async () => {
    const n = net(json({ error: { message: "You can only afford 100." } }, 402));
    const p = new OpenRouterProvider(cfg(), n.fetchFn);
    const err = await p.complete({ ...ask, messages: [{ role: "user", content: "my secret message about Priya" }] }).catch((e) => e as Error);
    expect(String(err)).toMatch(/OpenRouter 402/);
    expect(String(err)).not.toMatch(/Priya|secret/);
    expect(n.calls).toHaveLength(1);
  });

  it("explains when no free model is allowed under the privacy setting", async () => {
    const n = net(json({ error: { message: "No endpoints found matching your data policy" } }, 404));
    await expect(new OpenRouterProvider(cfg(), n.fetchFn).complete(ask)).rejects.toThrow(/privacy setting/);
  });

  it("treats a content filter as a refusal", async () => {
    const n = net(ok("", { finish_reason: "content_filter" }));
    expect(await new OpenRouterProvider(cfg(), n.fetchFn).complete(ask)).toEqual({ text: "", refused: true });
  });
});

describe("the tutor's own checks still protect children when the model is a free one", () => {
  const context: TutorContext = {
    skillId: "solve-linear", skillName: "Solving equations", year: 8, level: 1,
    question: "Solve $7x + 4 = 67$.", referenceAnswer: "$x = 9$",
    referenceSteps: ["Subtract $4$ from both sides: $7x = 63$.", "Divide both sides by $7$: $x = 9$."],
    hint: "Undo the adding first.", phase: "ask", childAttempts: ["13"], attempts: 1, hinted: false,
  };
  const req: TutorRequest = { deviceId: "dev-aaaaaaaaaaaaaaaa", context, history: [], message: "I don't know where to start", revealPolicy: "guide" };

  it("never passes on a reply that gives the answer away", async () => {
    // a free model that ignores its instructions, twice
    const n = net(ok("Sure! x = 9."));
    const d = { provider: new OpenRouterProvider(cfg(), n.fetchFn), limiter: new Limiter() };
    const out = await handleTutor(req, "1.2.3.4", d);
    expect((out.body as { reply: string }).reply).not.toMatch(/\bx\s*=\s*9\b|\b9\b/);
  });

  it("answers 'unavailable' rather than failing when the free model is down", async () => {
    const n = net(json({ error: { message: "Rate limit exceeded" } }, 429));
    const events: { flag?: string }[] = [];
    const d = { provider: new OpenRouterProvider(cfg(), n.fetchFn), limiter: new Limiter(), log: (e: { flag?: string }) => events.push(e) };
    const out = await handleTutor(req, "1.2.3.4", d);
    expect(out.status).toBe(200);
    expect((out.body as { flag?: string }).flag).toBe("unavailable");
    expect(events.some((e) => e.flag === "unavailable")).toBe(true);
  });

  it("does not send a child's message to the model at all when screening blocks it", async () => {
    const n = net(ok("anything"));
    const d = { provider: new OpenRouterProvider(cfg(), n.fetchFn), limiter: new Limiter() };
    await handleTutor({ ...req, message: "I want to hurt myself" }, "1.2.3.4", d);
    expect(n.calls).toHaveLength(0);
  });
});
