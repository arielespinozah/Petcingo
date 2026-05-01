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
  loadRecentReserved();
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
    /* stock = reservadas (not yet activated) */
    var stockEl=document.getElementById('stat-stock');
    if(stockEl)animCount('stat-stock', reservadas);
    /* sold = total assigned plates (activo+perdido+vencida+reservada) — excludes directSale stock */
    var soldEl=document.getElementById('stat-sold');
    if(soldEl)animCount('stat-sold', total);
    /* Extra labels shown below each stat */
    var resEl = document.getElementById('stat-reserved-label');
    if (resEl) resEl.textContent = reservadas + ' reservadas';
  }).catch(function(e) { console.error('loadStats:', e.message); });
}

function loadRecent() {
  db().collection('pets').where('status','in',['activo','perdido']).orderBy('createdAt','desc').limit(5).get()
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
        var bCls=d.status==='perdido'?'badge-lost':d.status==='reservada'?'badge-reserved':'badge-active';
        var bTxt=d.status==='perdido'?'🚨 Perdido':d.status==='reservada'?'⏳ Reservada':'✅ Activo';
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
  var cnt2 = document.getElementById('table-count');
  if (!pets.length) {
    tbody.innerHTML = '';
    var etr = document.createElement('tr');
    var etd = document.createElement('td');
    etd.colSpan = 6;
    etd.innerHTML = '<div class="empty-state"><div class="es-icon">X</div><p>' +
      (_dash.showingTrash ? 'Papelera vacia.' : 'No hay mascotas.') + '</p></div>';
    etr.appendChild(etd);
    tbody.appendChild(etr);
    if (cnt2) cnt2.textContent = '';
    return;
  }
  var ACT  = 'https://prueb2.dashnexpages.net/activacion/?id=';
  var PERF = 'https://prueb2.dashnexpages.net/perfil-mascota-petcingo/?id=';
  var CLI  = 'https://prueb2.dashnexpages.net/cliente/?id=';
  var now  = new Date();
  var frag = document.createDocumentFragment();
  pets.forEach(function(d) {
    var id = d._id || d.id || '';
    if (!id) return;
    var bCls = 'badge-active', bTxt = 'Activo';
    if      (d.status === 'reservada') { bCls = 'badge-reserved'; bTxt = 'Reservada'; }
    else if (d.status === 'deleted')   { bCls = 'badge-expired';  bTxt = 'Papelera'; }
    else if (d.status === 'perdido')   { bCls = 'badge-lost';     bTxt = 'Perdido'; }
    else if (d.subscription && d.subscription.expiresAt) {
      var exp = d.subscription.expiresAt.toDate
        ? d.subscription.expiresAt.toDate()
        : new Date(d.subscription.expiresAt);
      if (exp < now) { bCls = 'badge-expired'; bTxt = 'Vencida'; }
    }
    var tr = document.createElement('tr');
    function td(text, cls) {
      var el = document.createElement('td');
      if (cls) el.className = cls;
      el.textContent = text;
      return el;
    }
    tr.appendChild(td(id, 'td-id'));
    tr.appendChild(td(d.name || '', 'td-name'));
    tr.appendChild(td(d.ownerName || d.phone || '', 'td-owner'));
    var tdBadge = document.createElement('td');
    var badge = document.createElement('span');
    badge.className = 'badge ' + bCls;
    badge.textContent = bTxt;
    tdBadge.appendChild(badge);
    tr.appendChild(tdBadge);
    tr.appendChild(td(d.createdAt && d.createdAt.toDate ? formatDate(d.createdAt.toDate()) : '', 'td-date'));
    var tdAct = document.createElement('td');
    tdAct.className = 'td-actions';
    if (d.status === 'deleted') {
      var b1 = document.createElement('button');
      b1.className = 'btn btn-ghost btn-sm';
      b1.innerHTML = '<i class="ri-arrow-go-back-line"></i> Restaurar';
      b1.onclick = (function(pid){ return function(){ restorePet(pid); }; })(id);
      var b2 = document.createElement('button');
      b2.className = 'btn-danger-outline';
      b2.innerHTML = '<i class="ri-delete-bin-line"></i>';
      b2.onclick = (function(pid){ return function(){ permanentDelete(pid); }; })(id);
      tdAct.appendChild(b1);
      tdAct.appendChild(b2);
    } else if (d.status === 'reservada') {
      var a1 = document.createElement('a');
      a1.href = ACT + encodeURIComponent(id);
      a1.target = '_blank';
      a1.className = 'btn btn-ghost btn-sm';
      a1.innerHTML = '<i class="ri-qr-code-line"></i> Ver placa';
      var b3 = document.createElement('button');
      b3.className = 'btn-danger-outline';
      b3.innerHTML = '<i class="ri-delete-bin-line"></i>';
      b3.onclick = (function(pid){ return function(){ archivePet(pid); }; })(id);
      tdAct.appendChild(a1);
      tdAct.appendChild(b3);
    } else {
      var a2 = document.createElement('a');
      a2.href = PERF + encodeURIComponent(id);
      a2.target = '_blank';
      a2.className = 'btn btn-ghost btn-sm';
      a2.innerHTML = '<i class="ri-eye-line"></i> Ver perfil';
      tdAct.appendChild(a2);
      if (d.editToken) {
        var a3 = document.createElement('a');
        a3.href = CLI + encodeURIComponent(id);
        a3.target = '_blank';
        a3.className = 'btn btn-ghost btn-sm';
        a3.innerHTML = '<i class="ri-user-line"></i>';
        tdAct.appendChild(a3);
      }
      var b4 = document.createElement('button');
      b4.className = 'btn-danger-outline';
      b4.innerHTML = '<i class="ri-delete-bin-line"></i>';
      b4.onclick = (function(pid){ return function(){ archivePet(pid); }; })(id);
      tdAct.appendChild(b4);
    }
    tr.appendChild(tdAct);
    frag.appendChild(tr);
  });
  tbody.innerHTML = '';
  tbody.appendChild(frag);
  if (cnt2) cnt2.textContent = 'Mostrando ' + pets.length +
    (_dash.showingTrash ? ' en papelera' : ' de ' + _dash.allPets.length + ' mascotas');
}

window.toggleTrash = function() {
  _dash.showingTrash = !_dash.showingTrash;
  var btn = document.getElementById('btn-trash');
  if (btn) {
    btn.innerHTML = _dash.showingTrash ? '<i class="ri-arrow-go-back-line"></i> Ver Activas' : '<i class="ri-delete-bin-line"></i> Papelera';
    btn.style.color = _dash.showingTrash ? 'var(--success)' : 'var(--error)';
  }
  var h2 = document.querySelector('#sec-pets .page-header h2');
  if (h2) h2.innerHTML = _dash.showingTrash ? '<i class="ri-delete-bin-line"></i> Papelera' : '<i class="ri-footprint-line"></i> Mascotas Registradas';
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
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="ri-loader-4-line"></i> Reservando…'; }

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
    .finally(function() { if(btn){ btn.disabled=false; btn.innerHTML='<i class="ri-add-circle-line"></i> Crear y Reservar Placa'; } });
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
  if(disp) disp.innerHTML='<div style="text-align:center;color:var(--muted-dark);padding:48px 20px"><i class="ri-qr-scan-2-line" style="font-size:64px;opacity:.15;display:block;margin-bottom:12px"></i><p style="font-size:.85rem">El QR aparecerá aquí</p></div>';
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
          '<td class="td-actions"><button class="btn btn-ghost btn-sm" onclick="editVet(\''+doc.id+'\',\''+encodeData(d)+'\')"><i class="ri-edit-line"></i> Editar</button>'+
          '<button class="btn-danger-outline" onclick="deleteRecord(\'veterinarias\',\''+doc.id+'\',\'loadVets\')"><i class="ri-delete-bin-line"></i></button></td></tr>';
      });
      tbody.innerHTML=html;
    }).catch(function(e){tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><p>Error: '+esc(e.message)+'</p></div></td></tr>';});
}
window.loadVets=loadVets;
/* ── Edit Vet Modal ── */
window.editVet = function(vetId, dataJson) {
  var d;
  try { d = JSON.parse(dataJson); } catch(e) { d = {}; }
  var fields = { 'ev-name':d.name, 'ev-contact':d.contact, 'ev-city':d.city,
    'ev-phone':d.phone, 'ev-address':d.address, 'ev-prefix':d.prefix };
  Object.keys(fields).forEach(function(id){ var el=document.getElementById(id); if(el) el.value=fields[id]||''; });
  document.getElementById('ev-vet-id').value = vetId;
  var modal = document.getElementById('vet-edit-modal');
  if (modal) modal.style.display='flex';
};

window.closeVetModal = function() {
  var modal = document.getElementById('vet-edit-modal');
  if (modal) modal.style.display='none';
};

window.updateVet = function() {
  var vetId = document.getElementById('ev-vet-id').value;
  var name  = document.getElementById('ev-name').value.trim();
  if (!name) { toast('⚠️ El nombre es obligatorio.'); return; }
  var update = {
    name:    name,
    contact: document.getElementById('ev-contact').value.trim(),
    city:    document.getElementById('ev-city').value.trim(),
    phone:   document.getElementById('ev-phone').value.trim(),
    address: document.getElementById('ev-address').value.trim(),
    prefix:  document.getElementById('ev-prefix').value.trim().toUpperCase()
  };
  var btn = document.getElementById('btn-update-vet');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="ri-loader-4-line"></i> Guardando…'; }
  db().collection('veterinarias').doc(vetId).update(update)
    .then(function() {
      toast('✅ Veterinaria actualizada: '+name);
      closeVetModal();
      loadVets();
    })
    .catch(function(e) { toast('❌ Error: '+e.message); })
    .finally(function() { if(btn){ btn.disabled=false; btn.innerHTML='<i class="ri-save-line"></i> Guardar cambios'; } });
};


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
    if(disp)disp.innerHTML='<div style="text-align:center;color:var(--muted-dark);padding:48px 20px"><i class="ri-qr-code-line" style="font-size:64px;opacity:.2;display:block;margin-bottom:12px"></i><p style="font-size:.85rem">El QR aparecerá aquí</p></div>';
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
          '<td class="td-actions"><a href="https://prueb2.dashnexpages.net/perfil-mascota-petcingo/?id='+encodeURIComponent(id)+'" target="_blank" class="btn btn-ghost btn-sm"><i class="ri-eye-line"></i></a></td></tr>';
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
          '<td class="td-actions"><button class="btn btn-ghost btn-sm" onclick="openShelterDetail(\''+doc.id+'\')"><i class="ri-settings-3-line"></i> Placas</button>'+
          '<button class="btn btn-ghost btn-sm" onclick="editShelter(\''+doc.id+'\',\''+encodeData(d)+'\')"><i class="ri-edit-line"></i> Editar</button>'+
          '<a class="btn btn-ghost btn-sm" href="https://prueb2.dashnexpages.net/refugio-panel-control/?auto='+doc.id+'" target="_blank" title="Panel del refugio"><i class="ri-external-link-line"></i> Panel</a>'+
          '<button class="btn-danger-outline" onclick="deleteRecord(\'shelters\',\''+doc.id+'\',\'loadShelters\')"><i class="ri-delete-bin-line"></i></button></td></tr>';
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
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="ri-loader-4-line"></i> Guardando…'; }

  db().collection('shelters').doc(shId).update(update)
    .then(function() {
      toast('✅ Refugio actualizado: '+name);
      closeShelterModal();
      loadShelters();
      addLog('updated_shelter', name, _dash.currentUser&&_dash.currentUser.name);
    })
    .catch(function(e) { toast('❌ Error: '+e.message); })
    .finally(function() { if(btn){ btn.disabled=false; btn.innerHTML='<i class="ri-save-line"></i> Guardar cambios'; } });
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
    if(disp)disp.innerHTML='<div style="text-align:center;color:var(--muted-dark);padding:48px 20px"><i class="ri-qr-code-line" style="font-size:64px;opacity:.2;display:block;margin-bottom:12px"></i><p style="font-size:.85rem">El QR aparecerá aquí</p></div>';
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
          '<td class="td-actions"><a href="https://prueb2.dashnexpages.net/perfil-mascota-petcingo/?id='+encodeURIComponent(id)+'" target="_blank" class="btn btn-ghost btn-sm"><i class="ri-eye-line"></i></a></td></tr>';
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
          (isAdmin?'<button class="btn btn-ghost btn-sm" onclick="editUser(\''+doc.id+'\',\''+esc(d.username||'')+'\',\''+permsStr+'\',\''+esc(d.role||'')+'\')" style="margin-right:6px"><i class="ri-edit-line"></i></button>'+
            '<button class="btn-danger-outline" onclick="deleteRecord(\'users\',\''+doc.id+'\',\'loadUsers\')"><i class="ri-delete-bin-line"></i></button>':'')+
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

var _logsLastDoc = null;
var _logsPageSize = 25;

function loadLogs(reset) {
  var el=document.getElementById('logs-list');if(!el)return;
  var moreBtn = document.getElementById('btn-load-more-logs');
  if(reset || !_logsLastDoc){
    _logsLastDoc=null;
    el.innerHTML='<div class="empty-state" style="padding:20px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
  }
  var q = db().collection('logs').orderBy('date','desc').limit(_logsPageSize);
  if(_logsLastDoc) q = q.startAfter(_logsLastDoc);
  q.get().then(function(snap){
    if(snap.empty && !_logsLastDoc){
      el.innerHTML='<p style="color:var(--muted-dark);font-size:.85rem;padding:8px 0">No hay logs de auditoría.</p>';
      if(moreBtn)moreBtn.style.display='none';
      return;
    }
    if(reset || !el.querySelector('table')){
      var tbl=document.createElement('table');
      tbl.style.cssText='width:100%;border-collapse:collapse;font-size:.8rem';
      tbl.id='log-table';
      tbl.innerHTML='<thead><tr>'+
        '<th style="text-align:left;padding:7px 10px;color:var(--muted-dark);font-size:.67rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07);white-space:nowrap">Fecha</th>'+
        '<th style="text-align:left;padding:7px 10px;color:var(--muted-dark);font-size:.67rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07);white-space:nowrap">Hora</th>'+
        '<th style="text-align:left;padding:7px 10px;color:var(--muted-dark);font-size:.67rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Usuario</th>'+
        '<th style="text-align:left;padding:7px 10px;color:var(--muted-dark);font-size:.67rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Acción</th>'+
        '<th style="text-align:left;padding:7px 10px;color:var(--muted-dark);font-size:.67rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">ID Objetivo</th>'+
        '</tr></thead><tbody id="log-tbody"></tbody>';
      el.innerHTML='';el.appendChild(tbl);
    }
    var logTbody=document.getElementById('log-tbody');
    snap.forEach(function(doc){
      var d=doc.data();
      var dt=d.date&&d.date.toDate?d.date.toDate():null;
      var fecha=dt?dt.toLocaleDateString('es-BO',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
      var hora=dt?dt.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'}):'—';
      var actionType=d.action||'—';
      var actColor=actionType.includes('delet')||actionType.includes('elimin')?'#ff3b6b':
                   actionType.includes('login')?'var(--accent)':
                   actionType.includes('creat')||actionType.includes('register')||actionType.includes('creo')?'#00c896':'var(--text-dark)';
      var tr=document.createElement('tr');
      tr.style.borderBottom='1px solid rgba(255,255,255,.04)';
      tr.innerHTML='<td style="padding:8px 10px;color:var(--muted-dark);white-space:nowrap">'+esc(fecha)+'</td>'+
        '<td style="padding:8px 10px;color:var(--muted-dark);white-space:nowrap;font-family:monospace;font-size:.75rem">'+esc(hora)+'</td>'+
        '<td style="padding:8px 10px;font-weight:600">'+esc(d.user||'sistema')+'</td>'+
        '<td style="padding:8px 10px"><span style="color:'+actColor+';font-size:.78rem;font-weight:600">'+esc(actionType)+'</span></td>'+
        '<td style="padding:8px 10px;color:var(--muted-dark);font-family:monospace;font-size:.75rem">'+esc(d.targetId||'—')+'</td>';
      if(logTbody)logTbody.appendChild(tr);
    });
    _logsLastDoc = snap.docs[snap.docs.length-1];
    if(moreBtn) moreBtn.style.display = snap.size < _logsPageSize ? 'none' : 'block';
  }).catch(function(e){
    if(!_logsLastDoc) el.innerHTML='<p style="color:var(--error);font-size:.85rem">Error: '+esc(e.message)+'</p>';
  });
}
window.loadLogs=loadLogs;
/* ── Recent Reserved ───────────────────────────────────────── */
function loadRecentReserved() {
  var el = document.getElementById('recent-reserved-list');
  if (!el) return;
  db().collection('pets').where('status','==','reservada').orderBy('createdAt','desc').limit(5).get()
    .then(function(snap) {
      if (snap.empty) { el.innerHTML='<div class="empty-state"><p>No hay placas reservadas aún.</p></div>'; return; }
      var html='<table style="width:100%;border-collapse:collapse;font-size:.83rem"><thead><tr>'+
        '<th style="text-align:left;padding:8px;color:var(--muted-dark);font-size:.68rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">ID Placa</th>'+
        '<th style="text-align:left;padding:8px;color:var(--muted-dark);font-size:.68rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Vendedor</th>'+
        '<th style="text-align:left;padding:8px;color:var(--muted-dark);font-size:.68rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Fecha</th>'+
        '</tr></thead><tbody>';
      snap.forEach(function(doc) {
        var d=doc.data(), id=doc.id;
        var fecha=d.createdAt&&d.createdAt.toDate?formatDate(d.createdAt.toDate()):'—';
        var actUrl='https://prueb2.dashnexpages.net/activacion/?id='+encodeURIComponent(id);
        html+='<tr style="border-bottom:1px solid rgba(255,255,255,.04)">'+
          '<td style="padding:9px 8px"><a href="'+actUrl+'" target="_blank" style="color:var(--accent);font-weight:700;font-family:monospace;font-size:.82rem">'+esc(id)+'</a></td>'+
          '<td style="padding:9px 8px;color:var(--muted-dark);font-size:.78rem">'+esc(d.sellerName||'—')+'</td>'+
          '<td style="padding:9px 8px;color:var(--muted-dark)">'+fecha+'</td></tr>';
      });
      html+='</tbody></table>';
      el.innerHTML=html;
    }).catch(function() { el.innerHTML='<div class="empty-state"><p>Cargando…</p></div>'; });
}
window.loadRecentReserved = loadRecentReserved;

window.loadMoreLogs=function(){ loadLogs(false); };

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

/* ── Scan Log Retention ── */
window.purgeScanLogs = function() {
  var inp = document.getElementById('cfg-scan-days');
  var days = inp ? parseInt(inp.value, 10) : 90;
  if (!days || days < 7) days = 90;
  if (!confirm('¿Eliminar escaneos con más de ' + days + ' días? Esta acción no se puede deshacer.')) return;
  var cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  db().collection('scan_logs').where('scannedAt', '<', cutoff).get()
    .then(function(snap) {
      if (snap.empty) { toast('No hay escaneos tan antiguos.'); return; }
      var total = snap.size;
      var chunks = [];
      for (var i = 0; i < snap.docs.length; i += 400) chunks.push(snap.docs.slice(i, i + 400));
      var seq = Promise.resolve();
      chunks.forEach(function(chunk) {
        seq = seq.then(function() {
          var batch = db().batch();
          chunk.forEach(function(doc) { batch.delete(doc.ref); });
          return batch.commit();
        });
      });
      return seq.then(function() { toast('🗑 ' + total + ' escaneos eliminados.'); });
    })
    .catch(function(e) { toast('❌ ' + e.message); });
};

/* ── Full Backup ── */
window.exportFullBackup = function() {
  var COLLECTIONS = ['pets', 'users', 'veterinarias', 'shelters', 'scan_logs', 'logs', 'staff'];
  var backup = { version: 1, exportedAt: new Date().toISOString(), data: {} };
  var btn = document.getElementById('btn-full-backup');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Exportando…'; }
  toast('Exportando backup completo…');

  var promises = COLLECTIONS.map(function(col) {
    return db().collection(col).get()
      .then(function(snap) {
        backup.data[col] = [];
        snap.forEach(function(doc) {
          var d = doc.data();
          /* Convert Timestamps to ISO strings */
          Object.keys(d).forEach(function(k) {
            if (d[k] && typeof d[k].toDate === 'function') d[k] = d[k].toDate().toISOString();
          });
          backup.data[col].push(Object.assign({ _id: doc.id }, d));
        });
      })
      .catch(function() { backup.data[col] = []; });
  });

  Promise.all(promises).then(function() {
    var json = JSON.stringify(backup, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'petcingo-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast('✅ Backup completo descargado.');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ri-download-cloud-line"></i> Exportar Backup Completo'; }
  });
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
            '<a href="https://prueb2.dashnexpages.net/activacion/?id=' + encodeURIComponent(plateId) + '" style="margin-top:14px;display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:#5100c0;color:#fff;border-radius:12px;font-weight:700;font-size:.85rem;text-decoration:none">Activar placa →</a>';
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
        ? '<a href="https://prueb2.dashnexpages.net/activacion/?id=' + encodeURIComponent(plateId) + '" style="margin-top:14px;display:inline-block;padding:10px 18px;background:#5100c0;color:#fff;border-radius:12px;font-weight:700;font-size:.85rem;text-decoration:none">Activar placa →</a>'
        : '');
  }
}

function renderPetProfile(d, petId) {
  var isLost = d.status === 'perdido';
  if (isLost) {
    var banner=document.getElementById('pet-lost-banner'); if(banner)banner.style.display='block';
    var heroEl=document.getElementById('pet-hero'); if(heroEl)heroEl.classList.add('is-lost');
    var metaTheme=document.getElementById('meta-theme'); if(metaTheme)metaTheme.content='#cc0040';
  }

  /* Soporte: reporte dinamico */
  var reportBtn=document.getElementById('pet-report-btn');
  if(reportBtn){
    var reportMsg='¡Hola! Quiero reportar un problema con la placa *'+petId+'* en Petcingo.';
    reportBtn.href='https://wa.me/59171040074?text='+encodeURIComponent(reportMsg);
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

  /* Chips — especie, edad (calculada), género, peso */
  var chips=document.getElementById('pet-chips');
  if(chips){
    var ch='';
    /* Calcular edad si solo hay birthdate */
    var chipAge=d.age||'';
    if(!chipAge&&d.birthdate){
      var _bd=new Date(d.birthdate),_now=new Date();
      var _y=_now.getFullYear()-_bd.getFullYear(),_m=_now.getMonth()-_bd.getMonth();
      if(_m<0||(_m===0&&_now.getDate()<_bd.getDate())){_y--;_m=(_m+12)%12;}
      chipAge=_y>0?_y+' año'+(_y>1?'s':''):_m+' mes'+(_m!==1?'es':'');
    }
    if(chipAge)  ch+='<span class="pet-chip">🎂 '+esc(chipAge)+'</span>';
    if(d.gender) ch+='<span class="pet-chip">'+(d.gender==='Macho'?'♂ Macho':'♀ Hembra')+'</span>';
    if(d.weight) ch+='<span class="pet-chip">⚖️ '+esc(d.weight)+' kg</span>';
    chips.innerHTML=ch;
  }

  /* Contact */
  _buildPetContactPanel(d, isLost);

  /* Owner info accordion */
  _buildPetOwnerAccordion(d);

  /* Message accordion */
  if(d.message){
    var acc=document.getElementById('pet-acc-message');if(acc)acc.style.display='block';
    var val=document.getElementById('pet-acc-message-val');if(val)val.textContent=d.message;
  }

  /* Pet data + medical accordions */
  _buildPetDataAccordion(d);

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
    manageEl.innerHTML = '<a href="' + dashUrl + '" style="display:inline-flex;align-items:center;gap:8px;padding:12px 20px;background:rgba(81,0,192,.10);border:1.5px solid rgba(81,0,192,.25);border-radius:14px;color:#5100c0;font-weight:700;font-size:.88rem;text-decoration:none;margin-top:4px"><i class="ri-settings-3-line"></i> Gestionar mi mascota</a>';
    manageEl.style.display = 'block';
  }
}

function _buildPetOwnerAccordion(d) {
  var acc=document.getElementById('pet-acc-owner');
  var content=document.getElementById('pet-acc-owner-content');
  if(!acc||!content)return;
  var rows='';
  if(d.ownerName) rows+=_petInfoRow('ri-user-3-line','Propietario/a',d.ownerName);
  if(d.phone)  rows+=_petInfoRow('ri-phone-line','Teléfono principal',d.phone);
  if(d.phone2) rows+=_petInfoRow('ri-phone-line','Teléfono alternativo',d.phone2);
  if(d.ownerLocation){
    var loc=d.ownerLocation;
    if(loc.text) rows+=_petInfoRow('ri-home-4-line','Dirección de referencia',loc.text);
    if(loc.dept){
      var locStr=loc.dept+(loc.prov?' — '+loc.prov:'')+(loc.country&&loc.country!=='Bolivia'?', '+loc.country:', Bolivia');
      rows+=_petInfoRow('ri-map-2-line','Ubicación',locStr);
    } else if(loc.country&&loc.country!=='Bolivia'){
      rows+=_petInfoRow('ri-global-line','País',loc.country);
    }
    if(loc.gpsLink){
      rows+='<div class="pet-info-row"><i class="ri-navigation-line pet-info-icon"></i><div><div class="pet-info-label">Ubicación GPS</div><a href="'+esc(loc.gpsLink)+'" target="_blank" rel="noopener" class="pet-location-link"><i class="ri-external-link-line"></i> Ver en Google Maps</a></div></div>';
    } else if(loc.lat&&loc.lng){
      var mapsUrl='https://maps.google.com/maps?q='+loc.lat.toFixed(6)+','+loc.lng.toFixed(6);
      rows+='<div class="pet-info-row"><i class="ri-navigation-line pet-info-icon"></i><div><div class="pet-info-label">Ubicación GPS</div><a href="'+mapsUrl+'" target="_blank" rel="noopener" class="pet-location-link"><i class="ri-external-link-line"></i> Ver en Google Maps</a></div></div>';
    }
  }
  if(rows){acc.style.display='block';content.innerHTML=rows;}
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
  if(phone1)html+='<a class="btn btn-wa" href="'+waUrl1+'" target="_blank" rel="noopener"><i class="ri-whatsapp-line"></i> WhatsApp al dueño</a>';
  if(phone2){var waUrl2='https://wa.me/'+phone2+'?text='+encodeURIComponent(waMsg);html+='<a class="btn btn-wa2" href="'+waUrl2+'" target="_blank" rel="noopener"><i class="ri-whatsapp-line"></i> WhatsApp alternativo</a>';}
  if(d.phone)html+='<a class="btn btn-call-pet" href="tel:'+esc(d.phone)+'"><i class="ri-phone-line"></i> Llamar al dueño</a>';
  panel.innerHTML=html||'<p style="color:#7a6e8a;font-size:.85rem;text-align:center">Sin contacto registrado</p>';

  var fab=document.getElementById('fab-wa');
  if(fab&&phone1){fab.href=waUrl1;fab.style.display='flex';}
}

function _buildPetDataAccordion(d) {
  var content=document.getElementById('pet-acc-pet-content');if(!content)return;
  var rows='';
  /* ── Age calculation ── */
  var ageDisplay=d.age||'';
  if(!ageDisplay&&d.birthdate){
    var bd=new Date(d.birthdate),now2=new Date();
    var years=now2.getFullYear()-bd.getFullYear(),months=now2.getMonth()-bd.getMonth();
    if(months<0||(months===0&&now2.getDate()<bd.getDate())){years--;months=(months+12)%12;}
    ageDisplay=years>0?years+' año'+(years>1?'s':'')+(months>0?' y '+months+' mes'+(months!==1?'es':''):''):months+' mes'+(months!==1?'es':'');
  }
  if(d.species)   rows+=_petInfoRow('ri-footprint-line','Especie',_speciesEmoji(d.species)+' '+d.species);
  if(d.breed)     rows+=_petInfoRow('ri-award-line','Raza',d.breed);
  if(ageDisplay)  rows+=_petInfoRow('ri-cake-line','Edad',ageDisplay);
  if(d.birthdate) rows+=_petInfoRow('ri-calendar-event-line','Fecha de nacimiento',d.birthdate);
  if(d.weight)    rows+=_petInfoRow('ri-scales-line','Peso',d.weight+' kg');
  if(d.behavior)  rows+=_petInfoRow('ri-star-line','Comportamiento',d.behavior);
  content.innerHTML=rows||'<p style="color:#7a6e8a;font-size:.85rem;padding:4px 0">Sin datos adicionales.</p>';

  /* ── Medical accordion (health data) ── */
  var medAcc=document.getElementById('pet-acc-medical');
  var medContent=document.getElementById('pet-acc-medical-content');
  if(!medAcc||!medContent)return;
  var medRows='';
  if(d.medical)              medRows+=_petInfoRow('ri-capsule-line','Info médica',d.medical);
  if(d.vaccinationStatus==='yes') {
    medRows+=_petInfoRow('ri-shield-check-line','Vacunado','Sí');
    if(d.vaccinationDetails) medRows+=_petInfoRow('ri-file-list-3-line','Detalle vacunas',d.vaccinationDetails);
  } else if(d.vaccinationStatus==='no') {
    medRows+=_petInfoRow('ri-shield-cross-line','Vacunado','No');
  }
  if(d.rabiesVaccineCode)   medRows+=_petInfoRow('ri-syringe-line','Código vacuna rabia',d.rabiesVaccineCode);
  if(d.rabiesVaccineExpiry) medRows+=_petInfoRow('ri-calendar-check-line','Venc. vacuna rabia',d.rabiesVaccineExpiry);
  if(d.microchipped==='yes') medRows+=_petInfoRow('ri-cpu-line','Microchip','Sí ✓');
  else if(d.microchipped==='no') medRows+=_petInfoRow('ri-cpu-line','Microchip','No');
  if(d.spayNeutered==='yes') medRows+=_petInfoRow('ri-heart-line','Castrado/a','Sí ✓');
  else if(d.spayNeutered==='no') medRows+=_petInfoRow('ri-heart-line','Castrado/a','No');
  if(medRows){medAcc.style.display='block';medContent.innerHTML=medRows;}

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

  /* Check Firestore query removed to avoid composite index error. 
     We rely on localStorage to prevent spamming the user on refresh. */
  setTimeout(function() { _showGeoModal(petId, cacheKey, today, (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore()); }, 1200);
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
      window._currentPetData = d; // Guardar globalmente para poder recargar la vista

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
  var aw  = document.getElementById('auth-wall');
  var app = document.getElementById('app');
  if (aw)  { aw.setAttribute('style','display:flex!important;background:#f4f6f9!important;background-color:#f4f6f9!important;color:#1a1a2e!important;'); aw.classList.add('show'); }
  if (app) { app.setAttribute('style','display:none!important'); }
}

function initClientApp(d, petId, editToken, firestoreDb) {
  window._clientPetId     = petId;
  window._clientToken     = editToken;
  window._clientFirestore = firestoreDb;
  var app = document.getElementById('app');
  var aw  = document.getElementById('auth-wall');
  if (app) { app.setAttribute('style','display:block!important'); }
  if (aw)  { aw.setAttribute('style','display:none!important'); aw.classList.remove('show'); }

  var editUrl    = 'https://prueb2.dashnexpages.net/cliente/?id=' + petId + '&token=' + editToken;
  var profileUrl = 'https://prueb2.dashnexpages.net/perfil-mascota-petcingo/?id=' + petId;

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

  /* ── Tab: Mi Mascota (Modo Lectura) ── */
  renderClientPetGrid(d);

  var ss = document.getElementById('stat-status'); if (ss) ss.textContent = sTxt[d.status] || d.status || '—';

  /* ── Lost card UI ── */
  function _updateLostUI(isLost) {
    var btn = document.getElementById('btn-toggle-lost');
    var heroCard = document.getElementById('pet-hero-card');
    var lostCard = document.getElementById('lost-alert-card');
    var lostDesc = document.getElementById('lost-card-desc');
    var csEl = document.getElementById('card-status');

    if (btn) {
      if (isLost) {
        btn.textContent = '✅ Mascota Encontrada — Desactivar alerta';
        btn.style.background = '#d1fae5';
        btn.style.color = '#065f46';
        btn.style.border = '1.5px solid #6ee7b7';
      } else {
        btn.textContent = '🚨 Marcar como Perdida';
        btn.style.background = '#fce7f3';
        btn.style.color = '#9d174d';
        btn.style.border = '1.5px solid #fbcfe8';
      }
    }
    if (heroCard) { heroCard.classList.toggle('is-lost', isLost); }
    if (lostCard) { lostCard.classList.toggle('is-lost', isLost); }
    if (lostDesc && isLost) {
      lostDesc.textContent = '🚨 Modo perdido activo. El perfil de tu mascota aparece en alerta roja. Presiona el botón cuando la encuentres.';
    } else if (lostDesc) {
      lostDesc.textContent = 'Si tu mascota se ha extraviado, activa el modo perdido. Esto cambiará su perfil a alerta roja y notificará visualmente a quien la encuentre.';
    }
    if (csEl) csEl.innerHTML = '<span class="badge ' + (sCls[isLost?'perdido':'activo'] || 'badge-reserved') + '">' + (sTxt[isLost?'perdido':'activo'] || '—') + '</span>';
  }

  _updateLostUI(d.status === 'perdido');

  window.toggleLostStatus = function() {
    var newStatus = (d.status === 'perdido') ? 'activo' : 'perdido';
    var firestoreDb2 = (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore();
    firestoreDb2.collection('pets').doc(petId).update({ status: newStatus })
      .then(function() {
        d.status = newStatus;
        var isLost = newStatus === 'perdido';
        toast(isLost ? '🚨 Modo perdido activado.' : '✅ Alerta cancelada. Mascota activa.');
        _updateLostUI(isLost);
      })
      .catch(function(e) { toast('❌ Error: ' + e.message); });
  };

  /* ── Photo Upload Logic ── */
  window._clientNewBlob = null;
  var pi=document.getElementById('edit-photo-input'), pd=document.getElementById('edit-photo-drop');
  if(pi && pd) {
    var ph=document.getElementById('edit-placeholder'), pc=document.getElementById('edit-compressing');
    var pw=document.getElementById('edit-preview-wrap'), pImg=document.getElementById('edit-preview-img');
    
    var crop1To1AndCompress = function(file) {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function() { reject(new Error('Error al leer el archivo.')); };
        reader.onload = function(evt) {
          var img = new Image();
          img.onerror = function() { reject(new Error('Imagen inválida o corrupta.')); };
          img.onload = function() {
            var canvas = document.createElement('canvas');
            canvas.width = 800; canvas.height = 800;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 800, 800);
            var size = Math.min(img.naturalWidth, img.naturalHeight);
            if (size <= 0) { reject(new Error('Imagen vacía.')); return; }
            var sx = (img.naturalWidth - size) / 2, sy = (img.naturalHeight - size) / 2;
            try { ctx.drawImage(img, sx, sy, size, size, 0, 0, 800, 800); } catch(e) { reject(new Error('Fallo al procesar imagen.')); return; }
            var bestBlob = null;
            var iterate = function(q) {
              canvas.toBlob(function(blob) {
                if (!blob) { bestBlob ? resolve(bestBlob) : reject(new Error('Tu navegador no soporta compresión.')); return; }
                bestBlob = blob;
                if (blob.size <= 15000 || q <= 0.1) resolve(blob); else iterate(+(q - 0.1).toFixed(2));
              }, 'image/jpeg', q);
            };
            iterate(0.8);
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      });
    };

    var handleEditFile = function(file){
      if(!file||!file.type.startsWith('image/'))return;
      ph.style.display='none'; pw.style.display='none';
      pc.style.display='flex'; pd.classList.remove('has-photo');
      crop1To1AndCompress(file).then(function(blob){
        window._clientNewBlob = blob;
        pImg.src = URL.createObjectURL(blob);
        pc.style.display='none'; pw.style.display='flex'; pd.classList.add('has-photo');
      }).catch(function(e){
        window._clientNewBlob = null; pc.style.display='none'; ph.style.display='block';
        toast('❌ ' + e.message);
      });
    };

    pd.addEventListener('click',function(e){if(e.target===pi)return;pi.click();});
    pi.addEventListener('change',function(e){if(e.target.files&&e.target.files[0])handleEditFile(e.target.files[0]);e.target.value='';});
    pd.addEventListener('dragover',function(e){e.preventDefault();pd.classList.add('dragover');});
    pd.addEventListener('dragleave',function(){pd.classList.remove('dragover');});
    pd.addEventListener('drop',function(e){e.preventDefault();pd.classList.remove('dragover');if(e.dataTransfer.files[0])handleEditFile(e.dataTransfer.files[0]);});
  }

  /* ── Pre-llenar formulario de edición con datos actuales ── */
  function prefillEditForm(data) {
    var map = [
      ['edit-pet-name',      data.name],
      ['edit-pet-owner',     data.ownerName],
      ['edit-pet-phone',     data.phone],
      ['edit-pet-phone2',    data.phone2],
      ['edit-pet-breed',     data.breed],
      ['edit-pet-weight',    data.weight ? String(data.weight) : ''],
      ['edit-pet-birthdate', data.birthdate],
      ['edit-pet-message',   data.message],
      ['edit-pet-behavior',  data.behavior],
      ['edit-pet-medical',   data.medical],
      ['edit-vacc-details',  data.vaccinationDetails],
      ['edit-rabies-code',   data.rabiesVaccineCode],
      ['edit-rabies-expiry', data.rabiesVaccineExpiry],
      ['edit-loc-text',      data.ownerLocation ? data.ownerLocation.text    : ''],
      ['edit-loc-gps',       data.ownerLocation ? data.ownerLocation.gpsLink : '']
    ];
    map.forEach(function(pair) {
      var el = document.getElementById(pair[0]);
      if (el && pair[1]) el.value = pair[1];
    });
    /* Location: country / dept / prov */
    if (data.ownerLocation) {
      var lc = data.ownerLocation;
      if (lc.country) {
        var cSel = document.getElementById('edit-loc-country');
        if (cSel) { cSel.value = lc.country; if (typeof onCountryChange === 'function') onCountryChange(lc.country, 'edit'); }
      }
      if (lc.dept) {
        var dSel = document.getElementById('edit-loc-dept');
        if (dSel) { dSel.value = lc.dept; if (typeof onDeptChange === 'function') onDeptChange(lc.dept, 'edit'); }
      }
      if (lc.prov) {
        var pSel = document.getElementById('edit-loc-prov');
        if (pSel) pSel.value = lc.prov;
      }
    }
    /* Species select */
    if (data.species) {
      var sp = document.getElementById('edit-pet-species');
      if (sp) sp.value = data.species;
    }
    /* Gender radio */
    if (data.gender) {
      var gr = document.querySelector('input[name="edit-pet-gender"][value="'+data.gender+'"]');
      if (gr) gr.checked = true;
    }
    /* Vaccination radio */
    if (data.vaccinationStatus) {
      var r = document.querySelector('input[name="edit-vacc-status"][value="'+data.vaccinationStatus+'"]');
      if (r) { r.checked = true; if (data.vaccinationStatus === 'yes') { var wd = document.getElementById('wrap-edit-vacc-details'); if(wd) wd.style.display = 'block'; } }
    }
    if (data.microchipped) { var r2 = document.querySelector('input[name="edit-microchip"][value="'+data.microchipped+'"]'); if (r2) r2.checked = true; }
    if (data.spayNeutered) { var r3 = document.querySelector('input[name="edit-spay"][value="'+data.spayNeutered+'"]'); if (r3) r3.checked = true; }
    /* Show current photo if exists */
    if (data.photoUrl) {
      var pw = document.getElementById('edit-preview-wrap');
      var pImg = document.getElementById('edit-preview-img');
      var pd2 = document.getElementById('edit-photo-drop');
      var ph2 = document.getElementById('edit-placeholder');
      if (pw && pImg && pd2 && ph2) {
        pImg.src = data.photoUrl;
        ph2.style.display = 'none';
        pw.style.display = 'flex';
        pd2.classList.add('has-photo');
      }
    }
  }
  prefillEditForm(d);

  /* ── Load scan logs ── */
  loadScanLogs(petId, firestoreDb, d.status);
} /* ── end initClientApp ── */

/* ── Tab: Mi Mascota (Lectura vs Edición) ── */
window.toggleEditMode = function(showEdit) {
  var readView = document.getElementById('read-only-view');
  var editView = document.getElementById('edit-form-view');
  if (showEdit) {
    if(readView) readView.style.display = 'none';
    if(editView) editView.style.display = 'block';
  } else {
    if(readView) readView.style.display = 'block';
    if(editView) editView.style.display = 'none';
  }
};

function renderClientPetGrid(d) {
  var grid = document.getElementById('pet-data-grid');
  if (!grid) return;
  
  /* Calculate age */
  var ageVal = d.age || '';
  if (!ageVal && d.birthdate) {
    var bbd = new Date(d.birthdate), nw = new Date();
    var yy = nw.getFullYear()-bbd.getFullYear(), mm = nw.getMonth()-bbd.getMonth();
    if (mm<0||(mm===0&&nw.getDate()<bbd.getDate())){yy--;mm=(mm+12)%12;}
    ageVal = yy>0 ? yy+' año'+(yy>1?'s':'') : mm+' mes'+(mm!==1?'es':'');
  }
  var vaccLabel = d.vaccinationStatus==='yes'?'Sí ✓':d.vaccinationStatus==='no'?'No':null;
  var chipLabel = d.microchipped==='yes'?'Sí ✓':d.microchipped==='no'?'No':null;
  var spayLabel = d.spayNeutered==='yes'?'Sí ✓':d.spayNeutered==='no'?'No':null;
  var locLabel  = d.ownerLocation ? (d.ownerLocation.text || null) : null;
  
  var cells = [
    ['Nombre', d.name], ['Dueño/a', d.ownerName], ['Especie', d.species], ['Raza', d.breed], ['Género', d.gender],
    ['Edad', ageVal||null], ['Nacimiento', d.birthdate], ['Peso', d.weight ? d.weight + ' kg' : null],
    ['Teléfono', d.phone], ['Mensaje', d.message], ['Comportamiento', d.behavior], ['Info médica', d.medical],
    ['Vacunado', vaccLabel], ['Vacunas detalle', d.vaccinationDetails||null],
    ['Cód. vacuna rabia', d.rabiesVaccineCode||null], ['Venc. rabia', d.rabiesVaccineExpiry||null],
    ['Microchip', chipLabel], ['Castrado/a', spayLabel], ['Zona del dueño', locLabel]
  ].filter(function(c) { return c[1] && c[1].trim() !== ''; }); // Oculta los vacíos
  
  grid.innerHTML = cells.map(function(c) {
    return '<div class="info-cell"><div class="info-label-sm">' + esc(c[0]) + '</div><div class="info-value-sm">' + esc(String(c[1])) + '</div></div>';
  }).join('') || '<div class="info-cell" style="grid-column:1/-1"><div class="info-value-sm" style="color:#6c757d">Sin datos registrados aún.</div></div>';
}

/* Exposed as window.loadScanLogs for use by both client-dashboard and pet.html */
window.loadScanLogs = function(petId, firestoreDb, petStatus) {
  firestoreDb = firestoreDb || ((typeof _db !== 'undefined' && _db) ? _db : firebase.firestore());

  var listEl  = document.getElementById('scans-list');
  var mapEl   = document.getElementById('last-map-container');

  /* Show loading state */
  if (listEl) listEl.innerHTML = '<div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div><p style="margin-top:10px;font-size:.85rem">Cargando historial…</p></div>';
  if (mapEl)  mapEl.innerHTML  = '<div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div><p style="margin-top:10px;font-size:.85rem">Cargando mapa…</p></div>';

  firestoreDb.collection('scan_logs')
    .where('petId', '==', petId)
    .get()
    .then(function(snap) {
      /* Sort locally to avoid Firebase Composite Index requirement */
      var docsArray = [];
      snap.forEach(function(doc) { docsArray.push(doc.data()); });
      docsArray.sort(function(a, b) {
        var ta = a.scannedAt && a.scannedAt.toDate ? a.scannedAt.toDate().getTime() : 0;
        var tb = b.scannedAt && b.scannedAt.toDate ? b.scannedAt.toDate().getTime() : 0;
        return tb - ta;
      });
      
      /* ── Stats ── */
      var withGeo = 0, lastWithCoords = null;
      var lastDate = '—'; // Declarar la variable para evitar el error 'is not defined'
      docsArray.forEach(function(s) {
        if (s.latitude && s.longitude) { withGeo++; if (!lastWithCoords) lastWithCoords = s; }
      });

      var totalSize = snap.size;
      var sScans   = document.getElementById('stat-scans');    if (sScans)   sScans.textContent   = totalSize;
      var sGeo     = document.getElementById('stat-with-geo'); if (sGeo)     sGeo.textContent     = withGeo > 0 ? '✅ ' + withGeo + ' con ubicación' : 'Sin ubicación';
      var sLast    = document.getElementById('stat-last-scan');
      var sScanCnt = document.getElementById('scan-count');

      if (docsArray.length > 0 && docsArray[0].scannedAt && docsArray[0].scannedAt.toDate) {
        lastDate = formatDateTime(docsArray[0].scannedAt.toDate());
      }
      if (sLast)    sLast.textContent    = lastDate;
      if (sScanCnt) sScanCnt.textContent = 'Escaneos: ' + totalSize;

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
            '<div class="scan-actions">' +
              '<a href="' + mUrl + '" target="_blank" rel="noopener" class="scan-action-btn map"><i class="ri-map-pin-line"></i> Abrir en Google Maps</a>' +
              '<button class="scan-action-btn" onclick="navigator.clipboard.writeText(\''+mUrl+'\').then(()=>toast(\'📋 Enlace copiado\'))"><i class="ri-links-line"></i> Copiar link</button>' +
              '<a href="https://api.whatsapp.com/send?text=' + encodeURIComponent('📍 Ubicación del último escaneo de la mascota: ' + mUrl) + '" target="_blank" rel="noopener" class="scan-action-btn wa"><i class="ri-whatsapp-line"></i> Compartir</a>' +
            '</div>';
        } else {
          mapEl.innerHTML = '<div class="empty-state"><div style="font-size:32px;margin-bottom:10px">📍</div><p style="font-size:.85rem">Sin escaneos con ubicación compartida aún.</p></div>';
        }
      }

      /* ── Scan list ── */
      if (listEl) {
        if (snap.empty) {
          listEl.innerHTML = '<div class="empty-state"><div style="font-size:32px;margin-bottom:10px">📡</div><p style="font-size:.85rem;color:#6c757d">Todavía no hay escaneos registrados.</p></div>';
          return;
        }
        var html = '';
        
        /* Mensaje de Retención */
        html += '<div class="retention-alert"><i class="ri-error-warning-fill" style="font-size:1.2rem;margin-top:2px;"></i><div><strong>Aviso de retención:</strong> El historial de escaneos solo se almacenará por 3 meses desde su registro para optimizar espacio, a menos que la mascota sea reportada como perdida (en cuyo caso se mantiene todo el historial).</div></div>';

        /* Rastreo de Ruta (Modo Perdido) */
        if (petStatus === 'perdido') {
          var geoScans = docsArray.filter(function(s) { return s.latitude && s.longitude; });
          if (geoScans.length > 0) {
            html += '<div style="margin-bottom:24px;border-left:3px solid #f43f5e;padding-left:16px;">';
            html += '<div style="color:#f43f5e;font-weight:700;margin-bottom:10px;"><i class="ri-route-line"></i> Ruta de Rastreo (Modo Perdido)</div>';
            geoScans.forEach(function(s, index) {
              var f = s.scannedAt && s.scannedAt.toDate ? formatDateTime(s.scannedAt.toDate()) : '—';
              var u = 'https://maps.google.com/maps?q=' + s.latitude.toFixed(6) + ',' + s.longitude.toFixed(6);
              html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
              html += '<div style="background:#f43f5e;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">'+(geoScans.length - index)+'</div>';
              html += '<div><div class="scan-date-text" style="font-size:0.85rem;">' + f + '</div><a href="'+u+'" target="_blank" style="font-size:0.8rem;color:#5100c0;text-decoration:none;"><i class="ri-map-pin-line"></i> Ver punto '+ (geoScans.length - index) +'</a></div>';
              html += '</div>';
            });
            html += '</div>';
          }
        }

        var tableRows = '';
        snap.forEach(function(doc) {
          var s = doc.data();
          var fecha = s.scannedAt && s.scannedAt.toDate ? formatDateTime(s.scannedAt.toDate()) : '—';
          var coordsTxt = (s.latitude && s.longitude)
            ? s.latitude.toFixed(4) + ', ' + s.longitude.toFixed(4) + (s.accuracy ? ' ±' + Math.round(s.accuracy) + 'm' : '')
            : 'Sin ubicación';
          var actionsCell = '';
          if (s.latitude && s.longitude) {
            var mu2 = 'https://maps.google.com/maps?q=' + s.latitude.toFixed(6) + ',' + s.longitude.toFixed(6);
            var waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent('📍 Ubicación: ' + mu2);
            actionsCell = '<div class="scan-actions">' +
              '<a href="' + mu2 + '" target="_blank" class="scan-action-btn map"><i class="ri-map-pin-line"></i> Mapa</a>' +
              '<button class="scan-action-btn copy" onclick="navigator.clipboard.writeText(\'' + mu2 + '\').then(function(){toast(\'📋 Copiado\')})"><i class="ri-links-line"></i> Copiar</button>' +
              '<a href="' + waUrl + '" target="_blank" class="scan-action-btn wa"><i class="ri-whatsapp-line"></i> WhatsApp</a>' +
            '</div>';
          }
          tableRows += '<tr>' +
            '<td class="td-date" data-label="Fecha">' + esc(fecha) + '</td>' +
            '<td class="td-coords" data-label="GPS">' + esc(coordsTxt) + '</td>' +
            '<td class="td-actions" data-label="">' + actionsCell + '</td>' +
          '</tr>';
        });
        listEl.innerHTML = html + '<table class="scans-table"><thead><tr><th>Fecha y Hora</th><th>Coordenadas GPS</th><th>Acciones</th></tr></thead><tbody>' + tableRows + '</tbody></table>';
      }
    })
    .catch(function(e) {
      var isIndex = e.message && e.message.toLowerCase().includes('index');
      var errMsg  = isIndex
        ? '<p style="color:#6c757d;font-size:.82rem">Se requiere un índice de Firebase. Se configura automáticamente en unos minutos, recarga después.</p>'
        : '<p style="color:#fc032d;font-size:.82rem">Error al cargar escaneos: ' + esc(e.message) + '</p>';
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
  var clientPetId = window._clientPetId || (_dash.currentUser && _dash.currentUser.petId);
  if (!clientPetId) { toast('⚠️ ID de mascota no encontrado.'); return; }
  var petId = clientPetId;
  if (!petId) { toast('⚠️ ID de mascota no encontrado.'); return; }
  var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore();

  var fields = [
    ['edit-pet-name',       'name'],
    ['edit-pet-owner',      'ownerName'],
    ['edit-pet-phone',      'phone'],
    ['edit-pet-phone2',     'phone2'],
    ['edit-pet-breed',      'breed'],
    ['edit-pet-weight',     'weight'],
    ['edit-pet-birthdate',  'birthdate'],
    ['edit-pet-message',    'message'],
    ['edit-pet-behavior',   'behavior'],
    ['edit-pet-medical',    'medical'],
    ['edit-vacc-details',   'vaccinationDetails'],
    ['edit-rabies-code',    'rabiesVaccineCode'],
    ['edit-rabies-expiry',  'rabiesVaccineExpiry'],
    ['edit-loc-text',       'ownerLocationText'],
    ['edit-loc-gps',        'ownerLocationGps']
  ];
  var updates = {};
  fields.forEach(function(f) {
    var el = document.getElementById(f[0]);
    if (el && el.value.trim()) {
      if (f[1] === 'ownerLocationText') {
        updates['ownerLocation'] = updates['ownerLocation'] || {};
        updates['ownerLocation'].text = el.value.trim();
      } else if (f[1] === 'ownerLocationGps') {
        updates['ownerLocation'] = updates['ownerLocation'] || {};
        updates['ownerLocation'].gpsLink = el.value.trim();
      } else {
        updates[f[1]] = el.value.trim();
      }
    }
  });
  /* Location: country / dept / prov */
  var _lcFields = [['edit-loc-country','country'],['edit-loc-dept','dept'],['edit-loc-prov','prov']];
  _lcFields.forEach(function(f){
    var el=document.getElementById(f[0]);
    if(el&&el.value){updates['ownerLocation']=updates['ownerLocation']||{};updates['ownerLocation'][f[1]]=el.value;}
  });
  /* Species select */
  var spEl = document.getElementById('edit-pet-species');
  if (spEl && spEl.value) updates['species'] = spEl.value;
  /* Radio fields */
  var radios = [
    ['edit-pet-gender',  'gender'],
    ['edit-vacc-status', 'vaccinationStatus'],
    ['edit-microchip',   'microchipped'],
    ['edit-spay',        'spayNeutered']
  ];
  radios.forEach(function(r) {
    var checked = document.querySelector('input[name="'+r[0]+'"]:checked');
    if (checked) updates[r[1]] = checked.value;
  });
  if (!Object.keys(updates).length) { toast('⚠️ No hay cambios para guardar.'); return; }

  var btn = document.getElementById('btn-update-pet');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line"></i> Guardando…'; }

  var doUploadIfNew = function() {
    if (!window._clientNewBlob) return Promise.resolve(null);
    return new Promise(function(resolve, reject) {
      if (typeof AWS === 'undefined') { reject(new Error('AWS SDK no cargado')); return; }
      AWS.config.update({
        accessKeyId: '6496db9c407984025f99bc0dc6a23264',
        secretAccessKey: 'b270005e8ebf9eef779db72012a0ea6206a9f281eba9d07e0b15f78016c2d94d'
      });
      var s3 = new AWS.S3({ endpoint: 'https://c11712fefc3437b619d76c69ecc14901.r2.cloudflarestorage.com', signatureVersion: 'v4', s3ForcePathStyle: true });
      var fileName = 'pets/' + petId + '-update-' + Date.now() + '.jpg';
      s3.upload({ Bucket: 'petcingo', Key: fileName, Body: window._clientNewBlob, ContentType: 'image/jpeg' }, function(err, data) {
        if (err) { console.error(err); reject(new Error('Fallo al subir foto a Cloudflare')); }
        else resolve('https://pub-cb882f9b206543b28ea81fcadac0f4b2.r2.dev/' + fileName);
      });
    });
  };

  doUploadIfNew().then(function(newPhotoUrl) {
    if (newPhotoUrl) updates['photoUrl'] = newPhotoUrl;
    return firestoreDb.collection('pets').doc(petId).update(updates);
  }).then(function() {
    toast('✅ Perfil actualizado correctamente.');
    
    // Actualizar datos locales y re-renderizar
    if (window._currentPetData) {
      Object.assign(window._currentPetData, updates);
      renderClientPetGrid(window._currentPetData);
      toggleEditMode(false); // Volver al modo lectura tras guardar
    }

    if (updates.name) {
      var cn = document.getElementById('card-name'); if (cn) cn.textContent = updates.name;
      var tn = document.getElementById('top-name');  if (tn) tn.textContent = updates.name;
    }
    if (updates.photoUrl) {
      var img1 = document.querySelector('.pet-card-photo'); if (img1) img1.src = updates.photoUrl;
      var img2 = document.querySelector('.topbar-avatar');  if (img2) img2.src = updates.photoUrl;
      window._clientNewBlob = null; // reset
    }
  }).catch(function(e) { toast('❌ Error: ' + e.message); })
  .finally(function() {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ri-save-line"></i> Guardar cambios'; }
  });
};

/* ══════════════════════════════════════════════════════════════
   REPORTS — Envío desde pet.html y gestión en dashboard
══════════════════════════════════════════════════════════════ */

/* Envío desde perfil público (pet.html) */
window.sendPetReport = function() {
  var msgEl  = document.getElementById('pet-report-msg');
  var sentEl = document.getElementById('pet-report-sent');
  var btnEl  = document.getElementById('pet-report-send-btn');
  if (!msgEl || !msgEl.value.trim()) { toast('⚠️ Escribe un mensaje antes de enviar.'); return; }
  var plateId  = new URLSearchParams(window.location.search).get('id') || '';
  var nameEl   = document.getElementById('pet-name');
  var petName  = nameEl ? nameEl.textContent.trim() : '';
  var db2      = (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore();
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<i class="ri-loader-4-line"></i> Enviando…'; }
  db2.collection('reports').add({
    fromType:  'pet_profile',
    plateId:   plateId,
    petName:   petName,
    message:   msgEl.value.trim(),
    status:    'open',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    if (msgEl)  msgEl.style.display = 'none';
    if (btnEl)  btnEl.style.display = 'none';
    if (sentEl) sentEl.style.display = 'block';
    toast('✅ Reporte enviado correctamente.');
  }).catch(function(e) {
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="ri-send-plane-line"></i> Enviar reporte'; }
    toast('❌ Error al enviar: ' + e.message);
  });
};

/* Carga de reportes para el dashboard de admin */
window.loadReports = function(filterStatus) {
  var listEl = document.getElementById('reports-list');
  var cntEl  = document.getElementById('reports-count');
  if (!listEl) return;
  listEl.innerHTML = '<div class="empty-state" style="padding:28px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
  var db2 = (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore();
  var q   = db2.collection('reports').orderBy('createdAt','desc');
  q.get().then(function(snap) {
    if (snap.empty) {
      listEl.innerHTML = '<div class="empty-state" style="padding:28px"><div style="font-size:32px;margin-bottom:8px">📭</div><p style="color:#6c757d">No hay reportes registrados aún.</p></div>';
      if (cntEl) cntEl.textContent = '0 reportes';
      return;
    }
    var docs = [];
    snap.forEach(function(doc) { docs.push({ id: doc.id, d: doc.data() }); });
    var filtered = filterStatus && filterStatus !== 'all' ? docs.filter(function(r){ return r.d.status === filterStatus; }) : docs;
    var openCount = docs.filter(function(r){ return r.d.status === 'open'; }).length;
    if (cntEl) cntEl.textContent = filtered.length + ' reporte' + (filtered.length !== 1 ? 's' : '') + (openCount > 0 ? ' · ' + openCount + ' abierto' + (openCount !== 1 ? 's' : '') : '');
    /* Badge en nav */
    var badge = document.getElementById('reports-nav-badge');
    if (badge) { badge.textContent = openCount > 0 ? openCount : ''; badge.style.display = openCount > 0 ? 'inline-flex' : 'none'; }
    listEl.innerHTML = filtered.map(function(r) {
      var d = r.d;
      var fecha = d.createdAt && d.createdAt.toDate ? formatDate(d.createdAt.toDate()) : '—';
      var replyAt = d.replyAt && d.replyAt.toDate ? formatDate(d.replyAt.toDate()) : '';
      var typeMap = { pet_profile: { label:'Perfil mascota', color:'#f43f5e', bg:'rgba(244,63,94,.1)' }, owner: { label:'Propietario', color:'#5100c0', bg:'rgba(81,0,192,.1)' }, refugio: { label:'Refugio', color:'#ff9800', bg:'rgba(255,152,0,.12)' } };
      var tp = typeMap[d.fromType] || { label: d.fromType || '?', color:'#6c757d', bg:'rgba(108,117,125,.1)' };
      var statusHtml = d.status === 'open'
        ? '<span style="background:rgba(244,63,94,.12);color:#f43f5e;padding:3px 9px;border-radius:12px;font-size:.7rem;font-weight:700;">Abierto</span>'
        : d.status === 'replied'
        ? '<span style="background:rgba(0,200,150,.12);color:#00c896;padding:3px 9px;border-radius:12px;font-size:.7rem;font-weight:700;">Respondido</span>'
        : '<span style="background:rgba(108,117,125,.12);color:#6c757d;padding:3px 9px;border-radius:12px;font-size:.7rem;font-weight:700;">Cerrado</span>';
      var replySection = d.adminReply
        ? '<div style="margin-top:12px;padding:12px;background:rgba(81,0,192,.06);border-left:3px solid #5100c0;border-radius:0 8px 8px 0;">'
          + '<div style="font-size:.68rem;font-weight:700;color:#8878a8;text-transform:uppercase;margin-bottom:5px;">Respuesta del equipo' + (replyAt ? ' · ' + replyAt : '') + '</div>'
          + '<div style="font-size:.87rem;color:#f0ecff;line-height:1.55;">' + esc(d.adminReply) + '</div>'
          + '</div>'
        : '';
      var replyForm = '<div id="reply-form-'+r.id+'" style="display:none;margin-top:12px;">'
        + '<textarea id="reply-msg-'+r.id+'" placeholder="Escribe tu respuesta al reporte…" maxlength="500" style="width:100%;padding:10px 12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#f0ecff;font-size:.85rem;font-family:\'DM Sans\',sans-serif;resize:none;height:80px;box-sizing:border-box;outline:none;line-height:1.5;"></textarea>'
        + '<div style="display:flex;gap:8px;margin-top:8px;">'
        + '<button onclick="replyToReport(\''+r.id+'\')" style="background:#5100c0;color:#fff;border:none;padding:9px 18px;border-radius:9px;font-weight:700;font-size:.82rem;cursor:pointer;flex:1;transition:background .2s;" onmouseover="this.style.background=\'#5151fc\'" onmouseout="this.style.background=\'#5100c0\'"><i class="ri-send-plane-line"></i> Enviar respuesta</button>'
        + '<button onclick="closeReportById(\''+r.id+'\')" style="background:rgba(108,117,125,.15);color:#a0a0b0;border:none;padding:9px 14px;border-radius:9px;font-weight:700;font-size:.82rem;cursor:pointer;transition:background .2s;" title="Cerrar reporte"><i class="ri-check-line"></i></button>'
        + '</div></div>';
      return '<div id="report-card-'+r.id+'" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:16px 18px;margin-bottom:12px;">'
        + '<div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:10px;">'
        + '<span style="background:'+tp.bg+';color:'+tp.color+';padding:3px 9px;border-radius:12px;font-size:.7rem;font-weight:700;">'+tp.label+'</span>'
        + statusHtml
        + '<span style="font-size:.75rem;color:var(--muted-dark);margin-left:auto;">'+fecha+'</span>'
        + '</div>'
        + (d.plateId ? '<div style="font-size:.78rem;color:#c4a8ff;margin-bottom:6px;font-family:monospace;">🏷 '+esc(d.plateId)+(d.petName?' · '+esc(d.petName):'')+'</div>' : '')
        + (d.fromName ? '<div style="font-size:.78rem;color:var(--muted-dark);margin-bottom:6px;">👤 '+esc(d.fromName)+'</div>' : '')
        + '<div style="font-size:.9rem;color:#f0ecff;line-height:1.6;white-space:pre-wrap;">'+esc(d.message)+'</div>'
        + replySection
        + replyForm
        + '<div style="margin-top:12px;display:flex;gap:8px;">'
        + '<button onclick="toggleReplyForm(\''+r.id+'\')" style="background:rgba(81,0,192,.15);color:#c4a8ff;border:1px solid rgba(81,0,192,.3);padding:7px 14px;border-radius:9px;font-size:.8rem;font-weight:600;cursor:pointer;"><i class="ri-reply-line"></i> '+(d.adminReply?'Editar respuesta':'Responder')+'</button>'
        + '</div>'
        + '</div>';
    }).join('');
  }).catch(function(e) {
    listEl.innerHTML = '<p style="color:#fc032d;font-size:.85rem;padding:12px">Error al cargar reportes: ' + esc(e.message) + '</p>';
  });
};

window.toggleReplyForm = function(id) {
  var f = document.getElementById('reply-form-'+id);
  if (f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
};

window.replyToReport = function(id) {
  var msgEl = document.getElementById('reply-msg-'+id);
  if (!msgEl || !msgEl.value.trim()) { toast('⚠️ Escribe una respuesta antes de enviar.'); return; }
  var db2 = (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore();
  db2.collection('reports').doc(id).update({
    adminReply: msgEl.value.trim(),
    status:     'replied',
    replyAt:    firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    toast('✅ Respuesta enviada.');
    loadReports(_rCurrentFilter || 'all');
  }).catch(function(e) { toast('❌ Error: ' + e.message); });
};

window.closeReportById = function(id) {
  var db2 = (typeof _db !== 'undefined' && _db) ? _db : firebase.firestore();
  db2.collection('reports').doc(id).update({ status: 'closed' }).then(function() {
    toast('✅ Reporte cerrado.');
    loadReports(_rCurrentFilter || 'all');
  }).catch(function(e) { toast('❌ Error: ' + e.message); });
};

var _rCurrentFilter = 'all';
window.filterReports = function(status, btn) {
  _rCurrentFilter = status;
  document.querySelectorAll('.reports-filter-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  loadReports(status);
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
