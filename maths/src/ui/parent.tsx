import { useState } from "preact/hooks";
import { SKILLS, STAGE_LABEL } from "../curriculum";
import { DAY, SECURE_BOX, skillName, statusOf, weekStats, type Profile, type SkillState } from "../engine/progress";
import { exportProfile, importProfile } from "../engine/storage";
import { yearLabel } from "../engine/diagnostic";
import { applyTheme, getTheme, resolveSkin, skinForYear, type ThemeChoice } from "./skin";
import { useTutorAvailable } from "./tutor";
import { useApp } from "./context";
import { Maths } from "./maths";

const when = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function Parent() {
  const { profile, update, go, removeProfile, replaceProfile } = useApp();
  const stats = weekStats(profile);
  const [confirmDel, setConfirmDel] = useState(false);
  const [exportText, setExportText] = useState("");
  const [pasted, setPasted] = useState("");
  const [msg, setMsg] = useState("");
  const [theme, setTheme] = useState<ThemeChoice>(getTheme());
  const tutorUp = useTutorAvailable();
  const log = profile.tutorLog ?? [];
  const worries = log.filter((e) => e.flag === "wellbeing" && !e.seen);
  const flagLabel: Record<string, string> = { wellbeing: "Wellbeing", "personal-info": "Personal details", "off-topic": "Off topic", limit: "Daily limit", unavailable: "Tutor unavailable" };

  const touched = SKILLS.filter((s) => (profile.skills[s.id]?.seen ?? 0) > 0);
  const byStatus = (st: string) => SKILLS.filter((s) => statusOf(profile.skills[s.id]) === st);
  const mistakes = Object.values(profile.mistakes).sort((a, b) => b.count - a.count).slice(0, 5);
  const toggleFocus = (id: string) => update((p) => ({ ...p, focus: p.focus.includes(id) ? p.focus.filter((x) => x !== id) : [...p.focus, id] }));
  const needsWork = touched.filter((s) => (profile.skills[s.id] as SkillState).wrong > (profile.skills[s.id] as SkillState).right * 0.5 && (profile.skills[s.id] as SkillState).seen >= 3);

  const changeYear = (year: number) =>
    update((p: Profile) => {
      const skills = { ...p.skills };
      for (const s of SKILLS) if (s.year < year && !skills[s.id]) skills[s.id] = { box: 3, due: Date.now() + 3 * DAY, seen: 0, right: 0, wrong: 0, last: 0, assumed: true };
      return { ...p, year, skills };
    });

  const doImport = () => {
    try { replaceProfile(importProfile(pasted.trim())); setMsg("Progress loaded."); setPasted(""); }
    catch (e) { setMsg((e as Error).message); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(exportText); setMsg("Copied. Keep it somewhere safe, such as a notes app or email to yourself."); }
    catch { setMsg("Select the text and copy it manually."); }
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([exportText], { type: "application/json" }));
    a.download = `mathpath-${profile.name.toLowerCase().replace(/\W+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div class="parent">
      <h1>Grown-up view · {profile.name}</h1>
      <p class="lede">Year {profile.year}, following the UK National Curriculum. Progress is stored on this device only.</p>

      {worries.length > 0 && (
        <section class="card alert" role="alert" aria-labelledby="wb">
          <h2 id="wb">A message in the tutor chat may need your attention</h2>
          <p>{profile.name} wrote something in the tutor chat that suggested they may be upset or unsafe. The tutor replied kindly, told them to speak to a trusted adult, and pointed to Childline (0800 1111, free). It is worth a gentle conversation.</p>
          <ul class="finding-list">{worries.map((e) => <li key={e.at}><span class="small muted">{new Date(e.at).toLocaleString("en-GB")}</span><p>“{e.child}”</p></li>)}</ul>
          <button class="btn" onClick={() => update((p) => ({ ...p, tutorLog: (p.tutorLog ?? []).map((e) => (e.flag === "wellbeing" ? { ...e, seen: true } : e)) }))}>I've seen this</button>
        </section>
      )}

      <section class="card">
        <h2>Check-up</h2>
        {profile.baselines.length === 0 ? (
          <p class="muted">No check-up yet. It finds the starting point and any gaps.</p>
        ) : (
          <p>Last check-up {when(profile.baselines[profile.baselines.length - 1].at)}: working at {yearLabel(profile.baselines[profile.baselines.length - 1].theta)}.
            {Date.now() - profile.baselines[profile.baselines.length - 1].at > 42 * DAY && <> It has been over six weeks, so a re-check would show progress.</>}</p>
        )}
        <div class="actions">
          {profile.baselines.length > 0 && <button class="btn" onClick={() => go({ name: "report" })}>See the report</button>}
          <button class="btn" onClick={() => go({ name: "checkup" })}>{profile.baselines.length ? "Re-take the check-up" : "Start the check-up"}</button>
          <button class="btn" onClick={() => go({ name: "plan" })}>Plan</button>
        </div>
      </section>

      <section class="card">
        <h2>Last 7 days</h2>
        {stats.sessions === 0 ? <p class="muted">No practice yet this week.</p> : (
          <dl class="stats wide">
            <div><dt>Sessions</dt><dd>{stats.sessions}</dd></div>
            <div><dt>Minutes</dt><dd>{stats.minutes}</dd></div>
            <div><dt>Questions</dt><dd>{stats.answered}</dd></div>
            <div><dt>Correct</dt><dd>{stats.accuracy}%</dd></div>
          </dl>
        )}
        <p class="small muted">Aim for little and often. Ten minutes on four or five days beats one long session.</p>
      </section>

      <section class="card">
        <h2>Where they are</h2>
        <div class="status-row">
          {(["secure", "growing", "learning", "assumed", "new"] as const).map((st) => (
            <div key={st} class={`status-box ${st}`}><strong>{byStatus(st).length}</strong><span>{st === "new" ? "Not started" : st === "assumed" ? "Assumed known" : st[0].toUpperCase() + st.slice(1)}</span></div>
          ))}
        </div>
        {needsWork.length > 0 && (
          <p><strong>Needs some support:</strong> {needsWork.map((s) => s.name).join(", ")}. Try the conversation prompts below.</p>
        )}
        <p class="small muted">Secure means answered correctly without help across several days (level {SECURE_BOX} of 5 or more). Topics marked assumed known are from earlier years and have not been checked yet; they return for a quick review after a few days.</p>
      </section>

      <section class="card">
        <h2>Mistakes worth talking about</h2>
        {mistakes.length === 0 ? <p class="muted">Nothing repeated yet. Common slips appear here once they happen more than once.</p> : (
          <ul class="mistakes">
            {mistakes.map((m) => (
              <li key={m.skill + m.message}>
                <div><strong>{skillName(m.skill)}</strong> <span class="badge">seen {m.count}×</span></div>
                <p><Maths text={m.message} /></p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section class="card">
        <h2>Topics, explained for you</h2>
        <p class="small muted">Tick "Focus" to put a topic into the next sessions, for example to match what you're teaching this week.</p>
        <ul class="topics">
          {SKILLS.sort((a, b) => a.year - b.year).map((s) => {
            const st = profile.skills[s.id];
            return (
              <li key={s.id}>
                <details>
                  <summary>
                    <span class="t-name">{s.name}</span>
                    <span class="badge">{STAGE_LABEL[s.stage]} · Y{s.year}</span>
                    <span class={`status ${statusOf(st)}`}>{{ new: "Not started", assumed: "Assumed known", learning: "Learning", growing: "Growing", secure: "Secure" }[statusOf(st)]}</span>
                  </summary>
                  <div class="t-body">
                    <p><strong>How to explain it.</strong> <Maths text={s.parentNote} /></p>
                    <p><strong>Ask them.</strong> {s.talkAbout}</p>
                    {st && st.seen > 0 && <p class="small muted">{st.right} right, {st.wrong} wrong. Last practised {when(st.last)}. Next check {when(st.due)}.</p>}
                    <label class="check"><input type="checkbox" checked={profile.focus.includes(s.id)} onChange={() => toggleFocus(s.id)} /> Focus on this</label>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <section class="card" aria-labelledby="tut">
        <h2 id="tut">AI tutor</h2>
        <p>An optional helper in practice that explains and guides, without just giving the answer. It is switched off until you turn it on.</p>
        <label class="check"><input type="checkbox" id="tutor-on" checked={!!profile.tutor?.enabled} onChange={(e) => update((p) => ({ ...p, tutor: { enabled: (e.target as HTMLInputElement).checked, reveal: p.tutor?.reveal ?? "guide" } }))} /> Allow the AI tutor for {profile.name}</label>
        <label class="inline">
          <span class="field-label">How much help</span>
          <select id="tutor-reveal" value={profile.tutor?.reveal ?? "guide"} onChange={(e) => update((p) => ({ ...p, tutor: { enabled: p.tutor?.enabled ?? false, reveal: (e.target as HTMLSelectElement).value as "guide" | "after-tries" } }))}>
            <option value="guide">Guide only: never gives the final answer</option>
            <option value="after-tries">May show the working after two wrong tries</option>
          </select>
        </label>
        <p class="small muted">Status: {tutorUp === null ? "checking…" : tutorUp ? "connected" : "not connected on this version of the app, so the tutor button won't appear yet"}.</p>
        <details class="how"><summary>What happens to what is typed</summary>
          <p>When your child sends a message, it goes to our tutor service along with the current question and what they have typed for it. Nothing else about them is sent: no name, school or progress. The service passes it to an AI provider to write a reply, checks the reply, and sends it back. Our service does not store messages. They are kept only in the log below, on this device.</p>
          <p>Messages that contain contact details or look like a safety concern are not sent to the AI at all. The tutor can still make mistakes, so for anything that matters, check with a teacher or a trusted resource. We suggest being nearby while younger children use it.</p>
        </details>
        <h3>Conversation log</h3>
        {log.length === 0 ? <p class="muted">Nothing yet. Every exchange will appear here, newest first.</p> : (
          <ul class="finding-list">
            {[...log].reverse().slice(0, 40).map((e) => (
              <li key={e.at} class={e.flag === "wellbeing" ? "flagged" : ""}>
                <div class="small muted">{new Date(e.at).toLocaleString("en-GB")} · {SKILLS.find((s) => s.id === e.skillId)?.name ?? e.skillId}{e.flag && <> · <span class="badge">{flagLabel[e.flag] ?? e.flag}</span></>}</div>
                <p><strong>Child:</strong> {e.child}</p>
                <p><strong>Tutor:</strong> <Maths text={e.tutor} /></p>
              </li>
            ))}
          </ul>
        )}
        {log.length > 0 && <div class="actions"><button class="btn" onClick={() => update((p) => ({ ...p, tutorLog: [] }))}>Clear the log</button></div>}
      </section>

      <section class="card">
        <h2>Settings</h2>
        <label class="inline">
          <span class="field-label">School year</span>
          <select value={profile.year} onChange={(e) => changeYear(+(e.target as HTMLSelectElement).value)}>
            {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((y) => <option value={y}>Year {y}</option>)}
          </select>
        </label>
        <h3>Appearance</h3>
        <label class="inline">
          <span class="field-label">Look and feel</span>
          <select id="skin" value={profile.skin ?? "auto"} onChange={(e) => update((p) => ({ ...p, skin: (e.target as HTMLSelectElement).value as Profile["skin"] }))}>
            <option value="auto">Automatic (suits Year {profile.year}: {skinForYear(profile.year)})</option>
            <option value="explorer">Explorer: playful, with a mascot</option>
            <option value="navigator">Navigator: clean and friendly</option>
            <option value="scholar">Scholar: calm and minimal</option>
          </select>
        </label>
        <label class="inline">
          <span class="field-label">Colour mode</span>
          <select id="theme" value={theme} onChange={(e) => { const t = (e.target as HTMLSelectElement).value as ThemeChoice; setTheme(t); applyTheme(t); }}>
            <option value="auto">Match my device</option><option value="light">Light</option><option value="dark">Dark</option>
          </select>
        </label>
        <p class="small muted">Now showing: {resolveSkin(profile)}.</p>
        <h3>Move progress to another device</h3>
        <div class="actions">
          <button class="btn" onClick={() => setExportText(exportProfile(profile))}>Create save text</button>
          <button class="btn" onClick={() => go({ name: "onboard" })}>Add another learner</button>
        </div>
        {exportText && (
          <>
            <textarea readOnly rows={5} value={exportText} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />
            <div class="actions"><button class="btn" onClick={copy}>Copy</button><button class="btn" onClick={download}>Download file</button></div>
          </>
        )}
        <label>
          <span class="field-label">Load saved text</span>
          <textarea rows={3} value={pasted} onInput={(e) => setPasted((e.target as HTMLTextAreaElement).value)} placeholder="Paste saved text here" />
        </label>
        <div class="actions"><button class="btn" disabled={!pasted.trim()} onClick={doImport}>Load</button></div>
        {msg && <p role="status" class="small">{msg}</p>}
        <h3>Remove {profile.name}</h3>
        {!confirmDel
          ? <button class="btn danger" onClick={() => setConfirmDel(true)}>Delete this learner</button>
          : <div class="actions"><span>This erases their progress on this device.</span><button class="btn danger" onClick={() => removeProfile(profile.id)}>Yes, delete</button><button class="btn" onClick={() => setConfirmDel(false)}>Cancel</button></div>}
      </section>
    </div>
  );
}

