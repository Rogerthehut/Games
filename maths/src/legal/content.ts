export const operator = "Wristed Ltd";
export const company = { number: "12397793", office: "124 City Road, London, England, EC1V 2NX", registered: "England and Wales" } as const;
export const companyLine = `${operator} is registered in ${company.registered}, company number ${company.number}. Registered office: ${company.office}.`;
export const copyright = `© 2026 ${operator}. quarter™ is a trading name of ${operator}.`;
export const contactEmail = "hello@yourquarter.co.uk";
/** Where people get in touch: the Message us page. (The address above is what replies are sent from, not an inbox we ask people to write to.) */
export const contactPage = "yourquarter.co.uk/?info=contact";
export const designer = { credit: "Built with curiosity in mind", name: "RR Studio", href: "https://roger-richman.com/" } as const;
export const legalUpdated = {
  privacy: "13 November 2026",
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
/** Where people can review quarter. It is a plain link: nothing from Trustpilot is loaded on our pages. */
export const trustpilot = { label: "Leave us a review on Trustpilot", href: "https://uk.trustpilot.com/review/yourquarter.co.uk" } as const;
/** Said under the wordmark in the page footer. */
export const footerTagline = "Maths and STEM practice for Years 3 to 13, starting where your child is.";
export function footerGroups(parents: { hub: { path: string; title: string }; faq: { path: string } }): FooterGroup[] {
  return [
    { heading: "For parents", links: [
      { label: parents.hub.title, href: parents.hub.path },
      { label: "FAQs", href: parents.faq.path },
      { label: "Find your local 11+ test", href: "11-plus-maths.html#test-finder" },
    ] },
    { heading: "Explore", links: [
      { label: "What quarter covers", href: "curriculum/index.html" },
      { label: "Blog", href: "blog/index.html" },
      { label: "Reading list", href: "reading/index.html" },
    ] },
    { heading: "Legal", links: [
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
        ? ["quarter is for practising maths and STEM topics. This app preview works through questions on your device. It does not ask you to create a learner account or upload your practice answers."]
        : ["quarter is for practising maths and STEM topics. Your browser keeps your learner profile, progress and choices so you can pick up where you left off. You can use a nickname. An optional online tutor works differently and is explained below."],
    },
    ...(native ? [] : [{
      title: "Who looks after your information",
      paragraphs: [
        `quarter™ is a trading name of ${operator}, which is responsible for the information described in this notice.  ${companyLine} For any question about your information, or to use any of your rights, message us at ${contactPage}.`,
        "quarter is made for parents and guardians to set up and for children to use under their supervision. Only a parent or guardian creates an account. Children never create their own.",
      ],
    }, {
      title: "What we keep",
      paragraphs: [
        "About the parent or guardian: the email address you sign up with, and the date you agreed to our terms and privacy notice.",
        "About each learner you add: a nickname, school year, avatar, maths and STEM progress, results, certificates, practice papers, plans and settings, and a short record of the questions they got wrong (the question, the answers tried and when, kept for up to 120 days) so the grown-ups’ learning report can show what to work on. We use this to pick questions, show progress and suggest what to practise next. Please use a nickname instead of a full name.",
        "Anonymous question statistics: when a learner answers a practice question, we add one tally to weekly totals: the topic, the difficulty level, an age band (such as Key Stage 2), whether the answer was right, right with help or wrong, how many seconds it took, and the short code of a common mistake if there was one. A tally has no name, no account, learner or device identifier, no question text and nothing the learner typed, and the totals can’t be traced back to a child. We use them to find questions that are too hard, too easy or confusing, and to improve and extend our question sets. A parent or guardian can switch this off for each learner in the Parents’ area.",
        "We do not ask for real names, birthdays, photos, home addresses or school names for learners. Nothing is used for advertising, and we do not sell information.",
        "quarter is in public beta and free to use for now. The same privacy protections apply during the beta as will apply afterwards.",
        "Feedback: if you send us feedback from the Parents’ area, we keep your message, the topic you chose, an optional star rating, whether you said we may reply, and your screen size, linked to your account. We don’t store your email address with it. If you say we may reply, we look it up from your sign-in account when we answer. It is used only to improve quarter and to reply to you, and it is deleted with your account. Please don’t put personal details about a child in it.",
        "Messages: if you send us a message from the Message us page, or email hello@yourquarter.co.uk, we keep your message, the email address it came from, the topic you chose or the subject, your name if you gave one, and our replies. For an email, only the text is kept (no attachments or pictures), and we record whether the sender’s address could be verified. We use them only to reply and to improve quarter, and we never send anything to the address you used except a reply from a member of our team. Resend, our email provider, receives email sent to us and passes it to us. Messages and replies are deleted 180 days after the last message, or sooner if you ask us.",
        "If you subscribe, Stripe takes the payment and holds your card details. We keep only your Stripe customer reference, your plan, its status and its dates. We never see or store your card number.",
      ],
    }, {
      title: "Where it is kept and who helps us",
      paragraphs: [
        "Learner information is stored in a database run for quarter, protected so that each account can only reach its own learners. A copy is also kept in your browser so quarter works quickly. It is removed from the browser when you sign out.",
        "Stripe provides payments and billing. It handles your card details, billing address and invoices, and may process them outside the UK. Payment and invoice records are kept for as long as the law requires, even after an account is deleted.",
        "11+ finder: if you type a postcode into the 11+ test finder on our guides, only its first half (for example BR1) is sent to our server, which asks the free postcodes.io service which council areas it covers. The rest of the postcode is never sent. We don’t store or log it, and the answer is kept for a day so the same lookup isn’t repeated.",
        "Cloudflare provides a quick check (Turnstile) that you are a person, before the AI tutor or assistant can be used. It looks at your browser and connection to tell people from automated scripts. quarter does not use it to track you.",
        "Resend sends the optional weekly progress email, if you turn it on in the Parents’ area. It receives your email address and the text of that email, which includes your child’s nickname and a short summary of their week. It may process them outside the UK. You can turn the email off at any time, and every email has an unsubscribe link.",
        "Clerk provides sign-in by email. It handles your email address and login sessions, and may process them outside the UK. It does not receive your learners’ information.",
        "Sentry receives a short report if quarter crashes, so we can fix it. A report has the type of error and a short message, where in our code it happened, and the browser and device software version, plus the page path without anything after a question mark and the country it was sent from. It has no names, nicknames, email addresses, answers or anything typed into quarter, and we ask Sentry not to store IP addresses. Reports are stored in Europe (EU) and deleted after 30 days.",
        "The database that holds account information is located in Europe (EU). Our hosting provider delivers the website and runs the database.",
        "Clerk, Cloudflare, Sentry and the AI provider used by the optional AI tutor and the assistant may process information outside the UK and EU. Where that happens, we rely on the safeguards the law allows, such as standard contractual clauses.",
      ],
    }, {
      title: "If a grown-up turns on the AI tutor",
      paragraphs: [
        "The AI tutor is off by default and only appears when a grown-up turns it on in the Parents’ area. When a message is sent, the tutor service receives the message, recent chat, the school year and the maths question and answers tried. It uses a random browser ID and an IP address to limit how often it is used. It does not receive the learner’s nickname or account details.",
        "The service checks messages, then may pass the chat and maths question to an AI provider to write a reply. We ask providers not to keep or train on these messages. Keep names, addresses and other personal details out of messages. The tutor can make mistakes.",
        "AI tutor conversations are kept only in the browser on the device used, for a grown-up to read or clear. They are not saved to the account, and the tutor service is designed to record counts, not message text. The tutor only helps with maths: if a child brings up something else, it suggests they talk to a parent or guardian and goes back to the maths.",
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
        ...(native ? [] : ["In the Parents’ area you can download everything we hold about your account, including any feedback you have sent, remove a learner, turn the AI tutor off, or delete the whole account. You can also message us at " + contactPage + "."]),
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
    paragraphs: ["Our sign-in provider, Clerk, sets cookies on this site so you stay signed in and to keep the sign-in secure. They are removed when you sign out or they expire.", "Our crash reporting (Sentry) does not set cookies or save anything in your browser. If quarter crashes, a short report with no personal details is sent so we can fix it."],
  },
  {
    title: "What quarter saves in your browser",
    paragraphs: [
      "A copy of your learners’ profiles and progress, so quarter loads quickly and works if the connection drops for a moment. It is cleared when you sign out. Your colour choice and the “Got it” choice on the storage message are also remembered.",
      "If a grown-up turns on the optional AI tutor, conversations are kept in the browser on that device, and a random browser ID is saved and sent to the tutor service to limit how often it is used.",
      "Text-to-speech uses your device’s own voices.",
      "The Parents’ area PIN you choose is kept on that device only, as a scrambled code (not the PIN itself). Signing out removes it.",
      "If you choose to give a learner a PIN, it is kept in the same way, on that device only, and can be cleared by a parent at any time.",
      "Before the AI tutor or assistant can be used, Cloudflare’s Turnstile may run a quick check in your browser. It can store a small token in your browser while it works.",
      "When you pay, you are sent to Stripe’s secure payment page, which sets its own cookies on its own address to process the payment and prevent fraud. quarter does not receive your card details.",
    ],
  },
  {
    title: "How to clear it",
    paragraphs: [
      "Sign out to remove the account copy from this browser. To remove everything quarter and Clerk have saved here, clear this site’s data in your browser settings. Your account and learners stay safe in your account until you delete them in the Parents’ area.",
      `Questions: message us at ${contactPage}.`,
    ],
  },
];

export const termsSections: Section[] = [
  {
    title: "What quarter is for",
    paragraphs: [
      "quarter is a maths and STEM practice tool for learners and their grown-ups. It covers selected topics from England’s maths curriculum, and computing, data science, AI and quantum topics in the STEM lab. quarter’s original 11+ maths-style questions are for practice. They are independent of exam providers.",
      "If you’re a child, ask a grown-up to read these terms with you.",
    ],
  },
  {
    title: "Accounts",
    paragraphs: [
      `quarter™ is a trading name of ${operator}. By using it you agree to these terms with ${operator}.`,
      "An account must be created by a parent or guardian aged 18 or over. You are responsible for the learners you add, for keeping your sign-in secure, and for turning the tutor on or off. Please give accurate information and use a nickname for each learner.",
      `You can delete your account at any time from the Parents’ area. We may suspend an account that is used to harm others or the service. Message us at ${contactPage} if you need help.`,
    ],
  },
  {
    title: "Fair use",
    paragraphs: [
      `Please use quarter™ for what it is for: helping children learn maths and STEM. You must not scrape, harvest or bulk-copy its questions, explanations, study guides, pictures, curriculum booklet or other content, whether by a script, bot or any other automated means, or by copying it into another product, service or AI training set. You must not try to get around the limits on how often parts of the service can be used, or use it to build something that competes with it.`,
      `quarter’s content belongs to ${operator} or its licensors. You may use it for your own family or class, and print or share individual papers and our free samples for that purpose. We may slow, limit or suspend access that breaks these terms, and may take further steps where we need to.`,
    ],
  },
  {
    title: "Public beta",
    paragraphs: [
      "quarter is currently in public beta. It is free to use while we test and improve it, and you may notice bugs, changes or the odd pause in service. Features may be added, changed or removed as we learn what works.",
      "We plan to introduce paid features later. If we do, we will tell you well before anything changes, and you will never be charged unless you choose a plan and give us your payment details. Everything in these terms and our privacy notice applies during the beta.",
    ],
  },
  {
    title: "Subscriptions and payments",
    paragraphs: [
      "Once paid plans are introduced, quarter will be a paid subscription for the account, covering every learner on it. The price and plan are shown before you pay. A free trial, where offered, starts when you sign up for it with a payment method and turns into a paid subscription at the end unless you cancel before then. It then renews automatically each month or year until you cancel.",
      "You can cancel at any time in the Parents’ area, under Subscription. You keep access until the end of the period you have paid for. If a payment fails, we may pause access until it is put right. Payments are handled by Stripe.",
      "Nothing in this section affects your rights under consumer law, including any right to cancel within 14 days of buying. If you delete your account, your subscription is cancelled with it.",
    ],
  },
  {
    title: "No guarantee of results",
    paragraphs: [
      "quarter is a practice and learning aid. We can’t promise any particular result, such as a better school grade, a place at a school, or a pass in the 11+ or any other exam. What a learner gains depends on many things, including how often they practise and the teaching they get elsewhere.",
      "Levels, scores and reports, including the working level from a check-up and the progress report, are estimates to help you plan practice. They are not an official assessment and not a prediction of exam results.",
      "Our 11+ style practice is original and independent of exam boards and test providers. It may not match any particular test, and school admission rules and tests change, so always check with the school or local authority.",
      "Our maths topics follow England’s maths curriculum as we understand it, and our STEM topics are our own selection, pitched for each age. We can’t guarantee they are complete or free of mistakes. If you spot one, please tell us at " + contactPage + ". The AI tutor and the AI assistant can also make mistakes and are not a replacement for a teacher.",
    ],
  },
  {
    title: "Our responsibility to you",
    paragraphs: [
      "We will provide quarter with reasonable care and skill. As a public beta, we can’t promise it will always be available, uninterrupted or free of errors, and we may change, pause or remove features.",
      "Children should use quarter under the supervision of a parent or guardian, who decides what is suitable for them, including screen time and online safety. Links to other websites are provided for convenience, and we are not responsible for what they contain.",
      "Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to limit. Subject to that, we are not responsible for losses that were not a foreseeable result of us breaking these terms, or for fees and costs paid to other people, such as tutors, schools or test providers. To the extent the law allows, our total liability to you is limited to what you have paid us for quarter in the 12 months before the problem.",
    ],
  },
  {
    title: "Look after yourself and others",
    paragraphs: ["Use quarter for learning. Keep other people’s information private and avoid sharing personal details in the AI tutor. If the AI tutor is available, it can make mistakes. Ask a grown-up or teacher if an explanation seems wrong."],
  },
  {
    title: "Saving your work",
    paragraphs: ["Your learners’ progress is saved to your account so it follows them between devices. We take care of it, but quarter is provided as it is, and we cannot promise it will always be available or error-free. You can download a copy of everything from the Parents’ area."],
  },
  {
    title: "Copyright and your work",
    paragraphs: [
      `© 2026 ${operator}, trading as quarter™. Learners and families may use quarter’s original materials for personal learning. Teachers and tutors may show the materials in lessons and share worksheets quarter makes available to download with learners they teach.`,
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
    paragraphs: ["The quarter web app uses Preact, KaTeX, Sentry’s error reporting library and Clerk’s sign-in libraries under their MIT licences."],
  },
  {
    title: "Fonts",
    paragraphs: ["Caveat, Figtree, Fraunces, Manrope and Nunito are bundled under the SIL Open Font License, version 1.1."],
  },
  {
    title: "Sound effects",
    paragraphs: ["The click and confirmation sounds come from Kenney’s Interface Sounds pack, released under CC0."],
  },
];
