import type { Profile } from "../src/engine/progress";
import type { AuthProvider } from "./auth";
import type { Repo } from "./db/repo";
import { buildDigest } from "./digest";
import type { Mailer } from "./mail";

const DAY = 86_400_000;
/** A parent gets at most one weekly email in this long, even if the job runs every day. */
export const DIGEST_GAP_MS = 6 * DAY;

export interface DigestDeps {
  repo: Repo; auth: AuthProvider; mailer: Mailer;
  /** Where the app lives, for the link in the email. */
  appUrl: string;
  /** The server's own address, for the unsubscribe link. */
  serverUrl: string;
  now?: () => number;
}
export interface DigestRun { considered: number; sent: number; quiet: number; noAddress: number; failed: number }

export const unsubscribeUrl = (serverUrl: string, token: string) => `${serverUrl.replace(/\/$/, "")}/unsubscribe?t=${encodeURIComponent(token)}`;

/** Sends the weekly email to each parent who has asked for it and is due one. Safe to run every day, or twice: nobody gets two in a week. */
export async function runDigestJob(d: DigestDeps): Promise<DigestRun> {
  const now = (d.now ?? Date.now)();
  const run: DigestRun = { considered: 0, sent: 0, quiet: 0, noAddress: 0, failed: 0 };
  for (const c of await d.repo.digestCandidates(new Date(now), DIGEST_GAP_MS)) {
    run.considered++;
    const to = (await d.auth.emailOf?.(c.clerkUserId)) ?? null;
    if (!to) { run.noAddress++; continue; }
    const learners = (await d.repo.loadLearners(c.parentId)).map((l) => l.data as unknown as Profile);
    const unsub = unsubscribeUrl(d.serverUrl, c.token);
    const digest = buildDigest({ learners, appUrl: d.appUrl, unsubscribeUrl: unsub, now });
    if (!digest) { run.quiet++; continue; }
    const res = await d.mailer.send({ to, subject: digest.subject, text: digest.text, html: digest.html, unsubscribeUrl: unsub });
    if (!res.ok) { run.failed++; console.error("weekly email not sent:", res.error); continue; }
    await d.repo.markDigestSent(c.parentId, new Date(now));
    run.sent++;
  }
  return run;
}
