import type { Block } from "../concepts/types";

/** Articles for parents. Written for quarter. Dates are when each was published. */
export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  body: Block[];
  /** Pages on the site that go with the article. */
  related: { label: string; path: string }[];
}

export const POSTS: Post[] = [
  {
    slug: "ten-minutes-a-day",
    title: "Ten minutes a day: why short maths practice works",
    description: "Short, regular maths practice is easier to keep up and easier to remember than long sessions. Here's how to make ten minutes count.",
    date: "2026-11-02",
    tags: ["Routines", "Practice"],
    body: [
      { p: "Most children can concentrate hard on one thing for a surprisingly short time. After that, more minutes at the table mean more frustration, not more learning. That's why short, regular practice usually beats the long weekend session." },
      { h: "Why little and often works" },
      { p: "Memory strengthens when we come back to an idea after a gap. Seeing a topic for ten minutes on Monday, Wednesday and Friday helps it stick far better than meeting it for thirty minutes once. Each return is a small effort to remember, and that effort is what builds the memory." },
      { h: "Making ten minutes count" },
      { list: ["Choose a regular moment, such as after a snack or before tea, so it becomes part of the day.", "Start with something they can do. A quick win makes the harder question feel possible.", "Stop when the time is up, even if they're keen. Leaving them wanting more makes tomorrow easier.", "Mix new and old. Coming back to last week's topic is as useful as meeting a new one."] },
      { h: "What to do when it goes badly" },
      { p: "Some days are just off. If your child is tired or upset, stop and try again tomorrow. One missed session costs far less than a battle that makes maths feel like a fight." },
      { h: "Let the practice do the planning" },
      { p: "On quarter, a session is built to take about ten minutes, with a mix of the topic being learned and earlier ones that are due a revisit. Hints and worked steps are there when they're stuck, so you don't have to be the maths expert at tea time." },
    ],
    related: [{ label: "A simple routine for maths practice at home", path: "maths-practice-at-home.html" }, { label: "FAQs for parents", path: "faqs.html" }],
  },
  {
    slug: "learning-times-tables",
    title: "How to help your child learn their times tables",
    description: "Times tables are easier when children see the patterns first, then practise in short bursts. A friendly guide for parents of Years 3 and 4.",
    date: "2026-11-03",
    tags: ["Times tables", "Key Stage 2"],
    body: [
      { p: "Times tables are one of the biggest jumps in primary maths, and knowing them well makes fractions, division, area and algebra much smoother later on. By the end of Year 4, children are expected to know all the tables up to 12 × 12." },
      { h: "Start with the pattern, not the chant" },
      { p: "A table is a pattern of equal groups. Four threes is four groups of three, which is also three groups of four. Drawing arrays, with rows of dots, shows that the order doesn't matter and halves the number of facts to learn." },
      { h: "Use the easy tables as anchors" },
      { list: ["2s are doubles, and 4s are double doubles.", "5s and 10s end in 5 or 0, and 10s are just a zero on the end.", "9s have a pattern: the digits of the answer add up to 9.", "If you know 6 × 7 is 42, then 7 × 6 is too."] },
      { h: "Practise little and often" },
      { p: "A few minutes a day beats a long session. Mix the tables up, and spend more time on the facts that are slow, not on the ones that are already quick." },
      { h: "Keep it light" },
      { p: "Pressure makes recall harder. A friendly timed round can be fun, but it shouldn't become a test of nerves. Celebrate facts that become quick." },
      { p: "On quarter, the times tables area fills in a grid as facts become quick and keeps coming back to the tricky ones, with an optional timed check when they feel ready." },
    ],
    related: [{ label: "A parent's guide to Key Stage 2 maths", path: "key-stage-2-maths.html" }, { label: "Multiplication as groups and arrays", path: "learn/multiplication-arrays.html" }],
  },
  {
    slug: "what-is-the-11-plus",
    title: "What is the 11+? A plain guide for parents",
    description: "The 11+ is the entrance test used by selective schools in some parts of England. Here's what it usually involves and how to start preparing calmly.",
    date: "2026-11-04",
    tags: ["11+", "Selective schools"],
    body: [
      { p: "The 11+ is an entrance test taken in Year 6 (and sometimes Year 5) by children applying to selective schools, usually grammar schools. It isn't a single national exam. Each area or school chooses its own test, so the first job is to find out what yours involves." },
      { h: "What's usually in it" },
      { list: ["Maths, based on the primary curriculum, with some trickier problems.", "English: comprehension, and sometimes writing.", "Verbal reasoning: word and letter puzzles.", "Non-verbal reasoning: patterns and shapes."] },
      { p: "Not every area tests all four. Some use only maths and English, others add reasoning, and the format can change from year to year." },
      { h: "Where to start" },
      { list: ["Check the school or council admissions page for which tests are used and when to register.", "Look at the sample papers or familiarisation material the test provider publishes.", "Work on the maths foundations first. Most 11+ maths is primary maths used cleverly."] },
      { h: "Preparing calmly" },
      { p: "A steady routine over months is far better than a last-minute rush. Short sessions, plenty of variety and a relaxed attitude help children enjoy the problems rather than dread them. Mock papers are useful, but only once the basics are secure." },
      { p: "Our 11+ guide has a finder for local test details, and quarter has maths and reasoning practice, including timed practice papers." },
    ],
    related: [{ label: "Getting started with 11+ maths", path: "11-plus-maths.html" }, { label: "Find your local 11+ test", path: "11-plus-maths.html#test-finder" }],
  },
  {
    slug: "when-your-child-says-they-cant-do-maths",
    title: "When your child says “I can't do maths”",
    description: "A calm, practical way to respond when a child decides they're bad at maths, from the first wobble to rebuilding confidence.",
    date: "2026-11-05",
    tags: ["Confidence", "Mindset"],
    body: [
      { p: "“I'm rubbish at maths” can be heartbreaking to hear. It's also very common, and it usually means a child hit something tricky and decided it says something about them. The good news is that it can change." },
      { h: "Add the word “yet”" },
      { p: "“I can't do fractions yet” is true and hopeful. It treats the difficulty as a step along the way, not a fixed fact about who they are." },
      { h: "Find the real gap" },
      { p: "Maths builds on itself. A struggle with long division is often really a shaky grasp of times tables or place value underneath. Going back a step, without any fuss, usually fixes more than pushing forward." },
      { h: "Praise the thinking" },
      { list: ["“I like how you tried a different way.”", "“You spotted your mistake. That's what mathematicians do.”", "“That one was tricky, and you stuck with it.”"] },
      { h: "Make mistakes normal" },
      { p: "Say your own mistakes out loud and show how you fix them. Children who see mistakes as information keep going; children who see them as failures stop." },
      { h: "Small wins matter" },
      { p: "Start each session with something they can do, and end on a success. Confidence comes from lots of small, real wins." },
      { p: "quarter starts with a short check-up so the first questions are at the right level, and every question has a hint and worked steps, so being stuck is never the end of the road." },
    ],
    related: [{ label: "A simple routine for maths practice at home", path: "maths-practice-at-home.html" }, { label: "FAQs for parents", path: "faqs.html" }],
  },
  {
    slug: "what-is-stem-and-why-start-early",
    title: "What is STEM, and why does it start at seven?",
    description: "STEM means science, technology, engineering and maths. Here's what it looks like for primary-age children, and how computing, data and AI ideas begin early.",
    date: "2026-11-06",
    tags: ["STEM", "Computing"],
    body: [
      { p: "STEM stands for science, technology, engineering and maths. It's an umbrella for the subjects that explain how things work and how to make things. At primary age, it's much less about jargon and much more about asking questions and trying things." },
      { h: "Maths is the root" },
      { p: "Computing and data science grow out of maths. Binary is place value in base two. A program that repeats steps is multiplication in action. Sorting data uses ordering and comparison. Children who are comfortable with number are already part-way there." },
      { h: "What children can explore early" },
      { list: ["Giving precise instructions, like programming a robot across a grid.", "Loops: repeating steps without writing them out again.", "Reading data in tables and charts, and noticing patterns.", "How a computer learns from examples, and why the examples matter."] },
      { h: "Why not wait?" },
      { p: "Ideas like algorithms and data are everywhere in daily life, from maps to music apps. Meeting them early, in a simple and playful way, means that later work in computer science, physics and AI feels familiar, not frightening." },
      { h: "Keeping it age-appropriate" },
      { p: "In the quarter STEM lab, the same ideas grow with the child. A seven-year-old follows a robot's instructions, a twelve-year-old writes binary numbers and a sixteen-year-old calculates a neuron's output. Every age gets a version that's simple, true and fun." },
    ],
    related: [{ label: "Algorithms and loops", path: "learn/algorithms-and-loops.html" }, { label: "Binary numbers", path: "learn/binary-numbers.html" }, { label: "What quarter covers: STEM", path: "curriculum/stem.html" }],
  },
  {
    slug: "talking-to-children-about-ai",
    title: "How to talk to your child about AI",
    description: "AI is part of children's lives already. Here are simple, honest ways to explain what it does, why it can be wrong and how to use it well for learning.",
    date: "2026-11-09",
    tags: ["AI", "Safety"],
    body: [
      { p: "Children meet AI in voice assistants, recommendation feeds, photo apps and chatbots. They don't need a computer science degree to understand it, but a few honest ideas go a long way." },
      { h: "What AI does" },
      { p: "Most AI you'll hear about is a program that has learned patterns from lots of examples. Show it thousands of labelled photos and it learns what a cat tends to look like. Show it lots of writing and it learns which words tend to follow which." },
      { h: "Why it can be wrong" },
      { list: ["It learns from examples, so if the examples are missing something, it can get that wrong.", "It can sound confident when it's mistaken.", "It doesn't understand things the way people do. It finds patterns."] },
      { h: "Three habits to teach" },
      { list: ["Check: compare an AI answer with a trusted source, like a book, a teacher or a parent.", "Protect: don't share names, addresses, school details or photos.", "Ask well: ask for hints and explanations, not just answers. You learn by doing the thinking."] },
      { h: "Questions to ask together" },
      { list: ["How do you think it knew that?", "What could it have got wrong?", "How could we check?"] },
      { p: "In the quarter STEM lab, children try nearest-neighbour examples, see how lopsided data leads to unfair results and work through a tiny artificial neuron. The optional AI tutor is designed to ask questions and give hints, not to hand over answers." },
    ],
    related: [{ label: "How machines learn from examples", path: "learn/machine-learning-examples.html" }, { label: "Fair and unfair data", path: "learn/ai-fairness.html" }],
  },
];

export const POST_BY_SLUG: Record<string, Post> = Object.fromEntries(POSTS.map((p) => [p.slug, p]));
