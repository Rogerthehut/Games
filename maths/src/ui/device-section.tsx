import { useState } from "preact/hooks";
import { hapticsOn, nativeHas, setHapticsOn, setReminders as sendReminders } from "../native/bridge";
import { faceIdOn, loadReminders, saveReminders, setFaceIdOn, type Reminders } from "../native/device-settings";

const DAYS: [number, string, string][] = [[2, "M", "Monday"], [3, "T", "Tuesday"], [4, "W", "Wednesday"], [5, "T", "Thursday"], [6, "F", "Friday"], [7, "S", "Saturday"], [1, "S", "Sunday"]];
const pad = (n: number) => String(n).padStart(2, "0");

/** Settings for this phone or iPad (only inside the app): Face ID for the Parents' area, a tap on buttons, and gentle weekly practice reminders. Kept on the device. */
export function DeviceSection() {
  const [face, setFace] = useState(faceIdOn());
  const [haptics, setHaptics] = useState(hapticsOn());
  const [rem, setRem] = useState<Reminders>(loadReminders());
  const [note, setNote] = useState("");
  if (!nativeHas("haptics2") && !nativeHas("biometric") && !nativeHas("reminders")) return null;

  const apply = async (next: Reminders) => {
    setRem(next); saveReminders(next); setNote("");
    const r = await sendReminders(next);
    if (r === "denied") { setNote("Notifications are switched off for quarter. Turn them on in Settings, then try again."); const off = { ...next, enabled: false }; setRem(off); saveReminders(off); }
    else if (r === "scheduled") setNote(`Reminders set for ${next.days.length} day${next.days.length === 1 ? "" : "s"} a week at ${pad(next.hour)}:${pad(next.minute)}.`);
    else if (!next.enabled) setNote("Reminders are off.");
  };
  const toggleDay = (d: number) => { const days = rem.days.includes(d) ? rem.days.filter((x) => x !== d) : [...rem.days, d]; void apply({ ...rem, days, enabled: rem.enabled && days.length > 0 }); };

  return (
    <section class="card" aria-labelledby="device-h" data-testid="device-section">
      <h2 id="device-h">On this {typeof navigator !== "undefined" && /iPad/.test(navigator.userAgent) ? "iPad" : "device"}</h2>
      <p class="small muted">These settings stay on this device only.</p>
      {nativeHas("biometric") && (
        <label class="check"><input type="checkbox" checked={face} onChange={(e) => { const on = (e.target as HTMLInputElement).checked; setFace(on); setFaceIdOn(on); }} data-testid="faceid-toggle" /> Open the Parents' area with Face ID or Touch ID <span class="small muted">(you still have your PIN as a back-up)</span></label>
      )}
      {nativeHas("haptics2") && (
        <label class="check"><input type="checkbox" checked={haptics} onChange={(e) => { const on = (e.target as HTMLInputElement).checked; setHaptics(on); setHapticsOn(on); }} data-testid="haptics-toggle" /> Gentle taps when buttons are pressed and questions are answered</label>
      )}
      {nativeHas("reminders") && (
        <>
          <h3>Practice reminders</h3>
          <p class="small">A short notification on the days and time you choose, such as "A few minutes of practice, whenever suits." It never says who or how many days they've missed, and it's off until you turn it on.</p>
          <label class="check"><input type="checkbox" checked={rem.enabled} onChange={(e) => void apply({ ...rem, enabled: (e.target as HTMLInputElement).checked })} data-testid="reminders-toggle" /> Remind us to practise</label>
          {rem.enabled && (
            <>
              <label class="inline"><span class="field-label">Time</span>
                <input type="time" value={`${pad(rem.hour)}:${pad(rem.minute)}`} data-testid="reminders-time" onChange={(e) => { const [h, m] = (e.target as HTMLInputElement).value.split(":").map(Number); if (Number.isInteger(h) && Number.isInteger(m)) void apply({ ...rem, hour: h, minute: m }); }} />
              </label>
              <div class="working-tools" role="group" aria-label="Days">
                {DAYS.map(([d, short, long]) => <button key={d} type="button" class="btn small" aria-pressed={rem.days.includes(d)} aria-label={long} onClick={() => toggleDay(d)} data-testid={`reminder-day-${d}`}>{short}</button>)}
              </div>
            </>
          )}
          {note && <p class="small" role="status">{note}</p>}
        </>
      )}
    </section>
  );
}
