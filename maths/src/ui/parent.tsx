import { useRef, useState } from "preact/hooks";
import { ALL_SKILLS, SKILLS, STAGE_LABEL } from "../curriculum";
import { buildRefresher, canRefresh, refresherTopics } from "../engine/refresher";
import { mulberry32 } from "../engine/rng";
import { DAY, TUTOR_LOG_DAYS, skillName, statusOf, weekStats, type Profile, type SkillState } from "../engine/progress";
import { yearLabel } from "../engine/diagnostic";
import { useTutorAvailable } from "./tutor";
import { useApp } from "./context";
import { useAccount } from "./account-context";
import { AccountSection, SubscriptionSection } from "./account-section";
import { BookletSection } from "./booklet";
import { Icon } from "./icons";
import { LegalFooter } from "./legal";
import { STATUS_LABEL_PARENT } from "./labels";
import { Maths } from "./maths";
import { downloadProgressCsv } from "./progress-report";
import { ParentAssistant } from "./assistant";
import { conceptsForSkill } from "../concepts";
import { FeedbackSection } from "./feedback";
import { Guides } from "./guides";
import { PinSettings } from "./pin-settings";
import { SkillFilterControls, filterSkills, type SkillFilters } from "./skill-filters";

const when = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
type Part = "progress" | "assistant" | "tutor" | "guides" | "settings" | "feedback";

export function Parent() {
  const { profile, update, go, removeProfile } = useApp();
  const account = useAccount();
  const [part, setPart] = useState<Part>("progress");
  const [filters, setFilters] = useState<SkillFilters>({});
  const visibleSkills = filterSkills(filters).sort((a, b) => a.year - b.year);
  const topicsHeading = useRef<HTMLHeadingElement>(null);
  const stats = weekStats(profile);
  const [confirmDel, setConfirmDel] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [nameSaved, setNameSaved] = useState(false);
  const tutorUp = useTutorAvailable();
  const log = profile.tutorLog ?? [];
  const worries = log.filter((e) => e.flag === "wellbeing" && !e.seen);
  const flagLabel: Record<string, string> = { wellbeing: "Wellbeing", "personal-info": "Personal details", "off-topic": "Off topic", limit: "Daily limit", unavailable: "Tutor unavailable" };

  const touched = ALL_SKILLS.filter((s) => (profile.skills[s.id]?.seen ?? 0) > 0);
  const byStatus = (st: string) => ALL_SKILLS.filter((s) => statusOf(profile.skills[s.id]) === st);
  const mistakes = Object.values(profile.mistakes).sort((a, b) => b.count - a.count).slice(0, 5);
  const toggleFocus = (id: string) => update((p) => ({ ...p, focus: p.focus.includes(id) ? p.focus.filter((x) => x !== id) : [...p.focus, id] }));
  const needsWork = touched.filter((s) => (profile.skills[s.id] as SkillState).wrong > (profile.skills[s.id] as SkillState).right * 0.5 && (profile.skills[s.id] as SkillState).seen >= 3);
  const last = profile.baselines[profile.baselines.length - 1];

  const changeYear = (year: number) =>
    update((p: Profile) => {
      const skills = { ...p.skills };
      for (const s of SKILLS) if (s.year < year && !skills[s.id]) skills[s.id] = { box: 3, due: Date.now() + 3 * DAY, seen: 0, right: 0, wrong: 0, last: 0, assumed: true };
      return { ...p, year, skills };
    });

  return (
    <div class="parent">
      <header class="parent-head">
        <button class="icon-btn" onClick={() => go({ name: "me" })} aria-label="Back to Me"><Icon name="back" size={22} /></button>
        <div><h1>Parents' area</h1><p class="muted">{profile.name} · Year {profile.year}</p></div>
      </header>

      {worries.length > 0 && (
        <section class="card alert" role="alert" aria-labelledby="wb">
          <h2 id="wb">Something in the AI tutor chat needs your attention</h2>
          <p>{profile.name} wrote something that suggested they may be upset or unsafe. The tutor replied kindly, told them to speak to a trusted adult, and pointed to Childline (0800 1111, free). A gentle chat is worth having.</p>
          <ul class="finding-list">{worries.map((e) => <li key={e.at}><span class="small muted">{new Date(e.at).toLocaleString("en-GB")}</span><p>“{e.child}”</p></li>)}</ul>
          <button class="btn" onClick={() => update((p) => ({ ...p, tutorLog: (p.tutorLog ?? []).map((e) => (e.flag === "wellbeing" ? { ...e, seen: true } : e)) }))}>I've seen this</button>
        </section>
      )}

      <div class="seg parts" role="tablist" aria-label="Sections">
        {([["progress", "Progress"], ...(account ? [["assistant", "AI assistant"]] : []), ["tutor", "AI tutor"], ["guides", "Guides"], ["settings", "Settings"], ...(account ? [["feedback", "Feedback"]] : [])] as [Part, string][]).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={part === id} class={part === id ? "on" : ""} onClick={() => setPart(id)} data-testid={`part-${id}`}>{label}</button>
        ))}
      </div>

      {part === "progress" && (
        <>
          <section class="card" aria-labelledby="pr-card">
            <h2 id="pr-card">Progress report</h2>
            <p>A clear, printable summary of {profile.name}'s progress to share with a tutor or teacher: level, topics, practice and what to talk about.</p>
            <div class="actions">
              <button class="btn primary" onClick={() => go({ name: "progress-report" })} data-testid="open-progress-report">Open the report</button>
              <button class="btn" onClick={() => downloadProgressCsv(profile)} data-testid="download-progress-csv">Spreadsheet (CSV)</button>
            </div>
          </section>

          <section class="card" aria-labelledby="refresher-card">
            <h2 id="refresher-card">Weekly refresher</h2>
            {canRefresh(profile)
              ? <p>{profile.name} practised {refresherTopics(profile).length} topics this week. A quick-fire set of 10 questions revises them before moving on, and the tricky ones come back sooner.</p>
              : <p class="muted">A refresher becomes available once {profile.name} has practised at least three topics in a week.</p>}
            <div class="actions"><button class="btn primary" disabled={!canRefresh(profile)} onClick={() => go({ name: "practice", plan: buildRefresher(profile, Date.now(), mulberry32(Date.now())) })} data-testid="parent-refresher">Start a refresher</button></div>
          </section>

          <section class="card">
            <h2>Check-up</h2>
            {!last ? <p class="muted">No check-up yet. It finds the starting point and any gaps.</p> : (
              <p>Last done {when(last.at)}: working at {yearLabel(last.theta)}.{Date.now() - last.at > 42 * DAY && <> It's been over six weeks, so another would show progress.</>}</p>
            )}
            <div class="actions">
              {last && <button class="btn" onClick={() => go({ name: "report" })}>Read the report</button>}
              <button class="btn" onClick={() => go({ name: "checkup" })}>{last ? "Do it again" : "Start the check-up"}</button>
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
                <div><dt>Right</dt><dd>{stats.accuracy}%</dd></div>
              </dl>
            )}
            <p class="small muted">Little and often works best. Ten minutes on four or five days beats one long session.</p>
          </section>

          <section class="card">
            <h2>Where they are</h2>
            <div class="status-row">
              {(["secure", "growing", "learning", "assumed", "new"] as const).map((st) => (
                <div key={st} class={`status-box ${st}`}><strong>{byStatus(st).length}</strong><span>{STATUS_LABEL_PARENT[st]}</span></div>
              ))}
            </div>
            {needsWork.length > 0 && <p><strong>Could use some help:</strong> {needsWork.map((s) => s.name).join(", ")}. The prompts below can start a conversation.</p>}
            <p class="small muted">Secure means right without help across several days. “Assumed known” topics are from earlier years and haven't been checked yet. They come back for a quick review after a few days.</p>
          </section>

          <section class="card">
            <h2>Mistakes worth talking about</h2>
            {mistakes.length === 0 ? <p class="muted">Nothing repeated yet. Slips show up here once they happen more than once.</p> : (
              <ul class="mistakes">
                {mistakes.map((m) => (
                  <li key={m.skill + m.message}>
                    <div><strong>{skillName(m.skill)}</strong> <span class="badge">{m.count}×</span></div>
                    <p><Maths text={m.message} /></p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section class="card">
            <h2 ref={topicsHeading}>Topics, explained</h2>
            <p class="small muted">Tick “Focus” to move a topic into the next sessions, for example to match what you're teaching this week.</p>
            <SkillFilterControls filters={filters} onChange={(next) => {
              setFilters(next);
              topicsHeading.current?.scrollIntoView({ block: "start" });
            }} count={visibleSkills.length} />
            <ul class="topics">
              {visibleSkills.map((s) => {
                const st = profile.skills[s.id];
                return (
                  <li key={s.id}>
                    <details>
                      <summary>
                        <span class="t-name">{s.name}</span>
                        <span class="badge">{STAGE_LABEL[s.stage]} · Y{s.year}</span>
                        <span class={`status ${statusOf(st)}`}>{STATUS_LABEL_PARENT[statusOf(st)]}</span>
                      </summary>
                      <div class="t-body">
                        <p><strong>How to explain it.</strong> <Maths text={s.parentNote} /></p>
                        <p><strong>Ask them.</strong> {s.talkAbout}</p>
                        {conceptsForSkill(s.id).length > 0 && (
                          <p class="concept-links"><strong>Learn more.</strong>{" "}{conceptsForSkill(s.id).map((c) => <button type="button" key={c.id} class="chip-btn" onClick={() => go({ name: "concept", id: c.id }, { name: "parent" })} data-testid={`concept-link-${c.id}`}>{c.title}</button>)}</p>
                        )}
                        {st && st.seen > 0 && <p class="small muted">{st.right} right, {st.wrong} wrong. Last practised {when(st.last)}. Due again {when(st.due)}.</p>}
                        <label class="check"><input type="checkbox" checked={profile.focus.includes(s.id)} onChange={() => toggleFocus(s.id)} /> Focus on this</label>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {part === "assistant" && account && <ParentAssistant />}
      {part === "feedback" && account && <FeedbackSection />}
      {part === "guides" && <Guides />}

      {part === "tutor" && (
        <section class="card" aria-labelledby="tut">
          <h2 id="tut">AI tutor</h2>
          <p>An optional helper in practice. It guides and explains without just giving the answer. It's off until you turn it on. It is never available in check-ups, practice papers or end-of-pathway tests.</p>
          <label class="check"><input type="checkbox" id="tutor-on" checked={!!profile.tutor?.enabled} onChange={(e) => update((p) => ({ ...p, tutor: { enabled: (e.target as HTMLInputElement).checked, reveal: p.tutor?.reveal ?? "guide" } }))} /> Allow the AI tutor in practice for {profile.name}</label>
          <label class="inline">
            <span class="field-label">How much help</span>
            <select id="tutor-reveal" value={profile.tutor?.reveal ?? "guide"} onChange={(e) => update((p) => ({ ...p, tutor: { enabled: p.tutor?.enabled ?? false, reveal: (e.target as HTMLSelectElement).value as "guide" | "after-tries" } }))}>
              <option value="guide">Guide only. Never gives the final answer.</option>
              <option value="after-tries">May show the working after two wrong tries</option>
            </select>
          </label>
          <p class="small muted">Status: {tutorUp === null ? "checking…" : tutorUp ? "connected" : "not connected in this version, so the tutor button won't show yet"}.</p>
          <details class="how"><summary>What happens to what's typed</summary>
            <p>The service receives the message, recent chat, school year and current maths question and attempts. It uses a random browser ID and IP address to limit requests. It may pass the chat and maths context to an AI provider for a reply. The app keeps a conversation log in this browser.</p>
            <p>Keep personal details out of messages. The tutor can make mistakes, so check anything important with a teacher. <a class="legal-link" href="./?info=privacy">Read the Privacy notice</a>.</p>
          </details>
          <h3>Conversation log</h3>
          {log.length === 0 ? <p class="muted">Nothing yet. Every exchange shows up here, newest first.</p> : (
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
          {log.length > 0 && <p class="small muted">Chats are kept on this device for {TUTOR_LOG_DAYS} days, then removed.</p>}
        </section>
      )}

      {part === "settings" && (
        <>
          <section class="card" aria-labelledby="who-h">
            <h2 id="who-h">Name or nickname</h2>
            <label class="inline">
              <span class="field-label">What should we call them?</span>
              <input id="learner-name" value={nameDraft} maxLength={24} autoComplete="off" onInput={(e) => setNameDraft((e.target as HTMLInputElement).value)} data-testid="learner-name" />
            </label>
            <p class="small muted">A nickname is best. Please don't use a full name.</p>
            <div class="actions"><button class="btn primary" disabled={!nameDraft.trim() || nameDraft.trim() === profile.name} onClick={() => { update((p) => ({ ...p, name: nameDraft.trim() })); setNameSaved(true); }} data-testid="save-name">Save</button>{nameSaved && nameDraft.trim() === profile.name && <span role="status" class="small">Saved.</span>}</div>
          </section>

          <section class="card">
            <h2>School year</h2>
            <label class="inline">
              <span class="sr">School year</span>
              <select value={profile.year} onChange={(e) => changeYear(+(e.target as HTMLSelectElement).value)}>
                {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((y) => <option value={y}>Year {y}</option>)}
              </select>
            </label>
          </section>

          <PinSettings />
          <BookletSection />
          {account && <SubscriptionSection />}
          {account && <AccountSection />}

          <section class="card" aria-labelledby="help-info">
            <h2 id="help-info">Help and information</h2>
            <LegalFooter />
          </section>

          <section class="card">
            <h2>Remove {profile.name}</h2>
            {!confirmDel
              ? <button class="btn danger" onClick={() => setConfirmDel(true)}>Delete this learner</button>
              : <div class="actions"><span>{account ? "This erases their progress from your account." : "This erases their progress on this device."}</span><button class="btn danger" onClick={() => removeProfile(profile.id)}>Yes, delete</button><button class="btn" onClick={() => setConfirmDel(false)}>Cancel</button></div>}
          </section>
        </>
      )}
    </div>
  );
}

