import type { TutorResponse } from "../../src/tutor/types";
import { Limiter, buildMessages, wordCap, buildSystemPrompt, fallbackReply, leaksAnswer, mayReveal, sanitizeReply, screenChildMessage, validateRequest } from "./policy";
import type { Provider } from "./provider";

export interface Deps {
  provider: Provider;
  limiter: Limiter;
  now?: () => number;
  /** Receives counts and flags only. Never message text. */
  log?: (event: { kind: string; flag?: string; ms?: number; retried?: boolean }) => void;
}

export interface Result { status: number; body: TutorResponse | { error: string } }

/** A hard stop a little above the word target, in characters, so a chatty model cannot run on. */
const capChars = (year: number) => Math.round(wordCap(year) * 7.5);

const UNAVAILABLE = "The tutor can't answer right now. Try the Hint button, or ask a grown-up, and come back to me in a bit.";
const LIMIT_REPLY = "You've asked the tutor a lot today, which is great effort. Let's pick this up tomorrow. The Hint button is still there to help.";
const REFUSED = "I can't help with that one. Let's go back to the maths: which part of the question is tricky?";

/** One tutor request, start to finish. Every path out of here is something we wrote or something we checked. */
export async function handleTutor(body: unknown, ip: string, deps: Deps): Promise<Result> {
  const now = deps.now?.() ?? Date.now();
  const t0 = now;
  const v = validateRequest(body);
  if (!v.ok) return { status: 400, body: { error: v.error } };
  const { req } = v;

  const slot = await deps.limiter.take(req.deviceId, ip, now);
  if (!slot) {
    deps.log?.({ kind: "limit", flag: "limit" });
    return { status: 429, body: { reply: LIMIT_REPLY, flag: "limit", remainingToday: 0 } };
  }

  // What the child typed is checked before any model sees it.
  const screen = screenChildMessage(req.message);
  if (screen.action === "block") {
    deps.log?.({ kind: "blocked", flag: screen.flag });
    return { status: 200, body: { reply: screen.reply, flag: screen.flag, remainingToday: slot.remaining } };
  }

  const messages = buildMessages(req.history, req.message);
  const guard = !mayReveal(req.context, req.revealPolicy);
  let retried = false;
  try {
    let out = await deps.provider.complete({ system: buildSystemPrompt(req.context, req.revealPolicy), messages });
    if (out.refused || !out.text) {
      deps.log?.({ kind: "refused", ms: Date.now() - t0 });
      return { status: 200, body: { reply: REFUSED, flag: "off-topic", remainingToday: slot.remaining } };
    }
    let reply = sanitizeReply(out.text, capChars(req.context.year));
    if (guard && leaksAnswer(reply, req.context)) {
      retried = true;
      out = await deps.provider.complete({ system: buildSystemPrompt(req.context, req.revealPolicy, true), messages });
      reply = sanitizeReply(out.text, capChars(req.context.year));
      if (out.refused || !reply || leaksAnswer(reply, req.context)) reply = fallbackReply(req.context);
    }
    deps.log?.({ kind: "ok", ms: Date.now() - t0, retried });
    return { status: 200, body: { reply, remainingToday: slot.remaining } };
  } catch {
    deps.log?.({ kind: "error", flag: "unavailable", ms: Date.now() - t0, retried });
    return { status: 200, body: { reply: `${fallbackReply(req.context)}\n\n${UNAVAILABLE}`.slice(0, 700), flag: "unavailable", remainingToday: slot.remaining } };
  }
}
