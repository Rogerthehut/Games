import { describe, expect, it } from "vitest";
import { accountRows } from "./ops-page";

describe("account facts in plain English", () => {
  it("says No instead of null for a missing subscription, and writes dates out", () => {
    const rows = Object.fromEntries(accountRows({ createdAt: "2026-11-12T13:39:32.028Z", consent: { version: "v", at: "2026-11-13T16:56:24Z" }, subscription: null, learners: { count: 2, years: [4, 6], lastActive: null }, feedbackCount: 0 }));
    expect(rows["Has a subscription"]).toBe("No");
    expect(rows["Agreed to the terms"]).toBe("Yes, on 13 Nov 2026");
    expect(rows["Children"]).toBe("2 (Year 4, Year 6)");
    expect(rows["Last active"]).toBe("Never");
    expect(JSON.stringify(rows)).not.toMatch(/null|true|false/);
  });
  it("describes a live subscription", () => {
    const rows = Object.fromEntries(accountRows({ createdAt: "2026-01-01T00:00:00Z", consent: {}, subscription: { status: "trialing", plan: "monthly", trialEnd: "2026-02-01T00:00:00Z", periodEnd: null, cancelAtPeriodEnd: false, everSubscribed: false }, learners: { count: 0, years: [], lastActive: null }, feedbackCount: 1 }));
    expect(rows["Has a subscription"]).toBe("Yes"); expect(rows["Subscription status"]).toBe("Free trial"); expect(rows["Cancelling at the end of the period"]).toBe("No"); expect(rows["Agreed to the terms"]).toBe("No");
  });
});
