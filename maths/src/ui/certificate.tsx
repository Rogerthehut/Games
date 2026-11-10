import { STAGE_LABEL } from "../curriculum";
import { canTakePathwayTest, nextStage } from "../engine/pathway";
import type { Stage } from "../engine/types";
import { Avatar } from "./avatar";
import { useApp } from "./context";
import { Icon } from "./icons";
import { CubeMark, Wordmark } from "./wordmark";

export function PathwayFinish({ stage, className, top }: { stage: Stage; className?: string; top?: number }) {
  const { profile, go } = useApp();
  if (!canTakePathwayTest(profile, stage)) return null;

  return (
    <section class={`pathway-milestone workbook-panel ${className ?? ""}`} style={top === undefined ? undefined : { top }} aria-label={`${STAGE_LABEL[stage]} final test`}>
      <div>
        <h2>{STAGE_LABEL[stage]} final test</h2>
        <p>You’ve finished the topics in this pathway. Now try a question from each topic.</p>
      </div>
      <button type="button" class="btn primary" onClick={() => go({ name: "pathway-test", stage })}>Take the final test</button>
    </section>
  );
}

export function Certificate({ stage }: { stage: Stage }) {
  const { profile, go } = useApp();
  const award = profile.certificates?.find((item) => item.stage === stage);
  const next = nextStage(stage);

  return (
    <main class="page certificate-page">
      {award ? (
        <>
          <article class="certificate-paper">
            <div class="certificate-brand"><CubeMark /><Wordmark /></div>
            <div class="certificate-avatar"><Avatar choice={profile.avatar} size={72} /><Icon name="star" size={32} /></div>
            <p class="eyebrow">quarter maths pathway</p>
            <h1>Certificate of achievement</h1>
            <p class="muted">Presented to</p>
            <p class="certificate-name">{profile.name}</p>
            <p>For completing quarter’s <strong>{STAGE_LABEL[stage]}</strong> pathway and passing its test.</p>
            <p class="small muted">{new Date(award.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · {award.score} out of {award.total}</p>
            <p class="small muted">A quarter learning milestone.</p>
          </article>
          <div class="actions certificate-actions">
            <button class="btn primary" onClick={() => window.print()}>Print or save as PDF</button>
            {next && <button class="btn" onClick={() => go({ name: "map", stage: next })}>Explore {STAGE_LABEL[next]}</button>}
            <button class="btn ghost" onClick={() => go({ name: "me" })}>Back to Me</button>
          </div>
        </>
      ) : (
        <div class="card">
          <h1>Your certificate</h1>
          <p>Pass your pathway test to earn this certificate.</p>
          <button class="btn" onClick={() => go({ name: "map", stage })}>Back to skills</button>
        </div>
      )}
    </main>
  );
}
