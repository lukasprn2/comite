#!/usr/bin/env python3
"""Usage : python patch_admin.py admin.html   ->  écrit admin.new.html (l'original n'est pas modifié).
Chaque remplacement vérifie que le morceau de code cherché existe bien : sinon le script s'arrête et dit lequel."""
import sys
src = sys.argv[1] if len(sys.argv) > 1 else 'admin.html'
s = open(src, encoding='utf-8', newline='').read()

def R(old, new, n=1):
    global s
    c = s.count(old)
    if c != n:
        sys.exit(f'ERREUR : {c} occurrence(s) au lieu de {n} pour :\n  {old[:90]}...')
    s = s.replace(old, new)

# --- imports, toast, tailles ---
R('setDoc, addDoc, deleteDoc, writeBatch } from', 'setDoc, addDoc, deleteDoc, writeBatch, getCountFromServer, query, where, orderBy, limit, startAfter } from')
R('clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 4200); };',
  'clearTimeout(toast.t); t.onclick = () => t.hidden = true; if (!err) toast.t = setTimeout(() => t.hidden = true, 4200); };')
R('const LIM = 900000;', 'const LIM = 900000, bytes = o => new Blob([JSON.stringify(o)]).size;')
R('JSON.stringify(s).length > LIM', 'bytes(s) > LIM')
R('JSON.stringify(feuilles).length > LIM', 'bytes(feuilles) > LIM')

# --- import non destructif : on écrit d'abord, on supprime ensuite ---
DEL = "for (let i = 0; i < old.length; i += 400) { const b = writeBatch(db); old.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); }"
R(DEL, '')
R("items.slice(i, i + 400).forEach(it => b.set(doc(collection(db, col)), it)); await b.commit(); }",
  "items.slice(i, i + 400).forEach(it => b.set(doc(collection(db, col)), it)); await b.commit(); }\n  " + DEL)

# --- brouillons (option A) ---
R("const today = new Date().toISOString().slice(0, 10);",
  "const today = new Date().toISOString().slice(0, 10);\nconst STAT = ['statut', 'Visibilité', 'select', [['publie', 'Publié sur le site'], ['brouillon', 'Brouillon (masqué)']]];")
R("f: [['h', 'La compétition'], ", "f: [['h', 'La compétition'], STAT, ")
R("['h','Le document'], ", "['h','Le document'], STAT, ", 3)
R("add: 'Ajouter une compétition', req: ['date', 'titre']", "add: 'Ajouter une compétition', req: ['date', 'type', 'titre']")
R("<strong>${esc(S.title(x))}</strong>", "<strong>${esc(S.title(x))}${x.statut === 'brouillon' ? ' <span class=\"pill propagande\">Brouillon</span>' : ''}</strong>")

# --- accueil : compteurs légers + recherche globale ---
R("const n = {}; for (const c of ['events', 'clubs', 'membres', 'classements', 'annuaire', 'archives', 'documentations']) n[c] = (await getDocs(collection(db, c))).docs.map(d => d.data());",
r'''const cn = async (c, ...w) => (await getCountFromServer(query(collection(db, c), ...w))).data().count;
  const K = ['events', 'clubs', 'classements', 'annuaire', 'archives', 'documentations'], n = {};
  (await Promise.all(K.map(c => cn(c)))).forEach((v, i) => n[K[i]] = { length: v });
  const [nm, na, ne, upN] = await Promise.all([cn('membres'), cn('membres', where('categorie', '==', 'arbitre')), cn('membres', where('categorie', '==', 'educateur')), cn('events', where('date', '>=', today))]);
  const upDocs = (await getDocs(query(collection(db, 'events'), where('date', '>=', today), orderBy('date'), limit(4)))).docs.map(d => d.data());''')
R("const people = k => n.membres.filter(m => catOf(m) === k).length;", "const people = k => k === 'arbitre' ? na : k === 'educateur' ? ne : nm - na - ne;")
R("const S = SCHEMA.events, up = n.events.filter(e => e.date >= today).sort(S.sort);", "const S = SCHEMA.events, up = { length: upN, slice: () => upDocs };")
R('<div class="tiles">${T(\'events\'',
  '<form id="gs" class="bar"><div class="srch">${ic(\'search\')}<input id="gq" type="search" placeholder="Recherche globale (Entrée pour lancer)…" aria-label="Recherche globale"></div><button class="btn b-bl">Chercher</button></form><div id="gr"></div><div class="tiles">${T(\'events\'')
R("$('#main').onclick = e => { const b = e.target.closest('[data-go]'); if (b) {",
r'''$('#gs').onsubmit = async e => { e.preventDefault(); const q = $('#gq').value.trim().toLowerCase(); if (q.length < 2) return; $('#gr').innerHTML = empty('Recherche…', 'search'); const out = []; cache.gs ||= {};
    for (const [k, S] of Object.entries(SCHEMA)) { try { const C = S.col || k, docs = cache.gs[C] ||= (await getDocs(collection(db, C))).docs.map(d => ({ ...d.data(), _id: d.id }));
      docs.filter(S.filter || (() => true)).filter(x => JSON.stringify(x).toLowerCase().includes(q)).forEach(x => out.push([k, S.title(x)])); } catch {} }
    $('#gr').innerHTML = (out.length ? out.slice(0, 60).map(([k, t]) => `<div class="row"><div class="m"><strong>${esc(t)}</strong><small>${esc(NAMES[k][1])}</small></div><div class="act"><button class="btn b-ln" data-go="${k}">Ouvrir</button></div></div>`).join('') : empty('Aucun résultat.')) + '<div style="height:1rem"></div>'; };
  $('#main').onclick = e => { const b = e.target.closest('[data-go]'); if (b) {''')
R("const m = $('#main'); m.innerHTML = empty('Chargement…', 'clip');", "const m = $('#main'); m.innerHTML = empty('Chargement…', 'clip'); delete cache.gs; dirty = false;")

# --- navigation : journal + garde-fou ---
R("corbeille: ['trash', 'Corbeille'],", "corbeille: ['trash', 'Corbeille'], journal: ['file', 'Journal'],")
R("['settings', 'import', 'corbeille']", "['settings', 'import', 'journal', 'corbeille']")
R("tab === 'corbeille' ? await viewTrash() : await viewList(tab)", "tab === 'corbeille' ? await viewTrash() : tab === 'journal' ? await viewJournal() : await viewList(tab)")
R("const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t;", "const b = e.target.closest('[data-t]'); if (b && !(dirty && !confirm('Quitter sans enregistrer ?'))) { tab = b.dataset.t;")
R("let cur;", "let cur, dirty = false; window.addEventListener('beforeunload', e => { if (dirty) e.preventDefault(); });")
R("$('#main').onclick = e => { const b = e.target.closest('button'); if (!b) return;", "$('#main').oninput = () => dirty = true; $('#main').onclick = e => { const b = e.target.closest('button'); if (!b) return;")

# --- listes : sélection, ↑↓, dupliquer, export, actions groupées ---
R("<div class=\"row ${x.date && x.date < today ? 'past' : ''}\">${S.left(x)}",
  "<div class=\"row ${x.date && x.date < today ? 'past' : ''}\"><input type=\"checkbox\" class=\"ck\" data-k=\"${x._id}\" aria-label=\"Sélectionner\" style=\"width:22px;min-height:22px;flex-shrink:0\">${S.left(x)}")
R("<div class=\"act\"><button class=\"btn b-ln\" data-e=\"${x._id}\">",
  "<div class=\"act\">${S.f.some(z => z[0] === 'ordre') ? `<button class=\"btn b-ln b-ic\" data-m=\"${x._id}\" data-dir=\"-1\" aria-label=\"Monter\" title=\"Monter\">↑</button><button class=\"btn b-ln b-ic\" data-m=\"${x._id}\" data-dir=\"1\" aria-label=\"Descendre\" title=\"Descendre\">↓</button>` : ''}<button class=\"btn b-ln b-ic\" data-c=\"${x._id}\" aria-label=\"Dupliquer\" title=\"Dupliquer\">${ic('plus', 16)}</button><button class=\"btn b-ln\" data-e=\"${x._id}\">")
R("<button class=\"btn b-or\" id=\"add\">${ic('plus')}${S.add}</button></div><div id=\"list\"></div>",
  "<button class=\"btn b-ln\" id=\"exj\">${ic('dl', 16)}JSON</button><button class=\"btn b-ln\" id=\"exc\">${ic('dl', 16)}CSV</button><button class=\"btn b-or\" id=\"add\">${ic('plus')}${S.add}</button></div><div class=\"bar\" id=\"bk\" hidden><b id=\"bkn\"></b><button class=\"btn b-ko\" id=\"bkd\">${ic('trash', 16)}Corbeille</button><select id=\"bkc\" aria-label=\"Changer de catégorie\"></select></div><div id=\"list\"></div>")
R("draw(); ['#q', '#mo', '#ty'].forEach(s => $(s) && ($(s).oninput = draw));",
r'''draw(); ['#q', '#mo', '#ty'].forEach(s => $(s) && ($(s).oninput = draw));
  const sel = () => [...document.querySelectorAll('.ck:checked')].map(c => c.dataset.k), cf = S.f.find(z => z[2] === 'select' && ['type', 'categorie'].includes(z[0]));
  $('#bkc').innerHTML = cf ? '<option value="">Changer la catégorie…</option>' + cf[3].map(([a, b]) => `<option value="${esc(a)}">${esc(b)}</option>`).join('') : ''; $('#bkc').hidden = !cf;
  $('#list').onchange = () => { const n = sel().length; $('#bk').hidden = !n; $('#bkn').textContent = n + ' sélectionné' + (n > 1 ? 's' : ''); };
  $('#bkd').onclick = async () => { const ids = sel(); if (!await ask('Mettre à la corbeille ?', ids.length + ' éléments pourront être restaurés pendant 30 jours.', 'Mettre à la corbeille')) return; try { for (const id of ids) await trash(C, id, cache[col].find(i => i._id === id)); toast('Placés dans la corbeille'); show(); } catch (er) { toast('Échec : ' + er.message, 1); } };
  $('#bkc').onchange = async e => { const v = e.target.value; if (!v) return; try { const b = writeBatch(db); sel().forEach(id => b.update(doc(db, C, id), { [cf[0]]: v })); await b.commit(); log('Catégorie groupée', C, v); toast('Catégorie modifiée'); show(); } catch (er) { toast('Échec : ' + er.message, 1); } };
  $('#exj').onclick = () => dl(C + '-' + today + '.json', JSON.stringify(cache[col].map(({ _id, ...r }) => r), null, 2), 'application/json');
  $('#exc').onclick = () => { const rows = cache[col].map(({ _id, feuilles, ...r }) => r), ks = [...new Set(rows.flatMap(Object.keys))], q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'; dl(C + '-' + today + '.csv', '\ufeff' + [ks.map(q).join(';'), ...rows.map(r => ks.map(k => q(r[k])).join(';'))].join('\r\n'), 'text/csv'); };''')
R("$('#main').onclick = async e => { const b = e.target.closest('[data-e],[data-d]'); if (!b) return; const id = b.dataset.e || b.dataset.d, x = cache[col].find(i => i._id === id);",
r'''$('#main').onclick = async e => { const b = e.target.closest('[data-e],[data-d],[data-c],[data-m]'); if (!b) return; const id = b.dataset.e || b.dataset.d || b.dataset.c || b.dataset.m, x = cache[col].find(i => i._id === id);
    if (b.dataset.c) { const { _id, ...c } = x; return edit(col, c); }
    if (b.dataset.m) { try { await move(col, C, x, +b.dataset.dir); show(); } catch (er) { toast('Échec : ' + er.message, 1); } return; }''')

# --- édition : modifications non enregistrées, validation, doublons, journal ---
R("$('#dlg').showModal(); $('#no').onclick = () => $('#dlg').close();",
r'''$('#dlg').showModal();
  const snap = () => JSON.stringify(read(S.f, f)), s0 = snap();
  const tryClose = async () => { if (snap() === s0 || await ask('Fermer sans enregistrer ?', 'Tes modifications seront perdues.', 'Fermer')) $('#dlg').close(); };
  $('#no').onclick = tryClose; $('#dlg').oncancel = e => { e.preventDefault(); tryClose(); };''')
R("const miss = S.req.find(k => !d[k]); if (miss) return toast('Complète le champ « ' + S.f.find(z => z[0] === miss)[1] + ' ».', 1);",
r'''const miss = S.req.find(k => !d[k]); if (miss) return toast('Complète le champ « ' + S.f.find(z => z[0] === miss)[1] + ' ».', 1);
    const RX = { email: [/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Email invalide.'], heure: [/^\d{1,2}h(\d{2})?/i, 'Heure au format 14h00.'], tel: [/^[\d\s.+()-]{6,}$/, 'Téléphone invalide.'] };
    for (const [k, [re, msg]] of Object.entries(RX)) if (d[k] && !re.test(d[k])) return toast(msg, 1);
    if (col === 'clubs' && d.num && !/^\d{4}$/.test(d.num)) return toast('Le n° de club doit avoir 4 chiffres.', 1);
    if ((col === 'events' || col === 'clubs') && cache[col].some(o => o._id !== x._id && (col === 'events' ? o.date === d.date && o.titre === d.titre : o.ville === d.ville && o.assoc === d.assoc)) && !await ask('Doublon possible', 'Un élément identique existe déjà.', 'Enregistrer quand même')) return;''')
R("$('#dlg').close(); toast('Enregistré — visible sur le site'); show();",
  "$('#dlg').close(); log(x._id ? 'Modification' : 'Création', C, d.titre || d.nom || d.ville || ''); toast('Enregistré — visible sur le site'); show();")

# --- messages : pagination par 50 ---
R("const l = (await getDocs(collection(db, 'messages'))).docs.map(d => ({ ...d.data(), _id: d.id })).sort((a, b) => (b.creeLe || 0) - (a.creeLe || 0));",
r'''let last, more = true; const l = [];
  const load = async () => { const qs = await getDocs(query(collection(db, 'messages'), orderBy('creeLe', 'desc'), ...(last ? [startAfter(last)] : []), limit(50))); qs.docs.forEach(d => l.push({ ...d.data(), _id: d.id })); last = qs.docs.at(-1); more = qs.size === 50; };
  await load();''')
R(": empty('Aucun message pour le moment.', 'mail'); };",
  ": empty('Aucun message pour le moment.', 'mail'); if (more) $('#list').insertAdjacentHTML('beforeend', '<div class=\"flex\" style=\"justify-content:center\"><button class=\"btn b-ln\" data-a=\"more\">Charger plus de messages</button></div>'); };")
R("const m = l.find(i => i._id === b.dataset.id), a = b.dataset.a;", "const m = l.find(i => i._id === b.dataset.id), a = b.dataset.a; if (a === 'more') { await load(); return draw(); }")
R("const b = e.target.closest('[data-a]'); if (!b) return; const m", "const b = e.target.closest('[data-a]'); if (!b) return; const m")

# --- badge, journal, export, réordonnancement ---
R("const n = (await getDocs(collection(db, 'messages'))).docs.filter(d => !d.data().lu).length;",
  "const n = (await getCountFromServer(query(collection(db, 'messages'), where('lu', '==', false)))).data().count;")
R("b.delete(doc(db, col, id)); await b.commit();", "b.delete(doc(db, col, id)); await b.commit(); log('Corbeille', col, KIND[col][1](data));")
R("const fdate = t =>",
r'''const log = (a, c, l) => addDoc(collection(db, 'journal'), { a, c, l: l || '', par: auth.currentUser?.email || '', le: Date.now() }).catch(() => {});
const dl = (name, text, mime) => { const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: mime })), download: name }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
async function move(col, C, x, dir) {
  const S = SCHEMA[col], g = cache[col].filter(i => S.group(i) === S.group(x)), i = g.indexOf(x), j = i + dir;
  if (j < 0 || j >= g.length) return;
  [g[i], g[j]] = [g[j], g[i]];
  const b = writeBatch(db); g.forEach((it, k) => b.update(doc(db, C, it._id), { ordre: k + 1 })); await b.commit(); log('Réordonnancement', C, x.titre || x.nom || '');
}
async function viewJournal() {
  const l = (await getDocs(query(collection(db, 'journal'), orderBy('le', 'desc'), limit(100)))).docs.map(d => d.data());
  $('#main').innerHTML = head('Journal', 'Les 100 dernières modifications : qui, quoi, quand.') + (l.length ? l.map(x => `<div class="row"><div class="m"><strong>${esc(x.a)} — ${esc(x.l)}</strong><small>${esc(KIND[x.c]?.[0] || x.c)} · ${esc(x.par)} · ${fdate(x.le)}</small></div></div>`).join('') : empty('Aucune modification enregistrée.', 'file'));
}
const fdate = t =>''')

open('admin.new.html', 'w', encoding='utf-8', newline='').write(s)
print('OK -> admin.new.html')
