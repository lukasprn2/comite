/* nav.js — menu burger mobile (partagé par toutes les pages) */
(function () {
  var ham = document.getElementById('hamburger');
  var links = document.getElementById('navLinks');
  if (!ham || !links) return;

  ham.setAttribute('aria-controls', 'navLinks');
  ham.setAttribute('aria-expanded', 'false');

  function setOpen(open) {
    links.classList.toggle('open', open);
    ham.classList.toggle('open', open);
    ham.setAttribute('aria-expanded', String(open));
  }

  ham.addEventListener('click', function () {
    setOpen(!links.classList.contains('open'));
  });
  // Ferme le menu après un clic sur un lien (ancres #contact comprises)
  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
  // Repasse en mode desktop : on referme proprement
  var mq = window.matchMedia('(min-width: 1024px)');
  var onChange = function (e) { if (e.matches) setOpen(false); };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
})();
