# Baut trainer/ (Klausurtrainer als App) aus dem Klausurtrainer-Artifact.
# Aufruf: KT_KEY=<Hub-Schluessel> python3 -I scripts/build-trainer.py <artifact-index.html> [seed.json]
# Klausurtexte, Fundstellen und Themen liegen nur verschluesselt in trainer/data.enc (AES-256-GCM, PBKDF2-SHA-256).
# Schluessel = Hub-Schluessel (derselbe wie im Studien-Hub). Aendert sich der Hub-Schluessel, neu bauen.
import base64, json, os, re, sys, hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

KEY = os.environ["KT_KEY"]
src = open(sys.argv[1], encoding="utf-8").read()
seed = json.load(open(sys.argv[2], encoding="utf-8")) if len(sys.argv) > 2 else None
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "trainer")
os.makedirs(root, exist_ok=True)

def block(i):
    m = re.search(r'<script id="%s" type="application/json">(.*?)</script>' % i, src, re.S)
    return json.loads(m.group(1))

bundle = {"data": block("data"), "fund": block("fund"), "topics": block("topics"), "seed": seed}
k = [m.start() for m in re.finditer(r"<script>", src)][-1]
app = src[k + 8:src.index("</script>", k)]
head = src[:src.index('<script id="data"')]

def rep(old, new):
    global app
    assert app.count(old) == 1, old[:60]
    app = app.replace(old, new)

# Speichern: Hub statt Artifact-Datenbank
a = app.index("async function flush(){")
b = app.index("// ---------- Helfer ----------")
app = app[:a] + r'''const HUB_API = "https://script.google.com/macros/s/AKfycby527965MYC7xpuzDuMsJ867wvj5lUO3fpVItky-bHpHem6PknQ8ef4VaiV6KrKQ87t/exec";
const HUB_PATH = "klausurtrainer/progress";
const hubKey = () => { try { return localStorage.getItem("hub-key") || ""; } catch (e) { return ""; } };
async function hubCall(ops, data){
  const r = await fetch(HUB_API, {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body: JSON.stringify({k: hubKey(), ops, data})});
  const j = await r.json(); if (!j || !j.ok) throw new Error("hub"); return j;
}
let synced = false;
// Holt den Stand aus dem Hub, fuehrt pro Aussage nach dem juengeren Stand zusammen und schreibt zurueck.
async function flush(){
  if (saving || !hubKey()) return;
  saving = true; dirty = false;
  try {
    const j = await hubCall([], true);
    const remote = (j.data && j.data[HUB_PATH]) || null;
    if (remote) progress = merge(progress, remote);
    applyReset(); lsSave();
    await hubCall([{t:"set", path:HUB_PATH, value: progress}], false);
    setSync("Auf allen Geräten gespeichert");
    if (!synced){ synced = true; if (view.name==="home" || view.name==="chapter") render(); }
  } catch (e) { dirty = true; setSync("Offline, auf diesem Gerät gesichert"); }
  saving = false;
  if (dirty) saveTimer = setTimeout(flush, 8000);
}
document.addEventListener("visibilitychange", ()=>{ if (document.visibilityState==="hidden" && dirty) flush(); });
function setSync(t){ document.getElementById("sync").textContent = t; }

async function initStorage(){
  const local = lsLoad();
  if (local) progress = merge(progress, local);
  if (window.KT_SEED) progress = merge(window.KT_SEED, progress);
  applyReset(); if (!progress.exam) progress.exam = "2027-02-22"; lsSave();
  setSync(hubKey() ? "verbindet …" : "Nur auf diesem Gerät gespeichert");
  render();
  dirty = true; flush();
}

''' + app[b:]
rep("saveTimer = setTimeout(flush, 1500);\n}", "saveTimer = setTimeout(flush, 5000);\n}")
open(os.path.join(root, "app.js"), "w", encoding="utf-8").write(app)

# Verschluesseln
raw = json.dumps(bundle, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
salt, iv, it = os.urandom(16), os.urandom(12), 200000
key = hashlib.pbkdf2_hmac("sha256", KEY.encode(), salt, it, 32)
ct = AESGCM(key).encrypt(iv, raw, None)
b64 = lambda x: base64.b64encode(x).decode()
json.dump({"v": 1, "salt": b64(salt), "iv": b64(iv), "iter": it, "data": b64(ct)},
          open(os.path.join(root, "data.enc"), "w"))

# Seite: Kopf und Markup des Trainers, dazu Schluessel-Abfrage und Lader
head = head.replace("<title>M1 Klausurtrainer</title>", """<title>Klausurtrainer</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Klausurtrainer">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="robots" content="noindex">
<link rel="apple-touch-icon" href="icon-180.png">""", 1)
assert '<main id="app"></main>' in head
head = head.replace('<main id="app"></main>', '''<main id="app"><section id="lock" class="lockbox" hidden>
  <h2>Schlüssel eingeben</h2>
  <p class="muted">Füge deinen Hub-Schlüssel oder den ganzen Link ein. Danach merkt sich das Gerät ihn.</p>
  <input id="lockIn" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Schlüssel">
  <p id="lockErr" class="lockerr" hidden></p>
  <button id="lockGo" class="btn">Öffnen</button>
</section><p id="loadMsg" class="muted">lädt …</p></main>''', 1)
loader = r'''<style>
.lockbox{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:20px;margin-top:24px;display:grid;gap:12px}
.lockbox input{font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink)}
.lockerr{color:var(--bad);margin:0}
</style>
<script>
(function(){
"use strict";
const $ = id => document.getElementById(id);
const LS = { get(k){ try { return localStorage.getItem(k) || ""; } catch(e){ return ""; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} }, del(k){ try { localStorage.removeItem(k); } catch(e){} } };
if ("serviceWorker" in navigator) navigator.serviceWorker.register("../sw.js").catch(()=>{});
const u8 = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
async function open(key){
  const r = await fetch("data.enc", {cache:"no-cache"});
  if (!r.ok) throw new Error("net");
  const p = await r.json();
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), "PBKDF2", false, ["deriveKey"]);
  const k = await crypto.subtle.deriveKey({name:"PBKDF2", hash:"SHA-256", salt:u8(p.salt), iterations:p.iter}, base, {name:"AES-GCM", length:256}, false, ["decrypt"]);
  let plain;
  try { plain = await crypto.subtle.decrypt({name:"AES-GCM", iv:u8(p.iv)}, k, u8(p.data)); } catch(e){ throw new Error("key"); }
  return JSON.parse(new TextDecoder().decode(plain));
}
function start(b){
  for (const id of ["data","fund","topics"]){ const s = document.createElement("script"); s.type = "application/json"; s.id = id; s.textContent = JSON.stringify(b[id]); document.body.appendChild(s); }
  window.KT_SEED = b.seed || null;
  $("app").innerHTML = "";
  const s = document.createElement("script"); s.src = "app.js?v=__V__"; document.body.appendChild(s);
}
function ask(msg){
  $("loadMsg").hidden = true; $("lock").hidden = false; $("sync").textContent = "gesperrt";
  if (msg){ $("lockErr").textContent = msg; $("lockErr").hidden = false; }
}
async function tryKey(key, fromUser){
  $("loadMsg").hidden = false; $("lock").hidden = true;
  try {
    const b = await open(key);
    LS.set("kt-key", key); LS.set("hub-key", key);
    start(b);
  } catch(e){
    if (e.message === "key"){ LS.del("kt-key"); ask(fromUser ? "Der Schlüssel passt nicht." : "Der gespeicherte Schlüssel passt nicht mehr."); }
    else ask("Die Daten ließen sich nicht laden. Bist du offline? Beim ersten Öffnen braucht die App Netz.");
  }
}
function parse(v){ v = (v||"").trim(); const m = /[?&]k=([^&#\s]+)/.exec(v); return m ? decodeURIComponent(m[1]) : v; }
$("lockGo").onclick = () => { const v = parse($("lockIn").value); if (v) tryKey(v, true); };
$("lockIn").addEventListener("keydown", e => { if (e.key === "Enter") $("lockGo").click(); });
const k = new URLSearchParams(location.search).get("k") || LS.get("kt-key");
if (k) tryKey(k, false); else ask("");
})();
</script>
</body></html>
'''
ver = hashlib.sha256(app.encode() + ct[:64]).hexdigest()[:10]
open(os.path.join(root, "index.html"), "w", encoding="utf-8").write(head + loader.replace("__V__", ver))
print("ok", len(raw), "bytes klar,", len(ct), "verschluesselt, Version", ver)
