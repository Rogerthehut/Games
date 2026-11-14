import { ALL_SKILLS, SKILL_BY_ID, STAGE_LABEL } from "../curriculum";
import { STAGE_ORDER } from "../engine/activity";
import { canTakePathwayTest, pathwayTestName } from "../engine/pathway";
import { currentWeek } from "../engine/plan";
import { skillName, type Profile } from "../engine/progress";
import { makeSearchIndex } from "../engine/search";
import type { Stage } from "../engine/types";
import { legalPages, legalTitles } from "../legal/content";
import type { Route } from "./context";
import { legalHref, sitemapHref } from "./legal";
import { WORLDS } from "./world-scene";
import parentContent from "../parents/content.json";
import admissions from "../parents/admissions.json";
import { CONCEPTS } from "../concepts";

type Entry = {
  title: string;
  detail: string;
  keywords: string;
  year?: number;
  stage?: Stage;
  destination: { route: Route; back?: Route } | { href: string };
};

function entry(title: string, detail: string, keywords: string, route: Route, back?: Route): Entry {
  const skillId = route.name === "map" ? route.skill : back?.name === "map" ? back.skill : undefined;
  const skill = skillId ? SKILL_BY_ID[skillId] : undefined;
  const stage = skill?.stage ?? ("stage" in route ? route.stage : undefined);
  const year = skill?.year;
  return {
    title, keywords, stage, year, destination: { route, back },
    detail: detail === "Lesson" && skill ? `Lesson · ${STAGE_LABEL[skill.stage]} · Year ${year}` : detail,
  };
}

const pages = [
  entry("Today", "Page", "home activities dashboard start practice daily streak", { name: "home" }),
  entry("Skills", "Page", "journey map list path topics chapter index curriculum", { name: "map" }),
  entry("Little ones", "Page", "toddler baby nursery reception pre-school preschool early years under five counting tracing shapes colours play", { name: "little" }),
  entry("Count with me", "Little ones activity", "little ones counting count numbers toddler nursery reception one to ten", { name: "little", activity: "count" }),
  entry("Trace the number", "Little ones activity", "little ones tracing writing numbers digits draw finger nursery", { name: "little", activity: "trace" }),
  entry("Add and take away", "Little ones activity", "little ones adding taking away subtract ducks biscuits sums early years", { name: "little", activity: "add" }),
  entry("Shape sorter", "Little ones activity", "little ones shapes circle square triangle star sorting matching", { name: "little", activity: "shapes" }),
  entry("Colour by number", "Little ones activity", "little ones colouring colour by numbers picture paint numerals", { name: "little", activity: "colour" }),
  entry("Hundred square", "Little ones activity", "little ones hundred square numbers to 100 counting in tens find the number", { name: "little", activity: "hundred" }),
  entry("Tens and units", "Little ones activity", "little ones tens and units ones place value rods cubes two-digit numbers base ten", { name: "little", activity: "tens" }),
  entry("Snap", "Little ones activity", "little ones snap cards matching game pairs lemons numbers objects", { name: "little", activity: "snap" }),
  entry("Your plan", "Page", "study next steps schedule weekly plan", { name: "plan" }),
  entry("Me", "Page", "profile progress streak points settings", { name: "me" }),
  entry("Choose your avatar", "Me", "characters hairstyle glasses customisation scholar artist", { name: "me", section: "avatar" }),
  entry("Look and feel", "Me", "settings theme appearance light dark mode scholar navigator explorer", { name: "me", section: "look" }),
  entry("Sound", "Me", "settings read aloud narration voice audio effects", { name: "me", section: "sound" }),
  entry("Who’s learning", "Me", "profiles learner switch add import", { name: "me", section: "who" }),
  entry("Grown-ups’ area", "Page", "parents carers adults settings", { name: "parent" }),
  entry("Check-up", "Activity", "find your level baseline assessment diagnostic test", { name: "checkup" }),
  { title: "Sitemap", detail: "Information", keywords: "site map navigation public pages", destination: { href: sitemapHref } },
  ...[parentContent.hub, parentContent.faq].map(({ title, path, description }): Entry => ({
    title, detail: "For parents", keywords: `parents help questions resources ${description}`, destination: { href: path },
  })),
  ...parentContent.guides.map(({ title, path, keywords }): Entry => ({
    title, detail: "Parent guide", keywords, destination: { href: path },
  })),
  ...admissions.map(({ id, area, keywords }): Entry => ({
    title: `11+ guidance for ${area}`, detail: "Admissions guidance", keywords,
    destination: { href: `11-plus-maths.html#${id}` },
  })),
  ...legalPages.map((page): Entry => ({
    title: legalTitles[page], detail: "Information", keywords: "legal policy notice",
    destination: { href: legalHref(page) },
  })),
];

const lessons = [
  entry("Equal groups", "Lesson", "multiplication times tables arrays", { name: "equal-groups" }, { name: "map", skill: "times-tables" }),
  entry("Telling the time", "Lesson", "clock hours minutes analogue digital elapsed time", { name: "time-lesson" }, { name: "map", skill: "elapsed-time" }),
  entry("Explore angles", "Lesson", "interactive angle turns degrees protractor acute obtuse reflex right angle", { name: "angles-lesson" }, { name: "map", skill: "angles-basic" }),
  entry("Equivalent fractions", "Lesson", "fraction pieces halves quarters same value", { name: "fractions-lesson" }, { name: "map", skill: "frac-equiv" }),
];

const curriculum = [
  ...STAGE_ORDER.map((stage) =>
    entry(WORLDS[stage], `World · ${STAGE_LABEL[stage]}`, `${stage} ${STAGE_LABEL[stage]} journey map path`, { name: "map", stage, view: "journey" })),
  entry("STEM lab", "Area", "stem computing coding programming data science ai artificial intelligence machine learning quantum binary algorithms", { name: "stem" }),
  ...ALL_SKILLS.map((skill) => entry(
    skill.name, `Skill · ${STAGE_LABEL[skill.stage]} · Year ${skill.year}`,
    `${skill.blurb} ${skill.strand} ${skill.stage} ${STAGE_LABEL[skill.stage]} year ${skill.year} y${skill.year} ${WORLDS[skill.stage]}`,
    skill.strand === "STEM" ? { name: "stem" } : { name: "map", skill: skill.id },
  )),
];

const studyGuides = CONCEPTS.map((c) => entry(c.title, `Study guide · ${c.years}`, `${c.summary} ${c.id.replace(/-/g, " ")} explain explanation learn study idea`, { name: "concept", id: c.id }));

export function quarterSearch(profile: Profile) {
  const available: Entry[] = [];
  const draft = profile.practiceDraft;
  if (draft) available.push(entry(`Continue practice · ${skillName(draft.q.skill)}`, "Saved activity", "resume saved practice", { name: "practice", plan: draft.plan, resume: true }));
  if (profile.diag?.draft || profile.diag?.responses.length) {
    available.push(entry("Continue your check-up", "Saved activity", "resume saved assessment", { name: "checkup" }));
  }
  if (profile.baselines.length) {
    available.push(entry("Your check-up results", "Report", "score progress baseline report diagnostic", { name: "report" }));
  }
  if (profile.plan && currentWeek(profile.plan, Date.now())?.kind === "mock") {
    available.push(entry("Practice paper", "Activity", "timed mock exam test", { name: "mock" }));
  }
  for (const stage of STAGE_ORDER) {
    if (canTakePathwayTest(profile, stage)) {
      const saved = Boolean(profile.pathwayDrafts?.[stage]);
      available.push(entry(saved ? `Continue ${pathwayTestName(stage)}` : pathwayTestName(stage),
        saved ? "Saved activity" : "Activity", `${stage} assessment ${saved ? "resume saved" : ""}`, { name: "pathway-test", stage }));
    }
    if (profile.certificates?.some((award) => award.stage === stage)) {
      available.push(entry(`${STAGE_LABEL[stage]} certificate`, "Certificate", `${stage} award achievement download`, { name: "certificate", stage }));
    }
  }
  return makeSearchIndex([...pages, ...lessons, ...curriculum, ...studyGuides, ...available]);
}
