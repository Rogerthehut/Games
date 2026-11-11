import { int, pick, round, type Rng } from "../engine/rng";
import type { Question, Skill } from "../engine/types";

/**
 * Money, from coins in Year 3 to budgets and VAT in Year 9. Every amount is worked out in whole pence first, so the answer,
 * the worked steps and the hint can never disagree. See docs/CONTENT_PLAN.md.
 */
type Task = { prompt: string; value: number; hint: string; solution: string[]; pounds?: boolean; unit?: string };

const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`;
/** £4.50 → "£4.50", but a whole number of pounds reads "£4". Used inside worked steps. */
const pounds = (pence: number) => (pence % 100 === 0 ? `£${pence / 100}` : gbp(pence));
const pnc = (pence: number) => `${pence}p`;
/** An amount in pence, written the natural way: under £1 in pence, otherwise in pounds. */
const pd = (n: number) => (Number.isInteger(n) ? `£${n}` : `£${n.toFixed(2)}`);

function money(info: Omit<Skill, "generate">, task: (r: Rng, level: number) => Task): Skill {
  return {
    ...info,
    generate(r, level): Question {
      const t = task(r, level);
      const value = t.pounds ? round(t.value, 2) : t.value;
      return {
        skill: info.id, level, prompt: t.prompt,
        answer: { kind: "number", value, unit: t.pounds ? undefined : t.unit, label: t.pounds ? "£" : undefined },
        hint: t.hint, solution: t.solution, shown: t.pounds ? pounds(Math.round(value * 100)) : `${value}${t.unit ? ` ${t.unit}` : ""}`,
      };
    },
  };
}

const COINS = [200, 100, 50, 20, 10, 5, 2, 1];
const fewestCoins = (p: number) => COINS.reduce((n, c) => { n += Math.floor(p / c); p %= c; return n; }, 0);
const coinName = (c: number) => (c >= 100 ? `£${c / 100}` : `${c}p`);
const ITEMS: [string, string][] = [["pencil", "pencils"], ["ruler", "rulers"], ["notebook", "notebooks"], ["eraser", "erasers"], ["sharpener", "sharpeners"], ["sticker book", "sticker books"], ["bookmark", "bookmarks"], ["apple", "apples"], ["sandwich", "sandwiches"], ["comic", "comics"]];
const nice = (pence: number) => (pence < 100 ? pnc(pence) : gbp(pence));

export const moneySkills: Skill[] = [
  // ---------------------------------------------------------------- Key Stage 2
  money({
    id: "coins-notes", name: "Coins and notes", stage: "KS2", year: 3, strand: "Measures", prereqs: [],
    blurb: "Count amounts made from coins, and make an amount with the fewest coins.",
    explainer: "The coins are 1p, 2p, 5p, 10p, 20p, 50p, £1 and £2. £1 is the same as 100p.",
    parentNote: "Practise with real coins. Count the biggest coins first, then the smaller ones. To make an amount with the fewest coins, always use the biggest coin that fits.",
    talkAbout: "Which coins would you use first to make 87p, and why?",
  }, (r, l) => {
    if (l === 1) {
      const a = pick(r, [50, 20, 10]), b = pick(r, [5, 2, 1]), na = int(r, 1, 3), nb = int(r, 1, 4);
      return { prompt: `You have ${na} × ${pnc(a)} coin${na > 1 ? "s" : ""} and ${nb} × ${pnc(b)} coin${nb > 1 ? "s" : ""}. How much money is that in pence?`, value: na * a + nb * b, unit: "p", hint: "Work out each kind of coin, then add.", solution: [`${na} × ${a} = ${na * a}p.`, `${nb} × ${b} = ${nb * b}p.`, `${na * a} + ${nb * b} = ${na * a + nb * b}p.`] };
    }
    if (l === 2) {
      const pound = int(r, 1, 2), c = pick(r, [50, 20, 10]), n = int(r, 1, 3), s = pick(r, [5, 2, 1]);
      const total = pound * 100 + c * n + s;
      return { prompt: `You have ${pound} × £1 coin${pound > 1 ? "s" : ""}, ${n} × ${pnc(c)} coin${n > 1 ? "s" : ""} and one ${pnc(s)} coin. How much money is that in pence?`, value: total, unit: "p", hint: "Change the pound coins to pence first. £1 is 100p.", solution: [`${pound} × 100 = ${pound * 100}p.`, `${n} × ${c} = ${n * c}p.`, `${pound * 100} + ${n * c} + ${s} = ${total}p.`] };
    }
    const p = int(r, 41, 98);
    const used: number[] = []; let left = p; for (const c of COINS) while (left >= c) { used.push(c); left -= c; }
    return { prompt: `What is the smallest number of coins you need to make ${p}p?`, value: fewestCoins(p), hint: "Start with the biggest coin that fits, then the next biggest.", solution: [`Use ${used.map(coinName).join(", ")}.`, `That is ${used.length} coins.`] };
  }),
  money({
    id: "pounds-pence", name: "Pounds and pence", stage: "KS2", year: 4, strand: "Measures", prereqs: ["coins-notes", "place-value"],
    blurb: "Write amounts of money in pounds and in pence, using decimals.",
    explainer: "£1 is 100p. £2.35 means 2 pounds and 35 pence, which is 235p. The decimal point separates the pounds from the pence.",
    parentNote: "The two digits after the decimal point are the pence. £3.05 is 305p, not 350p, because the 0 holds the tens place.",
    talkAbout: "Why is £3.05 not the same as £3.50?",
  }, (r, l) => {
    if (l === 1) { const p = int(r, 1, 9), c = int(r, 10, 95); return { prompt: `How many pence is £${p}.${c}?`, value: p * 100 + c, unit: "p", hint: "Change the pounds to pence, then add the pence.", solution: [`£${p} is ${p * 100}p.`, `${p * 100} + ${c} = ${p * 100 + c}p.`] }; }
    if (l === 2) { const p = int(r, 1, 12), c = int(r, 1, 9); return { prompt: `How many pence is £${p}.0${c}?`, value: p * 100 + c, unit: "p", hint: "The 0 means there are no tens of pence.", solution: [`£${p} is ${p * 100}p.`, `The pence part is 0${c}, which is ${c}p.`, `${p * 100} + ${c} = ${p * 100 + c}p.`] }; }
    const total = int(r, 105, 995);
    return { prompt: `Write ${total}p in pounds.`, value: total / 100, pounds: true, hint: "Divide by 100. 100p is £1.", solution: [`${total} ÷ 100 = ${(total / 100).toFixed(2)}.`, `${total}p is ${gbp(total)}.`] };
  }),
  money({
    id: "add-sub-money", name: "Adding and subtracting money", stage: "KS2", year: 4, strand: "Measures", prereqs: ["pounds-pence"],
    blurb: "Add and subtract amounts in pounds and pence, and work out change.",
    explainer: "Line up the decimal points, then add or subtract just like whole numbers. Keep the pence in their own column.",
    parentNote: "Write the amounts one under the other with the decimal points lined up. For change, count up from the price to the amount paid.",
    talkAbout: "How could you count up to work out the change?",
  }, (r, l) => {
    const a = int(r, 120, 480), b = int(r, 105, 395), c = int(r, 110, 350);
    if (l === 1) return { prompt: `A book costs ${gbp(a)} and a pen costs ${gbp(b)}. How much do they cost altogether in pounds?`, value: (a + b) / 100, pounds: true, hint: "Line up the decimal points and add.", solution: [`${gbp(a)} + ${gbp(b)} = ${gbp(a + b)}.`] };
    if (l === 2) return { prompt: `Three snacks cost ${gbp(a)}, ${gbp(b)} and ${gbp(c)}. How much is that altogether in pounds?`, value: (a + b + c) / 100, pounds: true, hint: "Add the first two, then add the third.", solution: [`${gbp(a)} + ${gbp(b)} = ${gbp(a + b)}.`, `${gbp(a + b)} + ${gbp(c)} = ${gbp(a + b + c)}.`] };
    const paid = pick(r, [500, 1000, 2000]), price = int(r, 130, paid - 100), cents = price - (price % 5);
    return { prompt: `A cap costs ${gbp(cents)}. You pay with ${pounds(paid)}. How much change do you get in pounds?`, value: (paid - cents) / 100, pounds: true, hint: "Take the price away from the amount you paid.", solution: [`${pounds(paid)} − ${gbp(cents)} = ${gbp(paid - cents)}.`] };
  }),
  money({
    id: "shopping-bills", name: "Shopping bills", stage: "KS2", year: 5, strand: "Measures", prereqs: ["add-sub-money", "mult-written"],
    blurb: "Work out the cost of several items, and the change from a bigger note.",
    explainer: "Find the cost of each kind of item first, then add them to get the bill.",
    parentNote: "Break the bill into steps: price × how many for each item, add the totals, then take the total from what was paid. Estimating first is a good check.",
    talkAbout: "What is a quick estimate of the bill before you work it out exactly?",
  }, (r, l) => {
    const first = pick(r, ITEMS), second = pick(r, ITEMS.filter((x) => x !== first));
    const p1 = int(r, 25, 95), p2 = int(r, 40, 180), n1 = int(r, 2, 6), n2 = int(r, 2, 4);
    const t1 = p1 * n1, t2 = p2 * n2, w1 = first[1], w2 = second[1];
    if (l === 1) return { prompt: `${n1} ${w1} cost ${nice(p1)} each. How much do they cost altogether in pounds?`, value: t1 / 100, pounds: true, hint: "Multiply the price by how many.", solution: [`${n1} × ${p1}p = ${t1}p.`, `${t1}p = ${gbp(t1)}.`] };
    if (l === 2) return { prompt: `You buy ${n1} ${w1} at ${nice(p1)} each and ${n2} ${w2} at ${nice(p2)} each. What is the total bill in pounds?`, value: (t1 + t2) / 100, pounds: true, hint: "Work out each kind of item first, then add.", solution: [`${n1} × ${p1}p = ${t1}p.`, `${n2} × ${p2}p = ${t2}p.`, `${t1}p + ${t2}p = ${t1 + t2}p = ${gbp(t1 + t2)}.`] };
    const paid = 2000, total = t1 + t2 + int(r, 2, 6) * 100;
    return { prompt: `You buy ${n1} ${w1} at ${nice(p1)} each, ${n2} ${w2} at ${nice(p2)} each and a game for ${gbp(total - t1 - t2)}. You pay with a £20 note. How much change do you get in pounds?`, value: (paid - total) / 100, pounds: true, hint: "Find the total bill first, then take it from £20.", solution: [`${n1} × ${p1}p = ${t1}p and ${n2} × ${p2}p = ${t2}p.`, `Total: ${t1} + ${t2} + ${total - t1 - t2} = ${total}p = ${gbp(total)}.`, `£20 − ${gbp(total)} = ${gbp(paid - total)}.`] };
  }),
  money({
    id: "multiply-divide-money", name: "Multiplying and dividing money", stage: "KS2", year: 5, strand: "Measures", prereqs: ["add-sub-money", "division"],
    blurb: "Multiply a price by a number, and share an amount to find the price of one.",
    explainer: "To find one, divide the total by how many there are. To find lots, multiply the price of one.",
    parentNote: "Change to pence to avoid decimals: £7.60 is 760p, and 760 ÷ 4 = 190p, which is £1.90.",
    talkAbout: "Would it be easier to work in pounds or in pence here?",
  }, (r, l) => {
    const n = int(r, 3, 8), one = int(r, 55, 395);
    if (l === 1) return { prompt: `One ticket costs ${gbp(one)}. How much do ${n} tickets cost in pounds?`, value: (one * n) / 100, pounds: true, hint: "Multiply the price of one by the number of tickets.", solution: [`${one}p × ${n} = ${one * n}p.`, `${one * n}p = ${gbp(one * n)}.`] };
    if (l === 2) return { prompt: `${n} identical toys cost ${gbp(one * n)} altogether. How much does one toy cost in pounds?`, value: one / 100, pounds: true, hint: "Divide the total by the number of toys.", solution: [`${gbp(one * n)} = ${one * n}p.`, `${one * n} ÷ ${n} = ${one}p = ${gbp(one)}.`] };
    const n2 = int(r, 2, 5), m = n + n2;
    return { prompt: `${n} identical notebooks cost ${gbp(one * n)}. How much would ${m} of the same notebooks cost in pounds?`, value: (one * m) / 100, pounds: true, hint: "Find the price of one notebook first.", solution: [`${one * n}p ÷ ${n} = ${one}p for one.`, `${one}p × ${m} = ${one * m}p = ${gbp(one * m)}.`] };
  }),
  money({
    id: "best-value", name: "Best value", stage: "KS2", year: 6, strand: "Measures", prereqs: ["multiply-divide-money"],
    blurb: "Compare prices to find the best value, by working out the cost of one.",
    explainer: "To compare fairly, work out the price of one item (or one gram) for each offer. The smaller price is the better value.",
    parentNote: "Compare the price of the same amount: one item, or 100 g. A bigger pack is not always cheaper per item, so check.",
    talkAbout: "How can you compare two packs of different sizes fairly?",
  }, (r, l) => {
    const n1 = pick(r, [4, 6, 8, 10]), n2 = pick(r, [12, 15, 20, 25]), p1 = int(r, 20, 60), p2 = p1 - int(r, 2, 8);
    if (l === 1) return { prompt: `A pack of ${n1} cakes costs ${gbp(n1 * p1)}. How much does one cake cost in pence?`, value: p1, unit: "p", hint: "Divide the price by the number of cakes.", solution: [`${gbp(n1 * p1)} = ${n1 * p1}p.`, `${n1 * p1} ÷ ${n1} = ${p1}p.`] };
    if (l === 2) return { prompt: `Pack A has ${n1} cakes for ${gbp(n1 * p1)}. Pack B has ${n2} cakes for ${gbp(n2 * p2)}. How many pence cheaper is each cake in the better pack?`, value: p1 - p2, unit: "p", hint: "Work out the price of one cake in each pack, then find the difference.", solution: [`Pack A: ${n1 * p1} ÷ ${n1} = ${p1}p each.`, `Pack B: ${n2 * p2} ÷ ${n2} = ${p2}p each.`, `${p1} − ${p2} = ${p1 - p2}p cheaper in pack B.`] };
    const g1 = pick(r, [200, 300, 400]), g2 = g1 * 2, per1 = int(r, 20, 40), per2 = per1 - int(r, 2, 6);
    return { prompt: `A ${g1} g tin costs ${gbp((g1 / 100) * per1)} and a ${g2} g tin costs ${gbp((g2 / 100) * per2)}. How many pence cheaper is 100 g in the better tin?`, value: per1 - per2, unit: "p", hint: "Work out the price of 100 g for each tin.", solution: [`${g1} g tin: ${((g1 / 100) * per1)} ÷ ${g1 / 100} = ${per1}p for 100 g.`, `${g2} g tin: ${((g2 / 100) * per2)} ÷ ${g2 / 100} = ${per2}p for 100 g.`, `${per1} − ${per2} = ${per1 - per2}p cheaper in the bigger tin.`] };
  }),
  money({
    id: "currency-exchange", name: "Changing currency", stage: "KS2", year: 6, strand: "Measures", prereqs: ["multiply-divide-money", "decimals"],
    blurb: "Convert between pounds and other currencies using an exchange rate.",
    explainer: "An exchange rate says how much of another currency you get for £1. To change pounds, multiply. To change back, divide.",
    parentNote: "Write the rate as 'for £1 you get ...'. Going from pounds to the other currency multiplies; going the other way divides.",
    talkAbout: "Do you multiply or divide to turn euros back into pounds?",
  }, (r, l) => {
    const rate = pick(r, [1.2, 1.25, 1.5, 2]);
    const gbpAmt = int(r, 2, 20) * (rate === 1.25 ? 4 : rate === 1.2 ? 5 : 10);
    if (l === 1) return { prompt: `£1 buys ${rate.toFixed(2)} euros. How many euros do you get for £${gbpAmt}?`, value: round(gbpAmt * rate, 2), hint: "Multiply the pounds by the rate.", solution: [`${gbpAmt} × ${rate} = ${round(gbpAmt * rate, 2)} euros.`] };
    if (l === 2) return { prompt: `£1 buys ${rate.toFixed(2)} euros. A hotel costs ${round(gbpAmt * rate, 2)} euros. How much is that in pounds?`, value: gbpAmt, pounds: true, hint: "Divide the euros by the rate.", solution: [`${round(gbpAmt * rate, 2)} ÷ ${rate} = ${gbpAmt}.`, `So it costs £${gbpAmt}.`] };
    const price = round(gbpAmt * rate, 2), cheaper = int(r, 1, 5);
    return { prompt: `£1 buys ${rate.toFixed(2)} euros. A jacket costs £${gbpAmt + cheaper} in London and ${price} euros in Paris. How many pounds cheaper is it in Paris?`, value: cheaper, pounds: true, hint: "Change the euro price to pounds, then compare.", solution: [`${price} ÷ ${rate} = £${gbpAmt}.`, `£${gbpAmt + cheaper} − £${gbpAmt} = £${cheaper}.`] };
  }),

  // ---------------------------------------------------------------- Key Stage 3
  money({
    id: "profit-loss", name: "Profit and loss", stage: "KS3", year: 7, strand: "Number", prereqs: ["pct-amount"],
    blurb: "Work out profit, loss and percentage profit.",
    explainer: "Profit is the selling price minus the cost. If it is below zero it is a loss. Percentage profit compares the profit with the cost.",
    parentNote: "Profit = selling price − cost price. Percentage profit = profit ÷ cost price × 100, always based on what it cost, not what it sold for.",
    talkAbout: "Why do we divide by the cost price, not the selling price?",
  }, (r, l) => {
    const cost = int(r, 2, 14) * 20;
    if (l === 1) { const profit = int(r, 3, 25); return { prompt: `A shop buys a scarf for £${cost} and sells it for £${cost + profit}. What is the profit in pounds?`, value: profit, pounds: true, hint: "Selling price minus cost price.", solution: [`£${cost + profit} − £${cost} = £${profit}.`] }; }
    if (l === 2) { const pct = pick(r, [10, 20, 25, 50]), profit = (cost * pct) / 100; return { prompt: `A trader buys a lamp for £${cost} and sells it for £${cost + profit}. What is the percentage profit? Type the number only.`, value: pct, unit: "%", hint: "Percentage profit = profit ÷ cost × 100.", solution: [`Profit = £${cost + profit} − £${cost} = £${profit}.`, `${profit} ÷ ${cost} × 100 = ${pct}%.`] }; }
    const pct = pick(r, [10, 20, 25, 30]), sell = round(cost * (1 - pct / 100), 2);
    return { prompt: `A shop buys a chair for £${cost} and sells it at a loss of ${pct}%. What is the selling price in pounds?`, value: sell, pounds: true, hint: "Find the loss first, then take it away from the cost.", solution: [`Loss = ${pct}% of £${cost} = ${pd(round((cost * pct) / 100, 2))}.`, `£${cost} − ${pd(round((cost * pct) / 100, 2))} = ${pd(sell)}.`] };
  }),
  money({
    id: "simple-interest", name: "Simple interest", stage: "KS3", year: 8, strand: "Number", prereqs: ["pct-amount"],
    blurb: "Work out simple interest and the total in an account.",
    explainer: "With simple interest you earn the same amount every year, based on the money you first put in.",
    parentNote: "Find the interest for one year (a percentage of the amount), then multiply by the number of years. Compare with compound interest later.",
    talkAbout: "How is simple interest different from the interest on a savings account that grows each year?",
  }, (r, l) => {
    const P = int(r, 2, 20) * 100, R = pick(r, [2, 3, 4, 5]), T = int(r, 2, 6), one = (P * R) / 100;
    if (l === 1) return { prompt: `£${P} is put in an account that pays ${R}% simple interest each year. How much interest is earned in 1 year, in pounds?`, value: one, pounds: true, hint: `Find ${R}% of £${P}.`, solution: [`${R}% of £${P} = £${one}.`] };
    if (l === 2) return { prompt: `£${P} is put in an account that pays ${R}% simple interest each year. How much interest is earned in ${T} years, in pounds?`, value: one * T, pounds: true, hint: "Find one year's interest, then multiply by the years.", solution: [`One year: ${R}% of £${P} = £${one}.`, `${T} years: £${one} × ${T} = £${one * T}.`] };
    return { prompt: `£${P} is put in an account that pays ${R}% simple interest each year. How much is in the account after ${T} years, in pounds?`, value: P + one * T, pounds: true, hint: "Add the interest to the amount put in.", solution: [`One year: ${R}% of £${P} = £${one}.`, `${T} years: £${one} × ${T} = £${one * T}.`, `£${P} + £${one * T} = £${P + one * T}.`] };
  }),
  money({
    id: "vat-wages", name: "VAT, tax and wages", stage: "KS3", year: 8, strand: "Number", prereqs: ["pct-amount", "profit-loss"],
    blurb: "Add VAT to a price, take it off, and work out pay with overtime.",
    explainer: "VAT is a tax of 20% added to many prices. To add it, multiply by 1.2. To take it off, divide by 1.2.",
    parentNote: "Adding 20% is multiplying by 1.2. To find the price before VAT, divide by 1.2: it is not 'take off 20%', because the 20% was of the smaller price.",
    talkAbout: "Why is taking 20% off the price with VAT not the same as the price without VAT?",
  }, (r, l) => {
    if (l === 1) { const p = int(r, 5, 60) * 10; return { prompt: `A phone case costs £${p} before VAT. VAT is 20%. What is the price including VAT, in pounds?`, value: round(p * 1.2, 2), pounds: true, hint: "Multiply by 1.2.", solution: [`20% of £${p} = £${p * 0.2}.`, `£${p} + £${p * 0.2} = £${round(p * 1.2, 2)}.`] }; }
    if (l === 2) { const base = int(r, 5, 60) * 5, withVat = round(base * 1.2, 2); return { prompt: `A TV costs £${withVat} including 20% VAT. What was the price before VAT, in pounds?`, value: base, pounds: true, hint: "£" + withVat + " is 120% of the price before VAT. Divide by 1.2.", solution: [`The price with VAT is 120% of the original.`, `£${withVat} ÷ 1.2 = £${base}.`] }; }
    const rate = int(r, 10, 16), hrs = int(r, 32, 40), ot = int(r, 4, 8), over = (rate * 3) / 2;
    return { prompt: `Sam earns £${rate} an hour for ${hrs} hours a week, and then time and a half (1.5 × the normal rate) for ${ot} hours of overtime. How much does Sam earn that week in pounds?`, value: rate * hrs + over * ot, pounds: true, hint: "Work out the normal pay and the overtime pay separately.", solution: [`Normal pay: ${hrs} × £${rate} = £${rate * hrs}.`, `Overtime rate: 1.5 × £${rate} = £${over}.`, `Overtime pay: ${ot} × £${over} = £${over * ot}.`, `Total: £${rate * hrs} + £${over * ot} = £${rate * hrs + over * ot}.`] };
  }),
  money({
    id: "budgeting", name: "Budgets", stage: "KS3", year: 9, strand: "Number", prereqs: ["vat-wages"],
    blurb: "Use percentages and fractions of income to plan spending and saving.",
    explainer: "A budget shows where money comes in and where it goes. Work out each part, take them away from the income, and see what is left.",
    parentNote: "Write each cost as a percentage or fraction of income, find the amounts, and subtract. Then ask how long it would take to save for something.",
    talkAbout: "If your income stays the same, how long would it take to save for something you want?",
  }, (r, l) => {
    const inc = int(r, 12, 30) * 100, a = pick(r, [20, 25, 30, 35]), b = pick(r, [10, 15, 20]);
    if (l === 1) return { prompt: `A family has £${inc} a month to spend. ${a}% goes on rent. How much is the rent in pounds?`, value: (inc * a) / 100, pounds: true, hint: `Find ${a}% of £${inc}.`, solution: [`${a}% of £${inc} = £${(inc * a) / 100}.`] };
    if (l === 2) return { prompt: `A family has £${inc} a month. ${a}% goes on rent and ${b}% on bills. How much is left in pounds?`, value: inc - (inc * (a + b)) / 100, pounds: true, hint: "Add the two percentages, find that much, and take it away.", solution: [`${a}% + ${b}% = ${a + b}%.`, `${a + b}% of £${inc} = £${(inc * (a + b)) / 100}.`, `£${inc} − £${(inc * (a + b)) / 100} = £${inc - (inc * (a + b)) / 100}.`] };
    const left = inc - (inc * (a + b)) / 100, save = Math.floor(left / 2 / 10) * 10, months = int(r, 4, 9), goal = save * months;
    return { prompt: `A family has £${inc} a month. ${a}% goes on rent and ${b}% on bills. They save £${save} of what is left each month. How many months does it take to save £${goal}?`, value: months, hint: "Divide the amount they want by the amount saved each month.", solution: [`Saved each month: £${save}.`, `£${goal} ÷ £${save} = ${months} months.`] };
  }),
];
