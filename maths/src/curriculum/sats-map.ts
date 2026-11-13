/**
 * Which Key Stage 2 mathematics test question assessed which content-domain code, for the 2024 and 2025 tests (taken from the published mark schemes,
 * table of content domain coverage), and which of our topics practise each code. Used by scripts/sats-coverage.ts to write docs/SATS_COVERAGE.md and by
 * sats-map.test.ts to keep the topic ids honest. Only question numbers and codes are kept here, never the questions themselves.
 */
/** Paper 1 is arithmetic; papers 2 and 3 are reasoning. Each question (or part) lists its codes, the main one first. */
export const SATS_CODES: Record<string, Record<string, Record<string, string[]>>> = {
 "2024": {
  "P1": {
   "1": [
    "3C2"
   ],
   "2": [
    "3C7"
   ],
   "3": [
    "4C7"
   ],
   "4": [
    "4C2"
   ],
   "5": [
    "4C7"
   ],
   "6": [
    "4C2"
   ],
   "7": [
    "4C6b"
   ],
   "8": [
    "4C6b"
   ],
   "9": [
    "5F10",
    "5F8"
   ],
   "10": [
    "4C7"
   ],
   "11": [
    "4C6b"
   ],
   "12": [
    "3C2"
   ],
   "13": [
    "4C6b"
   ],
   "14": [
    "6F5a"
   ],
   "15": [
    "4C6b"
   ],
   "16": [
    "6N3"
   ],
   "17": [
    "5C6b"
   ],
   "18": [
    "5F4"
   ],
   "19": [
    "6F4"
   ],
   "20": [
    "6C7a"
   ],
   "21": [
    "5C5d",
    "6C9"
   ],
   "22": [
    "6F9a"
   ],
   "23": [
    "6C9"
   ],
   "24": [
    "5F10",
    "4F8",
    "4C2"
   ],
   "25": [
    "6C7a"
   ],
   "26": [
    "5F4"
   ],
   "27": [
    "6F5b"
   ],
   "28": [
    "6F4"
   ],
   "29": [
    "6F9b"
   ],
   "30": [
    "6C7b"
   ],
   "31": [
    "6R2"
   ],
   "32": [
    "6F5b"
   ],
   "33": [
    "6R2"
   ],
   "34": [
    "6F4"
   ],
   "35": [
    "5F5"
   ],
   "36": [
    "6C7b"
   ]
  },
  "P2": {
   "1": [
    "4G2c",
    "5P2"
   ],
   "2": [
    "3M9a",
    "3C1"
   ],
   "3": [
    "3S2",
    "3S1",
    "3C1"
   ],
   "4": [
    "6N5",
    "6A3"
   ],
   "5": [
    "4C7"
   ],
   "6": [
    "3N6",
    "3N2a",
    "3N3"
   ],
   "7": [
    "5C6a"
   ],
   "8": [
    "5N4",
    "4N4b"
   ],
   "9": [
    "4F9"
   ],
   "10": [
    "6C5"
   ],
   "11": [
    "6R1",
    "4C6a"
   ],
   "12": [
    "5F2b",
    "4M7b"
   ],
   "13": [
    "6G2b",
    "6G2a"
   ],
   "14": [
    "4F10a",
    "3F4",
    "4C6a"
   ],
   "15": [
    "6F9a"
   ],
   "16": [
    "6N3"
   ],
   "17": [
    "5M9a",
    "4F10b",
    "3C4"
   ],
   "18": [
    "6M5",
    "4N4a"
   ],
   "19": [
    "4C4"
   ],
   "20": [
    "5M4",
    "4M5"
   ],
   "21": [
    "3G2"
   ],
   "22": [
    "6S3",
    "3S1",
    "5F10"
   ],
   "23": [
    "6C7b",
    "6F2"
   ],
   "24": [
    "6C5",
    "5C5d"
   ],
   "25": [
    "6A4",
    "4C3"
   ],
   "26": [
    "6P3",
    "4P2"
   ],
   "27": [
    "6R2"
   ]
  },
  "P3": {
   "1": [
    "3F2"
   ],
   "2": [
    "5N5"
   ],
   "3": [
    "4F10b"
   ],
   "4": [
    "4N4b"
   ],
   "5": [
    "5N3b"
   ],
   "6": [
    "6F2"
   ],
   "7": [
    "4C3",
    "3C8",
    "4C8"
   ],
   "8": [
    "6P2"
   ],
   "9": [
    "4N1",
    "5C8a",
    "4C6a"
   ],
   "10a": [
    "3M7",
    "4M7a"
   ],
   "10b": [
    "6G4a",
    "5G4c"
   ],
   "11": [
    "3C2",
    "3C4"
   ],
   "12": [
    "6F3",
    "6F6"
   ],
   "13": [
    "5M9c",
    "6F9b",
    "6C8"
   ],
   "14": [
    "6S1"
   ],
   "15": [
    "6R2",
    "6C8"
   ],
   "16": [
    "6F11"
   ],
   "17": [
    "5C5a"
   ],
   "18": [
    "5M9a"
   ],
   "19": [
    "6C7c",
    "6C8"
   ],
   "20": [
    "6G2a",
    "5G4a"
   ],
   "21": [
    "6C8",
    "5C8c",
    "6C7a"
   ],
   "22a": [
    "6A2",
    "6C9"
   ],
   "22b": [
    "6A2",
    "4C3",
    "6C9"
   ],
   "23": [
    "6G2b"
   ],
   "24": [
    "6F5a",
    "6F3"
   ]
  }
 },
 "2025": {
  "P1": {
   "1": [
    "4N3a"
   ],
   "2": [
    "3C2"
   ],
   "3": [
    "4C6b"
   ],
   "4": [
    "5F10",
    "5F8"
   ],
   "5": [
    "3C2",
    "3C1"
   ],
   "6": [
    "4C6a"
   ],
   "7": [
    "4C7"
   ],
   "8": [
    "4C6b"
   ],
   "9": [
    "3C2",
    "3C4"
   ],
   "10": [
    "3C6",
    "3C8"
   ],
   "11": [
    "6F5a"
   ],
   "12": [
    "4C6b"
   ],
   "13": [
    "4C7"
   ],
   "14": [
    "6C7a"
   ],
   "15": [
    "4C6b"
   ],
   "16": [
    "6F9b"
   ],
   "17": [
    "6F9a"
   ],
   "18": [
    "5F4"
   ],
   "19": [
    "4C6b",
    "5C7b",
    "5C6a"
   ],
   "20": [
    "5C2"
   ],
   "21": [
    "5C7b"
   ],
   "22": [
    "5F4"
   ],
   "23": [
    "5F10",
    "4F8"
   ],
   "24": [
    "6F4"
   ],
   "25": [
    "6R2"
   ],
   "26": [
    "6F5b"
   ],
   "27": [
    "6R2"
   ],
   "28": [
    "6C7b"
   ],
   "29": [
    "6F4"
   ],
   "30": [
    "6C7a"
   ],
   "31": [
    "6C9"
   ],
   "32": [
    "6R2"
   ],
   "33": [
    "5F5"
   ],
   "34": [
    "6C7b"
   ],
   "35": [
    "5F5"
   ],
   "36": [
    "6F4"
   ]
  },
  "P2": {
   "1": [
    "3G4b"
   ],
   "2a": [
    "3N2b"
   ],
   "2b": [
    "4N2b"
   ],
   "3": [
    "4M1",
    "4M9"
   ],
   "4": [
    "4P3a"
   ],
   "5": [
    "3N1"
   ],
   "6a": [
    "6N3"
   ],
   "6b": [
    "6N2",
    "6N6",
    "5C1"
   ],
   "7a": [
    "6S1",
    "5M6"
   ],
   "7b": [
    "6S1",
    "5M6",
    "6N4"
   ],
   "8": [
    "5P2",
    "4G2c"
   ],
   "9a": [
    "3C6",
    "3C8"
   ],
   "9b": [
    "3C6",
    "3C8"
   ],
   "10": [
    "6G3b"
   ],
   "11": [
    "5C4",
    "5C1"
   ],
   "12": [
    "5M5",
    "6M5"
   ],
   "13": [
    "5C8b"
   ],
   "14": [
    "5C4",
    "6F9b",
    "5S1"
   ],
   "15": [
    "6F11",
    "6R2"
   ],
   "16": [
    "4F10b",
    "6F11"
   ],
   "17": [
    "6R1",
    "5M9a",
    "6M9"
   ],
   "18": [
    "5F3"
   ],
   "19": [
    "6C8",
    "5M9a"
   ],
   "20": [
    "6A5",
    "6A4",
    "6C5"
   ],
   "21": [
    "5F10",
    "5C6b",
    "6C8"
   ],
   "22": [
    "6M8a",
    "5F5"
   ],
   "23": [
    "6R1",
    "6R4"
   ]
  },
  "P3": {
   "1": [
    "5N3a"
   ],
   "2": [
    "6N2"
   ],
   "3": [
    "5N4",
    "6N4"
   ],
   "4": [
    "5M9a"
   ],
   "5": [
    "4P2",
    "4P3a"
   ],
   "6": [
    "4C8",
    "3M9c"
   ],
   "7": [
    "5F2a"
   ],
   "8": [
    "4M9",
    "4F10b",
    "4C4"
   ],
   "9a": [
    "4N5",
    "4N4a"
   ],
   "9b": [
    "4N5",
    "4N4a"
   ],
   "10": [
    "5S1",
    "5M9b",
    "5M9c"
   ],
   "11": [
    "5F6b"
   ],
   "12": [
    "3M4b",
    "4M4a",
    "4M4b"
   ],
   "13": [
    "5F6a",
    "5F3",
    "5F8"
   ],
   "14a": [
    "6A2",
    "5C5c"
   ],
   "14b": [
    "6A2",
    "5C5d"
   ],
   "15a": [
    "6C6",
    "6C8"
   ],
   "15b": [
    "6C6",
    "6C8"
   ],
   "16": [
    "6S1",
    "3F1b"
   ],
   "17": [
    "6C8",
    "6C7a",
    "6C7b"
   ],
   "18a": [
    "5M5"
   ],
   "18b": [
    "6M5"
   ],
   "19": [
    "6R1",
    "5M9b",
    "5C7b"
   ],
   "20": [
    "6F5a"
   ],
   "21": [
    "5C5a",
    "4N1"
   ],
   "22": [
    "6G4b",
    "6G4a"
   ]
  }
 }
};

/** The topics that practise each code. */
export const SATS_TOPICS: Record<string, string[]> = {
 "3C1": [
  "add-sub"
 ],
 "3C2": [
  "add-sub"
 ],
 "3C4": [
  "add-sub",
  "times-tables"
 ],
 "3C6": [
  "times-tables"
 ],
 "3C7": [
  "times-tables"
 ],
 "3C8": [
  "times-tables",
  "correspondence"
 ],
 "3F1b": [
  "frac-same-denom",
  "frac-amount"
 ],
 "3F2": [
  "frac-equiv"
 ],
 "3F4": [
  "frac-same-denom"
 ],
 "3G2": [
  "line-types"
 ],
 "3G4b": [
  "right-angles"
 ],
 "3M4b": [
  "analogue-clocks"
 ],
 "3M7": [
  "perimeter-simple"
 ],
 "3M9a": [
  "money-change"
 ],
 "3M9c": [
  "measure-add"
 ],
 "3N1": [
  "count-steps"
 ],
 "3N2a": [
  "place-value"
 ],
 "3N2b": [
  "count-steps"
 ],
 "3N3": [
  "place-value"
 ],
 "3N6": [
  "place-value",
  "count-steps"
 ],
 "3S1": [
  "pictograms",
  "read-bar-charts",
  "read-tables"
 ],
 "3S2": [
  "pictograms",
  "read-bar-charts",
  "read-tables"
 ],
 "4C2": [
  "add-sub"
 ],
 "4C3": [
  "estimate-check",
  "rounding",
  "word-problems"
 ],
 "4C4": [
  "word-problems"
 ],
 "4C6a": [
  "times-tables"
 ],
 "4C6b": [
  "times-tables",
  "divide-10-100",
  "multiply-three"
 ],
 "4C7": [
  "mult-written"
 ],
 "4C8": [
  "mult-written",
  "word-problems"
 ],
 "4F10a": [
  "frac-amount"
 ],
 "4F10b": [
  "hundredths",
  "pounds-pence",
  "decimals"
 ],
 "4F8": [
  "decimals",
  "hundredths"
 ],
 "4F9": [
  "divide-10-100"
 ],
 "4G2c": [
  "symmetry-lines"
 ],
 "4M1": [
  "pounds-pence"
 ],
 "4M4a": [
  "analogue-clocks",
  "convert-time"
 ],
 "4M4b": [
  "convert-time",
  "timetables"
 ],
 "4M5": [
  "measures-convert",
  "convert-time"
 ],
 "4M7a": [
  "perimeter-lshape"
 ],
 "4M7b": [
  "area-counting"
 ],
 "4M9": [
  "pounds-pence",
  "add-sub-money",
  "measure-add"
 ],
 "4N1": [
  "count-steps-more"
 ],
 "4N2b": [
  "place-value",
  "count-steps-more"
 ],
 "4N3a": [
  "place-value"
 ],
 "4N4a": [
  "place-value",
  "scales-reading"
 ],
 "4N4b": [
  "rounding"
 ],
 "4N5": [
  "count-through-zero"
 ],
 "4P2": [
  "translate-grid",
  "coordinates",
  "reflect-translate"
 ],
 "4P3a": [
  "coordinates"
 ],
 "5C1": [
  "add-sub",
  "place-value"
 ],
 "5C2": [
  "add-sub",
  "large-numbers"
 ],
 "5C4": [
  "word-problems"
 ],
 "5C5a": [
  "factors-multiples"
 ],
 "5C5c": [
  "primes-squares-cubes"
 ],
 "5C5d": [
  "primes-squares-cubes"
 ],
 "5C6a": [
  "times-tables",
  "mult-written"
 ],
 "5C6b": [
  "divide-10-100"
 ],
 "5C7b": [
  "division"
 ],
 "5C8a": [
  "word-problems",
  "factors-multiples"
 ],
 "5C8b": [
  "word-problems"
 ],
 "5C8c": [
  "scale-recipes",
  "frac-amount"
 ],
 "5F10": [
  "decimals",
  "shopping-bills"
 ],
 "5F2a": [
  "mixed-numbers"
 ],
 "5F2b": [
  "frac-equiv"
 ],
 "5F3": [
  "fraction-order"
 ],
 "5F4": [
  "frac-same-denom",
  "frac-add"
 ],
 "5F5": [
  "frac-times-whole"
 ],
 "5F6a": [
  "fdp-convert",
  "hundredths"
 ],
 "5F6b": [
  "thousandths"
 ],
 "5F8": [
  "decimals",
  "thousandths"
 ],
 "5G4a": [
  "angles-basic",
  "angle-types"
 ],
 "5G4c": [
  "draw-angles"
 ],
 "5M4": [
  "convert-time",
  "elapsed-time"
 ],
 "5M5": [
  "measures-convert"
 ],
 "5M6": [
  "imperial-metric"
 ],
 "5M9a": [
  "shopping-bills",
  "multiply-divide-money"
 ],
 "5M9b": [
  "measures-convert",
  "decimals"
 ],
 "5M9c": [
  "measures-convert",
  "decimals"
 ],
 "5N3a": [
  "large-numbers"
 ],
 "5N3b": [
  "roman-numerals"
 ],
 "5N4": [
  "rounding",
  "large-numbers"
 ],
 "5N5": [
  "negative-numbers",
  "count-through-zero"
 ],
 "5P2": [
  "reflect-translate"
 ],
 "5S1": [
  "read-tables",
  "timetables"
 ],
 "6A2": [
  "using-formulae"
 ],
 "6A3": [
  "sequences"
 ],
 "6A4": [
  "two-unknowns"
 ],
 "6A5": [
  "combinations",
  "two-unknowns"
 ],
 "6C5": [
  "factors-multiples",
  "primes-squares-cubes"
 ],
 "6C6": [
  "order-ops",
  "word-problems"
 ],
 "6C7a": [
  "mult-written"
 ],
 "6C7b": [
  "long-division"
 ],
 "6C7c": [
  "long-division"
 ],
 "6C8": [
  "word-problems",
  "test-problems",
  "test-claims"
 ],
 "6C9": [
  "order-ops"
 ],
 "6F11": [
  "fdp-convert"
 ],
 "6F2": [
  "frac-equiv",
  "frac-add"
 ],
 "6F3": [
  "fraction-order",
  "mixed-numbers"
 ],
 "6F4": [
  "frac-add"
 ],
 "6F5a": [
  "frac-multiply"
 ],
 "6F5b": [
  "frac-divide"
 ],
 "6F6": [
  "fdp-convert",
  "long-division"
 ],
 "6F9a": [
  "decimals",
  "divide-10-100",
  "place-value-millions"
 ],
 "6F9b": [
  "decimals"
 ],
 "6G2a": [
  "shape-properties",
  "polygon-regularity",
  "rectangle-properties"
 ],
 "6G2b": [
  "shapes-3d"
 ],
 "6G3b": [
  "nets-solids"
 ],
 "6G4a": [
  "angles-basic",
  "angle-types"
 ],
 "6G4b": [
  "vertically-opposite"
 ],
 "6M5": [
  "measures-convert"
 ],
 "6M8a": [
  "volume-cuboids"
 ],
 "6M9": [
  "measures-convert"
 ],
 "6N2": [
  "place-value-millions"
 ],
 "6N3": [
  "place-value-millions"
 ],
 "6N4": [
  "rounding"
 ],
 "6N5": [
  "negative-numbers"
 ],
 "6N6": [
  "negative-numbers",
  "place-value-millions"
 ],
 "6P2": [
  "reflect-translate",
  "coordinates-four-quadrants"
 ],
 "6P3": [
  "coordinates-four-quadrants"
 ],
 "6R1": [
  "scale-factor",
  "ratio-share",
  "scale-recipes"
 ],
 "6R2": [
  "pct-amount"
 ],
 "6R4": [
  "ratio-share"
 ],
 "6S1": [
  "pie-chart-counts",
  "pie-angles",
  "line-graphs"
 ],
 "6S3": [
  "averages"
 ]
};

/** Codes where our topics cover only part of the statement, and what is missing. */
export const SATS_PARTIAL: Record<string, string> = {
 "3C4": "Missing-number problems appear only in the 'find the missing number' forms of the times tables; there is no Year 3 addition missing-number topic.",
 "6F6": "Writing a fraction as a decimal by dividing (such as 3/8 = 0.375) is practised; the link to the division method is not shown step by step.",
 "5M6": "Approximate metric and imperial equivalences are practised; some of the less common ones (such as feet and inches) are not."
};

/** The statement for each code, from the national curriculum test framework (Open Government Licence). */
export const SATS_STATEMENTS: Record<string, string> = {
 "3C1": "add and subtract numbers mentally, including: • aandthree-digit number ones • aandthree-digit number tens • aandthree-digit number hundreds",
 "3C2": "add and subtract numbers with up to three digits, using formal written methods of columnar addition and subtraction",
 "3C4": "solve problems, including missing number problems, using number facts, place value, and more complex addition and subtraction",
 "3C6": "recall and use multiplication and division facts for the 3, 4 and 8 multiplication tables",
 "3C7": "write and calculate mathematical statements for multiplication and division using the multiplication tables that pupils know, including for two-digit numbers times one-digit numbers, using mental and progressing to formal written methods",
 "3C8": "solve problems, including missing number problems, involving multiplication and division, including integer scaling problems and correspondence problems in which n objects are connected to m objects",
 "3F1b": "recognise, find and write fractions of a discrete set of objects: unit fractions and non-unit fractions with small denominators",
 "3F2": "recognise and show, using diagrams, equivalent fractions with small denominators",
 "3F4": "add and subtract fractions with the same denominator within one whole [e.g. 57 + 17 = 67 ]",
 "3G2": "identify horizontal, vertical lines and pairs of perpendicular and parallel lines",
 "3G4b": "identify right angles, recognise that two right angles make a half- turn, three make three quarters of a turn and four a complete turn; identify whether angles are greater than or less than a right angle",
 "3M4b": "tell and write the time from an analogue clock; 24-hour clocks",
 "3M7": "measure the perimeter of simple 2–D shapes",
 "3M9a": "add and subtract amounts of money to give change, using both pounds (£) and pence (p) in practical contexts",
 "3M9c": "add and subtract mass (kg / g)",
 "3N2a": "compare and order numbers up to 1,000 read and write numbers to 1,000 in numerals and in words",
 "3N2b": "find 10 or 100 more or less than a given number",
 "3N3": "recognise the place value of each digit in a three-digit number (hundreds, tens, ones)",
 "3N6": "solve number problems and practical problems involving 3N1–3N4",
 "3S1": "interpret and present data using bar charts, pictograms and tables",
 "3S2": "solve one-step and two- step questions [e.g. ‘How many more?’ and ‘How many fewer?’] using information presented in scaled bar charts, pictograms and tables",
 "4C2": "add and subtract numbers with up to 4 digits using the formal written methods of columnar addition and subtraction where appropriate",
 "4C3": "estimate and use inverse operations to check answers to a calculation",
 "4C4": "solve addition and subtraction two-step problems in contexts, deciding which operations and methods to use and why",
 "4C6a": "recall multiplication and division facts for multiplication tables up to 12 × 12",
 "4C6b": "use place value, known and derived facts to multiply and divide mentally, including: multiplying by 0 and 1; dividing by 1; multiplying together three numbers",
 "4C7": "multiply two-digit and three-digit numbers by a one-digit number using formal written layout",
 "4C8": "solve problems involving multiplying and adding, including using the distributive law to multiply two- digit numbers by one digit, integer scaling problems and harder correspondence problems such as n objects are connected to m objects",
 "4F10a": "solve problems involving increasingly harder fractions to calculate quantities and fractions to divide quantities, including non-unit fractions where the answer is a whole number",
 "4F10b": "solve simple measure and money problems involving fractions and decimals to two decimal places",
 "4F8": "compare numbers with the same number of decimal places up to two decimal places",
 "4F9": "find the effect of dividing a one- or two-digit number by 10 and 100, identifying the value of the digits in the answer as ones, tenths and hundredths",
 "4G2c": "complete a simple symmetric figure with respect to a specific line of symmetry",
 "4M1": "compare different measures, including money in pounds and pence",
 "4M4a": "read, write and convert time between analogue and digital 12-hour clocks",
 "4M4b": "read, write and convert time between analogue and digital 24-hour clocks",
 "4M5": "convert between different units of measurement [e.g. kilometre to metre; hour to minute]",
 "4M7a": "measure and calculate the perimeter of a rectilinear figure (including squares) in centimetres and metres",
 "4M7b": "find the area of rectilinear shapes by counting squares",
 "4M9": "calculate different measures, including money in pounds and pence",
 "4N1": "count in multiples of 6, 7, 9, 25 and 1,000",
 "4N2b": "find 1,000 more or less than a given number",
 "4N3a": "recognise the place value of each digit in a four- digit number (thousands, hundreds, tens and ones)",
 "4N4a": "identify, represent and estimate numbers using different representations",
 "4N4b": "round any number to the nearest 10, 100 or 1,000",
 "4N5": "count backwards through zero to include negative numbers",
 "4P2": "describe movements between positions as translations of a given unit to the left / right and up / down",
 "4P3a": "describe positions on a 2-D grid as co-ordinates in the first quadrant",
 "5C1": "add and subtract numbers mentally with increasingly large numbers",
 "5C2": "add and subtract whole numbers with more than 4 digits, including using formal written methods (columnar addition and subtraction)",
 "5C4": "solve addition and subtraction multi-step problems in contexts, deciding which operations and methods to use and why",
 "5C5a": "identify multiples and factors, including finding all factor pairs of a number and common factors of two numbers",
 "5C5c": "establish whether a number up to 100 is prime and recall prime numbers up to 19",
 "5C5d": "recognise and use square numbers and cube numbers, and the notation for squared (2) and cubed (3)",
 "5C6a": "multiply and divide numbers mentally drawing upon known facts",
 "5C6b": "multiply and divide whole numbers and those involving decimals by 10, 100 and 1,000",
 "5C7b": "divide numbers up to 4 digits by a one-digit number using the formal written method of short division and interpret remainders appropriately for the context",
 "5C8a": "solve problems involving multiplication and division including using their knowledge of factors and multiples, squares and cubes",
 "5C8b": "solve problems involving addition, subtraction, multiplication and division and a combination of these, including understanding the meaning of the equals sign",
 "5C8c": "solve problems involving multiplication and division including scaling by simple fractions and problems involving simple rates",
 "5F10": "solve problems involving numbers up to three decimal places",
 "5F2a": "recognise mixed numbers and improper fractions and convert from one form to the other; write mathematical statements >1 as a mixed number [e.g. 25 + 45 = 65 = 1 15 ]",
 "5F2b": "identify name and write equivalent fractions of a given fraction, represented visually, including tenths and hundredths",
 "5F3": "compare and order fractions whose denominators are all multiples of the same number",
 "5F4": "add and subtract fractions with the same denominator and denominators that are multiples of the same number",
 "5F5": "multiply proper fractions and mixed numbers by whole numbers, supported by materials and diagrams",
 "5F6a": "read and write decimal numbers as fractions 71 [e.g. 0.71 = 100 ]",
 "5F6b": "recognise and use thousandths and relate them to tenths, hundredths and decimal equivalents",
 "5F8": "read, write, order and compare numbers with up to three decimal places",
 "5G4a": "know angles are measured in degrees: estimate and compare acute, obtuse and reflex angles",
 "5G4c": "draw given angles and measure them in degrees (o)",
 "5M4": "solve problems involving converting between units of time",
 "5M5": "convert between different units of metric measure [e.g. kilometre and metre; centimetre and metre; centimetre and millimetre; gram and kilogram; litre and millilitre]",
 "5M6": "understand and use approximate equivalences between metric units and common imperial units such as inches, pounds and pints",
 "5M9a": "use all four operations to solve problems involving measures [money] using decimal notation, including scaling",
 "5M9b": "use all four operations to solve problems involving measure [e.g. length] using decimal notation, including scaling",
 "5M9c": "use all four operations to solve problems involving measure [e.g. mass] using decimal notation, including scaling",
 "5N3a": "determine the value of each digit in numbers up to 1,000,000",
 "5N3b": "read Roman numerals to 1,000 (M) and recognise years written in Roman numerals",
 "5N4": "round any number up to 1,000,000 to the nearest 10, 100, 1,000, 10,000 and 100,000",
 "5N5": "interpret negative numbers in context, count forwards and backwards with positive and negative whole numbers, including through zero",
 "5P2": "identify, describe and represent the position of a shape following a reflection or translation, using the appropriate language, and know that the shape has not changed",
 "5S1": "complete, read and interpret information in tables, including timetables",
 "6A2": "use simple formulae",
 "6A3": "generate and describe linear number sequences",
 "6A4": "find pairs of numbers that satisfy an equation with two unknowns",
 "6A5": "enumerate possibilities of combinations of two variables",
 "6C5": "identify common factors, common multiples and prime numbers",
 "6C6": "perform mental calculations, including with mixed operations and large numbers",
 "6C7a": "multiply multi-digit numbers up to 4 digits by a two-digit whole number using the formal written method of long multiplication",
 "6C7b": "divide numbers up to 4 digits by a two- digit whole number using the formal written method of long division, and interpret remainders as whole number remainders, fractions, or by rounding, as appropriate for the context",
 "6C7c": "divide numbers up to 4 digits by a two- digit number using the formal written method of short division where appropriate, interpreting remainders according to the context",
 "6C8": "solve problems involving addition, subtraction, multiplication and division",
 "6C9": "use their knowledge of the order of operations to carry out calculations involving the four operations",
 "6F11": "recall and use equivalences between simple fractions, decimals and percentages, including in different contexts",
 "6F2": "use common factors to simplify fractions; use common multiples to express fractions in the same denomination",
 "6F3": "compare and order fractions, including fractions >1",
 "6F4": "add and subtract fractions with different denominators and mixed numbers, using the concept of equivalent fractions",
 "6F5a": "multiply simple pairs of proper fractions, writing the answer in its simplest form [e.g. 14 × 12 = 18 ]",
 "6F5b": "divide proper fractions by whole numbers [e.g. 13 ÷ 2 = 16 ]",
 "6F6": "associate a fraction with division to calculate decimal fraction equivalents (e.g. 0.375) for a simple fraction [e.g. 38 ]",
 "6F9a": "identify the value of each digit to three decimal places and multiply and divide numbers by 10, 100 and 1,000 giving answers up to three decimal places",
 "6F9b": "multiply one-digit numbers with up to two- decimal places by whole numbers",
 "6G2a": "compare and classify geometric shapes based on their properties and sizes",
 "6G2b": "describe simple 3-D shapes",
 "6G3b": "recognise and build simple 3-D shapes, including making nets",
 "6G4a": "find unknown angles in any triangles, quadrilaterals and regular polygons",
 "6G4b": "recognise angles where they meet at a point, are on a straight line, or are vertically opposite, and find missing angles",
 "6M5": "use, read, write and convert between standard units, converting measurements of length, mass, volume and time from a smaller unit of measure to a larger unit, and vice versa, using decimal notation of up to three decimal places",
 "6M8a": "calculate, estimate and compare volume of cubes and cuboids using standard units, including centimetre cubed (cm3) and cubic metres (m3), and extending to other units [e.g. mm3 and km3]",
 "6M9": "solve problems involving the calculation and conversion of units of measure, using decimal notation up to three decimal places where appropriate",
 "6N2": "read, write, order and compare numbers up to 10,000,000",
 "6N3": "determine the value of each digit in numbers up to 10,000,000",
 "6N4": "round any whole number to a required degree of accuracy",
 "6N5": "use negative numbers in context, and calculate intervals across zero",
 "6N6": "solve number problems and practical problems that involve 6N2–6N5",
 "6P2": "draw and translate simple shapes on the co-ordinate plane, and reflect them in the axes",
 "6P3": "describe positions on the full co-ordinate grid (all four quadrants)",
 "6R1": "solve problems involving the relative sizes of two quantities, where missing values can be found by using integer multiplication and division facts",
 "6R2": "solve problems involving the calculation of percentages [e.g. of measures such as 15% of 360] and the use of percentages for comparison",
 "6R4": "solve problems involving unequal sharing and grouping using knowledge of fractions and multiples",
 "6S1": "interpret and construct pie charts and line graphs and use these to solve problems",
 "6S3": "calculate and interpret the mean as an average"
};
