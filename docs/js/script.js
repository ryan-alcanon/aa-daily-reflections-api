document.addEventListener('DOMContentLoaded', function () {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  fetch('data/reflections-en.json')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to load reflections data');
      }
      return response.json();
    })
    .then(function (reflections) {
      const entry = reflections.find(function (r) {
        return r.month === month && r.day === day;
      });

      if (!entry) {
        throw new Error('No reflection found for today (' + month + '/' + day + ')');
      }

      ['title', 'monthName', 'month', 'day', 'quote', 'reflection', 'copyright'].forEach(function (field) {
        const el = document.getElementById(field);
        if (el) el.textContent = entry[field];
      });

      // reference appears twice in the HTML, populate both
      document.querySelectorAll('[id="reference"]').forEach(function (el) {
        el.textContent = entry.reference;
      });
    })
    .catch(function (err) {
      console.error('Error loading reflection:', err.message);
    });
});
