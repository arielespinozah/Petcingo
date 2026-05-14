/* ============================================================
   petcingo-shield.js — Anti-Dashnex emergency style shield
   Runs after DOM is ready; patches any Bootstrap 4 overrides
   that slipped past the CSS layer.
   ============================================================ */
(function () {
  'use strict';

  var ROOT_SEL = '.ptcg-index';
  var PURPLE   = '#4552CC';
  var CYAN     = '#51CBF5';

  /* Emergency patches applied via JS when CSS !important isn't enough */
  var PATCHES = [
    /* Buttons */
    {
      sel: ROOT_SEL + ' .ptcg-index__btn--primary',
      props: { background: PURPLE + ' !important', color: '#FFFFFF !important', border: 'none !important' }
    },
    {
      sel: ROOT_SEL + ' .ptcg-index__btn-hero-a',
      props: { background: CYAN + ' !important', color: '#0f1117 !important', border: 'none !important' }
    },
    {
      sel: ROOT_SEL + ' .ptcg-index__plan-btn--primary',
      props: { background: 'linear-gradient(135deg,' + PURPLE + ',' + '#2EA8D0) !important', color: '#FFFFFF !important' }
    },
    /* Cards — ensure glass backdrop isn't blocked */
    {
      sel: ROOT_SEL + ' .ptcg-index__step::before',
      props: { 'backdrop-filter': 'blur(40px) saturate(180%) !important', '-webkit-backdrop-filter': 'blur(40px) saturate(180%) !important' }
    },
    /* Section tags */
    {
      sel: ROOT_SEL + ' .ptcg-index__sec-tag',
      props: { color: PURPLE + ' !important', 'font-family': "'Plus Jakarta Sans', sans-serif !important" }
    },
    /* Headings — Sora font guard */
    {
      sel: ROOT_SEL + ' .ptcg-index__hero-h1, ' + ROOT_SEL + ' .ptcg-index__sec-title, ' +
           ROOT_SEL + ' .ptcg-index__plan-name, ' + ROOT_SEL + ' .ptcg-index__cta-h2',
      props: { 'font-family': "'Sora', sans-serif !important" }
    }
  ];

  function applyShield() {
    var root = document.querySelector(ROOT_SEL);
    if (!root) return;

    /* Inject a <style> tag with the patches */
    var css = PATCHES.map(function (patch) {
      var rules = Object.keys(patch.props).map(function (prop) {
        return prop + ':' + patch.props[prop] + ';';
      }).join('');
      return patch.sel + '{' + rules + '}';
    }).join('\n');

    var style = document.createElement('style');
    style.id = 'ptcg-shield-styles';
    style.textContent = '/* petcingo-shield.js — auto-generated */\n' + css;
    document.head.appendChild(style);

    /* Force Remix Icon font on all icon elements inside root */
    root.querySelectorAll('i[class]').forEach(function (el) {
      var cls = el.className || '';
      if (cls.indexOf('ri-') !== -1) {
        el.style.setProperty('font-family', 'remixicon', 'important');
        el.style.setProperty('font-style', 'normal', 'important');
      }
    });
  }

  /* Run after DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyShield);
  } else {
    applyShield();
  }
})();
