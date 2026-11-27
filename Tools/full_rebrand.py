"""Remove exteraGram branding from all user-visible resources and references."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "TMessagesProj/src/main/res"
JAVA = ROOT / "TMessagesProj/src/main/java"
MANIFESTS = [
    ROOT / "TMessagesProj/src/main/AndroidManifest.xml",
    ROOT / "TMessagesProj/config/debug/AndroidManifest.xml",
    ROOT / "TMessagesProj/config/release/AndroidManifest.xml",
]

changes = 0

# 1) All XML resources: replace visible words and handles.
for p in RES.rglob("*.xml"):
    text = p.read_text(encoding="utf-8")
    new = text
    new = re.sub(r"(?i)extera\s*gram", "BloomGram", new)
    new = new.replace("@exteraPlugins", "@bloomgrams")
    new = new.replace("@exteraOwner", "@vlodt")
    new = new.replace("Based on BloomGram (source code)", "Based on open-source Telegram client")
    new = new.replace("exteraAppName", "bloomAppName")
    if new != text:
        p.write_text(new, encoding="utf-8", newline="")
        changes += 1

# 2) Manifests and code references to the renamed app-name resource.
for p in MANIFESTS + list(JAVA.rglob("*.java")) + list(JAVA.rglob("*.kt")):
    text = p.read_text(encoding="utf-8")
    new = text.replace("exteraAppName", "bloomAppName")
    new = re.sub(r"(?i)extera\s*gram", "BloomGram", new)
    if new != text:
        p.write_text(new, encoding="utf-8", newline="")
        changes += 1

print("files changed:", changes)
