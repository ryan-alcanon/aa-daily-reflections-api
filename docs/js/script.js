const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  // { code: 'fr', label: 'FR' },  // uncomment when reflections-fr.json is ready
];

let currentLang = localStorage.getItem('aa-lang') || 'en';
let currentDate = new Date();

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

  // Date picker
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

  // Prev / Next
  document.getElementById('prev-btn').addEventListener('click', function () {
    setCurrentDate(offsetDate(currentDate, -1));
  });
  document.getElementById('next-btn').addEventListener('click', function () {
    setCurrentDate(offsetDate(currentDate, 1));
  });

  // Random
  document.getElementById('random-btn').addEventListener('click', function () {
    const dayOfYear = Math.floor(Math.random() * 365) + 1;
    setCurrentDate(new Date(currentDate.getFullYear(), 0, dayOfYear));
  });

  loadReflection();
});

function setCurrentDate(date) {
  currentDate = date;
  document.getElementById('date-picker').value = toInputValue(date);
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

      ['title', 'monthName', 'day', 'quote', 'reference', 'reflection', 'copyright'].forEach(function (field) {
        const el = document.getElementById(field);
        if (el) el.textContent = entry[field];
      });
    })
    .catch(function (err) {
      console.error('Error loading reflection:', err.message);
    });
}
