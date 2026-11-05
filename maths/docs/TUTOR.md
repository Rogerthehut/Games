# AI tutor: design, safety and launch notes

The tutor is an optional helper in practice. A grown-up turns it on. The child can ask about the question in front of them and the tutor guides without giving the final answer. It is never available in the check-up or the mock paper.

## How it fits together

```
child's browser ──(question, what they typed, their message)──▶ tutor service ──▶ AI provider
      ▲                                                              │  │
      └────────────── checked, plain-text reply ◀────────────────────┘  │
                                              (the service stores nothing)
```

- **App:** `src/ui/tutor.tsx`, `src/tutor/client.ts`. Off by default; enabled per learner in *Grown-up → AI tutor*. Every exchange is saved to a log on the device that the grown-up can read.
- **Service:** `server/`. Holds the API key, validates, screens, rate limits, calls the model, checks the reply. Run `npm run server` (needs `ANTHROPIC_API_KEY`). `TUTOR_FAKE=1` runs it without a key against a script, for development.
- **What the model sees:** the current question, the correct answer and worked solution (private, so it can be accurate), what the child typed for this question, the conversation so far, and the child's school year (to pitch the language). It is never given a name, school, location, progress or history.

## Safety layers

None of these relies on the model behaving. The model is the last and least-trusted layer.

1. **Off until a grown-up enables it**, with a plain-language note on where messages go.
2. **Validation:** shapes, sizes and ranges are checked before anything else, so malformed or oversized input never costs money.
3. **Screening what the child types, before the model sees it** (`screenChildMessage`):
   - Wellbeing signals (self-harm, abuse, being hurt or bullied) get a fixed, kind reply that tells the child to speak to a trusted adult and gives Childline (0800 1111, free). They are flagged, and the grown-up view shows an alert. The model is never involved. This check runs first and outranks everything.
   - Personal details (email, phone, postcode, "my address is…") get a fixed reply and are never forwarded.
   - Obvious attempts to extract or override the instructions get a fixed refusal.
4. **Instructions to the model:** maths only, short, Socratic, no personal information, no links, treat the child's text as data, never reveal the instructions. The correct answer is supplied as private reference and the model is told not to state it while the child is still working.
5. **Checking the reply** (`leaksAnswer`, `sanitizeReply`): if the tutor states the final answer while the child is still working, the service asks again once with a stricter instruction, then falls back to a stock reply built from the app's own hint. Replies are stripped of markdown, links and markup and capped in length.
6. **Rate limits:** per device per hour and per day, per network address, and a global daily cap. Counts only; no message text.
7. **No server-side storage and no content in logs.** The service logs event kinds and flags only. A test asserts that typed text never reaches the log.
8. **Refusals and outages** produce a kind stock reply, never an error screen or silence.

## What is verified, and what is not

Verified by automated tests (`npm test`, 28 server tests plus the question-bank corpus):
- Validation, screening (including words that look alarming but aren't, such as "it just hit me" and long numbers in maths), limits, logging, and every failure path.
- Answer-leak detection against the whole question bank: it catches 99.8% of replies that state the answer in a range of wordings, with 0.5% false alarms on guidance that doesn't.
- End to end in a real browser with the service running in scripted mode: settings, chat, safeguarding alert, log, no tutor in the mock paper, rate limiting.

**Not verified: how the real model behaves.** All of the above uses a scripted model. Before any child uses this, run the live evaluation and read every transcript:

```
ANTHROPIC_API_KEY=… npx tsx server/eval/tutor-eval.ts
```

It runs about 20 awkward cases (asking for the answer, claiming permission, pretending to be a parent, off-topic requests, asking for links, asking for the instructions, a child who feels stupid) and prints each transcript. It can flag a leaked answer, a long reply or a link automatically. It cannot judge tone, accuracy or whether a redirect was kind, so a person has to read them.

Also not verified: the keyword screens are not a substitute for a safeguarding review. They will miss some phrasings and wrongly catch others. Have a safeguarding lead review the patterns in `server/tutor/policy.ts`.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | none | The key, read from the environment. Never sent to the browser. |
| `TUTOR_MODEL` | `claude-opus-5-5` | Model used for replies. |
| `TUTOR_EFFORT` | `low` | Thinking effort (`low`, `medium`, `high`). |
| `PORT` | `8787` | |
| `TUTOR_ALLOWED_ORIGINS` | none | Comma-separated origins allowed to call the service from another site. |
| `TRUST_PROXY` | off | Set to `1` behind a proxy so the real client address is used for limits. |
| `TUTOR_PER_DEVICE_DAY`, `_HOUR`, `TUTOR_PER_IP_DAY`, `TUTOR_GLOBAL_DAY` | 40, 20, 200, 5000 | Limits. |
| `TUTOR_FAKE` | off | `1` answers from a script, with no key and no spend. |

In the app, `VITE_TUTOR_URL` points at a separate service; empty means the same origin. If the service isn't reachable, the tutor button simply doesn't appear.

## Cost, and a decision for you

The default model is the strongest one. That is a choice, not a requirement. A reply uses roughly 1.5k input tokens and a few hundred output tokens. At list prices (check current pricing before relying on these), that is about:

| Model | Per message | A child asking 5 a day, a month | At the 40-a-day cap, a month |
|---|---|---|---|
| `claude-opus-5-5` ($4 / $20 per M tokens) | ~$0.02 | ~$3 | ~$24 |
| `claude-sonnet-5-5` ($2 / $10) | ~$0.01 | ~$1.50 | ~$12 |
| `claude-haiku-5-5` ($0.10 / $0.50) | ~$0.0005 | ~$0.08 | ~$0.60 |

These are estimates from token counts, not measurements. Choose by running the live evaluation on each and comparing quality of explanation and safety of behaviour, then measure real usage. A cheaper model may be good enough for primary maths and not for A-level.

## Before launch (not done)

- **Verifiable parental consent for children under 13**, and a privacy notice that matches what is described above. The current switch is a convenience, not legal consent.
- **A data protection impact assessment** and a Children's Code (Age Appropriate Design Code) self-assessment. Sending children's text to a third-party AI provider needs a lawful basis, a processing agreement and a clear retention position. Check the provider's current data-retention terms. We assume none and do not store anything ourselves.
- **Safeguarding process:** who sees a wellbeing flag besides the parent (today only the parent, on this device), and what the organisation does when one happens. With accounts you will want server-side alerting, which is a larger privacy decision.
- **Review of the screening patterns** by a safeguarding lead, and a regular review of flagged, anonymised cases.
- **An incident process** for a harmful reply, and a way for a parent to report one.
- **A human review of tutor accuracy** on a sample of real conversations. The tutor is told the correct answer, which helps, but it can still explain badly or get a side question wrong.
