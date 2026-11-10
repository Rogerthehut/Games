/** A plain-language view of everything quarter holds for an account, built from the raw download. Defensive: it never trusts the shape. */
export interface MyLearner {
  name: string; year: number | null; added: number | null; lastPractised: number | null;
  points: number; topicsPractised: number; questionsAnswered: number; sessions: number; checkups: number; papers: number; tutorOn: boolean; focusTopics: number;
}
export interface MyData {
  email: string | null; created: number | null; agreedAt: number | null; agreedVersion: string | null;
  subscription: { status: string; plan: string | null; trialEnd: number | null; renews: number | null; cancelling: boolean } | null;
  learners: MyLearner[];
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const time = (v: unknown): number | null => { if (typeof v === "number" && Number.isFinite(v)) return v; if (typeof v === "string") { const t = Date.parse(v); return Number.isNaN(t) ? null : t; } return null; };
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function describeExport(raw: unknown, email?: string): MyData {
  const r = obj(raw), p = obj(r.parent), s = r.subscription ? obj(r.subscription) : null;
  const learners = arr(r.learners).map((l): MyLearner => {
    const d = obj(obj(l).data), skills = Object.values(obj(d.skills)).map(obj), sessions = arr(d.sessions).map(obj);
    const answered = sessions.reduce((a, x) => a + (num(x.answered) ?? 0), 0);
    const last = Math.max(0, ...sessions.map((x) => num(x.at) ?? 0), ...skills.map((x) => num(x.last) ?? 0));
    return {
      name: typeof d.name === "string" ? d.name : "Learner", year: num(d.year), added: num(d.createdAt), lastPractised: last > 0 ? last : null,
      points: num(d.points) ?? 0, topicsPractised: skills.filter((x) => (num(x.seen) ?? 0) > 0).length, questionsAnswered: answered,
      sessions: sessions.length, checkups: arr(d.baselines).length, papers: arr(d.mocks).length, tutorOn: obj(d.tutor).enabled === true, focusTopics: arr(d.focus).length,
    };
  });
  return {
    email: email ?? null, created: time(p.createdAt), agreedAt: time(p.consentedAt), agreedVersion: typeof p.consentVersion === "string" ? p.consentVersion : null,
    subscription: s ? { status: typeof s.status === "string" ? s.status : "none", plan: typeof s.plan === "string" ? s.plan : null, trialEnd: time(s.trialEnd), renews: time(s.currentPeriodEnd), cancelling: s.cancelAtPeriodEnd === true } : null,
    learners,
  };
}

export const STATUS_PLAIN: Record<string, string> = { active: "Active", trialing: "Free trial", past_due: "Payment problem", canceled: "Cancelled", none: "No subscription" };
