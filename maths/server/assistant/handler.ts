import type { AssistantResponse } from "../../src/assistant/types";
import type { Provider } from "../tutor/provider";
import { ASSISTANT_REPLIES, AssistantLimiter, assistantMessages, buildAssistantPrompt, knowledgeFor, sanitizeAssistantReply, screenParentMessage, validateAssistantRequest } from "./policy";

export interface AssistantDeps {
  provider: Provider;
  limiter: AssistantLimiter;
  now?: () => number;
  /** Counts and flags only. Never message text. */
  log?: (event: { kind: string; flag?: string; ms?: number }) => void;
}
export interface AssistantResult { status: number; body: AssistantResponse | { error: string; message?: string } }

const UNAVAILABLE = "The assistant can't answer right now. Please try again in a little while. The 'How to explain it' notes under each topic in the Progress tab are always there.";
const LIMIT = "You've asked a lot today. The assistant will be ready again tomorrow, and the topic notes under Progress are there in the meantime.";
const REFUSED = "I can't help with that one. I can help you understand maths topics and how to explain them. What would you like to know?";

/** One parent question, start to finish. `parentId` is only used to rate-limit and is never logged or sent to the model. */
export async function handleAssistant(body: unknown, parentId: string, deps: AssistantDeps): Promise<AssistantResult> {
  const t0 = deps.now?.() ?? Date.now();
  const v = validateAssistantRequest(body);
  if (!v.ok) return { status: 400, body: { error: "invalid", message: v.error } };
  const { req } = v;

  const slot = await deps.limiter.take(parentId, t0);
  if (!slot) { deps.log?.({ kind: "limit", flag: "limit" }); return { status: 429, body: { reply: LIMIT, flag: "limit", remainingToday: 0 } }; }

  const screen = screenParentMessage(req.message);
  if (screen.action === "block") { deps.log?.({ kind: "blocked", flag: screen.flag }); return { status: 200, body: { reply: screen.reply, flag: screen.flag, remainingToday: slot.remaining } }; }

  try {
    const out = await deps.provider.complete({
      system: buildAssistantPrompt(req.year, knowledgeFor(req.message, req.history, req.year)),
      messages: assistantMessages(req.history, req.message),
    });
    const reply = out.refused ? "" : sanitizeAssistantReply(out.text ?? "");
    if (!reply) { deps.log?.({ kind: "refused", ms: Date.now() - t0 }); return { status: 200, body: { reply: REFUSED, flag: "off-topic", remainingToday: slot.remaining } }; }
    deps.log?.({ kind: "ok", ms: Date.now() - t0 });
    return { status: 200, body: { reply, remainingToday: slot.remaining } };
  } catch {
    deps.log?.({ kind: "error", flag: "unavailable", ms: Date.now() - t0 });
    return { status: 200, body: { reply: UNAVAILABLE, flag: "unavailable", remainingToday: slot.remaining } };
  }
}
export { ASSISTANT_REPLIES };
