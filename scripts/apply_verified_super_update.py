from pathlib import Path
import hashlib

index_path = Path("index.html")
raw = index_path.read_bytes()
blob_sha = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()

EXPECTED_ORIGINAL = "e6b06cfad89b0784cca1c5d36efbf5835a6ba826"
MARKER = "SUPER_UPDATE_2026_V1"

if blob_sha != EXPECTED_ORIGINAL:
    raise SystemExit(f"Refusing to patch unexpected index.html: {blob_sha}")

html = raw.decode("utf-8")
if MARKER in html:
    raise SystemExit("Super update is already present")

parts = Path("scripts/super_update_parts")
style = (parts / "style.html").read_text(encoding="utf-8")
script = "\n".join(
    (parts / f"script_{number}.html").read_text(encoding="utf-8")
    for number in range(1, 5)
)

required = [
    "#4dabf7", "#ff6b6b", "#fcc419",
    "optShowDept", "optShowPrayer", "optShowSuper",
    "optExcludeWeekends", "optHorizontalEvents",
    "optStudentExcludeWeekends", "optStudentHorizontalEvents",
    "min-height: 265mm", "@page { size: A4 portrait; margin: 8mm; }",
    "1112677469", "1459415616", "1697887995", "1487091944", "2041576858",
]
missing = [value for value in required if value not in html]
if missing:
    raise SystemExit(f"Original compatibility contract missing: {missing}")

html = html.replace(
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">',
    1,
)
html = html.replace("</head>", style + "\n</head>", 1)
html = html.replace("</body>", script + "\n</body>", 1)

if html.count(MARKER) != 1:
    raise SystemExit("Unexpected marker count after patch")
if '<script id="superUpdateScript">' not in html:
    raise SystemExit("Super update script was not inserted")
if '<style id="superUpdateStyles">' not in html:
    raise SystemExit("Super update styles were not inserted")

index_path.write_text(html, encoding="utf-8")
print("Verified super update applied to original index.html")
