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

const contact = m => `<div class="org-contact">${m.tel ? `<div class="org-tel">${esc(m.tel)}</div>` : ''}${m.email ? `<div class="org-email">${esc(m.email)}</div>` : ''}${m.adresse ? `<div class="org-tel" style="font-size:0.66rem;color:rgba(255,255,255,0.3)">${esc(m.adresse)}</div>` : ''}</div>`;
const card = (m, cls) => `<div class="org-card ${cls}"><span class="org-role">${esc(m.role)}</span><div class="org-name">${esc(m.nom)}</div>${contact(m)}</div>`;

function applyComite(ms) {
  ms.sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99));
  const g = k => ms.filter(m => m.groupe === k);
  const pres = g('president')[0];
  if (pres) $('.org-card.president').outerHTML = card(pres, 'president reveal visible');
  const levels = $$('.org-level');
  if (levels[0]) levels[0].innerHTML = g('vice').map(m => `<div class="org-item">${card(m, 'vice')}</div>`).join('');
  if (levels[1]) levels[1].innerHTML = g('admin').map(m => `<div class="org-item">${card(m, 'admin')}</div>`).join('');
  $('.membres-grid').innerHTML = g('membre').map(m => card(m, 'membre')).join('');
}

(async () => {
  try {
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
