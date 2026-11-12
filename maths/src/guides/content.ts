/** The icons the guides use. */
export type GuideIcon = "star" | "flag" | "route" | "bulb" | "list" | "check" | "lock" | "chat" | "sliders" | "info" | "pencil" | "target" | "book" | "user" | "grid";

/**
 * The user guides shown in the Parents' area: one for grown-ups and one to read with (or give to) a child.
 * Plain words, British English, and only what the app really does. Update these when a feature changes.
 */
export interface GuideSection { id: string; title: string; /** a small picture for the section, from the app's icon set */ icon: GuideIcon; text?: string[]; steps?: string[]; tips?: string[] }

export const PARENT_GUIDE: GuideSection[] = [
  {
    id: "start", icon: "star", title: "Getting started",
    text: ["quarter is maths and STEM practice for Years 3 to 13. Each learner has their own profile, so brothers and sisters can share a device."],
    steps: [
      "Add your child with a nickname (please don't use a full name) and their school year.",
      "Optional: sign in to save their progress to your account, so it follows them to any device.",
      "Optional: take the check-up. It's about 24 questions and finds a good starting point. You can skip it and just start practising.",
      "Look at Today. The Practice card is the best place to begin: about ten minutes.",
    ],
  },
  {
    id: "week", icon: "flag", title: "A good week",
    text: ["Little and often works best. Ten minutes on four or five days beats one long session."],
    tips: [
      "Today has a short practice set chosen from what's due for review and what's next.",
      "After a few days of practice, a Quick-fire refresher appears on Today. It revises that week's topics in ten questions before moving on, and the tricky ones come back sooner.",
      "Plan shows what to work on each week, including revision weeks and practice papers.",
      "The week strip on Today shows which days your child practised.",
    ],
  },
  {
    id: "learning", icon: "route", title: "How your child learns a topic",
    text: ["Topics are on the Skills page, as a list or a journey map. The symbols on the map show the strand: + Number, : Ratio, x Algebra, cm Measures, △ Geometry, % Statistics, ∫ Calculus. A green tick means secure."],
    steps: [
      "Learn this: a short lesson with one worked example, one to try with help, three on their own, and a question that revisits earlier learning.",
      "Practise: mixed questions at the right level. Right answers move a topic up, and topics come back for review at spaced-out intervals.",
      "If you leave a lesson part-way, Today shows Continue lesson, and it picks up on the same step.",
      "In a question there are two tries. After that the steps are shown, and the topic comes back later.",
    ],
  },
  {
    id: "helping", icon: "bulb", title: "Helping without giving the answer",
    text: ["Under each question are three small buttons. They're deliberately quiet, so the screen stays plain while your child has a go first."],
    tips: [
      "Hint: a nudge towards the method.",
      "Working-out tools: beans, an abacus, a column-method sheet, a number line, a hundred square, a fraction wall, and paper with a ruler, protractor and straight-line pen. The one that suits the topic opens first.",
      "Ask: the AI tutor, only if you've switched it on (see below).",
      "On each topic's page in Parents' area there's a talk-about question to ask your child, such as how they worked something out.",
    ],
  },
  {
    id: "report", icon: "target", title: "The learning report: where they're struggling",
    text: ["This is the quickest way to see exactly what your child finds hard, and what to do about it. Open it from the Progress tab (\"Where your child is struggling\")."],
    steps: [
      "Choose a period: the last 7, 14, 30 or 90 days, or your own dates.",
      "Look at the topics, with the most to work on first. Open one to see the exact questions: what your child answered, and the right answer.",
      "Read why it may be happening. Some reasons come from their answers, such as a place-value slip or adding when the question needed multiplying. Others are common for that kind of topic.",
      "Try the methods and questions to ask together. Show the steps to work through one question side by side.",
      "Press Fix this to practise those exact questions again, followed by fresh ones. The report then shows the topic getting better, and lists topics under Looking better once the wrong answers stop.",
      "Press Work through this together under any question for a short script: read it, let them try, find where it slipped, work it through a step at a time, then they teach it back.",
      "Use the other buttons to practise the topic, take the lesson, or read the matching study guide.",
    ],
    tips: [
      "The reasons are likely explanations from the pattern of answers. They're not a diagnosis, and you know your child best.",
      "Print the report to share with a tutor or teacher.",
      "Run the check-up again every few weeks, and watch the topics move from tricky to secure.",
    ],
  },
  {
    id: "progress", icon: "list", title: "Reading the progress tab",
    tips: [
      "Last 7 days: sessions, minutes, questions and the share right.",
      "Where they are: secure (right without help across several days), growing, learning, assumed known (from earlier years, not checked yet) and new.",
      "Could use some help: topics worth a chat, with prompts to start one.",
      "Mistakes worth talking about: slips that have happened more than once.",
      "Progress report: a printable summary to share with a tutor or teacher, and a spreadsheet (CSV).",
      "Topics, explained: every topic with how it is going. Use the search box to find one, with * and ? as wildcards, and small spelling slips are fine.",
    ],
  },
  {
    id: "tables", icon: "star", title: "Times tables and the family board",
    text: ["The Times tables page (the yellow note on Today) has a facts grid that fills in as facts become quick, practice rounds, and two timed challenges: a 60-second blitz and a 25-question race."],
    tips: [
      "Each learner keeps personal bests. A Scoreboard compares everyone on your account, so brothers and sisters can compete for fun.",
      "The board shows nicknames, avatars and best scores only, and it stays inside your account. Hide a learner from it in Settings.",
      "Timed rounds are for fun and recall speed, not a test. Every round makes the facts quicker.",
    ],
  },
  {
    id: "assess", icon: "check", title: "Check-ups, practice papers and certificates",
    tips: [
      "Check-up: finds a starting point and any gaps. Another one after about six weeks shows progress.",
      "Practice papers: timed papers for the 11+ route, in the plan. Choose a short quick paper, or one timed like a real test (such as 40 minutes for 60 questions). The questions are quarter's own, so they're for practising pace and stamina, and there are no English papers.",
      "Printing a paper: on the practice paper screen, choose Print this paper instead (or Practice papers to print in the Parents' area). You get a paper to print on A4 with room to work, and a separate answer sheet and mark scheme with the steps. Every paper has a number, so the same number always makes the same paper. Only the written-answer maths papers can be printed.",
      "Pathway tests: a short test at the end of a stage (Key Stage 2, 3, GCSE, A-level). Passing earns a certificate you can print.",
    ],
  },
  {
    id: "gate", icon: "lock", title: "The grown-ups' area and your PIN",
    text: ["Find it at the bottom of the left-hand panel: a small padlock labelled Parents' area (on a phone, it's a row at the bottom of the Me page). Tap it and the sum and PIN open right there, then it takes you in. Your child can't wander in by accident: it asks a multiplication sum, then your own 6 or 8 digit PIN. It stays open while you're using it, and locks again after five minutes of nothing being touched, or as soon as you tap Lock and leave. Adding a learner or changing the school year asks the same way. Your child stays signed in to the main app throughout, so they can carry on with their work."],
    tips: [
      "Forgotten your PIN? Sign out and sign in again to reset it.",
      "The lock is there to stop accidental taps, not to defeat a determined teenager. On a shared computer, use separate browser profiles.",
    ],
  },
  {
    id: "tutor", icon: "chat", title: "The AI tutor (optional)",
    text: ["The tutor is off until you switch it on, per learner, in the AI tutor tab. Like any AI, it can make mistakes, and your child is told so."],
    tips: [
      "You choose whether it only guides, or reveals the answer after some tries.",
      "Each reply has a Read to me button that reads it aloud with the voice on the device. Nothing is recorded or sent anywhere for that.",
      "It sees the question, what your child has typed for it, and the topic and year. It never sees their nickname, avatar, progress or your details.",
      "The chat log is kept on this device only, for 30 days. You can read it or clear it in the AI tutor tab.",
      "The tutor only helps with maths. If your child brings up something that isn't maths, it kindly suggests they talk to you or their guardian and goes back to the maths.",
    ],
  },
  {
    id: "settings", icon: "sliders", title: "Settings and your account",
    tips: [
      "Name or nickname, and school year. Changing the year changes the avatar set to match.",
      "Avatars: the original clay set for Years 3 to 5, preteen portraits for Years 6 to 10 and teen portraits for Years 11 to 13. Your child chooses theirs on the Me page.",
      "Look and feel and Sound (read aloud) are on the Me page.",
      "Curriculum booklet: a designed PDF of everything quarter covers, for subscribed accounts.",
      "My information: download everything stored about your child, or delete it.",
      "Weekly email: turn it on in Settings to get a short email each week with how your child did and what was tricky. It is only sent if they practised, and every email has an unsubscribe link.",
      "A PIN for a child (optional): in Settings in the Parents' area, make a PIN of 4 to 6 digits for the child you're looking at. After that, anyone switching to that child on this device has to type it, so brothers and sisters can't open each other's progress. From Year 7 you can also let them change their own PIN. If it's forgotten, they tap Forgot it, and a grown-up passes the sum and Parents' PIN to open their profile or clear the PIN. It's a household lock, kept on this device only, not a vault.",
      "Several children: each can use their own screen at the same time. On the Me page, choose who is using that screen. Two screens showing the same child at once isn't a good idea, as the one that saves last wins.",
      "Delete this learner removes their progress.",
    ],
  },
  {
    id: "help", icon: "info", title: "If something doesn't look right",
    tips: [
      "Check my answer stays grey until an answer is entered. For drawing questions, move the arm or corner first.",
      "Drawing questions have no typed box: turn the blue arm with a finger, the buttons or the arrow keys.",
      "Progress is kept on the device and, if you're signed in, on your account.",
      "Tell us about anything confusing or broken in the Feedback tab (when signed in), or use the contact address in the privacy notice.",
    ],
  },
];

export const CHILD_GUIDE: GuideSection[] = [
  {
    id: "first", icon: "star", title: "Your first go",
    steps: [
      "Go to Today and tap Practice.",
      "Read the question. Type your answer, or tap one if there are choices.",
      "Tap Check my answer.",
    ],
    text: ["A little each day is better than a lot once in a while."],
  },
  {
    id: "wrong", icon: "check", title: "If you get it wrong",
    text: ["That's fine. A mistake is how you find out what to practise."],
    tips: [
      "You get a second go.",
      "After that you'll see the steps, so you can see how it works.",
      "The question comes back later, so it sticks.",
    ],
  },
  {
    id: "stuck", icon: "bulb", title: "Stuck? Look at the bottom of the screen",
    tips: [
      "Hint gives you a clue.",
      "Working-out tools gives you things to work with: beans and an abacus for counting, a column method sheet for adding, taking away and multiplying, a number line to jump along, a hundred square, a fraction wall, and paper with a ruler and a protractor.",
      "Ask talks to your tutor. It's only there if a grown-up has turned it on, and it can make mistakes, so check what it says. Under each reply there's a Read to me button if you'd like to hear it.",
    ],
  },
  {
    id: "lessons", icon: "book", title: "Learn this",
    text: ["Pick a topic on Skills, then tap Learn this. A lesson has five steps."],
    steps: [
      "Learn: see one worked through, a step at a time.",
      "Try with help: some of the steps are done for you.",
      "Try on your own: three questions.",
      "Remember this? A question on something you learned before.",
      "Lesson complete.",
    ],
  },
  {
    id: "map", icon: "route", title: "The skills map",
    text: ["Each stop is a topic. The symbol shows what kind of maths it is: + numbers, : ratio, x algebra, cm measuring, △ shapes, % data and charts, ∫ calculus. A green tick means you know it well. Your avatar waits at the first topic in your own school year, and the map opens there. You can scroll back to an earlier year or on to a later one whenever you like."],
  },
  {
    id: "draw", icon: "pencil", title: "Angles and drawing",
    tips: [
      "To measure an angle, put the 0 on one arm and read round the same scale to the other arm.",
      "To draw an angle, turn the blue arm with your finger, the −1° and +1° buttons, or the arrow keys.",
      "To draw a shape, move the corner on the grid to the size the question says.",
    ],
  },
  {
    id: "challenge", icon: "star", title: "Times tables challenges",
    text: ["On the Times tables page there are two challenges: a 60-second blitz and a 25-question race. They're about beating your own best."],
    tips: [
      "Blitz: get as many right as you can in 60 seconds.",
      "Race: answer 25 as fast as you can. A wrong answer adds 3 seconds.",
      "Your best scores are saved. The Scoreboard also shows your brothers and sisters on the same account, so you can compete for fun.",
    ],
  },
  {
    id: "refresh", icon: "target", title: "Refreshers and check-ups",
    tips: [
      "Quick-fire refresher: ten questions on what you practised this week.",
      "Check-up: questions that find the best place for you to start.",
    ],
  },
  {
    id: "stars", icon: "star", title: "Points, stars and badges",
    text: ["You earn points for practising and stars for finishing and for bouncing back after a mistake. Badges on the Me page show what you can do, like Clock reader or Angle ace."],
  },
  {
    id: "me", icon: "user", title: "Make it yours",
    text: ["On the Me page you can choose your avatar and glasses, the look of the app, and read-aloud. Your avatars match your school year. At the top right, next to your name, the star shows the quick tour again and the book opens this guide."],
  },
];
