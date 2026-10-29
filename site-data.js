// Charge les données Firestore et met à jour les pages. Si Firestore est vide/inaccessible,
// le contenu HTML d'origine reste affiché (aucun risque de page cassée).
import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nl = s => esc(s).replace(/\n/g, '<br>');
const list = async c => (await getDocs(collection(db, c))).docs.map(d => d.data());

function applySettings(s) {
  if (s.heroDesc && $('.hero-desc')) $('.hero-desc').textContent = s.heroDesc;
  $$('.stat-item').forEach((el, i) => {
    if (s[`stat${i + 1}v`]) { $('strong', el).textContent = s[`stat${i + 1}v`]; $('span', el).textContent = s[`stat${i + 1}l`] || ''; }
  });
  const c = $$('.contact-detail-text');
  if (c.length >= 4) {
    if (s.adresse) $('span', c[0]).innerHTML = nl(s.adresse);
    if (s.tel) { const a = $('a', c[1]); a.textContent = s.tel; a.href = 'tel:' + s.tel.replace(/\s/g, ''); }
    if (s.email) { const a = $('a', c[2]); a.textContent = s.email; a.href = 'mailto:' + s.email; }
    if (s.emailDev) { const a = $('a', c[3]); a.textContent = s.emailDev; a.href = 'mailto:' + s.emailDev; }
  }
  const pdf = $('.dl-btn');
  if (pdf && s.pdfUrl) { pdf.href = s.pdfUrl; if (s.pdfLabel) pdf.textContent = '⬇ ' + s.pdfLabel; }
  if (s.email) $$('.footer-bottom a').forEach(a => { a.textContent = s.email; a.href = 'mailto:' + s.email; });
}

const clubCard = c => `<div class="club-card" data-secteur="${esc(c.secteur)}" data-search="${esc([c.num, c.ville, c.assoc, c.president].join(' ').toLowerCase())}"><div class="club-card-header"><span class="club-num">${esc(c.num)}</span><div><h3>${esc(c.ville)}<span class="club-nom-assoc">${esc(c.assoc)}</span></h3></div></div><div class="club-card-body">${
  [['👤', c.prLabel || 'Président', c.president], ['📍', 'Adresse', c.adresse], ['📞', 'Téléphone', c.tel], ['✉️', 'Email', c.email, 1], ['🎯', 'Terrain', c.terrain]]
    .filter(r => r[2]).map(r => `<div class="club-info-row"><span class="club-info-icon">${r[0]}</span><div><span class="club-info-label">${r[1]}</span>${r[3] ? `<span class="club-email">${esc(r[2])}</span>` : esc(r[2])}</div></div>`).join('')
}</div></div>`;

function applyClubs(clubs) {
  const tabs = { centre: '🏙️ Secteur Centre', maritime: '⚓ Secteur Maritime', santerre: '🌾 Secteur Santerre' };
  clubs.sort((a, b) => (a.ville || '').localeCompare(b.ville || '', 'fr'));
  for (const s in tabs) {
    const l = clubs.filter(c => c.secteur === s);
    $(`#bloc-${s} .clubs-grid`).innerHTML = l.map(clubCard).join('');
    $(`.secteur-tab[data-secteur=${s}]`).textContent = `${tabs[s]} (${l.length})`;
  }
  $('.secteur-tab[data-secteur=all]').textContent = `Tous les clubs (${clubs.length})`;
  $('#clubs-count').textContent = `${clubs.length} clubs affichés`;
  const p = $('.page-header p'); if (p) p.textContent = `${clubs.length} clubs affiliés répartis en trois secteurs géographiques`;
}

const contact = m => `<div class="org-contact">${m.club ? `<div class="org-tel">${esc(m.club)}</div>` : ''}${m.tel ? `<div class="org-tel">${esc(m.tel)}</div>` : ''}${m.email ? `<div class="org-email">${esc(m.email)}</div>` : ''}${m.adresse ? `<div class="org-tel" style="font-size:0.66rem;color:rgba(255,255,255,0.3)">${esc(m.adresse)}</div>` : ''}</div>`;
const card = (m, cls) => `<div class="org-card ${cls}"><span class="org-role">${esc(m.role)}</span><div class="org-name">${esc(m.nom)}</div>${contact(m)}</div>`;

// Membres, arbitres et éducateurs : même collection « membres », séparés par « categorie »
// (valeur absente = comité directeur, pour ne rien casser des données existantes).
const cat = m => m.categorie || 'comite';

// Arbitres / éducateurs : organigramme en arbre. Chaque niveau / qualification (champ « role »)
// forme un étage, dans l'ordre des positions saisies dans l'admin (1er étage = en haut).
function fillPeople(sel, people) {
  const box = $(`${sel} .liste`);
  if (!box || !people.length) return;
  const groups = [];
  people.forEach(m => {
    const k = m.role || 'Autres';
    let g = groups.find(x => x.k === k);
    if (!g) groups.push(g = { k, l: [] });
    g.l.push(m);
  });
  const html = groups.map((g, i) => {
    if (i === 0 && g.l.length === 1) return card(g.l[0], 'president');
    const cls = i <= 1 ? 'vice' : 'admin';
    return `<div class="org-level">${g.l.map(m => `<div class="org-item">${card(m, cls)}</div>`).join('')}</div>`;
  });
  box.innerHTML = `<div class="org-tree">${html.join('<div class="org-connector"></div>')}</div>`;
}

function applyComite(all) {
  all.sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99));
  const ms = all.filter(m => cat(m) === 'comite');
  const g = k => ms.filter(m => m.groupe === k);
  if (ms.length) {
    const pres = g('president')[0];
    if (pres) $('.org-card.president').outerHTML = card(pres, 'president reveal visible');
    const levels = $$('#panel-comite .org-level');
    if (levels[0]) levels[0].innerHTML = g('vice').map(m => `<div class="org-item">${card(m, 'vice')}</div>`).join('');
    if (levels[1]) levels[1].innerHTML = g('admin').map(m => `<div class="org-item">${card(m, 'admin')}</div>`).join('');
    $('#panel-comite .membres-grid').innerHTML = g('membre').map(m => card(m, 'membre')).join('');
  }
  fillPeople('#panel-arbitres', all.filter(m => cat(m) === 'arbitre'));
  fillPeople('#panel-educateurs', all.filter(m => cat(m) === 'educateur'));
}

// Liens des compétitions : ajoutés automatiquement dans la fenêtre qui s'ouvre au clic sur un jour
function watchModal() {
  const box = $('#cal-modal-content'); if (!box) return;
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const safe = u => /^(https?:|mailto:)/i.test(u) ? u : '#';
  const fill = () => {
    const [d, m, y] = $('#cal-modal-date').textContent.trim().split(' ');
    const ds = `${y}-${String(MOIS.indexOf(m.toLowerCase()) + 1).padStart(2, '0')}-${d.padStart(2, '0')}`;
    $$('.cal-modal-event', box).forEach(el => {
      if ($('.cms-links', el)) return;
      const t = $('.cal-modal-event-title', el).textContent.trim();
      const e = window.CMS_CAL.EVENTS.find(x => x.date === ds && x.titre === t);
      const links = e ? [[e.lien, e.lienTexte], [e.lien2, e.lien2Texte]].filter(l => l[0]) : [];
      if (!links.length) return;
      el.insertAdjacentHTML('beforeend', `<div class="cms-links" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.7rem">${links.map(l => `<a href="${esc(safe(l[0]))}" target="_blank" rel="noopener" style="background:#c9a84c;color:#0a2342;font-weight:700;font-size:.8rem;text-decoration:none;padding:.5rem .9rem;border-radius:6px">🔗 ${esc(l[1] || 'Plus d\'infos')}</a>`).join('')}</div>`);
    });
  };
  new MutationObserver(fill).observe(box, { childList: true });
}

// Classements : habillage de l'ancienne page (barre de mise à jour, onglets, recherche, filtres, badges)
function applyClassements(list) {
  list.sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99));
  if (!list.length) return;
  let host = $('#cms-classements') || $('.page-content');
  if (!host) { $('footer')?.insertAdjacentHTML('beforebegin', '<div class="page-content" id="cms-classements"></div>'); host = $('#cms-classements'); }

  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const num = s => parseFloat(String(s ?? '').replace(/\s/g, '').replace(',', '.')) || 0;
  const badge = v => { const n = norm(v); return n === 'elite' ? 'badge-Elite' : n === 'honneur' ? 'badge-Honneur' : n === 'promotion' ? 'badge-Promotion' : 'badge-Non-Class'; };

  const css = `<style>.cms-rk{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;font:700 .85rem 'DM Sans',sans-serif}.cms-rk.r1{background:#c9a84c;color:#0a2342}.cms-rk.r2{background:#c9ced6;color:#333}.cms-rk.r3{background:#c8855a;color:#fff}</style>`;
  const maj = list.filter(c => c.majLe).map(c => `<strong>${esc(c.nom)}</strong> — ${esc(String(c.majLe).replace(/^mis à jour( le)?\s*/i, ''))}`).join(' &nbsp;|&nbsp; ');

  host.innerHTML = css
    + (maj ? `<div class="maj-bar"><p>Dernières mises à jour : ${maj}</p></div>` : '')
    + `<div class="cat-tabs">${list.map((c, i) => `<button class="cat-tab ${i ? '' : 'active'}" data-k="${i}">${esc(c.nom)}</button>`).join('')}</div>`
    + `<div class="controls"><div class="search-wrap"><input type="search" id="cms-q" placeholder="Rechercher un joueur, un club…" aria-label="Rechercher"></div><select class="filter-select" id="cms-fc" aria-label="Classification"></select><select class="filter-select" id="cms-fs" aria-label="Sexe"></select></div>`
    + `<p class="result-count" id="cms-n"></p><div class="table-wrap" id="cms-tb"></div>`;

  const qEl = $('#cms-q', host), fc = $('#cms-fc', host), fs = $('#cms-fs', host);
  let cur = 0, ix = {};

  function setup() {
    const c = list[cur], cols = (c.colonnes || []).map(norm), find = f => cols.findIndex(f);
    ix = {
      rang: find(h => ['rang', '#', 'place', 'rg', 'n°'].includes(h)),
      nom: find(h => h === 'nom' || h === 'joueur'),
      prenom: find(h => h === 'prenom'),
      club: find(h => h === 'club'),
      classif: find(h => h.startsWith('classif')),
      sexe: find(h => h === 'sexe' || h === 'genre'),
      pts: find(h => h.includes('point'))
    };
    const fill = (sel, idx, label) => {
      const vals = idx < 0 ? [] : [...new Set((c.lignes || []).map(r => String(r.v[idx] ?? '').trim()).filter(Boolean))];
      sel.innerHTML = `<option value="">${label}</option>` + vals.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
      sel.style.display = vals.length ? '' : 'none';
    };
    fill(fc, ix.classif, 'Toutes les classifications');
    fill(fs, ix.sexe, 'Tous (H/F)');
    qEl.value = '';
  }

  function render() {
    const c = list[cur], cols = c.colonnes || [];
    const skip = new Set([ix.rang]); if (ix.nom >= 0 && ix.prenom >= 0) skip.add(ix.prenom);
    const main = ix.nom >= 0 ? ix.nom : cols.findIndex((_, i) => !skip.has(i) && i !== ix.pts);
    const show = cols.map((_, i) => i).filter(i => !skip.has(i));
    const merged = ix.nom >= 0 && ix.prenom >= 0;
    const q = norm(qEl.value), vc = fc.value, vs = fs.value;

    const rows = (c.lignes || []).map((r, i) => ({ v: r.v, rank: ix.rang >= 0 ? (r.v[ix.rang] || i + 1) : i + 1 }))
      .filter(r => (!q || norm(r.v.join(' ')).includes(q)) && (!vc || ix.classif < 0 || String(r.v[ix.classif] ?? '').trim() === vc) && (!vs || ix.sexe < 0 || String(r.v[ix.sexe] ?? '').trim() === vs));

    $('#cms-n', host).textContent = rows.length + (ix.nom >= 0 ? ' joueur' : ' résultat') + (rows.length > 1 ? 's' : '') + (ix.nom >= 0 ? (rows.length > 1 ? ' affichés' : ' affiché') : '');
    if (!rows.length) { $('#cms-tb', host).innerHTML = '<div class="no-result">Aucun résultat pour cette recherche.</div>'; return; }

    const maxPts = Math.max(...(c.lignes || []).map(r => num(r.v[ix.pts])), 1);
    const th = show.map(i => `<th class="${i === main || i === ix.pts ? '' : 'hide-sm'} ${i === ix.pts ? 'right' : ''}">${esc(i === main && merged ? 'Joueur' : cols[i])}</th>`).join('');
    const body = rows.map(r => {
      const n = parseInt(r.rank, 10);
      const rk = n >= 1 && n <= 3 ? `<span class="cms-rk r${n}">${n}</span>` : `<span class="rank-cell">${esc(r.rank)}</span>`;
      const tds = show.map(i => {
        const v = esc(r.v[i] ?? '');
        if (i === main) {
          const name = merged ? `${v} <span style="font-weight:400;color:#555">${esc(r.v[ix.prenom] ?? '')}</span>` : v;
          const sx = ix.sexe >= 0 ? ({ m: 'Homme', f: 'Femme' }[norm(r.v[ix.sexe])] || esc(r.v[ix.sexe] ?? '')) : '';
          const bits = ix.nom >= 0 ? [ix.club >= 0 ? esc(r.v[ix.club] ?? '') : '', sx].filter(Boolean).join(' · ') : '';
          const bd = ix.nom >= 0 && ix.classif >= 0 && r.v[ix.classif] ? `<span class="badge ${badge(r.v[ix.classif])}" style="margin-left:4px">${esc(r.v[ix.classif])}</span>` : '';
          const bar = ix.nom < 0 && ix.pts >= 0 ? `<div class="club-rank-bar" style="margin-top:4px"><div class="bar-fill" style="width:${Math.round(num(r.v[ix.pts]) / maxPts * 100)}%"></div></div>` : '';
          return `<td><div style="font-weight:600">${name}</div>${bits || bd ? `<div class="sub-mobile">${bits}${bd}</div>` : ''}${bar}</td>`;
        }
        if (i === ix.pts) return `<td class="right">${v}${r.v[i] !== '' && !isNaN(num(r.v[i])) ? ' pts' : ''}</td>`;
        if (i === ix.classif) return `<td class="hide-sm">${r.v[i] ? `<span class="badge ${badge(r.v[i])}">${v}</span>` : ''}</td>`;
        if (i === ix.club) return `<td class="hide-sm" style="color:#666;font-size:.85rem">${v}</td>`;
        return `<td class="hide-sm" style="color:#555">${v}</td>`;
      }).join('');
      return `<tr><td style="text-align:center">${rk}</td>${tds}</tr>`;
    }).join('');
    $('#cms-tb', host).innerHTML = `<table><thead><tr><th style="width:50px;text-align:center">#</th>${th}</tr></thead><tbody>${body}</tbody></table>`;
  }

  $$('.cat-tab', host).forEach(b => b.onclick = () => { cur = +b.dataset.k; $$('.cat-tab', host).forEach(x => x.classList.toggle('active', x === b)); setup(); render(); });
  qEl.oninput = fc.onchange = fs.onchange = render;
  setup(); render();
}

(async () => {
  try {
    watchModal();
    if (location.pathname.split('/').pop() === 'classement.html' || $('#cms-classements')) { const c = await list('classements'); if (c.length) applyClassements(c); }
    const s = (await getDoc(doc(db, 'settings', 'general'))).data();
    if (s) applySettings(s);
    if ($('#bloc-centre')) { const c = await list('clubs'); if (c.length) applyClubs(c); }
    if ($('.org-tree')) { const m = await list('membres'); if (m.length) applyComite(m); }
    if (window.CMS_CAL) {
      const e = await list('events');
      if (e.length) { window.CMS_CAL.EVENTS.splice(0, window.CMS_CAL.EVENTS.length, ...e); window.CMS_CAL.renderCalendar(); }
    }
  } catch (err) { console.warn('Données Firestore indisponibles, contenu par défaut conservé.', err); }
})();
