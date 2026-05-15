
(function() {
  'use strict';

  /* ── Restaurar sesión al recargar (F5/cierre de pestaña) ── */
  /* petcingo.js se encarga de initDashboard y todos los módulos */
  (function() {
    if (localStorage.getItem('pc_auth')) {
      var loginEl = document.getElementById('login-screen');
      var dashEl  = document.getElementById('dashboard');
      if (loginEl) loginEl.style.display = 'none';
      if (dashEl)  dashEl.style.display  = 'block';
    }
  })();

  function escFn(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.toggleSidebar = function() {
    var s = document.getElementById('sidebar');
    var o = document.getElementById('sidebar-overlay');
    if (s) s.classList.toggle('open');
    if (o) o.classList.toggle('show');
  };

  window.closeSidebar = function() {
    var s = document.getElementById('sidebar');
    var o = document.getElementById('sidebar-overlay');
    if (s) s.classList.remove('open');
    if (o) o.classList.remove('show');
  };

  window.toggleNavMenu = function() {
    var m = document.getElementById('nav-mobile');
    if (m) m.classList.toggle('open');
  };

  window.doLogout = function() {
    document.getElementById('dashboard').style.display    = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    var inp = document.getElementById('login-pass');
    if (inp) { inp.value = ''; inp.focus(); }
    localStorage.removeItem('pc_auth');
    sessionStorage.removeItem('pc_user');
    sessionStorage.removeItem('pc_user_name');
  };

  /* ── exportFullBackup inline fallback (also defined in petcingo.js) ── */
  window.exportFullBackup = function() {
    /* Prefer the richer version from petcingo.js if loaded */
    if (window._petcingoExportFullBackup) { window._petcingoExportFullBackup(); return; }
    var COLS = ['pets','users','veterinarias','shelters','scan_logs','logs','staff'];
    var backup = { version:1, exportedAt: new Date().toISOString(), data:{} };
    var btn = document.getElementById('btn-full-backup');
    if(btn){btn.disabled=true;btn.innerHTML='<i class="ri-loader-4-line"></i> Exportando…';}
    var db2 = db();
    if (!db2) { alert('Error: Firebase no está listo.'); if(btn){btn.disabled=false;btn.innerHTML='<i class="ri-download-cloud-line"></i> Exportar Backup Completo';} return; }
    var promises = COLS.map(function(col) {
      return db2.collection(col).get().then(function(snap){
        backup.data[col]=[];
        snap.forEach(function(doc){
          var d=doc.data();
          Object.keys(d).forEach(function(k){ if(d[k]&&typeof d[k].toDate==='function') d[k]=d[k].toDate().toISOString(); });
          backup.data[col].push(Object.assign({_id:doc.id},d));
        });
      }).catch(function(){backup.data[col]=[];});
    });
    Promise.all(promises).then(function(){
      var json=JSON.stringify(backup,null,2);
      var blob=new Blob([json],{type:'application/json'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');a.href=url;
      a.download='petcingo-backup-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
      if(btn){btn.disabled=false;btn.innerHTML='<i class="ri-download-cloud-line"></i> Exportar Backup Completo';}
    });
  };

  window.importFullBackup = function(event) {
    var file = event.target.files[0];
    /* Reset input so the same file can be re-selected */
    event.target.value = '';
    if (!file) return;
    if (!confirm('ATENCIÓN: Esto importará todos los datos del backup a Firebase.\nRegistros existentes con el mismo ID quedarán sobreescritos.\n\n¿Deseas continuar?')) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var backup = JSON.parse(e.target.result);
        if (!backup || !backup.data) throw new Error('Formato de backup inválido');
        var db2 = db(); if (!db2) { if (typeof toast === 'function') toast('Error: Firebase no listo.'); return; }
        var collections = Object.keys(backup.data);
        var totalDocs = 0;
        var written   = 0;
        var errors    = 0;
        collections.forEach(function(col) {
          var docs = backup.data[col];
          if (!Array.isArray(docs)) return;
          totalDocs += docs.length;
          docs.forEach(function(d) {
            var docId = d._id;
            var payload = Object.assign({}, d);
            delete payload._id;
            /* Convert ISO timestamp strings back to Firestore Timestamps */
            Object.keys(payload).forEach(function(k) {
              var v = payload[k];
              if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
                try { payload[k] = firebase.firestore.Timestamp.fromDate(new Date(v)); } catch(_) {}
              }
            });
            var op = docId
              ? db2.collection(col).doc(docId).set(payload, { merge: true })
              : db2.collection(col).add(payload);
            op.then(function() {
              written++;
              if (written + errors === totalDocs && typeof toast === 'function') {
                toast('Importación completada: ' + written + ' documentos en ' + collections.length + ' colecciones.' + (errors ? ' (' + errors + ' errores)' : ''));
              }
            }).catch(function() { errors++; });
          });
        });
        if (totalDocs === 0 && typeof toast === 'function') toast('El backup está vacío.');
      } catch(err) {
        if (typeof toast === 'function') toast('Error al leer el archivo: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  window.purgeScanLogs = function() {
    if (typeof _purgeScanLogsNative === 'function') { _purgeScanLogsNative(); return; }
    var inp=document.getElementById('cfg-scan-days');
    var days=inp?parseInt(inp.value,10):90;
    if(!days||days<7)days=90;
    if(!confirm('¿Eliminar escaneos con más de '+days+' días?'))return;
    var cutoff=new Date(Date.now()-days*24*60*60*1000);
    var db2=(typeof db==='function')?db():null;
    if(!db2){alert('Error: Firebase no listo.');return;}
    db2.collection('scan_logs').where('scannedAt','<',cutoff).get()
      .then(function(snap){
        if(snap.empty){alert('No hay escaneos tan antiguos.');return;}
        var batch=db2.batch();
        snap.forEach(function(doc){batch.delete(doc.ref);});
        return batch.commit().then(function(){alert('✅ '+snap.size+' escaneos eliminados.');});
      }).catch(function(e){alert('Error: '+e.message);});
  };

  /* ═══════════════ AUDITORÍA: clearOldLogs corregido ═══════════════ */
  window.clearOldLogs = function() {
    var daysInput = document.getElementById('cfg-log-days');
    var days = daysInput ? parseInt(daysInput.value, 10) : 30;
    if (!days || days < 1) days = 30;
    if (!confirm('¿Eliminar logs con más de ' + days + ' días?')) return;
    var cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    var db2 = db(); if (!db2) return;
    function deleteBatch() {
      db2.collection('logs').where('timestamp', '<', cutoff).limit(500).get()
        .then(function(snap) {
          if (snap.empty) { if (typeof toast === 'function') toast('Logs antiguos eliminados.'); return; }
          var batch = db2.batch();
          snap.forEach(function(doc) { batch.delete(doc.ref); });
          batch.commit().then(function() {
            if (typeof toast === 'function') toast('Eliminados ' + snap.size + ' logs, continuando…');
            deleteBatch();
          }).catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
        }).catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
    }
    deleteBatch();
  };

  /* ═══════════════ PEDIDOS ═══════════════ */
  var _ordersCache = [];
  window._ordersListenerActive = false;

  

      var html = '';
    orders.forEach(function(o) {
      var d = o.data;
      var status = d.status || 'pendiente';
      var isUrgent = d.urgent === true;
      var rowClass = isUrgent ? 'tr-urgent' : '';
      var date = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
      var nextStatus = getNextOrderStatus(status);
      var nextLabel = nextStatus !== status ? nextStatus : '';
      html += '<tr class="' + rowClass + '">' +
        '<td><strong>' + escFn(o.id) + '</strong></td>' +
        '<td>' + escFn(d.buyerName || '—') + '<br><small style="color:#757575;">' + escFn(d.phone || '') + '</small></td>' +
        '<td>' + escFn(d.channel || '—') + '</td>' +
        '<td>' + escFn(d.shippingType || '—') + '<br><small style="color:#757575;">' + escFn(d.department || '') + '</small></td>' +
        '<td><span class="status-badge ' + status + '">' + status + '</span></td>' +
        '<td>' + date + '</td>' +
        '<td style="white-space:nowrap;">' +
          (nextLabel ? '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="changeOrderStatus(\'' + o.id + '\',\'' + nextStatus + '\')" title="Avanzar a ' + nextLabel + '"><i class="ri-arrow-right-line"></i></button> ' : '') +
          '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="printGuide(\'' + o.id + '\')" title="Imprimir guía"><i class="ri-printer-line"></i></button> ' +
          '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" style="color:' + (isUrgent ? '#f44336' : '#757575') + '" onclick="toggleUrgent(\'' + o.id + '\',' + isUrgent + ')" title="' + (isUrgent ? 'Quitar urgente' : 'Marcar urgente') + '"><i class="ri-flashlight-line"></i></button>' +
        '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
    var cnt = document.getElementById('orders-count');
    if (cnt) cnt.textContent = orders.length + ' pedido' + (orders.length !== 1 ? 's' : '');
  }

  
  

  





  window.openVerifyModal = function(orderId) {
    var db2 = db();
    db2.collection('orders').doc(orderId).get().then(function(doc) {
      if (!doc.exists) { toast('Pedido no encontrado.'); return; }
      var d = doc.data();
      var modal = document.getElementById('verify-payment-modal');
      var content = document.getElementById('verify-modal-content');
      var actions = document.getElementById('verify-modal-actions');
      
      var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Comprador</span><br><strong>' + escFn(d.buyer ? d.buyer.name : d.buyerName || '—') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Telefono</span><br><strong>' + escFn(d.buyer ? d.buyer.phone : d.phone || '—') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Email</span><br><strong>' + escFn(d.buyer ? d.buyer.email : d.email || '—') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Plan</span><br><strong>' + escFn(d.planName || '—') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Total</span><br><strong style="color:#4552CC;">' + (d.total || 0) + ' Bs</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Metodo</span><br><strong>' + escFn(d.paymentMethod || '—') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Direccion</span><br><strong>' + escFn(d.buyer ? d.buyer.address : d.address || '—') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Estado</span><br><span class="status-badge ' + (d.status || 'pending') + '">' + (d.status || 'pending').toUpperCase() + '</span></div>';
      html += '</div>';
      
      if (d.receiptUrl) {
        html += '<div style="margin-bottom:16px;">';
        html += '<span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;display:block;margin-bottom:8px;">Comprobante de pago</span>';
        html += '<a href="' + d.receiptUrl + '" target="_blank">';
        html += '<img src="' + d.receiptUrl + '" style="width:100%;max-height:300px;object-fit:contain;border-radius:12px;border:1px solid #E0E0E0;cursor:pointer;" alt="Comprobante" onerror="this.style.display=\'none\'">';
        html += '</a>';
        html += '<a href="' + d.receiptUrl + '" target="_blank" style="display:block;text-align:center;margin-top:6px;font-size:0.8rem;color:#4552CC;font-weight:600;">Ver imagen completa</a>';
        html += '</div>';
      }
      
      if (d.activationCode) {
        html += '<div style="background:#EEF1FB;padding:10px 14px;border-radius:10px;margin-bottom:12px;text-align:center;">';
        html += '<span style="font-size:0.7rem;color:#9E9E9E;">Codigo de activacion</span><br>';
        html += '<strong style="font-family:monospace;font-size:1.2rem;color:#4552CC;">' + d.activationCode + '</strong>';
        html += '</div>';
      }
      
      content.innerHTML = html;
      
      var btnsHtml = '';
      if (d.status === 'pending') {
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--success" style="flex:1;" onclick="verifyOrderApprove(\'' + orderId + '\')"><i class="ri-check-line"></i> Aceptar pago</button>';
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--danger" style="flex:1;" onclick="verifyOrderReject(\'' + orderId + '\')"><i class="ri-close-line"></i> Rechazar</button>';
      } else if (d.status === 'confirmed') {
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--primary" style="flex:1;" onclick="markAsProcessing(\'' + orderId + '\')"><i class="ri-box-3-line"></i> Marcar en preparacion</button>';
      } else if (d.status === 'processing') {
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--primary" style="flex:1;" onclick="openShippingForm(\'' + orderId + '\')"><i class="ri-truck-line"></i> Registrar envio</button>';
      } else if (d.status === 'shipped') {
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--success" style="flex:1;" onclick="markAsDelivered(\'' + orderId + '\')"><i class="ri-check-double-line"></i> Marcar entregado</button>';
      }
      actions.innerHTML = btnsHtml;
      
      modal.style.display = 'flex';
    }).catch(function(e) { toast('Error: ' + e.message); });
  };

  window.closeVerifyModal = function() {
    var m = document.getElementById('verify-payment-modal');
    if(m) m.style.display = 'none';
  };

  window.verifyOrderApprove = function(orderId) {
    if (!confirm('Confirmar pago y generar codigo de activacion?')) return;
    var db2 = db();
    var batch = db2.batch();
    var activationCode = genActivationCode();
    
    batch.update(db2.collection('orders').doc(orderId), {
      status: 'confirmed',
      activationCode: activationCode,
      verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    batch.set(db2.collection('pets').doc(activationCode), {
      activationCode: activationCode,
      status: 'reserved',
      orderId: orderId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    batch.commit().then(function() {
      closeVerifyModal();
      toast('Pago aceptado. Codigo: ' + activationCode);
      loadOrders();
    }).catch(function(e) { toast('Error: ' + e.message); });
  };

  window.verifyOrderReject = function(orderId) {
    var reason = prompt('Motivo del rechazo (opcional):');
    var db2 = db();
    db2.collection('orders').doc(orderId).update({
      status: 'rejected',
      rejectReason: reason || '',
      verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      closeVerifyModal();
      toast('Pago rechazado');
      loadOrders();
    }).catch(function(e) { toast('Error: ' + e.message); });
  };

  function genActivationCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  window.markAsProcessing = function(orderId) {
    var db2 = db();
    db2.collection('orders').doc(orderId).update({
      status: 'processing',
      processingAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      closeVerifyModal();
      toast('Pedido en preparacion');
      loadOrders();
    });
  };

  window.openShippingForm = function(orderId) {
    var tracking = prompt('Numero de guia / tracking:');
    if (!tracking) return;
    var db2 = db();
    db2.collection('orders').doc(orderId).update({
      status: 'shipped',
      trackingNumber: tracking,
      shippedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      closeVerifyModal();
      toast('Envio registrado: ' + tracking);
      loadOrders();
    });
  };

  window.markAsDelivered = function(orderId) {
    if (!confirm('Confirmar entrega del pedido?')) return;
    var db2 = db();
    db2.collection('orders').doc(orderId).update({
      status: 'delivered',
      deliveredAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      closeVerifyModal();
      toast('Pedido entregado');
      loadOrders();
    });
  };

  window.printShippingGuide = function(orderId) {
    var order = _ordersCache.find(function(o) { return o.id === orderId; });
    if (!order) { toast('Pedido no encontrado.'); return; }
    var d = order.data;
    var buyerName = d.buyer ? d.buyer.name : d.buyerName;
    var buyerPhone = d.buyer ? d.buyer.phone : d.phone;
    var buyerAddress = d.buyer ? d.buyer.address : d.address;
    var buyerNotes = d.buyer ? d.buyer.notes : d.notes;

    var win = window.open('', '_blank', 'width=800,height=600');
    win.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Guia de Envio - ' + orderId + '</title>');
    win.document.write('<link href="https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">');
    win.document.write('<style>body{font-family:"Plus Jakarta Sans",sans-serif;padding:40px;color:#212121;}');
    win.document.write('h1{font-family:"Sora",sans-serif;font-size:1.5rem;margin-bottom:4px;}');
    win.document.write('.meta{color:#757575;font-size:0.85rem;margin-bottom:20px;border-bottom:2px solid #4552CC;padding-bottom:12px;}');
    win.document.write('table{width:100%;border-collapse:collapse;margin:16px 0;}');
    win.document.write('td,th{border:1px solid #E0E0E0;padding:10px 14px;font-size:0.88rem;text-align:left;}');
    win.document.write('th{background:#F8F9FB;font-weight:700;width:30%;}');
    win.document.write('.footer{margin-top:30px;text-align:center;font-size:0.75rem;color:#9E9E9E;border-top:1px solid #E0E0E0;padding-top:12px;}');
    win.document.write('@media print{body{padding:20px;}}</style></head><body>');
    win.document.write('<h1>Guia de Envio - Petcingo</h1>');
    win.document.write('<div class="meta">Pedido: <strong>' + orderId + '</strong> | Fecha: ' + new Date().toLocaleDateString('es-BO', {day:'2-digit',month:'long',year:'numeric'}) + '</div>');
    win.document.write('<table>');
    win.document.write('<tr><th>Comprador</th><td>' + escFn(buyerName || '—') + '</td></tr>');
    win.document.write('<tr><th>Telefono</th><td>' + escFn(buyerPhone || '—') + '</td></tr>');
    win.document.write('<tr><th>Direccion</th><td>' + escFn(buyerAddress || '—') + '</td></tr>');
    win.document.write('<tr><th>Plan</th><td>' + escFn(d.planName || '—') + '</td></tr>');
    win.document.write('<tr><th>Tipo de envio</th><td>' + escFn(d.shippingType || d.deliveryType || '—') + '</td></tr>');
    win.document.write('<tr><th>Tracking</th><td>' + escFn(d.trackingNumber || '—') + '</td></tr>');
    win.document.write('<tr><th>Notas</th><td>' + escFn(buyerNotes || '—') + '</td></tr>');
    win.document.write('</table>');
    win.document.write('<div class="footer">Petcingo — Sistema de Identificacion de Mascotas | petcingo.com.bo</div>');
    win.document.write('<script>window.onload=function(){window.print();};<\/script></body></html>');
    win.document.close();
  };

  function updateOrderStats() {
    var p=0, c=0, e=0, newO=0;
    _ordersCache.forEach(function(o) {
      if (o.data.status === 'pending') { p++; newO++; }
      if (o.data.status === 'processing') c++;
      if (o.data.status === 'delivered') e++;
    });
    var elP = document.getElementById('stat-pending');
    var elC = document.getElementById('stat-processing');
    var elE = document.getElementById('stat-delivered');
    if(elP) elP.textContent = p;
    if(elC) elC.textContent = c;
    if(elE) elE.textContent = e;
    
    // Alerta de nuevos pedidos
    if (newO > 0) {
      if (typeof showDashAlert === 'function') {
        showDashAlert('Tienes ' + newO + ' pedido(s) pendiente(s) de verificacion.', 'warning', 'ri-shopping-bag-line');
      }
    }
  }

  window.filterOrders = function() {
    var status = document.getElementById('order-filter-status').value.toLowerCase();
    var channel = document.getElementById('order-filter-channel').value.toLowerCase();
    var dest = document.getElementById('order-filter-destino').value.toLowerCase();
    var search = (document.getElementById('order-filter-search') ? document.getElementById('order-filter-search').value.toLowerCase() : '');
    var urgent = document.getElementById('order-filter-urgent').checked;
    
    var filtered = _ordersCache.filter(function(o) {
      var d = o.data;
      var s = d.status || 'pending';
      var c = (d.channel || '').toLowerCase();
      var de = (d.department || d.shippingType || '').toLowerCase();
      var bn = (d.buyerName || (d.buyer ? d.buyer.name : '') || '').toLowerCase();
      var code = (d.activationCode || '').toLowerCase();
      
      if (status && s !== status) return false;
      if (channel && c !== channel) return false;
      if (dest && de.indexOf(dest) === -1) return false;
      if (urgent && d.urgent !== true) return false;
      if (search && bn.indexOf(search) === -1 && code.indexOf(search) === -1) return false;
      
      return true;
    });
    renderOrders(filtered);
  };

  window.loadOrders = function() {
    var db2 = db(); if (!db2) return;
    window._ordersListenerActive = true;
    var tbody = document.getElementById('orders-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div></td></tr>';

    db2.collection('orders').orderBy('createdAt', 'desc').onSnapshot(function(snap) {
      _ordersCache = [];
      snap.forEach(function(doc) { _ordersCache.push({ id: doc.id, data: doc.data() }); });
      updateOrderStats();
      filterOrders();
      updateOrdersBadge();
    }, function(err) {
      console.error('Error loading orders:', err);
      window._ordersListenerActive = false;
      if (tbody) tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Error al cargar pedidos.</div></td></tr>';
    });
  };

  window.renderOrders = function(orders) {
    var tbody = document.getElementById('orders-tbody');
    if (!tbody) return;
    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No hay pedidos registrados.</div></td></tr>';
      return;
    }
    var html = '';
    orders.forEach(function(o) {
      var d = o.data;
      var status = d.status || 'pending';
      var isUrgent = d.urgent === true;
      var rowClass = isUrgent ? 'tr-urgent' : '';
      var date = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
      
      var buyerName = d.buyer ? d.buyer.name : d.buyerName;
      var buyerPhone = d.buyer ? d.buyer.phone : d.phone;

      var acciones = '';
      if (status === 'pending') {
        acciones += '<button class="ptcg-index__btn ptcg-index__btn--success btn-sm" onclick="openVerifyModal(\'' + o.id + '\')"><i class="ri-shield-check-line"></i> Verificar pago</button> ';
      } else {
        acciones += '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="openVerifyModal(\'' + o.id + '\')" title="Ver detalles"><i class="ri-eye-line"></i></button> ';
      }
      
      if (status !== 'pending' && status !== 'rejected') {
        acciones += '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="printShippingGuide(\'' + o.id + '\')" title="Imprimir guía"><i class="ri-printer-line"></i></button> ';
      }
      
      acciones += '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" style="color:' + (isUrgent ? '#f44336' : '#757575') + '" onclick="toggleUrgent(\'' + o.id + '\',' + isUrgent + ')" title="' + (isUrgent ? 'Quitar urgente' : 'Marcar urgente') + '"><i class="ri-flashlight-line"></i></button>';

      var trk = d.trackingNumber ? '<br><small style="color:#4552CC;">Trk: ' + escFn(d.trackingNumber) + '</small>' : '';
      var actCode = d.activationCode ? '<br><small style="color:#2ECC71;font-family:monospace;">Cod: ' + escFn(d.activationCode) + '</small>' : '';

      html += '<tr class="' + rowClass + '">' +
        '<td><strong>' + escFn(o.id.substring(0,8)) + '...</strong>' + actCode + '</td>' +
        '<td>' + escFn(buyerName || '—') + '<br><small style="color:#757575;">' + escFn(buyerPhone || '') + '</small></td>' +
        '<td>' + escFn(d.channel || 'Directo') + '</td>' +
        '<td>' + escFn(d.shippingType || d.deliveryType || '—') + '<br><small style="color:#757575;">' + escFn(d.department || '') + '</small>' + trk + '</td>' +
        '<td><span class="status-badge ' + status + '">' + status.toUpperCase() + '</span></td>' +
        '<td>' + date + '</td>' +
        '<td style="white-space:nowrap;">' + acciones + '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
  };



/* Delegado de clic: fila de Mascotas abre el modal de detalle */
document.addEventListener('click', function(e) {
  var sec = document.getElementById('sec-pets');
  if (!sec || !sec.classList.contains('active')) return;
  var row = e.target.closest('#pets-tbody tr');
  if (!row) return;
  if (e.target.closest('button') || e.target.closest('a')) return;
  var firstCell = row.querySelector('td.td-id');
  var code = firstCell ? firstCell.textContent.trim() : '';
  if (code && code !== '—' && typeof showPetModal === 'function') showPetModal(code);
});


/* MutationObserver: botones de soporte admin en tabla de mascotas (fallback) */
(function() {
  function addSupportButtons() {
    var tbody = document.getElementById('pets-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(function(row) {
      if (row.querySelector('.soporte-btns')) return;
      var codeCell = row.querySelector('td.td-id');
      if (!codeCell) return;
      var code = codeCell.textContent.trim();
      if (!code || code === '—') return;
      var actionsCell = row.querySelector('td:last-child');
      if (!actionsCell) return;
      var span = document.createElement('span');
      span.className = 'soporte-btns';
      span.style.cssText = 'display:inline-flex;gap:4px;margin-left:6px;';
      var safeCode = code.replace(/'/g, "\\'");
      span.innerHTML =
        '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="copyPetCode(\'' + safeCode + '\')" title="Copiar código"><i class="ri-file-copy-line"></i></button>' +
        '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="sendPasswordReset(\'' + safeCode + '\')" title="Recuperar contraseña"><i class="ri-key-2-line"></i></button>';
      actionsCell.appendChild(span);
    });
  }

  var observer = new MutationObserver(addSupportButtons);
  function attachObserver() {
    var tbody = document.getElementById('pets-tbody');
    if (tbody) { observer.observe(tbody, { childList: true, subtree: true }); return; }
    setTimeout(attachObserver, 800);
  }
  attachObserver();

  var _origShowSection = window.showSection;
  if (typeof _origShowSection === 'function') {
    window.showSection = function(name, btn) {
      _origShowSection.call(window, name, btn);
      if (name === 'pets') setTimeout(addSupportButtons, 400);
    };
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      if (typeof window.showSection === 'function') {
        var orig = window.showSection;
        window.showSection = function(name, btn) {
          orig.call(window, name, btn);
          if (name === 'pets') setTimeout(addSupportButtons, 400);
        };
      }
    });
  }
})();


/* ── Limpiar "Petcingo Directo" y prefijos del selector de clientes ── */
setTimeout(function cleanRegSeller() {
  var sel = document.getElementById('reg-seller-select');
  if (!sel || sel.options.length <= 1) { setTimeout(cleanRegSeller, 500); return; }
  for (var i = 1; i < sel.options.length; i++) {
    var txt = sel.options[i].textContent || sel.options[i].innerText;
    txt = txt.replace(/^Petcingo\s*/i, '').replace(/^[A-Z]{2,4}-/, '').trim();
    sel.options[i].textContent = txt;
  }
  /* Limpiar también futuras opciones que petcingo.js pueda agregar */
  new MutationObserver(function() {
    for (var j = 1; j < sel.options.length; j++) {
      var t = sel.options[j].textContent || sel.options[j].innerText;
      t = t.replace(/^Petcingo\s*/i, '').replace(/^[A-Z]{2,4}-/, '').trim();
      sel.options[j].textContent = t;
    }
  }).observe(sel, { childList: true });
}, 1000);

