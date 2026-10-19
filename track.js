import { db } from './firebase-config.js';
import { doc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Comptage anonyme : 1 vue par page et par session.
// Pour ne pas vous compter : console du navigateur > localStorage.setItem('noTrack','1')
const page = (location.pathname.split('/').pop().replace('.html', '') || 'index')
  .replace('index', 'accueil').replace(/[^a-z0-9_-]/gi, '');
if (page && !sessionStorage.getItem('v:' + page) && !localStorage.getItem('noTrack')) {
  sessionStorage.setItem('v:' + page, '1');
  setDoc(doc(db, 'stats_vues', new Date().toISOString().slice(0, 10)), { [page]: increment(1) }, { merge: true }).catch(() => {});
}
