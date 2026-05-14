/* ============================================================
   PETCINGO CORE JS — Utilidades compartidas
   Módulo autónomo, sin dependencias externas.
   ============================================================ */

'use strict';

// == Namespace global ==
window.Ptcg = window.Ptcg || {};

/* ---- Navbar: hamburger + scroll ---- */
Ptcg.initNav = function () {
  const hamburger = document.querySelector('.ptcg-navbar__hamburger');
  const mobileMenu = document.querySelector('.ptcg-navbar__mobile');
  const navbar = document.querySelector('.ptcg-navbar');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });

  // Cerrar al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target)) {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    }
  });

  // Cerrar al cambiar tamaño a desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 767) {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    }
  });
};

/* ---- Toast notifications ---- */
Ptcg.toast = function (msg, type = '', duration = 3000) {
  let wrap = document.getElementById('ptcg-toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'ptcg-toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'ptcg-toast' + (type ? ' ' + type : '');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'scale(0.9)';
    t.style.transition = '0.25s ease';
    setTimeout(() => t.remove(), 260);
  }, duration);
};

/* ---- Carrito (localStorage) ---- */
Ptcg.Cart = {
  _key: 'ptcg_cart',

  get: function () {
    try { return JSON.parse(localStorage.getItem(this._key)) || []; }
    catch { return []; }
  },

  save: function (items) {
    localStorage.setItem(this._key, JSON.stringify(items));
    this._updateBadge();
  },

  add: function (product) {
    const items = this.get();
    const idx = items.findIndex(i => i.id === product.id && i.variant === product.variant);
    if (idx > -1) {
      items[idx].qty = (items[idx].qty || 1) + 1;
    } else {
      items.push({ ...product, qty: 1 });
    }
    this.save(items);
    Ptcg.toast('Producto agregado al carrito ✓', 'success');
  },

  remove: function (id, variant) {
    const items = this.get().filter(i => !(i.id === id && i.variant === variant));
    this.save(items);
  },

  updateQty: function (id, variant, qty) {
    const items = this.get();
    const idx = items.findIndex(i => i.id === id && i.variant === variant);
    if (idx > -1) {
      if (qty <= 0) { items.splice(idx, 1); }
      else { items[idx].qty = qty; }
    }
    this.save(items);
  },

  clear: function () { this.save([]); },

  total: function () {
    return this.get().reduce((s, i) => s + (i.price * (i.qty || 1)), 0);
  },

  count: function () {
    return this.get().reduce((s, i) => s + (i.qty || 1), 0);
  },

  _updateBadge: function () {
    const badges = document.querySelectorAll('.ptcg-navbar__cart-badge');
    const count = this.count();
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  init: function () { this._updateBadge(); }
};

/* ---- Animaciones de entrada (IntersectionObserver) ---- */
Ptcg.initAnimations = function () {
  if (!('IntersectionObserver' in window)) return;
  const els = document.querySelectorAll('[data-ptcg-anim]');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const delay = e.target.dataset.ptcgDelay || 0;
        setTimeout(() => e.target.classList.add('ptcg-in'), Number(delay));
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
};

/* ---- Helpers ---- */
Ptcg.esc = function (str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
};

Ptcg.formatPrice = function (n) {
  return 'Bs. ' + Number(n).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

Ptcg.formatDate = function (d) {
  return new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
};

/* ---- Inicializar todo al cargar ---- */
document.addEventListener('DOMContentLoaded', () => {
  Ptcg.initNav();
  Ptcg.Cart.init();
  Ptcg.initAnimations();
});
