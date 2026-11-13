import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import * as StoreReview from "expo-store-review";

/** What the phone does when the page asks (see messages.ts for what it may ask). Each one fails quietly: a missing feature must never break the page. */

export async function haptic(kind: "tap" | "soft" | "success" | "error") {
  try {
    if (kind === "tap") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (kind === "soft") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    else await Haptics.notificationAsync(kind === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  } catch { /* no haptic engine */ }
}

export type BiometricResult = "ok" | "cancelled" | "failed" | "unavailable";

/**
 * Face ID or Touch ID only. The device passcode is not offered as a fallback: children often know it, and the Parents' area has its own
 * sum and PIN to fall back on.
 */
export async function biometric(reason: string): Promise<BiometricResult> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return "unavailable";
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: "Use the sum and PIN", disableDeviceFallback: true });
    if (r.success) return "ok";
    return r.error === "user_cancel" || r.error === "system_cancel" || r.error === "app_cancel" ? "cancelled" : "failed";
  } catch { return "unavailable"; }
}

/** Reminders are local notifications: no server, no push, and nothing leaves the device. Always the same gentle wording, and never a child's name on the lock screen. */
export async function setReminders(r: { enabled: boolean; hour: number; minute: number; days: number[] }): Promise<"scheduled" | "off" | "denied"> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!r.enabled || !r.days.length) return "off";
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return "denied";
    for (const weekday of r.days) {
      await Notifications.scheduleNotificationAsync({
        content: { title: "A little quarter?", body: "A few minutes of practice, whenever suits.", sound: false },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour: r.hour, minute: r.minute },
      });
    }
    return "scheduled";
  } catch { return "denied"; }
}

export async function askForReview() {
  try { if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview(); } catch { /* Apple decides */ }
}
