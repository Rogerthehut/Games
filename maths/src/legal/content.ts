export const copyright = "© 2026 quarter";
export const contactEmail = "hello@yourquarter.co.uk";
export const designer = { name: "Roger Richman", href: "https://roger-richman.com/" } as const;
export const legalUpdated = {
  privacy: "10 November 2026",
  cookies: "10 November 2026",
  terms: "10 November 2026",
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
    { heading: "About quarter", links: [
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
        ? ["quarter is for practising maths. This app preview works through questions on your device. It does not ask you to create a learner account or upload your practice answers."]
        : ["quarter is for practising maths. Your browser keeps your learner profile, maths progress and choices so you can pick up where you left off. You can use a nickname. An optional online tutor works differently and is explained below."],
    },
    ...(native ? [] : [{
      title: "Who looks after your information",
      paragraphs: [
        `For any question about your information, or to use any of your rights, email ${contactEmail}.`,
        "quarter is made for parents and guardians to set up and for children to use under their supervision. Only a parent or guardian creates an account. Children never create their own.",
      ],
    }, {
      title: "What we keep",
      paragraphs: [
        "About the parent or guardian: the email address you sign up with, how you signed in (email, Google or Apple), and the date you agreed to our terms and privacy notice. If you use Apple’s Hide My Email, we only see the private address Apple gives us.",
        "About each learner you add: a nickname, school year, avatar, maths progress, results, certificates, practice papers, plans and settings. We use this to pick questions, show progress and suggest what to practise next. Please use a nickname instead of a full name.",
        "We do not ask for real names, birthdays, photos, home addresses or school names for learners. Nothing is used for advertising, and we do not sell information.",
      ],
    }, {
      title: "Where it is kept and who helps us",
      paragraphs: [
        "Learner information is stored in a database run for quarter, protected so that each account can only reach its own learners. A copy is also kept in your browser so quarter works quickly. It is removed from the browser when you sign out.",
        "Clerk provides sign-in. It handles your email address, sign-in method and login sessions, and may process them outside the UK. If you choose Google or Apple, they tell Clerk who you are. They do not receive your learners’ information.",
        "Our hosting provider delivers the website and keeps the database. We will list the provider and the country where data is held here before launch.",
      ],
    }, {
      title: "If a grown-up turns on the online tutor",
      paragraphs: [
        "The tutor is off by default and only appears when a grown-up turns it on in the Parents’ area. When a message is sent, the tutor service receives the message, recent chat, the school year and the maths question and answers tried. It uses a random browser ID and an IP address to limit how often it is used. It does not receive the learner’s nickname or account details.",
        "The service checks messages, then may pass the chat and maths question to an AI provider to write a reply. We ask providers not to keep or train on these messages. Keep names, addresses and other personal details out of messages. The tutor can make mistakes.",
        "Tutor conversations are kept only in the browser on the device used, for a grown-up to read or clear. They are not saved to the account, and the tutor service is designed to record counts and safety flags, not message text. If a message suggests a child may be upset or unsafe, the tutor replies kindly, points to a trusted adult and Childline, and shows a note in the Parents’ area.",
      ],
    }]),
    {
      title: "When you use Read aloud",
      paragraphs: ["quarter sends the text to the speech service on your device or browser. Some voices may use an online speech service run by your device or browser provider."],
    },
    ...(native ? [] : [{
      title: "Visiting the website",
      paragraphs: [
        "The website host receives normal connection details, such as your IP address and browser information, to deliver and protect the site.",
        "quarter does not use advertising or analytics cookies, and does not run advertising or tracking tools. See Cookies and browser storage for what is saved on your device.",
      ],
    }, {
      title: "How long we keep it",
      paragraphs: ["We keep an account and its learners until a parent or guardian deletes them from the Parents’ area, or asks us to. Deleting removes the account and every learner in it. Any backups are removed on their normal cycle."],
    }]),
    {
      title: "Your choices and rights",
      paragraphs: [
        ...(native ? [] : ["In the Parents’ area you can download everything we hold about your family, remove a learner, turn the tutor off, or delete the whole account. You can also email us at " + contactEmail + "."]),
        "Where data protection law applies, you may have rights to ask for a copy, correct or delete information, restrict its use or move it to another service. You can also object to some uses of your information. In the UK you can complain to the Information Commissioner’s Office.",
      ],
    },
  ];
}

export const cookiesSections: Section[] = [
  {
    title: "The short version",
    paragraphs: ["quarter does not use advertising, tracking or analytics cookies. It uses a small number of cookies and browser storage that are needed to sign you in and to remember your choices. We do not ask for consent for these because the site cannot work without them."],
  },
  {
    title: "Sign-in",
    paragraphs: ["Our sign-in provider, Clerk, sets cookies on this site so you stay signed in and to keep the sign-in secure. They are removed when you sign out or they expire."],
  },
  {
    title: "What quarter saves in your browser",
    paragraphs: [
      "A copy of your learners’ profiles and progress, so quarter loads quickly and works if the connection drops for a moment. It is cleared when you sign out. Your colour choice and the “Got it” choice on the storage message are also remembered.",
      "If a grown-up turns on the optional tutor, conversations are kept in the browser on that device, and a random browser ID is saved and sent to the tutor service to limit how often it is used.",
      "Text-to-speech uses your device’s own voices.",
    ],
  },
  {
    title: "How to clear it",
    paragraphs: [
      "Sign out to remove the account copy from this browser. To remove everything quarter and Clerk have saved here, clear this site’s data in your browser settings. Your account and learners stay safe in your account until you delete them in the Parents’ area.",
      `Questions: ${contactEmail}.`,
    ],
  },
];

export const termsSections: Section[] = [
  {
    title: "What quarter is for",
    paragraphs: [
      "quarter is a maths practice tool for learners and their grown-ups. It covers selected topics from England’s maths curriculum. quarter’s original 11+ maths-style questions are for practice. They are independent of exam providers.",
      "If you’re a child, ask a grown-up to read these terms with you.",
    ],
  },
  {
    title: "Accounts",
    paragraphs: [
      "An account must be created by a parent or guardian aged 18 or over. You are responsible for the learners you add, for keeping your sign-in secure, and for turning the tutor on or off. Please give accurate information and use a nickname for each learner.",
      `You can delete your account at any time from the Parents’ area. We may suspend an account that is used to harm others or the service. Email ${contactEmail} if you need help.`,
    ],
  },
  {
    title: "Look after yourself and others",
    paragraphs: ["Use quarter for learning. Keep other people’s information private and avoid sharing personal details in the online tutor. If the tutor is available, it can make mistakes. Ask a grown-up or teacher if an explanation seems wrong."],
  },
  {
    title: "Saving your work",
    paragraphs: ["Your learners’ progress is saved to your account so it follows them between devices. We take care of it, but quarter is provided as it is, and we cannot promise it will always be available or error-free. You can download a copy of everything from the Parents’ area."],
  },
  {
    title: "Copyright and your work",
    paragraphs: [
      "© 2026 quarter. Learners and families may use quarter’s original materials for personal learning. Teachers and tutors may show the materials in lessons and share worksheets quarter makes available to download with learners they teach.",
      "You can keep screenshots for your own learning or lesson preparation. Ask quarter for permission before publishing its materials or screenshots online, distributing them beyond your learners, or selling copies, unless the law or a separate licence allows it.",
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
    paragraphs: ["The quarter web app uses Preact, KaTeX and Clerk’s sign-in libraries under their MIT licences."],
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
