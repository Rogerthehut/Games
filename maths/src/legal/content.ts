export const copyright = "© 2026 Quarter";
export const designer = { name: "Roger Richman", href: "https://roger-richman.com/" } as const;
export const legalUpdated = {
  privacy: "7 November 2026",
  cookies: "9 November 2026",
  terms: "9 November 2026",
  licences: "9 November 2026",
} as const;

export const legalTitles = {
  privacy: "Privacy notice",
  cookies: "Cookies and browser storage",
  terms: "Terms of use",
  licences: "Third-party licences",
} as const;

export type LegalPage = keyof typeof legalTitles;
export const legalPages = Object.keys(legalTitles) as LegalPage[];
export type FooterGroup = { heading: string; links: { label: string; href: string }[] };
/** Footer link groups, shared by the app and the generated parent pages. */
export function footerGroups(parents: { hub: { path: string; title: string }; faq: { path: string } }): FooterGroup[] {
  return [
    { heading: "For parents", links: [
      { label: parents.hub.title, href: parents.hub.path },
      { label: "FAQs", href: parents.faq.path },
      { label: "Find your local 11+ test", href: "11-plus-maths.html#test-finder" },
    ] },
    { heading: "About Quarter", links: [
      ...legalPages.map((key) => ({ label: legalTitles[key], href: `./?info=${key}` })),
      { label: "Sitemap", href: "./?info=sitemap" },
    ] },
  ];
}
export const icoComplaints = "https://ico.org.uk/make-a-complaint/data-protection-complaints/";

type Section = { title: string; paragraphs: string[] };

export function privacySections(native: boolean): Section[] {
  return [
    {
      title: "The short version",
      paragraphs: native
        ? ["Quarter is for practising maths. This app preview works through questions on your device. It does not ask you to create a learner account or upload your practice answers."]
        : ["Quarter is for practising maths. Your browser keeps your learner profile, maths progress and choices so you can pick up where you left off. You can use a nickname. An optional online tutor works differently and is explained below."],
    },
    ...(native ? [] : [{
      title: "What stays in your browser",
      paragraphs: [
        "When you set up a profile, Quarter saves the name or nickname you choose, your school year, maths progress, results, certificates and settings in this browser. If you fill in a plan, its goal, exam date, area and school preferences can also be saved here. Quarter uses your practice results to pick questions and suggest what to work on next.",
        "Profiles do not sync between devices. In Me → Parents’ area → Settings, you can create a copy, load a copy or delete a learner. A copy you download or share stays wherever you put it. Clearing this site’s browser data removes local profiles and preferences from this browser.",
      ],
    }, {
      title: "If a grown-up turns on the online tutor",
      paragraphs: [
        "The tutor is off by default and only appears when a tutor service is connected. When you send a message, the service receives the message, recent chat, your school year and the maths question and answers you have tried. It uses your IP address and a random browser ID to limit requests. It does not attach your profile name or school to the request.",
        "The service checks messages and may send the chat and maths context to Anthropic to write a reply. Keep names, addresses and other personal details out of messages. The browser keeps up to 300 exchanges in the learner’s profile, which a grown-up can review or clear. Quarter’s tutor server is designed to log activity counts and safety flags rather than message text. The production tutor provider’s data settings and retention still need to be confirmed.",
      ],
    }]),
    {
      title: "When you use Read aloud",
      paragraphs: ["Quarter sends the text to the speech service on your device or browser. Some voices may use an online speech service run by your device or browser provider."],
    },
    ...(native ? [] : [{
      title: "Visiting the website",
      paragraphs: [
        "The website host receives normal connection details, such as your IP address and browser information, to deliver and protect the site. The production host, its retention periods and any overseas data handling will be confirmed before release.",
        "The Quarter web code does not set advertising or analytics cookies. See Cookies and browser storage for what the app saves and how to clear it.",
      ],
    }]),
    {
      title: "Your choices and rights",
      paragraphs: [
        ...(native ? [] : ["You can ask a grown-up to help you see, copy or delete a saved learner profile. You can turn off the optional tutor in the grown-ups’ area."]),
        "Where data protection law applies, you may have rights to ask for a copy, correct or delete information, restrict its use or move it to another service. You can also object to some uses of your information. In the UK you can complain to the Information Commissioner’s Office.",
      ],
    },
  ];
}

export const cookiesSections: Section[] = [
  {
    title: "What Quarter saves",
    paragraphs: [
      "Quarter uses browser local storage to remember learner profiles, maths progress and settings so you can carry on next time. It also remembers your light or dark colour choice if you set one.",
      "When you choose Got it on the browser storage message, Quarter remembers your choice so the message stays dismissed. If you send a message to the optional online tutor, Quarter saves a random browser ID and sends it to the tutor service to limit how often it is used.",
      "Quarter’s web code does not set advertising or analytics cookies. The preview host may use its own cookies to provide access. This notice will be updated when production hosting and sign-in are confirmed.",
    ],
  },
  {
    title: "How long it stays and how to clear it",
    paragraphs: [
      "Local storage stays until you or your browser clear it. To clear your colour choice, select Auto under Colours in Me. To delete a learner, go to Me → Parents’ area → Settings.",
      "You can remove all Quarter storage through your browser’s site data settings. This also removes saved progress and preferences on this browser, so make a copy of a learner’s profile first if you want to keep it.",
    ],
  },
];

export const termsSections: Section[] = [
  {
    title: "What Quarter is for",
    paragraphs: [
      "Quarter is a maths practice tool for learners and their grown-ups. It covers selected topics from England’s maths curriculum. Quarter’s original 11+ maths-style questions are for practice. They are independent of exam providers.",
      "If you’re a child, ask a grown-up to read these terms with you.",
    ],
  },
  {
    title: "Look after yourself and others",
    paragraphs: ["Use Quarter for learning. Keep other people’s information private and avoid sharing personal details in the online tutor. If the tutor is available, it can make mistakes. Ask a grown-up or teacher if an explanation seems wrong."],
  },
  {
    title: "Saving your work",
    paragraphs: ["Some versions save work on your device. Clearing the site data or switching devices can make that work unavailable. Where profile export is available, you can keep a copy of your own work."],
  },
  {
    title: "Copyright and your work",
    paragraphs: [
      "© 2026 Quarter. Learners and families may use Quarter’s original materials for personal learning. Teachers and tutors may show the materials in lessons and share worksheets Quarter makes available to download with learners they teach.",
      "You can keep screenshots for your own learning or lesson preparation. Ask Quarter for permission before publishing its materials or screenshots online, distributing them beyond your learners, or selling copies, unless the law or a separate licence allows it.",
      "Your own notes and answers remain yours. Third-party software, fonts and other materials are covered by their own licences.",
    ],
  },
  {
    title: "Your rights",
    paragraphs: ["These terms do not limit any rights you have under consumer law. For information about how data is used, see the Privacy notice."],
  },
];

export const licencesSections: Section[] = [
  {
    title: "Software",
    paragraphs: ["The Quarter web app uses Preact and KaTeX under their MIT licences."],
  },
  {
    title: "Fonts",
    paragraphs: ["Figtree, Fraunces, Manrope and Nunito are bundled under the SIL Open Font License, version 1.1."],
  },
  {
    title: "Sound effects",
    paragraphs: ["The click and confirmation sounds come from Kenney’s Interface Sounds pack, released under CC0."],
  },
];
