
(function(){
"use strict";
const DATA = JSON.parse(document.getElementById('data').textContent);
const CHAPTER_NAMES = {1:"Psychologie als Wissenschaft",2:"Forschungsmethoden der Psychologie",3:"Biologische und evolutionäre Grundlagen des Verhaltens",4:"Sensorische Prozesse und Wahrnehmung",5:"Gedanken, Bewusstsein und Bewusstseinsveränderungen",6:"Lernen",7:"Gedächtnis",8:"Kognitive Prozesse",9:"Entwicklung",10:"Emotionen und Motivationen",11:"Stress und Gesundheit",12:"Die menschliche Persönlichkeit",13:"Psychische Störungen",14:"Psychotherapie",15:"Sozialpsychologie"};
const THEMES = DATA.themes;
const themeOfCard = {};
for (const [ch,ths] of Object.entries(THEMES)) for (const t of ths) for (const r of t.refs) if(!themeOfCard[r]) themeOfCard[r]=t.name;
function topTerms(ch,n){ const out=[]; for (const t of (THEMES[ch]||[])) for (const x of t.terms){ if(out.length<n && !out.includes(x)) out.push(x); } return out; }
const LETTERS = "ABCDEFG";
const DAY = 864e5;
const FEST_DAYS = 21;       // Stabilität, ab der eine Aussage als gefestigt gilt
const PORTION = 20;

// ---------- Karten ----------
const items = DATA.items;
const itemById = {};
const cards = [];            // {id, item, k}
const cardsByCh = {};
const itemsByCh = {};
const alsoByCh = {};
for (const it of items){
  itemById[it.id] = it;
  it.course = it.course || 'psy';
  it.st.forEach((s,k)=>{
    const c = {id: it.id+"-"+k, item: it, k, sec: s.x, course: it.course};
    cards.push(c);
    (cardsByCh[s.x] = cardsByCh[s.x] || []).push(c);
    const L = (itemsByCh[s.x] = itemsByCh[s.x] || []);
    if (!L.includes(it)) L.push(it);
  });
}
const SECS = DATA.secs;
const secTitle = Object.fromEntries(SECS.map(x=>[x.k,x.t]));
const l2Title = Object.fromEntries(DATA.chapters.map(x=>[x.k,x.t]));
function secsOf(l2){ return SECS.filter(x=>x.k===l2 || x.k.startsWith(l2+'.')); }
const cardById = Object.fromEntries(cards.map(c=>[c.id,c]));
const cardsByItem = {};
for (const c of cards) (cardsByItem[c.item.id] = cardsByItem[c.item.id] || []).push(c);
const SEC_ORDER = Object.fromEntries(SECS.map((x,i)=>[x.k,i]));
// ---------- Klausuren & Fundstellen ----------
const EXAMS = [...new Map(items.map(it=>[it.ex,it.eo])).entries()].sort((a,b)=>a[1]-b[1]).map(x=>x[0]);
const OPENBOOK = new Set(items.filter(it=>it.id.startsWith('ob-')).map(it=>it.ex));
function exText(it){ return it.ex+' · Aufgabe '+it.nr; }
const FUND = (()=>{ try{ const f=JSON.parse(document.getElementById('fund').textContent); return {src:f.src||{}, c:f.c||{}, s:f.s||{}}; }catch(e){ return {src:{},c:{},s:{}}; } })();
const KIND = {g:'Gerrig', b:'Buch', v:'Vorlesung', f:'Folien', t:'Transkript', m:'Moodle-Book', o:'Material'};
function fundRows(list, withEx){
  return (list||[]).map(r=>{
    const S = FUND.src[r[0]] || {t:r[0], k:'o'};
    const name = S.u ? `<a href="${esc(S.u)}" target="_blank" rel="noopener">${esc(S.t)}</a>` : esc(S.t);
    return `<div class="fref"><span class="k">${esc(KIND[S.k]||'')}</span><span class="v">${name}${r[1]?' · '+esc(r[1]):''}</span>${withEx&&r[2]?`<span class="ex">„${esc(r[2])}“</span>`:''}</div>`;
  }).join('');
}
function fundCard(id){ const l=FUND.c[id]; return l&&l.length ? `<div class="fund"><div class="fh">Nachlesen</div>${fundRows(l,true)}</div>` : ''; }
function fundSec(k){ const l=FUND.s[k]; return l&&l.length ? `<div class="secfund fund"><div class="fh">Stoff zu ${esc(k)} nachlesen</div>${fundRows(l,false)}</div>` : ''; }
// ---------- Auswahl von Abschnitten ----------
let selMode = false;
function selArr(){ return Array.isArray(progress.sel) ? progress.sel : (progress.sel = []); }
function isSel(k){ return selArr().includes(k); }
function setSel(keys,on){ const S=new Set(selArr()); for (const k of keys){ if(on) S.add(k); else S.delete(k); } progress.sel=[...S]; scheduleSave(); }
function selKeys(course){ return selArr().filter(k=>COURSE_OF(k)===course && (cardsByCh[k]||[]).length).sort((a,b)=>(SEC_ORDER[a]??9e9)-(SEC_ORDER[b]??9e9) || a.localeCompare(b,'de',{numeric:true})); }
// ---------- Kurse ----------
const COURSE_NAMES = {psy:'Einführung in die Psychologie', fm:'Forschungsmethoden', kv:'Kulturelle Vielfalt'};
const COURSE_OF = k => k[0]==='F' ? 'fm' : k[0]==='K' ? 'kv' : 'psy';
const GROUPS = DATA.groups;
const secDesc = {}, groupTitle = {};
for (const c of ['fm','kv']) for (const g of GROUPS[c]){ groupTitle[g.k]=g.t; for (const r of g.rows) secDesc[r.k]=r; }
const CUR_KEY = "m1-klausurtrainer-kurs";
let cur = (()=>{ try{ const v=localStorage.getItem(CUR_KEY); return COURSE_NAMES[v]?v:'psy'; }catch(e){ return 'psy'; } })();
function setCur(c){ cur = c; tv.course = c; try{ localStorage.setItem(CUR_KEY,c); }catch(e){} }
const cardsOf = c => cards.filter(x=>x.course===c);
const itemsOf = c => items.filter(x=>x.course===c);

// ---------- Zustand ----------
// progress.c[id] = [S, D, due, last, reps, lapses, known(0/1)]
let progress = {v:1, c:{}, exam:"", sel:[]};
function st(id){ const a = progress.c[id]; return a ? {S:a[0],D:a[1],due:a[2],last:a[3],reps:a[4],lapses:a[5],known:!!a[6]} : null; }
function put(id,s){ progress.c[id] = [round(s.S,4), round(s.D,4), s.due, s.last, s.reps, s.lapses, s.known?1:0]; }
function round(x,n){ const f=10**n; return Math.round(x*f)/f; }
function status(id){ const s=st(id); if(!s||!s.known) return 'neu'; return s.S>=FEST_DAYS ? 'fest' : 'bek'; }

// ---------- FSRS-5 (Standardparameter) ----------
const W = [0.40255,1.18385,3.173,15.69105,7.1949,0.5345,1.4604,0.0046,1.54575,0.1192,1.01925,1.9395,0.11,0.29605,2.2698,0.2315,2.9898,0.51655,0.6621];
const DECAY=-0.5, FACTOR=19/81, RETENTION=0.9;
const clampD = d=>Math.min(10,Math.max(1,d));
const D0 = g=>clampD(W[4]-Math.exp(W[5]*(g-1))+1);
function retrievability(t,S){ return Math.pow(1+FACTOR*t/S, DECAY); }
function intervalDays(S){ return S/FACTOR*(Math.pow(RETENTION,1/DECAY)-1); }
// g: 1 = nicht gewusst / geraten, 3 = gewusst
function review(id, g, now){
  let s = st(id);
  if (!s){
    s = {S:W[g-1], D:D0(g), reps:1, lapses: g===1?1:0, last:now, due:now, known:false};
  } else {
    const t = Math.max(0,(now - s.last)/DAY);
    if (t < 1){
      s.S = s.S*Math.exp(W[17]*(g-3+W[18]));
    } else {
      const R = retrievability(t,s.S);
      if (g===1){
        const sf = W[11]*Math.pow(s.D,-W[12])*(Math.pow(s.S+1,W[13])-1)*Math.exp(W[14]*(1-R));
        s.S = Math.min(s.S, sf);
      } else {
        s.S = s.S*(Math.exp(W[8])*(11-s.D)*Math.pow(s.S,-W[9])*(Math.exp(W[10]*(1-R))-1)+1);
      }
    }
    const dD = -W[6]*(g-3);
    const d1 = s.D + dD*(10-s.D)/9;
    s.D = clampD(W[7]*D0(4) + (1-W[7])*d1);
    s.reps++; if (g===1) s.lapses++;
    s.last = now;
  }
  s.S = Math.max(0.1, s.S);
  if (g===3) s.known = true;
  let due;
  if (g===1) due = now + 0.5*DAY;
  else due = now + Math.max(1, Math.round(intervalDays(s.S)))*DAY;
  // Klausurtermin: kein Intervall über die Klausur hinaus
  if (progress.exam){
    const ex = new Date(progress.exam+"T08:00:00").getTime();
    if (!isNaN(ex) && now < ex - 2*DAY && due > ex - 2*DAY) due = Math.max(now+DAY, ex - 2*DAY);
  }
  s.due = due;
  put(id,s);
  scheduleSave();
}

// ---------- Speichern ----------
let dbRef = null, saving = false, dirty = false, saveTimer = null;
const LS_KEY = "m1-klausurtrainer-v1";
const RESET_AT=1792890425177, RESET_IDS=["ob-s20-6-2", "ob-s20-6-3", "ob-s20-13-2", "ob-s20-40-0", "ob-s22-7-3", "ob-s22-11-2", "ob-s22-37-1", "ob-s22-39-1", "ob-s22-40-1", "s23-33-4", "s23-35-3", "w2021-7-0", "w2021-9-1", "w2021-9-3", "w2021-14-0", "w2021-15-3", "w2021-33-0", "w2021-36-2", "ob-w2122-10-1", "ob-w2122-10-2", "ob-w2122-11-2", "ob-w2122-26-4", "ob-w2122-28-3", "ob-w2122-38-0", "w2223-7-2", "w2223-13-4", "w2223-16-3", "w2223-20-3", "w2223-39-0", "w2324-1-0", "w2324-2-0", "w2324-7-1", "w2324-7-3", "w2324-13-1", "w2324-14-1", "w2324-26-2", "w2324-28-1", "w2324-32-3", "w2324-33-2", "w2324-37-4", "w2425-11-1", "w2425-13-1", "w2425-18-1", "w2425-19-2", "w2526-18-3"];
function applyReset(){ for (const id of RESET_IDS){ const a=progress.c[id]; if (a && a[3]<RESET_AT) delete progress.c[id]; } }
function lsLoad(){ try{ const t = localStorage.getItem(LS_KEY); return t ? JSON.parse(t) : null; }catch(e){ return null; } }
function lsSave(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(progress)); }catch(e){} }
function merge(a,b){ // pro Karte den jüngeren Stand behalten
  const out = {v:1, c:{...(a&&a.c||{})}, exam:(b&&b.exam)||(a&&a.exam)||"", target:(b&&b.target)||(a&&a.target)||"", start:(b&&b.start)||(a&&a.start)||"", sel:(b&&Array.isArray(b.sel)&&b.sel.length?b.sel:(a&&a.sel)||[])};
  if (b&&b.c) for (const [id,arr] of Object.entries(b.c)){ const cur=out.c[id]; if(!cur || arr[3]>cur[3]) out.c[id]=arr; }
  return out;
}
function scheduleSave(){
  lsSave();
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 5000);
}
const HUB_API = "https://script.google.com/macros/s/AKfycby527965MYC7xpuzDuMsJ867wvj5lUO3fpVItky-bHpHem6PknQ8ef4VaiV6KrKQ87t/exec";
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

// ---------- Helfer ----------
const $app = document.getElementById('app');
function esc(s){ return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function counts(list){ let f=0,b=0; for (const c of list){ const x=status(c.id); if(x==='fest')f++; else if(x==='bek')b++; } return {f,b,n:list.length}; }
function bar(k){ if(!k.n) return '<div class="bar"></div>'; return `<div class="bar" aria-hidden="true"><i class="f" style="width:${k.f/k.n*100}%"></i><i class="b" style="width:${k.b/k.n*100}%"></i></div>`; }
function dueCards(now, course){ return cards.filter(c=>{ if (course && c.course!==course) return false; const s=st(c.id); return s && s.known && s.due<=now; }); }

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function fmtDue(ms){ const d=Math.ceil((ms-Date.now())/DAY); if(d<=0) return 'heute'; if(d===1) return 'morgen'; return 'in '+d+' Tagen'; }
function interleave(list){ // Kapitel mischen, nie zwei Aussagen derselben Aufgabe direkt hintereinander, wenn vermeidbar
  shuffle(list);
  for (let i=1;i<list.length;i++){
    if (list[i].item===list[i-1].item){
      const j = list.findIndex((c,x)=>x>i && c.item!==list[i-1].item);
      if (j>0) [list[i],list[j]]=[list[j],list[i]];
    }
  }
  return list;
}

// ---------- Ansichten ----------
let view = {name:'home'};
let session = null;

function render(){
  const nav=document.getElementById('nav'); nav.hidden = view.name==='quiz'||view.name==='end';
  const area = (view.name==='themen'||(view.name==='chapter'&&view.from==='themen')) ? 'themen' : (view.name==='klausuren'||view.name==='exam'||(view.name==='chapter'&&view.from==='klausuren')) ? 'klausuren' : 'home';
  nav.querySelectorAll('.navb').forEach(b=>b.setAttribute('aria-current', String(b.dataset.go===area)));
  if (view.name==='home') renderHome();
  else if (view.name==='themen') renderThemen();
  else if (view.name==='chapter') renderChapter(view.ch);
  else if (view.name==='quiz') renderQuiz();
  else if (view.name==='end') renderEnd();
  else if (view.name==='klausuren') renderKlausuren();
  else if (view.name==='exam') renderExam(view.ex);
  selBar();
  if (view.name==='exam' && view.jump){ const el=document.getElementById('it-'+view.jump); view.jump=null; if (el){ el.scrollIntoView({block:'start'}); return; } }
  window.scrollTo(0,0);
}

const TRAIN_NOTE = {
  psy:'Aufgaben 1 bis 20 jeder Klausur, gegliedert nach den Kapiteln des Gerrig.',
  fm:'Aufgaben 21 bis 30 jeder Klausur, gegliedert nach Themen. Dazu kommen die englischen Abstract-Aufgaben, die in manchen Klausuren im ersten Teil stehen.',
  kv:'Aufgaben 31 bis 40 jeder Klausur, gegliedert nach Themen. Grundlage ist das Moodle-Book; viele Szenarien kehren mit neuen Namen wieder.'
};
function courseSeg(){ return `<div class="seg" role="group" aria-label="Kurs">${Object.entries(COURSE_NAMES).map(([k,n])=>`<button class="segb" data-cur="${k}" aria-pressed="${cur===k}">${n}</button>`).join('')}</div><p class="muted" style="margin:0 0 18px;font-size:14px;max-width:65ch">${TRAIN_NOTE[cur]}</p>`; }
function subRow(k, t, cs, terms){
  if (selMode){
    const on = isSel(k);
    return `<label class="sub selrow${on?' on':''}"><span class="n"><input type="checkbox" class="ck" data-sel="${esc(k)}" ${on?'checked':''}>${esc(k)}</span><span class="t">${esc(t)}</span><span class="meta num">${cs.length} Auss.</span><span class="terms">${esc(terms)}</span>${bar(counts(cs))}</label>`;
  }
  return `<button class="sub" data-ch="${esc(k)}"><span class="n">${esc(k)}</span><span class="t">${esc(t)}</span><span class="meta num">${cs.length} Auss.</span><span class="terms">${esc(terms)}</span>${bar(counts(cs))}</button>`;
}
function grpCk(keys, label){
  const ks = keys.filter(k=>(cardsByCh[k]||[]).length);
  if (!selMode || !ks.length) return `<span class="n">${esc(label)}</span>`;
  const n = ks.filter(isSel).length;
  return `<span class="n ckn"><input type="checkbox" class="ck" data-grp="${esc(ks.join('|'))}" data-part="${n>0&&n<ks.length?1:0}" ${n===ks.length?'checked':''} aria-label="${esc(label)} komplett auswählen">${esc(label)}</span>`;
}
function selBar(){
  const el = document.getElementById('selbar');
  const keys = selKeys(cur);
  const show = view.name==='home' && (selMode || keys.length>0);
  el.hidden = !show; document.body.classList.toggle('hasbar', show);
  if (!show) return;
  if (!keys.length){ el.innerHTML = `<div class="in"><div class="sum muted">Noch nichts ausgewählt. Hake oben die Unterkapitel an, die in die Abfrage sollen.</div></div>`; return; }
  const cs = keys.flatMap(k=>cardsByCh[k]||[]);
  const neu = cs.filter(c=>status(c.id)==='neu').length;
  const now = Date.now(), due = cs.filter(c=>{ const s=st(c.id); return s&&s.known&&s.due<=now; }).length;
  el.innerHTML = `<div class="in"><div class="sum">Auswahl: <b>${keys.length}</b> ${keys.length===1?'Unterkapitel':'Unterkapitel'} · <b>${cs.length}</b> Aussagen · neu <b>${neu}</b> · fällig <b>${due}</b>${keys.length<=5?` <span class="muted">(${esc(keys.join(', '))})</span>`:''}</div>
  <div class="row">
    <button class="btn primary" data-sa="learn" ${neu?'':'disabled'}>Kennenlernen (${neu})</button>
    <button class="btn" data-sa="all">Alle ${cs.length} durchgehen</button>
    <button class="btn" data-sa="due" ${due?'':'disabled'}>Fällige festigen (${Math.min(due,PORTION)})</button>
    ${selMode?'':'<button class="linkbtn" data-sa="edit">Ändern</button>'}
    <button class="linkbtn" data-sa="clear">Leeren</button>
  </div></div>`;
  el.querySelectorAll('[data-sa]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.sa;
    if (a==='clear'){ setSel(selKeys(cur),false); renderKeep(); return; }
    if (a==='edit'){ selMode=true; renderKeep(); return; }
    startSelection(a);
  });
}
function renderKeep(){ const y=window.scrollY; renderHome(); selBar(); window.scrollTo(0,y); }
// ---------- Tempo ----------
const WEEK = 7*DAY;
function examMs(){ const e = progress.exam || '2027-02-22'; const t = new Date(e+'T08:00:00').getTime(); return isNaN(t)?null:t; }
function targetMs(){ if (progress.target){ const t=new Date(progress.target+'T23:59:00').getTime(); if(!isNaN(t)) return t; } const e=examMs(); return e? e-21*DAY : null; }
function startMs(){ const v = progress.start || '2026-10-12'; const t = new Date(v+'T00:00:00').getTime(); return isNaN(t) ? new Date('2026-10-12T00:00:00').getTime() : t; }
function fmtDate(ms){ return new Date(ms).toLocaleDateString('de-DE',{day:'numeric',month:'long'}); }
function paceBlock(k){
  const its = itemsOf(cur), n = its.length, now = Date.now();
  const known = its.filter(it=>(cardsByItem[it.id]||[]).every(c=>status(c.id)!=='neu')).length;
  const T = targetMs(), S = Math.min(startMs(), now);
  if (!n || !T) return bar(k);
  const frac = T>S ? Math.min(1, Math.max(0, (now-S)/(T-S))) : 1;
  const expected = Math.round(n*frac);
  const left = n-known;
  const days = Math.max(Math.ceil((T-now)/DAY), 1);
  const perDay = left>0 ? Math.ceil(left/days) : 0;
  const diff = known-expected;
  let stat;
  if (!left) stat = 'Alle Aufgaben dieses Kurses kennengelernt.';
  else if (now>=T) stat = `Zieltermin erreicht, noch <b class="num">${left}</b> Aufgaben offen.`;
  else if (Math.abs(diff) <= Math.max(3, n*0.01)) stat = 'Genau im Plan.';
  else if (diff>0) stat = `<b class="num">${diff}</b> Aussagen vor dem Plan.`;
  else stat = `<b class="num">${-diff}</b> Aussagen hinter dem Plan.`;
  const pace = left && now<T ? ` Bis ${fmtDate(T)} noch <b class="num">${left}</b> von ${n} Aufgaben kennenzulernen, das sind ab jetzt etwa <b class="num">${perDay}</b> pro Tag (${days} Tage).` : '';
  return `<div class="pace">
    <div class="pacebar" aria-label="Fortschritt ${known} von ${n}">${bar(k)}</div>
    <div class="pacetext">${!left ? 'Alle Aufgaben dieses Kurses kennengelernt.' : now>=T ? `Zieltermin erreicht, noch <b class="num">${left}</b> Aufgaben offen.` : pace.trim()}</div>
  </div>`;
}
function renderHome(){
  const now = Date.now();
  const ccards = cardsOf(cur);
  const due = dueCards(now, cur).length;
  const all = counts(ccards);
  const known = all.f+all.b;
  let next = null;
  for (const c of ccards){ const s=st(c.id); if(s&&s.known&&s.due>now&&(!next||s.due<next)) next=s.due; }
  let festText;
  if (!known) festText = `<p class="muted" style="margin:0">Hier landet alles, was du im Kennenlernen einmal richtig beantwortet hast. Wähle unten einen Abschnitt und starte dort.</p>`;
  else if (due) festText = `<p class="muted" style="margin:0">Aus allen ${cur==='psy'?'Kapiteln':'Themen'} dieses Kurses gemischt, fällig nach deinem Wiederholungsplan.</p>`;
  else festText = `<p class="muted" style="margin:0">Gerade ist nichts fällig. Die nächste Wiederholung steht ${next?fmtDue(next):'bald'} an.</p>`;

  let h = courseSeg() + `<section class="hero" aria-label="Festigen">
    <div class="label">Festigen · Spaced Repetition · ${esc(COURSE_NAMES[cur])}</div>
    <div class="hero-row">
      <div><div class="bigfig num">${due}</div><div class="muted" style="font-size:14px">Aussagen fällig</div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn primary" id="startReview" ${due?'':'disabled'}>${due>PORTION?'Portion starten ('+PORTION+')':'Wiederholung starten'}</button>
      </div>
    </div>
    ${festText}
    ${paceBlock(all)}
    <div class="overall">
      <span><i class="key k-fest"></i>gefestigt <b>${all.f}</b></span>
      <span><i class="key k-bek"></i>bekannt <b>${all.b}</b></span>
      <span><i class="key k-neu"></i>neu <b>${all.n-known}</b></span>
      <span class="muted">von <b>${all.n}</b> Aussagen aus ${itemsOf(cur).length} Aufgaben</span>
    </div>
  </section>
  <div class="selhead"><div class="label">Kennenlernen · nach Abschnitten</div><button class="linkbtn" id="selToggle">${selMode?'Auswahl fertig':'Mehrere Abschnitte auswählen'}</button></div>
  ${selMode?'<p class="muted" style="margin:0 0 12px;font-size:14px;max-width:65ch">Hake an, welche Unterkapitel in die Abfrage sollen. Ein Haken beim Kapitel oder Abschnitt nimmt alles darunter mit. Unten startest du die Abfrage nur über diese Auswahl.</p>':''}`;

  if (cur!=='psy'){
    for (const g of GROUPS[cur]){
      const gCards = g.rows.flatMap(r=>cardsByCh[r.k]||[]);
      const k = counts(gCards);
      h += `<section class="chap"><div class="chap-h">${grpCk(g.rows.map(r=>r.k), g.k)}<h2>${esc(g.t)}</h2><span class="sum num">${gCards.length? (k.f+k.b)+'/'+k.n : '–'}</span></div>`;
      const empty = [];
      for (const r of g.rows){
        const cs = cardsByCh[r.k]||[];
        if (!cs.length){ empty.push(r); continue; }
        h += subRow(r.k, r.t, cs, (r.terms&&r.terms.length)?r.terms.slice(0,6).join(' · '):r.d);
      }
      if (empty.length) h += `<div class="emptyline">Keine Aufgabe im Trainer: ${empty.map(x=>`<span>${x.k} ${esc(x.t)}</span>`).join(' · ')}</div>`;
      h += `</section>`;
    }
  }
  for (let n=1;n<=15 && cur==='psy';n++){
    const subs = DATA.chapters.filter(c=>c.k.split('.')[0]==n);
    const chCards = subs.flatMap(s=>secsOf(s.k).flatMap(x=>cardsByCh[x.k]||[]));
    const k = counts(chCards);
    h += `<section class="chap"><div class="chap-h">${grpCk(subs.flatMap(s=>secsOf(s.k).map(x=>x.k)), String(n))}<h2>${esc(CHAPTER_NAMES[n])}</h2><span class="sum num">${chCards.length? (k.f+k.b)+'/'+k.n : '–'}</span></div>`;
    for (const s of subs){
      const secs = secsOf(s.k);
      const l2cards = secs.flatMap(x=>cardsByCh[x.k]||[]);
      const kk2 = counts(l2cards);
      h += `<div class="l2">${grpCk(secs.map(x=>x.k), s.k)}<span class="t">${esc(s.t)}</span><span class="meta num">${l2cards.length? (kk2.f+kk2.b)+'/'+kk2.n : ''}</span></div>`;
      const empty = [];
      for (const x of secs){
        const cs = cardsByCh[x.k]||[];
        if (!cs.length){ empty.push(x); continue; }
        const its = itemsByCh[x.k]||[];
        h += subRow(x.k, x.t, cs, topTerms(x.k,5).join(' · '));
      }
      if (empty.length) h += `<div class="emptyline">In den Altklausuren nicht abgefragt: ${empty.map(x=>`<span>${x.k} ${esc(x.t)}</span>`).join(' · ')}</div>`;
    }
    h += `</section>`;
  }
  h += `<section class="method">
    <h3>Wie die beiden Bereiche arbeiten</h3>
    <p><strong>Kennenlernen</strong> geht einen Abschnitt Aussage für Aussage durch, mit sofortiger Rückmeldung. Was falsch war oder nur geraten, kommt am Ende der Runde noch einmal, bis jede Aussage einmal richtig beantwortet ist. Dann gilt sie als bekannt. Das entspricht Abrufübung mit Feedback und Lernen bis zum Kriterium (Karpicke &amp; Roediger).</p>
    <p><strong>Festigen</strong> sammelt alle bekannten Aussagen kapitelübergreifend und fragt sie gemischt ab, jeweils kurz bevor sie vermutlich vergessen wären. Die Abstände berechnet der Algorithmus FSRS (Version 5, Standardparameter, Ziel 90 % Erinnerungswahrscheinlichkeit). Das Mischen der Kapitel ist verschachteltes Üben (Interleaving). Gefestigt heißt: Die geschätzte Behaltensdauer liegt bei mindestens ${FEST_DAYS} Tagen.</p>
    <p><strong>Eigene Setzungen</strong>, keine Vorgaben der Forschung: „Nur geraten“ zählt als nicht gewusst, weil bei Richtig/Falsch jede zweite Antwort auch zufällig stimmt. Portionen haben ${PORTION} Aussagen. Mit Klausurtermin wird kein Wiederholungsabstand über die Klausur hinaus geplant; die letzte Runde liegt dann spätestens zwei Tage davor.</p>
    <p><strong>Nachlesen.</strong> Zu jeder Aussage steht, wo der Sachverhalt erklärt wird: Gerrig-Seite, Vorlesung (Folie oder Zeitstempel im Transkript), bei Forschungsmethoden Folien und Tutorials, bei kultureller Vielfalt das Moodle-Book mit Abschnitt und Seite. Die Links öffnen die Datei in deinem Drive. Die Zuordnung ist maschinell erstellt und per Zitatabgleich geprüft; wo nichts steht, behandelt keine der Unterlagen die Aussage direkt.</p>
    <p><strong>Drei Kurse, getrennt geführt.</strong> Jeder Kurs hat seine eigene Übersicht und seine eigene Wiederholung. Festigen mischt nur Aussagen aus dem gerade gewählten Kurs.</p>
    <p>Lösungen mit „offiziell“ stammen aus den Lösungsmarkierungen der Klausuren. „Erschlossen“ heißt: keine offizielle Lösung vorhanden, bestimmt per Gerrig und Vorlesungen (Psychologie), per FoM-Vorlesungen und Tutorials (Forschungsmethoden) bzw. per KuV-Kapiteln (kulturelle Vielfalt), wo möglich gestützt auf gleiche Aussagen aus Klausuren mit offizieller Lösung. Alle Aussagen folgen im Wortlaut eng dem Original. Wo die offizielle Lösung beide Antworten markiert, steht das in der Erklärung. Bei gelb markierten Aussagen bleiben nach der Prüfung beide Lesarten vertretbar. Aussagen, deren Lösung bei der Überarbeitung im Oktober 2026 korrigiert wurde, kommen im Kennenlernen neu dran.</p>
    <p><strong>Leiste und Tempo.</strong> Die Leiste zeigt, wie viele Aussagen du schon kennengelernt hast (gefestigt und bekannt). Darunter steht, wie viele Aufgaben du ab heute pro Tag kennenlernen musst (eine Aufgabe zählt, wenn alle ihre Aussagen einmal richtig beantwortet sind), um bis zum Zieltermin durch zu sein. Der Zieltermin liegt drei Wochen vor der Klausur, danach soll nur noch wiederholt werden; du kannst ihn unten ändern. Die Zahl wird bei jedem Öffnen neu berechnet: Lässt du Tage aus, steigt sie, arbeitest du vor, sinkt sie.</p>
    <div class="settings"><label for="examDate">Klausurtermin</label><input type="date" id="examDate" value="${esc(progress.exam||'2027-02-22')}"><span class="muted" id="examNote"></span></div>
    <div class="settings"><label for="targetDate">Neuer Stoff fertig bis</label><input type="date" id="targetDate" value="${esc(progress.target || (targetMs()?new Date(targetMs()).toISOString().slice(0,10):''))}"><span class="muted" id="targetNote">${progress.target?'':'drei Wochen vor der Klausur'}</span></div>

  </section>`;
  $app.innerHTML = h;
  document.getElementById('startReview').onclick = ()=>startReview();
  $app.querySelectorAll('.sub[data-ch]').forEach(b=>b.onclick=()=>{ view={name:'chapter',ch:b.dataset.ch}; render(); });
  document.getElementById('selToggle').onclick = ()=>{ selMode=!selMode; renderKeep(); };
  $app.querySelectorAll('[data-sel]').forEach(b=>b.onchange=()=>{ setSel([b.dataset.sel], b.checked); renderKeep(); });
  $app.querySelectorAll('[data-grp]').forEach(b=>{ if (b.dataset.part==='1') b.indeterminate=true; b.onchange=()=>{ setSel(b.dataset.grp.split('|'), b.checked); renderKeep(); }; });
  $app.querySelectorAll('[data-cur]').forEach(b=>b.onclick=()=>{ setCur(b.dataset.cur); renderHome(); selBar(); });
  const ed = document.getElementById('examDate');
  ed.onchange = ()=>{ progress.exam = ed.value||""; scheduleSave(); renderKeep(); };
  const td = document.getElementById('targetDate');
  td.onchange = ()=>{ progress.target = td.value||""; scheduleSave(); renderKeep(); };

}

function renderChapter(ch){
  const l2 = ch.split('.').slice(0,2).join('.');
  const its = itemsByCh[ch]||[];
  const cs = cardsByCh[ch]||[];
  const k = counts(cs);
  const open = cs.filter(c=>status(c.id)==='neu').length;
  const cc = COURSE_OF(ch);
  const hasThemes = (THEMES[ch]||[]).length>0;
  const tab = hasThemes ? (view.tab || 'themen') : 'fragen';
  const crumb = cc==='psy'
    ? `${ch} · ${l2!==ch?l2+' '+esc(l2Title[l2]):'Kapitel '+ch.split('.')[0]+' '+esc(CHAPTER_NAMES[ch.split('.')[0]])}`
    : `${esc(COURSE_NAMES[cc])} · ${esc(groupTitle[ch.split('.')[0]]||'')}`;
  let h = `<button class="linkbtn back" id="back">${view.from==='themen'?'← Klausurthemen':'← Übersicht'}</button>
  <div class="detail-h"><span class="n">${crumb}</span><h1>${esc(secTitle[ch])}</h1>${cc!=='psy'&&secDesc[ch]?`<p class="muted" style="margin:0;font-size:15px;max-width:65ch">${esc(secDesc[ch].d)} · kam in ${secDesc[ch].n} von 12 Klausuren vor</p>`:''}</div>
  ${fundSec(ch)}
  ${bar(k)}
  <div class="statgrid">
    <span><i class="key k-fest"></i>gefestigt <b class="num">${k.f}</b></span>
    <span><i class="key k-bek"></i>bekannt <b class="num">${k.b}</b></span>
    <span><i class="key k-neu"></i>neu <b class="num">${open}</b></span>
    <span class="muted">${k.n} ${k.n===1?'Aussage':'Aussagen'} aus ${its.length} ${its.length===1?'Aufgabe':'Aufgaben'}</span>
  </div>
  <div class="actions">
    ${open ? `<button class="btn primary" id="learn">${open<k.n?'Kennenlernen fortsetzen':'Kennenlernen starten'} (${open})</button>` : `<span class="muted" style="align-self:center">Alle Aussagen einmal richtig beantwortet.</span>`}
    <button class="btn" id="again">${open?'Alle '+k.n+' durchgehen':'Kapitel noch einmal durchgehen'}</button>
  </div>
  ${hasThemes ? `<div class="tabs" role="tablist">
    <button class="tab" role="tab" data-tab="themen" aria-selected="${tab==='themen'}">Prüfungsthemen</button>
    <button class="tab" role="tab" data-tab="fragen" aria-selected="${tab==='fragen'}">Alle Fragen</button>
  </div>` : `<h3 class="sec">Alle Fragen</h3>`}`;
  if (tab==='themen'){
    (THEMES[ch]||[]).forEach((t,ti)=>{
      const tk = counts(t.refs.map(r=>cardById[r]).filter(Boolean));
      h += `<div class="theme">
        <div class="theme-h"><h3>${esc(t.name)}</h3><span class="muted num" style="font-size:13px">${t.refs.length} ${t.refs.length===1?'Aussage':'Aussagen'}</span></div>
        <p class="focus">${esc(t.focus)}</p>
        <div class="chips">${t.terms.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">${bar(tk)}<button class="linkbtn" data-theme="${ti}">Nur dieses Thema üben</button></div>
      </div>`;
    });
  } else {
    const showSol = !!view.sol;
    h += `<label class="toggle"><input type="checkbox" id="sol" ${showSol?'checked':''}> Lösungen und Begründungen einblenden</label>`;
    for (const it of its){
      let q = `<div class="q"><div class="exref">${esc(exText(it))}</div><div class="qstem">${esc(it.stem)}</div>${showSol&&it.sf?'<div class="trap" style="margin:6px 0"><b>Achtung, Aufgabenstellung.</b> '+esc(it.sf)+'</div>':''}<ol>`;
      const others = new Set();
      it.st.forEach((x,i)=>{
        if (x.x!==ch){ others.add(x.x); return; }
        const id = it.id+'-'+i, stt = status(id);
        q += `<li><span class="l">${LETTERS[i]}</span><span>${esc(x.t)}<span class="sdot ${stt}" title="${stt==='fest'?'gefestigt':stt==='bek'?'bekannt':'neu'}"></span>`;
        if (showSol) q += `<span class="sol ${x.c?'t':'f'}"><b>${x.c?'Richtig.':'Falsch.'}</b> ${esc(x.w)}${x.f?'<span class="trap" style="display:block;margin-top:6px"><b>Achtung, Formulierung.</b> '+esc(x.f)+'</span>':''}${x.d?' <em>'+esc(x.d)+'</em>':''}${fundCard(id)}</span>`;
        q += `</span></li>`;
      });
      q += `</ol>`;
      if (others.size) q += `<div class="muted" style="font-size:13px">Weitere Aussagen dieser Aufgabe gehören zu ${[...others].sort().map(esc).join(', ')}.</div>`;
      h += q + `</div>`;
    }
  }
  $app.innerHTML = h;
  document.getElementById('back').onclick = ()=>{ view={name:view.from==='themen'?'themen':'home'}; render(); };
  const l = document.getElementById('learn'); if (l) l.onclick = ()=>startLearn(ch,false);
  document.getElementById('again').onclick = ()=>startLearn(ch,true);
  $app.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{ view.tab=b.dataset.tab; const y=window.scrollY; renderChapter(ch); window.scrollTo(0,y); });
  $app.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{ const t=THEMES[ch][+b.dataset.theme]; startLearn(ch,true,t.refs,t.name); });
  const sb = document.getElementById('sol'); if (sb) sb.onchange=()=>{ view.sol=sb.checked; const y=window.scrollY; renderChapter(ch); window.scrollTo(0,y); };
}

// ---------- Sitzungen ----------
function chapKey(sec){ return sec.split('.')[0]; }
// Aussagen nach Aufgaben bündeln. expand: alle Aussagen derselben Aufgabe aus demselben Kapitel dazunehmen
function groupCards(list, expand){
  const by = new Map();
  for (const c of list){
    if (!by.has(c.item.id)) by.set(c.item.id, new Set());
    by.get(c.item.id).add(c.id);
  }
  if (expand){
    for (const [iid, set] of by){
      const chs = new Set([...set].map(id=>chapKey(cardById[id].sec)));
      for (const c of (cardsByItem[iid]||[])) if (chs.has(chapKey(c.sec))) set.add(c.id);
    }
  }
  return [...by.values()].map(set=>[...set].sort((a,b)=>cardById[a].k-cardById[b].k));
}
function startSet(list, o){
  if (!list.length) return;
  let groups = groupCards(list, o.mode!=='review');
  if (o.mode==='review') shuffle(groups);
  const total = groups.reduce((n,g)=>n+g.length,0);
  session = {mode:o.mode, ch:o.ch||null, label:o.label||null, themeName:o.themeName, filter:o.filter||null, back:o.back||null, from:o.from,
    queue:groups, pos:0, total, done:new Set(), firstTry:{}, correctFirst:0, picks:{}, res:null, seen:new Set()};
  view = {name:'quiz'}; render();
}
function startLearn(ch, all, refs, themeName){
  const list = refs ? refs.map(r=>cardById[r]).filter(Boolean) : (cardsByCh[ch]||[]).filter(c=> all || status(c.id)==='neu');
  startSet(list, {mode: all?'redo':'learn', ch, themeName, from:view.from});
}
function startSelection(kind){
  const keys = selKeys(cur);
  if (!keys.length) return;
  if (kind==='due') return startReview(keys);
  const cs = keys.flatMap(k=>cardsByCh[k]||[]);
  const list = kind==='learn' ? cs.filter(c=>status(c.id)==='neu') : cs.slice();
  startSet(list, {mode: kind==='learn'?'learn':'redo', label:'Auswahl ('+keys.length+' Unterkapitel)', back:{name:'home'}});
}
function startItem(it, back){
  startSet((cardsByItem[it.id]||[]).slice(), {mode:'redo', label:exText(it), back});
}
function startReview(filterKeys){
  const now = Date.now();
  let list = dueCards(now, cur);
  if (filterKeys){ const F=new Set(filterKeys); list = list.filter(c=>F.has(c.sec)); }
  // die überfälligsten zuerst, bis etwa eine Portion Aussagen erreicht ist; ganze Aufgaben bleiben zusammen
  list.sort((a,b)=>st(a.id).due-st(b.id).due);
  const pick = [], items = new Set();
  for (const c of list){
    if (pick.length >= PORTION && !items.has(c.item.id)) continue;
    pick.push(c); items.add(c.item.id);
  }
  if (!pick.length) return;
  startSet(pick, {mode:'review', filter:filterKeys||null, label:filterKeys?'Auswahl':null, back:{name:'home'}});
}

function renderQuiz(){
  const s = session;
  if (s.pos >= s.queue.length){ view={name:'end'}; render(); return; }
  const g = s.queue[s.pos];
  const it = cardById[g[0]].item;
  const title = s.mode==='review' ? 'Festigen · '+(s.filter?'Auswahl':COURSE_NAMES[cur]) : (s.mode==='redo'?'Durchgehen':'Kennenlernen')+' · '+(s.label || (s.ch+(s.themeName?' · Thema':'')));
  const pct = s.done.size/s.total*100;
  const secs = [...new Set(g.map(id=>cardById[id].sec))];
  const again = g.some(id=>s.firstTry[id]!==undefined) && !s.res;
  let h = `<div class="qhead"><button class="linkbtn" id="quit">← Pause</button><div class="qprog" aria-label="Fortschritt"><i style="width:${pct}%"></i></div><span class="num muted">${s.done.size}/${s.total}</span></div>
  <div class="ctx">${esc(title)} · ${esc(exText(it))} · ${esc(it.topic)}${secs.length===1?' · '+esc(secs[0])+' '+esc(secTitle[secs[0]]||''):' · '+esc(secs.join(', '))}${again?' · Wiederholung':''}</div>
  <div class="stem">${esc(it.stem)}</div>
  ${g.length < it.st.length ? `<div class="muted" style="font-size:13px;margin:-6px 0 12px">${g.length} von ${it.st.length} Aussagen dieser Aufgabe; die übrigen gehören zu anderen Kapiteln oder sind schon erledigt.</div>` : ''}
  <div class="mlist">`;
  for (const id of g){
    const c = cardById[id], stt = it.st[c.k];
    const p = s.picks[id], r = s.res && s.res[id];
    h += `<div class="mrow${r?(r.ok&&!r.guess?' ok':' bad'):''}"><div class="mt"><span class="letter">${LETTERS[c.k]}</span><span>${esc(stt.t)}</span></div>`;
    if (!s.res){
      h += `<div class="rf"><button class="btn" data-pick="${id}" data-v="1" aria-pressed="${p===true}">Richtig</button><button class="btn" data-pick="${id}" data-v="0" aria-pressed="${p===false}">Falsch</button></div>`;
    } else {
      h += `<div class="mfb"><div class="v ${r.ok?'okc':'badc'}">${r.ok?'Stimmt.':'Nicht ganz.'} Die Aussage ist ${stt.c?'richtig':'falsch'}.</div>
        ${stt.f?`<div class="trap"><b>Achtung, Formulierung.</b> ${esc(stt.f)}</div>`:''}
        <div>${esc(stt.w)}</div>
        ${stt.d?`<div class="dispute"><b>Zweifel an der Lösung.</b> ${esc(stt.d.replace(/^Unsicher:\s*/,''))}</div>`:''}
        ${fundCard(id)}
        ${r.ok?(r.guess?'<div class="muted" style="font-size:13px">als geraten gewertet, kommt noch einmal</div>':`<div><button class="linkbtn" data-guess="${id}">Nur geraten</button></div>`):''}
      </div>`;
    }
    h += `</div>`;
  }
  h += `</div>`;
  const allPicked = g.every(id=>s.picks[id]!==undefined);
  if (!s.res){
    h += `<div class="fb-actions"><button class="btn primary" id="check" ${allPicked?'':'disabled'}>Prüfen</button>${allPicked?'':`<span class="muted" style="font-size:14px">noch ${g.filter(id=>s.picks[id]===undefined).length} offen</span>`}</div>`;
  } else {
    const nOk = g.filter(id=>s.res[id].ok && !s.res[id].guess).length;
    h += (it.sf?`<div class="trap" style="margin-top:14px"><b>Achtung, Aufgabenstellung.</b> ${esc(it.sf)}</div>`:'') + `<div class="chips" style="margin-top:14px"><span class="chip ex">${esc(exText(it))}</span>${it.src==='o'?'<span class="chip o">offizielle Lösung</span>':`<span class="chip">Lösung erschlossen · Sicherheit ${esc(it.conf)}</span>`}</div>
    <div class="fb-actions"><button class="btn primary" id="next">Weiter</button><span class="muted" style="font-size:14px">${nOk} von ${g.length} richtig${nOk<g.length?'; die übrigen kommen am Ende der Runde noch einmal':''}</span></div>`;
  }
  h += `<div class="hint"><kbd>Enter</kbd> ${s.res?'weiter':'prüfen'}</div>`;
  $app.innerHTML = h;
  document.getElementById('quit').onclick = quit;
  $app.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{ s.picks[b.dataset.pick] = b.dataset.v==='1'; const y=window.scrollY; renderQuiz(); window.scrollTo(0,y); });
  $app.querySelectorAll('[data-guess]').forEach(b=>b.onclick=()=>{ markGuess(b.dataset.guess); });
  const ch = document.getElementById('check'); if (ch) ch.onclick = checkGroup;
  const nx = document.getElementById('next'); if (nx){ nx.onclick = next; }
}
function checkGroup(){
  const s = session, g = s.queue[s.pos];
  if (!g.every(id=>s.picks[id]!==undefined)) return;
  s.res = {};
  const now = Date.now();
  for (const id of g){
    const c = cardById[id], ok = s.picks[id]===c.item.st[c.k].c;
    const r = {ok, guess:false, prev: progress.c[id] ? progress.c[id].slice() : null, firstNow:false};
    review(id, ok?3:1, now);
    if (s.firstTry[id]===undefined){ s.firstTry[id]=ok; r.firstNow=true; if(ok) s.correctFirst++; }
    if (ok) s.done.add(id);
    s.res[id] = r;
  }
  const y=window.scrollY; renderQuiz(); window.scrollTo(0,y);
}
function markGuess(id){
  const s = session, r = s.res && s.res[id];
  if (!r || !r.ok || r.guess) return;
  r.guess = true;
  if (r.prev) progress.c[id] = r.prev; else delete progress.c[id];
  review(id, 1, Date.now());
  if (r.firstNow){ s.firstTry[id]=false; s.correctFirst--; }
  s.done.delete(id);
  const y=window.scrollY; renderQuiz(); window.scrollTo(0,y);
}
function next(){
  const s = session, g = s.queue[s.pos];
  if (s.res){
    const redo = g.filter(id=>!s.res[id].ok || s.res[id].guess);
    if (redo.length) s.queue.push(redo);
  }
  s.pos++; s.picks = {}; s.res = null; renderQuiz(); window.scrollTo(0,0);
}
function backView(s){ return s.back ? {...s.back} : (s.mode==='review' ? {name:'home'} : {name:'chapter',ch:s.ch,from:s.from}); }
function quit(){ flush(); view = backView(session); session=null; render(); }

function renderEnd(){
  const s = session;
  const first = s.correctFirst, tot = s.total;
  const nItems = new Set(s.queue.flat().map(id=>cardById[id].item.id)).size;
  const nowDue = dueCards(Date.now(), cur).filter(c=>!s.filter || s.filter.includes(c.sec)).length;
  let h = `<div class="endcard">
    <div class="label">${s.mode==='review'?'Portion geschafft · '+esc(COURSE_NAMES[cur]):'Runde abgeschlossen'}</div>
    <h2>${s.mode==='review'?`${nItems} ${nItems===1?'Aufgabe':'Aufgaben'} wiederholt`:`${esc(s.themeName||s.label||s.ch)}: ${nItems} ${nItems===1?'Aufgabe':'Aufgaben'} durchgearbeitet`}</h2>
    <p style="margin:0">Beim ersten Versuch richtig: <b class="num">${first}</b> von <b class="num">${tot}</b> Aussagen.${s.mode!=='review'?' Die Aussagen sind jetzt im Bereich Festigen eingeplant; die erste Wiederholung kommt in ein bis drei Tagen.':''}</p>
    <div class="actions" style="margin:0">`;
  if (s.mode==='review' && nowDue) h += `<button class="btn primary" id="more">Noch eine Portion</button>`;
  if (s.mode!=='review' && s.ch) h += `<button class="btn primary" id="toCh">Zurück zu ${esc(s.ch)}</button>`;
  if (s.mode!=='review' && !s.ch && s.back && s.back.name==='exam') h += `<button class="btn primary" id="toEx">Zurück zu ${esc(s.back.ex)}</button>`;
  h += `<button class="btn" id="home">Übersicht</button></div></div>`;
  $app.innerHTML = h;
  flush();
  const m=document.getElementById('more'); if(m) m.onclick=()=>startReview(s.filter||undefined);
  const te=document.getElementById('toEx'); if(te) te.onclick=()=>{ view=backView(s); session=null; render(); };
  const t=document.getElementById('toCh'); if(t) t.onclick=()=>{ view={name:'chapter',ch:s.ch,tab:'themen',from:s.from}; session=null; render(); };
  document.getElementById('home').onclick=()=>{ view={name:'home'}; session=null; render(); };
}

document.addEventListener('keydown', e=>{
  if (view.name!=='quiz' || !session || e.target.tagName==='INPUT') return;
  if (e.key==='Enter'){ e.preventDefault(); if (session.res) next(); else checkGroup(); }
});

// ---------- Klausurthemen ----------
const TOPICS = JSON.parse(document.getElementById('topics').textContent);
const COURSES = [['psy','Einführung in die Psychologie'],['fm','Forschungsmethoden'],['kv','Kulturelle Vielfalt']];
const COURSE_NOTE = {
  psy:'Aufgaben 1 bis 20 jeder Klausur. Gegliedert bis zum Unterkapitel, auch zentrale Begriffe, die in zwölf Klausuren nie abgefragt wurden. Alle Begriffe stehen so in der Vorlesung oder, wenn die Vorlesung das Thema nicht behandelt, im Gerrig; steht in Klammern ein Gerrig-Begriff, heißt dasselbe im Buch anders.',
  fm:'Aufgaben 21 bis 30 jeder Klausur. Begriffe aus den FoM-Vorlesungen, Folien und Tutorials. Themen und teils sogar Antwortalternativen wiederholen sich fast wörtlich.',
  kv:'Aufgaben 31 bis 40 jeder Klausur. Titel und Begriffe aus dem Moodle-Book. Viele Szenarien kehren mit gewechselten Namen wieder.'
};
const tv = {course:'psy', q:'', min:0, sort:'kap', kap:'all', open:new Set()};
const tpct = n=>Math.round(n/12*100);
function topicSections(course){
  if (course==='psy') return TOPICS.psy.map(K=>({key:String(K.g), n:K.g, title:K.t, blocks:K.struktur.map(A=>({nr:A.nr, t:A.t, subs:A.subs.map(S=>({nr:S.nr, t:S.t, rows:K.rows.filter(r=>r.u===S.nr).map(r=>({...r, o:r.u}))}))}))}));
  const P = course==='fm' ? 'F' : 'K';
  return TOPICS[course].groups.map((g,i)=>({key:String(i), n:'', title:g.name, blocks:[{subs:[{rows:g.rows.map((r,ri)=>({...r, o:g.name, u:P+(i+1)+'.'+(ri+1)}))}]}]}));
}
function topicRow(r, flat){
  const id = tv.course+'|'+r.o+'|'+r.t, open = tv.open.has(id), p = tpct(r.n);
  const cs = cardsByCh[r.u]||[];
  let h = `<button class="trow${r.n?'':' zero'}${flat?' flat':''}" data-row="${esc(id)}" aria-expanded="${open}"><span class="t">${esc(r.t)}</span><span class="o">${flat?esc(tv.course==='psy'?r.o:''):''}</span><span class="fq" aria-hidden="true"><i style="width:${p}%"></i></span><span class="p">${p} %</span></button>`;
  if (open) h += `<div class="tdet${flat?' flat':''}"><p>${esc(r.d)}</p>${r.terms&&r.terms.length?`<div class="chips">${r.terms.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div>`:''}<p>${r.n?`Kam in ${r.n} von 12 Klausuren vor.`:'In zwölf Klausuren nicht abgefragt.'}</p>${cs.length?`<div><button class="linkbtn" data-train="${esc(r.u)}">${tv.course==='psy'?'Abschnitt '+esc(r.u):'Dieses Thema'} im Trainer üben (${cs.length} Aussagen)</button></div>`:''}</div>`;
  return h;
}
function topicList(){
  const q = tv.q.trim().toLowerCase(), filtering = !!q || tv.min>0;
  const match = (r,sec)=> (tv.min===1 ? r.n>=1 : tpct(r.n)>=tv.min) && (!q || (r.t+' '+r.d+' '+sec.title+' '+(r.u||'')).toLowerCase().includes(q));
  let secs = topicSections(tv.course);
  if (tv.course==='psy' && tv.kap!=='all') secs = secs.filter(s=>s.key===tv.kap);
  let total = 0, h = '';
  if (tv.sort==='haeufig'){
    const rows = secs.flatMap(s=>s.blocks.flatMap(b=>b.subs.flatMap(x=>x.rows.filter(r=>match(r,s)))));
    rows.sort((a,b)=>b.n-a.n || a.t.localeCompare(b.t,'de'));
    total = rows.length;
    h = rows.map(r=>topicRow(r,true)).join('');
  } else {
    for (const s of secs){
      let sh = '', sn = 0;
      for (const b of s.blocks){
        let bh = '', bn = 0;
        for (const x of b.subs){
          const rows = x.rows.filter(r=>match(r,s)).sort((a,b)=>b.n-a.n || a.t.localeCompare(b.t,'de'));
          if (!rows.length && (filtering || !x.nr)) continue;
          if (x.nr && x.nr!==b.nr) bh += `<div class="l3"><span class="n">${x.nr}</span><span>${esc(x.t)}</span></div>`;
          bh += rows.length ? rows.map(r=>topicRow(r,false)).join('') : `<div class="tnone">kein Begriff erfasst</div>`;
          bn += rows.length;
        }
        if (!bh) continue;
        if (b.nr) sh += `<div class="l2"><span class="n">${b.nr}</span><span class="t">${esc(b.t)}</span><span class="meta num">${bn} ${bn===1?'Begriff':'Begriffe'}</span></div>`;
        sh += bh; sn += bn;
      }
      if (!sn && (filtering || !sh)) continue;
      total += sn;
      h += `<section class="chap"><div class="chap-h"><span class="n">${s.n}</span><h2>${esc(s.title)}</h2><span class="sum num">${sn} ${sn===1?'Begriff':'Begriffe'}</span></div>${sh}</section>`;
    }
  }
  if (!total && !h) h = `<p class="muted">Kein Thema passt zu dieser Auswahl.</p>`;
  return {h, total};
}
function paintTopics(){
  const {h,total} = topicList();
  document.getElementById('tlist').innerHTML = h;
  document.getElementById('tcount').textContent = total+(total===1?' Begriff':' Begriffe')+' · Prozent = Anteil der zwölf Altklausuren, in denen der Begriff vorkam · Zeile antippen für Details';
}
function renderThemen(){
  let h = `<div class="seg" role="group" aria-label="Kurs">${COURSES.map(([k,n])=>`<button class="segb" data-course="${k}" aria-pressed="${tv.course===k}">${n}</button>`).join('')}</div>
  <p class="muted" style="margin:0 0 14px;font-size:14px;max-width:65ch">${COURSE_NOTE[tv.course]}</p>
  <div class="tfilter">
    <input class="wide" id="tq" type="search" placeholder="Begriff suchen, etwa Piaget, Skalenniveau, Ableismus" aria-label="Begriff suchen" value="${esc(tv.q)}">
    <select id="tkap" aria-label="Kapitel" ${tv.course==='psy'?'':'hidden'}><option value="all">alle Kapitel</option>${TOPICS.psy.map(K=>`<option value="${K.g}">Kapitel ${K.g} · ${esc(K.t)}</option>`).join('')}</select>
    <select id="tmin" aria-label="Häufigkeit"><option value="0">jede Häufigkeit</option><option value="1">mindestens einmal</option><option value="25">ab 25 % (3 von 12)</option><option value="50">ab 50 % (6 von 12)</option><option value="67">ab 67 % (8 von 12)</option><option value="83">ab 83 % (10 von 12)</option><option value="100">in allen zwölf</option></select>
    <select id="tsort" aria-label="Sortierung"><option value="kap">nach Gliederung</option><option value="haeufig">nach Häufigkeit</option></select>
  </div>
  <div class="tcount" id="tcount"></div>
  <div id="tlist"></div>
  <section class="method">
    <h3>Wie die Zahlen zu lesen sind</h3>
    <p>Ausgewertet sind zwölf Altklausuren von SoSe 2020 bis WiSe 2025/26. Die Prozentzahl ist ein Rückblick, keine Vorhersage: Sie sagt, wie regelmäßig ein Begriff bisher vorkam, nicht, dass er wieder drankommt.</p>
    <p>Die Zuordnung zu Kapiteln ist eine Einschätzung. Aufgaben mischen oft mehrere Kapitel; jeder Begriff steht nur einmal, dort, wo er am ehesten hingehört. Bei Kapitel 15 überschneidet sich der Stoff mit dem Kurs zur kulturellen Vielfalt, die Werte können dort etwas zu hoch liegen.</p>
    <p>Die Begriffe sind die Fachbegriffe aus den Unterlagen, die man kennen muss, um die Aufgaben zu beurteilen: zuerst aus der Vorlesung, sonst aus dem Buch bzw. dem Moodle-Book. Wortlaut, der nur in den Klausurszenarien steht, ist nicht aufgenommen. Die Aufgaben selbst stehen im Trainer.</p>
  </section>`;
  $app.innerHTML = h;
  const kap=document.getElementById('tkap'), min=document.getElementById('tmin'), sort=document.getElementById('tsort'), q=document.getElementById('tq');
  kap.value=tv.kap; min.value=String(tv.min); sort.value=tv.sort;
  kap.onchange=()=>{ tv.kap=kap.value; paintTopics(); };
  min.onchange=()=>{ tv.min=+min.value; paintTopics(); };
  sort.onchange=()=>{ tv.sort=sort.value; paintTopics(); };
  q.oninput=()=>{ tv.q=q.value; paintTopics(); };
  $app.querySelectorAll('[data-course]').forEach(b=>b.onclick=()=>{ setCur(b.dataset.course); const y=window.scrollY; renderThemen(); window.scrollTo(0,y); });
  document.getElementById('tlist').onclick = e=>{
    const t = e.target.closest('[data-train]');
    if (t){ setCur(COURSE_OF(t.dataset.train)); view={name:'chapter',ch:t.dataset.train,from:'themen'}; render(); return; }
    const r = e.target.closest('[data-row]');
    if (r){ const id=r.dataset.row; tv.open.has(id)?tv.open.delete(id):tv.open.add(id); paintTopics(); }
  };
  paintTopics();
}
// ---------- Klausuren ----------
const kz = {q:''};
function itemSecs(it){ return [...new Set(it.st.map(x=>x.x))].sort((a,b)=>(SEC_ORDER[a]??9e9)-(SEC_ORDER[b]??9e9)); }
function renderKlausuren(){
  let h = `<p class="muted" style="margin:0 0 14px;font-size:14px;max-width:65ch">Zwölf Altklausuren mit je 40 Aufgaben: 1 bis 20 Einführung in die Psychologie, 21 bis 30 Forschungsmethoden, 31 bis 40 Kulturelle Vielfalt. Klausur antippen, um ihre Aufgaben zu sehen.</p>
  <div class="exgrid">${EXAMS.map(ex=>{ const its=items.filter(i=>i.ex===ex); const k=counts(its.flatMap(i=>cardsByItem[i.id]||[])); return `<button class="excard" data-ex="${esc(ex)}"><span class="t">${esc(ex)}</span><span class="m">${its.length} Aufgaben${OPENBOOK.has(ex)?' · Open Book':''}</span>${bar(k)}</button>`; }).join('')}</div>
  <div class="label" style="margin-bottom:8px">Aufgabe finden</div>
  <div class="tfilter"><input class="wide" id="aq" type="search" placeholder="Wort aus Aufgabe oder Aussage, etwa Rorschach, Kohlberg, Ableismus" aria-label="Aufgabe suchen" value="${esc(kz.q)}"></div>
  <div id="ahits"></div>`;
  $app.innerHTML = h;
  $app.querySelectorAll('[data-ex]').forEach(b=>b.onclick=()=>{ view={name:'exam',ex:b.dataset.ex,open:new Set()}; render(); });
  const q=document.getElementById('aq'); q.oninput=()=>{ kz.q=q.value; paintHits(); };
  paintHits();
}
function paintHits(){
  const q = kz.q.trim().toLowerCase(), box=document.getElementById('ahits');
  if (q.length<3){ box.innerHTML = ''; return; }
  const hits = [];
  for (const it of items){
    const inStem = (it.topic+' '+it.stem).toLowerCase().includes(q);
    const sm = it.st.find(x=>x.t.toLowerCase().includes(q));
    if (inStem || sm) hits.push([it, sm]);
  }
  hits.sort((a,b)=>a[0].eo-b[0].eo || a[0].nr-b[0].nr);
  box.innerHTML = `<div class="tcount">${hits.length} ${hits.length===1?'Aufgabe':'Aufgaben'}</div>` + hits.slice(0,80).map(([it,sm])=>`<button class="hit" data-goex="${esc(it.ex)}" data-it="${esc(it.id)}"><span class="exref">${esc(exText(it))} · ${esc(itemSecs(it).join(', '))}</span><span class="tx"><b>${esc(it.topic)}</b>${sm?' · '+esc(sm.t):''}</span></button>`).join('') + (hits.length>80?'<p class="muted">Weitere Treffer: Suchwort genauer fassen.</p>':'');
  box.querySelectorAll('[data-goex]').forEach(b=>b.onclick=()=>{ view={name:'exam',ex:b.dataset.goex,open:new Set([b.dataset.it]),jump:b.dataset.it}; render(); });
}
function renderExam(ex){
  if (!view.open) view.open = new Set();
  const its = items.filter(i=>i.ex===ex).sort((a,b)=>a.nr-b.nr);
  const showSol = !!view.sol;
  let h = `<button class="linkbtn back" id="back">← Klausuren</button>
  <div class="detail-h"><span class="n">Altklausur${OPENBOOK.has(ex)?' · Open Book':''}</span><h1>${esc(ex)}</h1></div>
  <div class="statgrid"><span class="muted">${its.length} Aufgaben · Aufgabe antippen für Aussagen, Lösung und Fundstellen</span></div>
  <label class="toggle"><input type="checkbox" id="sol" ${showSol?'checked':''}> Lösungen, Begründungen und Fundstellen einblenden</label>`;
  for (const [c,name,rng] of [['psy','Einführung in die Psychologie','1 bis 20'],['fm','Forschungsmethoden','21 bis 30'],['kv','Kulturelle Vielfalt','31 bis 40']]){
    const g = its.filter(i=>i.course===c);
    if (!g.length) continue;
    h += `<section class="chap"><div class="chap-h"><span class="n">${rng}</span><h2>${esc(name)}</h2></div>`;
    for (const it of g){
      const open = view.open.has(it.id);
      const dots = (cardsByItem[it.id]||[]).map(cd=>`<span class="sdot ${status(cd.id)}"></span>`).join('');
      h += `<button class="arow" id="it-${esc(it.id)}" data-it="${esc(it.id)}" aria-expanded="${open}"><span class="nr">${it.nr}</span><span class="tp">${esc(it.topic)}</span><span class="sx">${esc(itemSecs(it).join(', '))}</span><span class="dots" aria-hidden="true">${dots}</span></button>`;
      if (open){
        let q = `<div class="adet"><div class="q"><div class="qstem">${esc(it.stem)}</div>${showSol&&it.sf?'<div class="trap" style="margin:6px 0"><b>Achtung, Aufgabenstellung.</b> '+esc(it.sf)+'</div>':''}<ol>`;
        it.st.forEach((x,i)=>{
          const id = it.id+'-'+i, stt = status(id);
          q += `<li><span class="l">${LETTERS[i]}</span><span>${esc(x.t)}<span class="sdot ${stt}"></span><span class="exref" style="display:block">${esc(x.x)} ${esc(secTitle[x.x]||'')}</span>`;
          if (showSol) q += `<span class="sol ${x.c?'t':'f'}"><b>${x.c?'Richtig.':'Falsch.'}</b> ${esc(x.w)}${x.f?'<span class="trap" style="display:block;margin-top:6px"><b>Achtung, Formulierung.</b> '+esc(x.f)+'</span>':''}${x.d?' <em>'+esc(x.d)+'</em>':''}${fundCard(id)}</span>`;
          q += `</span></li>`;
        });
        q += `</ol><div class="chips">${it.src==='o'?'<span class="chip o">offizielle Lösung</span>':`<span class="chip">Lösung erschlossen · Sicherheit ${esc(it.conf)}</span>`}</div><div><button class="btn" data-train="${esc(it.id)}">Diese Aufgabe üben</button></div></div></div>`;
        h += q;
      }
    }
    h += `</section>`;
  }
  $app.innerHTML = h;
  document.getElementById('back').onclick = ()=>{ view={name:'klausuren'}; render(); };
  const sb=document.getElementById('sol'); sb.onchange=()=>{ view.sol=sb.checked; const y=window.scrollY; renderExam(ex); window.scrollTo(0,y); };
  $app.querySelectorAll('.arow').forEach(b=>b.onclick=()=>{ const id=b.dataset.it; view.open.has(id)?view.open.delete(id):view.open.add(id); const y=window.scrollY; renderExam(ex); window.scrollTo(0,y); });
  $app.querySelectorAll('[data-train]').forEach(b=>b.onclick=()=>{ const it=itemById[b.dataset.train]; setCur(it.course); startItem(it, {name:'exam', ex, open:new Set(view.open), sol:view.sol, jump:it.id}); });
}
document.getElementById('nav').onclick = e=>{ const b=e.target.closest('[data-go]'); if(!b) return; view={name:b.dataset.go}; session=null; render(); };

tv.course = cur;
initStorage();
})();
