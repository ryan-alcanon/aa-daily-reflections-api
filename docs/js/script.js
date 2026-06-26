const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'ja', label: 'JA' },
  { code: 'pt-br', label: 'PT-BR' },
  { code: 'ru', label: 'RU' },
];

let currentLang = parseLangParam() || localStorage.getItem('aa-lang') || 'en';
document.documentElement.lang = currentLang;
let currentDate = parseDateParam() || new Date();
let songInURL = parseSongParam();   // non-null only when ?song= was in the URL (or locked via share button)
let currentSong = songInURL;        // 1-based index of the currently playing song
let firstLoad = true;
let pendingAnimEnd = null;
let navDirection = null; // 'next' | 'prev' | null

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
    navDirection = 'prev';
    setCurrentDate(offsetDate(currentDate, -1));
  });
  document.getElementById('next-link').addEventListener('click', function (e) {
    e.preventDefault();
    navDirection = 'next';
    setCurrentDate(offsetDate(currentDate, 1));
  });

  // Random
  document.getElementById('random-link').addEventListener('click', function (e) {
    e.preventDefault();
    const dayOfYear = Math.floor(Math.random() * 365) + 1;
    setCurrentDate(new Date(currentDate.getFullYear(), 0, dayOfYear));
  });

  setupAdaptiveLabels();
  setupAdaptiveBrand();
  loadLabels();
  loadReflection();

  // Dark mode toggle: visible on load, fades out after 2s, reappears on user input
  var modeToggle = document.querySelector('.bd-mode-toggle');
  var fadeTimer = null;
  function scheduleModeToggleFade() {
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () {
      var themeBtn = document.getElementById('bd-theme');
      if (themeBtn && themeBtn.getAttribute('aria-expanded') === 'true') {
        scheduleModeToggleFade();
        return;
      }
      if (modeToggle) modeToggle.classList.add('faded');
    }, 1500);
  }
  function showModeToggle() {
    if (modeToggle) modeToggle.classList.remove('faded');
    scheduleModeToggleFade();
  }
  if (modeToggle) {
    scheduleModeToggleFade();
    ['mousemove', 'mousedown', 'touchstart', 'keydown'].forEach(function (evt) {
      document.addEventListener(evt, showModeToggle, { passive: true });
    });
  }

  // Keyboard navigation: left/right arrow keys
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') { navDirection = 'prev'; setCurrentDate(offsetDate(currentDate, -1)); }
    else if (e.key === 'ArrowRight') { navDirection = 'next'; setCurrentDate(offsetDate(currentDate, 1)); }
  });

  // Touch swipe navigation
  var touchStartX = null;
  document.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < 50) return;
    navDirection = dx < 0 ? 'next' : 'prev';
    setCurrentDate(offsetDate(currentDate, dx < 0 ? 1 : -1));
  }, { passive: true });

  window.addEventListener('popstate', function () {
    var d = parseDateParam() || new Date();
    currentDate = d;
    document.getElementById('date-picker').value = toInputValue(d);
    loadReflection();
  });
});

function parseLangParam() {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang');
  return LANGUAGES.some(function (l) { return l.code === lang; }) ? lang : null;
}

function parseSongParam() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('song');
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) || n < 1 ? null : n;
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

function updateURL(push) {
  const params = new URLSearchParams();
  params.set('lang', currentLang);
  params.set('date', toInputValue(currentDate));
  if (songInURL !== null) params.set('song', String(songInURL));
  const url = '?' + params.toString();
  if (push) {
    history.pushState(null, '', url);
  } else {
    history.replaceState(null, '', url);
  }
}

function setCurrentDate(date) {
  currentDate = date;
  document.getElementById('date-picker').value = toInputValue(date);
  updateURL(true);
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
  const direction = navDirection;
  navDirection = null;

  const outClass = direction === 'next' ? 'animate__fadeOutLeft'
                 : direction === 'prev' ? 'animate__fadeOutRight'
                 : 'animate__fadeOut';
  const inClass  = direction === 'next' ? 'animate__fadeInRight'
                 : direction === 'prev' ? 'animate__fadeInLeft'
                 : 'animate__fadeIn';

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
        initMusic();
      } else {
        fadeArticleOut(outClass, function () {
          updateContent(entry);
          fadeArticleIn(inClass);
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
      var keys = Object.keys(labels);

      // Determine which base keys have an abbreviated variant in this language
      var hasAbbr = new Set(
        keys
          .filter(function (k) { return k.endsWith('-abbr'); })
          .map(function (k) { return k.slice(0, -5); })
      );

      // Pass 1 — base keys: set element content and create .label-full spans where needed.
      // Must run before pass 2 so that el.textContent = '' never wipes a .label-abbr span
      // that was already appended.
      keys.filter(function (k) { return !k.endsWith('-abbr'); }).forEach(function (key) {
        var value = labels[key];
        var el = document.getElementById(key);
        if (!el) return;
        if (hasAbbr.has(key)) {
          var fullSpan = el.querySelector('.label-full');
          if (!fullSpan) {
            fullSpan = document.createElement('span');
            fullSpan.className = 'label-full';
            el.textContent = '';
            el.appendChild(fullSpan);
          }
          fullSpan.textContent = value;
        } else {
          // No abbr for this key — plain text (also clears any spans left by a prior language)
          el.textContent = value;
        }
      });

      // Pass 2 — abbr keys: base elements are fully set up, safe to append .label-abbr spans.
      keys.filter(function (k) { return k.endsWith('-abbr'); }).forEach(function (key) {
        var el = document.getElementById(key.slice(0, -5));
        if (!el) return;
        var abbrSpan = el.querySelector('.label-abbr');
        if (!abbrSpan) {
          abbrSpan = document.createElement('span');
          abbrSpan.className = 'label-abbr';
          el.appendChild(abbrSpan);
        }
        abbrSpan.textContent = labels[key];
      });

      // Re-evaluate wrapping now that label text has changed
      requestAnimationFrame(function () {
        checkLabelAbbr();
        checkBrandAbbr();
      });
    })
    .catch(function (err) { console.error('Error loading labels:', err.message); });
}

function checkLabelAbbr() {
  var nav = document.querySelector('ul.nav-date');
  if (!nav) return;
  if (!nav.querySelector('.label-abbr')) {
    nav.classList.remove('labels-abbreviated');
    return;
  }
  var items = nav.querySelectorAll('.nav-item');
  if (!items.length) return;
  var firstTop = Math.round(items[0].getBoundingClientRect().top);
  var wrapped = Array.from(items).some(function (item) {
    return Math.round(item.getBoundingClientRect().top) > firstTop;
  });
  nav.classList.toggle('labels-abbreviated', wrapped);
}

function setupAdaptiveLabels() {
  var nav = document.querySelector('ul.nav-date');
  if (!nav) return;
  new ResizeObserver(checkLabelAbbr).observe(nav);
}

function checkBrandAbbr() {
  var brand = document.getElementById('pageTitle');
  if (!brand || !brand.querySelector('.label-abbr')) {
    if (brand) brand.classList.remove('brand-abbreviated');
    return;
  }
  var fullSpan = brand.querySelector('.label-full');
  if (!fullSpan) { brand.classList.remove('brand-abbreviated'); return; }

  var nav = brand.closest('nav');

  // Measure full text width using a fixed-position probe so we never mutate
  // the nav's layout inside the ResizeObserver callback — that would retrigger
  // the observer and cause an oscillation loop.
  var probe = document.createElement('span');
  probe.style.cssText = 'position:fixed;top:-9999px;white-space:nowrap;visibility:hidden;pointer-events:none';
  probe.style.font = getComputedStyle(brand).font;
  probe.textContent = fullSpan.textContent;
  document.body.appendChild(probe);
  var fullTextWidth = probe.getBoundingClientRect().width;
  document.body.removeChild(probe);

  // Available width = nav width minus the footprint of visible siblings.
  // The .navbar-collapse on desktop is flex-grown to fill remaining space so
  // its offsetWidth is circular — use its actual content (#lang-toggle) instead.
  var siblingWidth = 0;
  Array.from(nav.children).forEach(function (child) {
    if (child === brand || child.offsetWidth === 0) return;
    if (child.classList.contains('navbar-collapse') && child.classList.contains('show')) return;
    if (child.classList.contains('navbar-collapse')) {
      var langToggle = child.querySelector('#lang-toggle');
      siblingWidth += langToggle ? langToggle.getBoundingClientRect().width : 0;
    } else {
      siblingWidth += child.getBoundingClientRect().width;
    }
  });

  brand.classList.toggle('brand-abbreviated', fullTextWidth > nav.clientWidth - siblingWidth);
}

function setupAdaptiveBrand() {
  var navbar = document.querySelector('nav.navbar');
  if (!navbar) return;
  new ResizeObserver(checkBrandAbbr).observe(navbar);
}

var audioPlayer = null;

function initMusic() {
  fetch('data/music.json')
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (files) {
      if (!files || !files.length) return;

      // Song priority: URL param (bookmarked) → random
      // Random songs are never stored — a fresh visit or refresh always picks a new one.
      var idx;
      if (songInURL !== null && songInURL >= 1 && songInURL <= files.length) {
        idx = songInURL - 1;
        currentSong = songInURL;
      } else {
        idx = Math.floor(Math.random() * files.length);
        currentSong = idx + 1;
        songInURL = null; // keep out of URL so refresh gives a new random song
      }

      audioPlayer = new Audio(files[idx]);
      audioPlayer.loop = true;
      audioPlayer.volume = 0.3;

      // Build and append the toggle button as the last item in #lang-toggle
      var langToggle = document.getElementById('lang-toggle');
      var btn = document.createElement('button');
      btn.id = 'music-toggle';
      btn.className = 'lang-btn';
      btn.setAttribute('aria-label', 'Play music');
      var icon = document.createElement('span');
      icon.id = 'music-icon';
      icon.setAttribute('aria-hidden', 'true');
      btn.appendChild(icon);
      if (langToggle) langToggle.appendChild(btn);

      // Autoplay unless the user has explicitly paused.
      var userPaused = localStorage.getItem('aa-music-paused') === 'true';
      if (!userPaused) {
        audioPlayer.play()
          .then(function () { setMusicPlaying(true); })
          .catch(function () {
            // Browser blocked autoplay — don't record this as a user pause.
            // Resume on the first user interaction instead.
            setMusicPlaying(false, false);
            resumeOnInteraction();
          });
      } else {
        setMusicPlaying(false, false);
      }

      btn.addEventListener('click', function () {
        if (audioPlayer.paused) {
          audioPlayer.play().then(function () { setMusicPlaying(true); });
        } else {
          audioPlayer.pause();
          setMusicPlaying(false);
        }
      });
    })
    .catch(function () {});
}

function resumeOnInteraction() {
  var events = ['click', 'keydown', 'touchstart'];
  function handler() {
    events.forEach(function (e) { document.removeEventListener(e, handler); });
    if (!audioPlayer || !audioPlayer.paused) return;
    if (localStorage.getItem('aa-music-paused') === 'true') return;
    audioPlayer.play().then(function () { setMusicPlaying(true); }).catch(function () {});
  }
  events.forEach(function (e) { document.addEventListener(e, handler); });
}

function setMusicPlaying(playing, persist) {
  if (persist !== false) {
    if (playing) {
      localStorage.removeItem('aa-music-paused');
    } else {
      localStorage.setItem('aa-music-paused', 'true');
    }
  }
  var icon = document.getElementById('music-icon');
  var btn  = document.getElementById('music-toggle');
  if (icon) icon.classList.toggle('music-playing', playing);
  if (btn) {
    btn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    btn.classList.toggle('active', playing);
  }
}


function fadeArticleOut(outClass, callback) {
  const article = document.querySelector('article');

  // Cancel any in-progress animation before starting a new one
  if (pendingAnimEnd) {
    article.removeEventListener('animationend', pendingAnimEnd);
    pendingAnimEnd = null;
  }

  article.classList.remove(
    'animate__fadeIn', 'animate__fadeInDown', 'animate__fadeInLeft', 'animate__fadeInRight'
  );
  void article.offsetWidth; // force reflow so the new animation starts clean
  article.classList.add(outClass);

  pendingAnimEnd = function () {
    article.removeEventListener('animationend', pendingAnimEnd);
    pendingAnimEnd = null;
    article.classList.remove(outClass);
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
