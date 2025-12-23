#!/usr/bin/env python3
import os, sys, json, re
import xml.etree.ElementTree as ET
from pathlib import Path

DEFAULT_INPUT = "downloads/kjv2006/kjvfull.xml"
OUT_DIR = Path("data/bible/KJV")

BOOK_MAP = {
  # OT
  "Gen":"genesis","Exod":"exodus","Lev":"leviticus","Num":"numbers","Deut":"deuteronomy",
  "Josh":"joshua","Judg":"judges","Ruth":"ruth","1Sam":"1samuel","2Sam":"2samuel",
  "1Kgs":"1kings","2Kgs":"2kings","1Chr":"1chronicles","2Chr":"2chronicles","Ezra":"ezra",
  "Neh":"nehemiah","Esth":"esther","Job":"job","Ps":"psalms","Prov":"proverbs",
  "Eccl":"ecclesiastes","Song":"songofsolomon","Isa":"isaiah","Jer":"jeremiah",
  "Lam":"lamentations","Ezek":"ezekiel","Dan":"daniel","Hos":"hosea","Joel":"joel",
  "Amos":"amos","Obad":"obadiah","Jonah":"jonah","Mic":"micah","Nah":"nahum",
  "Hab":"habakkuk","Zeph":"zephaniah","Hag":"haggai","Zech":"zechariah","Mal":"malachi",
  # NT
  "Matt":"matthew","Mark":"mark","Luke":"luke","John":"john","Acts":"acts","Rom":"romans",
  "1Cor":"1corinthians","2Cor":"2corinthians","Gal":"galatians","Eph":"ephesians",
  "Phil":"philippians","Col":"colossians","1Thess":"1thessalonians","2Thess":"2thessalonians",
  "1Tim":"1timothy","2Tim":"2timothy","Titus":"titus","Phlm":"philemon","Heb":"hebrews",
  "Jas":"james","1Pet":"1peter","2Pet":"2peter","1John":"1john","2John":"2john","3John":"3john",
  "Jude":"jude","Rev":"revelation",
}

WS_RE = re.compile(r"\s+")
SPACE_BEFORE_PUNCT_RE = re.compile(r"\s+([.,;:!?])")

def local_name(tag: str) -> str:
  return tag.split("}", 1)[1] if "}" in tag else tag

def parse_osis_id(osis_id: str):
  # "1Chr.1.1"
  if not osis_id:
    return None
  parts = osis_id.split(".")
  if len(parts) < 3:
    return None
  book = parts[0]
  try:
    ch = int(parts[1]); vs = int(parts[2])
  except:
    return None
  return book, ch, vs

def clean_text(s: str) -> str:
  s = (s or "").replace("\u00a0", " ")
  s = WS_RE.sub(" ", s)
  s = SPACE_BEFORE_PUNCT_RE.sub(r"\1", s)
  return s.strip()

def smart_append(buf: list, chunk: str):
  if not chunk:
    return
  if not buf:
    buf.append(chunk)
    return
  prev = buf[-1]
  # if we need a space between prev and chunk
  if prev and chunk:
    prev_last = prev[-1]
    next_first = chunk[0]
    if (
      prev_last.isalnum()
      and next_first.isalnum()
    ):
      buf.append(" ")
  buf.append(chunk)

def main():
  inp = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT
  if not os.path.exists(inp):
    print(f"❌ Input XML not found: {inp}")
    sys.exit(1)

  OUT_DIR.mkdir(parents=True, exist_ok=True)

  # data[slug][chapter][verse] = text
  data = {}

  current = None  # (slug, ch, v)
  buf = []

  def flush():
    nonlocal current, buf
    if not current:
      return
    slug, ch, v = current
    text = clean_text("".join(buf))
    data.setdefault(slug, {}).setdefault(ch, {})[v] = text
    current = None
    buf = []

  # Use iterparse so we can reliably capture tail text
  for event, el in ET.iterparse(inp, events=("start", "end")):
    tag = local_name(el.tag)

    if event == "start" and tag.lower() == "verse":
      sid = el.attrib.get("sID") or el.attrib.get("sid")
      if sid:
        flush()
        parsed = parse_osis_id(sid)
        if parsed:
          book_code, ch, v = parsed
          slug = BOOK_MAP.get(book_code)
          if slug:
            current = (slug, ch, v)
            buf = []
      continue

    if event == "end" and tag.lower() == "verse":
      eid = el.attrib.get("eID") or el.attrib.get("eid")
      if eid and current:
        flush()
      continue

    # While inside a verse, only collect readable word/insert nodes + their tails.
    if current and event == "end":
      lname = tag.lower()

      # strip notes entirely from output
      if lname == "note":
        el.clear()
        continue

      if lname in ("w", "divinename", "transchange"):
        if el.text:
          smart_append(buf, el.text)
        if el.tail:
          smart_append(buf, el.tail)

      # cleanup memory
      el.clear()

  flush()

  written = 0
  for slug, chapters in data.items():
    for ch, verses_map in chapters.items():
      out_book = OUT_DIR / slug
      out_book.mkdir(parents=True, exist_ok=True)

      verses = [{"v": int(vn), "t": verses_map[vn]} for vn in sorted(verses_map.keys())]

      out_path = out_book / f"{int(ch):02d}.json"
      out_path.write_text(
        json.dumps({"book": slug, "chapter": int(ch), "verses": verses}, ensure_ascii=False, indent=2),
        encoding="utf-8",
      )
      written += 1

  print(f"✅ Input: {inp}")
  print(f"✅ Wrote {written} chapters into {OUT_DIR}")
  print("✅ Example:", OUT_DIR / "john" / "01.json")

if __name__ == "__main__":
  main()
