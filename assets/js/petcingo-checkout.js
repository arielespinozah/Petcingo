/* petcingo-checkout.js v20260515
   Logica de checkout para Petcingo (Bolivia e Internacional).
   IIFE -- ASCII puro -- Compatible Firebase 9.23.0 compat */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* CONFIG                                                                */
  /* ------------------------------------------------------------------ */
  var FB_CONFIG = {
    apiKey:        'AIzaSyAEE3yLFFsJTMORNFLYZWW2_DNHwzF0hE8',
    authDomain:    'petcingo-43096.firebaseapp.com',
    projectId:     'petcingo-43096',
    storageBucket: 'petcingo-43096.firebasestorage.app',
    appId:         '1:679546185536:web:ceccd210b7c73b296f7ca5'
  };

  var ACTIVATE_URL = 'https://prueb2.dashnexpages.net/activacion/';
  var HOME_URL     = 'https://prueb2.dashnexpages.net/home/';

  var PLAN_NAMES = { preventa: 'Preventa', petid: 'Pet ID', pack: 'Pack Familia' };
  var DEFAULT_BS  = { preventa: 67, petid: 97, pack: 250 };
  var DEFAULT_USD = { preventa: 9.99, petid: 14.99, pack: 36 };

  /* ------------------------------------------------------------------ */
  /* ESTADO                                                                */
  /* ------------------------------------------------------------------ */
  var db, storage;
  var isIntl       = false;
  var prices       = { preventa: 67, petid: 97, pack: 250 };
  var currentPhase = 1;
  var selectedPlan = null;
  var selectedMethod = null;
  var deliveryType = 'pickup';
  var deliveryFee  = 0;
  var receiptFile  = null;
  var activationCode = null;
  var refCode      = null;
  var qrTimer      = null;

  /* ------------------------------------------------------------------ */
  /* INIT                                                                  */
  /* ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    isIntl = window.location.pathname.indexOf('internacional') !== -1 ||
             getParam('intl') === '1';

    if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    db      = firebase.firestore();
    storage = firebase.storage();

    readUrlParams();
    loadPrices();
    renderPaymentMethods();
    initUploadInput();
  });

  /* ------------------------------------------------------------------ */
  /* PARAMETROS URL                                                        */
  /* ------------------------------------------------------------------ */
  function readUrlParams() {
    try {
      var r = getParam('ref');
      if (r && r.length <= 64) {
        refCode = r;
        try { sessionStorage.setItem('ptcg_ref', r); } catch (_) {}
      } else {
        try { refCode = sessionStorage.getItem('ptcg_ref') || null; } catch (_) {}
      }

      var planKey = getParam('plan');
      if (planKey && DEFAULT_BS[planKey]) {
        selectedPlan = { key: planKey, name: PLAN_NAMES[planKey], price: prices[planKey] };
        renderPlanBanner();
      }
    } catch (_) {}
  }

  function getParam(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || '';
    } catch (_) { return ''; }
  }

  function renderPlanBanner() {
    var banner = byId('ptcg-plan-banner');
    if (!banner) return;
    if (selectedPlan) {
      setText('ptcg-banner-plan-name', selectedPlan.name);
      setText('ptcg-banner-plan-price',
        isIntl ? 'USD ' + DEFAULT_USD[selectedPlan.key] : selectedPlan.price + ' Bs.');
      banner.removeAttribute('hidden');
    } else {
      banner.setAttribute('hidden', '');
    }
  }

  /* ------------------------------------------------------------------ */
  /* PRECIOS FIRESTORE                                                     */
  /* ------------------------------------------------------------------ */
  function loadPrices() {
    db.collection('siteConfig').doc('main').get().then(function (snap) {
      if (snap.exists) {
        var p = (snap.data().prices) || {};
        if (p.preventa) prices.preventa = p.preventa;
        if (p.petid)    prices.petid    = p.petid;
        if (p.pack)     prices.pack     = p.pack;
        if (selectedPlan) {
          selectedPlan.price = prices[selectedPlan.key];
          renderPlanBanner();
        }
      }
    }).catch(function () {});
  }

  /* ------------------------------------------------------------------ */
  /* NAVEGACION DE FASES                                                   */
  /* ------------------------------------------------------------------ */
  window.ptcgGoPhase = function (phase) {
    if (phase === 2 && !validatePhase1()) return;
    currentPhase = phase;
    document.querySelectorAll('.ptcg-checkout__phase').forEach(function (p) {
      p.classList.remove('active');
    });
    var target = byId('ptcg-phase-' + phase);
    if (target) target.classList.add('active');
    updateProgress(phase);
    updateBackBtn(phase);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.ptcgPrevPhase = function () {
    if (currentPhase > 1) window.ptcgGoPhase(currentPhase - 1);
  };

  function updateProgress(phase) {
    document.querySelectorAll('.ptcg-checkout__step').forEach(function (s) {
      var n = parseInt(s.dataset.step, 10);
      s.classList.remove('active', 'done');
      if (n < phase)  s.classList.add('done');
      if (n === phase) s.classList.add('active');
    });
    document.querySelectorAll('.ptcg-checkout__step-line').forEach(function (l) {
      var n = parseInt(l.dataset.line, 10);
      if (n < phase) l.classList.add('done'); else l.classList.remove('done');
    });
  }

  function updateBackBtn(phase) {
    var btn = byId('ptcg-btn-back');
    if (!btn) return;
    if (phase > 1) btn.removeAttribute('hidden'); else btn.setAttribute('hidden', '');
  }

  /* ------------------------------------------------------------------ */
  /* VALIDACION FASE 1                                                     */
  /* ------------------------------------------------------------------ */
  function validatePhase1() {
    var name  = getVal('ptcg-name').trim();
    var phone = getVal('ptcg-phone').trim();
    var email = getVal('ptcg-email').trim();
    var ok = true;

    if (!name)  { errOn('ptcg-err-name',  'ptcg-name');  ok = false; }
    else        { errOff('ptcg-err-name', 'ptcg-name'); }
    if (!phone) { errOn('ptcg-err-phone', 'ptcg-phone'); ok = false; }
    else        { errOff('ptcg-err-phone','ptcg-phone'); }
    if (!email || email.indexOf('@') < 0 || email.indexOf('.') < 0) {
      errOn('ptcg-err-email', 'ptcg-email'); ok = false;
    } else {
      errOff('ptcg-err-email', 'ptcg-email');
    }

    if (!ok) showToast('Completa los campos requeridos', 'error');
    return ok;
  }

  /* ------------------------------------------------------------------ */
  /* DELIVERY (solo Bolivia)                                               */
  /* ------------------------------------------------------------------ */
  window.ptcgSetDelivery = function (type) {
    deliveryType = type;
    var pickup    = byId('ptcg-opt-pickup');
    var delivery  = byId('ptcg-opt-delivery');
    var addrField = byId('ptcg-address-field');
    var shipInfo  = byId('ptcg-shipping-info');
    var delIcon   = byId('ptcg-delivery-icon');
    var delPrice  = byId('ptcg-del-price');

    if (pickup)   pickup.classList.toggle('is-selected',   type === 'pickup');
    if (delivery) delivery.classList.toggle('is-selected', type === 'delivery');

    if (type === 'delivery') {
      deliveryFee = 10;
      if (delPrice) delPrice.textContent = '10 Bs';
      var city = getVal('ptcg-city');
      if (city && city !== 'Santa Cruz de la Sierra') {
        if (addrField) addrField.style.display = 'none';
        if (shipInfo)  shipInfo.style.display  = '';
        if (delIcon)   delIcon.className = 'ri-box-3-line';
      } else {
        if (addrField) addrField.style.display = '';
        if (shipInfo)  shipInfo.style.display  = 'none';
        if (delIcon)   delIcon.className = 'ri-motorbike-line';
      }
    } else {
      deliveryFee = 0;
      if (delPrice) delPrice.textContent = 'Gratis';
      if (addrField) addrField.style.display = 'none';
      if (shipInfo)  shipInfo.style.display  = 'none';
    }
  };

  window.ptcgUpdateDelivery = function () { window.ptcgSetDelivery(deliveryType); };

  window.ptcgSimZone = function () {
    var txt   = getVal('ptcg-address').toLowerCase();
    var msg   = byId('ptcg-zone-msg');
    var txtEl = byId('ptcg-zone-text');
    if (txt.length > 4 && getVal('ptcg-city') === 'Santa Cruz de la Sierra') {
      var fee = 10;
      if (txt.indexOf('norte') !== -1 || txt.indexOf('4to') !== -1 || txt.indexOf('cuarto') !== -1) {
        fee = 15;
        if (txtEl) txtEl.textContent = 'Zona Norte: Tarifa (15 Bs)';
      } else {
        if (txtEl) txtEl.textContent = 'Zona estandar: 10 Bs';
      }
      deliveryFee = fee;
      var dp = byId('ptcg-del-price');
      if (dp) dp.textContent = fee + ' Bs';
      if (msg) msg.removeAttribute('hidden');
    } else {
      if (msg) msg.setAttribute('hidden', '');
      deliveryFee = deliveryType === 'delivery' ? 10 : 0;
    }
  };

  /* ------------------------------------------------------------------ */
  /* METODOS DE PAGO                                                       */
  /* ------------------------------------------------------------------ */
  function renderPaymentMethods() {
    var container = byId('ptcg-payment-methods');
    if (!container) return;

    var methods = isIntl
      ? [
          { key: 'paypal', name: 'PayPal',  desc: 'Pago internacional (proximamente)',    icon: 'ri-paypal-line',    soon: true },
          { key: 'stripe', name: 'Stripe',  desc: 'Tarjeta internacional (proximamente)', icon: 'ri-bank-card-line', soon: true }
        ]
      : [
          { key: 'qr',    name: 'QR Transferencia', desc: 'Escanea y paga por transferencia QR',   icon: 'ri-qr-code-line'    },
          { key: 'banco', name: 'Deposito bancario', desc: 'Banco Union o BNB -- datos al seleccionar', icon: 'ri-building-2-line' }
        ];

    container.innerHTML = methods.map(function (m) {
      return '<div class="ptcg-checkout__payment-method' + (m.soon ? ' is-soon' : '') +
        '" data-method="' + m.key + '" onclick="ptcgSelectMethod(this)">' +
        '<div class="ptcg-checkout__pm-radio"></div>' +
        '<i class="' + m.icon + ' ptcg-checkout__pm-icon"></i>' +
        '<div class="ptcg-checkout__pm-info">' +
          '<div class="ptcg-checkout__pm-name">' + m.name + '</div>' +
          '<div class="ptcg-checkout__pm-desc">' + m.desc + '</div>' +
        '</div>' +
        (m.soon ? '<span style="font-size:0.65rem;font-weight:700;padding:3px 10px;border-radius:99px;background:rgba(69,82,204,0.10);color:#4552CC !important;flex-shrink:0;">Pronto</span>' : '') +
        '</div>';
    }).join('');
  }

  window.ptcgSelectMethod = function (card) {
    if (card.classList.contains('is-soon')) {
      showToast('Este metodo estara disponible pronto', 'info');
      return;
    }
    document.querySelectorAll('.ptcg-checkout__payment-method').forEach(function (c) {
      c.classList.remove('is-selected');
    });
    card.classList.add('is-selected');
    selectedMethod = { key: card.dataset.method };
    hideEl('ptcg-err-method');
    showQR();
  };

  /* ------------------------------------------------------------------ */
  /* QR Y TEMPORIZADOR                                                     */
  /* ------------------------------------------------------------------ */
  function showQR() {
    var qrCard = byId('ptcg-qr-card');
    if (!qrCard) return;
    qrCard.removeAttribute('hidden');
    setTimeout(function () { qrCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 120);

    var total = selectedPlan ? (selectedPlan.price + deliveryFee) : 0;
    var amtEl = byId('ptcg-qr-amount');
    if (amtEl) {
      amtEl.textContent = isIntl
        ? 'USD ' + (DEFAULT_USD[selectedPlan ? selectedPlan.key : 'petid'] || '--')
        : total + ' Bs';
    }

    drawQrCanvas(total);

    var confirmArea = byId('ptcg-confirm-area');
    if (confirmArea) confirmArea.classList.remove('visible');
    if (qrTimer) clearInterval(qrTimer);
    var seconds = 300;
    var timerEl = byId('ptcg-timer-text');
    qrTimer = setInterval(function () {
      seconds--;
      var m = Math.floor(seconds / 60);
      var s = seconds % 60;
      if (timerEl) timerEl.textContent = pad(m) + ':' + pad(s);
      if (seconds <= 0) {
        clearInterval(qrTimer);
        if (timerEl) timerEl.textContent = 'EXPIRADO';
      }
      if (seconds <= 280 && confirmArea) confirmArea.classList.add('visible');
    }, 1000);
  }

  function drawQrCanvas(total) {
    var canvas = byId('ptcg-qr-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var sz  = 200;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, sz, sz);
    ctx.fillStyle = '#1E255E';
    var cell = sz / 10;
    var pat  = [
      [1,1,1,1,1,1,1,0,1,0],[1,0,0,0,0,0,1,0,0,1],
      [1,0,1,1,1,0,1,0,1,1],[1,0,1,1,1,0,1,1,0,0],
      [1,0,1,1,1,0,1,0,1,0],[1,0,0,0,0,0,1,0,0,1],
      [1,1,1,1,1,1,1,0,1,0],[0,0,0,0,0,0,0,1,0,1],
      [0,1,0,1,0,1,0,0,1,0],[1,0,1,0,1,0,1,1,0,1]
    ];
    for (var r = 0; r < 10; r++) {
      for (var c = 0; c < 10; c++) {
        if (pat[r][c]) ctx.fillRect(c * cell + 1, r * cell + 1, cell - 2, cell - 2);
      }
    }
    ctx.fillStyle = '#4552CC';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PETCINGO', sz / 2, sz - 6);
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* ------------------------------------------------------------------ */
  /* MODAL COMPROBANTE                                                     */
  /* ------------------------------------------------------------------ */
  window.ptcgConfirmPayment = function () {
    if (!selectedMethod) { showToast('Selecciona un metodo de pago', 'error'); return; }
    updateProgress(3);
    var modal = byId('ptcg-modal-receipt');
    if (modal) modal.removeAttribute('hidden');
  };

  window.ptcgCloseModal = function () {
    var modal = byId('ptcg-modal-receipt');
    if (modal) modal.setAttribute('hidden', '');
    updateProgress(2);
    updateBackBtn(2);
  };

  function initUploadInput() {
    var input = byId('ptcg-receipt-input');
    if (!input) return;
    input.addEventListener('change', function () {
      var f = input.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) { showToast('Archivo muy grande (max 5 MB)', 'error'); return; }
      receiptFile = f;
      var area  = byId('ptcg-upload-area');
      var fname = byId('ptcg-upload-fname');
      if (area)  area.classList.add('has-file');
      if (fname) { fname.textContent = f.name; fname.removeAttribute('hidden'); }
      hideEl('ptcg-err-receipt');
    });
  }

  window.ptcgUploadReceipt = function () {
    if (!receiptFile) {
      showToast('Selecciona el comprobante primero', 'error');
      showEl('ptcg-err-receipt');
      return;
    }
    if (!selectedPlan)   { showToast('Plan no seleccionado', 'error');   return; }
    if (!selectedMethod) { showToast('Metodo no seleccionado', 'error'); return; }

    setUploadLoading(true);

    activationCode = genCode();
    var now        = firebase.firestore.FieldValue.serverTimestamp();
    var path       = 'receipts/' + activationCode + '_' + Date.now();
    var ref        = storage.ref(path);

    ref.put(receiptFile).then(function () {
      return ref.getDownloadURL();
    }).then(function (url) {
      var name  = getVal('ptcg-name').trim();
      var phone = getVal('ptcg-phone').trim();
      var email = getVal('ptcg-email').trim();
      var notes = getVal('ptcg-notes').trim();
      var city  = isIntl ? getVal('ptcg-intl-country').trim() : getVal('ptcg-city');
      var addr  = isIntl ? getVal('ptcg-intl-address').trim() : getVal('ptcg-address').trim();

      var orderData = {
        activationCode: activationCode,
        plan:           selectedPlan.key,
        planName:       selectedPlan.name,
        price:          selectedPlan.price,
        deliveryFee:    deliveryFee,
        total:          selectedPlan.price + deliveryFee,
        paymentMethod:  selectedMethod.key,
        deliveryType:   isIntl ? 'international' : deliveryType,
        isIntl:         isIntl,
        buyer: { name: name, phone: phone, email: email, city: city, address: addr, notes: notes },
        receiptUrl:     url,
        status:         'pending',
        ref:            refCode || null,
        createdAt:      now
      };

      var batch = db.batch();
      var oRef  = db.collection('orders').doc();
      batch.set(oRef, orderData);
      batch.set(db.collection('pets').doc(activationCode), {
        activationCode: activationCode,
        status:         'reserved',
        plan:           selectedPlan.key,
        createdAt:      now
      });
      if (refCode) {
        batch.set(db.collection('commissions').doc(), {
          ref:            refCode,
          activationCode: activationCode,
          plan:           selectedPlan.key,
          price:          selectedPlan.price,
          status:         'pending',
          createdAt:      now
        });
      }
      return batch.commit();
    }).then(function () {
      setUploadLoading(false);
      if (qrTimer) clearInterval(qrTimer);

      var modal = byId('ptcg-modal-receipt');
      if (modal) modal.setAttribute('hidden', '');

      setText('ptcg-act-code', activationCode);
      var lnk = byId('ptcg-btn-activate');
      if (lnk) lnk.href = ACTIVATE_URL + '?code=' + encodeURIComponent(activationCode);

      currentPhase = 4;
      document.querySelectorAll('.ptcg-checkout__phase').forEach(function (p) {
        p.classList.remove('active');
      });
      var ph4 = byId('ptcg-phase-4');
      if (ph4) ph4.classList.add('active');
      updateProgress(4);
      updateBackBtn(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('Pedido registrado correctamente', 'success');
    }).catch(function (err) {
      setUploadLoading(false);
      showToast('Error al subir: ' + (err.message || 'intenta de nuevo'), 'error');
    });
  };

  /* ------------------------------------------------------------------ */
  /* HELPERS                                                               */
  /* ------------------------------------------------------------------ */
  function genCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code  = '';
    for (var i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  window.ptcgCopyCode = function () { if (activationCode) window.ptcgCopyText(activationCode); };

  window.ptcgCopyText = function (text) {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text).then(function () { showToast('Copiado', 'success'); });
    } catch (_) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copiado', 'success');
    }
  };

  function setUploadLoading(on) {
    var btn     = byId('ptcg-btn-upload');
    var spinner = byId('ptcg-upload-spinner');
    var icon    = byId('ptcg-upload-icon');
    var text    = byId('ptcg-upload-text');
    if (btn)     btn.disabled = on;
    if (spinner) { if (on) spinner.removeAttribute('hidden'); else spinner.setAttribute('hidden', ''); }
    if (icon)    { if (on) icon.setAttribute('hidden', '');  else icon.removeAttribute('hidden'); }
    if (text)    text.textContent = on ? 'Subiendo...' : 'Confirmar pago';
  }

  var _toastTimer;
  function showToast(msg, type) {
    var t  = byId('ptcg-toast');
    var tm = byId('ptcg-toast-msg');
    if (!t) return;
    var ic = t.querySelector('i');
    if (ic) ic.className = type === 'success' ? 'ri-checkbox-circle-fill'
                         : type === 'error'   ? 'ri-error-warning-fill'
                         :                      'ri-information-line';
    if (tm) tm.textContent = msg;
    t.removeAttribute('hidden');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { t.setAttribute('hidden', ''); }, 4000);
  }

  function errOn(errId, inputId) {
    showEl(errId);
    var i = byId(inputId); if (i) i.classList.add('has-error');
  }
  function errOff(errId, inputId) {
    hideEl(errId);
    var i = byId(inputId); if (i) i.classList.remove('has-error');
  }

  function byId(id)      { return document.getElementById(id); }
  function getVal(id)    { var e = byId(id); return e ? e.value : ''; }
  function setText(id,v) { var e = byId(id); if (e) e.textContent = String(v); }
  function showEl(id)    { var e = byId(id); if (e) e.removeAttribute('hidden'); }
  function hideEl(id)    { var e = byId(id); if (e) e.setAttribute('hidden', ''); }

}());
