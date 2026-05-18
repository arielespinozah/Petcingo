/* PETCINGO app.js -- v20260504 */
console.log('[Petcingo] app.js v20260504 loaded OK');
/* ===============================================================
   PETCINGO -- app.js
   Unified JS for all pages. Each page calls its own init function
   after the DOM is ready.
=============================================================== */
'use strict';

window.toggleActionsMenu = function(btn, event) {
  if (event) event.stopPropagation();
  var menu = btn.nextElementSibling;
  if (!menu) return;
  var wasOpen = menu.style.display === 'block';
  var allDropdowns = document.querySelectorAll('.ptcg-actions-dropdown');
  allDropdowns.forEach(function(d) { d.style.display = 'none'; });
  if (!wasOpen) {
    menu.style.display = 'block';
  }
};
document.addEventListener('click', function(e) {
  if (!e.target.closest('.ptcg-actions-menu')) {
    var allDropdowns = document.querySelectorAll('.ptcg-actions-dropdown');
    allDropdowns.forEach(function(d) { d.style.display = 'none'; });
  }
});

/* -- Firebase Config -------------------------------------------- */
var FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAEE3yLFFsJTMORNFLYZWW2_DNHwzF0hE8',
  authDomain:        'petcingo-43096.firebaseapp.com',
  projectId:         'petcingo-43096',
  storageBucket:     'petcingo-43096.firebasestorage.app',
  messagingSenderId: '679546185536',
  appId:             '1:679546185536:web:ceccd210b7c73b296f7ca5'
};
var MASTER_PASSWORD = 'Petcingo2024';

/* Named Firebase app -- avoids conflict with Dashnex default app */
var _pcFbApp = null;
function _getPcApp() {
  if (_pcFbApp) return _pcFbApp;
  try { _pcFbApp = firebase.app('petcingo'); }
  catch(e) { _pcFbApp = firebase.initializeApp(FIREBASE_CONFIG, 'petcingo'); }
  return _pcFbApp;
}

/* lazy init -- called once on first use */
var _db = null;
var _storage = null;
function db() {
  if (!_db) _db = _getPcApp().firestore();
  return _db;
}
function storage() {
  if (!_storage) _storage = _getPcApp().storage();
  return _storage;
}

/* ==============================================================
   SHARED UTILITIES
============================================================== */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function encodeData(obj) {
  /* Safe JSON for onclick attribute -- escapes single quotes */
  try { return JSON.stringify(obj).replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }
  catch(e) { return '{}'; }
}

function formatDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return '--';
  return d.toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' });
}

function formatDateTime(d) {
  if (!(d instanceof Date) || isNaN(d)) return '--';
  return d.toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' }) +
    ' ' + d.toLocaleTimeString('es-BO', { hour:'2-digit', minute:'2-digit' });
}

var _toastTimer;
function toast(msg, duration) {
  var el = document.getElementById('toast');
  if (!el) return;
  el.innerHTML = msg;
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

/* -- Phone normalization -------------------------------------- */
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

/* -- Image compression --------------------------------------- */
function compressImage(file, maxWidth, startQ, targetBytes) {
  maxWidth    = maxWidth    || 600;
  startQ      = startQ      || 0.78;
  targetBytes = targetBytes || 100000;
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onerror = function() { reject(new Error('No se pudo leer el archivo.')); };
    reader.onload  = function(evt) {
      var img = new Image();
      img.onerror = function() { reject(new Error('Imagen invalida.')); };
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

/* -- Export / Backup ----------------------------------------- */
function exportDatabase(collectionName) {
  toast('Exportando ' + collectionName + '...');
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
      toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  ' + arr.length + ' registros exportados.');
    })
    .catch(function(e) { toast('âŒ Error: ' + e.message); });
}

function downloadJson(jsonStr, filename) {
  var blob = new Blob([jsonStr], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
}

/* ==============================================================
   DASHBOARD -- ADMIN
============================================================== */
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

/* -- Login -------------------------------------------------- */
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
  localStorage.setItem('pc_auth', _dash.currentUser.role);
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
  loadReports();
  loadLostPets();
  loadNotifications();
  applyTheme('light');
  localStorage.setItem('petcingo_theme', 'light');

  setTimeout(function() {
    if (typeof loadOrders      === 'function') loadOrders();
    if (typeof loadCommissions === 'function') loadCommissions();
    if (typeof loadProducts    === 'function') loadProducts();
    if (typeof loadPromotions  === 'function') loadPromotions();
    if (typeof loadSiteConfig  === 'function') loadSiteConfig();
    if (typeof loadBankInfo    === 'function') loadBankInfo();
    if (typeof showInitialAlerts === 'function') showInitialAlerts();
    if (typeof loadStorageStats === 'function') loadStorageStats();
  }, 800);
}

/* -- Navigation -------------------------------------------- */
window.showSection = function(name, btn) {
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var sec = document.getElementById('sec-' + name);
  if (sec) sec.classList.add('active');
  if (btn) btn.classList.add('active');
  closeSidebar();
  /* Lazy load for scan-heavy sections */
  if (name === 'logs')       loadLogs();
  if (name === 'users')      loadUsers();
  if (name === 'pets')       { loadPets(); loadSellersCache(); }
  if (name === 'lost')       loadLostPets();
  if (name === 'storage')    { if (typeof loadStorageStats === 'function') loadStorageStats(); }
  if (name === 'monitoring') { if (typeof runAllHealthChecks === 'function') runAllHealthChecks(); }
  if (name === 'tienda')     { loadProducts(); loadOrders(); }
  if (name === 'discounts')  loadDiscounts();
  if (name === 'affiliates') {
    if (typeof loadAffiliates === 'function') loadAffiliates();
    if (typeof loadAffiliateLevels === 'function') loadAffiliateLevels();
  }
  if (name === 'security')   loadSecurityAlerts();
  if (name === 'content')    loadIndexContent();
};

window.toggleSidebar = function() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
};
window.closeSidebar = function() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
};

/* -- Stats ------------------------------------------------ */
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
    /* sold = total assigned plates (activo+perdido+vencida+reservada) -- excludes directSale stock */
    var soldEl=document.getElementById('stat-sold');
    if(soldEl)animCount('stat-sold', total);
    /* Extra labels shown below each stat */
    var resEl = document.getElementById('stat-reserved-label');
    if (resEl) resEl.textContent = reservadas + ' reservadas';
  }).catch(function(e) { console.error('loadStats:', e.message); });
  db().collection('veterinarias').get().then(function(s){ animCount('stat-vets-count',s.size); }).catch(function(){});
  db().collection('shelters').get().then(function(s){ animCount('stat-shelters-count',s.size); }).catch(function(){});
}

function loadRecent() {
  var el = document.getElementById('recent-list');
  db().collection('pets').where('status','in',['activo','perdido']).get()
    .then(function(snap) {
      if (!el) return;
      if (snap.empty) { el.innerHTML='<div class="empty-state"><p>No hay registros aun.</p></div>'; return; }
      var docs=[];
      snap.forEach(function(doc){ docs.push(doc.data()); });
      docs.sort(function(a,b){
        var ta=a.createdAt&&a.createdAt.toDate?a.createdAt.toDate().getTime():0;
        var tb=b.createdAt&&b.createdAt.toDate?b.createdAt.toDate().getTime():0;
        return tb-ta;
      });
      docs=docs.slice(0,5);
      var html='<table style="width:100%;border-collapse:collapse;font-size:.83rem"><thead><tr>'+
        '<th style="text-align:left;padding:8px;color:var(--muted-dark);font-size:.68rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Mascota</th>'+
        '<th style="text-align:left;padding:8px;color:var(--muted-dark);font-size:.68rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Estado</th>'+
        '<th style="text-align:left;padding:8px;color:var(--muted-dark);font-size:.68rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Fecha</th>'+
        '</tr></thead><tbody>';
      docs.forEach(function(d) {
        var bCls=d.status==='perdido'?'badge-lost':d.status==='reservada'?'badge-reserved':'badge-active';
        var bTxt=d.status==='perdido'?'<i class="ri-alert-line" style="color:#E74C3C;"></i> Perdido':d.status==='reservada'?'â³ Reservada':'<i class="ri-check-line" style="color:#2ECC71;"></i>  Activo';
        var fecha=d.createdAt&&d.createdAt.toDate?formatDate(d.createdAt.toDate()):'--';
        html+='<tr style="border-bottom:1px solid rgba(255,255,255,.04)">'+
          '<td style="padding:9px 8px"><span style="font-weight:600">'+esc(d.name||'--')+'</span><br><span style="color:var(--muted-dark);font-size:.75rem">'+esc(d.ownerName||'')+'</span></td>'+
          '<td style="padding:9px 8px"><span class="badge '+bCls+'">'+bTxt+'</span></td>'+
          '<td style="padding:9px 8px;color:var(--muted-dark)">'+fecha+'</td></tr>';
      });
      html+='</tbody></table>';
      el.innerHTML=html;
    }).catch(function(e) { if(el) el.innerHTML='<div class="empty-state"><p style="color:#f43f5e">Error: '+esc(e.message)+'</p></div>'; });
}

/* -- Pets table ------------------------------------------- */
window.loadPets = function() {
  var tbody=document.getElementById('pets-tbody');
  if (!tbody) return;
  tbody.innerHTML='<tr><td colspan="6"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div><p style="margin-top:10px">Cargando...</p></div></td></tr>';
  document.getElementById('table-count').textContent='';
  db().collection('pets').orderBy('createdAt','desc').get()
    .then(function(snap) {
      _dash.allPets=[];
      snap.forEach(function(doc) { var d=doc.data(); d._id=doc.id; _dash.allPets.push(d); });
      _dash.petsCurrentPage = 1;
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
    var sellerName = (d.sellerName||'').toLowerCase();
    var matchQ  = !q || id.includes(q)||name.includes(q)||owner.includes(q)||sellerName.includes(q);
    var matchSt = !status || d.status === status;
    var matchSl = !seller ||
      d.sellerId === seller ||
      (seller === '__direct__' && (!d.sellerId || d.sellerId === '' || d.sellerId === 'petcingo'));
    return matchQ && matchSt && matchSl;
  });
  _dash.petsCurrentPage = 1;
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
    var pagContainerExist = document.getElementById('pets-pagination');
    if (pagContainerExist) pagContainerExist.innerHTML = '';
    return;
  }
  var ACT  = 'https://prueb2.dashnexpages.net/activacion/?id=';
  var PERF = 'https://prueb2.dashnexpages.net/id/?id=';
  var CLI  = 'https://prueb2.dashnexpages.net/mi-cuenta/?id=';
  var now  = new Date();
  
  _dash.currentPetsList = pets;
  if (!_dash.petsPageSize) _dash.petsPageSize = 10;
  if (!_dash.petsCurrentPage) _dash.petsCurrentPage = 1;
  var totalPages = Math.ceil(pets.length / _dash.petsPageSize) || 1;
  if (_dash.petsCurrentPage > totalPages) _dash.petsCurrentPage = totalPages;
  
  var start = (_dash.petsCurrentPage - 1) * _dash.petsPageSize;
  var end = start + _dash.petsPageSize;
  var slicedPets = pets.slice(start, end);
  
  var frag = document.createDocumentFragment();
  slicedPets.forEach(function(d) {
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
    
    var dropdownStyle = "display:block;width:100%;text-align:left;padding:8px 14px;border:none;background:transparent;font-size:0.82rem;color:#424242;cursor:pointer;white-space:nowrap;";
    
    var actionMenu = document.createElement('div');
    actionMenu.className = 'ptcg-actions-menu';
    actionMenu.style.cssText = 'position:relative;display:inline-block;';
    
    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'ptcg-actions-toggle';
    toggleBtn.style.cssText = 'background:none;border:1.5px solid #E0E0E0;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:1.1rem;color:#757575;line-height:1;';
    toggleBtn.textContent = '...';
    toggleBtn.onclick = function(e) { window.toggleActionsMenu(toggleBtn, e); };
    
    var dropdownDiv = document.createElement('div');
    dropdownDiv.className = 'ptcg-actions-dropdown';
    dropdownDiv.style.cssText = 'display:none;position:absolute;right:0;top:100%;z-index:500;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);min-width:180px;padding:6px 0;margin-top:4px;';
    
    function addDropdownBtn(htmlContent, onClickFn, extraStyle) {
      var btn = document.createElement('button');
      btn.style.cssText = dropdownStyle + (extraStyle || '');
      btn.innerHTML = htmlContent;
      btn.onmouseenter = function() { btn.style.background = '#F5F5F5'; };
      btn.onmouseleave = function() { btn.style.background = 'transparent'; };
      btn.onclick = onClickFn;
      dropdownDiv.appendChild(btn);
    }
    
    function addDropdownLink(htmlContent, href, target, extraStyle) {
      var a = document.createElement('a');
      a.style.cssText = dropdownStyle + 'text-decoration:none;' + (extraStyle || '');
      a.innerHTML = htmlContent;
      a.href = href;
      a.target = target;
      a.onmouseenter = function() { a.style.background = '#F5F5F5'; };
      a.onmouseleave = function() { a.style.background = 'transparent'; };
      dropdownDiv.appendChild(a);
    }
    
    if (d.status === 'deleted') {
      addDropdownBtn('<i class="ri-arrow-go-back-line"></i> Restaurar', (function(pid){ return function(){ restorePet(pid); }; })(id));
      addDropdownBtn('<i class="ri-delete-bin-line"></i> Eliminar Permanente', (function(pid){ return function(){ permanentDelete(pid); }; })(id), 'color:#f43f5e;');
    } else if (d.status === 'reservada') {
      addDropdownLink('<i class="ri-qr-code-line"></i> Ver placa', ACT + encodeURIComponent(id), '_blank');
      addDropdownBtn('<i class="ri-delete-bin-line"></i> Archivar', (function(pid){ return function(){ archivePet(pid); }; })(id), 'color:#f43f5e;');
    } else {
      addDropdownLink('<i class="ri-eye-line"></i> Ver perfil', PERF + encodeURIComponent(id), '_blank');
      if (d.editToken) {
        addDropdownLink('<i class="ri-user-line"></i> Cliente', CLI + encodeURIComponent(id), '_blank');
      }
      addDropdownBtn('<i class="ri-delete-bin-line"></i> Archivar', (function(pid){ return function(){ archivePet(pid); }; })(id), 'color:#f43f5e;');
      
      if (_dash.currentUser && _dash.currentUser.role === 'admin') {
        addDropdownBtn('<i class="ri-file-copy-line"></i> Copiar codigo', (function(pid){ return function() {
          navigator.clipboard.writeText(pid).then(function() { toast('<i class="ri-check-line" style="color:#2ECC71;"></i> Codigo copiado: ' + pid); });
        }; })(id));
        
        addDropdownBtn('<i class="ri-key-2-line"></i> Enviar contrasena', (function(petData){ return function() {
          var email = petData.ownerEmail || petData.owner_email || petData.email;
          if (!email) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> No hay email registrado para este dueno.'); return; }
          if (!confirm('Enviar enlace de restablecimiento a ' + email + '?')) return;
          firebase.auth().sendPasswordResetEmail(email)
            .then(function() { toast('<i class="ri-mail-line"></i> Correo enviado a ' + email); })
            .catch(function(err) { toast('<i class="ri-error-warning-line" style="color:#E74C3C;"></i> Error: ' + err.message); });
        }; })(d));
      }
    }
    
    actionMenu.appendChild(toggleBtn);
    actionMenu.appendChild(dropdownDiv);
    tdAct.appendChild(actionMenu);
    
    tr.appendChild(tdAct);
    frag.appendChild(tr);
  });
  tbody.innerHTML = '';
  tbody.appendChild(frag);
  
  if (cnt2) cnt2.textContent = 'Mostrando ' + pets.length +
    (_dash.showingTrash ? ' en papelera' : ' de ' + _dash.allPets.length + ' mascotas');
    
  // Render beautiful pagination
  var pagContainer = document.getElementById('pets-pagination');
  if (!pagContainer) {
    pagContainer = document.createElement('div');
    pagContainer.id = 'pets-pagination';
    pagContainer.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin-top:20px;padding:10px 0;width:100%;flex-wrap:wrap;';
    var card = document.querySelector('#sec-pets .ptcg-index__card');
    if (card) card.appendChild(pagContainer);
  }
  
  if (totalPages <= 1) {
    pagContainer.innerHTML = '';
  } else {
    var pBtnStyle = 'background:#ffffff;border:1.5px solid #E0E0E0;border-radius:99px;padding:8px 18px;font-family:"Plus Jakarta Sans",sans-serif;font-size:0.85rem;font-weight:600;color:#4552CC;cursor:pointer;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(0,0,0,0.05);display:inline-flex;align-items:center;gap:6px;outline:none;';
    
    var prevDisabled = _dash.petsCurrentPage === 1;
    var prevBtn = document.createElement('button');
    prevBtn.style.cssText = pBtnStyle + (prevDisabled ? 'opacity:0.5;cursor:not-allowed;' : '');
    prevBtn.innerHTML = '<i class="ri-arrow-left-s-line"></i> Anterior';
    if (!prevDisabled) {
      prevBtn.onmouseenter = function() { prevBtn.style.background = '#4552CC'; prevBtn.style.color = '#ffffff'; prevBtn.style.borderColor = '#4552CC'; prevBtn.style.transform = 'translateY(-1px)'; prevBtn.style.boxShadow = '0 4px 12px rgba(69,82,204,0.2)'; };
      prevBtn.onmouseleave = function() { prevBtn.style.background = '#ffffff'; prevBtn.style.color = '#4552CC'; prevBtn.style.borderColor = '#E0E0E0'; prevBtn.style.transform = 'none'; prevBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; };
      prevBtn.onclick = function() { _dash.petsCurrentPage--; renderTable(_dash.currentPetsList); };
    } else {
      prevBtn.disabled = true;
    }
    
    var pageSpan = document.createElement('span');
    pageSpan.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:0.88rem;color:#616161;font-weight:500;';
    pageSpan.textContent = 'Pag. ' + _dash.petsCurrentPage + ' de ' + totalPages;
    
    var nextDisabled = _dash.petsCurrentPage === totalPages;
    var nextBtn = document.createElement('button');
    nextBtn.style.cssText = pBtnStyle + (nextDisabled ? 'opacity:0.5;cursor:not-allowed;' : '');
    nextBtn.innerHTML = 'Siguiente <i class="ri-arrow-right-s-line"></i>';
    if (!nextDisabled) {
      nextBtn.onmouseenter = function() { nextBtn.style.background = '#4552CC'; nextBtn.style.color = '#ffffff'; nextBtn.style.borderColor = '#4552CC'; nextBtn.style.transform = 'translateY(-1px)'; nextBtn.style.boxShadow = '0 4px 12px rgba(69,82,204,0.2)'; };
      nextBtn.onmouseleave = function() { nextBtn.style.background = '#ffffff'; nextBtn.style.color = '#4552CC'; nextBtn.style.borderColor = '#E0E0E0'; nextBtn.style.transform = 'none'; nextBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; };
      nextBtn.onclick = function() { _dash.petsCurrentPage++; renderTable(_dash.currentPetsList); };
    } else {
      nextBtn.disabled = true;
    }
    
    pagContainer.innerHTML = '';
    pagContainer.appendChild(prevBtn);
    pagContainer.appendChild(pageSpan);
    pagContainer.appendChild(nextBtn);
  }
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
  if (!confirm('?Mover "'+id+'" a la papelera? Se puede restaurar despues.')) return;
  db().collection('pets').doc(id).update({ status:'deleted', deletedAt:firebase.firestore.FieldValue.serverTimestamp() })
    .then(function() { toast('<i class="ri-delete-bin-line"></i> Placa movida a papelera.'); addLog('archived_pet',id,_dash.currentUser&&_dash.currentUser.name); loadPets(); })
    .catch(function(e) { toast('âŒ '+e.message); });
};

window.restorePet = function(id) {
  db().collection('pets').doc(id).update({ status:'reservada', deletedAt:null })
    .then(function() { toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Restaurada.'); addLog('restored_pet',id,_dash.currentUser&&_dash.currentUser.name); loadPets(); })
    .catch(function(e) { toast('âŒ '+e.message); });
};

window.permanentDelete = function(id) {
  if (!confirm(' Eliminar PERMANENTEMENTE "'+id+'"?\n\nEsta accion NO se puede deshacer.')) return;
  db().collection('pets').doc(id).delete()
    .then(function() { toast('<i class="ri-delete-bin-line"></i> Eliminada permanentemente.'); addLog('permanent_delete',id,_dash.currentUser&&_dash.currentUser.name); loadPets(); })
    .catch(function(e) { toast('âŒ '+e.message); });
};

window.loadLostPets = function() {
  var tbody = document.getElementById('lost-pets-tbody');
  var countEl = document.getElementById('lost-pets-count');
  var badge = document.getElementById('lost-nav-badge');
  if(!tbody) return;
  tbody.innerHTML='<tr><td colspan="5"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div></td></tr>';
  db().collection('pets').where('status', '==', 'perdido').get()
    .then(function(snap) {
      var cnt = snap.size;
      if(countEl) countEl.textContent = cnt + ' mascota' + (cnt !== 1 ? 's' : '') + ' perdida' + (cnt !== 1 ? 's' : '');
      if(badge){ badge.textContent = cnt > 0 ? cnt : ''; badge.style.display = cnt > 0 ? 'inline-flex' : 'none'; }
      if(snap.empty) {
        tbody.innerHTML='<tr><td colspan="5"><div class="empty-state" style="padding:28px"><p style="margin-top:8px">Ninguna mascota esta perdida en este momento.</p></div></td></tr>';
        return;
      }
      var html = '';
      var now = new Date();
      snap.forEach(function(doc) {
        var d = doc.data(); var id = doc.id;
        var avatar = d.photoUrl
          ? '<img src="'+esc(d.photoUrl)+'" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid rgba(244,63,94,.35);flex-shrink:0">'
          : '<div style="width:40px;height:40px;border-radius:50%;background:rgba(244,63,94,.12);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0"><i class="ri-footprint-line"></i></div>';
        var dateLost = d.lostAt && d.lostAt.toDate ? d.lostAt.toDate() : (d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate() : (d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : new Date()));
        var diffDays = Math.floor(Math.abs(now - dateLost) / 86400000);
        var timeLostStr = diffDays === 0
          ? '<span style="color:#f43f5e;font-weight:800">Hoy</span>'
          : (diffDays === 1
            ? '<span style="color:#f97316;font-weight:700">Hace 1 dia</span>'
            : '<span style="color:'+(diffDays > 7 ? '#f43f5e':'#f97316')+';font-weight:700">Hace '+diffDays+' dias</span>');
        var inIndex = d.featuredOnIndex
          ? '<span style="color:#2ECC71;font-weight:700"><i class="ri-checkbox-circle-fill"></i> Si</span>'
          : '<span style="color:#BDBDBD"><i class="ri-close-circle-line"></i> No</span>';
        var phone1 = normalizeWA(d.phone||'');
        var waMsg = encodeURIComponent('!Hola! Te escribo desde Petcingo -- vi que tu mascota '+(d.name||'')+' (ID: '+id+') esta reportada como perdida. ?Podemos coordinarnos?');
        var waBtn = phone1
          ? '<a class="btn btn-ghost btn-sm" style="color:#25D366;border-color:rgba(37,211,102,.35)" href="https://wa.me/'+phone1+'?text='+waMsg+'" target="_blank" title="Contactar por WhatsApp"><i class="ri-whatsapp-line"></i> WA</a>'
          : '';
        var safeId = id.replace(/'/g, "\\'");
        var toggleLabel = d.featuredOnIndex ? 'Quitar del index' : 'Publicar en index';
        var toggleIcon  = d.featuredOnIndex ? 'ri-eye-off-line' : 'ri-eye-line';
        var toggleBtn = '<button class="btn btn-ghost btn-sm" title="'+esc(toggleLabel)+'" onclick="(typeof toggleFeaturedLost===\'function\')?toggleFeaturedLost(\''+safeId+'\','+!!d.featuredOnIndex+'):toast(\'toggleFeaturedLost no disponible\')"><i class="'+esc(toggleIcon)+'"></i></button>';
        html += '<tr style="vertical-align:middle">' +
          '<td style="padding:10px 8px"><div style="display:flex;align-items:center;gap:10px">'+avatar+'<div><div style="font-weight:700;font-size:.9rem">'+esc(d.name||'--')+'</div>'+(d.breed?'<div style="font-size:.72rem;color:var(--muted-dark)">'+esc(d.breed)+'</div>':'')+'</div></div></td>' +
          '<td style="padding:8px;font-size:.85rem">'+esc(d.ownerName||'--')+'</td>' +
          '<td style="padding:8px">'+timeLostStr+'</td>' +
          '<td style="padding:8px;text-align:center">'+inIndex+'</td>' +
          '<td style="padding:8px" class="td-actions">'+waBtn+' '+toggleBtn+'</td>' +
        '</tr>';
      });
      tbody.innerHTML = html;
    }).catch(function(e) {
      tbody.innerHTML='<tr><td colspan="5"><div class="empty-state"><p>Error al cargar: '+esc(e.message)+'</p></div></td></tr>';
    });
};
/* -- Notifications ---------------------------------------- */
window.toggleNotifPanel = function() {
  var overlay = document.getElementById('notif-overlay');
  var panel   = document.getElementById('notif-panel');
  if (!panel) return;
  var isOpen = panel.style.display === 'block';
  if (overlay) overlay.style.display = isOpen ? 'none' : 'block';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) loadNotifications();
};

window.loadNotifications = function() {
  var contentEl = document.getElementById('notif-panel-content');
  var bellBadge = document.getElementById('notif-bell-badge');
  var firestoreDb = (typeof db === 'function') ? db() : null;
  if (!firestoreDb) return;

  var cutoff3d = new Date(Date.now() - 3 * 86400000);
  var cutoff7d = new Date(Date.now() - 7 * 86400000);

  Promise.all([
    firestoreDb.collection('pets').where('status','==','perdido').get(),
    firestoreDb.collection('pets').where('status','==','activo').where('activatedAt','>',firebase.firestore.Timestamp.fromDate(cutoff3d)).get(),
    firestoreDb.collection('reports').where('status','==','open').get()
  ]).then(function(results) {
    var lostSnap = results[0];
    var newActSnap = results[1];
    var openRepSnap = results[2];
    var total = lostSnap.size + newActSnap.size + openRepSnap.size;

    if (bellBadge) { bellBadge.textContent = total > 0 ? total : ''; bellBadge.style.display = total > 0 ? 'inline-flex' : 'none'; }
    if (!contentEl) return;

    var html = '';

    /* Lost pets */
    html += '<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#A8B4F5;margin-bottom:10px;margin-top:4px"><i class="ri-alert-line" style="color:#E74C3C;"></i> Mascotas Perdidas (' + lostSnap.size + ')</div>';
    if (lostSnap.empty) {
      html += '<div style="font-size:.82rem;color:#8B98D8;margin-bottom:16px">Ninguna mascota perdida.</div>';
    } else {
      lostSnap.forEach(function(doc) {
        var d = doc.data();
        var now = new Date();
        var dateLost = d.lostAt && d.lostAt.toDate ? d.lostAt.toDate() : (d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate() : now);
        var diffDays = Math.floor(Math.abs(now - dateLost) / 86400000);
        html += '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(244,63,94,.08);border:1px solid rgba(244,63,94,.2);border-radius:10px;margin-bottom:8px">'
          + (d.photoUrl ? '<img src="'+esc(d.photoUrl)+'" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0">' : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(244,63,94,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0">¾</div>')
          + '<div style="min-width:0"><div style="font-weight:700;font-size:.85rem;color:#f0ecff">'+esc(d.name||'--')+'</div>'
          + '<div style="font-size:.72rem;color:#f43f5e">'+(diffDays===0?'Reportada hoy':'Hace '+diffDays+' dia'+(diffDays!==1?'s':''))+'</div>'
          + '<div style="font-size:.7rem;color:#8B98D8">'+esc(d.ownerName||'--')+'</div></div>'
          + '<a href="https://prueb2.dashnexpages.net/id/?id='+encodeURIComponent(doc.id)+'" target="_blank" style="margin-left:auto;font-size:.7rem;color:#51CBF5;white-space:nowrap"><i class="ri-eye-line"></i> Ver</a>'
          + '</div>';
      });
    }

    /* Recent activations */
    html += '<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#A8B4F5;margin:16px 0 10px"><i class="ri-check-line" style="color:#2ECC71;"></i>  Activaciones Recientes (' + newActSnap.size + ')</div>';
    if (newActSnap.empty) {
      html += '<div style="font-size:.82rem;color:#8B98D8;margin-bottom:16px">Sin nuevas activaciones en 3 dias.</div>';
    } else {
      newActSnap.forEach(function(doc) {
        var d = doc.data();
        var actDate = d.activatedAt && d.activatedAt.toDate ? formatDate(d.activatedAt.toDate()) : '--';
        html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.18);border-radius:10px;margin-bottom:8px">'
          + '<span style="font-size:1.2rem;flex-shrink:0">¾</span>'
          + '<div style="min-width:0"><div style="font-weight:700;font-size:.85rem;color:#f0ecff">'+esc(d.name||doc.id)+'</div>'
          + '<div style="font-size:.72rem;color:#22C55E">'+actDate+'</div>'
          + '<div style="font-size:.7rem;color:#8B98D8">'+esc(d.ownerName||'--')+'</div></div>'
          + '</div>';
      });
    }

    /* Open reports */
    html += '<div style="font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#A8B4F5;margin:16px 0 10px"><i class="ri-mail-line"></i> Reportes Abiertos (' + openRepSnap.size + ')</div>';
    if (openRepSnap.empty) {
      html += '<div style="font-size:.82rem;color:#8B98D8;margin-bottom:16px">Sin reportes abiertos.</div>';
    } else {
      openRepSnap.forEach(function(doc) {
        var d = doc.data();
        var fecha = d.createdAt && d.createdAt.toDate ? formatDate(d.createdAt.toDate()) : '--';
        html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;background:rgba(69,82,204,.08);border:1px solid rgba(69,82,204,.2);border-radius:10px;margin-bottom:8px">'
          + '<span style="font-size:1.1rem;flex-shrink:0"><i class="ri-mail-line"></i></span>'
          + '<div style="min-width:0"><div style="font-weight:700;font-size:.82rem;color:#f0ecff">'+esc((d.message||'').substring(0,40))+'...</div>'
          + '<div style="font-size:.7rem;color:#8B98D8">'+esc(d.fromName||d.plateId||'--')+' · '+fecha+'</div></div>'
          + '</div>';
      });
    }

    contentEl.innerHTML = html;
  }).catch(function(e) {
    if (contentEl) contentEl.innerHTML = '<div style="color:#f43f5e;font-size:.82rem">Error al cargar: '+esc(e.message)+'</div>';
  });
};

/* -- Storage Stats ---------------------------------------- */
window.loadStorageStats = function() {
  var el = document.getElementById('storage-content');
  if (!el) return;
  el.innerHTML = '<div class="empty-state" style="padding:28px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
  var firestoreDb = (typeof db === 'function') ? db() : null;
  if (!firestoreDb) { el.innerHTML = '<p style="color:#f43f5e">Firebase no disponible.</p>'; return; }

  /* Firebase free limits */
  var FB_READS_DAY   = 50000;
  var FB_WRITES_DAY  = 20000;
  var FB_STORAGE_GB  = 1;
  var FB_NETWORK_GB  = 10;
  /* Cloudflare R2 free limits */
  var R2_STORAGE_GB  = 10;
  var R2_READS_MO    = 10000000;
  var R2_WRITES_MO   = 1000000;

  Promise.all([
    firestoreDb.collection('pets').get(),
    firestoreDb.collection('veterinarias').get(),
    firestoreDb.collection('shelters').get(),
    firestoreDb.collection('reports').get(),
    firestoreDb.collection('scan_logs').get(),
    firestoreDb.collection('users').get(),
    firestoreDb.collection('config').get()
  ]).then(function(results) {
    var petsSnap = results[0], vetsSnap = results[1], shSnap = results[2];
    var repSnap  = results[3], scanSnap = results[4], usrSnap = results[5], cfgSnap = results[6];

    /* Estimate Firestore storage (avg bytes per doc) */
    var estBytes =
      petsSnap.size  * 650 +
      vetsSnap.size  * 350 +
      shSnap.size    * 400 +
      repSnap.size   * 900 +
      scanSnap.size  * 200 +
      usrSnap.size   * 180 +
      cfgSnap.size   * 300;
    var estMB = (estBytes / 1048576).toFixed(2);
    var estPctFB = Math.min(99, (estBytes / (FB_STORAGE_GB * 1073741824)) * 100).toFixed(1);

    /* Estimate R2 storage: count pets with R2 photoUrls + logos */
    var r2PhotoCount = 0, r2LogoCount = 0;
    petsSnap.forEach(function(doc) { var d = doc.data(); if (d.photoUrl && d.photoUrl.includes('r2.dev')) r2PhotoCount++; });
    vetsSnap.forEach(function(doc) { var d = doc.data(); if (d.logoUrl && d.logoUrl.includes('r2.dev')) r2LogoCount++; });
    shSnap.forEach(function(doc)   { var d = doc.data(); if (d.logoUrl && d.logoUrl.includes('r2.dev')) r2LogoCount++; });
    var r2EstMB = ((r2PhotoCount * 250) + (r2LogoCount * 80)) / 1024;
    var r2EstPct = Math.min(99, (r2EstMB / (R2_STORAGE_GB * 1024)) * 100).toFixed(2);

    function bar(pct, color) {
      var w = Math.min(100, parseFloat(pct));
      var c = w < 60 ? '#22C55E' : (w < 85 ? '#F59E0B' : '#f43f5e');
      return '<div class="storage-bar-track" style="border-radius:99px;height:8px;overflow:hidden;margin-top:6px"><div style="height:100%;border-radius:99px;background:'+c+';width:'+w+'%;transition:width .6s ease"></div></div>';
    }
    function panel(icon, title, rows, extra) {
      return '<div class="panel" style="margin-bottom:18px">'
        + '<div class="panel-title">'+icon+' '+title+'</div>'
        + rows + (extra||'') + '</div>';
    }
    function row(label, val, pct, limit) {
      return '<div style="display:flex;justify-content:space-between;align-items:baseline;font-size:.84rem;margin-top:12px">'
        + '<span class="storage-label">'+label+'</span>'
        + '<span class="storage-val" style="font-weight:700">'+val+'</span></div>'
        + '<div style="display:flex;justify-content:space-between;font-size:.7rem;margin-top:3px">'
        + '<span class="storage-label">'+pct+'% usado</span><span class="storage-label">Limite: '+limit+'</span></div>'
        + bar(pct);
    }

    var html = '';

    /* Firebase Firestore */
    html += panel('<i class="ri-database-2-line" style="color:#F59E0B"></i>', 'Firebase Firestore (plan gratuito Spark)',
      row('Almacenamiento estimado', estMB+' MB', estPctFB, FB_STORAGE_GB+' GB')
      + '<div style="margin-top:18px"><div class="storage-label" style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Documentos por coleccion</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + ['Mascotas:'+petsSnap.size,'Veterinarias:'+vetsSnap.size,'Refugios:'+shSnap.size,'Reportes:'+repSnap.size,'Escaneos:'+scanSnap.size,'Usuarios:'+usrSnap.size,'Config:'+cfgSnap.size].map(function(s){
          var p=s.split(':'); return '<div class="storage-cell" style="border-radius:8px;padding:8px 10px;font-size:.8rem"><span class="storage-label">'+p[0]+'</span><br><strong class="storage-val">'+p[1]+'</strong></div>';
        }).join('')
      + '</div></div>',
      '<div class="storage-warn-box" style="margin-top:14px;padding:10px 12px;border-radius:8px;font-size:.78rem">'
      + '<strong>Limites diarios gratuitos:</strong> 50K lecturas · 20K escrituras · 20K eliminaciones · 10 GB red/mes</div>'
      + '<div class="storage-tip-box" style="margin-top:10px;padding:10px 12px;border-radius:8px;font-size:.78rem">'
      + '’! <strong>Para ahorrar lecturas:</strong> usa cache local (<code>_dash.allPets</code>), evita listeners en tiempo real en secciones no criticas, agrupa las consultas de stats en una sola lectura de coleccion.</div>'
    );

    /* Cloudflare R2 */
    html += panel('<i class="ri-cloud-line" style="color:#51CBF5"></i>', 'Cloudflare R2 (plan gratuito)',
      row('Almacenamiento estimado', r2EstMB.toFixed(1)+' MB', r2EstPct, R2_STORAGE_GB*1024+' MB (10 GB)')
      + '<div style="margin-top:18px"><div class="storage-label" style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Archivos en R2</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + '<div class="storage-cell" style="border-radius:8px;padding:8px 10px;font-size:.8rem"><span class="storage-label">Fotos mascotas</span><br><strong class="storage-val">'+r2PhotoCount+'</strong><br><span class="storage-label" style="font-size:.7rem">~'+( r2PhotoCount*250/1024).toFixed(1)+' MB</span></div>'
      + '<div class="storage-cell" style="border-radius:8px;padding:8px 10px;font-size:.8rem"><span class="storage-label">Logos (vets/refugios)</span><br><strong class="storage-val">'+r2LogoCount+'</strong><br><span class="storage-label" style="font-size:.7rem">~'+(r2LogoCount*80/1024).toFixed(1)+' MB</span></div>'
      + '</div></div>',
      '<div class="storage-tip-box" style="margin-top:14px;padding:10px 12px;border-radius:8px;font-size:.78rem">'
      + '’! <strong>R2 es muy generoso:</strong> 10 GB gratis, sin cargos por egress. Las fotos de mascotas se comprimen a JPEG â‰¤10 KB; logos a PNG â‰¤80 KB. <br><i class="ri-alert-line" style="color:#E74C3C;"></i> Elimina fotos de mascotas borradas para liberar espacio.</div>'
    );

    /* Summary */
    var totalEstMB = parseFloat(estMB) + r2EstMB;
    html += '<div class="panel" style="background:rgba(69,82,204,.08);border-color:rgba(69,82,204,.2)">'
      + '<div class="panel-title"><i class="ri-pie-chart-line" style="color:#7C8EE8"></i> Resumen General</div>'
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px">'
      + '<div style="text-align:center"><div class="storage-val" style="font-size:1.4rem;font-weight:800">'+(petsSnap.size+vetsSnap.size+shSnap.size+repSnap.size+scanSnap.size+usrSnap.size)+'</div><div class="storage-label" style="font-size:.72rem">Documentos totales</div></div>'
      + '<div style="text-align:center"><div class="storage-val" style="font-size:1.4rem;font-weight:800">'+totalEstMB.toFixed(1)+' MB</div><div class="storage-label" style="font-size:.72rem">Almacenamiento total est.</div></div>'
      + '<div style="text-align:center"><div class="storage-val" style="font-size:1.4rem;font-weight:800;color:#22C55E">'+(10240-r2EstMB).toFixed(0)+' MB</div><div class="storage-label" style="font-size:.72rem">R2 libre restante</div></div>'
      + '</div></div>';

    el.innerHTML = html;
  }).catch(function(e) {
    el.innerHTML = '<div class="panel"><p style="color:#f43f5e">Error al obtener estadisticas: '+esc(e.message)+'</p></div>';
  });
};

/* -- Sellers cache (for filter) --------------------------- */
function loadSellersCache() {
  var sel = document.getElementById('filter-seller');
  if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  _dash.allSellers = {};
  /* Add Petcingo Directo first */
  var directOpt = document.createElement('option'); directOpt.value='__direct__'; directOpt.textContent='â˜... Petcingo Directo [PET]'; sel.appendChild(directOpt);
  Promise.all([db().collection('veterinarias').orderBy('name').get(), db().collection('shelters').orderBy('name').get()])
    .then(function(results) {
      var addGrp = function(snap, label, col) {
        if (!snap||snap.empty) return;
        var g=document.createElement('option'); g.disabled=true; g.textContent='-- '+label+' --'; sel.appendChild(g);
        snap.forEach(function(doc) {
          var d=doc.data(); _dash.allSellers[doc.id]={ name:d.name, prefix:d.prefix||'' };
          var o=document.createElement('option'); o.value=doc.id; o.textContent=d.name+(d.prefix?' ['+d.prefix+']':''); sel.appendChild(o);
        });
      };
      addGrp(results[0],'Veterinarias','veterinarias');
      addGrp(results[1],'Refugios','shelters');
    }).catch(function(){});
}

/* -- Register Plate (sec-register) ----------------------- */
function loadRegisterSelect() {
  var sel = document.getElementById('reg-seller-select');
  if (!sel) return;
  /* Clone to remove stale listeners */
  var newSel = sel.cloneNode(false);
  newSel.id = 'reg-seller-select'; newSel.className = sel.className;
  sel.parentNode.replaceChild(newSel, sel); sel = newSel;

  /* Placeholder */
  var ph = document.createElement('option'); ph.value=''; ph.textContent='-- Selecciona un cliente --'; sel.appendChild(ph);

  /* Directo */
  db().collection('config').doc('admin_settings').get().then(function(cfgDoc) {
    var directCount = (cfgDoc.exists && cfgDoc.data().directCount) ? cfgDoc.data().directCount : 0;
    var di = document.createElement('option');
    di.value = JSON.stringify({ id:'__direct__', name:'Venta Directa', prefix:'PET', lastCount:directCount, collection:'__direct__' });
    di.textContent = '* Venta Directa'; sel.appendChild(di);

    var sep = document.createElement('option'); sep.disabled=true; sep.textContent='--------------'; sel.appendChild(sep);

    return Promise.all([db().collection('veterinarias').orderBy('name').get(), db().collection('shelters').orderBy('name').get()]);
  }).then(function(results) {
    if (!results) return;
    var addGrp = function(snap, label, col) {
      if (!snap||snap.empty) return;
      var g=document.createElement('option'); g.disabled=true; g.textContent='-- '+label+' --'; sel.appendChild(g);
      snap.forEach(function(doc) {
        var d=doc.data();
        var o=document.createElement('option');
        o.value=JSON.stringify({ id:doc.id, name:d.name, prefix:d.prefix||'', lastCount:d.lastCount||0, collection:col });
        o.textContent=d.name; sel.appendChild(o);
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
  if (!sel||!sel.value) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Selecciona un cliente primero.'); return; }
  var sellerData;
  try { sellerData=JSON.parse(sel.value); } catch(e) { toast('Error al leer el cliente.'); return; }
  if (!sellerData.prefix) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Este cliente no tiene prefijo configurado.'); return; }

  var btn = document.querySelector('#sec-register .btn-primary');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="ri-loader-4-line"></i> Reservando...'; }

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
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Placa '+res.newId+' reservada para '+sellerData.name);
    loadSellersCache();
  }).catch(function(err) { toast('âŒ '+err.message); })
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
  try { _dash.regQr=new QRCode(cd,{ text:profileUrl, width:220, height:220, colorDark:'#1E255E', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.H }); }
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
  if (!sel||!sel.value) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> No hay cliente seleccionado.'); return; }
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
  if(disp) disp.innerHTML='<div style="text-align:center;color:var(--muted-dark);padding:48px 20px"><i class="ri-qr-scan-2-line" style="font-size:64px;opacity:.15;display:block;margin-bottom:12px"></i><p style="font-size:.85rem">El QR aparecera aqui</p></div>';
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
  navigator.clipboard.writeText(url).then(function() { toast('<i class="ri-file-copy-line"></i> Enlace copiado'); });
};

window.toggleCustomQR = function() {
  var w=document.getElementById('custom-qr-wrap'), d=document.getElementById('qr-display');
  if(w) w.style.display=w.style.display==='none'?'block':'none';
  if(d) d.style.display=d.style.display==='none'?'block':'none';
};

/* -- Vets ------------------------------------------------- */
window.saveVet = function() {
  var name   =document.getElementById('vet-name').value.trim();
  var contact=document.getElementById('vet-contact').value.trim();
  var prefix =document.getElementById('vet-prefix').value.trim().toUpperCase().replace(/\s/g,'');
  if (!name)    { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> El nombre es obligatorio.'); return; }
  if (!contact) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> El contacto es obligatorio.'); return; }
  if (!prefix)  { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> El Prefijo de Placa es OBLIGATORIO (ej: VET-LP).'); return; }

  var btn=document.getElementById('btn-save-vet');
  if(btn){btn.disabled=true;btn.textContent='Guardando...';}

  db().collection('veterinarias').add({
    name:name, contact:contact, prefix:prefix, lastCount:0,
    phone:document.getElementById('vet-phone').value.trim(),
    city:document.getElementById('vet-city').value.trim(),
    email:document.getElementById('vet-email').value.trim(),
    whatsapp:(document.getElementById('vet-whatsapp')||{value:''}).value.trim(),
    gpsLink:(document.getElementById('vet-gps-link')||{value:''}).value.trim(),
    level:(document.getElementById('vet-level')||{value:'aliado'}).value||'aliado',
    is24h:!!(document.getElementById('vet-is24h')||{checked:false}).checked,
    commissionRate:parseFloat((document.getElementById('vet-commission-rate')||{value:'20'}).value)||20,
    status:'active',
    username:(document.getElementById('vet-username')||{value:''}).value.trim().toLowerCase(),
    password:(document.getElementById('vet-password')||{value:''}).value,
    services:[],
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Veterinaria registrada.');
    ['vet-name','vet-contact','vet-prefix','vet-phone','vet-city','vet-email','vet-whatsapp','vet-gps-link','vet-username','vet-password'].forEach(function(id){ var el=document.getElementById(id); if(el)el.value=''; });
    var i24El=document.getElementById('vet-is24h'); if(i24El)i24El.checked=false;
    var fw=document.getElementById('vet-form-wrap'); if(fw)fw.classList.remove('open');
    loadVets(); loadSellersCache(); loadRegisterSelect();
    addLog('created_vet',name,_dash.currentUser&&_dash.currentUser.name);
  }).catch(function(e){toast('âŒ '+e.message);})
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
      if(snap.empty){tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><p>No hay veterinarias aun.</p></div></td></tr>';return;}
      var html='';
      snap.forEach(function(doc){
        var d=doc.data();
        var status=d.status||'active';
        var statusColor=status==='active'?'#2ECC71':status==='suspended'?'#E67E22':'#E74C3C';
        var statusBg=status==='active'?'rgba(46,204,113,.12)':status==='suspended'?'rgba(230,126,34,.12)':'rgba(231,76,60,.12)';
        var statusLabel=status==='active'?'Activo':status==='suspended'?'Suspendido':'Baneado';
        var statusBadge='<span style="padding:3px 9px;border-radius:99px;font-size:.70rem;font-weight:700;background:'+statusBg+';color:'+statusColor+';">'+statusLabel+'</span>';
        var level=d.level||'aliado';
        var lvMap={aliado:{bg:'rgba(69,82,204,.10)',color:'#4552CC',label:'Aliado'},premium:{bg:'rgba(168,85,247,.10)',color:'#A855F7',label:'Premium'},solidario:{bg:'rgba(16,185,129,.10)',color:'#10B981',label:'Solidario'},emergencias24h:{bg:'rgba(231,76,60,.10)',color:'#E74C3C',label:'24h'}};
        var lv=lvMap[level]||lvMap.aliado;
        var levelBadge='<span style="padding:3px 9px;border-radius:99px;font-size:.70rem;font-weight:700;background:'+lv.bg+';color:'+lv.color+';">'+lv.label+'</span>';
        var rate=d.commissionRate!=null?d.commissionRate:20;
        var rateCell='<input type="number" min="0" max="100" value="'+rate+'" id="rate-vt-'+doc.id+'" style="width:48px;padding:2px 5px;border:1px solid #E0E0E0;border-radius:6px;font-size:.78rem;text-align:center;">'+
          '<button onclick="saveVetRate(\''+doc.id+'\')" style="padding:2px 8px;background:#4552CC;color:#fff;border:none;border-radius:6px;font-size:.70rem;cursor:pointer;margin-left:3px;">OK</button>';
        var ds='display:block;width:100%;text-align:left;padding:8px 14px;border:none;background:transparent;font-size:0.82rem;color:#424242;cursor:pointer;white-space:nowrap;';
        var suspLabel=status==='active'?'<i class="ri-pause-circle-line"></i> Suspender':(status==='suspended'?'<i class="ri-play-circle-line"></i> Activar':'');
        var suspBtn=suspLabel?'<button style="'+ds+'color:#E67E22;" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="setVetStatus(\''+doc.id+'\',\''+esc(d.name||'')+'\',\'suspended\')">'+suspLabel+'</button>':'';
        if(status==='suspended'){suspBtn='<button style="'+ds+'color:#2ECC71;" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="setVetStatus(\''+doc.id+'\',\''+esc(d.name||'')+'\',\'active\')">'+suspLabel+'</button>';}
        var banLabel=status!=='banned'?'<i class="ri-forbid-line"></i> Banear':'<i class="ri-checkbox-circle-line"></i> Activar';
        var banColor=status!=='banned'?'#E74C3C':'#2ECC71';
        var banTarget=status!=='banned'?'banned':'active';
        var banBtn='<button style="'+ds+'color:'+banColor+';" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="setVetStatus(\''+doc.id+'\',\''+esc(d.name||'')+'\',\''+banTarget+'\')">'+banLabel+'</button>';
        var actionDropdown='<div class="ptcg-actions-menu" style="position:relative;display:inline-block;">'+
          '<button class="ptcg-actions-toggle" onclick="toggleActionsMenu(this,event)" style="background:none;border:1.5px solid #E0E0E0;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:1.1rem;color:#757575;line-height:1;">...</button>'+
          '<div class="ptcg-actions-dropdown" style="display:none;position:absolute;right:0;top:100%;z-index:500;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);min-width:200px;padding:6px 0;margin-top:4px;">'+
            '<button style="'+ds+'" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="openVetDetail(\''+doc.id+'\')"><i class="ri-settings-3-line"></i> Placas</button>'+
            '<button style="'+ds+'" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="editVet(\''+doc.id+'\',\''+encodeData(d)+'\')"><i class="ri-edit-line"></i> Editar</button>'+
            '<a style="'+ds+'text-decoration:none;" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" href="https://prueb2.dashnexpages.net/veterinarias/?id='+doc.id+'" target="_blank"><i class="ri-eye-line"></i> Ver perfil publico</a>'+
            '<a style="'+ds+'text-decoration:none;" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" href="https://prueb2.dashnexpages.net/vet-admin/?auto='+doc.id+'" target="_blank"><i class="ri-external-link-line"></i> Ir a panel</a>'+
            suspBtn+banBtn+
            '<button style="'+ds+'color:#f43f5e;" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="deleteRecord(\'veterinarias\',\''+doc.id+'\',\'loadVets\')"><i class="ri-delete-bin-line"></i> Eliminar</button>'+
          '</div>'+
        '</div>';
        html+='<tr>';
        html+='<td class="td-name">'+esc(d.name||'--')+'</td>';
        html+='<td>'+esc(d.city||'--')+'</td>';
        html+='<td>'+esc(d.phone||'--')+'</td>';
        html+='<td>'+levelBadge+'</td>';
        html+='<td style="white-space:nowrap;">'+rateCell+'</td>';
        html+='<td>'+statusBadge+'</td>';
        html+='<td class="td-actions" style="white-space:nowrap;">'+actionDropdown+'</td></tr>';
      });
      tbody.innerHTML=html;
    }).catch(function(e){tbody.innerHTML='<tr><td colspan="7"><div class="empty-state"><p>Error: '+esc(e.message)+'</p></div></td></tr>';});
}
window.loadVets=loadVets;
/* -- Edit Vet Modal -- */
window.editVet = function(vetId, dataJson) {
  var d;
  try { d = JSON.parse(dataJson); } catch(e) { d = {}; }
  var fields = { 'ev-name':d.name, 'ev-contact':d.contact, 'ev-city':d.city,
    'ev-phone':d.phone, 'ev-address':d.address, 'ev-prefix':d.prefix, 'ev-email':d.email,
    'ev-whatsapp':d.whatsapp, 'ev-gps-link':d.gpsLink,
    'ev-commission-rate':d.commissionRate!=null?d.commissionRate:20,
    'ev-username':d.username, 'ev-password':'' };
  Object.keys(fields).forEach(function(id){ var el=document.getElementById(id); if(el) el.value=fields[id]||''; });
  var lvEl=document.getElementById('ev-level'); if(lvEl)lvEl.value=d.level||'aliado';
  var stEl=document.getElementById('ev-status'); if(stEl)stEl.value=d.status||'active';
  var i24El=document.getElementById('ev-is24h'); if(i24El)i24El.checked=!!d.is24h;
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
  if (!name) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> El nombre es obligatorio.'); return; }
  var update = {
    name:    name,
    contact: document.getElementById('ev-contact').value.trim(),
    city:    document.getElementById('ev-city').value.trim(),
    phone:   document.getElementById('ev-phone').value.trim(),
    address: document.getElementById('ev-address').value.trim(),
    prefix:  document.getElementById('ev-prefix').value.trim().toUpperCase(),
    email:   document.getElementById('ev-email') ? document.getElementById('ev-email').value.trim() : '',
    whatsapp: document.getElementById('ev-whatsapp') ? document.getElementById('ev-whatsapp').value.trim() : '',
    gpsLink:  document.getElementById('ev-gps-link') ? document.getElementById('ev-gps-link').value.trim() : '',
    level:    document.getElementById('ev-level') ? document.getElementById('ev-level').value : 'aliado',
    is24h:    !!(document.getElementById('ev-is24h') && document.getElementById('ev-is24h').checked),
    commissionRate: document.getElementById('ev-commission-rate') ? (parseFloat(document.getElementById('ev-commission-rate').value)||20) : 20,
    status:   document.getElementById('ev-status') ? document.getElementById('ev-status').value : 'active',
    username: document.getElementById('ev-username') ? document.getElementById('ev-username').value.trim().toLowerCase() : ''
  };
  var pwEl=document.getElementById('ev-password'); if(pwEl&&pwEl.value)update.password=pwEl.value;
  var btn = document.getElementById('btn-update-vet');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="ri-loader-4-line"></i> Guardando...'; }
  db().collection('veterinarias').doc(vetId).update(update)
    .then(function() {
      toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Veterinaria actualizada: '+name);
      closeVetModal();
      loadVets();
    })
    .catch(function(e) { toast('âŒ Error: '+e.message); })
    .finally(function() { if(btn){ btn.disabled=false; btn.innerHTML='<i class="ri-save-line"></i> Guardar cambios'; } });
};


/* -- Vet Detail ------------------------------------------- */
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
    if(disp)disp.innerHTML='<div style="text-align:center;color:var(--muted-dark);padding:48px 20px"><i class="ri-qr-code-line" style="font-size:64px;opacity:.2;display:block;margin-bottom:12px"></i><p style="font-size:.85rem">El QR aparecera aqui</p></div>';
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
  try{
    _dash.vetQr=new QRCode(cd,{text:profileUrl,width:220,height:220,colorDark:'#1E255E',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    _brandQR(cd);
  }
  catch(e){toast('Error QR: '+e.message);return;}
  db().collection('veterinarias').doc(_dash.currentVet.id).update({lastCount:firebase.firestore.FieldValue.increment(1)})
    .then(function(){_dash.currentVet.lastCount=next;var el=document.getElementById('vet-next-id');if(el)el.textContent=_dash.currentVet.prefix+'-'+Math.random().toString(36).slice(2,6).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase();});
  /* Also reserve in pets */
  db().collection('pets').doc(newId).set({id:newId,status:'reservada',sellerId:_dash.currentVet.id,sellerName:_dash.currentVet.name,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  var links=document.getElementById('vet-qr-links');
  if(links){var safeUrl=profileUrl.replace(/'/g,"\\'");links.innerHTML='<div class="qr-link-row"><div class="qr-link-label">Perfil Publico</div><div class="qr-link-url">'+esc(profileUrl)+'</div><button class="qr-link-copy" onclick="copyText(\''+safeUrl+'\',\'URL copiada\')"><i class="ri-file-copy-line"></i> Copiar</button></div>';}
  var res=document.getElementById('vet-qr-result');if(res)res.style.display='block';
  toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Placa creada: '+newId);
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
        var fecha=d.createdAt&&d.createdAt.toDate?formatDate(d.createdAt.toDate()):'--';
        html+='<tr><td class="td-id">'+esc(id)+'</td><td class="td-name">'+esc(d.name||'--')+'</td><td class="td-owner">'+esc(d.ownerName||'--')+'</td>'+
          '<td><span class="badge '+bCls+'">'+bTxt+'</span></td><td class="td-date">'+fecha+'</td>'+
          '<td class="td-actions"><a href="https://prueb2.dashnexpages.net/id/?id='+encodeURIComponent(id)+'" target="_blank" class="btn btn-ghost btn-sm"><i class="ri-eye-line"></i></a></td></tr>';
      });
      tbody.innerHTML=html;
    }).catch(function(){
      if(countEl)countEl.textContent='';
      tbody.innerHTML='<tr><td colspan="6"><div class="empty-state" style="color:var(--warn);padding:20px">'+
        '<div style="font-size:28px;margin-bottom:8px">[TOOL]</div><p><strong>Se requiere indice de Firebase.</strong></p>'+
        '<a href="https://console.firebase.google.com/v1/r/project/petcingo-43096/firestore/indexes?create_composite=Cktwcm9qZWN0cy9wZXRjaW5nby00MzA5Ni9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcGV0cy9pbmRleGVzL18QARoMCghzZWxsZXJJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI" target="_blank" style="color:var(--primary);font-weight:600;font-size:.85rem">Haz clic aqui para crear el indice -></a>'+
        '</div></td></tr>';
    });
};

/* -- Shelters --------------------------------------------- */
window.saveShelter = function() {
  var name       =document.getElementById('sh-name').value.trim();
  var responsible=document.getElementById('sh-responsible').value.trim();
  var prefix     =document.getElementById('sh-prefix').value.trim().toUpperCase().replace(/\s/g,'');
  if(!name)       {toast('<i class="ri-alert-line" style="color:#E74C3C;"></i>  El nombre es obligatorio.');return;}
  if(!responsible){toast('<i class="ri-alert-line" style="color:#E74C3C;"></i>  El encargado es obligatorio.');return;}
  if(!prefix)     {toast('<i class="ri-alert-line" style="color:#E74C3C;"></i>  El Prefijo de Placa es OBLIGATORIO (ej: REF-LP).');return;}

  var username = (document.getElementById('sh-username').value||'').trim().toLowerCase().replace(/\s/g,'');
  var password = (document.getElementById('sh-password').value||'').trim();
  var limite   = parseInt((document.getElementById('sh-limite')||{}).value||'40',10)||40;
  if (password && password.length < 6) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i>  La contrasena debe tener al menos 6 caracteres.'); return; }

  var btn=document.getElementById('btn-save-shelter');
  if(btn){btn.disabled=true;btn.textContent='Guardando...';}

  var data = {
    name:name, responsible:responsible, prefix:prefix, lastCount:0,
    phone:document.getElementById('sh-phone').value.trim(),
    address:document.getElementById('sh-address').value.trim(),
    logoUrl:(document.getElementById('sh-logo')||{value:''}).value.trim(),
    limite_mascotas:limite,
    maxCampaigns: parseInt((document.getElementById('sh-maxCampaigns')||{value:'3'}).value||'3',10)||3,
    campaignExpirationDays: parseInt((document.getElementById('sh-campaignExpirationDays')||{value:'15'}).value||'15',10)||15,
    campaignGraceHours: parseInt((document.getElementById('sh-campaignGraceHours')||{value:'48'}).value||'48',10)||48,
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  if (username) data.username = username;
  if (password) data.password = password;

  db().collection('shelters').add(data)
    .then(function(){
      toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Refugio registrado.');
      ['sh-name','sh-responsible','sh-prefix','sh-phone','sh-address','sh-username','sh-password','sh-logo'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
      var lim=document.getElementById('sh-limite');if(lim)lim.value='40';
      var cp=document.getElementById('shelter-create-panel'); if(cp)cp.style.display='none';
      loadShelters(); loadSellersCache(); loadRegisterSelect();
      addLog('created_shelter',name,_dash.currentUser&&_dash.currentUser.name);
    }).catch(function(e){toast('âŒ '+e.message);})
    .finally(function(){if(btn){btn.disabled=false;btn.textContent='Guardar Refugio';}});
};

function loadShelters() {
  var tbody=document.getElementById('shelters-tbody');
  if(!tbody)return;
  tbody.innerHTML='<tr><td colspan="9"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div></td></tr>';
  db().collection('shelters').orderBy('createdAt','desc').get()
    .then(function(snap){
      var cEl=document.getElementById('shelters-count');if(cEl)cEl.textContent=snap.size+' refugio(s)';
      if(snap.empty){tbody.innerHTML='<tr><td colspan="9"><div class="empty-state"><p>No hay refugios aun.</p></div></td></tr>';return;}
      var html='';
      snap.forEach(function(doc){
        var d=doc.data(),fecha=d.createdAt&&d.createdAt.toDate?formatDate(d.createdAt.toDate()):'--';
        var prefBadge=d.prefix?'<span style="background:rgba(0,225,243,.10);border:1px solid rgba(0,225,243,.25);border-radius:6px;padding:2px 8px;font-size:.75rem;color:var(--accent);font-family:monospace">'+esc(d.prefix)+'</span>':'--';
        var status=d.status||'active';
        var statusColor=status==='active'?'#2ECC71':status==='suspended'?'#E67E22':'#E74C3C';
        var statusBg=status==='active'?'rgba(46,204,113,.12)':status==='suspended'?'rgba(230,126,34,.12)':'rgba(231,76,60,.12)';
        var statusLabel=status==='active'?'Activo':status==='suspended'?'Suspendido':'Baneado';
        var statusBadge='<span style="padding:3px 9px;border-radius:99px;font-size:.70rem;font-weight:700;background:'+statusBg+';color:'+statusColor+';">'+statusLabel+'</span>';
        var rate=d.commissionRate!=null?d.commissionRate:20;
        var rateCell='<input type="number" min="0" max="100" value="'+rate+'" id="rate-sh-'+doc.id+'" style="width:48px;padding:2px 5px;border:1px solid #E0E0E0;border-radius:6px;font-size:.78rem;text-align:center;">'+
          '<button onclick="saveShelterRate(\''+doc.id+'\')" style="padding:2px 8px;background:#4552CC;color:#fff;border:none;border-radius:6px;font-size:.70rem;cursor:pointer;margin-left:3px;">OK</button>';
        
        var dropdownStyle = "display:block;width:100%;text-align:left;padding:8px 14px;border:none;background:transparent;font-size:0.82rem;color:#424242;cursor:pointer;white-space:nowrap;";
        
        var suspLabel=status==='active'?'<i class="ri-pause-circle-line"></i> Suspender':(status==='suspended'?'<i class="ri-play-circle-line"></i> Activar':'');
        var suspDropdownBtn=suspLabel?'<button style="' + dropdownStyle + 'color:#E67E22;" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="setShelterStatus(\''+doc.id+'\',\''+esc(d.name||'')+'\',\'suspended\')">'+suspLabel+'</button>':'';
        if (status === 'suspended') {
          suspDropdownBtn='<button style="' + dropdownStyle + 'color:#2ECC71;" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="setShelterStatus(\''+doc.id+'\',\''+esc(d.name||'')+'\',\'active\')">'+suspLabel+'</button>';
        }

        var banLabel=status!=='banned'?'<i class="ri-forbid-line"></i> Banear':'<i class="ri-checkbox-circle-line"></i> Activar';
        var banColor=status!=='banned'?'#E74C3C':'#2ECC71';
        var banTargetStatus=status!=='banned'?'banned':'active';
        var banDropdownBtn='<button style="' + dropdownStyle + 'color:'+banColor+';" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="setShelterStatus(\''+doc.id+'\',\''+esc(d.name||'')+'\',\''+banTargetStatus+'\')">'+banLabel+'</button>';

        var actionDropdown = '<div class="ptcg-actions-menu" style="position:relative;display:inline-block;">' +
          '<button class="ptcg-actions-toggle" onclick="toggleActionsMenu(this, event)" style="background:none;border:1.5px solid #E0E0E0;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:1.1rem;color:#757575;line-height:1;">...</button>' +
          '<div class="ptcg-actions-dropdown" style="display:none;position:absolute;right:0;top:100%;z-index:500;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);min-width:180px;padding:6px 0;margin-top:4px;">' +
            '<button style="' + dropdownStyle + '" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="openShelterDetail(\''+doc.id+'\')"><i class="ri-settings-3-line"></i> Placas</button>' +
            '<button style="' + dropdownStyle + '" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="editShelter(\''+doc.id+'\',\''+encodeData(d)+'\')"><i class="ri-edit-line"></i> Editar</button>' +
            '<a style="' + dropdownStyle + 'text-decoration:none;" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" href="https://prueb2.dashnexpages.net/refugio-panel-control/?auto='+doc.id+'" target="_blank"><i class="ri-external-link-line"></i> Ir a panel</a>' +
            suspDropdownBtn +
            banDropdownBtn +
            '<button style="' + dropdownStyle + 'color:#f43f5e;" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="deleteRecord(\'shelters\',\''+doc.id+'\',\'loadShelters\')"><i class="ri-delete-bin-line"></i> Eliminar</button>' +
          '</div>' +
        '</div>';

        html+='<tr>';
        html+='<td class="td-name">'+esc(d.name||'--')+'</td>';
        html+='<td>'+prefBadge+'</td>';
        html+='<td>'+esc(d.responsible||'--')+'</td>';
        html+='<td>'+statusBadge+'</td>';
        html+='<td style="white-space:nowrap;">'+rateCell+'</td>';
        html+='<td class="td-owner">'+esc(d.phone||'--')+'</td>';
        html+='<td class="td-owner" style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(d.address||'--')+'</td>';
        html+='<td class="td-date">'+fecha+'</td>';
        html+='<td class="td-actions" style="white-space:nowrap;">'+actionDropdown+'</td></tr>';
      });
      tbody.innerHTML=html;
    }).catch(function(e){tbody.innerHTML='<tr><td colspan="9"><div class="empty-state"><p>Error: '+esc(e.message)+'</p></div></td></tr>';});
}
window.loadShelters=loadShelters;

window.saveShelterRate=function(id){
  var inp=document.getElementById('rate-sh-'+id);
  if(!inp)return;
  var rate=parseFloat(inp.value);
  if(isNaN(rate)||rate<0||rate>100){toast('Porcentaje invalido (0-100)');return;}
  db().collection('shelters').doc(id).update({commissionRate:rate})
    .then(function(){toast('<i class="ri-check-line" style="color:#2ECC71;"></i> Comision actualizada: '+rate+'%');})
    .catch(function(e){toast('Error: '+e.message);});
};

window.setShelterStatus=function(id,name,newStatus){
  var reason='';
  if(newStatus!=='active'){
    reason=window.prompt('Motivo para '+(newStatus==='banned'?'banear':'suspender')+' a '+name+' (opcional):')||'';
  }
  var update={status:newStatus};
  if(newStatus==='suspended'){update.suspendedAt=firebase.firestore.FieldValue.serverTimestamp();update.suspendedReason=reason;}
  if(newStatus==='banned'){update.bannedAt=firebase.firestore.FieldValue.serverTimestamp();update.bannedReason=reason;}
  if(newStatus==='active'){update.reactivatedAt=firebase.firestore.FieldValue.serverTimestamp();}
  db().collection('shelters').doc(id).update(update)
    .then(function(){
      var lbl={active:'Reactivado',suspended:'Suspendido',banned:'Baneado'};
      toast('<i class="ri-check-line" style="color:#2ECC71;"></i> '+(lbl[newStatus]||newStatus)+': '+name);
      loadShelters();
    }).catch(function(e){toast('Error: '+e.message);});
};

window.saveVetRate=function(id){
  var inp=document.getElementById('rate-vt-'+id);
  if(!inp)return;
  var rate=parseFloat(inp.value);
  if(isNaN(rate)||rate<0||rate>100){toast('Porcentaje invalido (0-100)');return;}
  db().collection('veterinarias').doc(id).update({commissionRate:rate})
    .then(function(){toast('<i class="ri-check-line" style="color:#2ECC71;"></i> Comision actualizada: '+rate+'%');})
    .catch(function(e){toast('Error: '+e.message);});
};

window.setVetStatus=function(id,name,newStatus){
  var reason='';
  if(newStatus!=='active'){
    reason=window.prompt('Motivo para '+(newStatus==='banned'?'banear':'suspender')+' a '+name+' (opcional):')||'';
  }
  var update={status:newStatus};
  if(newStatus==='suspended'){update.suspendedAt=firebase.firestore.FieldValue.serverTimestamp();update.suspendedReason=reason;}
  if(newStatus==='banned'){update.bannedAt=firebase.firestore.FieldValue.serverTimestamp();update.bannedReason=reason;}
  if(newStatus==='active'){update.reactivatedAt=firebase.firestore.FieldValue.serverTimestamp();}
  db().collection('veterinarias').doc(id).update(update)
    .then(function(){
      var lbl={active:'Reactivado',suspended:'Suspendido',banned:'Baneado'};
      toast('<i class="ri-check-line" style="color:#2ECC71;"></i> '+(lbl[newStatus]||newStatus)+': '+name);
      loadVets();
    }).catch(function(e){toast('Error: '+e.message);});
};

/* -- Edit Shelter Modal -- */
window.editShelter = function(shId, dataJson) {
  var d;
  try { d = JSON.parse(dataJson); } catch(e) { d = {}; }
  var fields = { 'es-name':d.name, 'es-responsible':d.responsible, 'es-city':d.city,
    'es-phone':d.phone, 'es-address':d.address, 'es-email':d.email,
    'es-username':d.username, 'es-password':'', 'es-limite':d.limite_mascotas||40,
    'es-maxCampaigns':d.maxCampaigns||3, 'es-campaignExpirationDays':d.campaignExpirationDays||15,
    'es-campaignGraceHours':d.campaignGraceHours||48 };
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
  if (!name) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> El nombre es obligatorio.'); return; }
  if (password && password.length < 6) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> La contrasena debe tener al menos 6 caracteres.'); return; }

  var update = {
    name:        name,
    responsible: document.getElementById('es-responsible').value.trim(),
    city:        document.getElementById('es-city').value.trim(),
    phone:       document.getElementById('es-phone').value.trim(),
    address:     document.getElementById('es-address').value.trim(),
    email:       document.getElementById('es-email') ? document.getElementById('es-email').value.trim() : '',
    limite_mascotas: limite,
    maxCampaigns: parseInt((document.getElementById('es-maxCampaigns')||{value:'3'}).value||'3',10)||3,
    campaignExpirationDays: parseInt((document.getElementById('es-campaignExpirationDays')||{value:'15'}).value||'15',10)||15,
    campaignGraceHours: parseInt((document.getElementById('es-campaignGraceHours')||{value:'48'}).value||'48',10)||48
  };
  if (username) update.username = username;
  if (password) update.password = password;

  var btn = document.getElementById('btn-update-shelter');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="ri-loader-4-line"></i> Guardando...'; }

  db().collection('shelters').doc(shId).update(update)
    .then(function() {
      toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Refugio actualizado: '+name);
      closeShelterModal();
      loadShelters();
      addLog('updated_shelter', name, _dash.currentUser&&_dash.currentUser.name);
    })
    .catch(function(e) { toast('âŒ Error: '+e.message); })
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
    if(disp)disp.innerHTML='<div style="text-align:center;color:var(--muted-dark);padding:48px 20px"><i class="ri-qr-code-line" style="font-size:64px;opacity:.2;display:block;margin-bottom:12px"></i><p style="font-size:.85rem">El QR aparecera aqui</p></div>';
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
  try{
    _dash.shelterQr=new QRCode(cd,{text:profileUrl,width:220,height:220,colorDark:'#1E255E',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    _brandQR(cd);
  }
  catch(e){toast('Error QR: '+e.message);return;}
  db().collection('shelters').doc(_dash.currentShelter.id).update({lastCount:firebase.firestore.FieldValue.increment(1)})
    .then(function(){_dash.currentShelter.lastCount=next;var el=document.getElementById('sh-next-id');if(el)el.textContent=_dash.currentShelter.prefix+'-'+Math.random().toString(36).slice(2,6).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase();});
  db().collection('pets').doc(newId).set({id:newId,status:'reservada',sellerId:_dash.currentShelter.id,sellerName:_dash.currentShelter.name,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  var links=document.getElementById('sh-qr-links');
  if(links){var safeUrl=profileUrl.replace(/'/g,"\\'");links.innerHTML='<div class="qr-link-row"><div class="qr-link-label">Perfil Publico</div><div class="qr-link-url">'+esc(profileUrl)+'</div><button class="qr-link-copy" onclick="copyText(\''+safeUrl+'\',\'URL copiada\')"><i class="ri-file-copy-line"></i> Copiar</button></div>';}
  var res=document.getElementById('sh-qr-result');if(res)res.style.display='block';
  toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Placa creada: '+newId);
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
        var fecha=d.createdAt&&d.createdAt.toDate?formatDate(d.createdAt.toDate()):'--';
        html+='<tr><td class="td-id">'+esc(id)+'</td><td class="td-name">'+esc(d.name||'--')+'</td><td class="td-owner">'+esc(d.ownerName||'--')+'</td>'+
          '<td><span class="badge '+bCls+'">'+bTxt+'</span></td><td class="td-date">'+fecha+'</td>'+
          '<td class="td-actions"><a href="https://prueb2.dashnexpages.net/id/?id='+encodeURIComponent(id)+'" target="_blank" class="btn btn-ghost btn-sm"><i class="ri-eye-line"></i></a></td></tr>';
      });
      tbody.innerHTML=html;
    }).catch(function(){
      if(countEl)countEl.textContent='';
      tbody.innerHTML='<tr><td colspan="6"><div class="empty-state" style="color:var(--warn);padding:20px"><div style="font-size:28px;margin-bottom:8px">[TOOL]</div><p><strong>Se requiere indice de Firebase.</strong></p><a href="https://console.firebase.google.com" target="_blank" style="color:var(--primary);font-weight:600;font-size:.85rem">Abrir Firebase Console -></a></div></td></tr>';
    });
};

/* -- Users CRUD ------------------------------------------- */
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
  if(!name){toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Nombre obligatorio.');return;}
  if(pass.length<6){toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Contrasena minimo 6 caracteres.');return;}
  if(pass===MASTER_PASSWORD){toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> No puedes usar la contrasena maestra.');return;}
  db().collection('users').add({ username:name, password:pass, role:'staff', permissions:readPerms(), createdAt:firebase.firestore.FieldValue.serverTimestamp() })
    .then(function(){toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Usuario creado: '+name);resetUserForm();loadUsers();addLog('created_user',name,_dash.currentUser&&_dash.currentUser.name);})
    .catch(function(e){toast('âŒ '+e.message);});
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
  if(!name){toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Nombre obligatorio.');return;}
  var update={username:name,permissions:readPerms()};
  if(pass){if(pass.length<6){toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Contrasena minimo 6 caracteres.');return;}if(pass===MASTER_PASSWORD){toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> No puedes usar la contrasena maestra.');return;}update.password=pass;}
  db().collection('users').doc(_dash.editingUserId).update(update)
    .then(function(){toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Usuario actualizado: '+name);resetUserForm();loadUsers();addLog('updated_user',name,_dash.currentUser&&_dash.currentUser.name);})
    .catch(function(e){toast('âŒ '+e.message);});
};

function loadUsers() {
  var el=document.getElementById('users-list');
  if(!el){console.warn('loadUsers: #users-list not found');return;}
  console.log('loadUsers: cargando...');
  el.innerHTML='<div class="empty-state" style="padding:20px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
  db().collection('users').orderBy('createdAt','desc').get()
    .then(function(snap){
      console.log('loadUsers: snap.size='+snap.size);
      if(snap.empty){el.innerHTML='<p style="color:var(--muted-dark);font-size:.85rem;padding:8px 0">No hay usuarios creados aun.</p>';return;}
      var html='',isAdmin=_dash.currentUser&&_dash.currentUser.role==='admin';
      snap.forEach(function(doc){
        var d=doc.data();
        var permsStr=JSON.stringify(d.permissions||{}).replace(/"/g,'&quot;');
        var permList=Object.keys(d.permissions||{}).filter(function(k){return d.permissions[k];}).join(', ');
        html+='<div class="user-row"><div class="user-avatar">'+esc((d.username||'U').charAt(0).toUpperCase())+'</div>'+
          '<div class="user-info"><div class="user-name">'+esc(d.username||'--')+'</div><div class="user-perms">'+esc(permList||'sin permisos')+'</div></div>'+
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

/* -- Logs ------------------------------------------------- */
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
      el.innerHTML='<p style="color:var(--muted-dark);font-size:.85rem;padding:8px 0">No hay logs de auditoria.</p>';
      if(moreBtn)moreBtn.style.display='none';
      return;
    }
    if(reset || !el.querySelector('table')){
      var tbl=document.createElement('table');
      tbl.style.cssText='width:100%;border-collapse:collapse;font-size:.8rem';
      tbl.id='log-table';
      tbl.innerHTML='<thead><tr>'+
        '<th style="padding:7px 10px;width:32px;border-bottom:1px solid rgba(255,255,255,.07)"><input type="checkbox" id="log-select-all-th" onchange="toggleAllLogs(this.checked)" title="Seleccionar todo"/></th>'+
        '<th style="text-align:left;padding:7px 10px;color:var(--muted-dark);font-size:.67rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07);white-space:nowrap">Fecha</th>'+
        '<th style="text-align:left;padding:7px 10px;color:var(--muted-dark);font-size:.67rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07);white-space:nowrap">Hora</th>'+
        '<th style="text-align:left;padding:7px 10px;color:var(--muted-dark);font-size:.67rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Usuario</th>'+
        '<th style="text-align:left;padding:7px 10px;color:var(--muted-dark);font-size:.67rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Accion</th>'+
        '<th style="text-align:left;padding:7px 10px;color:var(--muted-dark);font-size:.67rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">ID Objetivo</th>'+
        '</tr></thead><tbody id="log-tbody"></tbody>';
      el.innerHTML='';el.appendChild(tbl);
    }
    var logTbody=document.getElementById('log-tbody');
    snap.forEach(function(doc){
      var d=doc.data();
      var dt=d.date&&d.date.toDate?d.date.toDate():null;
      var fecha=dt?dt.toLocaleDateString('es-BO',{day:'2-digit',month:'2-digit',year:'numeric'}):'--';
      var hora=dt?dt.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'}):'--';
      var actionType=d.action||'--';
      var actColor=actionType.includes('delet')||actionType.includes('elimin')?'#ff3b6b':
                   actionType.includes('login')?'var(--accent)':
                   actionType.includes('creat')||actionType.includes('register')||actionType.includes('creo')?'#00c896':'var(--text-dark)';
      var tr=document.createElement('tr');
      tr.style.borderBottom='1px solid rgba(255,255,255,.04)';
      tr.setAttribute('data-log-id',doc.id);
      tr.innerHTML='<td style="padding:8px 10px;width:32px"><input type="checkbox" class="log-check" data-log-id="'+doc.id+'"/></td>'+
        '<td style="padding:8px 10px;color:var(--muted-dark);white-space:nowrap">'+esc(fecha)+'</td>'+
        '<td style="padding:8px 10px;color:var(--muted-dark);white-space:nowrap;font-family:monospace;font-size:.75rem">'+esc(hora)+'</td>'+
        '<td style="padding:8px 10px;font-weight:600">'+esc(d.user||'sistema')+'</td>'+
        '<td style="padding:8px 10px"><span style="color:'+actColor+';font-size:.78rem;font-weight:600">'+esc(actionType)+'</span></td>'+
        '<td style="padding:8px 10px;color:var(--muted-dark);font-family:monospace;font-size:.75rem">'+esc(d.targetId||'--')+'</td>';
      if(logTbody)logTbody.appendChild(tr);
    });
    _logsLastDoc = snap.docs[snap.docs.length-1];
    if(moreBtn) moreBtn.style.display = snap.size < _logsPageSize ? 'none' : 'block';
  }).catch(function(e){
    if(!_logsLastDoc) el.innerHTML='<p style="color:var(--error);font-size:.85rem">Error: '+esc(e.message)+'</p>';
  });
}
window.loadLogs=loadLogs;

window.toggleAllLogs=function(checked){
  document.querySelectorAll('#log-tbody .log-check').forEach(function(cb){cb.checked=checked;});
};
window.deleteSelectedLogs=function(){
  var checkboxes=document.querySelectorAll('#log-tbody .log-check:checked');
  if(!checkboxes.length){toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Selecciona al menos un log.');return;}
  if(!confirm('Eliminar '+checkboxes.length+' log(s) seleccionado(s)? Esta accion no se puede deshacer.'))return;
  var b=db().batch();
  checkboxes.forEach(function(cb){b.delete(db().collection('logs').doc(cb.dataset.logId));});
  b.commit().then(function(){
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  '+checkboxes.length+' log(s) eliminado(s).');
    loadLogs(true);
  }).catch(function(e){toast('âŒ '+e.message);});
};

/* -- Recent Reserved ----------------------------------------- */
function loadRecentReserved() {
  var el = document.getElementById('recent-reserved-list');
  if (!el) return;
  db().collection('pets').where('status','==','reservada').get()
    .then(function(snap) {
      if (snap.empty) { el.innerHTML='<div class="empty-state"><p>No hay placas reservadas aun.</p></div>'; return; }
      var docs=[];
      snap.forEach(function(doc){ docs.push({id:doc.id, data:doc.data()}); });
      docs.sort(function(a,b){
        var ta=a.data.createdAt&&a.data.createdAt.toDate?a.data.createdAt.toDate().getTime():0;
        var tb=b.data.createdAt&&b.data.createdAt.toDate?b.data.createdAt.toDate().getTime():0;
        return tb-ta;
      });
      docs=docs.slice(0,5);
      var html='<table style="width:100%;border-collapse:collapse;font-size:.83rem"><thead><tr>'+
        '<th style="text-align:left;padding:8px;color:var(--muted-dark);font-size:.68rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">ID Placa</th>'+
        '<th style="text-align:left;padding:8px;color:var(--muted-dark);font-size:.68rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Vendedor</th>'+
        '<th style="text-align:left;padding:8px;color:var(--muted-dark);font-size:.68rem;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07)">Fecha</th>'+
        '</tr></thead><tbody>';
      docs.forEach(function(item) {
        var d=item.data, id=item.id;
        var fecha=d.createdAt&&d.createdAt.toDate?formatDate(d.createdAt.toDate()):'--';
        var actUrl='https://prueb2.dashnexpages.net/activacion/?id='+encodeURIComponent(id);
        html+='<tr style="border-bottom:1px solid rgba(255,255,255,.04)">'+
          '<td style="padding:9px 8px"><a href="'+actUrl+'" target="_blank" style="color:#4552CC;font-weight:700;font-family:monospace;font-size:.82rem">'+esc(id)+'</a></td>'+
          '<td style="padding:9px 8px;color:var(--muted-dark);font-size:.78rem">'+esc(d.sellerName||'--')+'</td>'+
          '<td style="padding:9px 8px;color:var(--muted-dark)">'+fecha+'</td></tr>';
      });
      html+='</tbody></table>';
      el.innerHTML=html;
    }).catch(function(e) { el.innerHTML='<div class="empty-state"><p style="color:#f43f5e">Error al cargar reservadas.</p></div>'; console.error('loadRecentReserved:',e.message); });
}
window.loadRecentReserved = loadRecentReserved;

window.loadMoreLogs=function(){ loadLogs(false); };

window.clearOldLogs = function() {
  var inputEl=document.getElementById('cfg-log-days');
  var days=inputEl?parseInt(inputEl.value,10):30;
  if(!days||days<1)days=30;
  if(!confirm('Eliminar todos los logs de hace mas de '+days+' dias?'))return;
  var cutoff=new Date(Date.now()-days*24*60*60*1000);
  db().collection('logs').where('date','<',cutoff).get()
    .then(function(snap){
      if(snap.empty){toast('No hay logs tan antiguos.');return;}
      var batch=db().batch();
      snap.forEach(function(doc){batch.delete(doc.ref);});
      return batch.commit().then(function(){toast('<i class="ri-delete-bin-line"></i> '+snap.size+' logs eliminados.');loadLogs();});
    }).catch(function(e){toast('âŒ '+e.message);});
};

/* -- Delete record (generic) ------------------------------ */
window.deleteRecord = function(collection, docId, reloadFn) {
  if(!confirm('Eliminar este registro permanentemente?'))return;
  db().collection(collection).doc(docId).delete()
    .then(function(){toast('<i class="ri-delete-bin-line"></i> Eliminado.');addLog('deleted_'+collection,docId,_dash.currentUser&&_dash.currentUser.name);if(window[reloadFn])window[reloadFn]();})
    .catch(function(e){toast('âŒ '+e.message);});
};

/* -- Settings --------------------------------------------- */
function _storageFb() {
  try { return _getPcApp().storage(); } catch(e) { return null; }
}

function _compressPng(file, maxDim, cb) {
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var w=img.width,h=img.height,scale=Math.min(1,maxDim/Math.max(w,h));
      var canvas=document.createElement('canvas');
      canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      canvas.toBlob(function(blob){cb(blob);},file.type==='image/svg+xml'?'image/svg+xml':'image/png',0.85);
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

window.handleLogoUpload=function(input,type){
  var file=input.files&&input.files[0];
  if(!file)return;
  /* QR logo usa prefijo cfg-qr-logo en vez de cfg-logo-qr */
  var prefix=(type==='qr')?'cfg-qr-logo':'cfg-logo-'+type;
  var statusEl=document.getElementById(prefix+'-upload-status');
  if(statusEl){statusEl.textContent='Procesando...';statusEl.style.display='block';}
  var doStore=function(blob){
    var reader=new FileReader();
    reader.onload=function(e){
      var dataUrl=e.target.result;
      var urlInput=document.getElementById(prefix+'-url');
      if(urlInput)urlInput.value=dataUrl;
      var prev=document.getElementById(prefix+'-preview');
      if(prev){prev.src=dataUrl;prev.style.display='block';}
      if(statusEl)statusEl.innerHTML='<i class="ri-check-line" style="color:#2ECC71;"></i>  Listo -- presiona Guardar para confirmar';
    };
    reader.readAsDataURL(blob);
  };
  if(file.type==='image/svg+xml'){doStore(file);}
  else{_compressPng(file,400,doStore);}
};

/* Upload vet/shelter logo -> R2 logos/ prefix, PNG transparent ~80KB */
window.handleOrgLogoUpload = function(input, urlInputId, statusId) {
  var file = input.files && input.files[0];
  if (!file) return;
  var statusEl = document.getElementById(statusId);
  if (statusEl) { statusEl.textContent = 'Comprimiendo imagen...'; statusEl.style.display = 'block'; }

  function doUpload(blob) {
    if (typeof AWS === 'undefined') {
      if (statusEl) statusEl.textContent = 'âŒ AWS SDK no cargado.';
      return;
    }
    if (statusEl) statusEl.textContent = 'Subiendo a Cloudflare R2...';
    AWS.config.update({
      accessKeyId: '6496db9c407984025f99bc0dc6a23264',
      secretAccessKey: 'b270005e8ebf9eef779db72012a0ea6206a9f281eba9d07e0b15f78016c2d94d'
    });
    var s3 = new AWS.S3({ endpoint: 'https://c11712fefc3437b619d76c69ecc14901.r2.cloudflarestorage.com', signatureVersion: 'v4', s3ForcePathStyle: true });
    var ext = file.type === 'image/svg+xml' ? 'svg' : 'png';
    var key = 'logos/' + urlInputId + '-' + Date.now() + '.' + ext;
    var ct  = file.type === 'image/svg+xml' ? 'image/svg+xml' : 'image/png';
    s3.upload({ Bucket: 'petcingo', Key: key, Body: blob, ContentType: ct }, function(err, data) {
      if (err) {
        if (statusEl) statusEl.textContent = 'âŒ Error al subir: ' + err.message;
        return;
      }
      var publicUrl = 'https://pub-cb882f9b206543b28ea81fcadac0f4b2.r2.dev/' + key;
      var urlEl = document.getElementById(urlInputId);
      if (urlEl) urlEl.value = publicUrl;
      if (statusEl) statusEl.innerHTML = '<i class="ri-check-line" style="color:#2ECC71;"></i>  Logo subido -- presiona Guardar para confirmar.';
    });
  }

  if (file.type === 'image/svg+xml') {
    doUpload(file);
    return;
  }
  /* Compress PNG preserving transparency, targeting ~80KB */
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var maxDim = 400;
      var w = img.width, h = img.height, scale = Math.min(1, maxDim / Math.max(w, h));
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      /* Adaptive quality: try reducing until under 80KB */
      var target = 80 * 1024;
      canvas.toBlob(function(blob) {
        if (blob && blob.size <= target) { doUpload(blob); return; }
        /* Try smaller dimensions */
        var canvas2 = document.createElement('canvas');
        var scale2 = Math.min(1, 280 / Math.max(w, h));
        canvas2.width = Math.round(w * scale2); canvas2.height = Math.round(h * scale2);
        canvas2.getContext('2d').drawImage(img, 0, 0, canvas2.width, canvas2.height);
        canvas2.toBlob(function(blob2) { doUpload(blob2 || blob); }, 'image/png');
      }, 'image/png');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.saveLogo = function(type) {
  var url=(document.getElementById('cfg-logo-'+(type||'dark')+'-url')||{}).value;
  if(url!==undefined)url=url.trim();else url='';
  var field=type==='light'?'logoLightUrl':'logoDarkUrl';
  var data={};data[field]=url;
  db().collection('config').doc('admin_settings').set(data,{merge:true})
    .then(function(){
      _applyLogo(url,type||'dark');
      toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Logo guardado.');
    }).catch(function(e){toast('âŒ '+e.message);});
};

window.removeLogo = function(type) {
  var field=type==='light'?'logoLightUrl':'logoDarkUrl';
  var data={};data[field]='';
  db().collection('config').doc('admin_settings').set(data,{merge:true})
    .then(function(){
      _applyLogo('',type||'dark');
      var urlEl=document.getElementById('cfg-logo-'+(type||'dark')+'-url');if(urlEl)urlEl.value='';
      var prev=document.getElementById('cfg-logo-'+(type||'dark')+'-preview');if(prev)prev.style.display='none';
      var st=document.getElementById('cfg-logo-'+(type||'dark')+'-upload-status');if(st)st.style.display='none';
      toast('Logo eliminado.');
    });
};

window.saveQrLogo = function() {
  var url = (document.getElementById('cfg-qr-logo-url')||{}).value;
  if (url !== undefined) url = url.trim(); else url = '';
  db().collection('config').doc('admin_settings').set({qrLogoUrl: url}, {merge: true})
    .then(function() { toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Logo QR guardado.'); })
    .catch(function(e) { toast('âŒ ' + e.message); });
};

window.removeQrLogo = function() {
  db().collection('config').doc('admin_settings').set({qrLogoUrl: ''}, {merge: true})
    .then(function() {
      var urlEl = document.getElementById('cfg-qr-logo-url'); if (urlEl) urlEl.value = '';
      var prev  = document.getElementById('cfg-qr-logo-preview'); if (prev) prev.style.display = 'none';
      var st    = document.getElementById('cfg-qr-logo-upload-status'); if (st) st.style.display = 'none';
      toast('Logo QR eliminado.');
    });
};

function _applyLogo(url, type) {
  if (type === 'light') {
    /* Logo oscuro (para fondos claros) -> Dashboard Admin, Activacion */
    var _lightIds=['act-brand-logo', 'sidebar-brand-logo'];
    _lightIds.forEach(function(id){
      var el=document.getElementById(id);
      if(!el)return;
      if(url){el.src=url;el.style.display='block';}
      else el.style.display='none';
    });

    /* Mobile topbar logo (version blanca invertida via CSS filter) */
    var mbl=document.getElementById('mobile-brand-logo');
    var mbt=document.getElementById('mobile-brand-text');
    if(mbl){ if(url){mbl.src=url;mbl.style.display='block';} else mbl.style.display='none'; }
    if(mbt){ mbt.style.display=url?'none':'block'; }

    var actMark=document.querySelector('.act-logo-mark');
    if(actMark)actMark.style.display=url?'none':'';

    var text=document.getElementById('sidebar-brand-text');
    var mark=document.querySelector('.sidebar-logo-mark');
    if(document.getElementById('sidebar-brand-logo')){
      if(url){ if(text)text.style.display='none'; if(mark)mark.style.display='none'; }
      else { if(text)text.style.display='block'; if(mark)mark.style.display=''; }
    }
  } else {
    /* Logo claro (para fondos oscuros) -> Client Dashboard, Perfil Mascota */
    var _darkIds=['client-brand-logo', 'pet-footer-logo'];
    _darkIds.forEach(function(id){
      var el=document.getElementById(id);
      if(!el)return;
      if(url){el.src=url;el.style.display='block';}
      else el.style.display='none';
    });
  }
}

function loadSettings() {
  db().collection('config').doc('admin_settings').get()
    .then(function(doc){
      if(!doc.exists)return;
      var data=doc.data();
      /* dark logo */
      var darkUrl=data.logoDarkUrl||data.logoUrl||'';
      if(darkUrl){
        _applyLogo(darkUrl,'dark');
        var el=document.getElementById('cfg-logo-dark-url');if(el)el.value=darkUrl;
        var prev=document.getElementById('cfg-logo-dark-preview');if(prev){prev.src=darkUrl;prev.style.display='block';}
      }
      /* light logo */
      var lightUrl=data.logoLightUrl||'';
      if(lightUrl){
        _applyLogo(lightUrl,'light');
        var el2=document.getElementById('cfg-logo-light-url');if(el2)el2.value=lightUrl;
        var prev2=document.getElementById('cfg-logo-light-preview');if(prev2){prev2.src=lightUrl;prev2.style.display='block';}
      }
      /* QR logo */
      var qrUrl=data.qrLogoUrl||'';
      if(qrUrl){
        var elQr=document.getElementById('cfg-qr-logo-url');if(elQr)elQr.value=qrUrl;
        var prevQr=document.getElementById('cfg-qr-logo-preview');if(prevQr){prevQr.src=qrUrl;prevQr.style.display='block';}
      }
    }).catch(function(){});
}

window._applyBrandConfig=function(){
  if(typeof db!=='function')return;
  db().collection('config').doc('admin_settings').get().then(function(doc){
    if(!doc.exists)return;
    var data=doc.data();
    var lightUrl=data.logoLightUrl||'';
    if(lightUrl)_applyLogo(lightUrl,'light');
  }).catch(function(){});
};

window.applyTheme = function(name) {
  document.body.classList.remove('theme-light','theme-cyan');
  if(name==='light')document.body.classList.add('theme-light');
  if(name==='cyan') document.body.classList.add('theme-cyan');
  ['dark','light','cyan'].forEach(function(t){var btn=document.getElementById('theme-btn-'+t);if(btn)btn.classList.toggle('active',t===name);});
  localStorage.setItem('petcingo_theme',name);
};

/* -- Staff legacy ---------------------------------------- */
window.saveStaff = function() {
  var name=document.getElementById('staff-name');var pass=document.getElementById('staff-pass');
  if(!name||!pass||!name.value.trim()||pass.value.trim().length<6){toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Nombre y contrasena (6+ chars).');return;}
  db().collection('staff').add({name:name.value.trim(),password:pass.value.trim(),role:'empleado',createdAt:firebase.firestore.FieldValue.serverTimestamp()})
    .then(function(){toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Empleado creado.');name.value='';pass.value='';})
    .catch(function(e){toast('âŒ '+e.message);});
};

/* -- Global QR generator (custom ID) --------------------- */
window.generateQR = function() {
  var inp=document.getElementById('qr-id-input');
  if(!inp||!inp.value.trim()){toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Ingresa un ID.');return;}
  var rawId=inp.value.trim();
  var profileUrl='https://prueb2.dashnexpages.net/activacion/?id='+encodeURIComponent(rawId);
  var display=document.getElementById('qr-display');if(!display)return;
  display.innerHTML='';
  var wrap=document.createElement('div');wrap.className='qr-canvas-wrap';
  var cd=document.createElement('div');cd.id='qr-canvas';wrap.appendChild(cd);
  var lbl=document.createElement('div');lbl.className='qr-id-label';lbl.textContent=rawId;wrap.appendChild(lbl);
  display.appendChild(wrap);
  try{
    _dash.qrInstance=new QRCode(cd,{text:profileUrl,width:220,height:220,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    _brandQR(cd);
  }
  catch(e){toast('Error QR: '+e.message);return;}
  var links=document.getElementById('qr-links'),res=document.getElementById('qr-result');
  if(links){var safeUrl=profileUrl.replace(/'/g,"\\'");links.innerHTML='<div class="qr-link-row"><div class="qr-link-label">Perfil Publico</div><div class="qr-link-url">'+esc(profileUrl)+'</div><button class="qr-link-copy" onclick="copyText(\''+safeUrl+'\',\'URL copiada\')"><i class="ri-file-copy-line"></i> Copiar</button></div>';}
  if(res)res.style.display='block';
  toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  QR generado: '+rawId);
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

function _brandQR(containerEl) {
  setTimeout(function() {
    var canvas = containerEl.querySelector('canvas');
    if(!canvas) return;
    var ctx = canvas.getContext('2d');
    /* Prefer dedicated QR logo; fall back to dark logo */
    var qrEl = document.getElementById('cfg-qr-logo-url');
    var darkEl = document.getElementById('cfg-logo-dark-url');
    var sidebarEl = document.getElementById('sidebar-brand-logo');
    var src = (qrEl && qrEl.value.trim()) || (darkEl && darkEl.value.trim()) || (sidebarEl && sidebarEl.src) || '';
    if(!src || src === window.location.href) return;
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var canvasW = canvas.width;
      var canvasH = canvas.height;
      var maxW = canvasW * 0.50;
      var maxH = canvasH * 0.50;
      var scale = Math.min(maxW / img.width, maxH / img.height);
      var lw = img.width * scale;
      var lh = img.height * scale;
      var cx = (canvasW - lw) / 2;
      var cy = (canvasH - lh) / 2;
      
      ctx.fillStyle = '#ffffff';
      var padding = 6;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - padding, cy - padding, lw + padding*2, lh + padding*2, 6);
        ctx.fill();
      } else {
        ctx.fillRect(cx - padding, cy - padding, lw + padding*2, lh + padding*2);
      }
      ctx.drawImage(img, cx, cy, lw, lh);
    };
    img.src = src;
  }, 150);
}

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
  navigator.clipboard.writeText(text).then(function(){toast('<i class="ri-file-copy-line"></i> '+(msg||'Copiado'));}).catch(function(){toast('No se pudo copiar.');});
};

/* -- Scan Log Retention -- */
window.purgeScanLogs = function() {
  var inp = document.getElementById('cfg-scan-days');
  var days = inp ? parseInt(inp.value, 10) : 90;
  if (!days || days < 7) days = 90;
  if (!confirm('Eliminar escaneos con mas de ' + days + ' dias? Esta accion no se puede deshacer.')) return;
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
      return seq.then(function() { toast('<i class="ri-delete-bin-line"></i> ' + total + ' escaneos eliminados.'); });
    })
    .catch(function(e) { toast('âŒ ' + e.message); });
};

/* -- Full Backup -- */
window.exportFullBackup = function() {
  var COLLECTIONS = ['pets', 'users', 'veterinarias', 'shelters', 'scan_logs', 'logs', 'staff'];
  var backup = { version: 1, exportedAt: new Date().toISOString(), data: {} };
  var btn = document.getElementById('btn-full-backup');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Exportando...'; }
  toast('Exportando backup completo...');

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
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Backup completo descargado.');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ri-download-cloud-line"></i> Exportar Backup Completo'; }
  });
};

window.exportDatabase = exportDatabase;
window.downloadJson   = downloadJson;

/* -- Restaurar Backup Completo -- */
window.importFullBackup = function() {
  var input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(evt) {
      var backup;
      try { backup = JSON.parse(evt.target.result); }
      catch(err) { toast('âŒ JSON invalido: ' + err.message); return; }
      if (!backup || !backup.data || typeof backup.data !== 'object') {
        toast('âŒ Formato de backup invalido. Se espera { version:1, data:{ coleccion:[...] } }.'); return;
      }
      var cols = Object.keys(backup.data);
      var totalDocs = cols.reduce(function(n, c) { return n + (Array.isArray(backup.data[c]) ? backup.data[c].length : 0); }, 0);
      if (!confirm('?Restaurar backup completo?\n\n' + cols.length + ' colecciones · ' + totalDocs + ' documentos\n\nSe SOBREESCRIBIRÁN documentos existentes con el mismo ID.\nEsta accion NO se puede deshacer.')) return;
      var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();
      var restored = 0, errors = 0;
      function commitChunk(col, chunk) {
        var b = firestoreDb.batch();
        chunk.forEach(function(rec) {
          var docId = rec._id || rec.id;
          if (!docId) { errors++; return; }
          var data = Object.assign({}, rec);
          delete data._id;
          Object.keys(data).forEach(function(k) {
            if (typeof data[k] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(data[k])) {
              data[k] = new Date(data[k]);
            }
          });
          b.set(firestoreDb.collection(col).doc(String(docId)), data, { merge: true });
          restored++;
        });
        return b.commit();
      }
      toast('Restaurando backup completo...');
      cols.reduce(function(chainCol, col) {
        return chainCol.then(function() {
          var records = backup.data[col];
          if (!Array.isArray(records) || records.length === 0) return Promise.resolve();
          var chunks = [];
          for (var i = 0; i < records.length; i += 400) chunks.push(records.slice(i, i + 400));
          return chunks.reduce(function(p, chunk) {
            return p.then(function() { return commitChunk(col, chunk); });
          }, Promise.resolve());
        });
      }, Promise.resolve())
        .then(function() {
          toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Backup restaurado: ' + restored + ' documentos en ' + cols.length + ' colecciones' + (errors ? ' · ' + errors + ' omitidos' : '') + '.');
        })
        .catch(function(err) { toast('âŒ Error al restaurar: ' + err.message); });
    };
    reader.readAsText(file);
  };
  input.click();
};

/* -- Importar / Restaurar coleccion desde JSON -- */
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
      catch(err) { toast('âŒ JSON invalido: ' + err.message); return; }
      if (!Array.isArray(records)) { toast('âŒ El archivo debe contener un array JSON.'); return; }

      if (!confirm('?Restaurar ' + records.length + ' registros en "' + collectionName + '"?\n\nSe SOBREESCRIBIRÁN documentos existentes con el mismo ID.\nEsta accion no se puede deshacer.')) return;

      var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();
      var count = 0, errors = 0;

      /* Firestore batches max 500 ops -- process in chunks */
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
      toast('Importando ' + records.length + ' registros en ' + chunks.length + ' lote(s)...');

      chunks.reduce(function(p, chunk) {
        return p.then(function() { return commitChunk(chunk); });
      }, Promise.resolve())
        .then(function() {
          toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  ' + count + ' registros restaurados en "' + collectionName + '"' + (errors ? ' · ' + errors + ' omitidos (sin ID)' : '') + '.');
        })
        .catch(function(err) { toast('âŒ Error al importar: ' + err.message); });
    };
    reader.readAsText(file);
  };
  input.click();
};

/* ==============================================================
   PET.HTML -- Public Profile
============================================================== */
window.initPetPage = function() {
  if(typeof window._applyBrandConfig==='function')window._applyBrandConfig();
  var params  = new URLSearchParams(window.location.search);
  var plateId = (params.get('id') || '').trim();

  /* -- No ID in URL -- */
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
        '<div class="pet-state-icon">â“</div>' +
        '<div class="pet-state-title">Placa no encontrada</div>' +
        '<div class="pet-state-sub">Asegurate de estar usando el enlace QR/NFC de la placa.</div>' +
        '';
    }
    return;
  }

  /* -- Fetch pet doc -- */
  var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();

  firestoreDb.collection('pets').doc(plateId).get()
    .then(function(docSnap) {
      if (!docSnap.exists) {
        _showPetError(plateId, 'Esta placa (<strong>' + esc(plateId) + '</strong>) no tiene un perfil registrado aun.');
        return;
      }
      var d = docSnap.data();

      /* Blocked states -- show but minimal */
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
          errEl.innerHTML = '<div class="pet-state-icon">·</div><div class="pet-state-title">Placa sin activar</div><div class="pet-state-sub">Esta placa aun no ha sido activada por su dueno.</div>' +
            '<a href="https://prueb2.dashnexpages.net/activacion/?id=' + encodeURIComponent(plateId) + '" style="margin-top:14px;display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:#4552CC;color:#fff;border-radius:12px;font-weight:700;font-size:.85rem;text-decoration:none">Activar placa -></a>';
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
      '<div class="pet-state-icon">â“</div>' +
      '<div class="pet-state-title">Placa no registrada</div>' +
      '<div class="pet-state-sub">' + (msg || 'No encontramos esta placa en el sistema.') + '</div>' +
      (plateId
        ? '<a href="https://prueb2.dashnexpages.net/activacion/?id=' + encodeURIComponent(plateId) + '" style="margin-top:14px;display:inline-block;padding:10px 18px;background:#4552CC;color:#fff;border-radius:12px;font-weight:700;font-size:.85rem;text-decoration:none">Activar placa -></a>'
        : '');
  }
}

function renderPetProfile(d, petId) {
  var isLost = d.status === 'perdido';

  /* Apply visual theme before rendering (skip if lost -- red banner takes precedence) */
  if (!isLost && window.PC_Themes) {
    window.PC_Themes.apply(d.theme || 'neutro');
  }

  if (isLost) {
    var banner=document.getElementById('pet-lost-banner'); if(banner)banner.style.display='block';
    var heroEl=document.getElementById('pet-hero'); if(heroEl)heroEl.classList.add('is-lost');
    var metaTheme=document.getElementById('meta-theme'); if(metaTheme)metaTheme.content='#cc0040';
  }

  /* Soporte: reporte dinamico */
  var reportBtn=document.getElementById('pet-report-btn');
  if(reportBtn){
    var reportMsg='!Hola! Quiero reportar un problema con la placa *'+petId+'* en Petcingo.';
    reportBtn.href='https://wa.me/59171040074?text='+encodeURIComponent(reportMsg);
  }

  document.title = (d.name||'Mascota') + ' - Petcingo';
  var nameEl=document.getElementById('pet-name');if(nameEl)nameEl.textContent=d.name||'Mascota';
  var plateIdEl=document.getElementById('pet-plate-id');if(plateIdEl)plateIdEl.textContent='ID: '+petId;

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

  /* Chips -- especie, edad (calculada), genero, peso */
  var chips=document.getElementById('pet-chips');
  if(chips){
    var ch='';
    if(d.species) ch+='<span class="pet-chip">'+_speciesEmoji(d.species)+' '+esc(d.species)+'</span>';
    if(d.gender)  ch+='<span class="pet-chip">'+(d.gender==='Macho'?'[M] Macho':'[F] Hembra')+'</span>';
    /* Calcular edad si solo hay birthdate */
    var chipAge=d.age||'';
    if(!chipAge&&d.birthdate){
      var _bd=new Date(d.birthdate),_now=new Date();
      var _y=_now.getFullYear()-_bd.getFullYear(),_m=_now.getMonth()-_bd.getMonth();
      if(_m<0||(_m===0&&_now.getDate()<_bd.getDate())){_y--;_m=(_m+12)%12;}
      chipAge=_y>0?_y+' ano'+(_y>1?'s':''):_m+' mes'+(_m!==1?'es':'');
    }
    if(chipAge) ch+='<span class="pet-chip">[CAKE] '+esc(chipAge)+'</span>';
    chips.innerHTML=ch;
  }

  /* Contact */
  _buildPetContactPanel(d, isLost);

  /* Owner info accordion */
  _buildPetOwnerAccordion(d);

  /* Message accordion */
  if(d.message){
    var msgAcc=document.getElementById('pet-acc-message');
    if(msgAcc){
      msgAcc.style.display='block';
      if(isLost){
        msgAcc.classList.add('open','acc-lost-msg');
        var msgIcon=msgAcc.querySelector('.pet-acc-icon');
        if(msgIcon){msgIcon.innerHTML='<i class="ri-alarm-warning-line" style="color:#f43f5e"></i>';}
        var msgLabel=msgAcc.querySelector('.pet-acc-label');
        if(msgLabel)msgLabel.innerHTML='<i class="ri-alert-line" style="color:#E74C3C;"></i> Mensaje al rescatista';
      }
    }
    var val=document.getElementById('pet-acc-message-val');
    if(val){
      val.textContent=d.message;
      if(isLost)val.classList.add('lost-style');
    }
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
    var dashUrl = 'https://prueb2.dashnexpages.net/mi-cuenta/?id=' + encodeURIComponent(petId) + '&token=' + encodeURIComponent(token2);
    manageEl.innerHTML = '<a href="' + dashUrl + '" style="display:inline-flex;align-items:center;gap:8px;padding:12px 20px;background:rgba(69,82,204,.10);border:1.5px solid rgba(69,82,204,.25);border-radius:14px;color:#4552CC;font-weight:700;font-size:.88rem;text-decoration:none;margin-top:4px"><i class="ri-settings-3-line"></i> Gestionar mi mascota</a>';
    manageEl.style.display = 'block';
  }

  /* -- Footer logo: vet/shelter logo if sold through org, Petcingo logo if direct -- */
  var _sid = d.sellerId || '';
  var _isDirect = !_sid || _sid === 'petcingo' || _sid === '__direct__';
  if (!_isDirect) {
    var _fDb = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();
    var _fLogo = document.getElementById('pet-footer-logo');
    var _fText = document.querySelector('.pet-footer-text');
    _fDb.collection('veterinarias').doc(_sid).get().then(function(vetDoc) {
      if (vetDoc.exists && vetDoc.data().logoUrl) {
        if (_fLogo) { _fLogo.src = vetDoc.data().logoUrl; _fLogo.style.display = 'block'; }
        if (_fText) _fText.innerHTML = 'Protegido por <strong>' + esc(vetDoc.data().name||'') + '</strong><br>'
          + '<span style="font-size:.68rem">Sistema Petcingo · Bolivia</span><br>'
          + '<a href="https://prueb2.dashnexpages.net/home/" target="_blank" style="color:var(--pet-primary)">petcingo.com.bo</a>';
      } else {
        return _fDb.collection('shelters').doc(_sid).get();
      }
    }).then(function(shDoc) {
      if (shDoc && shDoc.exists && shDoc.data().logoUrl) {
        if (_fLogo) { _fLogo.src = shDoc.data().logoUrl; _fLogo.style.display = 'block'; }
        if (_fText) _fText.innerHTML = 'Protegido por <strong>' + esc(shDoc.data().name||'') + '</strong><br>'
          + '<span style="font-size:.68rem">Sistema Petcingo · Bolivia</span><br>'
          + '<a href="https://prueb2.dashnexpages.net/home/" target="_blank" style="color:var(--pet-primary)">petcingo.com.bo</a>';
      }
    }).catch(function() {});
  }
}

function _buildPetOwnerAccordion(d) {
  var acc=document.getElementById('pet-acc-owner');
  var content=document.getElementById('pet-acc-owner-content');
  if(!acc||!content)return;
  var rows='';
  if(d.ownerName) rows+=_petInfoRow('ri-user-3-line','Propietario/a',d.ownerName);
  if(d.phone)  rows+=_petInfoRow('ri-phone-line','Telefono principal',d.phone);
  if(d.phone2) rows+=_petInfoRow('ri-phone-line','Telefono alternativo',d.phone2);
  if(d.ownerLocation){
    var loc=d.ownerLocation;
    /* Pais */
    if(loc.country) rows+=_petInfoRow('ri-global-line','Pais',loc.country);
    /* Bolivia: Departamento + Provincia */
    if(loc.dept){
      var deptStr=loc.dept+(loc.prov?' -- '+loc.prov:'');
      rows+=_petInfoRow('ri-map-2-line','Departamento',deptStr);
    }
    /* Internacional: Ciudad + Provincia/Estado */
    if(loc.intlCity){
      var cityStr=loc.intlCity+(loc.intlProv?' -- '+loc.intlProv: loc.prov?' -- '+loc.prov:'');
      rows+=_petInfoRow('ri-map-pin-2-line','Ciudad',cityStr);
    } else if(!loc.dept&&loc.prov){
      rows+=_petInfoRow('ri-map-2-line','Provincia / Estado',loc.prov);
    }
    /* Direccion escrita (soporta campo legacy 'city' de activate.html antiguo) */
    var address=loc.text||loc.city||'';
    if(address) rows+=_petInfoRow('ri-home-4-line','Direccion',address);
    /* GPS (soporta 'mapsUrl' legacy) */
    var gpsLink=loc.gpsLink||loc.mapsUrl||'';
    if(gpsLink){
      rows+='<div class="pet-info-row"><i class="ri-navigation-line pet-info-icon"></i><div><div class="pet-info-label">Ubicacion GPS</div><a href="'+esc(gpsLink)+'" target="_blank" rel="noopener" class="pet-location-link"><i class="ri-external-link-line"></i> Ver en Google Maps</a></div></div>';
    } else if(loc.lat&&loc.lng){
      var mapsUrl='https://maps.google.com/maps?q='+loc.lat.toFixed(6)+','+loc.lng.toFixed(6);
      rows+='<div class="pet-info-row"><i class="ri-navigation-line pet-info-icon"></i><div><div class="pet-info-label">Ubicacion GPS</div><a href="'+mapsUrl+'" target="_blank" rel="noopener" class="pet-location-link"><i class="ri-external-link-line"></i> Ver en Google Maps</a></div></div>';
    }
  }
  if(rows){
    acc.style.display='block';
    acc.classList.add('open');
    content.innerHTML=rows;
  }
}

function _buildPetContactPanel(d, isLost) {
  var phone1=normalizeWA(d.phone||'');
  var phone2=normalizeWA(d.phone2||'');
  var pn=d.name||'tu mascota';
  var waMsg=isLost
    ?' Encontre a *'+pn+'* que parece estar perdido/a. ?Como puedo ayudar? ¾'
    :'!Hola! Escanee la placa de *'+pn+'* en Petcingo.';
  var waUrl1='https://wa.me/'+phone1+'?text='+encodeURIComponent(waMsg);
  var panel=document.getElementById('pet-contact-panel');
  if(!panel)return;
  var html='<div class="pet-contact-title">Contacto del propietario</div>';
  var hasContact=false;
  if(phone1){html+='<a class="btn btn-wa" href="'+waUrl1+'" target="_blank" rel="noopener"><i class="ri-whatsapp-line"></i> WhatsApp</a>';hasContact=true;}
  if(phone2){var waUrl2='https://wa.me/'+phone2+'?text='+encodeURIComponent(waMsg);html+='<a class="btn btn-wa2" href="'+waUrl2+'" target="_blank" rel="noopener"><i class="ri-whatsapp-line"></i> WhatsApp alternativo</a>';hasContact=true;}
  if(d.phone){html+='<a class="btn btn-call-pet" href="tel:'+esc(d.phone)+'"><i class="ri-phone-line"></i> Llamada directa</a>';hasContact=true;}
  if(!hasContact)html='<p style="color:#7a6e8a;font-size:.85rem;text-align:center">Sin contacto registrado</p>';
  panel.innerHTML=html;

  var fab=document.getElementById('fab-wa');
  if(fab&&phone1){fab.href=waUrl1;fab.style.display='flex';}

  /* Seller logo -- async, no-op if not found */
  if(d.sellerPrefix){
    var _sc=(d.sellerType==='refugio'||d.sellerType==='shelter')?'shelters':'veterinarias';
    db().collection(_sc).where('prefix','==',d.sellerPrefix).limit(1).get()
      .then(function(s){
        if(s.empty)return;
        var sl=s.docs[0].data().logoUrl;
        if(!sl)return;
        var logoWrap=document.getElementById('pet-seller-logo-wrap');
        if(logoWrap){logoWrap.style.display='flex';var img=logoWrap.querySelector('img');if(img)img.src=sl;}
      }).catch(function(){});
  }
}

function _buildPetDataAccordion(d) {
  var content=document.getElementById('pet-acc-pet-content');if(!content)return;
  var rows='';
  /* -- Age calculation -- */
  var ageDisplay=d.age||'';
  if(!ageDisplay&&d.birthdate){
    var bd=new Date(d.birthdate),now2=new Date();
    var years=now2.getFullYear()-bd.getFullYear(),months=now2.getMonth()-bd.getMonth();
    if(months<0||(months===0&&now2.getDate()<bd.getDate())){years--;months=(months+12)%12;}
    ageDisplay=years>0?years+' ano'+(years>1?'s':'')+(months>0?' y '+months+' mes'+(months!==1?'es':''):''):months+' mes'+(months!==1?'es':'');
  }
  if(d.species)   rows+=_petInfoRow('ri-footprint-line','Especie',_speciesEmoji(d.species)+' '+d.species);
  if(d.breed)     rows+=_petInfoRow('ri-award-line','Raza',d.breed);
  if(ageDisplay)  rows+=_petInfoRow('ri-cake-line','Edad',ageDisplay);
  if(d.birthdate) rows+=_petInfoRow('ri-calendar-event-line','Fecha de nacimiento',d.birthdate);
  if(d.weight)    rows+=_petInfoRow('ri-scales-line','Peso',d.weight+' kg');
  if(d.behavior)  rows+=_petInfoRow('ri-star-line','Comportamiento',d.behavior);
  content.innerHTML=rows||'<p style="color:#7a6e8a;font-size:.85rem;padding:4px 0">Sin datos adicionales.</p>';

  /* -- Medical accordion (health data) -- */
  var medAcc=document.getElementById('pet-acc-medical');
  var medContent=document.getElementById('pet-acc-medical-content');
  if(!medAcc||!medContent)return;
  var medRows='';
  if(d.medical)              medRows+=_petInfoRow('ri-capsule-line','Info medica',d.medical);
  if(d.vaccinationStatus==='yes') {
    medRows+=_petInfoRow('ri-shield-check-line','Vacunado','Si');
    if(d.vaccinationDetails) medRows+=_petInfoRow('ri-file-list-3-line','Detalle vacunas',d.vaccinationDetails);
  } else if(d.vaccinationStatus==='no') {
    medRows+=_petInfoRow('ri-shield-cross-line','Vacunado','No');
  }
  if(d.rabiesVaccineCode)   medRows+=_petInfoRow('ri-syringe-line','Codigo vacuna rabia',d.rabiesVaccineCode);
  if(d.rabiesVaccineExpiry) medRows+=_petInfoRow('ri-calendar-check-line','Venc. vacuna rabia',d.rabiesVaccineExpiry);
  if(d.microchipped==='yes') medRows+=_petInfoRow('ri-cpu-line','Microchip','Si <i class="ri-check-line" style="color:#2ECC71;"></i>');
  else if(d.microchipped==='no') medRows+=_petInfoRow('ri-cpu-line','Microchip','No');
  if(d.spayNeutered==='yes') medRows+=_petInfoRow('ri-heart-line','Castrado/a','Si <i class="ri-check-line" style="color:#2ECC71;"></i>');
  else if(d.spayNeutered==='no') medRows+=_petInfoRow('ri-heart-line','Castrado/a','No');
  if(medRows){medAcc.style.display='block';medContent.innerHTML=medRows;}

}

function _petInfoRow(icon, label, value) {
  return '<div class="pet-info-row"><i class="'+icon+' pet-info-icon"></i><div><div class="pet-info-label">'+esc(label)+'</div><div class="pet-info-value">'+esc(value)+'</div></div></div>';
}

function _speciesEmoji(sp) {
  return {Perro:'•',Gato:'ˆ',Conejo:'‡',Ave:'[PET]'}[sp]||'¾';
}

window.togglePetAcc = function(id) {
  var el=document.getElementById(id);if(el)el.classList.toggle('open');
};

window.togglePetReportForm = function() {
  var form=document.getElementById('pet-report-form');
  var arrow=document.getElementById('pet-report-arrow');
  if(!form)return;
  var open=form.style.display==='none'||form.style.display==='';
  form.style.display=open?'block':'none';
  if(arrow)arrow.style.transform=open?'rotate(180deg)':'rotate(0deg)';
  if(open){var ta=document.getElementById('pet-report-msg');if(ta)ta.focus();}
};

/* _showPetError defined above near initPetPage */
function showPetError() { _showPetError('', ''); }

/* -- Geo Opt-In ------------------------------------------- */
function initGeoOptIn(petId) {
  if (!navigator.geolocation) return;

  /* Fast local cache: if we already logged today, skip everything */
  var today    = new Date().toDateString();
  var cacheKey = 'geo_logged_' + petId;
  if (localStorage.getItem(cacheKey) === today) return;

  /* Check Firestore query removed to avoid composite index error. 
     We rely on localStorage to prevent spamming the user on refresh. */
  setTimeout(function() { _showGeoModal(petId, cacheKey, today, (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore()); }, 1200);
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
      function() { /* GPS denied -- silent */ },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  if (newNo) newNo.addEventListener('click', function() {
    modal.classList.remove('show'); modal.style.display = 'none';
    localStorage.setItem(cacheKey, today);
  });
}

/* ==============================================================
   ACTIVATE.HTML
============================================================== */
window.initActivatePage = function() {
  /* Moved to activate.html for self-contained simplicity */
};

/* ==============================================================
   CLIENT DASHBOARD
============================================================== */
window.initClientDashboard = function() {
  if(typeof window._applyBrandConfig==='function')window._applyBrandConfig();
  var params    = new URLSearchParams(window.location.search);
  var petId     = (params.get('id')    || '').trim();
  var editToken = (params.get('token') || '').trim();
  var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();

  /* -- Path 1: Token-based URL access (QR links, backward compatible) -- */
  if (petId && editToken) {
    firestoreDb.collection('pets').doc(petId).get()
      .then(function(doc) {
        if (!doc.exists || doc.data().editToken !== editToken) { showAuthWall(); return; }
        var d = doc.data();
        window._currentPetData = d;
        _dash.currentUser = {
          name: d.ownerName || 'Dueno', role: 'client', petId: petId,
          permissions: { dashboard:true, pets:true, scan_logs:true, settings:false }
        };
        initClientApp(d, petId, editToken, firestoreDb);
      })
      .catch(function() { showAuthWall(); });
    return;
  }

  /* -- Path 2: Firebase Auth -- Google / email login -- */
  var authInst = (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') ? _getPcApp().auth() : null;
  if (!authInst) { showClientLoginWall(); return; }

  authInst.onAuthStateChanged(function(user) {
    if (!user) { showClientLoginWall(); return; }

    if (petId) {
      /* petId in URL without token: verify ownership by email */
      firestoreDb.collection('pets').doc(petId).get().then(function(doc) {
        if (!doc.exists) { showAuthWall(); return; }
        var d = doc.data();
        if ((d.ownerEmail || '').toLowerCase() !== user.email.toLowerCase()) { showAuthWall(); return; }
        _loadClientSession(d, petId, firestoreDb, user);
      }).catch(function() { showAuthWall(); });
    } else {
      /* No petId -- find pet(s) by ownerEmail, multi-pet: show first */
      firestoreDb.collection('pets').where('ownerEmail','==',user.email).get()
        .then(function(snap) {
          if (snap.empty) { _showClientNoPetWall(user); return; }
          var doc = snap.docs[0];
          /* Multiple pets: store list for switcher */
          if (snap.docs.length > 1) window._clientAllPets = snap.docs.map(function(d){ return {id:d.id,data:d.data()}; });
          _loadClientSession(doc.data(), doc.id, firestoreDb, user);
        })
        .catch(function() { showAuthWall(); });
    }
  });
};

function _loadClientSession(d, petId, firestoreDb, user) {
  window._currentPetData = d;
  window._clientUser     = user;
  _dash.currentUser = {
    name: (user && user.displayName) || d.ownerName || 'Dueno',
    role: 'client', petId: petId,
    email: user ? user.email : (d.ownerEmail || ''),
    permissions: { dashboard:true, pets:true, scan_logs:true, settings:false }
  };
  initClientApp(d, petId, d.editToken || '', firestoreDb);
}

function showAuthWall() {
  var aw  = document.getElementById('auth-wall');
  var lw  = document.getElementById('login-wall');
  var app = document.getElementById('app');
  if (lw)  lw.setAttribute('style','display:none!important');
  if (aw)  { aw.setAttribute('style','display:flex!important;background:#F3F3F3!important;background-color:#F3F3F3!important;color:#1E255E!important;'); aw.classList.add('show'); }
  if (app) { app.setAttribute('style','display:none!important'); }
}

function showClientLoginWall() {
  var lw  = document.getElementById('login-wall');
  var aw  = document.getElementById('auth-wall');
  var app = document.getElementById('app');
  if (app) app.setAttribute('style','display:none!important');
  if (aw)  aw.setAttribute('style','display:none!important');
  if (lw)  lw.setAttribute('style','display:flex!important');
}

function _showClientNoPetWall(user) {
  var email = user ? encodeURIComponent(user.email || '') : '';
  var name  = user ? encodeURIComponent(user.displayName || '') : '';
  window.location = 'activate.html?email=' + email + '&name=' + name;
}

/* Plan info renderer (called from initClientApp after data load) */
function renderClientPlanInfo(d) {
  var el = document.getElementById('plan-info-container');
  if (!el) return;
  var planLabels = { preventa:'Preventa', standard:'Estandar', familia:'Pack Familia', vitalicio:'Vitalicio' };
  var planIcons  = { preventa:'â³', standard:'[CART]!', familia:'¾', vitalicio:'[VET]' };
  var plan  = d.planType || d.plan || 'standard';
  var label = planLabels[plan] || plan;
  var icon  = planIcons[plan] || '[CART]!';
  var isLifetime = plan === 'vitalicio';

  var activatedAt   = d.activatedAt   ? (d.activatedAt.toDate   ? d.activatedAt.toDate()   : new Date(d.activatedAt)) : null;
  var planExpiresAt = d.planExpiresAt ? (d.planExpiresAt.toDate  ? d.planExpiresAt.toDate() : new Date(d.planExpiresAt)) : null;

  var daysLeft = '--';
  var daysColor = '#22C55E';
  if (isLifetime) {
    daysLeft = 'inf Vitalicio';
  } else if (planExpiresAt) {
    var diff = Math.ceil((planExpiresAt - Date.now()) / 86400000);
    if (diff > 30)  { daysLeft = diff + ' dias'; daysColor = '#22C55E'; }
    else if (diff > 0) { daysLeft = diff + ' dias'; daysColor = '#FFC837'; }
    else { daysLeft = 'Vencido'; daysColor = '#F24E4E'; }
  }

  el.innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">' +
      '<div class="info-cell"><div class="info-label-sm"><i class="ri-shield-star-line"></i> Plan activo</div>' +
        '<div class="info-value-sm" style="font-size:1.05rem;font-weight:700">' + icon + ' ' + label + '</div></div>' +
      '<div class="info-cell"><div class="info-label-sm"><i class="ri-time-line"></i> Tiempo restante</div>' +
        '<div class="info-value-sm" style="font-weight:700;color:' + daysColor + '">' + daysLeft + '</div></div>' +
      '<div class="info-cell"><div class="info-label-sm"><i class="ri-calendar-check-line"></i> Activado</div>' +
        '<div class="info-value-sm">' + (activatedAt ? formatDate(activatedAt) : '--') + '</div></div>' +
      '<div class="info-cell"><div class="info-label-sm"><i class="ri-calendar-close-line"></i> Vence</div>' +
        '<div class="info-value-sm">' + (isLifetime ? 'inf Nunca' : (planExpiresAt ? formatDate(planExpiresAt) : '--')) + '</div></div>' +
    '</div>' +
    ((!isLifetime && daysLeft !== '--' && parseInt(daysLeft) < 60) ?
      '<a href="https://wa.me/59171040074?text=Quiero%20renovar%20mi%20plan%20Petcingo" target="_blank" class="btn-solid-primary" style="display:inline-flex;text-decoration:none;margin-top:4px"><i class="ri-refresh-line"></i> Renovar plan</a>' : '');
}

/* Account info renderer */
function renderClientAccountInfo(d, user) {
  var el = document.getElementById('account-info');
  if (!el) return;
  var photoUrl = user && user.photoURL ? user.photoURL : '';
  var displayName = (user && user.displayName) || d.ownerName || 'Propietario';
  var email = (user && user.email) || d.ownerEmail || '--';
  var provider = (user && user.providerData && user.providerData[0]) ? user.providerData[0].providerId : 'password';

  el.innerHTML =
    '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;flex-wrap:wrap">' +
      (photoUrl ? '<img src="' + photoUrl + '" style="width:56px;height:56px;border-radius:50%;border:3px solid rgba(69,82,204,0.2)">' : '<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#4552CC,#51CBF5);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:#fff">' + displayName.charAt(0).toUpperCase() + '</div>') +
      '<div><div style="font-weight:700;font-size:1rem;color:#1E255E">' + esc(displayName) + '</div>' +
        '<div style="font-size:.83rem;color:#6C7297;margin-top:2px"><i class="ri-mail-line"></i> ' + esc(email) + '</div>' +
        '<div style="font-size:.75rem;color:#6C7297;margin-top:4px"><i class="ri-' + (provider==='google.com'?'google':'user') + '-fill" style="color:#4552CC"></i> ' + (provider==='google.com'?'Cuenta Google':'Email y contrasena') + '</div></div>' +
    '</div>';

  /* Multi-pet switcher */
  if (window._clientAllPets && window._clientAllPets.length > 1) {
    var sw = '<div style="margin-top:12px"><div class="info-label-sm" style="margin-bottom:8px"><i class="ri-exchange-line"></i> Mis mascotas</div>';
    window._clientAllPets.forEach(function(p) {
      var active = p.id === window._clientPetId;
      sw += '<button onclick="window.location.href=\'client-dashboard.html?id=' + p.id + '\'" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;margin-bottom:6px;border-radius:10px;border:2px solid ' + (active?'#4552CC':'rgba(69,82,204,0.15)') + ';background:' + (active?'rgba(69,82,204,0.07)':'#fff') + ';cursor:pointer;font-weight:' + (active?'700':'500') + ';color:#1E255E;font-size:.88rem">' +
        '<span>' + (p.data.species === 'Gato' ? 'ˆ' : '•') + '</span>' +
        '<span>' + esc(p.data.name || 'Sin nombre') + '</span>' +
        (active ? '<span class="badge badge-active" style="margin-left:auto">Actual</span>' : '') +
        '</button>';
    });
    sw += '</div>';
    el.innerHTML += sw;
  }
}

function initClientApp(d, petId, editToken, firestoreDb) {
  window._clientPetId     = petId;
  window._clientToken     = editToken;
  window._clientFirestore = firestoreDb;
  var app = document.getElementById('app');
  var aw  = document.getElementById('auth-wall');
  if (app) { app.setAttribute('style','display:block!important'); }
  if (aw)  { aw.setAttribute('style','display:none!important'); aw.classList.remove('show'); }

  var editUrl    = 'https://prueb2.dashnexpages.net/mi-cuenta/?id=' + petId + '&token=' + editToken;
  var profileUrl = 'https://prueb2.dashnexpages.net/id/?id=' + petId;

  /* -- Topbar -- */
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

  if (d.photoUrl) {
    var img2 = document.createElement('img');
    img2.className = 'pet-card-photo'; img2.src = d.photoUrl; img2.alt = '';
    var cap = document.getElementById('card-avatar'); if (cap) cap.replaceWith(img2);
  }

  /* -- Pet card sync -- */
  var cn = document.getElementById('card-name'); if (cn) cn.textContent = d.name || '--';
  var meta = [d.species, d.gender, d.age].filter(Boolean).join(' · ');
  var cm = document.getElementById('card-meta'); if (cm) cm.textContent = meta || (d.breed || 'Sin datos adicionales');

  /* -- Sincronizar link del menu movil -- */
  var tvpm = document.getElementById('top-view-profile-m'); if (tvpm) tvpm.href = profileUrl;

  /* -- Notificaciones de Soporte -- */
  checkSupportNotifications(petId, firestoreDb);

  var sTxt = { activo:'<i class="ri-check-line" style="color:#2ECC71;"></i>  Activo', perdido:'<i class="ri-alert-line" style="color:#E74C3C;"></i> Perdido', reservada:'â³ Pendiente' };
  var sCls = { activo:'badge-active', perdido:'badge-lost', reservada:'badge-reserved' };
  var cs   = document.getElementById('card-status');
  if (cs) cs.innerHTML = '<span class="badge ' + (sCls[d.status] || 'badge-reserved') + '">' + (sTxt[d.status] || d.status || '--') + '</span>';

  /* -- Tab: Mi Mascota (Modo Lectura) -- */
  renderClientPetGrid(d);

  var ss = document.getElementById('stat-status'); if (ss) ss.textContent = sTxt[d.status] || d.status || '--';

  /* -- Lost card UI -- */
  function _updateLostUI(isLost) {
    var btn = document.getElementById('btn-toggle-lost');
    var heroCard = document.getElementById('pet-hero-card');
    var lostCard = document.getElementById('lost-alert-card');
    var lostDesc = document.getElementById('lost-card-desc');
    var csEl = document.getElementById('card-status');

    if (btn) {
      if (isLost) {
        btn.innerHTML = '<i class="ri-check-line" style="color:#2ECC71;"></i>  Mascota Encontrada -- Desactivar alerta';
        btn.style.background = '#d1fae5';
        btn.style.color = '#065f46';
        btn.style.border = '1.5px solid #6ee7b7';
      } else {
        btn.innerHTML = '<i class="ri-alert-line" style="color:#E74C3C;"></i> Marcar como Perdida';
        btn.style.background = '#fce7f3';
        btn.style.color = '#9d174d';
        btn.style.border = '1.5px solid #fbcfe8';
      }
    }
    if (heroCard) { heroCard.classList.toggle('is-lost', isLost); }
    if (lostCard) { lostCard.classList.toggle('is-lost', isLost); }
    if (lostDesc && isLost) {
      lostDesc.innerHTML = '<i class="ri-alert-line" style="color:#E74C3C;"></i> Modo perdido activo. El perfil de tu mascota aparece en alerta roja. Presiona el boton cuando la encuentres.';
    } else if (lostDesc) {
      lostDesc.textContent = 'Si tu mascota se ha extraviado, activa el modo perdido. Esto cambiara su perfil a alerta roja y notificara visualmente a quien la encuentre.';
    }
    if (csEl) csEl.innerHTML = '<span class="badge ' + (sCls[isLost?'perdido':'activo'] || 'badge-reserved') + '">' + (sTxt[isLost?'perdido':'activo'] || '--') + '</span>';
  }

  _updateLostUI(d.status === 'perdido');

  window.toggleLostStatus = function() {
    var newStatus = (d.status === 'perdido') ? 'activo' : 'perdido';
    var firestoreDb2 = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();
    firestoreDb2.collection('pets').doc(petId).update({ status: newStatus })
      .then(function() {
        d.status = newStatus;
        var isLost = newStatus === 'perdido';
        toast(isLost ? '<i class="ri-alert-line" style="color:#E74C3C;"></i> Modo perdido activado.' : '<i class="ri-check-line" style="color:#2ECC71;"></i>  Alerta cancelada. Mascota activa.');
        _updateLostUI(isLost);
      })
      .catch(function(e) { toast('âŒ Error: ' + e.message); });
  };

  /* -- Photo Upload Logic -- */
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
          img.onerror = function() { reject(new Error('Imagen invalida o corrupta.')); };
          img.onload = function() {
            var canvas = document.createElement('canvas');
            canvas.width = 800; canvas.height = 800;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 800, 800);
            var size = Math.min(img.naturalWidth, img.naturalHeight);
            if (size <= 0) { reject(new Error('Imagen vacia.')); return; }
            var sx = (img.naturalWidth - size) / 2, sy = (img.naturalHeight - size) / 2;
            try { ctx.drawImage(img, sx, sy, size, size, 0, 0, 800, 800); } catch(e) { reject(new Error('Fallo al procesar imagen.')); return; }
            var bestBlob = null;
            var iterate = function(q) {
              canvas.toBlob(function(blob) {
                if (!blob) { bestBlob ? resolve(bestBlob) : reject(new Error('Tu navegador no soporta compresion.')); return; }
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
        toast('âŒ ' + e.message);
      });
    };

    pd.addEventListener('click',function(e){if(e.target===pi)return;pi.click();});
    pi.addEventListener('change',function(e){if(e.target.files&&e.target.files[0])handleEditFile(e.target.files[0]);e.target.value='';});
    pd.addEventListener('dragover',function(e){e.preventDefault();pd.classList.add('dragover');});
    pd.addEventListener('dragleave',function(){pd.classList.remove('dragover');});
    pd.addEventListener('drop',function(e){e.preventDefault();pd.classList.remove('dragover');if(e.dataTransfer.files[0])handleEditFile(e.dataTransfer.files[0]);});
  }

  /* -- Pre-llenar formulario de edicion con datos actuales -- */
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
    /* Location: country / dept / prov / intlCity / intlProv */
    if (data.ownerLocation) {
      var lc = data.ownerLocation;
      if (lc.country) {
        var cSel = document.getElementById('edit-loc-country');
        if (cSel) {
          cSel.value = lc.country;
          if (typeof onCountryChange === 'function') onCountryChange(lc.country, 'edit');
        }
      }
      if (lc.dept) {
        var dSel = document.getElementById('edit-loc-dept');
        if (dSel) { dSel.value = lc.dept; if (typeof onDeptChange === 'function') onDeptChange(lc.dept, 'edit'); }
      }
      if (lc.prov) {
        var pSel = document.getElementById('edit-loc-prov');
        if (pSel) pSel.value = lc.prov;
      }
      /* International city/province */
      if (lc.intlCity) {
        var icSel = document.getElementById('edit-intl-city');
        if (icSel) icSel.value = lc.intlCity;
      }
      if (lc.intlProv) {
        var ipEl = document.getElementById('edit-intl-prov');
        if (ipEl) ipEl.value = lc.intlProv;
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

  /* -- Load scan logs -- */
  loadScanLogs(petId, firestoreDb, d.status);

  /* -- Apply dark logo to topbar -- */
  (function(){
    var firestoreDb2 = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();
    firestoreDb2.collection('config').doc('admin_settings').get().then(function(cfgDoc) {
      if (!cfgDoc.exists) return;
      var cfg = cfgDoc.data();
      var logoUrl = cfg.logoDarkUrl || '';
      if (!logoUrl) return;
      var logoEl = document.getElementById('client-brand-logo');
      if (logoEl) logoEl.src = logoUrl;
    }).catch(function(){});
  })();

  /* -- Check unread admin replies (bell badge) -- */
  if (typeof window.checkOwnerUnreadReplies === 'function') {
    window.checkOwnerUnreadReplies(petId);
  }

  /* -- Plan info + account info (tabs Mi Plan / Mi Cuenta) -- */
  renderClientPlanInfo(d);
  renderClientAccountInfo(d, window._clientUser || null);

  /* -- Client-side auth actions -- */
  window.clientLogout = function() {
    var auth = (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') ? _getPcApp().auth() : null;
    if (auth) {
      auth.signOut().then(function() { showClientLoginWall(); });
    } else {
      window.location = 'index.html';
    }
  };

  window.clientLoginGoogle = function() {
    var auth = (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') ? _getPcApp().auth() : null;
    if (!auth) return;
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
      .then(function() { window.initClientDashboard(); })
      .catch(function(err) { console.warn('Login cancelado:', err.code); });
  };

  window.clientSendPasswordReset = function() {
    var auth = (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') ? _getPcApp().auth() : null;
    var user = auth ? auth.currentUser : null;
    var msgEl = document.getElementById('password-reset-msg');
    if (!user || !user.email) {
      if (msgEl) { msgEl.style.display = 'block'; msgEl.style.color = '#F24E4E'; msgEl.textContent = 'No hay un email asociado a tu sesion.'; }
      return;
    }
    if (user.providerData && user.providerData[0] && user.providerData[0].providerId === 'google.com') {
      if (msgEl) { msgEl.style.display = 'block'; msgEl.style.color = '#FFC837'; msgEl.textContent = 'Tu cuenta usa Google. Cambia la contrasena desde google.com/account.'; }
      return;
    }
    auth.sendPasswordResetEmail(user.email).then(function() {
      if (msgEl) { msgEl.style.display = 'block'; msgEl.style.color = '#22C55E'; msgEl.innerHTML = '<i class="ri-check-line" style="color:#2ECC71;"></i>  Enlace enviado a ' + user.email + '. Revisa tu correo.'; }
    }).catch(function(err) {
      if (msgEl) { msgEl.style.display = 'block'; msgEl.style.color = '#F24E4E'; msgEl.textContent = 'Error: ' + err.message; }
    });
  };
} /* -- end initClientApp -- */

/* Exposed for pages that call clientLoginGoogle before initClientApp runs */
window.clientLoginGoogle = function() {
  var auth = (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') ? _getPcApp().auth() : null;
  if (!auth) return;
  var provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(function() { if (typeof window.initClientDashboard === 'function') window.initClientDashboard(); })
    .catch(function(err) { console.warn('Login cancelado:', err.code); });
};

/* -- Tab: Mensajes del propietario -- */
window.loadOwnerMessages = function() {
  var listEl = document.getElementById('owner-messages-list');
  if (!listEl) return;
  var petId = (new URLSearchParams(window.location.search).get('id') || '').trim();
  if (!petId) return;
  var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();
  firestoreDb.collection('reports').where('plateId','==',petId).where('fromType','==','owner')
    .get().then(function(snap) {
      if (snap.empty) {
        listEl.innerHTML = '<div style="text-align:center;padding:24px;color:#6C7297;font-size:.85rem"><i class="ri-chat-off-line"></i><br>No hay mensajes aun.</div>';
        return;
      }
      var docs = [];
      snap.forEach(function(doc) { docs.push({ id: doc.id, d: doc.data() }); });
      docs.sort(function(a,b){
        var ta=a.d.createdAt&&a.d.createdAt.toDate?a.d.createdAt.toDate().getTime():0;
        var tb=b.d.createdAt&&b.d.createdAt.toDate?b.d.createdAt.toDate().getTime():0;
        return tb-ta;
      });
      var html = docs.map(function(r) {
        var d = r.d;
        var fecha = d.createdAt && d.createdAt.toDate ? formatDate(d.createdAt.toDate()) : '';
        var replyHtml = d.adminReply
          ? '<div style="margin-top:10px;padding:10px 12px;background:rgba(69,82,204,.06);border-left:3px solid #4552CC;border-radius:0 8px 8px 0;">'
            + '<div style="font-size:.7rem;font-weight:700;color:#8878a8;text-transform:uppercase;margin-bottom:4px;">Respuesta de Petcingo</div>'
            + '<div style="font-size:.85rem;color:#1E255E;line-height:1.55;">'+esc(d.adminReply)+'</div>'
            + '</div>'
          : '';
        var statusDot = d.status === 'replied'
          ? '<span style="background:rgba(0,200,150,.12);color:#00a870;padding:2px 8px;border-radius:10px;font-size:.68rem;font-weight:700;">Respondido</span>'
          : '<span style="background:rgba(69,82,204,.1);color:#4552CC;padding:2px 8px;border-radius:10px;font-size:.68rem;font-weight:700;">Enviado</span>';
        return '<div style="background:#fff;border:1px solid #e8e0f5;border-radius:12px;padding:14px 16px;margin-bottom:10px;">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
          + statusDot
          + '<span style="font-size:.72rem;color:#6C7297;">'+esc(fecha)+'</span>'
          + '</div>'
          + '<div style="font-size:.88rem;color:#1a1a2e;line-height:1.6;white-space:pre-wrap;">'+esc(d.message)+'</div>'
          + replyHtml
          + '</div>';
      }).join('');
      listEl.innerHTML = html;
      /* Mark unread replies as read */
      var firestoreDb2 = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();
      docs.forEach(function(r) {
        if (r.d.adminReply && !r.d.readByOwner) {
          firestoreDb2.collection('reports').doc(r.id).update({ readByOwner: true }).catch(function(){});
        }
      });
      /* Clear bell badge */
      var badge = document.getElementById('support-bell-badge');
      if (badge) badge.style.display = 'none';
    }).catch(function(e) {
      listEl.innerHTML = '<div style="color:#f43f5e;font-size:.82rem;padding:12px">Error: '+esc(e.message)+'</div>';
    });
};

window.sendOwnerMessage = function() {
  var inputEl = document.getElementById('owner-msg-input');
  if (!inputEl || !inputEl.value.trim()) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Escribe un mensaje.'); return; }
  var petId = (new URLSearchParams(window.location.search).get('id') || '').trim();
  if (!petId) return;
  var nameEl = document.getElementById('card-name');
  var ownerName = nameEl ? nameEl.textContent.trim() : '';
  var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();
  firestoreDb.collection('reports').add({
    fromType: 'owner',
    plateId: petId,
    fromName: ownerName,
    message: inputEl.value.trim(),
    status: 'open',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    inputEl.value = '';
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Mensaje enviado.');
    window.loadOwnerMessages();
  }).catch(function(e) { toast('âŒ '+e.message); });
};

/* -- Support Panel -- */
window.openSupportPanel = function() {
  var overlay = document.getElementById('support-panel-overlay');
  var panel   = document.getElementById('support-panel');
  if (overlay) overlay.style.display = 'block';
  if (panel)   panel.style.display   = 'block';
  window.loadOwnerMessages(); /* loadOwnerMessages marks replies as read and clears badge */
};

window.closeSupportPanel = function() {
  var overlay = document.getElementById('support-panel-overlay');
  var panel   = document.getElementById('support-panel');
  if (overlay) overlay.style.display = 'none';
  if (panel)   panel.style.display   = 'none';
};

window.checkOwnerUnreadReplies = function(petId) {
  if (!petId) return;
  var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();
  firestoreDb.collection('reports')
    .where('plateId','==',petId)
    .where('fromType','==','owner')
    .get().then(function(snap) {
      var unread = 0;
      snap.forEach(function(doc) {
        var d = doc.data();
        if (d.adminReply && !d.readByOwner) unread++;
      });
      var badge = document.getElementById('support-bell-badge');
      if (badge) badge.style.display = unread > 0 ? 'block' : 'none';
    }).catch(function(){});
};

/* -- Tab: Mi Mascota (Lectura vs Edicion) -- */
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
    ageVal = yy>0 ? yy+' ano'+(yy>1?'s':'') : mm+' mes'+(mm!==1?'es':'');
  }
  var vaccLabel = d.vaccinationStatus==='yes'?'Si <i class="ri-check-line" style="color:#2ECC71;"></i>':d.vaccinationStatus==='no'?'No':null;
  var chipLabel = d.microchipped==='yes'?'Si <i class="ri-check-line" style="color:#2ECC71;"></i>':d.microchipped==='no'?'No':null;
  var spayLabel = d.spayNeutered==='yes'?'Si <i class="ri-check-line" style="color:#2ECC71;"></i>':d.spayNeutered==='no'?'No':null;
  var locLabel  = d.ownerLocation ? (d.ownerLocation.text || null) : null;
  
  var cells = [
    ['Nombre', d.name], ['Dueno/a', d.ownerName], ['Especie', d.species], ['Raza', d.breed], ['Genero', d.gender],
    ['Edad', ageVal||null], ['Nacimiento', d.birthdate], ['Peso', d.weight ? d.weight + ' kg' : null],
    ['Telefono', d.phone], ['Mensaje', d.message], ['Comportamiento', d.behavior], ['Info medica', d.medical],
    ['Vacunado', vaccLabel], ['Vacunas detalle', d.vaccinationDetails||null],
    ['Cod. vacuna rabia', d.rabiesVaccineCode||null], ['Venc. rabia', d.rabiesVaccineExpiry||null],
    ['Microchip', chipLabel], ['Castrado/a', spayLabel], ['Zona del dueno', locLabel]
  ].filter(function(c) { return c[1] && c[1].trim() !== ''; }); // Oculta los vacios
  
  grid.innerHTML = cells.map(function(c) {
    return '<div class="info-cell"><div class="info-label-sm">' + esc(c[0]) + '</div><div class="info-value-sm">' + esc(String(c[1])) + '</div></div>';
  }).join('') || '<div class="info-cell" style="grid-column:1/-1"><div class="info-value-sm" style="color:#6c757d">Sin datos registrados aun.</div></div>';
}

/* Exposed as window.loadScanLogs for use by both client-dashboard and pet.html */
window.loadScanLogs = function(petId, firestoreDb, petStatus) {
  firestoreDb = firestoreDb || ((typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore());

  var listEl  = document.getElementById('scans-list');
  var mapEl   = document.getElementById('last-map-container');

  /* Show loading state */
  if (listEl) listEl.innerHTML = '<div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div><p style="margin-top:10px;font-size:.85rem">Cargando historial...</p></div>';
  if (mapEl)  mapEl.innerHTML  = '<div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div><p style="margin-top:10px;font-size:.85rem">Cargando mapa...</p></div>';

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
      
      /* -- Stats -- */
      var withGeo = 0, lastWithCoords = null;
      var lastDate = '--'; // Declarar la variable para evitar el error 'is not defined'
      docsArray.forEach(function(s) {
        if (s.latitude && s.longitude) { withGeo++; if (!lastWithCoords) lastWithCoords = s; }
      });

      var totalSize = snap.size;
      var sScans   = document.getElementById('stat-scans');    if (sScans)   sScans.textContent   = totalSize;
      var sGeo     = document.getElementById('stat-with-geo'); if (sGeo)     sGeo.innerHTML     = withGeo > 0 ? '<i class="ri-check-line" style="color:#2ECC71;"></i>  ' + withGeo + ' con ubicacion' : 'Sin ubicacion';
      var sLast    = document.getElementById('stat-last-scan');

      if (docsArray.length > 0 && docsArray[0].scannedAt && docsArray[0].scannedAt.toDate) {
        lastDate = formatDateTime(docsArray[0].scannedAt.toDate());
      }
      if (sLast) sLast.textContent = lastDate;

      /* -- Map: most recent with coords -- */
      if (mapEl) {
        if (lastWithCoords) {
          var lat = lastWithCoords.latitude.toFixed(6);
          var lng = lastWithCoords.longitude.toFixed(6);
          var mUrl = 'https://maps.google.com/maps?q=' + lat + ',' + lng;
          mapEl.innerHTML =
            '<div class="map-container">' +
              '<iframe loading="lazy" src="https://maps.google.com/maps?q=' + lat + ',' + lng + '&z=15&output=embed" title="Ubicacion del escaneo"></iframe>' +
            '</div>' +
            '<div class="scan-actions">' +
              '<a href="' + mUrl + '" target="_blank" rel="noopener" class="scan-action-btn map"><i class="ri-map-pin-line"></i> Abrir en Google Maps</a>' +
              '<button class="scan-action-btn" onclick="navigator.clipboard.writeText(\''+mUrl+'\').then(()=>toast(\'<i class="ri-file-copy-line"></i> Enlace copiado\'))"><i class="ri-links-line"></i> Copiar link</button>' +
              '<a href="https://api.whatsapp.com/send?text=' + encodeURIComponent('“ Ubicacion del ultimo escaneo de la mascota: ' + mUrl) + '" target="_blank" rel="noopener" class="scan-action-btn wa"><i class="ri-whatsapp-line"></i> Compartir</a>' +
            '</div>';
        } else {
          mapEl.innerHTML = '<div class="empty-state"><div style="font-size:32px;margin-bottom:10px">“</div><p style="font-size:.85rem">Sin escaneos con ubicacion compartida aun.</p></div>';
        }
      }

      /* -- Scan list -- */
      if (listEl) {
        if (snap.empty) {
          listEl.innerHTML = '<div class="empty-state"><div style="font-size:32px;margin-bottom:10px">“!</div><p style="font-size:.85rem;color:#6c757d">Todavia no hay escaneos registrados.</p></div>';
          return;
        }
        var html = '';
        
        /* Mensaje de Retencion */
        html += '<div class="retention-alert"><i class="ri-error-warning-fill" style="font-size:1.2rem;margin-top:2px;"></i><div><strong>Aviso de retencion:</strong> El historial de escaneos solo se almacenara por 3 meses desde su registro, a menos que sea reportado/a como perdido/a cuyo caso se mantiene todo el historial de su plan contratado.</div></div>';

        /* Rastreo de Ruta (Modo Perdido) */
        if (petStatus === 'perdido') {
          var geoScans = docsArray.filter(function(s) { return s.latitude && s.longitude; });
          if (geoScans.length > 0) {
            html += '<div style="margin-bottom:24px;border-left:3px solid #f43f5e;padding-left:16px;">';
            html += '<div style="color:#f43f5e;font-weight:700;margin-bottom:10px;"><i class="ri-route-line"></i> Ruta de Rastreo (Modo Perdido)</div>';
            geoScans.forEach(function(s, index) {
              var f = s.scannedAt && s.scannedAt.toDate ? formatDateTime(s.scannedAt.toDate()) : '--';
              var u = 'https://maps.google.com/maps?q=' + s.latitude.toFixed(6) + ',' + s.longitude.toFixed(6);
              html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
              html += '<div style="background:#f43f5e;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">'+(geoScans.length - index)+'</div>';
              html += '<div><div class="scan-date-text" style="font-size:0.85rem;">' + f + '</div><a href="'+u+'" target="_blank" style="font-size:0.8rem;color:#4552CC;text-decoration:none;"><i class="ri-map-pin-line"></i> Ver punto '+ (geoScans.length - index) +'</a></div>';
              html += '</div>';
            });
            html += '</div>';
          }
        }

        var tableRows = '';
        snap.forEach(function(doc) {
          var s = doc.data();
          var fecha = s.scannedAt && s.scannedAt.toDate ? formatDateTime(s.scannedAt.toDate()) : '--';
          var coordsTxt = (s.latitude && s.longitude)
            ? s.latitude.toFixed(4) + ', ' + s.longitude.toFixed(4) + (s.accuracy ? ' +/-' + Math.round(s.accuracy) + 'm' : '')
            : 'Sin ubicacion';
          var actionsCell = '';
          if (s.latitude && s.longitude) {
            var mu2 = 'https://maps.google.com/maps?q=' + s.latitude.toFixed(6) + ',' + s.longitude.toFixed(6);
            var waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent('“ Ubicacion: ' + mu2);
            actionsCell = '<div class="scan-actions">' +
              '<a href="' + mu2 + '" target="_blank" class="scan-action-btn map"><i class="ri-map-pin-line"></i> Mapa</a>' +
              '<button class="scan-action-btn copy" onclick="navigator.clipboard.writeText(\'' + mu2 + '\').then(function(){toast(\'<i class="ri-file-copy-line"></i> Copiado\')})"><i class="ri-links-line"></i> Copiar</button>' +
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
        ? '<p style="color:#6c757d;font-size:.82rem">Se requiere un indice de Firebase. Se configura automaticamente en unos minutos, recarga despues.</p>'
        : '<p style="color:#fc032d;font-size:.82rem">Error al cargar escaneos: ' + esc(e.message) + '</p>';
      if (listEl) listEl.innerHTML = errMsg;
      if (mapEl)  mapEl.innerHTML  = errMsg;
      ['stat-scans','stat-with-geo','stat-last-scan'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.textContent = '--';
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
  navigator.clipboard.writeText(el.innerHTML).then(function() { toast('<i class="ri-file-copy-line"></i> Enlace copiado'); });
};

/* -- Update pet profile from client dashboard -- */
window.updatePetData = function() {
  var clientPetId = window._clientPetId || (_dash.currentUser && _dash.currentUser.petId);
  if (!clientPetId) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> ID de mascota no encontrado.'); return; }
  var petId = clientPetId;
  if (!petId) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> ID de mascota no encontrado.'); return; }
  var firestoreDb = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();

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
  /* Location: country / dept / prov / intlCity / intlProv */
  var _lcFields = [['edit-loc-country','country'],['edit-loc-dept','dept'],['edit-loc-prov','prov'],['edit-intl-city','intlCity'],['edit-intl-prov','intlProv']];
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
  if (!Object.keys(updates).length) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> No hay cambios para guardar.'); return; }

  var btn = document.getElementById('btn-update-pet');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line"></i> Guardando...'; }

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
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Perfil actualizado correctamente.');
    
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
  }).catch(function(e) { toast('âŒ Error: ' + e.message); })
  .finally(function() {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ri-save-line"></i> Guardar cambios'; }
  });
};

/* ==============================================================
   REPORTS -- Envio desde pet.html y gestion en dashboard
============================================================== */

/* Envio desde perfil publico (pet.html) */
window.sendPetReport = function() {
  var msgEl  = document.getElementById('pet-report-msg');
  var sentEl = document.getElementById('pet-report-sent');
  var btnEl  = document.getElementById('pet-report-send-btn');
  if (!msgEl || !msgEl.value.trim()) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Escribe un mensaje antes de enviar.'); return; }
  var plateId  = new URLSearchParams(window.location.search).get('id') || '';
  var nameEl   = document.getElementById('pet-name');
  var petName  = nameEl ? nameEl.textContent.trim() : '';
  var db2      = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<i class="ri-loader-4-line"></i> Enviando...'; }
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
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Reporte enviado correctamente.');
  }).catch(function(e) {
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="ri-send-plane-line"></i> Enviar reporte'; }
    toast('âŒ Error al enviar: ' + e.message);
  });
};

/* Carga de reportes para el dashboard de admin */
window.loadReports = function(filterStatus) {
  var listEl = document.getElementById('reports-list');
  var cntEl  = document.getElementById('reports-count');
  if (!listEl) return;
  listEl.innerHTML = '<div class="empty-state" style="padding:28px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
  var db2 = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();

  /* Auto-eliminar reportes con mas de 21 dias */
  var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 21);
  db2.collection('reports').where('createdAt','<',firebase.firestore.Timestamp.fromDate(cutoff)).get()
    .then(function(old){
      if(old.empty)return;
      var b=db2.batch(); old.forEach(function(doc){b.delete(doc.ref);}); return b.commit();
    }).catch(function(){});

  db2.collection('reports').get().then(function(snap) {
    if (snap.empty) {
      listEl.innerHTML = '<div class="empty-state" style="padding:28px"><div style="font-size:32px;margin-bottom:8px">[MAIL]</div><p style="color:#6c757d">No hay reportes registrados aun.</p></div>';
      if (cntEl) cntEl.textContent = '0 reportes';
      return;
    }
    var docs = [];
    snap.forEach(function(doc) { docs.push({ id: doc.id, d: doc.data() }); });
    docs.sort(function(a,b){
      var ta=a.d.createdAt&&a.d.createdAt.toDate?a.d.createdAt.toDate().getTime():0;
      var tb=b.d.createdAt&&b.d.createdAt.toDate?b.d.createdAt.toDate().getTime():0;
      return tb-ta;
    });
    var filtered = filterStatus && filterStatus !== 'all' ? docs.filter(function(r){ return r.d.status === filterStatus; }) : docs;
    var openCount = docs.filter(function(r){ return r.d.status === 'open'; }).length;
    if (cntEl) cntEl.textContent = filtered.length + ' reporte' + (filtered.length !== 1 ? 's' : '') + (openCount > 0 ? ' · ' + openCount + ' abierto' + (openCount !== 1 ? 's' : '') : '');
    var badge = document.getElementById('reports-nav-badge');
    if (badge) { badge.textContent = openCount > 0 ? openCount : ''; badge.style.display = openCount > 0 ? 'inline-flex' : 'none'; }
    listEl.innerHTML = filtered.map(function(r) {
      var d = r.d;
      var canReply = d.fromType !== 'pet_profile';
      var fecha = d.createdAt && d.createdAt.toDate ? formatDate(d.createdAt.toDate()) : '--';
      var replyAt = d.replyAt && d.replyAt.toDate ? formatDate(d.replyAt.toDate()) : '';
      var typeMap = { pet_profile: { label:'Perfil mascota', color:'#f43f5e', bg:'rgba(244,63,94,.1)' }, owner: { label:'Propietario', color:'#4552CC', bg:'rgba(69,82,204,.1)' }, refugio: { label:'Refugio', color:'#ff9800', bg:'rgba(255,152,0,.12)' } };
      var tp = typeMap[d.fromType] || { label: d.fromType || '?', color:'#6c757d', bg:'rgba(108,117,125,.1)' };
      var statusHtml = d.status === 'open'
        ? '<span style="background:rgba(244,63,94,.12);color:#f43f5e;padding:3px 9px;border-radius:12px;font-size:.7rem;font-weight:700;">Abierto</span>'
        : d.status === 'replied'
        ? '<span style="background:rgba(0,200,150,.12);color:#00c896;padding:3px 9px;border-radius:12px;font-size:.7rem;font-weight:700;">Respondido</span>'
        : '<span style="background:rgba(108,117,125,.12);color:#6c757d;padding:3px 9px;border-radius:12px;font-size:.7rem;font-weight:700;">Cerrado</span>';
      var replySection = d.adminReply
        ? '<div style="margin-top:12px;padding:12px;background:rgba(69,82,204,.06);border-left:3px solid #4552CC;border-radius:0 8px 8px 0;">'
          + '<div style="font-size:.68rem;font-weight:700;color:#8878a8;text-transform:uppercase;margin-bottom:5px;">Respuesta del equipo' + (replyAt ? ' · ' + replyAt : '') + '</div>'
          + '<div style="font-size:.87rem;color:#f0ecff;line-height:1.55;">' + esc(d.adminReply) + '</div>'
          + '</div>'
        : '';
      var replyForm = canReply
        ? '<div id="reply-form-'+r.id+'" style="display:none;margin-top:12px;">'
          + '<textarea id="reply-msg-'+r.id+'" placeholder="Escribe tu respuesta al reporte..." maxlength="500" style="width:100%;padding:10px 12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#f0ecff;font-size:.85rem;font-family:\'DM Sans\',sans-serif;resize:none;height:80px;box-sizing:border-box;outline:none;line-height:1.5;"></textarea>'
          + '<div style="display:flex;gap:8px;margin-top:8px;">'
          + '<button onclick="replyToReport(\''+r.id+'\')" style="background:#4552CC;color:#fff;border:none;padding:9px 18px;border-radius:9px;font-weight:700;font-size:.82rem;cursor:pointer;flex:1;transition:background .2s;" onmouseover="this.style.background=\'#3A45B0\'" onmouseout="this.style.background=\'#4552CC\'"><i class="ri-send-plane-line"></i> Enviar respuesta</button>'
          + '<button onclick="closeReportById(\''+r.id+'\')" style="background:rgba(108,117,125,.15);color:#a0a0b0;border:none;padding:9px 14px;border-radius:9px;font-weight:700;font-size:.82rem;cursor:pointer;transition:background .2s;" title="Cerrar reporte"><i class="ri-check-line" style="color:#2ECC71;"></i></button>'
          + '</div></div>'
        : '';
      var actionRow = canReply
        ? '<div style="margin-top:12px;display:flex;gap:8px;">'
          + '<button onclick="toggleReplyForm(\''+r.id+'\')" style="background:rgba(69,82,204,.15);color:#A8B4F5;border:1px solid rgba(69,82,204,.3);padding:7px 14px;border-radius:9px;font-size:.8rem;font-weight:600;cursor:pointer;"><i class="ri-reply-line"></i> '+(d.adminReply?'Editar respuesta':'Responder')+'</button>'
          + '<button onclick="closeReportById(\''+r.id+'\')" style="background:rgba(108,117,125,.12);color:#6c757d;border:1px solid rgba(108,117,125,.2);padding:7px 12px;border-radius:9px;font-size:.8rem;cursor:pointer;" title="Cerrar reporte"><i class="ri-check-line" style="color:#2ECC71;"></i> Cerrar</button>'
          + '</div>'
        : '<div style="margin-top:12px;"><span style="font-size:.75rem;color:#6c757d;font-style:italic"><i class="ri-lock-line"></i> Reporte anonimo -- sin respuesta disponible</span></div>';
      return '<div id="report-card-'+r.id+'" class="rep-card" style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:16px 18px;margin-bottom:12px;">'
        + '<div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:10px;">'
        + '<span style="background:'+tp.bg+';color:'+tp.color+';padding:3px 9px;border-radius:12px;font-size:.7rem;font-weight:700;">'+tp.label+'</span>'
        + statusHtml
        + '<span class="rep-meta" style="font-size:.75rem;margin-left:auto;">'+fecha+'</span>'
        + '</div>'
        + (d.plateId ? '<div class="rep-plate" style="font-size:.78rem;margin-bottom:6px;font-family:monospace;">· '+esc(d.plateId)+(d.petName?' · '+esc(d.petName):'')+'</div>' : '')
        + (d.fromName ? '<div class="rep-meta" style="font-size:.78rem;margin-bottom:6px;"><i class="ri-user-line"></i> '+esc(d.fromName)+'</div>' : '')
        + '<div class="rep-msg" style="font-size:.9rem;line-height:1.6;white-space:pre-wrap;">'+esc(d.message)+'</div>'
        + replySection
        + replyForm
        + actionRow
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
  if (!msgEl || !msgEl.value.trim()) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Escribe una respuesta antes de enviar.'); return; }
  var db2 = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();
  db2.collection('reports').doc(id).update({
    adminReply: msgEl.value.trim(),
    status:     'replied',
    replyAt:    firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Respuesta enviada.');
    loadReports(_rCurrentFilter || 'all');
  }).catch(function(e) { toast('âŒ Error: ' + e.message); });
};

window.closeReportById = function(id) {
  var db2 = (typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore();
  db2.collection('reports').doc(id).update({ status: 'closed' }).then(function() {
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Reporte cerrado.');
    loadReports(_rCurrentFilter || 'all');
  }).catch(function(e) { toast('âŒ Error: ' + e.message); });
};

var _rCurrentFilter = 'all';
window.filterReports = function(status, btn) {
  _rCurrentFilter = status;
  document.querySelectorAll('.reports-filter-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  loadReports(status);
};

/* ==============================================================
   LANDING PAGE
============================================================== */
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

/* -- Soporte Propietario -- */
window.openSupportPanel = function() {
  var ov = document.getElementById('support-panel-overlay');
  var sp = document.getElementById('support-panel');
  if (ov) ov.style.display = 'block';
  if (sp) {
    sp.style.display = 'block';
    loadOwnerMessages();
    /* Ocultar badge al abrir */
    var badge = document.getElementById('support-bell-badge');
    if (badge) badge.style.display = 'none';
    /* Quitar animacion */
    var bell = document.getElementById('support-bell-btn');
    if (bell) { bell.style.animation = 'none'; }
  }
};
window.closeSupportPanel = function() {
  var ov = document.getElementById('support-panel-overlay');
  var sp = document.getElementById('support-panel');
  if (ov) ov.style.display = 'none';
  if (sp) sp.style.display = 'none';
};
window.sendOwnerMessage = function() {
  var inp = document.getElementById('owner-msg-input');
  if (!inp || !inp.value.trim()) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Escribe un mensaje.'); return; }
  var petId = window._clientPetId;
  var d = window._currentPetData || {};
  var db2 = window._clientFirestore || ((typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore());
  db2.collection('reports').add({
    fromType:  'owner',
    plateId:   petId,
    fromName:  d.ownerName || 'Propietario',
    petName:   d.name || '',
    message:   inp.value.trim(),
    status:    'open',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    inp.value = '';
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Mensaje enviado.');
    loadOwnerMessages();
  }).catch(function(e) { toast('âŒ Error: ' + e.message); });
};
function loadOwnerMessages() {
  var list = document.getElementById('owner-messages-list');
  if (!list) return;
  var petId = window._clientPetId;
  var db2 = window._clientFirestore || ((typeof _db !== 'undefined' && _db) ? _db : _getPcApp().firestore());
  list.innerHTML = '<div style="text-align:center;padding:10px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
  db2.collection('reports').where('plateId','==',petId).get()
    .then(function(snap) {
      if (snap.empty) { list.innerHTML = '<p style="font-size:.8rem;color:#7a6e8a;text-align:center">No tienes mensajes previos.</p>'; return; }
      var docs = [];
      snap.forEach(function(doc) { docs.push(doc.data()); });
      docs.sort(function(a,b){
        var ta = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
        var tb = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
        return tb - ta;
      });
      var html = '';
      docs.forEach(function(d) {
        var fecha = d.createdAt && d.createdAt.toDate ? formatDate(d.createdAt.toDate()) : '--';
        var reply = d.adminReply ? '<div style="margin-top:8px;padding:10px;background:#F5F6FC;border-radius:8px;font-size:.82rem;color:#1E255E;border-left:3px solid #4552CC"><strong>Equipo Petcingo:</strong><br>'+esc(d.adminReply)+'</div>' : '';
        html += '<div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f0f0f5">'
          + '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:.7rem;font-weight:700;color:#4552CC;text-transform:uppercase">Tu</span><span style="font-size:.65rem;color:#7a6e8a">'+fecha+'</span></div>'
          + '<div style="font-size:.85rem;color:#333959;line-height:1.4">'+esc(d.message)+'</div>'
          + reply + '</div>';
      });
      list.innerHTML = html;
    }).catch(function(e) { list.innerHTML = '<p style="color:var(--error);font-size:.75rem">Error al cargar mensajes.</p>'; });
}
function checkSupportNotifications(petId, db2) {
  db2.collection('reports').where('plateId','==',petId).where('status','==','replied').limit(1).get()
    .then(function(snap) {
      var badge = document.getElementById('support-bell-badge');
      if (badge && !snap.empty) {
        badge.style.display = 'block';
        /* Shake effect via inline style keyframes? No, better use a class if defined, or just simple interval */
        var bell = document.getElementById('support-bell-btn');
        if (bell) {
          bell.style.color = '#f43f5e';
        }
      }
    }).catch(function(){});
}

/* ============================================================
   TIENDA ADMIN -- Productos y Á“rdenes
   ============================================================ */
window.loadProducts = function() {
  var wrap = document.getElementById('products-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
  db().collection('products').orderBy('createdAt','desc').get().then(function(snap) {
    if (snap.empty) { wrap.innerHTML = '<p style="color:#6C7297;padding:16px;font-size:.85rem">No hay productos. Crea el primero.</p>'; return; }
    var html = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.82rem">'
      + '<thead><tr style="border-bottom:2px solid rgba(69,82,204,.12)">'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Producto</th>'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Categoria</th>'
      + '<th style="padding:10px 8px;text-align:right;color:#6C7297;font-weight:700">USD</th>'
      + '<th style="padding:10px 8px;text-align:right;color:#6C7297;font-weight:700">BOB</th>'
      + '<th style="padding:10px 8px;text-align:center;color:#6C7297;font-weight:700">Activo</th>'
      + '<th style="padding:10px 8px;text-align:center;color:#6C7297;font-weight:700">Acciones</th>'
      + '</tr></thead><tbody>';
    snap.forEach(function(doc) {
      var d = doc.data(), id = doc.id;
      var activeColor = d.active ? '#22C55E' : '#f43f5e';
      html += '<tr style="border-bottom:1px solid rgba(69,82,204,.07)">'
        + '<td style="padding:10px 8px;color:#1E255E;font-weight:600">' + esc(d.name || '--') + '</td>'
        + '<td style="padding:10px 8px;color:#6C7297">' + esc(d.category || '--') + '</td>'
        + '<td style="padding:10px 8px;text-align:right;color:#1E255E">$' + (d.priceUSD || 0).toFixed(2) + '</td>'
        + '<td style="padding:10px 8px;text-align:right;color:#6C7297">Bs.' + (d.priceBOB || 0).toFixed(0) + '</td>'
        + '<td style="padding:10px 8px;text-align:center"><span style="background:' + activeColor + '22;color:' + activeColor + ';border-radius:99px;padding:2px 10px;font-size:.72rem;font-weight:700">' + (d.active ? 'Si' : 'No') + '</span></td>'
        + '<td style="padding:10px 8px;text-align:center;display:flex;gap:6px;justify-content:center">'
        + '<button onclick="editProduct(\'' + id + '\')" style="padding:5px 10px;background:rgba(69,82,204,.1);color:#4552CC;border:none;border-radius:7px;font-size:.75rem;cursor:pointer;font-weight:600">Editar</button>'
        + '<button onclick="toggleProductActive(\'' + id + '\',' + !!d.active + ')" style="padding:5px 10px;background:rgba(244,63,94,.1);color:#f43f5e;border:none;border-radius:7px;font-size:.75rem;cursor:pointer;font-weight:600">' + (d.active ? 'Desactivar' : 'Activar') + '</button>'
        + '</td></tr>';
    });
    html += '</tbody></table></div>';
    wrap.innerHTML = html;
  }).catch(function(e) { wrap.innerHTML = '<p style="color:#f43f5e;font-size:.82rem;padding:12px">Error: ' + e.message + '</p>'; });
};

window.loadOrders = function() {
  var wrap = document.getElementById('orders-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
  var statusFilter = document.getElementById('order-status-filter');
  var q = db().collection('orders').orderBy('createdAt','desc').limit(50);
  if (statusFilter && statusFilter.value) q = db().collection('orders').where('status','==',statusFilter.value).orderBy('createdAt','desc').limit(50);
  q.get().then(function(snap) {
    if (snap.empty) { wrap.innerHTML = '<p style="color:#6C7297;padding:16px;font-size:.85rem">No hay ordenes aun.</p>'; return; }
    var html = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.82rem">'
      + '<thead><tr style="border-bottom:2px solid rgba(69,82,204,.12)">'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Comprador</th>'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Total</th>'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Pago</th>'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Estado</th>'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Fecha</th>'
      + '<th style="padding:10px 8px;text-align:center;color:#6C7297;font-weight:700">Accion</th>'
      + '</tr></thead><tbody>';
    snap.forEach(function(doc) {
      var d = doc.data(), id = doc.id;
      var fecha = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleDateString('es-BO') : '--';
      var statusColors = { pending_verification:'#FFC837', paid:'#22C55E', shipped:'#4552CC', delivered:'#1E255E' };
      var sc = statusColors[d.status] || '#6C7297';
      html += '<tr style="border-bottom:1px solid rgba(69,82,204,.07)">'
        + '<td style="padding:10px 8px;color:#1E255E;font-weight:600">' + esc(d.buyerName || '--') + '<br><span style="color:#6C7297;font-size:.72rem">' + esc(d.buyerEmail || '') + '</span></td>'
        + '<td style="padding:10px 8px;color:#1E255E;font-weight:700">$' + (d.totalUSD || 0).toFixed(2) + '</td>'
        + '<td style="padding:10px 8px;color:#6C7297">' + esc(d.paymentMethod || '--') + '</td>'
        + '<td style="padding:10px 8px"><span style="background:' + sc + '22;color:' + sc + ';border-radius:99px;padding:2px 10px;font-size:.72rem;font-weight:700">' + esc(d.status || '--') + '</span></td>'
        + '<td style="padding:10px 8px;color:#6C7297">' + fecha + '</td>'
        + '<td style="padding:10px 8px;text-align:center"><button onclick="updateOrderStatus(\'' + id + '\')" style="padding:5px 10px;background:rgba(69,82,204,.1);color:#4552CC;border:none;border-radius:7px;font-size:.75rem;cursor:pointer;font-weight:600">Actualizar</button></td>'
        + '</tr>';
    });
    html += '</tbody></table></div>';
    wrap.innerHTML = html;
  }).catch(function(e) { wrap.innerHTML = '<p style="color:#f43f5e;font-size:.82rem;padding:12px">Error: ' + e.message + '</p>'; });
};

window.openProductModal = function(productId) {
  var name = productId ? 'Editar producto' : 'Nuevo producto';
  var html = '<div style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" id="product-modal-overlay">'
    + '<div style="background:#fff;border-radius:20px;padding:24px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
    + '<h3 style="margin:0;color:#1E255E;font-family:Syne,sans-serif">' + name + '</h3>'
    + '<button onclick="document.getElementById(\'product-modal-overlay\').remove()" style="background:transparent;border:none;font-size:1.4rem;cursor:pointer;color:#6C7297"><i class="ri-delete-bin-line"></i></button>'
    + '</div>'
    + _productFormHtml(productId)
    + '</div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  if (productId) _fillProductForm(productId);
};

function _productFormHtml() {
  return '<div style="display:grid;gap:14px">'
    + '<div><label style="font-size:.75rem;font-weight:700;color:#6C7297;text-transform:uppercase;display:block;margin-bottom:5px">Nombre</label><input id="pf-name" type="text" style="width:100%;padding:10px 12px;border:1.5px solid rgba(69,82,204,.25);border-radius:10px;font-size:.88rem;color:#1E255E;background:#fff;box-sizing:border-box"></div>'
    + '<div><label style="font-size:.75rem;font-weight:700;color:#6C7297;text-transform:uppercase;display:block;margin-bottom:5px">Categoria</label><select id="pf-cat" style="width:100%;padding:10px 12px;border:1.5px solid rgba(69,82,204,.25);border-radius:10px;font-size:.88rem;color:#1E255E;background:#fff"><option value="placas">Placas ID</option><option value="collares">Collares</option><option value="accesorios">Accesorios</option></select></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    + '<div><label style="font-size:.75rem;font-weight:700;color:#6C7297;text-transform:uppercase;display:block;margin-bottom:5px">Precio USD</label><input id="pf-usd" type="number" min="0" step="0.01" style="width:100%;padding:10px 12px;border:1.5px solid rgba(69,82,204,.25);border-radius:10px;font-size:.88rem;color:#1E255E;background:#fff;box-sizing:border-box"></div>'
    + '<div><label style="font-size:.75rem;font-weight:700;color:#6C7297;text-transform:uppercase;display:block;margin-bottom:5px">Precio BOB</label><input id="pf-bob" type="number" min="0" step="1" style="width:100%;padding:10px 12px;border:1.5px solid rgba(69,82,204,.25);border-radius:10px;font-size:.88rem;color:#1E255E;background:#fff;box-sizing:border-box"></div>'
    + '</div>'
    + '<div><label style="font-size:.75rem;font-weight:700;color:#6C7297;text-transform:uppercase;display:block;margin-bottom:5px">Comision afiliados (%)</label><input id="pf-comm" type="number" min="0" max="100" step="1" value="10" style="width:100%;padding:10px 12px;border:1.5px solid rgba(69,82,204,.25);border-radius:10px;font-size:.88rem;color:#1E255E;background:#fff;box-sizing:border-box"></div>'
    + '<div><label style="font-size:.75rem;font-weight:700;color:#6C7297;text-transform:uppercase;display:block;margin-bottom:5px">Descripcion</label><textarea id="pf-desc" rows="3" style="width:100%;padding:10px 12px;border:1.5px solid rgba(69,82,204,.25);border-radius:10px;font-size:.88rem;color:#1E255E;background:#fff;box-sizing:border-box;resize:vertical"></textarea></div>'
    + '<div style="display:flex;align-items:center;gap:10px"><input type="checkbox" id="pf-active" checked style="accent-color:#4552CC"><label for="pf-active" style="font-size:.88rem;color:#1E255E">Producto activo</label></div>'
    + '<div style="display:flex;align-items:center;gap:10px"><input type="checkbox" id="pf-featured" style="accent-color:#4552CC"><label for="pf-featured" style="font-size:.88rem;color:#1E255E">Destacado en inicio</label></div>'
    + '<button onclick="saveProduct()" style="padding:12px 24px;background:#4552CC;color:#fff;border:none;border-radius:12px;font-size:.9rem;cursor:pointer;font-weight:700;width:100%">Guardar producto</button>'
    + '</div>';
}

window._editingProductId = null;
window.editProduct = function(id) {
  window._editingProductId = id;
  window.openProductModal(id);
};

window.saveProduct = function() {
  var data = {
    name: (document.getElementById('pf-name').value || '').trim(),
    category: document.getElementById('pf-cat').value,
    priceUSD: parseFloat(document.getElementById('pf-usd').value) || 0,
    priceBOB: parseFloat(document.getElementById('pf-bob').value) || 0,
    commissionPct: parseInt(document.getElementById('pf-comm').value) || 10,
    description: (document.getElementById('pf-desc').value || '').trim(),
    active: document.getElementById('pf-active').checked,
    featured: document.getElementById('pf-featured').checked,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (!data.name) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> El nombre es obligatorio'); return; }
  var ref = window._editingProductId
    ? db().collection('products').doc(window._editingProductId)
    : db().collection('products').doc();
  if (!window._editingProductId) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  ref.set(data, { merge: true }).then(function() {
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Producto guardado');
    var overlay = document.getElementById('product-modal-overlay');
    if (overlay) overlay.remove();
    window._editingProductId = null;
    loadProducts();
  }).catch(function(e) { toast('âŒ Error: ' + e.message); });
};

window._fillProductForm = function(id) {
  db().collection('products').doc(id).get().then(function(doc) {
    if (!doc.exists) return;
    var d = doc.data();
    var set = function(elId, val) { var el = document.getElementById(elId); if (el) el.value = val || ''; };
    set('pf-name', d.name); set('pf-cat', d.category); set('pf-usd', d.priceUSD); set('pf-bob', d.priceBOB);
    set('pf-comm', d.commissionPct); set('pf-desc', d.description);
    var chk = function(elId, val) { var el = document.getElementById(elId); if (el) el.checked = !!val; };
    chk('pf-active', d.active); chk('pf-featured', d.featured);
  });
};

window.toggleProductActive = function(id, current) {
  db().collection('products').doc(id).update({ active: !current })
    .then(function() { toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Estado actualizado'); loadProducts(); })
    .catch(function(e) { toast('âŒ ' + e.message); });
};

window.updateOrderStatus = function(id) {
  var newStatus = prompt('Nuevo estado:\npending_verification | paid | shipped | delivered');
  if (!newStatus) return;
  db().collection('orders').doc(id).update({ status: newStatus })
    .then(function() { toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Estado de orden actualizado'); loadOrders(); })
    .catch(function(e) { toast('âŒ ' + e.message); });
};

/* ============================================================
   DESCUENTOS ADMIN
   ============================================================ */
window.loadDiscounts = function() {
  var wrap = document.getElementById('discounts-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="empty-state" style="padding:20px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
  db().collection('discountCodes').orderBy('createdAt','desc').limit(50).get().then(function(snap) {
    if (snap.empty) { wrap.innerHTML = '<p style="color:#6C7297;padding:16px;font-size:.85rem">No hay codigos. Crea el primero.</p>'; return; }
    var html = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.82rem">'
      + '<thead><tr style="border-bottom:2px solid rgba(69,82,204,.12)">'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Codigo</th>'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Tipo</th>'
      + '<th style="padding:10px 8px;text-align:right;color:#6C7297;font-weight:700">Valor</th>'
      + '<th style="padding:10px 8px;text-align:center;color:#6C7297;font-weight:700">Usos</th>'
      + '<th style="padding:10px 8px;text-align:center;color:#6C7297;font-weight:700">Activo</th>'
      + '<th style="padding:10px 8px;text-align:center;color:#6C7297;font-weight:700">Acciones</th>'
      + '</tr></thead><tbody>';
    snap.forEach(function(doc) {
      var d = doc.data(), id = doc.id;
      var val = d.type === 'percent' ? d.value + '%' : '$' + (d.value || 0).toFixed(2) + ' USD';
      var ac = d.active ? '#22C55E' : '#f43f5e';
      html += '<tr style="border-bottom:1px solid rgba(69,82,204,.07)">'
        + '<td style="padding:10px 8px;font-family:monospace;font-weight:700;color:#4552CC;font-size:.92rem">' + esc(id) + '</td>'
        + '<td style="padding:10px 8px;color:#6C7297">' + (d.type === 'percent' ? 'Porcentaje' : 'Fijo') + '</td>'
        + '<td style="padding:10px 8px;text-align:right;color:#1E255E;font-weight:700">' + val + '</td>'
        + '<td style="padding:10px 8px;text-align:center;color:#1E255E">' + (d.usageCount || 0) + ' / ' + (d.maxUses || 'inf') + '</td>'
        + '<td style="padding:10px 8px;text-align:center"><span style="background:' + ac + '22;color:' + ac + ';border-radius:99px;padding:2px 10px;font-size:.72rem;font-weight:700">' + (d.active ? 'Si' : 'No') + '</span></td>'
        + '<td style="padding:10px 8px;text-align:center;display:flex;gap:6px;justify-content:center">'
        + '<button onclick="toggleDiscount(\'' + id + '\',' + !!d.active + ')" style="padding:5px 10px;background:rgba(244,63,94,.1);color:#f43f5e;border:none;border-radius:7px;font-size:.75rem;cursor:pointer;font-weight:600">' + (d.active ? 'Desactivar' : 'Activar') + '</button>'
        + '<button onclick="deleteDiscount(\'' + id + '\')" style="padding:5px 10px;background:#fee2e2;color:#b91c1c;border:none;border-radius:7px;font-size:.75rem;cursor:pointer;font-weight:600">Eliminar</button>'
        + '</td></tr>';
    });
    html += '</tbody></table></div>';
    wrap.innerHTML = html;
  }).catch(function(e) { wrap.innerHTML = '<p style="color:#f43f5e;padding:12px;font-size:.82rem">Error: ' + e.message + '</p>'; });
};

window.openDiscountModal = function() {
  var html = '<div style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" id="discount-modal-overlay">'
    + '<div style="background:#fff;border-radius:20px;padding:24px;width:100%;max-width:420px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
    + '<h3 style="margin:0;color:#1E255E;font-family:Syne,sans-serif">Nuevo codigo</h3>'
    + '<button onclick="document.getElementById(\'discount-modal-overlay\').remove()" style="background:transparent;border:none;font-size:1.4rem;cursor:pointer;color:#6C7297"><i class="ri-delete-bin-line"></i></button>'
    + '</div>'
    + '<div style="display:grid;gap:14px">'
    + '<div><label style="font-size:.75rem;font-weight:700;color:#6C7297;text-transform:uppercase;display:block;margin-bottom:5px">Codigo</label><input id="dc-code" type="text" placeholder="NAVIDAD25 (dejar vacio para auto)" style="width:100%;padding:10px 12px;border:1.5px solid rgba(69,82,204,.25);border-radius:10px;font-size:.88rem;color:#1E255E;background:#fff;box-sizing:border-box;text-transform:uppercase"></div>'
    + '<div><label style="font-size:.75rem;font-weight:700;color:#6C7297;text-transform:uppercase;display:block;margin-bottom:5px">Tipo</label><select id="dc-type" style="width:100%;padding:10px 12px;border:1.5px solid rgba(69,82,204,.25);border-radius:10px;font-size:.88rem;color:#1E255E;background:#fff"><option value="percent">Porcentaje (%)</option><option value="fixed">Monto fijo (USD)</option></select></div>'
    + '<div><label style="font-size:.75rem;font-weight:700;color:#6C7297;text-transform:uppercase;display:block;margin-bottom:5px">Valor</label><input id="dc-value" type="number" min="0" step="0.01" placeholder="10" style="width:100%;padding:10px 12px;border:1.5px solid rgba(69,82,204,.25);border-radius:10px;font-size:.88rem;color:#1E255E;background:#fff;box-sizing:border-box"></div>'
    + '<div><label style="font-size:.75rem;font-weight:700;color:#6C7297;text-transform:uppercase;display:block;margin-bottom:5px">Max. usos (vacio = ilimitado)</label><input id="dc-max" type="number" min="1" step="1" style="width:100%;padding:10px 12px;border:1.5px solid rgba(69,82,204,.25);border-radius:10px;font-size:.88rem;color:#1E255E;background:#fff;box-sizing:border-box"></div>'
    + '<div><label style="font-size:.75rem;font-weight:700;color:#6C7297;text-transform:uppercase;display:block;margin-bottom:5px">Fecha de expiracion</label><input id="dc-expiry" type="date" style="width:100%;padding:10px 12px;border:1.5px solid rgba(69,82,204,.25);border-radius:10px;font-size:.88rem;color:#1E255E;background:#fff;box-sizing:border-box"></div>'
    + '<button onclick="saveDiscount()" style="padding:12px 24px;background:#4552CC;color:#fff;border:none;border-radius:12px;font-size:.9rem;cursor:pointer;font-weight:700;width:100%">Crear codigo</button>'
    + '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
};

window.saveDiscount = function() {
  var codeEl = document.getElementById('dc-code');
  var code = (codeEl ? codeEl.value.trim().toUpperCase() : '') || _randomCode(8);
  var type = document.getElementById('dc-type').value;
  var value = parseFloat(document.getElementById('dc-value').value) || 0;
  var maxUses = parseInt(document.getElementById('dc-max').value) || null;
  var expiry = document.getElementById('dc-expiry').value;
  if (!value) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> El valor es obligatorio'); return; }
  var data = { type: type, value: value, active: true, usageCount: 0,
    maxUses: maxUses, expiresAt: expiry ? new Date(expiry) : null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp() };
  db().collection('discountCodes').doc(code).set(data).then(function() {
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Codigo ' + code + ' creado');
    var o = document.getElementById('discount-modal-overlay'); if (o) o.remove();
    loadDiscounts();
  }).catch(function(e) { toast('âŒ ' + e.message); });
};

window.quickDiscount = function(code, type, value) {
  db().collection('discountCodes').doc(code).set({ type: type, value: value, active: true, usageCount: 0, maxUses: null, expiresAt: null, createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
    .then(function() { toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Codigo ' + code + ' listo'); loadDiscounts(); })
    .catch(function(e) { toast('âŒ ' + e.message); });
};

window.toggleDiscount = function(id, current) {
  db().collection('discountCodes').doc(id).update({ active: !current })
    .then(function() { toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Estado actualizado'); loadDiscounts(); });
};

window.deleteDiscount = function(id) {
  if (!confirm('Eliminar codigo ' + id + '?')) return;
  db().collection('discountCodes').doc(id).delete()
    .then(function() { toast('<i class="ri-delete-bin-line"></i> Codigo eliminado'); loadDiscounts(); });
};

function _randomCode(len) {
  var chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
  var out = '';
  for (var i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* ============================================================
   AFILIADOS ADMIN
   ============================================================ */
window.loadAffiliates = function() {
  var pendWrap = document.getElementById('affiliates-pending-wrap');
  var actWrap  = document.getElementById('affiliates-active-wrap');
  var payWrap  = document.getElementById('affiliates-payouts-wrap');
  var badge    = document.getElementById('aff-pending-badge');

  if (pendWrap) pendWrap.innerHTML = '<div class="empty-state" style="padding:16px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
  if (actWrap)  actWrap.innerHTML  = '<div class="empty-state" style="padding:16px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';

  db().collection('affiliates').orderBy('createdAt','desc').limit(100).get().then(function(snap) {
    var pending = [], active = [], withPayout = [];
    snap.forEach(function(doc) {
      var d = Object.assign({ id: doc.id }, doc.data());
      if (d.status === 'pending') pending.push(d);
      else if (d.status === 'approved') active.push(d);
      if (d.status === 'approved' && (d.pendingPayout || 0) >= 15) withPayout.push(d);
    });

    /* Badge */
    if (badge) { badge.textContent = pending.length; badge.style.display = pending.length ? 'inline' : 'none'; }

    /* Pending */
    if (pendWrap) {
      if (!pending.length) { pendWrap.innerHTML = '<p style="color:#22C55E;font-size:.85rem;padding:12px"><i class="ri-check-line" style="color:#2ECC71;"></i>  Sin solicitudes pendientes.</p>'; }
      else {
        pendWrap.innerHTML = pending.map(function(a) {
          return '<div style="padding:14px;background:#f8f9ff;border-radius:12px;margin-bottom:10px;border:1px solid rgba(69,82,204,.1)">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">'
            + '<div><div style="font-weight:700;color:#1E255E">' + esc(a.name) + '</div>'
            + '<div style="font-size:.78rem;color:#6C7297">' + esc(a.email) + ' · ' + esc(a.socialPlatform || '') + ' @' + esc(a.socialHandle || '') + ' · ' + esc(a.audienceSize || '') + ' seguidores</div>'
            + '<div style="font-size:.75rem;color:#6C7297;margin-top:4px">"' + esc(a.reason || '') + '"</div></div>'
            + '<div style="display:flex;gap:8px">'
            + '<button onclick="approveAffiliate(\'' + a.id + '\')" style="padding:7px 14px;background:#22C55E;color:#fff;border:none;border-radius:8px;font-size:.78rem;cursor:pointer;font-weight:700">Aprobar</button>'
            + '<button onclick="rejectAffiliate(\'' + a.id + '\')" style="padding:7px 14px;background:#f43f5e;color:#fff;border:none;border-radius:8px;font-size:.78rem;cursor:pointer;font-weight:700">Rechazar</button>'
            + '</div></div></div>';
        }).join('');
      }
    }

    /* Active table */
    if (actWrap) {
      if (!active.length) { actWrap.innerHTML = '<p style="color:#6C7297;font-size:.85rem;padding:12px">No hay afiliados aprobados aun.</p>'; }
      else {
        actWrap.innerHTML = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.82rem">'
          + '<thead><tr style="border-bottom:2px solid rgba(69,82,204,.12)">'
          + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Nombre</th>'
          + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Codigo</th>'
          + '<th style="padding:10px 8px;text-align:right;color:#6C7297;font-weight:700">Ventas</th>'
          + '<th style="padding:10px 8px;text-align:right;color:#6C7297;font-weight:700">Ganado</th>'
          + '<th style="padding:10px 8px;text-align:right;color:#6C7297;font-weight:700">Pendiente</th>'
          + '<th style="padding:10px 8px;text-align:center;color:#6C7297;font-weight:700">Accion</th>'
          + '</tr></thead><tbody>'
          + active.map(function(a) {
            return '<tr style="border-bottom:1px solid rgba(69,82,204,.07)">'
              + '<td style="padding:10px 8px;color:#1E255E;font-weight:600">' + esc(a.name) + '<br><span style="color:#6C7297;font-size:.72rem">' + esc(a.email) + '</span></td>'
              + '<td style="padding:10px 8px;font-family:monospace;font-weight:700;color:#4552CC">' + esc(a.promoCode || '--') + '</td>'
              + '<td style="padding:10px 8px;text-align:right;color:#1E255E">$' + (a.totalSales || 0).toFixed(2) + '</td>'
              + '<td style="padding:10px 8px;text-align:right;color:#22C55E;font-weight:700">$' + (a.totalEarned || 0).toFixed(2) + '</td>'
              + '<td style="padding:10px 8px;text-align:right;color:#FFC837;font-weight:700">$' + (a.pendingPayout || 0).toFixed(2) + '</td>'
              + '<td style="padding:10px 8px;text-align:center"><button onclick="markAffPaid(\'' + a.id + '\',' + (a.pendingPayout||0) + ')" style="padding:5px 10px;background:rgba(34,197,94,.1);color:#22C55E;border:none;border-radius:7px;font-size:.75rem;cursor:pointer;font-weight:600">Marcar pagado</button></td>'
              + '</tr>';
          }).join('') + '</tbody></table></div>';
      }
    }

    /* Payouts ready */
    if (payWrap) {
      if (!withPayout.length) { payWrap.innerHTML = '<p style="color:#6C7297;font-size:.85rem">Ningun afiliado supera el minimo de $15 USD.</p>'; }
      else { payWrap.innerHTML = withPayout.map(function(a) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;margin-bottom:8px">'
          + '<div><div style="font-weight:700;color:#1E255E">' + esc(a.name) + '</div><div style="font-size:.75rem;color:#6C7297">' + esc(a.email) + '</div></div>'
          + '<div style="font-size:1.2rem;font-weight:800;color:#FFC837">$' + (a.pendingPayout||0).toFixed(2) + '</div>'
          + '<button onclick="markAffPaid(\'' + a.id + '\',' + (a.pendingPayout||0) + ')" style="padding:7px 14px;background:#22C55E;color:#fff;border:none;border-radius:8px;font-size:.78rem;cursor:pointer;font-weight:700">Pagar</button>'
          + '</div>';
      }).join(''); }
    }
  }).catch(function(e) { if (pendWrap) pendWrap.innerHTML = '<p style="color:#f43f5e;font-size:.82rem">Error: ' + e.message + '</p>'; });
};

window.approveAffiliate = function(id) {
  var code = _randomCode(8);
  var comm = 10;
  db().collection('affiliates').doc(id).update({
    status: 'approved', promoCode: code, commissionPct: comm,
    approvedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Afiliado aprobado -- codigo: ' + code);
    loadAffiliates();
  }).catch(function(e) { toast('âŒ ' + e.message); });
};

window.rejectAffiliate = function(id) {
  if (!confirm('?Rechazar esta solicitud?')) return;
  db().collection('affiliates').doc(id).update({ status: 'rejected' })
    .then(function() { toast('Solicitud rechazada'); loadAffiliates(); });
};

window.markAffPaid = function(id, amount) {
  if (!confirm('?Marcar como pagado $' + parseFloat(amount).toFixed(2) + ' USD?')) return;
  var batch = db().batch();
  batch.update(db().collection('affiliates').doc(id), { pendingPayout: 0 });
  batch.set(db().collection('affiliatePayouts').doc(), {
    affiliateId: id, amount: amount,
    paidAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.commit().then(function() { toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Pago registrado'); loadAffiliates(); })
    .catch(function(e) { toast('âŒ ' + e.message); });
};

/* ============================================================
   SEGURIDAD ADMIN
   ============================================================ */
window.loadSecurityAlerts = function() {
  var wrap = document.getElementById('security-alerts-wrap');
  var blockedWrap = document.getElementById('blocked-plates-list');
  var cntAlerts = document.getElementById('sec-alerts-count');
  var cntVel = document.getElementById('sec-velocity-count');
  var cntBlocked = document.getElementById('sec-blocked-count');

  if (wrap) wrap.innerHTML = '<div class="empty-state" style="padding:16px"><div class="loading-dots"><span></span><span></span><span></span></div></div>';

  var typeFilter = document.getElementById('alert-type-filter');
  var q = db().collection('securityAlerts').orderBy('createdAt','desc').limit(100);
  if (typeFilter && typeFilter.value) q = db().collection('securityAlerts').where('type','==',typeFilter.value).orderBy('createdAt','desc').limit(100);

  q.get().then(function(snap) {
    if (cntAlerts) cntAlerts.textContent = snap.size;
    var velCount = 0;
    snap.forEach(function(doc) { if (doc.data().type === 'velocity') velCount++; });
    if (cntVel) cntVel.textContent = velCount;

    if (!wrap) return;
    if (snap.empty) { wrap.innerHTML = '<p style="color:#22C55E;font-size:.85rem;padding:12px"><i class="ri-check-line" style="color:#2ECC71;"></i>  Sin alertas activas.</p>'; return; }
    var typeColors = { velocity:'#FFC837', geo_anomaly:'#f43f5e', unauthorized:'#7c3aed' };
    var typeLabels = { velocity:'Alta velocidad', geo_anomaly:'Anomalia geografica', unauthorized:'No autorizado' };
    var html = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.82rem">'
      + '<thead><tr style="border-bottom:2px solid rgba(69,82,204,.12)">'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Placa</th>'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Tipo</th>'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Detalle</th>'
      + '<th style="padding:10px 8px;text-align:left;color:#6C7297;font-weight:700">Fecha</th>'
      + '<th style="padding:10px 8px;text-align:center;color:#6C7297;font-weight:700">Accion</th>'
      + '</tr></thead><tbody>';
    snap.forEach(function(doc) {
      var d = doc.data(), docId = doc.id;
      var fecha = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleString('es-BO') : '--';
      var tc = typeColors[d.type] || '#6C7297';
      var tl = typeLabels[d.type] || d.type;
      html += '<tr style="border-bottom:1px solid rgba(69,82,204,.07)">'
        + '<td style="padding:10px 8px;font-family:monospace;font-weight:700;color:#4552CC">' + esc(d.plateId || '--') + '</td>'
        + '<td style="padding:10px 8px"><span style="background:' + tc + '22;color:' + tc + ';border-radius:99px;padding:2px 10px;font-size:.72rem;font-weight:700">' + esc(tl) + '</span></td>'
        + '<td style="padding:10px 8px;color:#6C7297;font-size:.78rem">' + esc(d.detail || '--') + '</td>'
        + '<td style="padding:10px 8px;color:#6C7297;font-size:.75rem">' + fecha + '</td>'
        + '<td style="padding:10px 8px;text-align:center">'
        + '<button onclick="blockPlateFromAlert(\'' + esc(d.plateId || '') + '\')" style="padding:5px 10px;background:rgba(244,63,94,.1);color:#f43f5e;border:none;border-radius:7px;font-size:.75rem;cursor:pointer;font-weight:600;margin-right:4px">Bloquear</button>'
        + '<button onclick="dismissAlert(\'' + docId + '\')" style="padding:5px 10px;background:rgba(69,82,204,.1);color:#4552CC;border:none;border-radius:7px;font-size:.75rem;cursor:pointer;font-weight:600">Ignorar</button>'
        + '</td></tr>';
    });
    html += '</tbody></table></div>';
    wrap.innerHTML = html;
  }).catch(function(e) { if (wrap) wrap.innerHTML = '<p style="color:#f43f5e;font-size:.82rem;padding:12px">Error: ' + e.message + '</p>'; });

  /* Load blocked plates */
  db().collection('config').doc('admin_settings').get().then(function(doc) {
    var blocked = (doc.exists && doc.data().blockedPlates) ? doc.data().blockedPlates : [];
    if (cntBlocked) cntBlocked.textContent = blocked.length;
    if (!blockedWrap) return;
    if (!blocked.length) { blockedWrap.innerHTML = '<p style="color:#6C7297;font-size:.85rem">La lista negra esta vacia.</p>'; return; }
    blockedWrap.innerHTML = blocked.map(function(pid) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#fee2e2;border-radius:8px;margin-bottom:6px">'
        + '<span style="font-family:monospace;font-weight:700;color:#b91c1c">' + esc(pid) + '</span>'
        + '<button onclick="unblockPlate(\'' + esc(pid) + '\')" style="padding:4px 10px;background:transparent;color:#b91c1c;border:1px solid #f87171;border-radius:6px;font-size:.73rem;cursor:pointer;font-weight:600">Desbloquear</button>'
        + '</div>';
    }).join('');
  });
};

window.blockPlate = function() {
  var input = document.getElementById('block-plate-input');
  var pid = input ? input.value.trim() : '';
  if (!pid) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Ingresa un ID de placa'); return; }
  db().collection('config').doc('admin_settings').update({
    blockedPlates: firebase.firestore.FieldValue.arrayUnion(pid)
  }).then(function() {
    toast('[NO] Placa ' + pid + ' bloqueada');
    if (input) input.value = '';
    loadSecurityAlerts();
  }).catch(function(e) { toast('âŒ ' + e.message); });
};

window.blockPlateFromAlert = function(pid) {
  if (!pid || !confirm('?Bloquear placa ' + pid + '?')) return;
  db().collection('config').doc('admin_settings').update({
    blockedPlates: firebase.firestore.FieldValue.arrayUnion(pid)
  }).then(function() { toast('[NO] Placa bloqueada'); loadSecurityAlerts(); });
};

window.unblockPlate = function(pid) {
  db().collection('config').doc('admin_settings').update({
    blockedPlates: firebase.firestore.FieldValue.arrayRemove(pid)
  }).then(function() { toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Placa desbloqueada'); loadSecurityAlerts(); });
};

window.dismissAlert = function(docId) {
  db().collection('securityAlerts').doc(docId).delete()
    .then(function() { toast('Alerta descartada'); loadSecurityAlerts(); });
};

/* ============================================================
   CONTENIDO INDEX ADMIN
   ============================================================ */
window.loadIndexContent = function() {
  db().collection('config').doc('index_content').get().then(function(doc) {
    var d = doc.exists ? doc.data() : {};
    var set = function(id, val) { var el = document.getElementById(id); if (el) el.value = val || ''; };
    set('idx-headline', d.headline);
    set('idx-subheadline', d.subheadline);
    set('banner-message', d.bannerMessage);
    var bannerActive = document.getElementById('banner-active');
    if (bannerActive) bannerActive.checked = !!d.bannerActive;
    var bannerColor = document.getElementById('banner-color');
    if (bannerColor && d.bannerColor) bannerColor.value = d.bannerColor;
  });

  /* Load products for featured selector */
  db().collection('products').where('active','==',true).get().then(function(snap) {
    var featuredListEl = document.getElementById('featured-products-list');
    if (!featuredListEl) return;
    db().collection('config').doc('index_content').get().then(function(cfgDoc) {
      var featured = cfgDoc.exists && cfgDoc.data().featuredProducts ? cfgDoc.data().featuredProducts : [];
      if (snap.empty) { featuredListEl.innerHTML = '<p style="color:#6C7297;font-size:.85rem">No hay productos activos aun.</p>'; return; }
      var html = '<div style="display:grid;gap:8px">';
      snap.forEach(function(doc) {
        var d = doc.data(), id = doc.id;
        var isFeat = featured.indexOf(id) > -1;
        html += '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:' + (isFeat ? '#f0f3ff' : '#fff') + ';border:1.5px solid ' + (isFeat ? '#4552CC' : 'rgba(69,82,204,.15)') + ';border-radius:10px;cursor:pointer">'
          + '<input type="checkbox" name="featured-product" value="' + esc(id) + '" ' + (isFeat ? 'checked' : '') + ' style="accent-color:#4552CC;width:16px;height:16px">'
          + '<span style="font-size:.88rem;font-weight:600;color:#1E255E">' + esc(d.name) + '</span>'
          + '<span style="margin-left:auto;font-size:.78rem;color:#6C7297">$' + (d.priceUSD || 0).toFixed(2) + '</span>'
          + '</label>';
      });
      html += '</div>';
      featuredListEl.innerHTML = html;
    });
  });
};

window.saveIndexContent = function() {
  var headline = (document.getElementById('idx-headline') || {}).value || '';
  var subheadline = (document.getElementById('idx-subheadline') || {}).value || '';
  var bannerActive = (document.getElementById('banner-active') || {}).checked || false;
  var bannerMessage = (document.getElementById('banner-message') || {}).value || '';
  var bannerColor = (document.getElementById('banner-color') || {}).value || '#4552CC';
  db().collection('config').doc('index_content').set({
    headline: headline.trim(), subheadline: subheadline.trim(),
    bannerActive: bannerActive, bannerMessage: bannerMessage.trim(), bannerColor: bannerColor,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).then(function() { toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Contenido guardado'); })
    .catch(function(e) { toast('âŒ ' + e.message); });
};

window.saveFeaturedProducts = function() {
  var boxes = document.querySelectorAll('input[name="featured-product"]:checked');
  var ids = [];
  boxes.forEach(function(b) { ids.push(b.value); });
  if (ids.length > 4) { toast('<i class="ri-alert-line" style="color:#E74C3C;"></i> Maximo 4 productos destacados'); return; }
  db().collection('config').doc('index_content').set({ featuredProducts: ids }, { merge: true })
    .then(function() { toast('<i class="ri-check-line" style="color:#2ECC71;"></i>  Destacados guardados (' + ids.length + ')'); })
    .catch(function(e) { toast('âŒ ' + e.message); });
};

/* ============================================================
   PC_Themes -- Sistema de temas para perfiles de mascotas
   ============================================================ */
window.PC_Themes = (function() {
  'use strict';

  var THEMES = {
    neutro: {
      id: 'neutro',
      name: 'Neutro',
      emoji: '[SPARKLE]',
      heroBg: 'linear-gradient(135deg,#4552CC 0%,#3A45B0 100%)',
      heroAccent: '#51CBF5',
      cardBg: '#FFFFFF',
      statusBadgeBg: '#4552CC',
      avatarBorder: '#4552CC',
      chipBorder: '#4552CC',
      textColor: '#1E255E'
    },
    princesa: {
      id: 'princesa',
      name: 'Princesa',
      emoji: '[CROWN]',
      heroBg: 'linear-gradient(135deg,#C2185B 0%,#E91E8C 60%,#F48FB1 100%)',
      heroAccent: '#F8BBD9',
      cardBg: '#FFF5F9',
      statusBadgeBg: '#C2185B',
      avatarBorder: '#E91E8C',
      chipBorder: '#E91E8C',
      textColor: '#880E4F'
    },
    campeon: {
      id: 'campeon',
      name: 'Campeon',
      emoji: '†',
      heroBg: 'linear-gradient(135deg,#1565C0 0%,#1976D2 60%,#42A5F5 100%)',
      heroAccent: '#90CAF9',
      cardBg: '#F5F9FF',
      statusBadgeBg: '#1565C0',
      avatarBorder: '#1976D2',
      chipBorder: '#1976D2',
      textColor: '#0D47A1'
    },
    selvatico: {
      id: 'selvatico',
      name: 'Selvatico',
      emoji: '[GLOBE]?',
      heroBg: 'linear-gradient(135deg,#1B5E20 0%,#2E7D32 60%,#66BB6A 100%)',
      heroAccent: '#A5D6A7',
      cardBg: '#F5FFF6',
      statusBadgeBg: '#2E7D32',
      avatarBorder: '#388E3C',
      chipBorder: '#388E3C',
      textColor: '#1B5E20'
    },
    galaxia: {
      id: 'galaxia',
      name: 'Galaxia',
      emoji: '[NIGHT]',
      heroBg: 'linear-gradient(135deg,#0D0221 0%,#1A0533 50%,#4A148C 100%)',
      heroAccent: '#CE93D8',
      cardBg: '#FAF5FF',
      statusBadgeBg: '#4A148C',
      avatarBorder: '#7B1FA2',
      chipBorder: '#7B1FA2',
      textColor: '#1A0533'
    },
    tropical: {
      id: 'tropical',
      name: 'Tropical',
      emoji: '[FLOWER]',
      heroBg: 'linear-gradient(135deg,#E65100 0%,#F57C00 60%,#FFA726 100%)',
      heroAccent: '#FFCC80',
      cardBg: '#FFFAF5',
      statusBadgeBg: '#E65100',
      avatarBorder: '#F57C00',
      chipBorder: '#F57C00',
      textColor: '#BF360C'
    }
  };

  function apply(themeId) {
    var t = THEMES[themeId] || THEMES['neutro'];

    /* Hero gradient */
    var hero = document.querySelector('.pet-hero');
    if (hero) hero.style.background = t.heroBg;

    /* Status badge */
    document.querySelectorAll('.pet-status-badge').forEach(function(el) {
      el.style.background = t.statusBadgeBg;
    });

    /* Avatar border */
    var avatar = document.querySelector('.pet-avatar');
    if (avatar) {
      avatar.style.borderColor = t.avatarBorder;
      avatar.style.boxShadow = '0 0 0 4px ' + t.avatarBorder + '33';
    }

    /* Chip borders */
    document.querySelectorAll('.pet-chip').forEach(function(el) {
      el.style.borderColor = t.chipBorder + '44';
      el.style.color = t.textColor;
    });

    /* iOS Safari theme-color meta */
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.statusBadgeBg);

    /* Store on body for CSS consumers */
    document.body.setAttribute('data-pet-theme', themeId);
  }

  function renderPicker(containerId, currentTheme, onSelect) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:4px 0">';
    Object.keys(THEMES).forEach(function(key) {
      var t = THEMES[key];
      var active = (key === (currentTheme || 'neutro'));
      html += '<div onclick="PC_Themes.select(\'' + key + '\',\'' + containerId + '\',__PC_ThemeCb)" '
        + 'style="cursor:pointer;border-radius:16px;overflow:hidden;border:3px solid '
        + (active ? t.avatarBorder : 'transparent')
        + ';transition:border-color .2s;background:' + t.cardBg + ';text-align:center;padding:0">'
        + '<div style="height:54px;background:' + t.heroBg.replace(/"/g,"'") + ';display:flex;align-items:center;justify-content:center;font-size:1.6rem">'
        + t.emoji + '</div>'
        + '<div style="padding:8px 4px;font-size:.78rem;font-weight:700;color:' + t.textColor + '">' + t.name + '</div>'
        + '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
    window.__PC_ThemeCb = onSelect || function(){};
  }

  function select(themeId, containerId, cb) {
    apply(themeId);
    /* Update picker selection ring */
    var t = THEMES[themeId] || THEMES['neutro'];
    var el = document.getElementById(containerId);
    if (el) {
      el.querySelectorAll('div[onclick]').forEach(function(card) {
        var isActive = card.getAttribute('onclick').indexOf("'" + themeId + "'") > -1;
        card.style.borderColor = isActive ? t.avatarBorder : 'transparent';
      });
    }
    if (typeof cb === 'function') cb(themeId);
    if (typeof window.__PC_ThemeCb === 'function') window.__PC_ThemeCb(themeId);
  }

/* -- Auto-restore de sesion al recargar (F5) ---------------------------------
   dashboard.html ya mostro el div #dashboard. Aqui completamos la restauracion:
   seteamos _dash.currentUser e iniciamos todos los modulos. */
(function() {
  var auth = localStorage.getItem('pc_auth');
  var dashEl = document.getElementById('dashboard');
  if (!auth || !dashEl || dashEl.style.display === 'none') return;
  _dash.currentUser = (auth === 'master' || auth === 'admin')
    ? { name:'Admin', role:'admin', permissions:{ dashboard:true, register:true, pets:true, vets:true, shelters:true, settings:true } }
    : { name:'Usuario', role: auth, permissions:{ dashboard:true, register:true, pets:true } };
  try { applyPermissions(); } catch(e) {}
  initDashboard();
})();

  return { THEMES: THEMES, apply: apply, renderPicker: renderPicker, select: select };
})();