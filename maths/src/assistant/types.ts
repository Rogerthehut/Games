/** Shared by the app and the service. Keep it dependency-free. */
export interface AssistantTurn { role: "parent" | "assistant"; text: string }
export type AssistantFlag = "personal-info" | "wellbeing" | "off-topic" | "limit" | "unavailable";
export interface AssistantResponse { reply: string; flag?: AssistantFlag; remainingToday?: number }
export const ASSISTANT_LIMITS = { message: 500, turn: 1400, history: 8, reply: 1100 } as const;
