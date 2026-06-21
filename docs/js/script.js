const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'ja', label: 'JA' },
];

let currentLang = parseLangParam() || localStorage.getItem('aa-lang') || 'en';
document.documentElement.lang = currentLang;
let currentDate = parseDateParam() || new Date();
let firstLoad = true;
let pendingAnimEnd = null;

document.addEventListener('DOMContentLoaded', function () {
  // Language toggle
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
      document.documentElement.lang = currentLang;
      updateURL();
      loadLabels();
      toggleContainer.querySelectorAll('.lang-btn').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      loadReflection();
    });
    toggleContainer.appendChild(btn);
  });

  // Hidden date input — synced by setCurrentDate, opened by the calendar icon
  const datePicker = document.getElementById('date-picker');
  const year = currentDate.getFullYear();
  datePicker.min = year + '-01-01';
  datePicker.max = year + '-12-31';
  datePicker.value = toInputValue(currentDate);
  datePicker.addEventListener('change', function () {
    if (!datePicker.value) return;
    const parts = datePicker.value.split('-').map(Number);
    setCurrentDate(new Date(parts[0], parts[1] - 1, parts[2]));
  });

  // Calendar icon opens the hidden date picker
  document.getElementById('date-picker-link').addEventListener('click', function (e) {
    e.preventDefault();
    if (datePicker.showPicker) {
      datePicker.showPicker();
    } else {
      datePicker.click();
    }
  });

  // Prev / Next
  document.getElementById('prev-link').addEventListener('click', function (e) {
    e.preventDefault();
    setCurrentDate(offsetDate(currentDate, -1));
  });
  document.getElementById('next-link').addEventListener('click', function (e) {
    e.preventDefault();
    setCurrentDate(offsetDate(currentDate, 1));
  });

  // Random
  document.getElementById('random-link').addEventListener('click', function (e) {
    e.preventDefault();
    const dayOfYear = Math.floor(Math.random() * 365) + 1;
    setCurrentDate(new Date(currentDate.getFullYear(), 0, dayOfYear));
  });

  updateURL();
  loadLabels();
  loadReflection();
});

function parseLangParam() {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang');
  return LANGUAGES.some(function (l) { return l.code === lang; }) ? lang : null;
}

function parseDateParam() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('date');
  if (!raw) return null;
  const parts = raw.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const year = new Date().getFullYear();
  const date = new Date(year, parts[1] - 1, parts[2]);
  if (date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) return null;
  return date;
}

function updateURL() {
  const params = new URLSearchParams();
  params.set('lang', currentLang);
  params.set('date', toInputValue(currentDate));
  history.replaceState(null, '', '?' + params.toString());
}

function setCurrentDate(date) {
  currentDate = date;
  document.getElementById('date-picker').value = toInputValue(date);
  updateURL();
  loadReflection();
}

function offsetDate(date, delta) {
  const year = date.getFullYear();
  const next = new Date(year, date.getMonth(), date.getDate() + delta);
  if (next.getFullYear() > year) return new Date(year, 0, 1);
  if (next.getFullYear() < year) return new Date(year, 11, 31);
  return next;
}

function toInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function loadReflection() {
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();

  fetch('data/reflections-' + currentLang + '.json')
    .then(function (response) {
      if (!response.ok) throw new Error('Failed to load reflections data');
      return response.json();
    })
    .then(function (reflections) {
      const entry = reflections.find(function (r) {
        return r.month === month && r.day === day;
      });
      if (!entry) throw new Error('No reflection found for ' + month + '/' + day);

      if (firstLoad) {
        firstLoad = false;
        updateContent(entry);
        fadeArticleIn('animate__fadeIn');
      } else {
        fadeArticleOut(function () {
          updateContent(entry);
          fadeArticleIn('animate__fadeIn');
        });
      }
    })
    .catch(function (err) {
      console.error('Error loading reflection:', err.message);
    });
}

function updateContent(entry) {
  ['title', 'dateName', 'quote', 'reference', 'reflection', 'copyright'].forEach(function (field) {
    const el = document.getElementById(field);
    if (el) el.textContent = entry[field];
  });
}

function loadLabels() {
  fetch('data/labels-' + currentLang + '.json')
    .then(function (r) {
      return r.ok ? r.json() : fetch('data/labels-en.json').then(function (r2) { return r2.json(); });
    })
    .then(function (labels) {
      Object.entries(labels).forEach(function (entry) {
        var el = document.getElementById(entry[0]);
        if (el) el.textContent = entry[1];
      });
    })
    .catch(function (err) { console.error('Error loading labels:', err.message); });
}

function fadeArticleOut(callback) {
  const article = document.querySelector('article');

  // Cancel any in-progress animation before starting a new one
  if (pendingAnimEnd) {
    article.removeEventListener('animationend', pendingAnimEnd);
    pendingAnimEnd = null;
  }

  article.classList.remove('animate__fadeIn', 'animate__fadeInDown');
  void article.offsetWidth; // force reflow so the new animation starts clean
  article.classList.add('animate__fadeOut');

  pendingAnimEnd = function () {
    article.removeEventListener('animationend', pendingAnimEnd);
    pendingAnimEnd = null;
    article.classList.remove('animate__fadeOut');
    callback();
  };
  article.addEventListener('animationend', pendingAnimEnd);
}

function fadeArticleIn(animClass) {
  const article = document.querySelector('article');
  article.classList.remove('animate__fadeOut');
  void article.offsetWidth; // force reflow so animation restarts if same class
  article.classList.add(animClass);
}
