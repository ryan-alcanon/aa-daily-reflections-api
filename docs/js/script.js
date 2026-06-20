const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  // { code: 'fr', label: 'FR' },  // uncomment when reflections-fr.json is ready
];

document.addEventListener('DOMContentLoaded', function () {
  let currentLang = localStorage.getItem('aa-lang') || 'en';

  const toggleContainer = document.getElementById('lang-toggle');
  LANGUAGES.forEach(function (lang) {
    const btn = document.createElement('button');
    btn.textContent = lang.label;
    btn.className = 'lang-btn' + (lang.code === currentLang ? ' active' : '');
    btn.setAttribute('aria-pressed', lang.code === currentLang ? 'true' : 'false');
    btn.addEventListener('click', function () {
      if (lang.code === currentLang) return;
      currentLang = lang.code;
      localStorage.setItem('aa-lang', currentLang);
      toggleContainer.querySelectorAll('.lang-btn').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      loadReflection(currentLang);
    });
    toggleContainer.appendChild(btn);
  });

  loadReflection(currentLang);
});

function loadReflection(lang) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  fetch('data/reflections-' + lang + '.json')
    .then(function (response) {
      if (!response.ok) throw new Error('Failed to load reflections data');
      return response.json();
    })
    .then(function (reflections) {
      const entry = reflections.find(function (r) {
        return r.month === month && r.day === day;
      });

      if (!entry) throw new Error('No reflection found for today (' + month + '/' + day + ')');

      ['title', 'monthName', 'day', 'quote', 'reference', 'reflection', 'copyright'].forEach(function (field) {
        const el = document.getElementById(field);
        if (el) el.textContent = entry[field];
      });
    })
    .catch(function (err) {
      console.error('Error loading reflection:', err.message);
    });
}
