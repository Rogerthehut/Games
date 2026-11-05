# Design notes

How MathPath is meant to look, read and behave, so changes keep the same feel.

## Principles

1. **One thing matters most on each screen.** Today leads with a single card for what to do now. A report leads with one level. A question screen leads with the question. Everything else is quieter.
2. **Inputs fit the answer.** A fraction is two stacked boxes. A number is one big box with its unit or letter attached. On a touch screen the phone's keyboard stays closed and a number pad built for the job appears. On a desktop you just type. No permanent row of symbol buttons.
3. **Actions live where a thumb is.** Question screens have a bar at the bottom. The main action is on the right and changes in place (Check becomes Next).
4. **Say it plainly.** Short sentences, concrete verbs, no apology and no explanation of the interface. If a line needs a footnote, cut it or move the footnote behind "About this score". Status words are friendly for children (New, Learning, Getting there, Got it) and exact for parents (Assumed known, Secure).
5. **Effort, not speed.** No timers in practice. Stars reward finishing, carrying on and bouncing back. A missed day costs nothing.
6. **Grown-ups get their own place.** It is behind a maths sum (children can't do it quickly), not a tab, and split into Progress, Tutor and Settings.

## Structure

- Phone and tablet: bottom tab bar (Today, Skills, Plan, Me). Wide screens: side rail. One set of items, two layouts.
- **Me** holds the child's own things: streak, points, check-up, plan, who is learning, look and feel, and the way into the parents' area.
- Question screens (practice, check-up, practice paper) share one layout: close button and progress at the top, the question, the answer, and the action bar.

## Voice by age (`src/ui/voice.ts`)

| | Explorer (Y3–6) | Navigator (Y7–9) | Scholar (Y10+) |
|---|---|---|---|
| Greeting | Hi Maya! | Hey Maya | Good afternoon, Maya |
| Right | Yes! Brilliant! | Nice. Spot on. | Correct. Right. |
| Wrong | Not quite. Have another go! | Not quite. Try again. | Not quite. |

## Tokens

Colour, type, shape and motion are tokens in `src/styles.css`, in three layers: theme (light/dark lightness), skin (hue, type, shape, motion) and derived semantic colours. Components use only the semantic tokens. Every text pairing is checked at 4.5:1 or better in all three skins and both themes.

## Things to avoid

- Stacks of equally weighted bordered cards.
- Accent bars down the side of cards.
- Small grey explanatory text under every heading.
- Words that describe how the system works instead of what the person can do.
- Rewards for speed, and anything that makes a child feel they have lost something.
