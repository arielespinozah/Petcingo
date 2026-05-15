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
  var quantity     = 1;
  var appliedPromo = null;

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

      setText('ptcg-summary-plan-name', 'Plan ' + selectedPlan.name);
      if (selectedPlan.key === 'pack') {
         setText('ptcg-summary-plan-desc', 'Incluye 3 placas por paquete');
      } else {
         setText('ptcg-summary-plan-desc', 'Incluye 1 placa inteligente');
      }
      setText('ptcg-summary-unit-price', (isIntl ? 'USD ' : '') + selectedPlan.price + (isIntl ? '' : ' Bs') + ' c/u');
      ptcgUpdateTotals();
    } else {
      banner.setAttribute('hidden', '');
    }
  }

  /* ------------------------------------------------------------------ */
  /* PRECIOS FIRESTORE                                                     */
  /* ------------------------------------------------------------------ */
  function loadPrices() {
    // Para internacional, por ahora usamos DEFAULT_USD directamente
    if (isIntl) return;
    
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
    var country = getVal('ptcg-intl-country').trim();
    var address = getVal('ptcg-intl-address').trim();
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
    
    if (!country) { errOn('ptcg-err-intl-country', 'ptcg-intl-country'); ok = false; }
    else          { errOff('ptcg-err-intl-country', 'ptcg-intl-country'); }
    
    if (!address) { errOn('ptcg-err-intl-address', 'ptcg-intl-address'); ok = false; }
    else          { errOff('ptcg-err-intl-address', 'ptcg-intl-address'); }

    if (!ok) showToast('Completa los campos requeridos', 'error');
    return ok;
  }

  /* ------------------------------------------------------------------ */
  /* DELIVERY (Internacional)                                              */
  /* ------------------------------------------------------------------ */
  // Envio esta incluido o se maneja por la pasarela de pago (Stripe/PayPal)
  deliveryFee = 0;
  deliveryType = 'international';

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

    var qrCard = byId('ptcg-qr-card');
    var bankCard = byId('ptcg-bank-card');

    if (selectedMethod.key === 'qr') {
      if (bankCard) bankCard.setAttribute('hidden', '');
      showQR();
    } else if (selectedMethod.key === 'banco') {
      if (qrCard) qrCard.setAttribute('hidden', '');
      showBankCard();
    }
  };

  /* ------------------------------------------------------------------ */
  /* QR Y TEMPORIZADOR                                                     */
  /* ------------------------------------------------------------------ */
  function showQR() {
    var qrCard = byId('ptcg-qr-card');
    if (!qrCard) return;
    qrCard.removeAttribute('hidden');
    setTimeout(function () { qrCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 120);

    ptcgUpdateTotals();

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

  function showBankCard() {
    var bankCard = byId('ptcg-bank-card');
    if (!bankCard) return;
    bankCard.removeAttribute('hidden');
    setTimeout(function () { bankCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 120);

    db.collection('config').doc('bank_info').get().then(function(snap) {
      if (snap.exists) {
        var data = snap.data();
        setText('ptcg-bank-name', data.bankName || 'Banco Union');
        setText('ptcg-bank-type', data.accountType || 'Cuenta Corriente');
        setText('ptcg-bank-account', data.accountNumber || '10000000000000');
        setText('ptcg-bank-holder', data.accountHolder || 'Petcingo SRL');
      } else {
        setText('ptcg-bank-name', 'Banco Union');
        setText('ptcg-bank-type', 'Cuenta Corriente');
        setText('ptcg-bank-account', '10000000000000');
        setText('ptcg-bank-holder', 'Petcingo SRL');
      }
    }).catch(function(){});

    ptcgUpdateTotals();
  }

  window.ptcgApplyPromo = function () {
    var input = byId('ptcg-promo-input');
    var msg = byId('ptcg-promo-msg');
    if (!input || !msg) return;
    var code = input.value.trim().toUpperCase();
    if (!code) return;

    db.collection('promotions').where('code', '==', code).limit(1).get()
      .then(function(snap) {
        if (snap.empty) {
          msg.style.display = 'block';
          msg.style.color = '#F24E4E';
          msg.textContent = 'Codigo invalido o no existe.';
          return;
        }
        var promo = snap.docs[0].data();
        var promoId = snap.docs[0].id;
        if (promo.status !== 'activo' || (promo.maxUses && promo.usedCount >= promo.maxUses)) {
          msg.style.display = 'block';
          msg.style.color = '#F24E4E';
          msg.textContent = 'Este codigo ya no es valido o ha expirado.';
          return;
        }
        appliedPromo = {
          id: promoId,
          code: promo.code,
          type: promo.type || 'percent',
          discount: promo.discount || 0
        };
        msg.style.display = 'block';
        msg.style.color = '#22C55E';
        msg.textContent = 'Codigo aplicado correctamente.';
        ptcgUpdateTotals();
      }).catch(function(err) {
        msg.style.display = 'block';
        msg.style.color = '#F24E4E';
        msg.textContent = 'Error al validar codigo.';
      });
  };

  window.ptcgUpdateQuantity = function (delta) {
    if (!selectedPlan) return;
    quantity += delta;
    if (quantity < 1) quantity = 1;
    if (quantity > 5) quantity = 5;
    
    var qtyEl = byId('ptcg-summary-qty');
    if (qtyEl) qtyEl.textContent = quantity;
    
    ptcgUpdateTotals();
  };

  function ptcgUpdateTotals() {
    if (!selectedPlan) return;
    
    var unitPrice = selectedPlan.price;
    var subtotal = unitPrice * quantity;
    var discountAmt = 0;

    if (appliedPromo) {
      if (appliedPromo.type === 'percent') {
        discountAmt = subtotal * (appliedPromo.discount / 100);
      } else {
        discountAmt = appliedPromo.discount;
      }
      if (discountAmt > subtotal) discountAmt = subtotal;
    }

    var finalTotal = subtotal - discountAmt + deliveryFee;

    setText('ptcg-summary-subtotal', subtotal + (isIntl ? ' USD' : ' Bs'));
    var discRow = byId('ptcg-summary-discount-row');
    if (discRow) {
      if (discountAmt > 0) {
        discRow.removeAttribute('hidden');
        setText('ptcg-summary-discount', '-' + discountAmt + (isIntl ? ' USD' : ' Bs'));
      } else {
        discRow.setAttribute('hidden', '');
      }
    }
    setText('ptcg-summary-shipping', deliveryFee + (isIntl ? ' USD' : ' Bs'));
    setText('ptcg-summary-total', finalTotal + (isIntl ? ' USD' : ' Bs'));

    var amtText = isIntl ? 'USD ' + finalTotal : finalTotal + ' Bs';

    var amtEl = byId('ptcg-qr-amount');
    if (amtEl) amtEl.textContent = amtText;
    var bankAmt = byId('ptcg-bank-amount');
    if (bankAmt) bankAmt.textContent = amtText;

    drawQrCanvas(finalTotal);
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
      var city  = getVal('ptcg-intl-country').trim();
      var addr  = getVal('ptcg-intl-address').trim();

      var unitPrice = selectedPlan.price;
      var subtotal = unitPrice * quantity;
      var discountAmt = 0;
      if (appliedPromo) {
        discountAmt = appliedPromo.type === 'percent' ? subtotal * (appliedPromo.discount / 100) : appliedPromo.discount;
        if (discountAmt > subtotal) discountAmt = subtotal;
      }
      var finalTotal = subtotal - discountAmt + deliveryFee;

      var totalPets = selectedPlan.key === 'pack' ? quantity * 3 : quantity;
      var createdCodes = [];
      for (var i = 0; i < totalPets; i++) {
        var code = (i === 0) ? activationCode : genCode();
        createdCodes.push(code);
      }

      var orderData = {
        activationCode: activationCode,
        activationCodes: createdCodes,
        plan:           selectedPlan.key,
        planName:       selectedPlan.name,
        price:          selectedPlan.price,
        quantity:       quantity,
        subtotal:       subtotal,
        discount:       discountAmt,
        promoCode:      appliedPromo ? appliedPromo.code : null,
        deliveryFee:    deliveryFee,
        total:          finalTotal,
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

      for (var j = 0; j < createdCodes.length; j++) {
        batch.set(db.collection('pets').doc(createdCodes[j]), {
          activationCode: createdCodes[j],
          status:         'reserved',
          plan:           selectedPlan.key,
          orderId:        oRef.id,
          createdAt:      now
        });
      }

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

      if (appliedPromo) {
        batch.update(db.collection('promotions').doc(appliedPromo.id), {
          usedCount: firebase.firestore.FieldValue.increment(1)
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
