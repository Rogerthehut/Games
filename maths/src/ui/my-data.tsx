import { printPage, saveFile } from "../native/bridge";
import { useEffect, useState } from "preact/hooks";
import { describeExport, STATUS_PLAIN, type MyData } from "../engine/my-data";
import { CubeMark, Wordmark } from "./wordmark";
import { Icon } from "./icons";

const fmt = (t: number | null) => (t ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Not yet");
const today = () => new Date().toISOString().slice(0, 10);

const save = (name: string, type: string, text: string) => void saveFile(name, text, type);

/**
 * Everything quarter holds for the account, written for a person to read, with a button to save it as a PDF or print it.
 * The raw data file is there too, for anyone who wants to move it to another service.
 */
export function MyDataPage({ load, email, onBack }: { load(): Promise<unknown>; email?: string; onBack(): void }) {
  const [raw, setRaw] = useState<unknown>(null);
  const [data, setData] = useState<MyData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { let alive = true; load().then((r) => { if (alive) { setRaw(r); setData(describeExport(r, email)); } }, () => alive && setFailed(true)); return () => { alive = false; }; }, []);

  const print_ = () => {
    const before = document.title;
    document.title = `quarter-information-${today()}`;
    const restore = () => { document.title = before; removeEventListener("afterprint", restore); };
    addEventListener("afterprint", restore);
    printPage();
  };

  return (
    <main class="pr-page">
      <div class="pr-toolbar">
        <button type="button" class="btn" onClick={onBack}><Icon name="back" size={18} /> Back</button>
        {data && (
          <div class="pr-toolbar-actions">
            <button type="button" class="btn primary" onClick={print_} data-testid="mydata-print">Save as PDF or print</button>
          </div>
        )}
      </div>
      {data && <p class="pr-hint">To save a PDF, choose “Save as PDF” as the printer in the print window.</p>}

      {failed && <p class="alert-note" role="alert">We couldn't get your information just now. Please check your connection and try again.</p>}
      {!data && !failed && <p role="status">Getting your information…</p>}

      {data && (
        <article class="pr-doc" data-testid="my-data">
          <header class="pr-head">
            <div class="pr-brand"><CubeMark /><Wordmark /></div>
            <div class="pr-title">
              <p class="pr-kicker">Your information</p>
              <h1>What quarter holds</h1>
              <p class="pr-sub">Prepared {fmt(Date.now())}</p>
            </div>
          </header>

          <section class="pr-sec">
            <h2>Your account</h2>
            <dl class="md-rows">
              {data.email && <><dt>Email address</dt><dd>{data.email}</dd></>}
              <dt>Account opened</dt><dd>{fmt(data.created)}</dd>
              <dt>Terms and privacy notice agreed</dt><dd>{data.agreedAt ? fmt(data.agreedAt) : "Not yet"}</dd>
              <dt>Subscription</dt>
              <dd>{data.subscription
                ? `${STATUS_PLAIN[data.subscription.status] ?? data.subscription.status}${data.subscription.plan ? `, ${data.subscription.plan}` : ""}${data.subscription.status === "trialing" && data.subscription.trialEnd ? `, trial ends ${fmt(data.subscription.trialEnd)}` : data.subscription.renews ? `, ${data.subscription.cancelling ? "ends" : "renews"} ${fmt(data.subscription.renews)}` : ""}`
                : "None"}</dd>
            </dl>
          </section>

          <section class="pr-sec">
            <h2>{data.learners.length === 1 ? "The learner" : "The learners"}</h2>
            {data.learners.length === 0 && <p class="pr-none">No learners have been added.</p>}
            {data.learners.map((l, i) => (
              <div key={i} class="pr-attn md-learner">
                <h3>{l.name} <span class="pr-pill">{l.year ? `Year ${l.year}` : "Year not set"}</span></h3>
                <dl class="md-rows">
                  <dt>Added</dt><dd>{fmt(l.added)}</dd>
                  <dt>Last practised</dt><dd>{fmt(l.lastPractised)}</dd>
                  <dt>Topics practised</dt><dd>{l.topicsPractised}</dd>
                  <dt>Practice sessions</dt><dd>{l.sessions}</dd>
                  <dt>Questions answered</dt><dd>{l.questionsAnswered}</dd>
                  <dt>Check-ups and practice papers</dt><dd>{l.checkups} check-up{l.checkups === 1 ? "" : "s"}, {l.papers} paper{l.papers === 1 ? "" : "s"}</dd>
                  <dt>AI tutor</dt><dd>{l.tutorOn ? "Switched on" : "Switched off"}</dd>
                </dl>
              </div>
            ))}
            <p class="pr-cap">For each learner we also keep their avatar and settings, the results of each topic, and their plan.</p>
          </section>

          <section class="pr-sec">
            <h2>What we don't keep</h2>
            <ul class="pr-list">
              <li>Real names, birthdays, photos or home addresses.</li>
              <li>Conversations with the AI tutor or AI assistant. They stay on your device, or aren't saved at all.</li>
              <li>Card details. Payments are handled by Stripe.</li>
              <li>Your password. Sign-in is handled by Clerk.</li>
            </ul>
          </section>

          <section class="pr-sec">
            <h2>Your choices</h2>
            <p>You can change a learner's name, turn the AI tutor on or off, download this information, or delete the whole account in the Parents' area, under Settings. Deleting removes the account, every learner and the subscription, for good. For anything else, <a class="legal-link" href="./?info=contact">message us</a>.</p>
          </section>

          <footer class="pr-foot">
            <p class="pr-credit">Prepared by quarter, a trading name of Wristed Ltd · yourquarter.co.uk</p>
          </footer>
        </article>
      )}

      {data && (
        <p class="small muted md-tech">Moving to another service, or need the exact data? <button type="button" class="linkish" onClick={() => save(`quarter-data-${today()}.json`, "application/json", JSON.stringify(raw, null, 2))} data-testid="mydata-json">Download the data file</button> (a technical format for computers).</p>
      )}
    </main>
  );
}
