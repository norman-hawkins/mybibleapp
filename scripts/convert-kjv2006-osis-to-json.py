#!/usr/bin/env python3
import os, sys, re, json
import xml.etree.ElementTree as ET

# Map OSIS book IDs to your slug folder names
OSIS_TO_SLUG = {
  "Gen":"genesis","Exod":"exodus","Lev":"leviticus","Num":"numbers","Deut":"deuteronomy",
  "Josh":"joshua","Judg":"judges","Ruth":"ruth","1Sam":"1samuel","2Sam":"2samuel",
  "1Kgs":"1kings","2Kgs":"2kings","1Chr":"1chronicles","2Chr":"2chronicles",
  "Ezra":"ezra","Neh":"nehemiah","Esth":"esther","Job":"job","Ps":"psalms",
  "Prov":"proverbs","Eccl":"ecclesiastes","Song":"songofsolomon",
  "Isa":"isaiah","Jer":"jeremiah","Lam":"lamentations","Ezek":"ezekiel","Dan":"daniel",
  "Hos":"hosea","Joel":"joel","Amos":"amos","Obad":"obadiah","Jonah":"jonah",
  "Mic":"micah","Nah":"nahum","Hab":"habakkuk","Zeph":"zephaniah",
  "Hag":"haggai","Zech":"zechariah","Mal":"malachi",
  "Matt":"matthew","Mark":"mark","Luke":"luke","John":"john","Acts":"acts","Rom":"romans",
  "1Cor":"1corinthians","2Cor":"2corinthians","Gal":"galatians","Eph":"ephesians",
  "Phil":"philippians","Col":"colossians","1Thess":"1thessalonians","2Thess":"2thessalonians",
  "1Tim":"1timothy","2Tim":"2timothy","Titus":"titus","Phlm":"philemon",
  "Heb":"hebrews","Jas":"james","1Pet":"1peter","2Pet":"2peter",
  "1John":"1john","2John":"2john","3John":"3john","Jude":"jude","Rev":"revelation",
}

NS = {
  "osis": "http://www.bibletechnologies.net/2003/OSIS/namespace",
}

def norm_spaces(s: str) -> str:
  s = re.sub(r"\s+", " ", s or "").strip()
  # remove spaces before punctuation
  s = re.sub(r"\s+([.,;:!?])", r"\1", s)
  return s

def element_text(e: ET.Element) -> str:
  # Grab all text recursively. OSIS often uses <hi>, <w>, etc.
  txt = "".join(e.itertext())
  return norm_spaces(txt)

def ensure_dir(p: str):
  os.makedirs(p, exist_ok=True)

def write_chapter(out_root: str, slug: str, chap_num: int, verses: dict):
  # verses: { int verseNum -> str text }
  chap_dir = os.path.join(out_root, slug)
  ensure_dir(chap_dir)
  num = f"{chap_num:02d}"
  out_path = os.path.join(chap_dir, f"{num}.json")
  data = {
    "book": slug,
    "chapter": chap_num,
    "verses": [{"v": vn, "t": verses[vn]} for vn in sorted(verses.keys())],
  }
  with open(out_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

def main():
  in_path = sys.argv[1] if len(sys.argv) > 1 else "downloads/kjv2006/kjv.osis.xml"
  out_root = sys.argv[2] if len(sys.argv) > 2 else "data/bible/KJV"

  if not os.path.exists(in_path):
    print(f"❌ Missing input: {in_path}")
    sys.exit(1)

  ensure_dir(out_root)

  # We stream parse to handle big XML
  current_book = None
  current_slug = None
  current_chap = None
  current_verses = {}

  # OSIS uses namespaced tags. We'll match by localname.
  def localname(tag: str) -> str:
    return tag.split("}", 1)[-1] if "}" in tag else tag

  # iterparse
  ctx = ET.iterparse(in_path, events=("start", "end"))

  for event, elem in ctx:
    name = localname(elem.tag)

    if event == "start":
      if name == "div":
        # book div has osisID
        osis_id = elem.attrib.get("osisID")
        if osis_id and osis_id in OSIS_TO_SLUG:
          current_book = osis_id
          current_slug = OSIS_TO_SLUG[osis_id]
      elif name == "chapter":
        # chapter has osisID like John.1
        osis_id = elem.attrib.get("osisID")
        if osis_id and current_slug and osis_id.startswith(current_book + "."):
          try:
            chap_num = int(osis_id.split(".")[1])
          except:
            chap_num = None
          # flush previous
          if current_chap is not None and current_slug:
            write_chapter(out_root, current_slug, current_chap, current_verses)
          current_chap = chap_num
          current_verses = {}

    if event == "end":
      if name == "verse":
        # verse osisID like John.1.1
        osis_id = elem.attrib.get("osisID")
        if osis_id and current_slug and current_chap is not None:
          parts = osis_id.split(".")
          if len(parts) >= 3:
            try:
              vnum = int(parts[2])
            except:
              vnum = None
            if vnum:
              txt = element_text(elem)
              # Some OSIS verse nodes may include the verse number or cruft; keep only meaningful text
              current_verses[vnum] = txt
        elem.clear()

      elif name == "chapter":
        elem.clear()

      elif name == "div":
        # end of book div — flush last chapter if any
        osis_id = elem.attrib.get("osisID")
        if osis_id and current_book == osis_id and current_slug and current_chap is not None:
          write_chapter(out_root, current_slug, current_chap, current_verses)
          current_chap = None
          current_verses = {}
          current_book = None
          current_slug = None
        elem.clear()

  print(f"✅ Converted OSIS → JSON into: {out_root}")

if __name__ == "__main__":
  main()

