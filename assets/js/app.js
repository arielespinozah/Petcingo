/* PETCINGO app.js — v20260428-CLEAN */
console.log('[Petcingo] app.js v20260428-CLEAN loaded OK');
/* ═══════════════════════════════════════════════════════════════
   PETCINGO — app.js
   Unified JS for all pages. Each page calls its own init function
   after the DOM is ready.
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── Firebase Config ──────────────────────────────────────────── */
var FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAEE3yLFFsJTMORNFLYZWW2_DNHwzF0hE8',
  authDomain:        'petcingo-43096.firebaseapp.com',
  projectId:         'petcingo-43096',
  storageBucket:     'petcingo-43096.firebasestorage.app',
  messagingSenderId: '679546185536',
  appId:             '1:679546185536:web:ceccd210b7c73b296f7ca5'
};
var MASTER_PASSWORD = 'Petcingo2024';

/* lazy init — called once on first use */
var _db = null;
var _storage = null;
function db() {
  if (!_db) {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.firestore();
  }
  return _db;
}
function storage() {
  if (!_storage) {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _storage = firebase.storage();
  }
  return _storage;
}

/* ══════════════════════════════════════════════════════════════
   SHARED UTILITIES
══════════════════════════════════════════════════════════════ */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function encodeData(obj) {
  /* Safe JSON for onclick attribute — escapes single quotes */
  try { return JSON.stringify(obj).replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }
  catch(e) { return '{}'; }
}

function formatDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return '—';
  return d.toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' });
}

function formatDateTime(d) {
  if (!(d instanceof Date) || isNaN(d)) return '—';
  return d.toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' }) +
    ' ' + d.toLocaleTimeString('es-BO', { hour:'2-digit', minute:'2-digit' });
}

var _toastTimer;
function toast(msg, duration) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.classList.remove('show'); }, duration || 2800);
}

function animCount(elId, target) {
  var el = document.getElementById(elId);
  if (!el) return;
  var start = 0, dur = 600, t0 = null;
  (function step(ts) {
    if (!t0) t0 = ts;
    var p = Math.min((ts - t0) / dur, 1);
    var ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * ease);
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}

/* ── Phone normalization ────────────────────────────────────── */
function buildPhone(fieldId, selectorId) {
  var raw     = document.getElementById(fieldId).value.trim();
  if (!raw) return '';
  var sel     = document.getElementById(selectorId);
  var iso     = sel ? sel.value : 'BO';
  var codeMap = { BO:'+591',AR:'+54',BR:'+55',CL:'+56',CO:'+57',EC:'+593',MX:'+52',PE:'+51',PY:'+595',UY:'+598',VE:'+58',ES:'+34',US:'+1' };
  var code    = codeMap[iso] || '+591';
  return code + raw.replace(/\D/g,'');
}

function normalizeWA(raw) {
  if (!raw) return '';
  var digits = raw.replace(/\D/g,'');
  if (!digits) return '';
  if (!digits.startsWith('591')) digits = '591' + digits;
  return digits;
}

/* ── Image compression ─────────────────────────────────────── */
function compressImage(file, maxWidth, startQ, targetBytes) {
  maxWidth    = maxWidth    || 600;
  startQ      = startQ      || 0.78;
  targetBytes = targetBytes || 100000;
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onerror = function() { reject(new Error('No se pudo leer el archivo.')); };
    reader.onload  = function(evt) {
      var img = new Image();
      img.onerror = function() { reject(new Error('Imagen inválida.')); };
      img.onload  = function() {
        var canvas = document.createElement('canvas');
        var w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxWidth) { h = Math.round(h * (maxWidth / w)); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var iterate = function(q) {
          canvas.toBlob(function(blob) {
            if (!blob) { reject(new Error('Error al comprimir.')); return; }
            if (blob.size > targetBytes && q > 0.28) iterate(+(q - 0.08).toFixed(2));
            else resolve(blob);
          }, 'image/jpeg', q);
        };
        iterate(startQ);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ── Export / Backup ───────────────────────────────────────── */
function exportDatabase(collectionName) {
  toast('Exportando ' + collectionName + '…');
  db().collection(collectionName).get()
    .then(function(snap) {
      var arr = [];
      snap.forEach(function(doc) {
        var d = doc.data();
        /* Convert Firestore Timestamps to ISO strings */
        Object.keys(d).forEach(function(k) {
          if (d[k] && typeof d[k].toDate === 'function') d[k] = d[k].toDate().toISOString();
        });
        arr.push(Object.assign({ _id: doc.id }, d));
      });
      downloadJson(JSON.stringify(arr, null, 2), collectionName + '_backup_' + new Date().toISOString().slice(0,10) + '.json');
      toast('✅ ' + arr.length + ' registros exportados.');
    })
    .catch(function(e) { toast('❌ Error: ' + e.message); });
}

function downloadJson(jsonStr, filename) {
  var blob = new Blob([jsonStr], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD — ADMIN
══════════════════════════════════════════════════════════════ */
var _dash = {
  allPets:       [],
  allSellers:    {},
  qrInstance:    null,
  currentQrId:   '',
  vetQr:         null,
  currentVet:    null,
  shelterQr:     null,
  currentShelter:null,
  regQr:         null,
  showingTrash:  false,
  currentUser:   null,
  editingUserId: null
};

/* ── Login ────────────────────────────────────────────────── */
window.doLogin = function() {
  var pass  = document.getElementById('login-pass').value;
  var errEl = document.getElementById('login-err');
  errEl.style.display = 'none';
  console.log('doLogin: intentando, longitud=' + pass.length);

  if (pass === MASTER_PASSWORD) {
    _dash.currentUser = { name:'Admin', role:'admin', permissions:{ dashboard:true, register:true, pets:true, vets:true, shelters:true, settings:true } };
    enterDashboard();
    return;
  }

  db().collection('users').where('password','==',pass).limit(1).get()
    .then(function(snap) {
      if (!snap.empty) {
        var d = snap.docs[0].data();
        _dash.currentUser = { name: d.username || 'Usuario', role:'user', permissions: d.permissions || { dashboard:true, register:true, pets:true } };
        enterDashboard();
        return;
      }
      return db().collection('staff').where('password','==',pass).limit(1).get()
        .then(function(snap2) {
          if (!snap2.empty) {
            _dash.currentUser = { name: snap2.docs[0].data().name || 'Empleado', role:'user', permissions:{ dashboard:true, register:true, pets:true } };
            enterDashboard();
          } else {
            errEl.style.display = 'block';
            document.getElementById('login-pass').value = '';
            document.getElementById('login-pass').focus();
          }
        });
    })
    .catch(function() { errEl.style.display = 'block'; document.getElementById('login-pass').value = ''; });
};

function enterDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display    = 'block';
  applyPermissions();
  initDashboard();
  addLog('login', _dash.currentUser.name, 'sistema');
}

function applyPermissions() {
  if (!_dash.currentUser) return;
  var perms = _dash.currentUser.permissions;
  document.querySelectorAll('.nav-item[data-perm]').forEach(function(btn) {
    var perm = btn.getAttribute('data-perm');
    btn.style.display = (perm && perms[perm] === false) ? 'none' : '';
  });
}

window.doLogout = function() {
  document.getElementById('dashboard').style.display     = 'none';
  document.getElementById('login-screen').style.display  = 'flex';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-pass').focus();
  _dash.allPets = []; _dash.allSellers = {};
  _dash.currentVet = null; _dash.currentShelter = null;
  _dash.currentUser = null; _dash.regQr = null;
};

function initDashboard() {
  loadSettings();
  loadSellersCache();
  loadRegisterSelect();
  loadStats();
  loadRecent();
  loadPets();
  loadVets();
  loadShelters();
  loadUsers();
  loadLogs();
  applyTheme(localStorage.getItem('petcingo_theme') || 'dark');
}

/* ── Navigation ──────────────────────────────────────────── */
window.showSection = function(name, btn) {
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var sec = document.getElementById('sec-' + name);
  if (sec) sec.classList.add('active');
  if (btn) btn.classList.add('active');
  closeSidebar();
  /* Lazy load for scan-heavy sections */
  if (name === 'logs') loadLogs();
  if (name === 'users') loadUsers();
};

window.toggleSidebar = function() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
};
window.closeSidebar = function() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
};

/* ── Stats ──────────────────────────────────────────────── */
function loadStats() {
  db().collection('pets').get().then(function(snap) {
    var total=0, activos=0, reservadas=0, perdidos=0, vencidas=0;
    var now = new Date();
    snap.forEach(function(doc) {
      var d = doc.data();
      if (d.status === 'deleted') return;
      total++;
      if      (d.status === 'perdido')   { perdidos++; }
      else if (d.status === 'reservada') { reservadas++; }
      else if (d.status === 'activo' || (!d.status)) {
        /* Check subscription */
        var isExp = false;
        if (d.subscription && d.subscription.expiresAt) {
          var exp = d.subscription.expiresAt.toDate ? d.subscription.expiresAt.toDate() : new Date(d.subscription.expiresAt);
          if (exp < now) isExp = true;
        }
        if (isExp) vencidas++;
        else activos++;
      }
    });
    animCount('stat-total',     total);
    animCount('stat-active',    activos);
    animCount('stat-lost',      perdidos);
    animCount('stat-expired',   vencidas);
    /* Extra labels shown below each stat */
    var resEl = document.getElementById('stat-reserved-label');
    if (resEl) resEl.textContent = reservadas + ' reservadas';
  }).catch(function(e) { console.error('loadStats:', e.message); });
}

function loadRecent() {
  db().collection('pets').orderBy('createdAt','desc').limit(5).get()
    .then(function(snap) {
      var el = document.getElementById('recent-list');
      if (!el) return;
      if (snap.empty) { el.innerHTML='<div class="empty-state"><p>No hay registros aún.</p></div>'; return; }
      var html='<table style="width:100%;border-collapse:collapse;font-size:.83rem"><thead><tr>'+
        '<th style="text-align:left;padding:8px;color:var(--muted-dark);font-size:.68rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Mascota</th>'+
        '<th style="text-align:left;padding:8px;color:var(--muted-dark);font-size:.68rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Estado</th>'+
        '<th style="text-align:left;padding:8px;color:var(--muted-dark);font-size:.68rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Fecha</th>'+
        '</tr></thead><tbody>';
      snap.forEach(function(doc) {
        var d=doc.data();
        var bCls=d.status==='perdido'?'badge-lost':'badge-active';
        var bTxt=d.status==='perdido'?'Perdido':'Activo';
        var fecha=d.createdAt&&d.createdAt.toDate?formatDate(d.createdAt.toDate()):'—';
        html+='<tr style="border-bottom:1px solid rgba(255,255,255,.04)">'+
          '<td style="padding:9px 8px"><span style="font-weight:600">'+esc(d.name||'—')+'</span><br><span style="color:var(--muted-dark);font-size:.75rem">'+esc(d.ownerName||'')+'</span></td>'+
          '<td style="padding:9px 8px"><span class="badge '+bCls+'">'+bTxt+'</span></td>'+
          '<td style="padding:9px 8px;color:var(--muted-dark)">'+fecha+'</td></tr>';
      });
      html+='</tbody></table>';
      el.innerHTML=html;
    }).catch(function(e) { console.error('loadRecent:', e.message); });
}

/* ── Pets table ─────────────────────────────────────────── */
window.loadPets = function() {
  var tbody=document.getElementById('pets-tbody');
  if (!tbody) return;
  tbody.innerHTML='<tr><td colspan="6"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div><p style="margin-top:10px">Cargando…</p></div></td></tr>';
  document.getElementById('table-count').textContent='';
  db().collection('pets').orderBy('createdAt','desc').get()
    .then(function(snap) {
      _dash.allPets=[];
      snap.forEach(function(doc) { var d=doc.data(); d._id=doc.id; _dash.allPets.push(d); });
      renderTable(_dash.allPets);
    }).catch(function(e) { tbody.innerHTML='<tr><td colspan="6"><div class="empty-state"><p>Error: '+esc(e.message)+'</p></div></td></tr>'; });
};

window.filterTable = function() {
  var q      = (document.getElementById('search-input').value||'').toLowerCase().trim();
  var status = document.getElementById('filter-status').value;
  var seller = document.getElementById('filter-seller').value;

  var filtered = _dash.allPets.filter(function(d) {
    if (_dash.showingTrash) return d.status === 'deleted';
    if (d.status === 'deleted') return false;
    var id    = (d._id||d.id||'').toLowerCase();
    var name  = (d.name||'').toLowerCase();
    var owner = (d.ownerName||'').toLowerCase();
    var matchQ  = !q || id.includes(q)||name.includes(q)||owner.includes(q);
    var matchSt = !status || d.status === status;
    var matchSl = !seller || d.sellerId === seller;
    return matchQ && matchSt && matchSl;
  });
  renderTable(filtered);
};

function renderTable(pets) {
  var tbody = document.getElementById('pets-tbody');
  if (!tbody) return;
  if (!pets.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="es-icon">X</div><p>' + (_dash.showingTrash ? 'Papelera vacia.' : 'No hay mascotas.') + '</p></div></td></tr>';
    var cnt = document.getElementById('table-count'); if (cnt) cnt.textContent = '';
    return;
  }
  var ACT  = 'https://prueb2.dashnexpages.net/activacion/?id=';
  var PERF = 'https://prueb2.dashnexpages.net/id/?id=';
  var CLI  = 'https://prueb2.dashnexpages.net/cliente/?id=';
  var rows = [], now = new Date();
  pets.forEach(function(d) {
    var id = d._id || d.id || '';
    if (!id) return;
    var bCls = 'badge-active', bTxt = 'Activo';
    if      (d.status === 'reservada') { bCls = 'badge-reserved'; bTxt = 'Reservada'; }
    else if (d.status === 'deleted')   { bCls = 'badge-expired';  bTxt = 'Papelera'; }
    else if (d.status === 'perdido')   { bCls = 'badge-lost';     bTxt = 'Perdido'; }
    else if (d.subscription && d.subscription.expiresAt) {
      var exp = d.subscription.expiresAt.toDate ? d.subscription.expiresAt.toDate() : new Date(d.subscription.expiresAt);
      if (exp < now) { bCls = 'badge-expired'; bTxt = 'Vencida'; }
    }
    var btns = [];
    if (d.status === 'deleted') {
      btns.push('<button class="btn btn-ghost btn-sm" onclick="restorePet(\'' + esc(id) + '\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-arrow-left-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Restaurar</button>');
      btns.push('<button class="btn-danger-outline" onclick="permanentDelete(\'' + esc(id) + '\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"></button>');
    } else if (d.status === 'reservada') {
      btns.push('<a href="' + ACT + encodeURIComponent(id) + '" target="_blank" class="btn btn-ghost btn-sm"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-qr-bold.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Ver placa</a>');
      btns.push('<button class="btn-danger-outline" onclick="archivePet(\'' + esc(id) + '\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"></button>');
    } else {
      btns.push('<a href="' + PERF + encodeURIComponent(id) + '" target="_blank" class="btn btn-ghost btn-sm"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-eye-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Ver perfil</a>');
      if (d.editToken) btns.push('<a href="' + CLI + encodeURIComponent(id) + '" target="_blank" class="btn btn-ghost btn-sm"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-user-bold.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"></a>');
      btns.push('<button class="btn-danger-outline" onclick="archivePet(\'' + esc(id) + '\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"></button>');
    }
    var fecha = d.createdAt && d.createdAt.toDate ? formatDate(d.createdAt.toDate()) : '';
    rows.push('<tr><td class="td-id">' + esc(id) + '</td><td class="td-name">' + esc(d.name || '') + '</td><td class="td-owner">' + esc(d.ownerName || d.phone || '') + '</td><td><span class="badge ' + bCls + '">' + bTxt + '</span></td><td class="td-date">' + fecha + '</td><td class="td-actions">' + btns.join('') + '</td></tr>');
  });
  tbody.innerHTML = rows.join('');
  var cnt2 = document.getElementById('table-count');
  if (cnt2) cnt2.textContent = 'Mostrando ' + pets.length + (_dash.showingTrash ? ' en papelera' : ' de ' + _dash.allPets.length + ' mascotas');
}

window.toggleTrash = function() {
  _dash.showingTrash = !_dash.showingTrash;
  var btn = document.getElementById('btn-trash');
  if (btn) {
    btn.innerHTML = _dash.showingTrash ? '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-arrow-left-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Ver Activas' : '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Papelera';
    btn.style.color = _dash.showingTrash ? 'var(--success)' : 'var(--error)';
  }
  var h2 = document.querySelector('#sec-pets .page-header h2');
  if (h2) h2.innerHTML = _dash.showingTrash ? '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Papelera' : '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-paw-bold.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Mascotas Registradas';
  filterTable();
};

window.archivePet = function(id) {
  if (!confirm('¿Mover "'+id+'" a la papelera? Se puede restaurar después.')) return;
  db().collection('pets').doc(id).update({ status:'deleted', deletedAt:firebase.firestore.FieldValue.serverTimestamp() })
    .then(function() { toast('🗑 Placa movida a papelera.'); addLog('archived_pet',id,_dash.currentUser&&_dash.currentUser.name); loadPets(); })
    .catch(function(e) { toast('❌ '+e.message); });
};

window.restorePet = function(id) {
  db().collection('pets').doc(id).update({ status:'reservada', deletedAt:null })
    .then(function() { toast('✅ Restaurada.'); addLog('restored_pet',id,_dash.currentUser&&_dash.currentUser.name); loadPets(); })
    .catch(function(e) { toast('❌ '+e.message); });
};

window.permanentDelete = function(id) {
  if (!confirm('⚠️ ¿Eliminar PERMANENTEMENTE "'+id+'"?\n\nEsta acción NO se puede deshacer.')) return;
  db().collection('pets').doc(id).delete()
    .then(function() { toast('💥 Eliminada permanentemente.'); addLog('permanent_delete',id,_dash.currentUser&&_dash.currentUser.name); loadPets(); })
    .catch(function(e) { toast('❌ '+e.message); });
};

/* ── Sellers cache (for filter) ─────────────────────────── */
function loadSellersCache() {
  var sel = document.getElementById('filter-seller');
  if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  _dash.allSellers = {};
  Promise.all([db().collection('veterinarias').orderBy('name').get(), db().collection('shelters').orderBy('name').get()])
    .then(function(results) {
      var addGrp = function(snap, label, col) {
        if (!snap||snap.empty) return;
        var g=document.createElement('option'); g.disabled=true; g.textContent='── '+label+' ──'; sel.appendChild(g);
        snap.forEach(function(doc) {
          var d=doc.data(); _dash.allSellers[doc.id]={ name:d.name, prefix:d.prefix||'' };
          var o=document.createElement('option'); o.value=doc.id; o.textContent=d.name+(d.prefix?' ['+d.prefix+']':''); sel.appendChild(o);
        });
      };
      addGrp(results[0],'Veterinarias','veterinarias');
      addGrp(results[1],'Refugios','shelters');
    }).catch(function(){});
}

/* ── Register Plate (sec-register) ─────────────────────── */
function loadRegisterSelect() {
  var sel = document.getElementById('reg-seller-select');
  if (!sel) return;
  /* Clone to remove stale listeners */
  var newSel = sel.cloneNode(false);
  newSel.id = 'reg-seller-select'; newSel.className = sel.className;
  sel.parentNode.replaceChild(newSel, sel); sel = newSel;

  /* Placeholder */
  var ph = document.createElement('option'); ph.value=''; ph.textContent='— Selecciona un cliente —'; sel.appendChild(ph);

  /* Directo */
  db().collection('config').doc('admin_settings').get().then(function(cfgDoc) {
    var directCount = (cfgDoc.exists && cfgDoc.data().directCount) ? cfgDoc.data().directCount : 0;
    var di = document.createElement('option');
    di.value = JSON.stringify({ id:'__direct__', name:'Petcingo Directo', prefix:'PET', lastCount:directCount, collection:'__direct__' });
    di.textContent = '[PET] ★ Petcingo Directo'; sel.appendChild(di);

    var sep = document.createElement('option'); sep.disabled=true; sep.textContent='──────────────'; sel.appendChild(sep);

    return Promise.all([db().collection('veterinarias').orderBy('name').get(), db().collection('shelters').orderBy('name').get()]);
  }).then(function(results) {
    if (!results) return;
    var addGrp = function(snap, label, col) {
      if (!snap||snap.empty) return;
      var g=document.createElement('option'); g.disabled=true; g.textContent='── '+label+' ──'; sel.appendChild(g);
      snap.forEach(function(doc) {
        var d=doc.data();
        var o=document.createElement('option');
        o.value=JSON.stringify({ id:doc.id, name:d.name, prefix:d.prefix||'', lastCount:d.lastCount||0, collection:col });
        o.textContent='['+(d.prefix||'?')+'] '+d.name; sel.appendChild(o);
      });
    };
    addGrp(results[0],'Veterinarias','veterinarias');
    addGrp(results[1],'Refugios','shelters');
  }).catch(function(){});

  sel.addEventListener('change', function() {
    var info=document.getElementById('reg-seller-info'), nextEl=document.getElementById('reg-next-id');
    if (!sel.value) { if(info) info.style.display='none'; return; }
    try {
      var data=JSON.parse(sel.value);
      if (!data.prefix) { if(info) info.style.display='none'; return; }
      /* Show random-format ID sample (actual ID generated at creation time) */
      if (nextEl) nextEl.textContent = data.prefix+'-'+Math.random().toString(36).slice(2,6).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase();
      if (info) info.style.display='block';
    } catch(e) { if(info) info.style.display='none'; }
  });
}

window.registerPlate = function() {
  var sel = document.getElementById('reg-seller-select');
  if (!sel||!sel.value) { toast('⚠️ Selecciona un cliente primero.'); return; }
  var sellerData;
  try { sellerData=JSON.parse(sel.value); } catch(e) { toast('Error al leer el cliente.'); return; }
  if (!sellerData.prefix) { toast('⚠️ Este cliente no tiene prefijo configurado.'); return; }

  var btn = document.querySelector('#sec-register .btn-primary');
  if (btn) { btn.disabled=true; btn.innerHTML='<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-refresh-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Reservando…'; }

  var isDirect = sellerData.collection === '__direct__';

  var getFreshCount = isDirect
    ? db().collection('config').doc('admin_settings').get().then(function(doc) { return (doc.exists&&doc.data().directCount)||0; })
    : db().collection(sellerData.collection).doc(sellerData.id).get().then(function(doc) { return doc.data().lastCount||0; });

  getFreshCount.then(function(freshCount) {
    var next=freshCount+1;
    /* ID no predecible: prefijo-contador+sufijo aleatorio */
    var newId=Math.random().toString(36).slice(2,6).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase();
    var profileUrl='https://prueb2.dashnexpages.net/activacion/?id='+encodeURIComponent(newId);
    var petReserva={ id:newId, status:'reservada', sellerId:isDirect?null:sellerData.id, sellerName:sellerData.name, createdAt:firebase.firestore.FieldValue.serverTimestamp() };

    return db().collection('pets').doc(newId).set(petReserva).then(function() {
      var incTarget = isDirect
        ? db().collection('config').doc('admin_settings').set({ directCount:firebase.firestore.FieldValue.increment(1) },{ merge:true })
        : db().collection(sellerData.collection).doc(sellerData.id).update({ lastCount:firebase.firestore.FieldValue.increment(1) });
      return incTarget.then(function() { return { newId:newId, profileUrl:profileUrl, next:next }; });
    });
  }).then(function(res) {
    _generateRegQR(res.newId, res.profileUrl, res.next, sellerData);
    addLog('reserved_plate', res.newId, _dash.currentUser&&_dash.currentUser.name);
    toast('✅ Placa '+res.newId+' reservada para '+sellerData.name);
    loadSellersCache();
  }).catch(function(err) { toast('❌ '+err.message); })
    .finally(function() { if(btn){ btn.disabled=false; btn.innerHTML='<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-add-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Crear y Reservar Placa'; } });
};

function _generateRegQR(newId, profileUrl, next, sellerData) {
  var display = document.getElementById('reg-qr-display');
  if (!display) return;
  display.innerHTML='';
  var wrap=document.createElement('div'); wrap.className='qr-canvas-wrap';
  var cd=document.createElement('div'); cd.id='reg-qr-canvas'; wrap.appendChild(cd);
  var lbl=document.createElement('div'); lbl.className='qr-id-label'; lbl.textContent=newId; wrap.appendChild(lbl);
  display.appendChild(wrap);
  try { _dash.regQr=new QRCode(cd,{ text:profileUrl, width:220, height:220, colorDark:'#1a0533', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.H }); }
  catch(e) { toast('Error QR: '+e.message); return; }

  var idEl=document.getElementById('reg-result-id');
  var res =document.getElementById('reg-result');
  var nextEl=document.getElementById('reg-next-id');
  if(idEl) idEl.textContent=newId;
  if(res) { res.style.display='block'; res.setAttribute('data-url', profileUrl); }
  if(nextEl) nextEl.textContent=(sellerData.prefix||'PET')+'-'+Math.random().toString(36).slice(2,6).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase();
}

window.registerNextFast = function() {
  var sel = document.getElementById('reg-seller-select');
  if (!sel||!sel.value) { toast('⚠️ No hay cliente seleccionado.'); return; }
  var res = document.getElementById('reg-result');
  if (res) res.style.display='none';
  window.registerPlate();
};

window.resetRegister = function() {
  var res=document.getElementById('reg-result');
  var info=document.getElementById('reg-seller-info');
  var disp=document.getElementById('reg-qr-display');
  if(res) res.style.display='none';
  if(info) info.style.display='none';
  if(disp) disp.innerHTML='<div style="text-align:center;color:var(--muted-dark);padding:48px 20px"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-qr-bold.svg" width="64" height="64" style="opacity:.15;display:block;margin-bottom:12px;filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"><p style="font-size:.85rem">El QR aparecerá aquí</p></div>';
  _dash.regQr=null; loadRegisterSelect();
};

window.downloadRegQR = function() {
  var el=document.querySelector('#reg-qr-canvas canvas')||document.querySelector('#reg-qr-canvas img');
  var idTxt=(document.getElementById('reg-result-id')||{}).textContent||'placa';
  _downloadQREl(el,'petcingo-qr-'+idTxt+'.png');
};

window.copyRegLink = function() {
  var res=document.getElementById('reg-result');
  var url=res?res.getAttribute('data-url'):'';
  if (!url) { toast('No hay enlace.'); return; }
  navigator.clipboard.writeText(url).then(function() { toast('📋 Enlace copiado'); });
};

window.toggleCustomQR = function() {
  var w=document.getElementById('custom-qr-wrap'), d=document.getElementById('qr-display');
  if(w) w.style.display=w.style.display==='none'?'block':'none';
  if(d) d.style.display=d.style.display==='none'?'block':'none';
};

/* ── Vets ───────────────────────────────────────────────── */
window.saveVet = function() {
  var name   =document.getElementById('vet-name').value.trim();
  var contact=document.getElementById('vet-contact').value.trim();
  var prefix =document.getElementById('vet-prefix').value.trim().toUpperCase().replace(/\s/g,'');
  if (!name)    { toast('⚠️ El nombre es obligatorio.'); return; }
  if (!contact) { toast('⚠️ El contacto es obligatorio.'); return; }
  if (!prefix)  { toast('⚠️ El Prefijo de Placa es OBLIGATORIO (ej: VET-LP).'); return; }

  var btn=document.getElementById('btn-save-vet');
  if(btn){btn.disabled=true;btn.textContent='Guardando…';}

  db().collection('veterinarias').add({
    name:name, contact:contact, prefix:prefix, lastCount:0,
    phone:document.getElementById('vet-phone').value.trim(),
    city:document.getElementById('vet-city').value.trim(),
    email:document.getElementById('vet-email').value.trim(),
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    toast('✅ Veterinaria registrada.');
    ['vet-name','vet-contact','vet-prefix','vet-phone','vet-city','vet-email'].forEach(function(id){ var el=document.getElementById(id); if(el)el.value=''; });
    loadVets(); loadSellersCache(); loadRegisterSelect();
    addLog('created_vet',name,_dash.currentUser&&_dash.currentUser.name);
  }).catch(function(e){toast('❌ '+e.message);})
    .finally(function(){if(btn){btn.disabled=false;btn.textContent='Guardar Veterinaria';}});
};

function loadVets() {
  var tbody=document.getElementById('vets-tbody');
  if(!tbody)return;
  tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div></td></tr>';
  db().collection('veterinarias').orderBy('createdAt','desc').get()
    .then(function(snap) {
      var countEl=document.getElementById('vets-count');
      if(countEl)countEl.textContent=snap.size+' veterinaria(s)';
      if(snap.empty){tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><p>No hay veterinarias aún.</p></div></td></tr>';return;}
      var html='';
      snap.forEach(function(doc){
        var d=doc.data(), fecha=d.createdAt&&d.createdAt.toDate?formatDate(d.createdAt.toDate()):'—';
        var prefBadge=d.prefix?'<span style="background:rgba(192,132,252,.12);border:1px solid rgba(192,132,252,.25);border-radius:6px;padding:2px 8px;font-size:.75rem;color:#c084fc;font-family:monospace">'+esc(d.prefix)+'</span>':'—';
        html+='<tr><td class="td-name">'+esc(d.name||'—')+'</td><td>'+prefBadge+'</td><td>'+esc(d.contact||'—')+'</td>'+
          '<td class="td-owner">'+esc(d.city||'—')+'</td><td class="td-owner">'+esc(d.phone||'—')+'</td>'+
          '<td class="td-date">'+fecha+'</td>'+
          '<td class="td-actions"><button class="btn btn-ghost btn-sm" onclick="openVetDetail(\''+doc.id+'\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-settings-bold.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Gestionar</button>'+
          '<button class="btn-danger-outline" onclick="deleteRecord(\'veterinarias\',\''+doc.id+'\',\'loadVets\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"></button></td></tr>';
      });
      tbody.innerHTML=html;
    }).catch(function(e){tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><p>Error: '+esc(e.message)+'</p></div></td></tr>';});
}
window.loadVets=loadVets;

/* ── Vet Detail ─────────────────────────────────────────── */
window.openVetDetail = function(vetId) {
  db().collection('veterinarias').doc(vetId).get().then(function(doc) {
    if(!doc.exists){toast('No encontrado.');return;}
    var d=doc.data();
    _dash.currentVet={ id:vetId, name:d.name, prefix:d.prefix||'', lastCount:d.lastCount||0 };
    var titleEl=document.getElementById('vet-detail-title');
    var prefEl=document.getElementById('vet-detail-prefix');
    if(titleEl)titleEl.textContent='Gestionando: '+d.name;
    if(prefEl)prefEl.textContent='Prefijo: '+(d.prefix||'sin prefijo');
    refreshVetCounter(); loadVetPets();
    var disp=document.getElementById('vet-qr-display');
    if(disp)disp.innerHTML='<div style="text-align:center;color:var(--muted-dark);padding:48px 20px"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-qr-bold.svg" width="64" height="64" style="opacity:.2;display:block;margin-bottom:12px;filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"><p style="font-size:.85rem">El QR aparecerá aquí</p></div>';
    var res=document.getElementById('vet-qr-result');
    if(res)res.style.display='none';
    _dash.vetQr=null;
    showSection('vet-detail',null);
  }).catch(function(e){toast('Error: '+e.message);});
};

window.refreshVetCounter = function() {
  if(!_dash.currentVet)return;
  db().collection('veterinarias').doc(_dash.currentVet.id).get().then(function(doc) {
    if(!doc.exists)return;
    _dash.currentVet.lastCount=doc.data().lastCount||0;
    var el=document.getElementById('vet-next-id');
    if(el)el.textContent=_dash.currentVet.prefix+'-'+Math.random().toString(36).slice(2,6).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase();
  });
};

window.generateVetQR = function() {
  if(!_dash.currentVet)return;
  var next=_dash.currentVet.lastCount+1;
  var _rs2=Math.random().toString(36).slice(2,6).toUpperCase();
  var newId=_rs2+Math.random().toString(36).slice(2,4).toUpperCase();
  var profileUrl='https://prueb2.dashnexpages.net/activacion/?id='+encodeURIComponent(newId);
  var display=document.getElementById('vet-qr-display');
  if(!display)return;
  display.innerHTML='';
  var wrap=document.createElement('div');wrap.className='qr-canvas-wrap';
  var cd=document.createElement('div');cd.id='vet-qr-canvas';wrap.appendChild(cd);
  var lbl=document.createElement('div');lbl.className='qr-id-label';lbl.textContent=newId;wrap.appendChild(lbl);
  display.appendChild(wrap);
  try{_dash.vetQr=new QRCode(cd,{text:profileUrl,width:220,height:220,colorDark:'#1a0533',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});}
  catch(e){toast('Error QR: '+e.message);return;}
  db().collection('veterinarias').doc(_dash.currentVet.id).update({lastCount:firebase.firestore.FieldValue.increment(1)})
    .then(function(){_dash.currentVet.lastCount=next;var el=document.getElementById('vet-next-id');if(el)el.textContent=_dash.currentVet.prefix+'-'+Math.random().toString(36).slice(2,6).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase();});
  /* Also reserve in pets */
  db().collection('pets').doc(newId).set({id:newId,status:'reservada',sellerId:_dash.currentVet.id,sellerName:_dash.currentVet.name,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  var links=document.getElementById('vet-qr-links');
  if(links){var safeUrl=profileUrl.replace(/'/g,"\\'");links.innerHTML='<div class="qr-link-row"><div class="qr-link-label">Perfil Público</div><div class="qr-link-url">'+esc(profileUrl)+'</div><button class="qr-link-copy" onclick="copyText(\''+safeUrl+'\',\'URL copiada\')">📋 Copiar</button></div>';}
  var res=document.getElementById('vet-qr-result');if(res)res.style.display='block';
  toast('✅ Placa creada: '+newId);
};

window.downloadVetQR = function() {
  var el=document.querySelector('#vet-qr-canvas canvas')||document.querySelector('#vet-qr-canvas img');
  _downloadQREl(el,'petcingo-'+(_dash.currentVet&&_dash.currentVet.prefix||'vet')+'-qr.png');
};

window.loadVetPets = function() {
  if(!_dash.currentVet)return;
  var tbody=document.getElementById('vet-pets-tbody');
  var countEl=document.getElementById('vet-pets-count');
  if(!tbody)return;
  tbody.innerHTML='<tr><td colspan="6"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div></td></tr>';
  db().collection('pets').where('sellerId','==',_dash.currentVet.id).orderBy('createdAt','desc').get()
    .then(function(snap){
      if(countEl)countEl.textContent=snap.size+' placa(s)';
      if(snap.empty){tbody.innerHTML='<tr><td colspan="6"><div class="empty-state"><p>Sin placas vinculadas.</p></div></td></tr>';return;}
      var html='';
      snap.forEach(function(doc){
        var d=doc.data(),id=doc.id;
        var bCls=d.status==='perdido'?'badge-lost':d.status==='reservada'?'badge-reserved':'badge-active';
        var bTxt=d.status==='perdido'?'Perdido':d.status==='reservada'?'Reservada':'Activo';
        var fecha=d.createdAt&&d.createdAt.toDate?formatDate(d.createdAt.toDate()):'—';
        html+='<tr><td class="td-id">'+esc(id)+'</td><td class="td-name">'+esc(d.name||'—')+'</td><td class="td-owner">'+esc(d.ownerName||'—')+'</td>'+
          '<td><span class="badge '+bCls+'">'+bTxt+'</span></td><td class="td-date">'+fecha+'</td>'+
          '<td class="td-actions"><a href="https://prueb2.dashnexpages.net/id/?id='+encodeURIComponent(id)+'" target="_blank" class="btn btn-ghost btn-sm"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-eye-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"></a></td></tr>';
      });
      tbody.innerHTML=html;
    }).catch(function(){
      if(countEl)countEl.textContent='';
      tbody.innerHTML='<tr><td colspan="6"><div class="empty-state" style="color:var(--warn);padding:20px">'+
        '<div style="font-size:28px;margin-bottom:8px">🔧</div><p><strong>Se requiere índice de Firebase.</strong></p>'+
        '<a href="https://console.firebase.google.com/v1/r/project/petcingo-43096/firestore/indexes?create_composite=Cktwcm9qZWN0cy9wZXRjaW5nby00MzA5Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcGV0cy9pbmRleGVzL18QARoMCghzZWxsZXJJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI" target="_blank" style="color:var(--primary);font-weight:600;font-size:.85rem">Haz clic aquí para crear el índice →</a>'+
        '</div></td></tr>';
    });
};

/* ── Shelters ───────────────────────────────────────────── */
window.saveShelter = function() {
  var name       =document.getElementById('sh-name').value.trim();
  var responsible=document.getElementById('sh-responsible').value.trim();
  var prefix     =document.getElementById('sh-prefix').value.trim().toUpperCase().replace(/\s/g,'');
  if(!name)       {toast('⚠️ El nombre es obligatorio.');return;}
  if(!responsible){toast('⚠️ El encargado es obligatorio.');return;}
  if(!prefix)     {toast('⚠️ El Prefijo de Placa es OBLIGATORIO (ej: REF-LP).');return;}

  var username = (document.getElementById('sh-username')||{}).value||'';
  var password = (document.getElementById('sh-password')||{}).value||'';
  var limite   = parseInt((document.getElementById('sh-limite')||{}).value||'40',10)||40;

  username = username.trim().toLowerCase().replace(/\s/g,'');
  if (password && password.length < 6) { toast('⚠️ La contraseña debe tener al menos 6 caracteres.'); return; }

  var btn=document.getElementById('btn-save-shelter');
  if(btn){btn.disabled=true;btn.textContent='Guardando…';}

  var data = {
    name:name, responsible:responsible, prefix:prefix, lastCount:0,
    phone:document.getElementById('sh-phone').value.trim(),
    address:document.getElementById('sh-address').value.trim(),
    limite_mascotas:limite,
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  if (username) data.username = username;
  if (password) data.password = password;

  db().collection('shelters').add(data)
    .then(function(){
      toast('✅ Refugio registrado.');
      ['sh-name','sh-responsible','sh-prefix','sh-phone','sh-address','sh-username','sh-password'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
      var lim=document.getElementById('sh-limite');if(lim)lim.value='40';
      loadShelters(); loadSellersCache(); loadRegisterSelect();
      addLog('created_shelter',name,_dash.currentUser&&_dash.currentUser.name);
    }).catch(function(e){toast('❌ '+e.message);})
    .finally(function(){if(btn){btn.disabled=false;btn.textContent='Guardar Refugio';}});
};

function loadShelters() {
  var tbody=document.getElementById('shelters-tbody');
  if(!tbody)return;
  tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div></td></tr>';
  db().collection('shelters').orderBy('createdAt','desc').get()
    .then(function(snap){
      var cEl=document.getElementById('shelters-count');if(cEl)cEl.textContent=snap.size+' refugio(s)';
      if(snap.empty){tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><p>No hay refugios aún.</p></div></td></tr>';return;}
      var html='';
      snap.forEach(function(doc){
        var d=doc.data(),fecha=d.createdAt&&d.createdAt.toDate?formatDate(d.createdAt.toDate()):'—';
        var prefBadge=d.prefix?'<span style="background:rgba(0,225,243,.10);border:1px solid rgba(0,225,243,.25);border-radius:6px;padding:2px 8px;font-size:.75rem;color:var(--accent);font-family:monospace">'+esc(d.prefix)+'</span>':'—';
        html+='<tr><td class="td-name">'+esc(d.name||'—')+'</td><td>'+prefBadge+'</td><td>'+esc(d.responsible||'—')+'</td>'+
          '<td class="td-owner">'+esc(d.phone||'—')+'</td><td class="td-owner" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(d.address||'—')+'</td>'+
          '<td class="td-date">'+fecha+'</td>'+
          '<td class="td-actions"><button class="btn btn-ghost btn-sm" onclick="openShelterDetail(\''+doc.id+'\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-settings-bold.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Placas</button>'+
          '<button class="btn btn-ghost btn-sm" onclick="editShelter(\''+doc.id+'\',\''+encodeData(d)+'\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-edit-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Editar</button>'+
          '<a class="btn btn-ghost btn-sm" href="https://prueb2.dashnexpages.net/refugio-panel-control/?auto='+doc.id+'" target="_blank" title="Panel del refugio"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-link-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Panel</a>'+
          '<button class="btn-danger-outline" onclick="deleteRecord(\'shelters\',\''+doc.id+'\',\'loadShelters\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"></button></td></tr>';
      });
      tbody.innerHTML=html;
    }).catch(function(e){tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><p>Error: '+esc(e.message)+'</p></div></td></tr>';});
}
window.loadShelters=loadShelters;

/* ── Edit Shelter Modal ── */
window.editShelter = function(shId, dataJson) {
  var d;
  try { d = JSON.parse(dataJson); } catch(e) { d = {}; }
  var fields = { 'es-name':d.name, 'es-responsible':d.responsible, 'es-city':d.city,
    'es-phone':d.phone, 'es-address':d.address, 'es-username':d.username,
    'es-password':'', 'es-limite':d.limite_mascotas||40 };
  Object.keys(fields).forEach(function(id){ var el=document.getElementById(id); if(el) el.value=fields[id]||''; });
  document.getElementById('es-shelter-id').value = shId;
  var modal = document.getElementById('shelter-edit-modal');
  if (modal) { modal.style.display='flex'; }
};

window.closeShelterModal = function() {
  var modal = document.getElementById('shelter-edit-modal');
  if (modal) modal.style.display='none';
};

window.updateShelter = function() {
  var shId = document.getElementById('es-shelter-id').value;
  var name = document.getElementById('es-name').value.trim();
  var username = (document.getElementById('es-username').value||'').trim().toLowerCase().replace(/\s/g,'');
  var password = (document.getElementById('es-password').value||'').trim();
  var limite   = parseInt(document.getElementById('es-limite').value||'40',10)||40;
  if (!name) { toast('⚠️ El nombre es obligatorio.'); return; }
  if (password && password.length < 6) { toast('⚠️ La contraseña debe tener al menos 6 caracteres.'); return; }

  var update = {
    name:        name,
    responsible: document.getElementById('es-responsible').value.trim(),
    city:        document.getElementById('es-city').value.trim(),
    phone:       document.getElementById('es-phone').value.trim(),
    address:     document.getElementById('es-address').value.trim(),
    limite_mascotas: limite
  };
  if (username) update.username = username;
  if (password) update.password = password;

  var btn = document.getElementById('btn-update-shelter');
  if (btn) { btn.disabled=true; btn.innerHTML='<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-refresh-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Guardando…'; }

  db().collection('shelters').doc(shId).update(update)
    .then(function() {
      toast('✅ Refugio actualizado: '+name);
      closeShelterModal();
      loadShelters();
      addLog('updated_shelter', name, _dash.currentUser&&_dash.currentUser.name);
    })
    .catch(function(e) { toast('❌ Error: '+e.message); })
    .finally(function() { if(btn){ btn.disabled=false; btn.innerHTML='<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-document-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Guardar cambios'; } });
};

/* Shelter Detail (mirror of Vet Detail) */
window.openShelterDetail = function(shId) {
  db().collection('shelters').doc(shId).get().then(function(doc){
    if(!doc.exists){toast('No encontrado.');return;}
    var d=doc.data();
    _dash.currentShelter={ id:shId, name:d.name, prefix:d.prefix||'', lastCount:d.lastCount||0 };
    var t=document.getElementById('sh-detail-title');var p=document.getElementById('sh-detail-prefix');
    if(t)t.textContent='Gestionando: '+d.name;if(p)p.textContent='Prefijo: '+(d.prefix||'sin prefijo');
    refreshShelterCounter();loadShelterPets();
    var disp=document.getElementById('sh-qr-display');
    if(disp)disp.innerHTML='<div style="text-align:center;color:var(--muted-dark);padding:48px 20px"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-qr-bold.svg" width="64" height="64" style="opacity:.2;display:block;margin-bottom:12px;filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"><p style="font-size:.85rem">El QR aparecerá aquí</p></div>';
    var res=document.getElementById('sh-qr-result');if(res)res.style.display='none';
    _dash.shelterQr=null;
    showSection('shelter-detail',null);
  }).catch(function(e){toast('Error: '+e.message);});
};

window.refreshShelterCounter = function() {
  if(!_dash.currentShelter)return;
  db().collection('shelters').doc(_dash.currentShelter.id).get().then(function(doc){
    if(!doc.exists)return;
    _dash.currentShelter.lastCount=doc.data().lastCount||0;
    var el=document.getElementById('sh-next-id');if(el)el.textContent=_dash.currentShelter.prefix+'-'+Math.random().toString(36).slice(2,6).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase();
  });
};

window.generateShelterQR = function() {
  if(!_dash.currentShelter)return;
  var next=_dash.currentShelter.lastCount+1;
  var _rs3=Math.random().toString(36).slice(2,6).toUpperCase();
  var newId=_rs3+Math.random().toString(36).slice(2,4).toUpperCase();
  var profileUrl='https://prueb2.dashnexpages.net/activacion/?id='+encodeURIComponent(newId);
  var display=document.getElementById('sh-qr-display');if(!display)return;
  display.innerHTML='';
  var wrap=document.createElement('div');wrap.className='qr-canvas-wrap';
  var cd=document.createElement('div');cd.id='sh-qr-canvas';wrap.appendChild(cd);
  var lbl=document.createElement('div');lbl.className='qr-id-label';lbl.textContent=newId;wrap.appendChild(lbl);
  display.appendChild(wrap);
  try{_dash.shelterQr=new QRCode(cd,{text:profileUrl,width:220,height:220,colorDark:'#1a0533',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});}
  catch(e){toast('Error QR: '+e.message);return;}
  db().collection('shelters').doc(_dash.currentShelter.id).update({lastCount:firebase.firestore.FieldValue.increment(1)})
    .then(function(){_dash.currentShelter.lastCount=next;var el=document.getElementById('sh-next-id');if(el)el.textContent=_dash.currentShelter.prefix+'-'+Math.random().toString(36).slice(2,6).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase();});
  db().collection('pets').doc(newId).set({id:newId,status:'reservada',sellerId:_dash.currentShelter.id,sellerName:_dash.currentShelter.name,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  var links=document.getElementById('sh-qr-links');
  if(links){var safeUrl=profileUrl.replace(/'/g,"\\'");links.innerHTML='<div class="qr-link-row"><div class="qr-link-label">Perfil Público</div><div class="qr-link-url">'+esc(profileUrl)+'</div><button class="qr-link-copy" onclick="copyText(\''+safeUrl+'\',\'URL copiada\')">📋 Copiar</button></div>';}
  var res=document.getElementById('sh-qr-result');if(res)res.style.display='block';
  toast('✅ Placa creada: '+newId);
};

window.downloadShelterQR = function() {
  var el=document.querySelector('#sh-qr-canvas canvas')||document.querySelector('#sh-qr-canvas img');
  _downloadQREl(el,'petcingo-'+(_dash.currentShelter&&_dash.currentShelter.prefix||'shelter')+'-qr.png');
};

window.loadShelterPets = function() {
  if(!_dash.currentShelter)return;
  var tbody=document.getElementById('sh-pets-tbody'),countEl=document.getElementById('sh-pets-count');
  if(!tbody)return;
  tbody.innerHTML='<tr><td colspan="6"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div></td></tr>';
  db().collection('pets').where('sellerId','==',_dash.currentShelter.id).orderBy('createdAt','desc').get()
    .then(function(snap){
      if(countEl)countEl.textContent=snap.size+' placa(s)';
      if(snap.empty){tbody.innerHTML='<tr><td colspan="6"><div class="empty-state"><p>Sin placas vinculadas.</p></div></td></tr>';return;}
      var html='';
      snap.forEach(function(doc){
        var d=doc.data(),id=doc.id;
        var bCls=d.status==='perdido'?'badge-lost':d.status==='reservada'?'badge-reserved':'badge-active';
        var bTxt=d.status==='perdido'?'Perdido':d.status==='reservada'?'Reservada':'Activo';
        var fecha=d.createdAt&&d.createdAt.toDate?formatDate(d.createdAt.toDate()):'—';
        html+='<tr><td class="td-id">'+esc(id)+'</td><td class="td-name">'+esc(d.name||'—')+'</td><td class="td-owner">'+esc(d.ownerName||'—')+'</td>'+
          '<td><span class="badge '+bCls+'">'+bTxt+'</span></td><td class="td-date">'+fecha+'</td>'+
          '<td class="td-actions"><a href="https://prueb2.dashnexpages.net/id/?id='+encodeURIComponent(id)+'" target="_blank" class="btn btn-ghost btn-sm"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-eye-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"></a></td></tr>';
      });
      tbody.innerHTML=html;
    }).catch(function(){
      if(countEl)countEl.textContent='';
      tbody.innerHTML='<tr><td colspan="6"><div class="empty-state" style="color:var(--warn);padding:20px"><div style="font-size:28px;margin-bottom:8px">🔧</div><p><strong>Se requiere índice de Firebase.</strong></p><a href="https://console.firebase.google.com" target="_blank" style="color:var(--primary);font-weight:600;font-size:.85rem">Abrir Firebase Console →</a></div></td></tr>';
    });
};

/* ── Users CRUD ─────────────────────────────────────────── */
function readPerms() {
  return { dashboard:elCheck('perm-dashboard'), register:elCheck('perm-register'), pets:elCheck('perm-pets'), vets:elCheck('perm-vets'), shelters:elCheck('perm-shelters'), settings:elCheck('perm-settings') };
}
function elCheck(id){var el=document.getElementById(id);return el?el.checked:false;}

function resetUserForm() {
  _dash.editingUserId=null;
  var fields=['usr-name','usr-pass'];fields.forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
  ['dashboard','register','pets'].forEach(function(p){var el=document.getElementById('perm-'+p);if(el)el.checked=true;});
  ['vets','shelters','settings'].forEach(function(p){var el=document.getElementById('perm-'+p);if(el)el.checked=false;});
  var btn=document.getElementById('btn-user-action');
  if(btn){btn.textContent='Crear Usuario';btn.onclick=window.saveUser;}
}
window.resetUserForm=resetUserForm;

window.saveUser = function() {
  var name=document.getElementById('usr-name').value.trim();
  var pass=document.getElementById('usr-pass').value.trim();
  if(!name){toast('⚠️ Nombre obligatorio.');return;}
  if(pass.length<6){toast('⚠️ Contraseña mínimo 6 caracteres.');return;}
  if(pass===MASTER_PASSWORD){toast('⚠️ No puedes usar la contraseña maestra.');return;}
  db().collection('users').add({ username:name, password:pass, role:'staff', permissions:readPerms(), createdAt:firebase.firestore.FieldValue.serverTimestamp() })
    .then(function(){toast('✅ Usuario creado: '+name);resetUserForm();loadUsers();addLog('created_user',name,_dash.currentUser&&_dash.currentUser.name);})
    .catch(function(e){toast('❌ '+e.message);});
};

window.editUser = function(docId, username, permsJson, role) {
  _dash.editingUserId=docId;
  var nEl=document.getElementById('usr-name');if(nEl)nEl.value=username||'';
  var pEl=document.getElementById('usr-pass');if(pEl)pEl.value='';
  var perms={};try{perms=JSON.parse(permsJson);}catch(e){}
  ['dashboard','register','pets','vets','shelters','settings'].forEach(function(p){var el=document.getElementById('perm-'+p);if(el)el.checked=!!perms[p];});
  var btn=document.getElementById('btn-user-action');
  if(btn){btn.textContent='Guardar Cambios';btn.onclick=window.updateUser;}
  var panel=document.querySelector('#sec-users .panel');
  if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
  toast('Editando: '+username);
};

window.updateUser = function() {
  if(!_dash.editingUserId){window.saveUser();return;}
  var name=document.getElementById('usr-name').value.trim();
  var pass=document.getElementById('usr-pass').value.trim();
  if(!name){toast('⚠️ Nombre obligatorio.');return;}
  var update={username:name,permissions:readPerms()};
  if(pass){if(pass.length<6){toast('⚠️ Contraseña mínimo 6 caracteres.');return;}if(pass===MASTER_PASSWORD){toast('⚠️ No puedes usar la contraseña maestra.');return;}update.password=pass;}
  db().collection('users').doc(_dash.editingUserId).update(update)
    .then(function(){toast('✅ Usuario actualizado: '+name);resetUserForm();loadUsers();addLog('updated_user',name,_dash.currentUser&&_dash.currentUser.name);})
    .catch(function(e){toast('❌ '+e.message);});
};

function loadUsers() {
  var el=document.getElementById('users-list');
  if(!el){console.warn('loadUsers: #users-list not found');return;}
  console.log('loadUsers: cargando…');
  el.innerHTML='<div class="empty-state" style="padding:20px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
  db().collection('users').orderBy('createdAt','desc').get()
    .then(function(snap){
      console.log('loadUsers: snap.size='+snap.size);
      if(snap.empty){el.innerHTML='<p style="color:var(--muted-dark);font-size:.85rem;padding:8px 0">No hay usuarios creados aún.</p>';return;}
      var html='',isAdmin=_dash.currentUser&&_dash.currentUser.role==='admin';
      snap.forEach(function(doc){
        var d=doc.data();
        var permsStr=JSON.stringify(d.permissions||{}).replace(/"/g,'&quot;');
        var permList=Object.keys(d.permissions||{}).filter(function(k){return d.permissions[k];}).join(', ');
        html+='<div class="user-row"><div class="user-avatar">'+esc((d.username||'U').charAt(0).toUpperCase())+'</div>'+
          '<div class="user-info"><div class="user-name">'+esc(d.username||'—')+'</div><div class="user-perms">'+esc(permList||'sin permisos')+'</div></div>'+
          (isAdmin?'<button class="btn btn-ghost btn-sm" onclick="editUser(\''+doc.id+'\',\''+esc(d.username||'')+'\',\''+permsStr+'\',\''+esc(d.role||'')+'\')" style="margin-right:6px"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-edit-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"></button>'+
            '<button class="btn-danger-outline" onclick="deleteRecord(\'users\',\''+doc.id+'\',\'loadUsers\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"></button>':'')+
          '</div>';
      });
      el.innerHTML=html;
    })
    .catch(function(e){
      console.error('loadUsers error:',e);
      el.innerHTML='<div style="color:var(--error);font-size:.85rem;padding:8px 0">Error: '+esc(e.message)+'<br><button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="loadUsers()">Reintentar</button></div>';
    });
}
window.loadUsers=loadUsers;

/* ── Logs ───────────────────────────────────────────────── */
function addLog(action, targetId, user) {
  db().collection('logs').add({ action:action, targetId:targetId||'', user:user||'sistema', date:firebase.firestore.FieldValue.serverTimestamp() })
    .catch(function(){});
}

function loadLogs() {
  var el=document.getElementById('logs-list');if(!el)return;
  el.innerHTML='<div class="empty-state" style="padding:20px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
  db().collection('logs').orderBy('date','desc').limit(50).get()
    .then(function(snap){
      if(snap.empty){el.innerHTML='<p style="color:var(--muted-dark);font-size:.85rem;padding:8px 0">No hay logs.</p>';return;}
      var html='';
      snap.forEach(function(doc){
        var d=doc.data(),fecha=d.date&&d.date.toDate?formatDate(d.date.toDate()):'—';
        html+='<div class="log-row"><div class="log-action">'+esc(d.action||'—')+'</div><div><span style="color:var(--text-dark)">'+esc(d.targetId||'')+'</span><div class="log-meta">'+esc(d.user||'sistema')+' · '+fecha+'</div></div></div>';
      });
      el.innerHTML=html;
    }).catch(function(e){el.innerHTML='<p style="color:var(--error);font-size:.85rem">Error: '+esc(e.message)+'</p>';});
}
window.loadLogs=loadLogs;

window.clearOldLogs = function() {
  var inputEl=document.getElementById('cfg-log-days');
  var days=inputEl?parseInt(inputEl.value,10):30;
  if(!days||days<1)days=30;
  if(!confirm('¿Eliminar todos los logs de hace más de '+days+' días?'))return;
  var cutoff=new Date(Date.now()-days*24*60*60*1000);
  db().collection('logs').where('date','<',cutoff).get()
    .then(function(snap){
      if(snap.empty){toast('No hay logs tan antiguos.');return;}
      var batch=db().batch();
      snap.forEach(function(doc){batch.delete(doc.ref);});
      return batch.commit().then(function(){toast('🗑 '+snap.size+' logs eliminados.');loadLogs();});
    }).catch(function(e){toast('❌ '+e.message);});
};

/* ── Delete record (generic) ────────────────────────────── */
window.deleteRecord = function(collection, docId, reloadFn) {
  if(!confirm('¿Eliminar este registro permanentemente?'))return;
  db().collection(collection).doc(docId).delete()
    .then(function(){toast('🗑 Eliminado.');addLog('deleted_'+collection,docId,_dash.currentUser&&_dash.currentUser.name);if(window[reloadFn])window[reloadFn]();})
    .catch(function(e){toast('❌ '+e.message);});
};

/* ── Settings ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  var cfgUrl = document.getElementById('cfg-logo-url');
  if (cfgUrl) {
    cfgUrl.addEventListener('input', function() {
      var prev=document.getElementById('cfg-logo-preview');
      if(prev){prev.src=this.value.trim();prev.style.display=this.value.trim()?'block':'none';}
    });
  }
});

window.saveLogo = function() {
  var url=document.getElementById('cfg-logo-url').value.trim();
  db().collection('config').doc('admin_settings').set({logoUrl:url},{merge:true})
    .then(function(){applyLogo(url);toast('✅ Logo guardado.');})
    .catch(function(e){toast('❌ '+e.message);});
};

window.removeLogo = function() {
  db().collection('config').doc('admin_settings').set({logoUrl:''},{merge:true})
    .then(function(){applyLogo('');var el=document.getElementById('cfg-logo-url');if(el)el.value='';var prev=document.getElementById('cfg-logo-preview');if(prev)prev.style.display='none';toast('Logo eliminado.');});
};

function applyLogo(url) {
  var text=document.getElementById('sidebar-brand-text'),img=document.getElementById('sidebar-brand-logo');
  if(url){if(text)text.style.display='none';if(img){img.src=url;img.style.display='block';}}
  else{if(text)text.style.display='block';if(img)img.style.display='none';}
}

function loadSettings() {
  db().collection('config').doc('admin_settings').get()
    .then(function(doc){
      if(doc.exists&&doc.data().logoUrl){
        var url=doc.data().logoUrl;applyLogo(url);
        var el=document.getElementById('cfg-logo-url');if(el)el.value=url;
        var prev=document.getElementById('cfg-logo-preview');if(prev){prev.src=url;prev.style.display='block';}
      }
    }).catch(function(){});
}

window.applyTheme = function(name) {
  document.body.classList.remove('theme-light','theme-cyan');
  if(name==='light')document.body.classList.add('theme-light');
  if(name==='cyan') document.body.classList.add('theme-cyan');
  ['dark','light','cyan'].forEach(function(t){var btn=document.getElementById('theme-btn-'+t);if(btn)btn.classList.toggle('active',t===name);});
  localStorage.setItem('petcingo_theme',name);
};

/* ── Staff legacy ──────────────────────────────────────── */
window.saveStaff = function() {
  var name=document.getElementById('staff-name');var pass=document.getElementById('staff-pass');
  if(!name||!pass||!name.value.trim()||pass.value.trim().length<6){toast('⚠️ Nombre y contraseña (6+ chars).');return;}
  db().collection('staff').add({name:name.value.trim(),password:pass.value.trim(),role:'empleado',createdAt:firebase.firestore.FieldValue.serverTimestamp()})
    .then(function(){toast('✅ Empleado creado.');name.value='';pass.value='';})
    .catch(function(e){toast('❌ '+e.message);});
};

/* ── Global QR generator (custom ID) ───────────────────── */
window.generateQR = function() {
  var inp=document.getElementById('qr-id-input');
  if(!inp||!inp.value.trim()){toast('⚠️ Ingresa un ID.');return;}
  var rawId=inp.value.trim();
  var profileUrl='https://prueb2.dashnexpages.net/activacion/?id='+encodeURIComponent(rawId);
  var display=document.getElementById('qr-display');if(!display)return;
  display.innerHTML='';
  var wrap=document.createElement('div');wrap.className='qr-canvas-wrap';
  var cd=document.createElement('div');cd.id='qr-canvas';wrap.appendChild(cd);
  var lbl=document.createElement('div');lbl.className='qr-id-label';lbl.textContent=rawId;wrap.appendChild(lbl);
  display.appendChild(wrap);
  try{_dash.qrInstance=new QRCode(cd,{text:profileUrl,width:220,height:220,colorDark:'#1a0533',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});}
  catch(e){toast('Error QR: '+e.message);return;}
  var links=document.getElementById('qr-links'),res=document.getElementById('qr-result');
  if(links){var safeUrl=profileUrl.replace(/'/g,"\\'");links.innerHTML='<div class="qr-link-row"><div class="qr-link-label">Perfil Público</div><div class="qr-link-url">'+esc(profileUrl)+'</div><button class="qr-link-copy" onclick="copyText(\''+safeUrl+'\',\'URL copiada\')">📋 Copiar</button></div>';}
  if(res)res.style.display='block';
  toast('✅ QR generado: '+rawId);
};

window.downloadQR = function() {
  var el=document.querySelector('#qr-canvas canvas')||document.querySelector('#qr-canvas img');
  _downloadQREl(el,'petcingo-qr-'+(document.getElementById('qr-id-input')||{}).value+'.png');
};

window.generateNew = function() {
  var inp=document.getElementById('qr-id-input');if(inp)inp.value='';
  var res=document.getElementById('qr-result');if(res)res.style.display='none';
  var disp=document.getElementById('qr-display');if(disp)disp.innerHTML='';
  _dash.qrInstance=null;
};

function _downloadQREl(el, filename) {
  if (!el) { toast('Genera un QR primero.'); return; }
  var canvas = el.tagName==='CANVAS' ? el : null;
  var img    = el.tagName==='IMG'    ? el : null;
  if (canvas) {
    var a=document.createElement('a');a.download=filename;a.href=canvas.toDataURL('image/png');a.click();
  } else if (img) {
    var img2=new Image();img2.crossOrigin='anonymous';
    img2.onload=function(){var cv=document.createElement('canvas');cv.width=img2.width;cv.height=img2.height;cv.getContext('2d').drawImage(img2,0,0);var a=document.createElement('a');a.download=filename;a.href=cv.toDataURL('image/png');a.click();};
    img2.src=img.src;
  }
}

window.copyText = function(text, msg) {
  navigator.clipboard.writeText(text).then(function(){toast('📋 '+(msg||'Copiado'));}).catch(function(){toast('No se pudo copiar.');});
};

window.exportDatabase = exportDatabase;
window.downloadJson   = downloadJson;

/* ── Importar / Restaurar colección desde JSON ── */
window.importDatabase = function(collectionName) {
  var input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      var records;
      try { records = JSON.parse(evt.target.result); }
      catch(err) { toast('❌ JSON inválido: ' + err.message); return; }
      if (!Array.isArray(records)) { toast('❌ El archivo debe contener un array JSON.'); return; }

      if (!confirm('¿Restaurar ' + records.length + ' registros en "' + collectionName + '"?\n\nSe SOBREESCRIBIRÁN documentos existentes con el mismo ID.\nEsta acción no se puede deshacer.')) return;

      var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore();
      var count = 0, errors = 0;

      /* Firestore batches max 500 ops — process in chunks */
      function commitChunk(chunk) {
        var b = firestoreDb.batch();
        chunk.forEach(function(rec) {
          var docId = rec._id || rec.id;
          if (!docId) { errors++; return; }
          var data = Object.assign({}, rec);
          delete data._id;
          /* Re-parse ISO date strings to Date objects */
          Object.keys(data).forEach(function(k) {
            if (typeof data[k] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(data[k])) {
              data[k] = new Date(data[k]);
            }
          });
          b.set(firestoreDb.collection(collectionName).doc(String(docId)), data, { merge: true });
          count++;
        });
        return b.commit();
      }

      var chunks = [];
      for (var i = 0; i < records.length; i += 400) chunks.push(records.slice(i, i + 400));
      toast('Importando ' + records.length + ' registros en ' + chunks.length + ' lote(s)…');

      chunks.reduce(function(p, chunk) {
        return p.then(function() { return commitChunk(chunk); });
      }, Promise.resolve())
        .then(function() {
          toast('✅ ' + count + ' registros restaurados en "' + collectionName + '"' + (errors ? ' · ' + errors + ' omitidos (sin ID)' : '') + '.');
        })
        .catch(function(err) { toast('❌ Error al importar: ' + err.message); });
    };
    reader.readAsText(file);
  };
  input.click();
};

/* ══════════════════════════════════════════════════════════════
   PET.HTML — Public Profile
══════════════════════════════════════════════════════════════ */
window.initPetPage = function() {
  var params  = new URLSearchParams(window.location.search);
  var plateId = (params.get('id') || '').trim();

  /* ── No ID in URL ── */
  if (!plateId) {
    var errEl = document.getElementById('pet-state-error');
    var loadEl = document.getElementById('pet-state-loading');
    var profEl = document.getElementById('pet-profile');
    var geoEl  = document.getElementById('geo-modal');
    if (loadEl) loadEl.style.display = 'none';
    if (profEl) profEl.style.display = 'none';
    if (geoEl)  geoEl.style.display  = 'none';
    if (errEl) {
      errEl.style.display = 'flex';
      errEl.innerHTML =
        '<div class="pet-state-icon">❓</div>' +
        '<div class="pet-state-title">Placa no encontrada</div>' +
        '<div class="pet-state-sub">Asegúrate de estar usando el enlace QR/NFC de la placa.</div>' +
        '';
    }
    return;
  }

  /* ── Fetch pet doc ── */
  var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore();

  firestoreDb.collection('pets').doc(plateId).get()
    .then(function(docSnap) {
      if (!docSnap.exists) {
        _showPetError(plateId, 'Esta placa (<strong>' + esc(plateId) + '</strong>) no tiene un perfil registrado aún.');
        return;
      }
      var d = docSnap.data();

      /* Blocked states — show but minimal */
      if (d.status === 'deleted') {
        _showPetError(plateId, 'Esta placa ha sido desactivada.');
        return;
      }

      /* Only show geo-modal for active plates, not reservada */
      if (d.status === 'reservada') {
        /* Show activation prompt within pet.html if viewed */
        var loadEl = document.getElementById('pet-state-loading');
        var profEl = document.getElementById('pet-profile');
        var errEl  = document.getElementById('pet-state-error');
        if (loadEl) loadEl.style.display = 'none';
        if (profEl) profEl.style.display = 'none';
        if (errEl) {
          errEl.style.display = 'flex';
          errEl.innerHTML = '<div class="pet-state-icon">🏷️</div><div class="pet-state-title">Placa sin activar</div><div class="pet-state-sub">Esta placa aún no ha sido activada por su dueño.</div>' +
            '<a href="https://prueb2.dashnexpages.net/activacion/?id=' + encodeURIComponent(plateId) + '" style="margin-top:14px;display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:var(--primary);color:#fff;border-radius:12px;font-weight:700;font-size:.85rem;text-decoration:none">Activar placa →</a>';
        }
        return;
      }
      renderPetProfile(d, plateId);
      initGeoOptIn(plateId);
    })
    .catch(function(e) {
      _showPetError(plateId, 'Error al cargar el perfil: ' + esc(e.message));
    });
};

function _showPetError(plateId, msg) {
  var loadEl = document.getElementById('pet-state-loading');
  var profEl = document.getElementById('pet-profile');
  var errEl  = document.getElementById('pet-state-error');
  if (loadEl) loadEl.style.display = 'none';
  if (profEl) profEl.style.display = 'none';
  if (errEl) {
    errEl.style.display = 'flex';
    errEl.innerHTML =
      '<div class="pet-state-icon">❓</div>' +
      '<div class="pet-state-title">Placa no registrada</div>' +
      '<div class="pet-state-sub">' + (msg || 'No encontramos esta placa en el sistema.') + '</div>' +
      (plateId
        ? '<a href="https://prueb2.dashnexpages.net/activacion/?id=' + encodeURIComponent(plateId) + '" style="margin-top:14px;display:inline-block;padding:10px 18px;background:var(--primary);color:#fff;border-radius:12px;font-weight:700;font-size:.85rem;text-decoration:none">Activar placa →</a>'
        : '');
  }
}

function renderPetProfile(d, petId) {
  var isLost = d.status === 'perdido';
  if (isLost) {
    document.documentElement.style.setProperty('--primary','#cc0040');
    document.documentElement.style.setProperty('--secondary','#ff3b6b');
    var banner=document.getElementById('pet-lost-banner');if(banner)banner.style.display='block';
  }

  document.title = (d.name||'Mascota') + ' – Petcingo';
  var nameEl=document.getElementById('pet-name');if(nameEl)nameEl.textContent=d.name||'Mascota';

  /* Avatar */
  var container=document.getElementById('pet-avatar-container');
  if (container) {
    if (d.photoUrl) {
      var img=document.createElement('img');
      img.className='pet-avatar';img.src=d.photoUrl;img.alt=d.name||'';
      img.onerror=function(){container.innerHTML='<div class="pet-avatar-placeholder">'+_speciesEmoji(d.species)+'</div>';};
      container.innerHTML='';container.appendChild(img);
    } else { container.innerHTML='<div class="pet-avatar-placeholder">'+_speciesEmoji(d.species)+'</div>'; }
  }

  /* Status badge */
  var badge=document.getElementById('pet-status-badge'),badgeTxt=document.getElementById('pet-status-text');
  if(badge){
    badge.className='pet-status-badge '+(isLost?'perdido':d.status==='reservada'?'reservada':'activo');
    if(badgeTxt)badgeTxt.textContent=isLost?'Perdido':d.status==='reservada'?'Pendiente':'Activo';
  }

  /* Chips */
  var chips=document.getElementById('pet-chips');
  if(chips){
    var ch='';
    if(d.species)ch+='<span class="pet-chip">'+_speciesEmoji(d.species)+' '+esc(d.species)+'</span>';
    if(d.gender) ch+='<span class="pet-chip">'+(d.gender==='Macho'?'♂':'♀')+' '+esc(d.gender)+'</span>';
    if(d.age)    ch+='<span class="pet-chip">🎂 '+esc(d.age)+'</span>';
    chips.innerHTML=ch;
  }

  /* Contact */
  _buildPetContactPanel(d, isLost);

  /* Message accordion */
  if(d.message){
    var acc=document.getElementById('pet-acc-message');if(acc)acc.style.display='block';
    var val=document.getElementById('pet-acc-message-val');if(val)val.textContent=d.message;
  }

  /* Pet data accordion */
  _buildPetDataAccordion(d);

  /* Medical accordion */
  if(d.medical){
    var accM=document.getElementById('pet-acc-medical');if(accM)accM.style.display='block';
    var medContent=document.getElementById('pet-acc-medical-content');
    if(medContent)medContent.innerHTML=_petInfoRow('ri-capsule-line','Info médica',d.medical);
  }

  /* Show profile */
  var loading=document.getElementById('pet-state-loading'),profile=document.getElementById('pet-profile');
  if(loading)loading.style.display='none';
  if(profile)profile.style.display='block';

  /* Add "Gestionar mi mascota" button if editToken available via URL */
  var params2 = new URLSearchParams(window.location.search);
  var token2  = params2.get('token');
  var manageEl = document.getElementById('pet-manage-btn');
  if (manageEl && token2 && d.editToken && d.editToken === token2) {
    var dashUrl = 'https://prueb2.dashnexpages.net/cliente/?id=' + encodeURIComponent(petId) + '&token=' + encodeURIComponent(token2);
    manageEl.innerHTML = '<a href="' + dashUrl + '" style="display:inline-flex;align-items:center;gap:8px;padding:12px 20px;background:rgba(81,0,192,.10);border:1.5px solid rgba(81,0,192,.25);border-radius:14px;color:#5100c0;font-weight:700;font-size:.88rem;text-decoration:none;margin-top:4px"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-settings-bold.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Gestionar mi mascota</a>';
    manageEl.style.display = 'block';
  }
}

function _buildPetContactPanel(d, isLost) {
  var phone1=normalizeWA(d.phone||'');
  var phone2=normalizeWA(d.phone2||'');
  var pn=d.name||'tu mascota';
  var waMsg=isLost
    ?' Encontré a *'+pn+'* que parece estar perdido/a. ¿Cómo puedo ayudar? 🐾'
    :'¡Hola! Escaneé la placa de *'+pn+'* en Petcingo.';
  var waUrl1='https://wa.me/'+phone1+'?text='+encodeURIComponent(waMsg);
  var panel=document.getElementById('pet-contact-panel');
  if(!panel)return;
  var html='';
  if(phone1)html+='<a class="btn btn-wa" href="'+waUrl1+'" target="_blank" rel="noopener"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-chat-round-linear.svg" width="20" height="20" style="filter:brightness(0) invert(1)" alt="" aria-hidden="true"> WhatsApp al dueño</a>';
  if(phone2){var waUrl2='https://wa.me/'+phone2+'?text='+encodeURIComponent(waMsg);html+='<a class="btn btn-wa2" href="'+waUrl2+'" target="_blank" rel="noopener"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-chat-round-linear.svg" width="20" height="20" style="filter:brightness(0) invert(1)" alt="" aria-hidden="true"> WhatsApp alternativo</a>';}
  if(d.phone)html+='<a class="btn btn-call-pet" href="tel:'+esc(d.phone)+'"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-phone-linear.svg" width="20" height="20" style="filter:brightness(0) invert(1)" alt="" aria-hidden="true"> Llamar al dueño</a>';
  panel.innerHTML=html||'<p style="color:#7a6e8a;font-size:.85rem;text-align:center">Sin contacto registrado</p>';

  var fab=document.getElementById('fab-wa');
  if(fab&&phone1){fab.href=waUrl1;fab.style.display='flex';}
}

function _buildPetDataAccordion(d) {
  var content=document.getElementById('pet-acc-pet-content');if(!content)return;
  var rows='';
  var ageDisplay=d.age||'';
  if(!ageDisplay&&d.birthdate){
    var bd=new Date(d.birthdate),now=new Date();
    var years=now.getFullYear()-bd.getFullYear(),months=now.getMonth()-bd.getMonth();
    if(months<0||(months===0&&now.getDate()<bd.getDate())){years--;months=(months+12)%12;}
    ageDisplay=years>0?years+' año'+(years>1?'s':''):months+' mes'+(months!==1?'es':'');
  }
  if(ageDisplay)   rows+=_petInfoRow('ri-cake-line','Edad',ageDisplay);
  if(d.birthdate)  rows+=_petInfoRow('ri-calendar-event-line','Fecha de nacimiento',d.birthdate);
  if(d.weight)     rows+=_petInfoRow('ri-scales-line','Peso',d.weight+' kg');
  if(d.ownerName)  rows+=_petInfoRow('ri-user-3-line','Dueño/a',d.ownerName);
  if(d.behavior)   rows+=_petInfoRow('ri-star-line','Comportamiento',d.behavior);
  content.innerHTML=rows||'<p style="color:#7a6e8a;font-size:.85rem;padding:4px 0">Sin datos adicionales.</p>';
}

function _petInfoRow(icon, label, value) {
  return '<div class="pet-info-row"><i class="'+icon+' pet-info-icon"></i><div><div class="pet-info-label">'+esc(label)+'</div><div class="pet-info-value">'+esc(value)+'</div></div></div>';
}

function _speciesEmoji(sp) {
  return {Perro:'🐕',Gato:'🐈',Conejo:'🐇',Ave:'🦜'}[sp]||'🐾';
}

window.togglePetAcc = function(id) {
  var el=document.getElementById(id);if(el)el.classList.toggle('open');
};

/* _showPetError defined above near initPetPage */
function showPetError() { _showPetError('', ''); }

/* ── Geo Opt-In ─────────────────────────────────────────── */
function initGeoOptIn(petId) {
  if (!navigator.geolocation) return;

  /* Fast local cache: if we already logged today, skip everything */
  var today    = new Date().toDateString();
  var cacheKey = 'geo_logged_' + petId;
  if (localStorage.getItem(cacheKey) === today) return;

  /* Check Firestore for a log from today to avoid redundant prompts
     (e.g. page refresh on same device without localStorage) */
  var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore();
  var dayStart = new Date(); dayStart.setHours(0,0,0,0);

  firestoreDb.collection('scan_logs')
    .where('petId', '==', petId)
    .where('scannedAt', '>=', dayStart)
    .limit(1)
    .get()
    .then(function(snap) {
      if (!snap.empty) {
        /* Already logged today via another device — mark local cache and skip */
        localStorage.setItem(cacheKey, today);
        return;
      }
      _showGeoModal(petId, cacheKey, today, firestoreDb);
    })
    .catch(function() {
      /* If index or permission error, fall back to delayed modal show */
      setTimeout(function() { _showGeoModal(petId, cacheKey, today, firestoreDb); }, 1200);
    });
}

function _showGeoModal(petId, cacheKey, today, firestoreDb) {
  var modal = document.getElementById('geo-modal');
  if (!modal) return;
  modal.classList.add('show');
  modal.style.display = 'flex';

  /* Clone buttons to remove stale listeners */
  var yesBtn = document.getElementById('geo-yes');
  var noBtn  = document.getElementById('geo-no');
  var newYes = yesBtn ? yesBtn.cloneNode(true) : null;
  var newNo  = noBtn  ? noBtn.cloneNode(true)  : null;
  if (yesBtn && newYes) yesBtn.parentNode.replaceChild(newYes, yesBtn);
  if (noBtn  && newNo)  noBtn.parentNode.replaceChild(newNo,  noBtn);

  if (newYes) newYes.addEventListener('click', function() {
    modal.classList.remove('show'); modal.style.display = 'none';
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        firestoreDb.collection('scan_logs').add({
          petId:     petId,
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy:  pos.coords.accuracy,
          scannedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
          localStorage.setItem(cacheKey, today);
        }).catch(function() {});
      },
      function() { /* GPS denied — silent */ },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  if (newNo) newNo.addEventListener('click', function() {
    modal.classList.remove('show'); modal.style.display = 'none';
    localStorage.setItem(cacheKey, today);
  });
}

/* ══════════════════════════════════════════════════════════════
   ACTIVATE.HTML
══════════════════════════════════════════════════════════════ */
window.initActivatePage = function() {
  /* Moved to activate.html for self-contained simplicity */
};

/* ══════════════════════════════════════════════════════════════
   CLIENT DASHBOARD
══════════════════════════════════════════════════════════════ */
window.initClientDashboard = function() {
  var params    = new URLSearchParams(window.location.search);
  var petId     = (params.get('id')    || '').trim();
  var editToken = (params.get('token') || '').trim();

  if (!petId || !editToken) { showAuthWall(); return; }

  var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore();

  firestoreDb.collection('pets').doc(petId).get()
    .then(function(doc) {
      if (!doc.exists || doc.data().editToken !== editToken) {
        showAuthWall();
        return;
      }
      var d = doc.data();

      /* Set client user in _dash for compatibility with shared utils */
      _dash.currentUser = {
        name:        d.ownerName || 'Dueño',
        role:        'client',
        petId:       petId,
        permissions: { dashboard:true, pets:true, scan_logs:true, settings:false }
      };

      initClientApp(d, petId, editToken, firestoreDb);
    })
    .catch(function(err) { showAuthWall(); });
};

function showAuthWall() {
  var aw  = document.getElementById('auth-wall');  if (aw)  aw.classList.add('show');
  var app = document.getElementById('app');         if (app) app.style.display = 'none';
}

function initClientApp(d, petId, editToken, firestoreDb) {
  var app = document.getElementById('app');         if (app) app.style.display = 'block';
  var aw  = document.getElementById('auth-wall');   if (aw)  aw.classList.remove('show');

  var editUrl    = 'https://prueb2.dashnexpages.net/activacion/?id=' + petId;
  var profileUrl = 'https://prueb2.dashnexpages.net/id/?id=' + petId;

  /* ── Topbar ── */
  var topName = document.getElementById('top-name');
  if (topName) topName.textContent = d.name || 'Mi Mascota';

  if (d.photoUrl) {
    var img = document.createElement('img');
    img.className = 'topbar-avatar'; img.src = d.photoUrl; img.alt = '';
    var ph = document.getElementById('top-avatar');
    if (ph) ph.replaceWith(img);
  }

  var tvp = document.getElementById('top-view-profile'); if (tvp) tvp.href = profileUrl;
  var tep = document.getElementById('top-edit-profile');  if (tep) tep.href = editUrl;

  /* ── Pet card ── */
  var cn = document.getElementById('card-name'); if (cn) cn.textContent = d.name || '—';
  var meta = [d.species, d.gender, d.age].filter(Boolean).join(' · ');
  var cm = document.getElementById('card-meta'); if (cm) cm.textContent = meta || 'Sin datos adicionales';

  if (d.photoUrl) {
    var img2 = document.createElement('img');
    img2.className = 'pet-card-photo'; img2.src = d.photoUrl; img2.alt = '';
    var cap = document.getElementById('card-avatar'); if (cap) cap.replaceWith(img2);
  }

  var sTxt = { activo:'✅ Activo', perdido:'🚨 Perdido', reservada:'⏳ Pendiente' };
  var sCls = { activo:'badge-active', perdido:'badge-lost', reservada:'badge-reserved' };
  var cs   = document.getElementById('card-status');
  if (cs) cs.innerHTML = '<span class="badge ' + (sCls[d.status] || 'badge-reserved') + '">' + (sTxt[d.status] || d.status || '—') + '</span>';

  /* ── Edit URL display ── */
  var edu = document.getElementById('edit-url-display'); if (edu) edu.textContent = editUrl;
  var bef = document.getElementById('btn-edit-full');    if (bef) bef.href = editUrl;

  var ss = document.getElementById('stat-status'); if (ss) ss.textContent = sTxt[d.status] || d.status || '—';

  /* Toggle lost button */
  var btn = document.getElementById('btn-toggle-lost');
  if (btn) {
    var isLost = d.status === 'perdido';
    btn.textContent = isLost ? '✅ Encontrado — quitar alerta' : '🚨 Marcar como PERDIDO';
    btn.style.background = isLost ? 'rgba(16,185,129,.15)' : 'rgba(244,63,94,.15)';
    btn.style.color = isLost ? '#10b981' : '#f43f5e';
    btn.style.border = isLost ? '1px solid rgba(16,185,129,.25)' : '1px solid rgba(244,63,94,.25)';
  }
  window.toggleLostStatus = function() {
    var newStatus = (d.status === 'perdido') ? 'activo' : 'perdido';
    var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore();
    firestoreDb.collection('pets').doc(petId).update({ status: newStatus })
      .then(function() {
        d.status = newStatus;
        var isLost = newStatus === 'perdido';
        toast(isLost ? '🚨 Modo perdido activado. Tu mascota aparece en alerta roja.' : '✅ Alerta cancelada. Tu mascota aparece como activa.');
        /* Refresh button state */
        var btnL = document.getElementById('btn-toggle-lost');
        var csEl = document.getElementById('card-status');
        if (btnL) { btnL.textContent = isLost?'✅ Encontrado — quitar alerta':'🚨 Marcar como PERDIDO'; btnL.style.background=isLost?'rgba(16,185,129,.15)':'rgba(244,63,94,.15)'; btnL.style.color=isLost?'#10b981':'#f43f5e'; btnL.style.border=isLost?'1px solid rgba(16,185,129,.25)':'1px solid rgba(244,63,94,.25)'; }
        if (csEl) csEl.innerHTML = '<span class="badge '+(sTxt[newStatus]?sCls[newStatus]:'badge-reserved')+'">'+((sTxt[newStatus])||newStatus)+'</span>';
      })
      .catch(function(e) { toast('❌ Error: ' + e.message); });
  };

  /* ── Pet data grid ── */
  var grid = document.getElementById('pet-data-grid');
  if (grid) {
    var cells = [
      ['Nombre', d.name], ['Dueño/a', d.ownerName], ['Especie', d.species], ['Género', d.gender],
      ['Edad', d.age], ['Peso', d.weight ? d.weight + ' kg' : null], ['Nacimiento', d.birthdate],
      ['Teléfono', d.phone], ['Mensaje', d.message], ['Comportamiento', d.behavior], ['Médica', d.medical]
    ].filter(function(c) { return c[1]; });
    grid.innerHTML = cells.map(function(c) {
      return '<div class="info-cell"><div class="info-label-sm">' + esc(c[0]) + '</div><div class="info-value-sm">' + esc(String(c[1])) + '</div></div>';
    }).join('') || '<div class="info-cell" style="grid-column:1/-1"><div class="info-value-sm" style="color:var(--muted-dark)">Sin datos registrados aún.</div></div>';
  }

  /* ── Load scan logs ── */
  loadScanLogs(petId, firestoreDb);
}

/* Exposed as window.loadScanLogs for use by both client-dashboard and pet.html */
window.loadScanLogs = function(petId, firestoreDb) {
  firestoreDb = firestoreDb || ((typeof _db !== 'undefined' && _db) ? _db : firebase.firestore());

  var listEl  = document.getElementById('scans-list');
  var mapEl   = document.getElementById('last-map-container');

  /* Show loading state */
  if (listEl) listEl.innerHTML = '<div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div><p style="margin-top:10px;font-size:.85rem">Cargando historial…</p></div>';
  if (mapEl)  mapEl.innerHTML  = '<div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div><p style="margin-top:10px;font-size:.85rem">Cargando mapa…</p></div>';

  firestoreDb.collection('scan_logs')
    .where('petId', '==', petId)
    .orderBy('scannedAt', 'desc')
    .limit(20)
    .get()
    .then(function(snap) {
      /* ── Stats ── */
      var withGeo = 0, lastWithCoords = null, lastDate = '—';

      snap.forEach(function(doc) {
        var s = doc.data();
        if (s.latitude && s.longitude) { withGeo++; if (!lastWithCoords) lastWithCoords = s; }
      });

      var sScans   = document.getElementById('stat-scans');    if (sScans)   sScans.textContent   = snap.size;
      var sGeo     = document.getElementById('stat-with-geo'); if (sGeo)     sGeo.textContent     = withGeo > 0 ? '✅ ' + withGeo + ' con ubicación' : 'Sin ubicación';
      var sLast    = document.getElementById('stat-last-scan');
      var sScanCnt = document.getElementById('scan-count');

      if (!snap.empty && snap.docs[0].data().scannedAt && snap.docs[0].data().scannedAt.toDate) {
        lastDate = formatDate(snap.docs[0].data().scannedAt.toDate());
      }
      if (sLast)    sLast.textContent    = lastDate;
      if (sScanCnt) sScanCnt.textContent = 'Escaneos: ' + snap.size;

      /* ── Map: most recent with coords ── */
      if (mapEl) {
        if (lastWithCoords) {
          var lat = lastWithCoords.latitude.toFixed(6);
          var lng = lastWithCoords.longitude.toFixed(6);
          var mUrl = 'https://maps.google.com/maps?q=' + lat + ',' + lng;
          mapEl.innerHTML =
            '<div class="map-container">' +
              '<iframe loading="lazy" src="https://maps.google.com/maps?q=' + lat + ',' + lng + '&z=15&output=embed" title="Ubicación del escaneo"></iframe>' +
            '</div>' +
            '<a href="' + mUrl + '" target="_blank" rel="noopener" class="scan-map-link" style="display:inline-flex;align-items:center;gap:5px;margin-top:10px;font-size:.82rem">' +
              '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-link-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Abrir en Google Maps' +
            '</a>';
        } else {
          mapEl.innerHTML = '<div class="empty-state"><div style="font-size:32px;margin-bottom:10px">📍</div><p style="font-size:.85rem">Sin escaneos con ubicación compartida aún.</p></div>';
        }
      }

      /* ── Scan list ── */
      if (listEl) {
        if (snap.empty) {
          listEl.innerHTML = '<div class="empty-state"><div style="font-size:32px;margin-bottom:10px">📡</div><p style="font-size:.85rem">No hay escaneos registrados aún.</p></div>';
          return;
        }
        var html = '';
        snap.forEach(function(doc) {
          var s     = doc.data();
          var fecha = s.scannedAt && s.scannedAt.toDate ? formatDateTime(s.scannedAt.toDate()) : '—';
          var geoHtml;
          if (s.latitude && s.longitude) {
            var mUrl2 = 'https://maps.google.com/maps?q=' + s.latitude.toFixed(6) + ',' + s.longitude.toFixed(6);
            geoHtml =
              '<div class="scan-coords">📍 ' + s.latitude.toFixed(4) + ', ' + s.longitude.toFixed(4) +
              (s.accuracy ? ' · ±' + Math.round(s.accuracy) + 'm' : '') + '</div>' +
              '<a class="scan-map-link" href="' + mUrl2 + '" target="_blank" rel="noopener"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-link-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Ver en mapa</a>';
          } else {
            geoHtml = '<div class="scan-coords" style="opacity:.5">Sin ubicación compartida</div>';
          }
          html += '<div class="scan-item"><div class="scan-dot"></div><div><div class="scan-date">' + esc(fecha) + '</div>' + geoHtml + '</div></div>';
        });
        listEl.innerHTML = html;
      }
    })
    .catch(function(e) {
      var isIndex = e.message && e.message.toLowerCase().includes('index');
      var errMsg  = isIndex
        ? '<p style="color:var(--muted-dark);font-size:.82rem">Se requiere un índice de Firebase. Se configura automáticamente en unos minutos, recarga después.</p>'
        : '<p style="color:var(--error);font-size:.82rem">Error al cargar escaneos: ' + esc(e.message) + '</p>';
      if (listEl) listEl.innerHTML = errMsg;
      if (mapEl)  mapEl.innerHTML  = errMsg;
      ['stat-scans','stat-with-geo','stat-last-scan'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.textContent = '—';
      });
    });
};

/* Backward-compat alias used by initClientApp before rename */
var loadClientScans = window.loadScanLogs;

window.showClientTab = function(tabId, btn) {
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b)   { b.classList.remove('active'); });
  var tab = document.getElementById(tabId); if (tab) tab.classList.add('active');
  if (btn) btn.classList.add('active');
};

window.copyEditUrl = function() {
  var el = document.getElementById('edit-url-display');
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(function() { toast('📋 Enlace copiado'); });
};

/* ── Update pet profile from client dashboard ── */
window.updatePetData = function() {
  if (!_dash.currentUser || _dash.currentUser.role !== 'client') { toast('⚠️ Acceso denegado.'); return; }
  var petId = _dash.currentUser.petId;
  if (!petId) { toast('⚠️ ID de mascota no encontrado.'); return; }
  var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore();

  var fields = [
    ['edit-pet-name',     'name'],
    ['edit-pet-message',  'message'],
    ['edit-pet-behavior', 'behavior'],
    ['edit-pet-medical',  'medical']
  ];
  var updates = {};
  fields.forEach(function(f) {
    var el = document.getElementById(f[0]);
    if (el && el.value.trim()) updates[f[1]] = el.value.trim();
  });
  if (!Object.keys(updates).length) { toast('⚠️ No hay cambios para guardar.'); return; }

  var btn = document.getElementById('btn-update-pet');
  if (btn) { btn.disabled = true; btn.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-refresh-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Guardando…'; }

  firestoreDb.collection('pets').doc(petId).update(updates)
    .then(function() {
      toast('✅ Perfil actualizado correctamente.');
      if (updates.name) {
        var cn = document.getElementById('card-name'); if (cn) cn.textContent = updates.name;
        var tn = document.getElementById('top-name');  if (tn) tn.textContent = updates.name;
      }
    })
    .catch(function(e) { toast('❌ Error: ' + e.message); })
    .finally(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-document-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="" aria-hidden="true"> Guardar cambios'; }
    });
};

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════════════════════ */
window.initLanding = function() {
  var navbar=document.getElementById('navbar');
  if(navbar) window.addEventListener('scroll',function(){navbar.classList.toggle('scrolled',window.scrollY>20);});

  document.querySelectorAll('a[href^="#"]').forEach(function(link){
    link.addEventListener('click',function(e){
      var target=document.querySelector(this.getAttribute('href'));
      if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });
};

window.toggleNavMenu = function() {
  var m=document.getElementById('nav-mobile');if(m)m.classList.toggle('open');
};
