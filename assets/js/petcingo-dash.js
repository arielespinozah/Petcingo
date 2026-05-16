(function() {
  'use strict';

  /*  Restaurar sesin al recargar (F5/cierre de pestaa)  */
  /* petcingo.js se encarga de initDashboard y todos los mdulos */
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

  /* doLogout: defer to petcingo.js which also clears _dash state.
     This is a safe fallback only if petcingo.js hasn't loaded yet. */
  if (typeof window.doLogout !== 'function') {
    window.doLogout = function() {
      document.getElementById('dashboard').style.display    = 'none';
      document.getElementById('login-screen').style.display = 'flex';
      var inp = document.getElementById('login-pass');
      if (inp) { inp.value = ''; inp.focus(); }
      localStorage.removeItem('pc_auth');
      sessionStorage.removeItem('pc_user');
      sessionStorage.removeItem('pc_user_name');
    };
  }

  /*  exportFullBackup inline fallback (also defined in petcingo.js)  */
  window.exportFullBackup = function() {
    /* Prefer the richer version from petcingo.js if loaded */
    if (window._petcingoExportFullBackup) { window._petcingoExportFullBackup(); return; }
    var COLS = ['pets','users','veterinarias','shelters','scan_logs','logs','staff'];
    var backup = { version:1, exportedAt: new Date().toISOString(), data:{} };
    var btn = document.getElementById('btn-full-backup');
    if(btn){btn.disabled=true;btn.innerHTML='<i class="ri-loader-4-line"></i> Exportando';}
    var db2 = db();
    if (!db2) { alert('Error: Firebase no esti listo.'); if(btn){btn.disabled=false;btn.innerHTML='<i class="ri-download-cloud-line"></i> Exportar Backup Completo';} return; }
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
    if (!confirm('ATENCIN: Esto importari todos los datos del backup a Firebase.\nRegistros existentes con el mismo ID quedarin sobreescritos.\n\nDeseas continuar?')) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var backup = JSON.parse(e.target.result);
        if (!backup || !backup.data) throw new Error('Formato de backup invilido');
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
                toast('Importacin completada: ' + written + ' documentos en ' + collections.length + ' colecciones.' + (errors ? ' (' + errors + ' errores)' : ''));
              }
            }).catch(function() { errors++; });
          });
        });
        if (totalDocs === 0 && typeof toast === 'function') toast('El backup esti vaco.');
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
    if(!confirm('Eliminar escaneos con mis de '+days+' das?'))return;
    var cutoff=new Date(Date.now()-days*24*60*60*1000);
    var db2=(typeof db==='function')?db():null;
    if(!db2){alert('Error: Firebase no listo.');return;}
    db2.collection('scan_logs').where('scannedAt','<',cutoff).get()
      .then(function(snap){
        if(snap.empty){alert('No hay escaneos tan antiguos.');return;}
        var batch=db2.batch();
        snap.forEach(function(doc){batch.delete(doc.ref);});
        return batch.commit().then(function(){alert('a '+snap.size+' escaneos eliminados.');});
      }).catch(function(e){alert('Error: '+e.message);});
  };

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE AUDITORiA: clearOldLogs corregido oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */
  window.clearOldLogs = function() {
    var daysInput = document.getElementById('cfg-log-days');
    var days = daysInput ? parseInt(daysInput.value, 10) : 30;
    if (!days || days < 1) days = 30;
    if (!confirm('Eliminar logs con mis de ' + days + ' das?')) return;
    var cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    var db2 = db(); if (!db2) return;
    function deleteBatch() {
      db2.collection('logs').where('timestamp', '<', cutoff).limit(500).get()
        .then(function(snap) {
          if (snap.empty) { if (typeof toast === 'function') toast('Logs antiguos eliminados.'); return; }
          var batch = db2.batch();
          snap.forEach(function(doc) { batch.delete(doc.ref); });
          batch.commit().then(function() {
            if (typeof toast === 'function') toast('Eliminados ' + snap.size + ' logs, continuando');
            deleteBatch();
          }).catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
        }).catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
    }
    deleteBatch();
  };


  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE PEDIDOS oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */
  var _ordersCache = [];
  window._ordersListenerActive = false;



  
  

  





  window.openVerifyModal = function(orderId) {
    var db2 = db();
    db2.collection('orders').doc(orderId).get().then(function(doc) {
      if (!doc.exists) { toast('Pedido no encontrado.'); return; }
      var d = doc.data();
      var modal = document.getElementById('verify-payment-modal');
      var content = document.getElementById('verify-modal-content');
      var actions = document.getElementById('verify-modal-actions');
      
      var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Comprador</span><br><strong>' + escFn(d.buyer ? d.buyer.name : d.buyerName || '') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Telefono</span><br><strong>' + escFn(d.buyer ? d.buyer.phone : d.phone || '') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Email</span><br><strong>' + escFn(d.buyer ? d.buyer.email : d.email || '') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Plan</span><br><strong>' + escFn(d.planName || '') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Total</span><br><strong style="color:#4552CC;">' + (d.total || 0) + ' Bs</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Metodo</span><br><strong>' + escFn(d.paymentMethod || '') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;">Direccion</span><br><strong>' + escFn(d.buyer ? d.buyer.address : d.address || '') + '</strong></div>';
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
    win.document.write('<tr><th>Comprador</th><td>' + escFn(buyerName || '') + '</td></tr>');
    win.document.write('<tr><th>Telefono</th><td>' + escFn(buyerPhone || '') + '</td></tr>');
    win.document.write('<tr><th>Direccion</th><td>' + escFn(buyerAddress || '') + '</td></tr>');
    win.document.write('<tr><th>Plan</th><td>' + escFn(d.planName || '') + '</td></tr>');
    win.document.write('<tr><th>Tipo de envio</th><td>' + escFn(d.shippingType || d.deliveryType || '') + '</td></tr>');
    win.document.write('<tr><th>Tracking</th><td>' + escFn(d.trackingNumber || '') + '</td></tr>');
    win.document.write('<tr><th>Notas</th><td>' + escFn(buyerNotes || '') + '</td></tr>');
    win.document.write('</table>');
    win.document.write('<div class="footer">Petcingo  Sistema de Identificacion de Mascotas | petcingo.com.bo</div>');
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
      var date = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
      
      var buyerName = d.buyer ? d.buyer.name : d.buyerName;
      var buyerPhone = d.buyer ? d.buyer.phone : d.phone;

      var acciones = '';
      if (status === 'pending') {
        acciones += '<button class="ptcg-index__btn ptcg-index__btn--success btn-sm" onclick="openVerifyModal(\'' + o.id + '\')"><i class="ri-shield-check-line"></i> Verificar pago</button> ';
      } else {
        acciones += '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="openVerifyModal(\'' + o.id + '\')" title="Ver detalles"><i class="ri-eye-line"></i></button> ';
      }
      
      if (status !== 'pending' && status !== 'rejected') {
        acciones += '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="printShippingGuide(\'' + o.id + '\')" title="Imprimir gua"><i class="ri-printer-line"></i></button> ';
      }
      
      acciones += '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" style="color:' + (isUrgent ? '#f44336' : '#757575') + '" onclick="toggleUrgent(\'' + o.id + '\',' + isUrgent + ')" title="' + (isUrgent ? 'Quitar urgente' : 'Marcar urgente') + '"><i class="ri-flashlight-line"></i></button>';

      var trk = d.trackingNumber ? '<br><small style="color:#4552CC;">Trk: ' + escFn(d.trackingNumber) + '</small>' : '';
      var actCode = d.activationCode ? '<br><small style="color:#2ECC71;font-family:monospace;">Cod: ' + escFn(d.activationCode) + '</small>' : '';

      html += '<tr class="' + rowClass + '">' +
        '<td><strong>' + escFn(o.id.substring(0,8)) + '...</strong>' + actCode + '</td>' +
        '<td>' + escFn(buyerName || '') + '<br><small style="color:#757575;">' + escFn(buyerPhone || '') + '</small></td>' +
        '<td>' + escFn(d.channel || 'Directo') + '</td>' +
        '<td>' + escFn(d.shippingType || d.deliveryType || '') + '<br><small style="color:#757575;">' + escFn(d.department || '') + '</small>' + trk + '</td>' +
        '<td><span class="status-badge ' + status + '">' + status.toUpperCase() + '</span></td>' +
        '<td>' + date + '</td>' +
        '<td style="white-space:nowrap;">' + acciones + '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
  };


  window.toggleUrgent = function(orderId, current) {
    var db2 = db(); if (!db2) return;
    db2.collection('orders').doc(orderId).update({ urgent: !current, updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
      .then(function() { if (typeof toast === 'function') toast(current ? 'Urgente removido' : 'i Marcado como urgente'); })
      .catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  function updateOrdersBadge() {
    var badge = document.getElementById('orders-nav-badge');
    if (!badge) return;
    var pending = _ordersCache.filter(function(o) { return o.data.status === 'pendiente'; }).length;
    badge.textContent = pending || '';
    badge.style.display = pending > 0 ? 'inline' : 'none';
  }

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE COMISIONES Y PAGOS oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */
  var _commissionsCache = [];
  var _commissionsUnsub = null;
  var _currentPaymentId = null;
  window._commissionsListenerActive = false;

  window.loadCommissions = function() {
    var db2 = db(); if (!db2) return;
    window._commissionsListenerActive = true;
    var tbody = document.getElementById('commissions-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div></td></tr>';
    if (_commissionsUnsub) { try { _commissionsUnsub(); } catch(e) {} }
    _commissionsUnsub = db2.collection('commissions').orderBy('dueDate', 'asc')
      .onSnapshot(function(snap) {
        _commissionsCache = [];
        snap.forEach(function(doc) { _commissionsCache.push({ id: doc.id, data: doc.data() }); });
        renderCommissions(_commissionsCache);
        updateCommissionsBadge();
      }, function(err) {
        window._commissionsListenerActive = false;
        if (tbody) tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Error al cargar comisiones.</div></td></tr>';
      });
  };

  function renderCommissions(list) {
    var tbody = document.getElementById('commissions-tbody');
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No hay comisiones registradas.</div></td></tr>';
      var cnt = document.getElementById('commissions-count'); if (cnt) cnt.textContent = '';
      return;
    }
    var html = '';
    list.forEach(function(c) {
      var d = c.data;
      var status = d.status || 'pendiente';
      var amount = typeof d.amount === 'number' ? d.amount.toFixed(2) + ' Bs' : '';
      var due  = d.dueDate && d.dueDate.toDate ? d.dueDate.toDate().toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
      var paidDate = d.paidAt && d.paidAt.toDate ? d.paidAt.toDate().toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }) : '';
      html += '<tr>' +
        '<td style="font-weight:600;">' + escFn(d.entityName || '') + (d.details ? '<br><small style="color:#757575;font-weight:400;">' + escFn(d.details) + '</small>' : '') + '</td>' +
        '<td style="text-transform:capitalize;">' + escFn(d.channel || '') + '</td>' +
        '<td style="font-weight:700;">' + amount + '</td>' +
        '<td><span class="status-badge ' + status + '">' + status + '</span>' + (paidDate ? '<br><small style="color:#757575;font-size:.72rem;">' + paidDate + '</small>' : '') + '</td>' +
        '<td style="font-size:0.85rem;color:#757575;">' + due + '</td>' +
        '<td style="white-space:nowrap;">' +
          (status === 'pendiente' ? '<button class="ptcg-index__btn ptcg-index__btn--success btn-sm" onclick="openPaymentModal(\'' + c.id + '\')" style="margin-right:4px;"><i class="ri-check-line"></i> Pagar</button>' : '') +
          '<button class="ptcg-index__btn ptcg-index__btn--danger btn-sm" onclick="deleteCommission(\'' + c.id + '\')"><i class="ri-delete-bin-line"></i></button>' +
        '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
    var cnt = document.getElementById('commissions-count');
    if (cnt) cnt.textContent = list.length + ' comisin' + (list.length !== 1 ? 'es' : '');
  }

  window.filterCommissions = function() {
    var channel = (document.getElementById('comm-filter-channel') || {}).value || '';
    var status  = (document.getElementById('comm-filter-status')  || {}).value || '';
    var filtered = _commissionsCache.filter(function(c) {
      var d = c.data;
      if (channel && d.channel !== channel) return false;
      if (status  && d.status  !== status)  return false;
      return true;
    });
    renderCommissions(filtered);
  };

  window.openPaymentModal = function(commId) {
    _currentPaymentId = commId;
    var modal = document.getElementById('payment-modal');
    var inp   = document.getElementById('payment-comprobante');
    if (modal) modal.style.display = 'flex';
    if (inp)   inp.value = '';
    setTimeout(function() { if (inp) inp.focus(); }, 80);
  };

  window.closePaymentModal = function() {
    var modal = document.getElementById('payment-modal');
    if (modal) modal.style.display = 'none';
    _currentPaymentId = null;
  };

  window.confirmPayment = function() {
    if (!_currentPaymentId) return;
    var comprobante = ((document.getElementById('payment-comprobante') || {}).value || '').trim();
    var btn = document.getElementById('btn-confirm-payment');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line"></i> Guardando'; }
    var db2 = db(); if (!db2) return;
    db2.collection('commissions').doc(_currentPaymentId).update({
      status:      'pagado',
      paidAt:      firebase.firestore.FieldValue.serverTimestamp(),
      comprobante: comprobante || null,
      updatedAt:   firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      closePaymentModal();
      if (typeof toast === 'function') toast('Comisin marcada como pagada.');
    }).catch(function(e) {
      if (typeof toast === 'function') toast('Error: ' + e.message);
    }).finally(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ri-check-line"></i> Confirmar pago'; }
    });
  };

  window.deleteCommission = function(commId) {
    if (!confirm('Eliminar esta comisin permanentemente?')) return;
    var db2 = db(); if (!db2) return;
    db2.collection('commissions').doc(commId).delete()
      .then(function() { if (typeof toast === 'function') toast('Comisin eliminada.'); })
      .catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  window.exportCommissionsReport = function() {
    var raw = prompt('Mes a exportar en formato MM-YYYY (ej: 05-2026). Dejar vaco = mes actual.');
    var now = new Date();
    var targetYear  = now.getFullYear();
    var targetMonth = now.getMonth() + 1;
    if (raw && /^\d{2}-\d{4}$/.test(raw.trim())) {
      var parts = raw.trim().split('-');
      targetMonth = parseInt(parts[0], 10);
      targetYear  = parseInt(parts[1], 10);
    }
    var filtered = _commissionsCache.filter(function(c) {
      var d = c.data;
      if (d.dueDate && d.dueDate.toDate) {
        var dt = d.dueDate.toDate();
        return dt.getMonth() + 1 === targetMonth && dt.getFullYear() === targetYear;
      }
      return false;
    });
    if (filtered.length === 0) { alert('No hay comisiones para ese perodo.'); return; }
    var csv = 'Entidad,Canal,Monto,Estado,Vence,Pagado,Comprobante,Detalle\n';
    filtered.forEach(function(c) {
      var d = c.data;
      var row = [
        d.entityName  || '',
        d.channel     || '',
        d.amount      || 0,
        d.status      || '',
        d.dueDate  && d.dueDate.toDate  ? d.dueDate.toDate().toLocaleDateString('es-BO')  : '',
        d.paidAt   && d.paidAt.toDate   ? d.paidAt.toDate().toLocaleDateString('es-BO')   : '',
        d.comprobante || '',
        d.details     || ''
      ].map(function(f) { return '"' + String(f).replace(/"/g, '""') + '"'; }).join(',');
      csv += row + '\n';
    });
    var blob = new Blob(['' + csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'comisiones-' + targetYear + '-' + ('0' + targetMonth).slice(-2) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  function updateCommissionsBadge() {
    var badge = document.getElementById('commissions-nav-badge');
    if (!badge) return;
    var pending = _commissionsCache.filter(function(c) { return c.data.status === 'pendiente'; }).length;
    badge.textContent = pending || '';
    badge.style.display = pending > 0 ? 'inline' : 'none';
  }

  /* Cerrar modal de pago al hacer clic fuera */
  document.addEventListener('click', function(e) {
    var modal = document.getElementById('payment-modal');
    if (modal && e.target === modal) closePaymentModal();
  });

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE TIENDA oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */
  var _productsCache = [];
  var _productsUnsub = null;
  window._storeListenerActive = false;

  window.loadProducts = function() {
    var db2 = db(); if (!db2) return;
    var tbody = document.getElementById('store-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div></td></tr>';
    if (_productsUnsub) { try { _productsUnsub(); } catch(e) {} }
    window._storeListenerActive = true;
    _productsUnsub = db2.collection('products').orderBy('name', 'asc')
      .onSnapshot(function(snap) {
        _productsCache = [];
        snap.forEach(function(doc) { _productsCache.push({ id: doc.id, data: doc.data() }); });
        renderProducts(_productsCache);
        updateStoreBadge();
      }, function(err) {
        window._storeListenerActive = false;
        if (tbody) tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Error al cargar productos.</div></td></tr>';
      });
  };

  function stockClass(n) {
    if (n === 0) return 'empty';
    if (n <= 3)  return 'low';
    if (n <= 10) return 'medium';
    return 'high';
  }

  function renderProducts(list) {
    var tbody = document.getElementById('store-tbody');
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No hay productos registrados.</div></td></tr>';
      var cnt = document.getElementById('store-count'); if (cnt) cnt.textContent = '';
      return;
    }
    var html = '';
    list.forEach(function(p) {
      var d = p.data;
      var stock = parseInt(d.stock) || 0;
      var sc = stockClass(stock);
      var inactive = d.status === 'inactivo';
      var imgHtml = d.imageUrl
        ? '<img src="' + escFn(d.imageUrl) + '" class="product-thumb" alt="" onerror="this.style.display=\'none\'">'
        : '<div class="product-thumb" style="background:#EEF1FB;display:inline-flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;"></div>';
      html += '<tr' + (inactive ? ' style="opacity:0.5;"' : '') + '>' +
        '<td><div class="product-name-cell">' + imgHtml + '<strong>' + escFn(d.name || '') + '</strong></div></td>' +
        '<td style="text-transform:capitalize;">' + escFn(d.category || '') + '</td>' +
        '<td style="font-weight:700;">' + (typeof d.price === 'number' ? d.price.toFixed(2) + ' Bs' : '') + '</td>' +
        '<td><span class="stock-badge ' + sc + '">' + stock + '</span></td>' +
        '<td><span class="status-badge ' + (inactive ? 'entregado' : 'enviado') + '">' + (inactive ? 'Inactivo' : 'Activo') + '</span></td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="editProduct(\'' + p.id + '\')" style="margin-right:4px;" title="Editar"><i class="ri-edit-line"></i></button>' +
          '<button class="ptcg-index__btn ptcg-index__btn--danger btn-sm" onclick="deleteProduct(\'' + p.id + '\')" title="Eliminar"><i class="ri-delete-bin-line"></i></button>' +
        '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
    var cnt = document.getElementById('store-count');
    if (cnt) cnt.textContent = list.length + ' producto' + (list.length !== 1 ? 's' : '');
  }

  window.filterProducts = function() {
    var cat = (document.getElementById('store-filter-category') || {}).value || '';
    var st  = (document.getElementById('store-filter-status')   || {}).value || '';
    var filtered = _productsCache.filter(function(p) {
      var d = p.data;
      if (cat && d.category !== cat) return false;
      if (st  && d.status   !== st)  return false;
      return true;
    });
    renderProducts(filtered);
  };

  window.showProductForm = function(productId) {
    var form = document.getElementById('store-product-form');
    if (form) form.style.display = 'block';
    if (!productId) {
      document.getElementById('store-form-title').textContent  = 'Nuevo producto';
      document.getElementById('store-product-id').value        = '';
      document.getElementById('store-prod-name').value         = '';
      document.getElementById('store-prod-category').value     = 'placa';
      document.getElementById('store-prod-price').value        = '';
      document.getElementById('store-prod-stock').value        = '';
      document.getElementById('store-prod-status').value       = 'activo';
      document.getElementById('store-prod-desc').value         = '';
      document.getElementById('store-prod-image').value        = '';
      var nameInput = document.getElementById('store-prod-name');
      setTimeout(function() { if (nameInput) nameInput.focus(); }, 80);
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.editProduct = function(productId) {
    var product = _productsCache.find(function(p) { return p.id === productId; });
    if (!product) return;
    var d = product.data;
    showProductForm(productId);
    document.getElementById('store-form-title').textContent  = 'Editar producto';
    document.getElementById('store-product-id').value        = productId;
    document.getElementById('store-prod-name').value         = d.name        || '';
    document.getElementById('store-prod-category').value     = d.category    || 'placa';
    document.getElementById('store-prod-price').value        = d.price       || '';
    document.getElementById('store-prod-stock').value        = typeof d.stock === 'number' ? d.stock : '';
    document.getElementById('store-prod-status').value       = d.status      || 'activo';
    document.getElementById('store-prod-desc').value         = d.description || '';
    document.getElementById('store-prod-image').value        = d.imageUrl    || '';
  };

  window.hideProductForm = function() {
    var form = document.getElementById('store-product-form');
    if (form) form.style.display = 'none';
  };

  window.saveProduct = function() {
    var name = (document.getElementById('store-prod-name').value || '').trim();
    if (!name) { if (typeof toast === 'function') toast('El nombre del producto es obligatorio.'); return; }
    var priceRaw = document.getElementById('store-prod-price').value;
    var stockRaw = document.getElementById('store-prod-stock').value;
    var price = priceRaw !== '' ? parseFloat(priceRaw) : null;
    var stock = stockRaw !== '' ? parseInt(stockRaw, 10) : 0;
    if (price !== null && isNaN(price)) { if (typeof toast === 'function') toast('Precio invilido.'); return; }

    var btn = document.getElementById('btn-save-product');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line"></i> Guardando'; }

    var data = {
      name:        name,
      category:    document.getElementById('store-prod-category').value,
      price:       price !== null ? price : 0,
      stock:       stock,
      status:      document.getElementById('store-prod-status').value,
      description: (document.getElementById('store-prod-desc').value  || '').trim(),
      imageUrl:    (document.getElementById('store-prod-image').value || '').trim(),
      updatedAt:   firebase.firestore.FieldValue.serverTimestamp()
    };

    var productId = document.getElementById('store-product-id').value;
    var db2 = db(); if (!db2) return;
    var op = productId
      ? db2.collection('products').doc(productId).update(data)
      : (function() { data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); return db2.collection('products').add(data); })();

    op.then(function() {
      hideProductForm();
      if (typeof toast === 'function') toast('Producto ' + (productId ? 'actualizado' : 'creado') + '.');
    }).catch(function(e) {
      if (typeof toast === 'function') toast('Error: ' + e.message);
    }).finally(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ri-save-line"></i> Guardar producto'; }
    });
  };

  window.deleteProduct = function(productId) {
    if (!confirm('Eliminar este producto permanentemente?')) return;
    var db2 = db(); if (!db2) return;
    db2.collection('products').doc(productId).delete()
      .then(function() { if (typeof toast === 'function') toast('Producto eliminado.'); })
      .catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  function updateStoreBadge() {
    var badge = document.getElementById('store-nav-badge');
    if (!badge) return;
    var lowStock = _productsCache.filter(function(p) {
      var s = parseInt(p.data.stock) || 0;
      return s <= 3 && p.data.status !== 'inactivo';
    }).length;
    badge.textContent = lowStock || '';
    badge.style.display = lowStock > 0 ? 'inline' : 'none';
  }

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE PROMOCIONES oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */
  var _promotionsCache = [];
  var _promotionsUnsub = null;
  window._promoListenerActive = false;

  window.loadPromotions = function() {
    var db2 = db(); if (!db2) return;
    var tbody = document.getElementById('promotions-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div></td></tr>';
    if (_promotionsUnsub) { try { _promotionsUnsub(); } catch(e) {} }
    window._promoListenerActive = true;
    _promotionsUnsub = db2.collection('promotions').orderBy('code', 'asc')
      .onSnapshot(function(snap) {
        _promotionsCache = [];
        snap.forEach(function(doc) { _promotionsCache.push({ id: doc.id, data: doc.data() }); });
        renderPromotions(_promotionsCache);
      }, function() {
        window._promoListenerActive = false;
        if (tbody) tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Error al cargar promociones.</div></td></tr>';
      });
  };

  function promoStatus(d) {
    var now = new Date();
    var expires = d.expiresAt && d.expiresAt.toDate ? d.expiresAt.toDate() : null;
    if (expires && expires < now)           return 'expirado';
    if (d.maxUses && d.usedCount >= d.maxUses) return 'agotado';
    return 'activo';
  }

  function renderPromotions(list) {
    var tbody = document.getElementById('promotions-tbody');
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No hay cdigos de descuento.</div></td></tr>';
      var cnt = document.getElementById('promotions-count'); if (cnt) cnt.textContent = '';
      return;
    }
    var html = '';
    list.forEach(function(p) {
      var d = p.data;
      var status   = promoStatus(d);
      var inactive = status !== 'activo';
      var valueStr = d.type === 'percent' ? (d.value + '%') : (d.value + ' Bs');
      var usesStr  = (d.usedCount || 0) + (d.maxUses ? ' / ' + d.maxUses : ' / ');
      var expires  = d.expiresAt && d.expiresAt.toDate ? d.expiresAt.toDate().toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin lmite';
      html += '<tr' + (inactive ? ' class="promo-inactive"' : '') + '>' +
        '<td><code style="font-size:.9rem;font-weight:700;">' + escFn(d.code || '') + '</code></td>' +
        '<td>' + (d.type === 'percent' ? 'Porcentaje' : 'Monto fijo') + '</td>' +
        '<td style="font-weight:700;">' + valueStr + '</td>' +
        '<td>' + usesStr + '</td>' +
        '<td style="font-size:0.85rem;color:#757575;">' + expires + '</td>' +
        '<td><span class="status-badge ' + status + '">' + status + '</span></td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="editPromotion(\'' + p.id + '\')" style="margin-right:4px;" title="Editar"><i class="ri-edit-line"></i></button>' +
          '<button class="ptcg-index__btn ptcg-index__btn--danger btn-sm" onclick="deletePromotion(\'' + p.id + '\')" title="Eliminar"><i class="ri-delete-bin-line"></i></button>' +
        '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
    var cnt = document.getElementById('promotions-count');
    if (cnt) cnt.textContent = list.length + ' cdigo' + (list.length !== 1 ? 's' : '');
  }

  window.filterPromotions = function() {
    var status = (document.getElementById('promo-filter-status') || {}).value || '';
    var type   = (document.getElementById('promo-filter-type')   || {}).value || '';
    var filtered = _promotionsCache.filter(function(p) {
      var d = p.data;
      if (status && promoStatus(d) !== status) return false;
      if (type   && d.type !== type)           return false;
      return true;
    });
    renderPromotions(filtered);
  };

  window.showPromoForm = function(promoId) {
    var form = document.getElementById('promo-form');
    if (form) form.style.display = 'block';
    if (!promoId) {
      document.getElementById('promo-form-title').textContent = 'Nuevo cdigo de descuento';
      document.getElementById('promo-id').value           = '';
      document.getElementById('promo-code').value         = '';
      document.getElementById('promo-type').value         = 'percent';
      document.getElementById('promo-value').value        = '';
      document.getElementById('promo-max-uses').value     = '';
      document.getElementById('promo-min-amount').value   = '';
      document.getElementById('promo-expires').value      = '';
      document.getElementById('promo-channel').value      = '';
      setTimeout(function() { var el = document.getElementById('promo-code'); if (el) el.focus(); }, 80);
    }
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.editPromotion = function(promoId) {
    var promo = _promotionsCache.find(function(p) { return p.id === promoId; });
    if (!promo) return;
    var d = promo.data;
    showPromoForm(promoId);
    document.getElementById('promo-form-title').textContent = 'Editar cdigo';
    document.getElementById('promo-id').value           = promoId;
    document.getElementById('promo-code').value         = d.code        || '';
    document.getElementById('promo-type').value         = d.type        || 'percent';
    document.getElementById('promo-value').value        = d.value       || '';
    document.getElementById('promo-max-uses').value     = d.maxUses     || '';
    document.getElementById('promo-min-amount').value   = d.minAmount   || '';
    document.getElementById('promo-expires').value      = d.expiresAt && d.expiresAt.toDate ? d.expiresAt.toDate().toISOString().slice(0, 10) : '';
    document.getElementById('promo-channel').value      = d.channel     || '';
  };

  window.hidePromoForm = function() {
    var form = document.getElementById('promo-form');
    if (form) form.style.display = 'none';
  };

  window.savePromotion = function() {
    var code  = (document.getElementById('promo-code').value  || '').trim();
    var value = parseFloat(document.getElementById('promo-value').value);
    if (!code)         { if (typeof toast === 'function') toast('El cdigo es obligatorio.'); return; }
    if (!(value > 0))  { if (typeof toast === 'function') toast('El valor debe ser mayor a 0.'); return; }

    var btn = document.getElementById('btn-save-promo');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line"></i> Guardando'; }

    var maxUsesRaw   = document.getElementById('promo-max-uses').value;
    var minAmountRaw = document.getElementById('promo-min-amount').value;
    var expiresStr   = document.getElementById('promo-expires').value;

    var data = {
      code:      code,
      type:      document.getElementById('promo-type').value,
      value:     value,
      maxUses:   maxUsesRaw  ? parseInt(maxUsesRaw, 10)    : null,
      minAmount: minAmountRaw ? parseFloat(minAmountRaw)   : 0,
      channel:   document.getElementById('promo-channel').value || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    /* Set expiresAt to end of day in local time (Bolivia UTC-4) */
    data.expiresAt = expiresStr
      ? firebase.firestore.Timestamp.fromDate(new Date(expiresStr + 'T23:59:59'))
      : null;

    var promoId = document.getElementById('promo-id').value;
    var db2 = db(); if (!db2) return;
    var op = promoId
      ? db2.collection('promotions').doc(promoId).update(data)
      : (function() { data.usedCount = 0; data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); return db2.collection('promotions').add(data); })();

    op.then(function() {
      hidePromoForm();
      if (typeof toast === 'function') toast('Cdigo ' + (promoId ? 'actualizado' : 'creado') + '.');
    }).catch(function(e) {
      if (typeof toast === 'function') toast('Error: ' + e.message);
    }).finally(function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ri-save-line"></i> Guardar cdigo'; }
    });
  };

  window.deletePromotion = function(promoId) {
    if (!confirm('Eliminar este cdigo permanentemente?')) return;
    var db2 = db(); if (!db2) return;
    db2.collection('promotions').doc(promoId).delete()
      .then(function() { if (typeof toast === 'function') toast('Cdigo eliminado.'); })
      .catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE MASCOTAS PERDIDAS oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */
  /* loadLostPets esti en petcingo.js  usa lost-pets-tbody y lost-pets-count */

  window.toggleFeaturedLost = function(petId, current) {
    db().collection('pets').doc(petId).update({
      featuredOnIndex: !current,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      if (typeof toast === 'function') toast(current ? 'Quitada del index.' : 'Publicada en el index.');
      if (typeof loadLostPets === 'function') loadLostPets();
    }).catch(function(e) {
      if (typeof toast === 'function') toast('Error: ' + e.message);
    });
  };

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE SISTEMA DE ALERTAS oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */
  window.showDashAlert = function(msg, type, icon) {
    var container = document.getElementById('alerts-container');
    if (!container) return;
    var el = document.createElement('div');
    el.className = 'dash-alert ' + (type || '');
    el.innerHTML = '<i class="' + (icon || 'ri-notification-3-line') + '"></i><span>' + msg + '</span>';
    container.appendChild(el);
    var timer = setTimeout(function() { _dismissAlert(el); }, 6000);
    el.addEventListener('click', function() { clearTimeout(timer); _dismissAlert(el); });
  };

  function _dismissAlert(el) {
    el.style.transition = 'opacity 0.35s, transform 0.35s';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(18px)';
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 370);
  }

  function showInitialAlerts() {
    setTimeout(function() {
      var ordersBadge = document.getElementById('orders-nav-badge');
      if (ordersBadge && ordersBadge.textContent.trim()) {
        showDashAlert(ordersBadge.textContent.trim() + ' pedido(s) pendiente(s) de atencin.', 'warning', 'ri-shopping-bag-line');
      }
      var commBadge = document.getElementById('commissions-nav-badge');
      if (commBadge && commBadge.textContent.trim()) {
        showDashAlert(commBadge.textContent.trim() + ' comisin(es) por pagar.', 'danger', 'ri-money-dollar-circle-line');
      }
      var storeBadge = document.getElementById('store-nav-badge');
      if (storeBadge && storeBadge.textContent.trim()) {
        showDashAlert('Stock bajo en ' + storeBadge.textContent.trim() + ' producto(s).', 'warning', 'ri-store-2-line');
      }
      var lostBadge = document.getElementById('lost-nav-badge');
      if (lostBadge && lostBadge.textContent.trim()) {
        showDashAlert(lostBadge.textContent.trim() + ' mascota(s) perdida(s) activa(s).', 'danger', 'ri-emotion-sad-line');
      }
    }, 1800);
  }

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE PERSONALIZAR INDEX oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */

  window.showCTab = function(tab, btn) {
    document.querySelectorAll('.ctab-panel').forEach(function(p) { p.style.display = 'none'; });
    document.querySelectorAll('.ctab-btn').forEach(function(b) {
      b.classList.remove('ptcg-index__btn--primary');
      b.classList.add('ptcg-index__btn--secondary');
    });
    var panel = document.getElementById('ctab-panel-' + tab);
    if (panel) panel.style.display = '';
    if (btn) { btn.classList.remove('ptcg-index__btn--secondary'); btn.classList.add('ptcg-index__btn--primary'); }
  };

  window.loadSiteConfig = function() {
    var db2 = db(); if (!db2) return;
    db2.collection('siteConfig').doc('main').get().then(function(doc) {
      var d = doc.exists ? doc.data() : {};

      function setVal(id, val) { var el = document.getElementById(id); if (el && val != null) el.value = String(val); }
      function setCb(id, val)  { var el = document.getElementById(id); if (el) el.checked = val !== false; }

      /* Anuncio */
      setCb('cfg-ann-visible', d.ann_visible);
      setVal('cfg-ann-text',    d.ann_text);

      /* Hero */
      setVal('cfg-hero-eyebrow', d.hero_eyebrow);
      setVal('cfg-hero-h1',      d.hero_h1);
      setVal('cfg-hero-sub',     d.hero_sub);

      /* Planes */
      setCb('cfg-preventa-visible', d.preventa_visible);
      setVal('cfg-preventa-price',  d.preventa_price);
      setVal('cfg-preventa-orig',   d.preventa_orig);
      setVal('cfg-preventa-note',   d.preventa_note);

      setCb('cfg-petid-visible', d.petid_visible);
      setVal('cfg-petid-price',  d.petid_price);
      setVal('cfg-petid-usd',    d.petid_usd);
      setVal('cfg-petid-note',   d.petid_note);

      setCb('cfg-familia-visible', d.familia_visible);
      setVal('cfg-familia-price',  d.familia_price);
      setVal('cfg-familia-usd',    d.familia_usd);
      setVal('cfg-familia-note',   d.familia_note);

      /* General */
      setVal('cfg-intl-usd', d.intl_usd);
      setVal('cfg-intl-wa',  d.intl_whatsapp);

      /* Avanzado  secciones */
      setCb('cfg-ventajas-visible',  d.ventajas_visible);
      setVal('cfg-ventajas-title',   d.ventajas_title);
      setVal('cfg-ventajas-sub',     d.ventajas_sub);

      setCb('cfg-como-visible',      d.como_visible);
      setVal('cfg-como-title',       d.como_title);
      setVal('cfg-como-sub',         d.como_sub);

      setCb('cfg-impacto-visible',   d.impacto_visible);
      setVal('cfg-impacto-title',    d.impacto_title);
      setVal('cfg-impacto-sub',      d.impacto_sub);

      setCb('cfg-afiliados-visible', d.afiliados_visible);
      setVal('cfg-afiliados-title',  d.afiliados_title);
      setVal('cfg-afiliados-sub',    d.afiliados_sub);

      setCb('cfg-vets-visible',      d.vets_sec_visible);
      setVal('cfg-vets-title',       d.vets_sec_title);
      setVal('cfg-vets-sub',         d.vets_sec_sub);

      setCb('cfg-faq-visible',       d.faq_visible);
      setVal('cfg-faq-title',        d.faq_title);

      setCb('cfg-adopt-visible',     d.adopt_visible);
      setVal('cfg-adopt-title',      d.adopt_title);

      /* Avanzado  global */
      setVal('cfg-test1-name',       d.test1_name);
      setVal('cfg-test1-text',       d.test1_text);
      setVal('cfg-footer-text',      d.footer_text);
      setVal('cfg-wa-number',        d.wa_number);
      setVal('cfg-accent-color',     d.accent_color || '#4552CC');
      setVal('cfg-accent-color-text', d.accent_color || '#4552CC');

      /* ltima edicin */
      var lastUpd = document.getElementById('cfg-last-updated');
      if (lastUpd && d.updatedAt && d.updatedAt.toDate) {
        lastUpd.textContent = 'ltima edicin: ' + d.updatedAt.toDate().toLocaleString('es-BO', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      }
    }).catch(function(e) { console.error('[Petcingo] Error cargando siteConfig:', e); });
  };

  window.loadBankInfo = function() {
    var db2 = db(); if (!db2) return;
    db2.collection('config').doc('bank_info').get().then(function(doc) {
      var d = doc.exists ? doc.data() : {};
      function setVal(id, val) { var el = document.getElementById(id); if (el && val != null) el.value = String(val); }
      setVal('cfg-bank-name', d.bankName);
      setVal('cfg-bank-type', d.accountType);
      setVal('cfg-bank-account', d.accountNumber);
      setVal('cfg-bank-holder', d.accountHolder);
    }).catch(function(e) { console.error('[Petcingo] Error cargando bank_info:', e); });
  };

  window.saveBankInfo = function() {
    var db2 = db(); if (!db2) return;
    var btn    = document.getElementById('btn-save-bank');
    var status = document.getElementById('cfg-bank-status');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line"></i> Guardando'; }
    if (status) { status.style.display = 'none'; }

    function v(id)  { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

    var data = {
      bankName: v('cfg-bank-name'),
      accountType: v('cfg-bank-type'),
      accountNumber: v('cfg-bank-account'),
      accountHolder: v('cfg-bank-holder'),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db2.collection('config').doc('bank_info').set(data, { merge: true })
      .then(function() {
        if (typeof toast === 'function') toast('Datos bancarios guardados correctamente.');
        if (status) { status.textContent = 'Guardado'; status.style.color = '#2ECC71'; status.style.display = 'inline'; setTimeout(function() { status.style.display = 'none'; }, 4000); }
      })
      .catch(function(e) {
        if (typeof toast === 'function') toast('Error al guardar: ' + e.message);
        if (status) { status.textContent = 'Error'; status.style.color = '#E74C3C'; status.style.display = 'inline'; }
      })
      .finally(function() {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ri-save-line"></i> Guardar datos'; }
      });
  };

  window.saveSiteConfig = function() {
    var db2 = db(); if (!db2) return;
    var btn    = document.getElementById('btn-save-cfg');
    var status = document.getElementById('cfg-save-status');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line"></i> Guardando'; }
    if (status) { status.style.display = 'none'; }

    function v(id)  { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    function cb(id) { var el = document.getElementById(id); return el ? el.checked : true; }
    function n(id)  { var raw = v(id); return raw !== '' ? parseFloat(raw) : null; }

    var data = {
      ann_visible:      cb('cfg-ann-visible'),
      ann_text:         v('cfg-ann-text'),
      hero_eyebrow:     v('cfg-hero-eyebrow'),
      hero_h1:          v('cfg-hero-h1'),
      hero_sub:         v('cfg-hero-sub'),
      preventa_visible: cb('cfg-preventa-visible'),
      preventa_price:   n('cfg-preventa-price'),
      preventa_orig:    n('cfg-preventa-orig'),
      preventa_note:    v('cfg-preventa-note'),
      petid_visible:    cb('cfg-petid-visible'),
      petid_price:      n('cfg-petid-price'),
      petid_usd:        v('cfg-petid-usd'),
      petid_note:       v('cfg-petid-note'),
      familia_visible:  cb('cfg-familia-visible'),
      familia_price:    n('cfg-familia-price'),
      familia_usd:      v('cfg-familia-usd'),
      familia_note:     v('cfg-familia-note'),
      intl_usd:         v('cfg-intl-usd'),
      intl_whatsapp:    v('cfg-intl-wa'),
      ventajas_visible:  cb('cfg-ventajas-visible'),
      ventajas_title:    v('cfg-ventajas-title'),
      ventajas_sub:      v('cfg-ventajas-sub'),
      como_visible:      cb('cfg-como-visible'),
      como_title:        v('cfg-como-title'),
      como_sub:          v('cfg-como-sub'),
      impacto_visible:   cb('cfg-impacto-visible'),
      impacto_title:     v('cfg-impacto-title'),
      impacto_sub:       v('cfg-impacto-sub'),
      afiliados_visible: cb('cfg-afiliados-visible'),
      afiliados_title:   v('cfg-afiliados-title'),
      afiliados_sub:     v('cfg-afiliados-sub'),
      vets_sec_visible:  cb('cfg-vets-visible'),
      vets_sec_title:    v('cfg-vets-title'),
      vets_sec_sub:      v('cfg-vets-sub'),
      faq_visible:       cb('cfg-faq-visible'),
      faq_title:         v('cfg-faq-title'),
      adopt_visible:     cb('cfg-adopt-visible'),
      adopt_title:       v('cfg-adopt-title'),
      test1_name:        v('cfg-test1-name'),
      test1_text:        v('cfg-test1-text'),
      footer_text:       v('cfg-footer-text'),
      wa_number:         v('cfg-wa-number'),
      accent_color:      v('cfg-accent-color-text') || v('cfg-accent-color'),
      updatedAt:         firebase.firestore.FieldValue.serverTimestamp()
    };

    db2.collection('siteConfig').doc('main').set(data, { merge: true })
      .then(function() {
        if (typeof toast === 'function') toast('Configuracin guardada correctamente.');
        if (status) { status.textContent = 'Guardado'; status.style.color = '#2ECC71'; status.style.display = 'inline'; setTimeout(function() { status.style.display = 'none'; }, 4000); }
        var lastUpd = document.getElementById('cfg-last-updated');
        if (lastUpd) lastUpd.textContent = 'ltima edicin: ahora';
        var iframe = document.getElementById('customize-preview');
        if (iframe) iframe.src = iframe.src;
      })
      .catch(function(e) {
        if (typeof toast === 'function') toast('Error al guardar: ' + e.message);
        if (status) { status.textContent = 'Error al guardar'; status.style.color = '#E74C3C'; status.style.display = 'inline'; }
      })
      .finally(function() {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ri-save-line"></i> Guardar cambios'; }
      });
  };

  window.syncAdoptions = function() {
    if (typeof toast === 'function') toast('Sincronizacin de adopciones en desarrollo.');
  };

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE MODAL DETALLE MASCOTA oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */

  function infoItem(label, value) {
    return '<div><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;font-family:\'Plus Jakarta Sans\',sans-serif;">' + escFn(label) + '</span><br><span style="font-weight:600;font-size:0.9rem;">' + escFn(value || '') + '</span></div>';
  }

  window.showPetModal = function(plateId) {
    var db2 = db(); if (!db2) return;
    var modal   = document.getElementById('pet-detail-modal');
    var content = document.getElementById('mod-pet-content');
    var nameEl  = document.getElementById('mod-pet-name');
    if (!modal || !content || !nameEl) return;
    content.innerHTML = '<div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
    nameEl.textContent = '';
    modal.style.display = 'flex';

    db2.collection('pets').doc(plateId).get().then(function(doc) {
      if (!doc.exists) { if (typeof toast === 'function') toast('Placa no encontrada.'); closePetModal(); return; }
      var d = doc.data();
      nameEl.textContent = d.name || d.petName || 'Sin nombre';
      var statusDot = document.getElementById('mod-pet-status');
      if (statusDot) {
        var statusColors = { active:'#4CAF50', lost:'#F44336', found:'#2196F3', inactive:'#9E9E9E' };
        statusDot.style.background = statusColors[(d.status||'').toLowerCase()] || '#BDBDBD';
        statusDot.title = d.status || 'Sin estado';
      }
      var safe = plateId.replace(/'/g, "\\'");
      var html = '';

      /* Foto + cdigo */
      html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">';
      html += d.photoUrl
        ? '<img src="' + escFn(d.photoUrl) + '" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid #E0E0E0;flex-shrink:0;" onerror="this.style.display=\'none\'">'
        : '<div style="width:72px;height:72px;border-radius:50%;background:#EEF1FB;display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0;">E</div>';
      html += '<div><div style="font-family:monospace;font-size:0.9rem;font-weight:700;color:#4552CC;word-break:break-all;">' + escFn(plateId) + '</div>';
      html += '<button onclick="copyPetCode(\'' + safe + '\')" style="margin-top:4px;padding:4px 10px;border-radius:8px;border:1px solid #E0E0E0;background:#fff;cursor:pointer;font-size:0.75rem;font-family:\'Plus Jakarta Sans\',sans-serif;display:inline-flex;align-items:center;gap:4px;"><i class="ri-file-copy-line"></i> Copiar cdigo</button></div></div>';

      /* Datos bisicos */
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">';
      html += infoItem('Especie',   d.species || d.petType);
      html += infoItem('Raza',      d.breed);
      html += infoItem('Gnero',    d.gender);
      html += infoItem('Peso',      d.weight ? d.weight + ' kg' : null);
      html += infoItem('Nacimiento', d.birthdate);
      html += infoItem('Color',     d.color);
      html += infoItem('Comportamiento', d.behavior);
      html += infoItem('Estado',    d.status);
      html += '</div>';

      /* Dueo */
      if (d.ownerName || d.ownerEmail) {
        html += '<div style="padding:12px 14px;background:#F8F9FB;border-radius:12px;margin-bottom:16px;">';
        html += '<div style="font-size:0.72rem;color:#9E9E9E;text-transform:uppercase;margin-bottom:8px;font-family:\'Plus Jakarta Sans\',sans-serif;">Dueo</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
        html += infoItem('Nombre', d.ownerName);
        html += infoItem('Email',  d.ownerEmail || d.owner_email);
        html += '</div></div>';
      }

      /* Contactos */
      var phones = [];
      if (d.phone)  phones.push({ label: 'Principal',   num: d.phone });
      if (d.phone2) phones.push({ label: 'Secundario',  num: d.phone2 });
      if (d.emergencyPhone) phones.push({ label: 'Emergencia', num: d.emergencyPhone });
      if (phones.length) {
        html += '<div style="margin-bottom:16px;"><div style="font-size:0.72rem;color:#9E9E9E;text-transform:uppercase;margin-bottom:8px;font-family:\'Plus Jakarta Sans\',sans-serif;">Contactos</div>';
        phones.forEach(function(p) {
          html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#FAFAFA;border-radius:10px;margin-bottom:6px;">';
          html += '<span style="font-size:0.88rem;">' + escFn(p.label) + ': <strong>' + escFn(p.num) + '</strong></span>';
          html += '<a href="https://wa.me/' + p.num.replace(/\D/g,'') + '" target="_blank" rel="noopener" style="color:#25D366;text-decoration:none;font-weight:700;font-size:0.82rem;display:flex;align-items:center;gap:4px;"><i class="ri-whatsapp-line"></i> WhatsApp</a>';
          html += '</div>';
        });
        html += '</div>';
      }

      /* Vacunas */
      html += '<div style="padding:12px 14px;background:#F8F9FB;border-radius:12px;margin-bottom:16px;">';
      html += '<div style="font-size:0.72rem;color:#9E9E9E;text-transform:uppercase;margin-bottom:6px;font-family:\'Plus Jakarta Sans\',sans-serif;">Vacunas</div>';
      html += '<span style="font-size:0.9rem;font-weight:600;">' + (d.vaccinationStatus === 'yes' ? 'a Al da' : 'a No al da / Sin datos') + '</span>';
      if (d.vaccinationDetails) html += '<br><small style="color:#757575;">' + escFn(d.vaccinationDetails) + '</small>';
      html += '</div>';

      /* Mensaje */
      if (d.message) html += '<div style="background:#FFF9E6;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-style:italic;color:#616161;font-size:0.88rem;">"' + escFn(d.message) + '"</div>';

      /* Accin: recuperar clave */
      html += '<button class="ptcg-index__btn ptcg-index__btn--primary" onclick="sendPasswordReset(\'' + safe + '\')" style="width:100%;margin-top:8px;padding:12px;font-size:0.9rem;font-weight:700;">';
      html += '<i class="ri-key-2-line"></i> Enviar recuperacin de contrasea</button>';

      content.innerHTML = html;
    }).catch(function(e) {
      if (typeof toast === 'function') toast('Error al cargar: ' + e.message);
      closePetModal();
    });
  };

  window.closePetModal = function() {
    var modal = document.getElementById('pet-detail-modal');
    if (modal) modal.style.display = 'none';
  };

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE SOPORTE AL CLIENTE oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */

  window.copyRegCode = function() {
    var code = (document.getElementById('reg-result-id') || {}).textContent || '';
    if (!code || code === '') return;
    navigator.clipboard.writeText(code)
      .then(function() { if (typeof toast === 'function') toast('Cdigo copiado: ' + code); })
      .catch(function() { prompt('Cdigo de activacin:', code); });
  };

  window.copyPetCode = function(code) {
    navigator.clipboard.writeText(code)
      .then(function() { if (typeof toast === 'function') toast('Cdigo copiado: ' + code); })
      .catch(function() { prompt('Cdigo:', code); });
  };

  window.sendPasswordReset = function(plateId) {
    var db2 = db(); if (!db2) return;
    db2.collection('pets').doc(plateId).get().then(function(doc) {
      if (!doc.exists) { if (typeof toast === 'function') toast('Placa no encontrada.'); return; }
      var d = doc.data();
      var email = d.ownerEmail || d.owner_email || d.email;
      if (!email) { if (typeof toast === 'function') toast('No hay email registrado para esta placa.'); return; }
      if (!confirm('Enviar enlace de recuperacin de contrasea a ' + email + '?')) return;
      if (typeof firebase === 'undefined') return;
      firebase.auth().sendPasswordResetEmail(email)
        .then(function() { if (typeof toast === 'function') toast('Correo enviado a ' + email + '.'); })
        .catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
    }).catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  /*  Focus on load  */
  document.addEventListener('DOMContentLoaded', function() {
    var inp = document.getElementById('login-pass');
    if (inp) inp.focus();
  });



  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE PEDIDOS Y PAGOS oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */
  

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE PASARELAS Y ENViOS oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */
  window.saveShippingConfig = function() {
    if (typeof toast === 'function') toast('Configuracin de DHL guardada (Simulada).');
    // Lgica para guardar las tarifas en Firebase
  };

  window.saveGatewayConfig = function() {
    if (typeof toast === 'function') toast('Configuracin de pasarelas guardada (Simulada).');
    // Lgica para guardar credenciales API en Firebase
  };

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE IMPRESION 360 oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */
  window.generatePrintLayout = function() {
    var container = document.getElementById('print-layout-container');
    var canvasArea = document.getElementById('print-canvas-area');
    if (!container || !canvasArea) return;
    container.style.display = 'block';
    canvasArea.innerHTML = '<div style="padding:40px;background:#f9f9f9;border:1px dashed #ccc;width:100%;color:#888;">Renderizando pliego segun Plan Maestro 360... (Proximamente)</div>';
  };

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE QR DE PAGO oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */
  var _qrFile = null;

  window.ptcgHandleQrUpload = function(file) {
    if (!file || !file.type.match(/^image\//)) { if (typeof toast === 'function') toast('Solo se permiten imagenes.'); return; }
    if (file.size > 2 * 1024 * 1024) { if (typeof toast === 'function') toast('Maximo 2 MB'); return; }
    _qrFile = file;
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = document.getElementById('ptcg-qr-preview-img');
      var prev = document.getElementById('ptcg-qr-preview');
      if (img) img.src = e.target.result;
      if (prev) prev.style.display = 'block';
    };
    reader.readAsDataURL(file);
  };

  window.ptcgSaveQr = function() {
    if (!_qrFile) { if (typeof toast === 'function') toast('Selecciona una imagen QR primero'); return; }
    var db2 = db(); if (!db2) { if (typeof toast === 'function') toast('Firebase no disponible'); return; }
    /* Use global storage() from petcingo.js to avoid duplicate Firebase app init */
    var storageSvc = (typeof storage === 'function') ? storage() : (function() { try { return firebase.storage(); } catch(e) { return null; } })();
    if (!storageSvc) { if (typeof toast === 'function') toast('Firebase Storage no disponible'); return; }
    var ref = storageSvc.ref('config/qr-pago-' + Date.now() + '.png');
    if (typeof toast === 'function') toast('Subiendo QR...');
    ref.put(_qrFile).then(function() {
      return ref.getDownloadURL();
    }).then(function(url) {
      return db2.collection('config').doc('bank_info').set({ qrImageUrl: url }, { merge: true })
        .then(function() {
          var img = document.getElementById('ptcg-qr-preview-img');
          var prev = document.getElementById('ptcg-qr-preview');
          if (img) img.src = url;
          if (prev) prev.style.display = 'block';
          _qrFile = null;
          if (typeof toast === 'function') toast('QR de pago guardado correctamente');
        });
    }).catch(function(e) { if (typeof toast === 'function') toast('Error al guardar QR: ' + e.message); });
  };

  window.ptcgRemoveQr = function() {
    var db2 = db(); if (!db2) return;
    db2.collection('config').doc('bank_info').set({ qrImageUrl: '' }, { merge: true }).then(function() {
      var prev = document.getElementById('ptcg-qr-preview');
      var img  = document.getElementById('ptcg-qr-preview-img');
      if (prev) prev.style.display = 'none';
      if (img) img.src = '';
      _qrFile = null;
      if (typeof toast === 'function') toast('QR eliminado');
    }).catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  /* Cargar QR guardado al iniciar */
  (function() {
    setTimeout(function() {
      var db2 = (typeof db === 'function') ? db() : null;
      if (!db2) return;
      db2.collection('config').doc('bank_info').get().then(function(doc) {
        if (!doc.exists) return;
        var url = doc.data().qrImageUrl;
        if (!url) return;
        var img  = document.getElementById('ptcg-qr-preview-img');
        var prev = document.getElementById('ptcg-qr-preview');
        if (img) img.src = url;
        if (prev) prev.style.display = 'block';
      }).catch(function() {});
    }, 1500);
  })();

  /* ==================================================================
     _runInitDashboard: punto de extension para petcingo.js
     Permite que petcingo.js llame a este hook despues de enterDashboard.
     NOTE: initDashboard() en petcingo.js ya ejecuta los modulos con
     setTimeout(800ms). Esta funcion es un respaldo para integraciones
     futuras o recarga de sesion sin login.
  ================================================================== */
  window._runInitDashboard = function(role, name) {
    var tries = 0;
    var poll = setInterval(function() {
      tries++;
      if (typeof initDashboard === 'function') {
        clearInterval(poll);
        /* initDashboard() ya carga los modulos nuevos internamente */
        try { initDashboard(); } catch(e) { console.error('[petcingo-dash] initDashboard err:', e); }
        /* Carga de respaldo con escalonado por si initDashboard no incluye el modulo */
        setTimeout(function() { if (typeof loadOrders      === 'function' && !window._ordersListenerActive)      loadOrders();      }, 600);
        setTimeout(function() { if (typeof loadCommissions === 'function' && !window._commissionsListenerActive) loadCommissions(); }, 700);
        setTimeout(function() { if (typeof loadProducts    === 'function' && !window._storeListenerActive)       loadProducts();    }, 800);
        setTimeout(function() { if (typeof loadPromotions  === 'function') loadPromotions();  }, 900);
        setTimeout(function() { if (typeof loadSiteConfig  === 'function') loadSiteConfig();  }, 1000);
        setTimeout(function() { if (typeof showInitialAlerts === 'function') showInitialAlerts(); }, 2200);
      }
      if (tries > 20) { clearInterval(poll); console.warn('[petcingo-dash] initDashboard no encontrado tras 3s'); }
    }, 150);
  };

})();