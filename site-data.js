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

// Arbitres / éducateurs : regroupés par niveau / qualification (champ « role »), dans l'ordre des positions
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
  box.innerHTML = groups.map(g =>
    `<span class="membres-label">${esc(g.k)}</span><div class="membres-grid">${g.l.map(m => card(m, 'membre')).join('')}</div>`
  ).join('');
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

// Classements : affichage en onglets (un tableau par classement) avec recherche
function applyClassements(list) {
  list.sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99));
  let host = $('#cms-classements') || $('.page-content');
  if (!host) { $('footer')?.insertAdjacentHTML('beforebegin', '<div class="page-content" id="cms-classements"></div>'); host = $('#cms-classements'); }
  const css = `<style>.cms-t{display:flex;gap:.5rem;overflow-x:auto;margin-bottom:1rem;padding-bottom:.3rem}.cms-t button{flex-shrink:0;min-height:42px;border:1.5px solid #e3e0d8;background:#fff;color:#555;font:600 .85rem 'DM Sans',sans-serif;padding:.45rem 1.1rem;border-radius:25px;cursor:pointer}.cms-t button.on,.cms-t button:hover{background:#0a2342;color:#c9a84c;border-color:#0a2342}.cms-m{color:#888;font-size:.85rem;margin:0 0 .8rem}.cms-q{width:100%;max-width:420px;min-height:44px;padding:.6rem 1rem;border:2px solid #e3e0d8;border-radius:10px;font:1rem 'DM Sans',sans-serif;margin-bottom:1rem}.cms-q:focus{outline:none;border-color:#c9a84c}.cms-w{overflow-x:auto;border:1px solid #e3e0d8;border-radius:10px;background:#fff}.cms-w table{border-collapse:collapse;width:100%;font-size:.9rem}.cms-w th{background:#0a2342;color:#c9a84c;text-align:left;padding:.7rem .8rem;white-space:nowrap}.cms-w td{padding:.55rem .8rem;border-top:1px solid #eee}.cms-w tr:nth-child(even) td{background:#faf9f5}</style>`;
  host.innerHTML = css + `<div class="cms-t" role="tablist">${list.map((c, i) => `<button role="tab" class="${i ? '' : 'on'}" data-k="${i}">${esc(c.nom)}</button>`).join('')}</div>` +
    list.map((c, i) => `<section class="cms-p" data-k="${i}" ${i ? 'hidden' : ''}>${c.majLe ? `<p class="cms-m">${esc(c.majLe)}</p>` : ''}<input class="cms-q" type="search" placeholder="🔍 Rechercher un joueur ou un club…" aria-label="Rechercher"><div class="cms-w"><table><thead><tr>${(c.colonnes || []).map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(c.lignes || []).map(r => `<tr>${r.v.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`).join('');
  $$('.cms-t button', host).forEach(b => b.onclick = () => { $$('.cms-t button', host).forEach(x => x.classList.toggle('on', x === b)); $$('.cms-p', host).forEach(p => p.hidden = p.dataset.k !== b.dataset.k); });
  $$('.cms-q', host).forEach(q => q.oninput = () => { const v = q.value.toLowerCase(); $$('tbody tr', q.parentElement).forEach(tr => tr.hidden = v && !tr.textContent.toLowerCase().includes(v)); });
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
