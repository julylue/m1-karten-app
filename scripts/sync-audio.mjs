// Holt die fertig vertonten Karten vom Google-Skript und legt sie unter audio/ ab.
// Das Skript liefert ohne Schlüssel nur bereits vorhandene Tonspuren (vertont nie neu).
// Dateinamen enthalten "elevenlabs.io" (Hinweispflicht von ElevenLabs im Gratisplan).
import fs from "node:fs";
import path from "node:path";

const API = "https://script.google.com/macros/s/AKfycbw-04Xxv1wm0WRo00enZupFwBUhhtYb7Qu0W8G8m9Qe7SOw9rvuKMKttNRyTRNr5zgu/exec";
const DIR = "audio";
const MAN = path.join(DIR, "manifest.json");

// Gleiche Prüfsumme wie in index.html (hashText), damit die App erkennt, ob die Datei zum aktuellen Kartentext passt.
const hashText = t => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(16); };
const fileOf = name => name.replace(/\.mp3$/, "") + "-elevenlabs.io.mp3";

fs.mkdirSync(DIR, { recursive: true });
const onDisk = new Set(fs.readdirSync(DIR).filter(f => f.endsWith(".mp3")));
const have = [...onDisk].map(f => f.replace(/-elevenlabs\.io\.mp3$/, ".mp3"));

const res = await fetch(API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ pub: "audio", have }) });
const data = await res.json();
if (!data.ok || !Array.isArray(data.files)) { console.error("Antwort ohne Dateien:", data.error || res.status); process.exit(1); }

const manifest = {};
let added = 0;
for (const f of data.files) {
  const file = fileOf(f.name);
  if (f.b64) { fs.writeFileSync(path.join(DIR, file), Buffer.from(f.b64, "base64")); onDisk.add(file); added++; }
  if (!onDisk.has(file)) continue;
  manifest[f.id + "-" + f.part] = { h: hashText(String(f.text)), f: file };
}
const used = new Set(Object.values(manifest).map(m => m.f));
let removed = 0;
for (const f of onDisk) if (!used.has(f)) { fs.unlinkSync(path.join(DIR, f)); removed++; }
const sorted = Object.fromEntries(Object.keys(manifest).sort().map(k => [k, manifest[k]]));
fs.writeFileSync(MAN, JSON.stringify(sorted, null, 1) + "\n");
console.log(`Tonspuren: ${Object.keys(sorted).length} im Verzeichnis, ${added} neu, ${removed} entfernt`);
