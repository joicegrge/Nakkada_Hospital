/* Nakkada portal – light / dark theme switch.
   Loaded in <head> of every page so the saved theme is applied before first paint.
   - Remembers the choice in this browser (localStorage).
   - Until a choice is made it follows the device's light/dark setting.
   - Adds a sun/moon button to the header of every page. */
(function () {
  'use strict';
  var KEY = 'nakkada_theme', root = document.documentElement;
  function saved() { try { var v = localStorage.getItem(KEY); return v === 'dark' || v === 'light' ? v : null; } catch (e) { return null; } }
  function system() { try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; } }
  function current() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function apply(t) {
    root.setAttribute('data-theme', t);
    root.style.colorScheme = t;
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.content = t === 'dark' ? '#0b1220' : '#ffffff';
    paint();
  }
  var SUN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>';
  function paint() {
    var b = document.getElementById('nkTheme'); if (!b) return;
    var dark = current() === 'dark';
    b.innerHTML = dark ? SUN : MOON;
    b.setAttribute('aria-pressed', dark ? 'true' : 'false');
    b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    b.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  }
  function mount() {
    if (document.getElementById('nkTheme')) return;
    var top = document.querySelector('header.top'); if (!top) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'nkTheme'; b.className = 'ib nk-theme';
    b.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch (e) { /* private mode: still switches for this page */ }
      apply(next);
    });
    var bell = top.querySelector('.ib'), after = bell || top.querySelector('.sp');
    if (after && after.nextSibling) top.insertBefore(b, after.nextSibling); else top.appendChild(b);
    paint();
  }
  apply(saved() || system());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  // keep several open tabs in step
  window.addEventListener('storage', function (e) { if (e.key === KEY && (e.newValue === 'dark' || e.newValue === 'light')) apply(e.newValue); });
  // follow the device setting live, but only while the user has not chosen
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (!saved()) apply(system()); });
  } catch (e) { /* older browsers */ }
})();
