import type { Status } from "../engine/progress";

/** What a child sees. */
export const STATUS_LABEL: Record<Status, string> = { new: "New", assumed: "Done before", learning: "Learning", growing: "Getting there", secure: "Got it" };

/** What a grown-up sees, where precision matters more than friendliness. */
export const STATUS_LABEL_PARENT: Record<Status, string> = { new: "Not started", assumed: "Assumed known", learning: "Learning", growing: "Getting there", secure: "Secure" };
