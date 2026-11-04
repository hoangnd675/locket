"""Embed the reviewed caption catalogue into the standalone proxy script."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
catalogue = json.loads((root / "content/captions.json").read_text())
assert len(catalogue) == 9
assert len(catalogue[0]["items"]) == 4
assert sum(len(group["items"]) for group in catalogue[1:]) == 90
start = "  // BEGIN GENERATED CAPTION CATALOGUE"
end = "  // END GENERATED CAPTION CATALOGUE"
target = root / "scripts/locket.js"
source = target.read_text()
before, rest = source.split(start, 1)
_, after = rest.split(end, 1)
embedded = json.dumps(catalogue, ensure_ascii=False, separators=(",", ":"))
target.write_text(before + start + "\n  var CAPTIONS = " + embedded + ";\n" + end + after)
print("Embedded 4 branded captions + 90 captions (94 total)")
