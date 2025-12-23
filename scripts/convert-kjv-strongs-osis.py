#!/usr/bin/env python3
import os, re, json, sys
import xml.etree.ElementTree as ET
from collections import defaultdict

SEARCH_DIRS = ["downloads/kjv2006", "downloads/strongs_text", "downloads"]
IN_PATH = None
OUT_ROOT = "data/bible/KJV_STRONGS"

BOOK_MAP = {
  "Gen":"genesis","Exod":"exodus","Lev":"leviticus","Num":"numbers","Deut":"deuteronomy",
  "Josh":"joshua","Judg":"judges","Ruth":"ruth","1Sam":"1samuel","2Sam":"2samuel",
  "1Kgs":"1kings","2Kgs":"2kings","1Chr":"1chronicles","2Chr":"2chronicles","Ezra":"ezra",
  "Neh":"nehemiah","Esth":"esther","Job":"job","Ps":"psalms","Prov":"proverbs",
  "Eccl":"ecclesiastes","Song":"songofsolomon","Isa":"isaiah","Jer":"jeremiah",
  "Lam":"lamentations","Ezek":"ezekiel","Dan":"daniel","Hos":"hosea","Joel":"joel",
  "Amos":"amos","Obad":"obadiah","Jonah":"jonah","Mic":"micah","Nah":"nahum","Hab":"habakkuk",
  "Zeph":"zephaniah","Hag":"haggai","Zech":"zechariah","Mal":"malachi",
  "Matt":"matthew","Mark":"mark","Luke":"luke","John":"john","Acts":"acts","Rom":"romans",
  "1Cor":"1corinthians","2Cor":"2corinthians","Gal":"galatians","Eph":"ephesians",
  "Phil":"philippians","Col":"colossians","1Thess":"1thessalonians","2Thess":"2thessalonians",
  "1Tim":"1timothy","2Tim":"2timothy","Titus":"titus","Phlm":"philemon","Heb":"hebrews",
  "Jas":"james","1Pet":"1peter","2Pet":"2peter","1John":"1john","2John":"2john",
  "3John":"3john","Jude":"jude","Rev":"revelation",
}

OSIS_ID_RE = re.compile(r"^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$")
STRONG_RE = re.compile(r"strong:([HG])0*([0-9]+)", re.I)

def strip_ns(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag

def collapse_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()

def ensure_dir(p: str):
    os.makedirs(p, exist_ok=True)

def pad2(n: int) -> str:
    return str(n).zfill(2)

def norm_book(book_code: str) -> str | None:
    if book_code in BOOK_MAP: return BOOK_MAP[book_code]
    if book_code == "Psa": return "psalms"
    return None

def first_strong(lemma: str | None) -> str | None:
    if not lemma: return None
    m = STRONG_RE.search(lemma)
    if not m: return None
    return f"{m.group(1).upper()}{int(m.group(2))}"

def find_first_xml() -> str | None:
    for base in SEARCH_DIRS:
        if not os.path.isdir(base): continue
        for root, _, files in os.walk(base):
            for f in files:
                if f.lower().endswith(".xml") or f.lower().endswith(".osis"):
                    return os.path.join(root, f)
    return None

def main():
    global IN_PATH
    if len(sys.argv) > 1:
        IN_PATH = sys.argv[1]
    if not IN_PATH:
        IN_PATH = find_first_xml()
    if not IN_PATH or not os.path.isfile(IN_PATH):
        raise SystemExit("❌ Could not find OSIS XML. Pass a path explicitly.")

    print("✅ Using input:", IN_PATH)
    ensure_dir(OUT_ROOT)

    chapters = defaultdict(lambda: defaultdict(list))

    in_verse = False
    cur_book = None
    cur_ch = None
    cur_vs = None
    buf = []

    def start_verse(osis_id: str):
        nonlocal in_verse, cur_book, cur_ch, cur_vs, buf
        m = OSIS_ID_RE.match(osis_id)
        if not m: return
        book_slug = norm_book(m.group(1))
        if not book_slug: return
        in_verse = True
        cur_book = book_slug
        cur_ch = int(m.group(2))
        cur_vs = int(m.group(3))
        buf = []

    def end_verse():
        nonlocal in_verse, cur_book, cur_ch, cur_vs, buf
        if not (cur_book and cur_ch and cur_vs):
            in_verse = False
            cur_book = cur_ch = cur_vs = None
            buf = []
            return
        text = collapse_ws("".join(buf))
        chapters[cur_book][cur_ch].append({"v": cur_vs, "t": text})
        in_verse = False
        cur_book = cur_ch = cur_vs = None
        buf = []

    # Streaming parse
    ctx = ET.iterparse(IN_PATH, events=("start","end"))

    for ev, el in ctx:
        tag = strip_ns(el.tag)

        if ev == "start":
            if tag == "verse":
                sid = el.attrib.get("sID") or el.attrib.get("osisID")
                if sid:
                    start_verse(sid)

            # Collect text that appears as .text of formatting nodes while in verse
            if in_verse and el.text and tag not in ("w","verse"):
                buf.append(el.text)

        else:  # end
            if in_verse:
                if tag == "w":
                    # Some OSIS put word in el.text, some in el.tail. Take both.
                    word = el.text or ""
                    strong = first_strong(el.attrib.get("lemma"))
                    if word:
                        buf.append(f"{word}{{{strong}}}" if strong else word)
                    if el.tail:
                        buf.append(el.tail)

                else:
                    # Always collect tails (this captures milestone text between tags)
                    if el.tail:
                        buf.append(el.tail)

                if tag == "verse":
                    # End milestone
                    eid = el.attrib.get("eID")
                    if eid:
                        end_verse()

            el.clear()

    written = 0
    for book, chmap in chapters.items():
        book_dir = os.path.join(OUT_ROOT, book)
        ensure_dir(book_dir)
        for ch, verses in chmap.items():
            verses.sort(key=lambda x: x["v"])
            out = {"book": book, "chapter": ch, "verses": verses}
            out_file = os.path.join(book_dir, f"{pad2(ch)}.json")
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(out, f, ensure_ascii=False, indent=2)
            written += 1

    print(f"✅ Converted {written} chapter files into {OUT_ROOT}")

if __name__ == "__main__":
    main()
