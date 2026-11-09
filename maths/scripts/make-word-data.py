"""
Builds src/curriculum/word-data.ts: word puzzles whose answer is unique in a full English dictionary.

  python3 -m venv .venv && .venv/bin/pip install wordfreq english-words
  .venv/bin/python scripts/make-word-data.py > src/curriculum/word-data.ts

Kept only when:
  - hidden word: exactly ONE four-letter string that crosses the join of the two words is a dictionary word, and it is common
  - word that goes in front: prefix + each of three words is a common compound; each wrong prefix fails for at least one of them
  - letter bridge: exactly ONE letter makes a dictionary word when added to the end of A and to the start of B (both common)
The dictionary (web2, ~235k words) is much bigger than anything a child knows, so "unique" here is stricter than it needs to be.
"""
import json, random, sys
from wordfreq import zipf_frequency, top_n_list
from english_words import get_english_words_set

CASED = get_english_words_set(["web2"], lower=False)
DICT = {w.lower() for w in CASED}          # anything that could be a word, in any case: used to prove a string is NOT a word
PLAIN = {w for w in CASED if w.islower()}  # entries the dictionary lists in lower case: no proper names
# words that should never appear in a children's puzzle
BLOCK = set("""damn hell sex sexy drug drugs kill killed dead death die died gun guns war bomb blood beer wine drunk gay nude porn fat stupid hate
shot shoot knife crime fuck shit ass butt bum pee poo rape rapes sin sins devil demon ghost cancer drink drank pill pills cigar smoke rum gin ale
alan neil mary john paul peter james david linda susan helen alice emily sarah laura diego jane kate lucy emma anna anne ann tim jim tom ben sam dan ian ron roy ray rob bob bill joe max ken tony fred dave rick bust dope slave jail prison murder steal thief wet gross naked sexual abuse hit hits hurt pain""".split())
COMMON = [w for w in top_n_list("en", 20000) if w.isalpha() and w.islower() and w in PLAIN and w not in BLOCK]
zipf = lambda w: zipf_frequency(w, "en")
rng = random.Random(20261110)

# a child's vocabulary: frequent, short, in the dictionary, not a stray letter or abbreviation
KID = [w for w in COMMON if 3 <= len(w) <= 6 and zipf(w) >= 4.3 and not w.endswith("s") or (len(w) <= 4 and zipf(w) >= 4.6)]
KID = [w for w in KID if w in PLAIN and w not in BLOCK and len(w) >= 3]

def sample(xs, n):
    xs = list(xs); rng.shuffle(xs); return xs[:n]

# ------------------------------------------------------------------ hidden word
hidden = []
seen_hidden = set()
seen_words = set()
HARD = set("jordan anti ante semi tech dean onto inch else lose rear".split())
KID_HIDDEN = [w for w in KID if zipf(w) >= 4.7 and w not in HARD]
for a in sample(KID_HIDDEN, 3000):
    for b in sample(KID_HIDDEN, 400):
        if a == b or (a, b) in seen_hidden:
            continue
        s = a + b
        join = len(a)
        spans = [s[i:i + 4] for i in range(max(0, join - 3), min(join, len(s) - 4) + 1)]
        real = [x for x in spans if x in DICT]
        if len(real) != 1 or zipf(real[0]) < 4.4 or real[0] not in PLAIN or real[0] in BLOCK or real[0] in HARD or zipf(real[0]) > 6:
            continue
        # the hidden word must use letters from both words, and neither word may already contain a real 4-letter word that could distract
        word = real[0]
        if word in (a, b) or word in a or word in b or word in seen_words:
            continue
        # at least two letters must come from each of the two words, and no trivial plurals
        k = s.index(word, max(0, join - 3)) if word in s[max(0, join - 3):] else -1
        left = join - k
        if k < 0 or left < 2 or (len(word) - left) < 2 or (word.endswith("s") and word[:-1] in DICT):
            continue
        fakes = [x for x in spans if x not in DICT]
        # more wrong options: shuffles of the real word's letters, and swapping one letter, that are not words
        extras = []
        for _ in range(60):
            chars = list(word); i = rng.randrange(4); chars[i] = rng.choice("abcdefghijklmnoprstw")
            cand = "".join(chars)
            if cand not in DICT and cand not in fakes and cand not in extras: extras.append(cand)
        if len(fakes) + len(extras) < 4:
            continue
        hidden.append({"a": a, "b": b, "word": word, "others": (fakes + extras)[:4]})
        seen_hidden.add((a, b))
        seen_words.add(word)
        break
    if len(hidden) >= 70:
        break

# ------------------------------------------------------------------ the word that goes in front of three
# classic starters that make several everyday compounds; the dictionary and word frequencies then decide which compounds are real and common
STARTERS = """sun rain snow fire air sea sand back book door foot hand head home house key light moon news night play post star tooth water wind wood work
black blue green break cross day eye fish flower fly ground hair horse ice milk pan paper rail road rock room sail
sky stone storm table tree weather wheel white bird bed board boat bus cake car cat chair dog gold sheep silver
ship shoe spoon tea top tail town air ball bath bell bread butter candle cart cup finger fruit hot glass goal grass hill hole land leg mouth nut pen
pea pie pot ring sky soap sound spider swim tin toe tool tube wall web wing""".split()
PRE = [w for w in dict.fromkeys(STARTERS) if w in PLAIN and w not in BLOCK]
NOT_SUFFIX = set("red ted let row ring arm age ward led per ton ing made ways sized some able ish ness ful less ever self wise hood ship".split())
SUF = [w for w in COMMON if 3 <= len(w) <= 6 and zipf(w) >= 4.0 and w not in BLOCK and w not in NOT_SUFFIX]
compounds = {}
for p in PRE:
    ok = [s for s in SUF if s != p and (p + s) in PLAIN and (p + s) not in BLOCK and zipf(p + s) >= 2.9]
    if len(ok) >= 3:
        compounds[p] = ok
front = []
for p, ok in sample(compounds.items(), len(compounds)):
    for _ in range(2):
        trio = sample(ok, 3)
        if any(set(trio) == set(x["words"]) for x in front):
            continue
        wrong = []
        for d in sample(PRE, 400):
            if d == p or d in trio:
                continue
            if any((d + s) not in DICT for s in trio):
                wrong.append(d)
            if len(wrong) == 4:
                break
        if len(wrong) == 4:
            front.append({"answer": p, "words": trio, "others": wrong})
    if len(front) >= 80:
        break

# ------------------------------------------------------------------ letter bridge
by_stem = {}
for w in KID:
    if 3 <= len(w) <= 5:
        by_stem.setdefault(("end", w[:-1]), set()).add(w[-1])
        by_stem.setdefault(("start", w[1:]), set()).add(w[0])
bridge = []
ends = [(k[1], v) for k, v in by_stem.items() if k[0] == "end" and len(k[1]) >= 2]
starts = [(k[1], v) for k, v in by_stem.items() if k[0] == "start" and len(k[1]) >= 3]
rng.shuffle(ends); rng.shuffle(starts)
used = set()
for a, letters_a in ends:
    for b, letters_b in sample(starts, 400):
        both = letters_a & letters_b
        if len(both) != 1 or a == b or len(a) < 3 or len(b) < 4:
            continue
        c = next(iter(both))
        if zipf(a + c) < 4.9 or zipf(c + b) < 4.9:
            continue
        # nothing else in the full dictionary may work
        alt = [l for l in "abcdefghijklmnopqrstuvwxyz" if l != c and (a + l) in DICT and (l + b) in DICT]
        if alt or (a, b) in used:
            continue
        used.add((a, b))
        bridge.append({"a": a, "b": b, "letter": c})
        break
    if len(bridge) >= 70:
        break

print("/* Generated by scripts/make-word-data.py. Do not edit by hand. */")
print("export interface HiddenWord { a: string; b: string; word: string; others: string[] }")
print("export interface WordFront { answer: string; words: string[]; others: string[] }")
print("export interface LetterBridge { a: string; b: string; letter: string }")
print("export const HIDDEN_WORDS: HiddenWord[] = " + json.dumps(hidden, indent=1) + ";")
print("export const WORD_FRONTS: WordFront[] = " + json.dumps(front, indent=1) + ";")
print("export const LETTER_BRIDGES: LetterBridge[] = " + json.dumps(bridge, indent=1) + ";")
print(f"hidden={len(hidden)} front={len(front)} bridge={len(bridge)}", file=sys.stderr)
