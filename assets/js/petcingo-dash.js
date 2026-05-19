(function() {
  'use strict';

  /* Restaurar sesion al recargar (F5/cierre de pestana)
     Si hay sesion activa: muestra el dashboard Y ejecuta initDashboard
     para cargar todos los modulos (Pedidos, Comisiones, Tienda, etc.) */
  (function() {
    if (!localStorage.getItem('pc_auth')) return;
    var loginEl = document.getElementById('login-screen');
    var dashEl  = document.getElementById('dashboard');
    if (loginEl) loginEl.style.display = 'none';
    if (dashEl)  dashEl.style.display  = 'block';
    /* Esperar a que petcingo.js haya definido initDashboard */
    var _tries = 0;
    var _poll = setInterval(function() {
      _tries++;
      if (typeof initDashboard === 'function') {
        clearInterval(_poll);
        try { initDashboard(); } catch(e) { console.error('[dash] initDashboard restore err:', e); }
      }
      if (_tries > 30) { clearInterval(_poll); console.warn('[dash] initDashboard no encontrado en restore'); }
    }, 100);
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
    if(btn){btn.disabled=true;btn.innerHTML='<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Exportando';}
    var db2 = db();
    if (!db2) { alert('Error: Firebase no esti listo.'); if(btn){btn.disabled=false;btn.innerHTML='<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Exportar Backup Completo';} return; }
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
      if(btn){btn.disabled=false;btn.innerHTML='<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Exportar Backup Completo';}
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

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE AUDITORiA: archiveLogsToBucket oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */
  // Archivar logs antiguos (consolidar por mes en un solo documento)
  window.archiveLogsToBucket = function() {
    var thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    var archiveMonth = thirtyDaysAgo.getFullYear() + '-' + String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0');

    if (!confirm('Esto consolidara los logs de mas de 30 dias en un documento de archivo (' + archiveMonth + '). Los logs del mes actual se conservan intactos. ¿Continuar?')) return;

    db().collection('logs').where('timestamp', '<', thirtyDaysAgo).get()
      .then(function(snap) {
        if (snap.empty) {
          if (typeof showDashAlert === 'function') showDashAlert('No hay logs antiguos para archivar.', 'info');
          else if (typeof toast === 'function') toast('No hay logs antiguos para archivar.');
          return;
        }
        var logsArray = [];
        snap.forEach(function(doc) {
          logsArray.push(doc.data());
        });

        // Guardar en un solo documento de archivo
        return db().collection('logs_archive').doc(archiveMonth).set({
          logs: logsArray,
          count: logsArray.length,
          archivedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
          // Eliminar los documentos originales
          var batch = db().batch();
          snap.forEach(function(doc) { batch.delete(doc.ref); });
          return batch.commit();
        });
      })
      .then(function() {
        if (typeof showDashAlert === 'function') showDashAlert('Logs archivados correctamente en logs_archive/' + archiveMonth + '.', 'success');
        else if (typeof toast === 'function') toast('Logs archivados correctamente.');
        if (typeof loadStorageStats === 'function') loadStorageStats();
      })
      .catch(function(e) {
        if (typeof showDashAlert === 'function') showDashAlert('Error al archivar: ' + e.message, 'danger');
        else if (typeof toast === 'function') toast('Error al archivar: ' + e.message);
      });
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
      
      var LBL = 'font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;';
      var VAL = 'font-family:\'Plus Jakarta Sans\',sans-serif;';
      var dateLabel = '-';
      if (d.createdAt) {
        var tsD = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
        dateLabel = tsD.toLocaleString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
      var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="' + LBL + '">Comprador</span><br><strong style="' + VAL + '">' + escFn(d.buyer ? d.buyer.name  : d.buyerName || '') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="' + LBL + '">Telefono</span><br><strong style="'  + VAL + '">' + escFn(d.buyer ? d.buyer.phone : d.phone    || '') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="' + LBL + '">Email</span><br><strong style="'     + VAL + '">' + escFn(d.buyer ? d.buyer.email : d.email    || '') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="' + LBL + '">Plan</span><br><strong style="'      + VAL + '">' + escFn(d.planName || '') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="' + LBL + '">Total</span><br><strong style="'     + VAL + 'color:#4552CC;">' + (d.total || 0) + ' Bs</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="' + LBL + '">Metodo</span><br><strong style="'    + VAL + '">' + escFn(d.paymentMethod || '') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="' + LBL + '">Direccion</span><br><strong style="' + VAL + '">' + escFn(d.buyer ? d.buyer.address : d.address || '') + '</strong></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;"><span style="' + LBL + '">Estado</span><br><span class="status-badge ' + (d.status || 'pending') + '" style="' + VAL + '">' + (d.status || 'pending').toUpperCase() + '</span></div>';
      html += '<div style="background:#F8F9FB;padding:10px 12px;border-radius:8px;grid-column:span 2;"><span style="' + LBL + '">Fecha del pedido</span><br><strong style="' + VAL + '">' + dateLabel + '</strong></div>';
      html += '</div>';

      if (d.receiptUrl) {
        html += '<div style="margin-bottom:16px;">';
        html += '<span style="' + LBL + 'display:block;margin-bottom:8px;">Comprobante de pago</span>';
        html += '<a href="' + d.receiptUrl + '" target="_blank">';
        html += '<img id="verify-proof-img" src="' + d.receiptUrl + '" style="width:100%;max-height:300px;object-fit:contain;border-radius:12px;border:1px solid #E0E0E0;cursor:pointer;" alt="Comprobante" onerror="this.style.display=\'none\'">';
        html += '</a>';
        html += '<a href="' + d.receiptUrl + '" target="_blank" style="' + VAL + 'display:block;text-align:center;margin-top:6px;font-size:0.8rem;color:#4552CC;font-weight:600;">Ver imagen completa</a>';
        html += '</div>';
      } else {
        html += '<div style="margin-bottom:16px;padding:12px 16px;background:#FAFAFA;border-radius:10px;border:1px solid #E0E0E0;">';
        html += '<span style="' + LBL + 'display:block;margin-bottom:6px;">Comprobante de pago</span>';
        html += '<em style="' + VAL + 'color:#BDBDBD;font-size:0.88rem;">Sin comprobante</em>';
        html += '</div>';
      }
      
      if (d.activationCode) {
        html += '<div style="background:#EEF1FB;padding:10px 14px;border-radius:10px;margin-bottom:12px;text-align:center;">';
        html += '<span style="font-size:0.7rem;color:#9E9E9E;">Codigo de activacion</span><br>';
        html += '<strong style="font-family:monospace;font-size:1.2rem;color:#4552CC;">' + d.activationCode + '</strong>';
        html += '</div>';
      }
      
      content.innerHTML = html;

      var proofImg = document.getElementById('verify-proof-img');
      if (proofImg) {
        proofImg.style.cursor = 'zoom-in';
        proofImg.onclick = function(e) {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          var overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
          overlay.onclick = function() { overlay.remove(); };
          var img = document.createElement('img');
          img.src = proofImg.src;
          img.style.cssText = 'max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;';
          overlay.appendChild(img);
          document.body.appendChild(overlay);
          return false;
        };
      }
      
      var btnsHtml = '';
      if (d.status === 'pending') {
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--success" style="flex:1;" onclick="verifyOrderApprove(\'' + orderId + '\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-check-circle-bold.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Aceptar pago</button>';
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--danger" style="flex:1;" onclick="verifyOrderReject(\'' + orderId + '\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-close-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Rechazar</button>';
      } else if (d.status === 'confirmed') {
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--primary" style="flex:1;" onclick="markAsProcessing(\'' + orderId + '\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Marcar en preparacion</button>';
      } else if (d.status === 'processing') {
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--primary" style="flex:1;" onclick="openShippingForm(\'' + orderId + '\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-delivery-bold.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Registrar envio</button>';
      } else if (d.status === 'shipped') {
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--success" style="flex:1;" onclick="markAsDelivered(\'' + orderId + '\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Marcar entregado</button>';
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

  /* -- changeOrderStatus: wrapper generico --------------------------------- */
  window.changeOrderStatus = function(orderId, newStatus) {
    if (!orderId || !newStatus) return;
    var updates = { status: newStatus, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    var tsMap = { processing:'processingAt', shipped:'shippedAt', delivered:'deliveredAt', cancelled:'cancelledAt', confirmed:'verifiedAt' };
    if (tsMap[newStatus]) updates[tsMap[newStatus]] = firebase.firestore.FieldValue.serverTimestamp();
    db().collection('orders').doc(orderId).update(updates)
      .then(function() {
        closeVerifyModal();
        if (typeof toast === 'function') toast('Estado actualizado: ' + newStatus);
        loadOrders();
      })
      .catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  /* -- cancelOrder: cancelacion con motivo y flag de reembolso ------------- */
  window.cancelOrder = function(orderId, isPaid, reason) {
    var db2 = db();
    var updates = {
      status: 'cancelled',
      cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
      cancelReason: reason || ''
    };
    if (isPaid) updates.refunded = true;
    db2.collection('orders').doc(orderId).update(updates)
      .then(function() {
        /* Cerrar modal de cancelacion si esta abierto */
        var m = document.getElementById('cancel-order-modal');
        if (m) m.style.display = 'none';
        closeVerifyModal();
        if (typeof toast === 'function') toast((isPaid ? 'Pedido cancelado -- pendiente de reembolso.' : 'Pedido cancelado.'));
        if (typeof showDashAlert === 'function' && isPaid) showDashAlert('Pedido ' + orderId.substring(0,8) + '... cancelado. Reembolso pendiente.', 'warning', 'solar-money-bold.svg');
        loadOrders();
      })
      .catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  /* -- openCancelModal: abre modal de cancelacion -------------------------- */
  window.openCancelModal = function(orderId, isPaid) {
    var m = document.getElementById('cancel-order-modal');
    if (!m) return;
    document.getElementById('cancel-order-id').value   = orderId;
    document.getElementById('cancel-order-paid').value = isPaid ? '1' : '0';
    document.getElementById('cancel-order-reason').value = '';
    m.style.display = 'flex';
  };
  window.closeCancelModal = function() {
    var m = document.getElementById('cancel-order-modal');
    if (m) m.style.display = 'none';
  };
  window.submitCancelOrder = function() {
    var orderId = document.getElementById('cancel-order-id').value;
    var isPaid  = document.getElementById('cancel-order-paid').value === '1';
    var reason  = document.getElementById('cancel-order-reason').value.trim();
    if (!orderId) return;
    cancelOrder(orderId, isPaid, reason);
  };

  window.printShippingGuide = function(orderId) {
    var order = _ordersCache.find(function(o) { return o.id === orderId; });
    if (!order) { toast('Pedido no encontrado.'); return; }
    var d            = order.data;
    var buyerName    = escFn(d.buyer ? d.buyer.name    : d.buyerName || '');
    var buyerPhone   = escFn(d.buyer ? d.buyer.phone   : d.phone     || '');
    var buyerEmail   = escFn(d.buyer ? d.buyer.email   : d.email     || '');
    var buyerCity    = escFn(d.buyer ? d.buyer.city    : d.city      || '');
    var buyerAddress = escFn(d.buyer ? d.buyer.address : d.address   || '');
    var buyerNotes   = escFn(d.buyer ? d.buyer.notes   : d.notes     || '');
    var dateStr      = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
    var qrTarget     = d.trackingNumber
      ? 'https://www.boliviapost.bo/?tracking=' + encodeURIComponent(d.trackingNumber)
      : 'https://petcingo.com.bo';

    var css = [
      '*{box-sizing:border-box;margin:0;padding:0;}',
      'body{font-family:"Plus Jakarta Sans",sans-serif;background:#fff;color:#212121;padding:32px 40px;}',
      '.hdr{display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:3px solid #4552CC;margin-bottom:24px;}',
      '.hdr-title{font-family:"Sora",sans-serif;font-size:1.6rem;font-weight:800;color:#4552CC;letter-spacing:0.01em;}',
      '.hdr-meta{font-size:0.8rem;color:#9E9E9E;margin-top:4px;}',
      '.hdr-logo{height:36px;}',
      '.body-grid{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;}',
      'table{width:100%;border-collapse:collapse;font-size:0.88rem;}',
      'tr:nth-child(even) th,tr:nth-child(even) td{background:#F8F9FF;}',
      'tr:nth-child(odd)  th,tr:nth-child(odd)  td{background:#fff;}',
      'th{padding:10px 14px;font-weight:700;color:#4552CC;width:32%;border:1px solid #E0E8F0;text-align:left;}',
      'td{padding:10px 14px;border:1px solid #E0E8F0;}',
      '.code-box{background:#EEF1FB;border:1.5px solid #4552CC;border-radius:10px;padding:12px 18px;text-align:center;margin-top:16px;}',
      '.code-lbl{font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;}',
      '.code-val{font-family:monospace;font-size:1.4rem;font-weight:800;color:#4552CC;letter-spacing:0.12em;}',
      '.qr-box{text-align:center;padding:14px;border:1px solid #E0E8F0;border-radius:12px;min-width:148px;}',
      '.qr-lbl{font-size:0.7rem;color:#757575;margin-top:8px;}',
      '.btn-print{display:block;margin:24px auto 0;background:#4552CC;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-family:"Plus Jakarta Sans",sans-serif;font-size:0.9rem;font-weight:700;cursor:pointer;}',
      '.footer{margin-top:24px;padding-top:12px;border-top:1px solid #E0E0E0;text-align:center;font-size:0.72rem;color:#BDBDBD;}',
      '@media print{.btn-print{display:none!important;}body{padding:16px 20px;}}'
    ].join('\n');

    var rows = '<table>'
      + '<tr><th>Comprador</th><td>'    + buyerName    + '</td></tr>'
      + '<tr><th>Telefono</th><td>'     + buyerPhone   + '</td></tr>'
      + '<tr><th>Email</th><td>'        + buyerEmail   + '</td></tr>'
      + '<tr><th>Ciudad</th><td>'       + buyerCity    + '</td></tr>'
      + '<tr><th>Direccion</th><td>'    + buyerAddress + '</td></tr>'
      + '<tr><th>Plan</th><td>'         + escFn(d.planName || '')                           + '</td></tr>'
      + '<tr><th>Tipo de envio</th><td>'+ escFn(d.shippingType || d.deliveryType || '')     + '</td></tr>'
      + '<tr><th>Tracking</th><td>'     + escFn(d.trackingNumber || '---')                  + '</td></tr>'
      + '<tr><th>Notas</th><td>'        + buyerNotes   + '</td></tr>'
      + '</table>'
      + '';

    var win = window.open('', '_blank', 'width=820,height=700');
    win.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
      + '<title>Guia de Envio Petcingo</title>'
      + '<link href="https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">'
      + '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
      + '<style>' + css + '</style></head><body>'
      + '<div class="hdr">'
      + '<div><div class="hdr-title">GUIA DE ENVIO</div>'
      + '<div class="hdr-meta">Pedido: <strong>' + escFn(orderId) + '</strong> &nbsp;|&nbsp; ' + dateStr + '</div></div>'
      + '<img class="hdr-logo" src="https://prueb2.dashnexpages.net/assets/images/logo/PETCINGO_DARK.svg" alt="Petcingo" onerror="this.style.display=\'none\'">'
      + '</div>'
      + '<div class="body-grid">'
      + '<div>' + rows + '</div>'
      + '<div class="qr-box"><div id="qr-wrap"></div><div class="qr-lbl">Escanea para activar</div></div>'
      + '</div>'
      + '<button class="btn-print" onclick="window.print()">Imprimir guia</button>'
      + '<div class="footer">Petcingo &mdash; Sistema de Identificacion de Mascotas | petcingo.com.bo</div>'
      + '<script>window.addEventListener("load",function(){'
      + 'var el=document.getElementById("qr-wrap");'
      + 'if(el&&typeof QRCode!=="undefined"){'
      + 'new QRCode(el,{text:"' + qrTarget + '",width:120,height:120,colorDark:"#4552CC",colorLight:"#ffffff"});'
      + '}'
      + '});<\/script>'
      + '</body></html>');
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
        showDashAlert('Tienes ' + newO + ' pedido(s) pendiente(s) de verificacion.', 'warning', 'solar-cart-bold.svg');
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
        acciones += '<button class="ptcg-index__btn ptcg-index__btn--success btn-sm" onclick="openVerifyModal(\'' + o.id + '\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Verificar pago</button> ';
      } else {
        acciones += '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="openVerifyModal(\'' + o.id + '\')" title="Ver detalles"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-eye-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""></button> ';
      }
      
      if (status !== 'pending' && status !== 'rejected') {
        acciones += '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="printShippingGuide(\'' + o.id + '\')" title="Imprimir gua"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-printer-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""></button> ';
      }
      
      acciones += '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" style="color:' + (isUrgent ? '#f44336' : '#757575') + '" onclick="toggleUrgent(\'' + o.id + '\',' + isUrgent + ')" title="' + (isUrgent ? 'Quitar urgente' : 'Marcar urgente') + '"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""></button>';

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
          (status === 'pendiente' ? '<button class="ptcg-index__btn ptcg-index__btn--success btn-sm" onclick="openPaymentModal(\'' + c.id + '\')" style="margin-right:4px;"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-check-circle-bold.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Pagar</button>' : '') +
          '<button class="ptcg-index__btn ptcg-index__btn--danger btn-sm" onclick="deleteCommission(\'' + c.id + '\')"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""></button>' +
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
    if (btn) { btn.disabled = true; btn.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Guardando'; }
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
      if (btn) { btn.disabled = false; btn.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-check-circle-bold.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Confirmar pago'; }
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
          '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="editProduct(\'' + p.id + '\')" style="margin-right:4px;" title="Editar"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-edit-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""></button>' +
          '<button class="ptcg-index__btn ptcg-index__btn--danger btn-sm" onclick="deleteProduct(\'' + p.id + '\')" title="Eliminar"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""></button>' +
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
    if (btn) { btn.disabled = true; btn.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Guardando'; }

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
      if (btn) { btn.disabled = false; btn.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Guardar producto'; }
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
          '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="editPromotion(\'' + p.id + '\')" style="margin-right:4px;" title="Editar"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-edit-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""></button>' +
          '<button class="ptcg-index__btn ptcg-index__btn--danger btn-sm" onclick="deletePromotion(\'' + p.id + '\')" title="Eliminar"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""></button>' +
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
    if (btn) { btn.disabled = true; btn.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Guardando'; }

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
      if (btn) { btn.disabled = false; btn.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Guardar cdigo'; }
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
    var iconSrc = (icon && icon.indexOf('solar-') === 0) ? icon : 'solar-bell-bold.svg';
    var alertFilter = 'filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)';
    if (type === 'success') alertFilter = 'filter:invert(60%) sepia(90%) saturate(400%) hue-rotate(80deg) brightness(95%) contrast(85%)';
    else if (type === 'danger') alertFilter = 'filter:invert(30%) sepia(90%) saturate(2000%) hue-rotate(340deg) brightness(90%) contrast(95%)';
    else if (type === 'warning') alertFilter = 'filter:invert(60%) sepia(90%) saturate(800%) hue-rotate(0deg) brightness(100%) contrast(95%)';
    el.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/' + iconSrc + '" width="18" height="18" style="' + alertFilter + ';flex-shrink:0" alt=""><span>' + msg + '</span>';
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

  /* Sobrescribe toast() de petcingo.js para usar Liquid Glass en el dashboard */
  window.toast = function(msg, type) {
    var alertType = type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info';
    if (typeof showDashAlert === 'function') {
      showDashAlert(msg, alertType);
    } else {
      var el = document.getElementById('toast');
      if (el) { el.textContent = msg; el.classList.add('show'); }
    }
  };

  function showInitialAlerts() {
    setTimeout(function() {
      var ordersBadge = document.getElementById('orders-nav-badge');
      if (ordersBadge && ordersBadge.textContent.trim()) {
        showDashAlert(ordersBadge.textContent.trim() + ' pedido(s) pendiente(s) de atencin.', 'warning', 'solar-cart-bold.svg');
      }
      var commBadge = document.getElementById('commissions-nav-badge');
      if (commBadge && commBadge.textContent.trim()) {
        showDashAlert(commBadge.textContent.trim() + ' comisin(es) por pagar.', 'danger', 'solar-money-bold.svg');
      }
      var storeBadge = document.getElementById('store-nav-badge');
      if (storeBadge && storeBadge.textContent.trim()) {
        showDashAlert('Stock bajo en ' + storeBadge.textContent.trim() + ' producto(s).', 'warning', 'solar-shop-bold.svg');
      }
      var lostBadge = document.getElementById('lost-nav-badge');
      if (lostBadge && lostBadge.textContent.trim()) {
        showDashAlert(lostBadge.textContent.trim() + ' mascota(s) perdida(s) activa(s).', 'danger', 'solar-heart-linear.svg');
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
    if (btn) { btn.disabled = true; btn.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Guardando'; }
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
        if (btn) { btn.disabled = false; btn.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Guardar datos'; }
      });
  };

  window.saveSiteConfig = function() {
    var db2 = db(); if (!db2) return;
    var btn    = document.getElementById('btn-save-cfg');
    var status = document.getElementById('cfg-save-status');
    if (btn) { btn.disabled = true; btn.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Guardando'; }
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
        if (typeof toast === 'function') toast('Configuracion guardada correctamente.');
        if (status) { status.textContent = 'Guardado'; status.style.color = '#2ECC71'; status.style.display = 'inline'; setTimeout(function() { status.style.display = 'none'; }, 4000); }
        var lastUpd = document.getElementById('cfg-last-updated');
        if (lastUpd) lastUpd.textContent = 'Ultima edicion: ahora';
        var iframe = document.getElementById('customize-preview');
        if (iframe) iframe.src = iframe.src;
      })
      .catch(function(e) {
        if (typeof toast === 'function') toast('Error al guardar: ' + e.message);
        if (status) { status.textContent = 'Error al guardar'; status.style.color = '#E74C3C'; status.style.display = 'inline'; }
      })
      .finally(function() {
        if (btn) { btn.disabled = false; btn.innerHTML = '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Guardar cambios'; }
      });
  };

  window.syncAdoptions = function() {
    if (typeof toast === 'function') toast('Sincronizacion de adopciones en desarrollo.');
  };

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE MODAL DETALLE MASCOTA oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */

  function infoItem(label, value) {
    return '<div style="display:flex;flex-direction:column;gap:2px;"><span style="font-size:0.7rem;color:#9E9E9E;text-transform:uppercase;font-family:\'Plus Jakarta Sans\',sans-serif;">' + escFn(label) + '</span><span style="font-weight:600;font-size:0.9rem;font-family:\'Plus Jakarta Sans\',sans-serif;">' + escFn(value || '---') + '</span></div>';
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

      /* Foto + codigo */
      html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">';
      html += d.photoUrl
        ? '<img src="' + escFn(d.photoUrl) + '" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid #E0E0E0;flex-shrink:0;" onerror="this.style.display=\'none\'">'
        : '<div style="width:72px;height:72px;border-radius:50%;background:#EEF1FB;display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0;">E</div>';
      html += '<div><div style="font-family:monospace;font-size:0.9rem;font-weight:700;color:#4552CC;word-break:break-all;">' + escFn(plateId) + '</div>';
      html += '<button onclick="copyPetCode(\'' + safe + '\')" style="margin-top:4px;padding:4px 10px;border-radius:8px;border:1px solid #E0E0E0;background:#fff;cursor:pointer;font-size:0.75rem;font-family:\'Plus Jakarta Sans\',sans-serif;display:inline-flex;align-items:center;gap:4px;"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Copiar codigo</button></div></div>';

      /* Datos basicos */
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">';
      html += infoItem('Especie',   d.species || d.petType);
      html += infoItem('Raza',      d.breed);
      html += infoItem('Genero',    d.gender);
      html += infoItem('Peso',      d.weight ? d.weight + ' kg' : null);
      html += infoItem('Nacimiento', d.birthdate);
      html += infoItem('Color',     d.color);
      html += infoItem('Comportamiento', d.behavior);
      html += infoItem('Estado',    d.status);
      html += '</div>';

      /* Dueno */
      if (d.ownerName || d.ownerEmail) {
        html += '<div style="padding:12px 14px;background:#F8F9FB;border-radius:12px;margin-bottom:16px;">';
        html += '<div style="font-size:0.72rem;color:#9E9E9E;text-transform:uppercase;margin-bottom:8px;font-family:\'Plus Jakarta Sans\',sans-serif;">Dueno</div>';
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
          html += '<a href="https://wa.me/' + p.num.replace(/\D/g,'') + '" target="_blank" rel="noopener" style="color:#25D366;text-decoration:none;font-weight:700;font-size:0.82rem;display:flex;align-items:center;gap:4px;"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-chat-round-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> WhatsApp</a>';
          html += '</div>';
        });
        html += '</div>';
      }

      /* Vacunas */
      html += '<div style="padding:12px 14px;background:#F8F9FB;border-radius:12px;margin-bottom:16px;">';
      html += '<div style="font-size:0.72rem;color:#9E9E9E;text-transform:uppercase;margin-bottom:6px;font-family:\'Plus Jakarta Sans\',sans-serif;">Vacunas</div>';
      html += '<span style="font-size:0.9rem;font-weight:600;">' + (d.vaccinationStatus === 'yes' ? 'Si, al dia' : 'No al dia / Sin datos') + '</span>';
      if (d.vaccinationDetails) html += '<br><small style="color:#757575;">' + escFn(d.vaccinationDetails) + '</small>';
      html += '</div>';

      /* Mensaje */
      if (d.message) html += '<div style="background:#FFF9E6;border-radius:12px;padding:12px 14px;margin-bottom:16px;font-style:italic;color:#616161;font-size:0.88rem;">"' + escFn(d.message) + '"</div>';

      /* Accion: recuperar clave */
      html += '<button class="ptcg-index__btn ptcg-index__btn--primary" onclick="sendPasswordReset(\'' + safe + '\')" style="width:100%;margin-top:8px;padding:12px;font-size:0.9rem;font-weight:700;">';
      html += '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Enviar recuperacion de contrasena</button>';

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
      .then(function() { if (typeof toast === 'function') toast('Codigo copiado: ' + code); })
      .catch(function() { prompt('Codigo de activacion:', code); });
  };

  window.copyPetCode = function(code) {
    navigator.clipboard.writeText(code)
      .then(function() { if (typeof toast === 'function') toast('Codigo copiado: ' + code); })
      .catch(function() { prompt('Codigo:', code); });
  };

  window.sendPasswordReset = function(plateId) {
    var db2 = db(); if (!db2) return;
    db2.collection('pets').doc(plateId).get().then(function(doc) {
      if (!doc.exists) { if (typeof toast === 'function') toast('Placa no encontrada.'); return; }
      var d = doc.data();
      var email = d.ownerEmail || d.owner_email || d.email;
      if (!email) { if (typeof toast === 'function') toast('No hay email registrado para esta placa.'); return; }
      if (!confirm('Enviar enlace de recuperacion de contrasena a ' + email + '?')) return;
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
  

  window.saveShippingConfig = function() {
    var dhlBase = parseFloat(document.getElementById('cfg-dhl-base') ? document.getElementById('cfg-dhl-base').value : 0) || 0;
    var dhlKg   = parseFloat(document.getElementById('cfg-dhl-kg')   ? document.getElementById('cfg-dhl-kg').value   : 0) || 0;
    var db2 = db(); if (!db2) return;
    db2.collection('config').doc('shipping_rates').set({
      dhl_base: dhlBase,
      dhl_per_kg: dhlKg,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(function() {
      if (typeof toast === 'function') toast('Tarifas DHL guardadas.');
    }).catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  /* -- loadShippingRates: tarifas de envio por ciudad boliviana ------------ */
  window.loadShippingRates = function() {
    var db2 = db(); if (!db2) return;
    db2.collection('config').doc('shipping_rates').get().then(function(doc) {
      if (!doc.exists) return;
      var d = doc.data();
      function setVal(id, val) { var el = document.getElementById(id); if (el && val != null) el.value = String(val); }
      setVal('cfg-ship-scz',       d.santa_cruz);
      setVal('cfg-ship-lpb',       d.la_paz);
      setVal('cfg-ship-cbba',      d.cochabamba);
      setVal('cfg-ship-resto',     d.resto);
      setVal('cfg-ship-pickup',    d.pickup);
      setVal('cfg-ship-intl-usd',  d.internacional_usd);
      setVal('cfg-dhl-base',       d.dhl_base);
      setVal('cfg-dhl-kg',         d.dhl_per_kg);
    }).catch(function() {});
  };

  /* -- saveShippingRates: guarda tarifas por ciudad ----------------------- */
  window.saveShippingRates = function() {
    function numVal(id) { var el = document.getElementById(id); return el ? (parseFloat(el.value) || 0) : 0; }
    var db2 = db(); if (!db2) return;
    var rates = {
      santa_cruz:       numVal('cfg-ship-scz'),
      la_paz:           numVal('cfg-ship-lpb'),
      cochabamba:       numVal('cfg-ship-cbba'),
      resto:            numVal('cfg-ship-resto'),
      pickup:           numVal('cfg-ship-pickup'),
      internacional_usd: numVal('cfg-ship-intl-usd'),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    db2.collection('config').doc('shipping_rates').set(rates, { merge: true })
      .then(function() {
        if (typeof toast === 'function') toast('Tarifas de envio guardadas.');
        if (typeof showDashAlert === 'function') showDashAlert('Tarifas de envio actualizadas correctamente.', 'success', 'solar-delivery-bold.svg');
      })
      .catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  window.saveGatewayConfig = function() {
    if (typeof toast === 'function') toast('Configuracion de pasarelas guardada (Simulada).');
    // Logica para guardar credenciales API en Firebase
  };

  /* -- Tarifas de Envío Internacional por País (ISO 2-letter mapping) ------- */

  function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    try {
      var codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(function(char) { return 127397 + char.charCodeAt(0); });
      return String.fromCodePoint.apply(String, codePoints);
    } catch (e) {
      return '🌐';
    }
  }

  window.addIntlShippingRowToTable = function(countryCode, cost) {
    var tbody = document.getElementById('intl-shipping-tbody');
    if (!tbody) return;

    // Clear empty state if it's there
    var emptyStateRow = tbody.querySelector('.empty-state');
    if (emptyStateRow && emptyStateRow.parentNode && emptyStateRow.parentNode.parentNode) {
      tbody.innerHTML = '';
    }

    var codeUpper = countryCode.toUpperCase();
    var flag = getFlagEmoji(codeUpper);

    var tr = document.createElement('tr');
    tr.dataset.country = codeUpper;
    
    var html = '';
    html += '<td style="font-weight:600;font-family:\'Plus Jakarta Sans\',sans-serif;display:flex;align-items:center;gap:8px;border:none;padding:12px 14px;">' + flag + ' ' + codeUpper + '</td>';
    html += '<td><input type="number" class="ptcg-activate__input intl-cost" value="' + (parseFloat(cost) || 0).toFixed(2) + '" step="0.01" min="0" style="width:100px;padding:6px 10px;"></td>';
    html += '<td style="text-align:center;"><button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="this.parentNode.parentNode.remove(); checkIntlShippingTableEmpty();" style="color:#f43f5e;border-color:#FFCDD2;"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""></button></td>';
    tr.innerHTML = html;
    tbody.appendChild(tr);
  };

  window.checkIntlShippingTableEmpty = function() {
    var tbody = document.getElementById('intl-shipping-tbody');
    if (!tbody) return;
    if (tbody.children.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3"><div class="empty-state">No hay tarifas internacionales configuradas.</div></td></tr>';
    }
  };

  window.addIntlShippingRateRow = function() {
    var countryEl = document.getElementById('new-intl-country');
    var costEl = document.getElementById('new-intl-cost');
    if (!countryEl || !costEl) return;

    var country = countryEl.value.trim().toUpperCase();
    var cost = parseFloat(costEl.value);

    if (!country || country.length !== 2 || !/^[A-Z]{2}$/.test(country)) {
      if (typeof toast === 'function') toast('El código de país debe ser exactamente de 2 letras.');
      return;
    }

    if (isNaN(cost) || cost < 0) {
      if (typeof toast === 'function') toast('El costo debe ser un número válido mayor o igual a 0.');
      return;
    }

    // Check if country already exists in table
    var tbody = document.getElementById('intl-shipping-tbody');
    if (tbody && tbody.querySelector('tr[data-country="' + country + '"]')) {
      if (typeof toast === 'function') toast('Ya existe una tarifa para ' + country + '. Puedes editarla directamente.');
      return;
    }

    window.addIntlShippingRowToTable(country, cost);
    countryEl.value = '';
    costEl.value = '';
  };

  window.loadIntlShippingRates = function() {
    var db2 = db(); if (!db2) return;
    var tbody = document.getElementById('intl-shipping-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div></td></tr>';

    db2.collection('siteConfig').doc('internationalShipping').get()
      .then(function(doc) {
        if (!tbody) return;
        tbody.innerHTML = '';
        if (doc.exists) {
          var d = doc.data() || {};
          var keys = Object.keys(d).sort();
          keys.forEach(function(key) {
            // Skip updatedAt or any other metadata field if it's there
            if (key === 'updatedAt') return;
            window.addIntlShippingRowToTable(key, d[key]);
          });
        }
        window.checkIntlShippingTableEmpty();
      })
      .catch(function(e) {
        console.error('Error al cargar tarifas internacionales: ', e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="3"><div class="empty-state">Error al cargar tarifas.</div></td></tr>';
      });
  };

  window.saveIntlShippingRates = function() {
    var db2 = db(); if (!db2) return;
    var tbody = document.getElementById('intl-shipping-tbody');
    if (!tbody) return;

    var data = {};
    var rows = tbody.querySelectorAll('tr[data-country]');
    for (var i = 0; i < rows.length; i++) {
      var country = rows[i].dataset.country;
      var costIn = rows[i].querySelector('.intl-cost');
      if (country && costIn) {
        data[country] = parseFloat(costIn.value) || 0;
      }
    }

    data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    db2.collection('siteConfig').doc('internationalShipping').set(data)
      .then(function() {
        if (typeof toast === 'function') toast('Tarifas internacionales guardadas con éxito.');
        if (typeof showDashAlert === 'function') showDashAlert('Tarifas internacionales de envío actualizadas.', 'success', 'solar-global-linear.svg');
      })
      .catch(function(e) {
        if (typeof toast === 'function') toast('Error al guardar tarifas internacionales: ' + e.message);
      });
  };

  /* -- Envios avanzados: nacionales e internacionales ----------------------- */

  window.toggleShippingTypeView = function() {
    var sel = document.getElementById('shipping-type-select');
    var flatBox = document.getElementById('shipping-flat-rate-box');
    var rangesBox = document.getElementById('shipping-ranges-box');
    if (!sel || !flatBox || !rangesBox) return;
    if (sel.value === 'nacional') {
      flatBox.style.display = 'block';
      rangesBox.style.display = 'none';
    } else {
      flatBox.style.display = 'none';
      rangesBox.style.display = 'block';
    }
  };

  window.addShippingRangeRow = function(min, max, cost) {
    var tbody = document.getElementById('shipping-ranges-tbody');
    if (!tbody) return;
    
    var minVal = (min !== undefined) ? min : 0;
    var maxVal = (max !== undefined) ? max : 5;
    var costVal = (cost !== undefined) ? cost : 10;
    
    var tr = document.createElement('tr');
    var html = '';
    html += '<td><input type="number" class="ptcg-activate__input range-min" value="' + minVal + '" step="0.1" style="width:100%;padding:6px 10px;"></td>';
    html += '<td><input type="number" class="ptcg-activate__input range-max" value="' + maxVal + '" step="0.1" style="width:100%;padding:6px 10px;"></td>';
    html += '<td><input type="number" class="ptcg-activate__input range-cost" value="' + costVal + '" step="0.1" style="width:100%;padding:6px 10px;"></td>';
    html += '<td style="text-align:center;"><button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="this.parentNode.parentNode.remove()" style="color:#f43f5e;border-color:#FFCDD2;"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-trash-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""></button></td>';
    tr.innerHTML = html;
    tbody.appendChild(tr);
  };

  window.saveShippingSettings = function() {
    var sel = document.getElementById('shipping-type-select');
    if (!sel) return;
    
    var type = sel.value;
    var data = {
      type: type,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (type === 'nacional') {
      var flatEl = document.getElementById('shipping-flat-rate');
      data.flatRate = flatEl ? (parseFloat(flatEl.value) || 0) : 0;
    } else {
      var rates = [];
      var rows = document.querySelectorAll('#shipping-ranges-tbody tr');
      for (var i = 0; i < rows.length; i++) {
        var minIn = rows[i].querySelector('.range-min');
        var maxIn = rows[i].querySelector('.range-max');
        var costIn = rows[i].querySelector('.range-cost');
        if (minIn && maxIn && costIn) {
          rates.push({
            min: parseFloat(minIn.value) || 0,
            max: parseFloat(maxIn.value) || 0,
            cost: parseFloat(costIn.value) || 0
          });
        }
      }
      data.rates = rates;
    }
    
    var db2 = db(); if (!db2) return;
    db2.collection('config').doc('shipping_settings').set(data, { merge: true })
      .then(function() {
        if (typeof toast === 'function') toast('Configuracion de envios guardada.');
      })
      .catch(function(e) {
        if (typeof toast === 'function') toast('Error al guardar: ' + e.message);
      });
  };

  window.loadShippingSettings = function() {
    var db2 = db(); if (!db2) return;
    db2.collection('config').doc('shipping_settings').get()
      .then(function(doc) {
        var sel = document.getElementById('shipping-type-select');
        var flatEl = document.getElementById('shipping-flat-rate');
        var tbody = document.getElementById('shipping-ranges-tbody');
        if (!sel) return;
        
        if (tbody) tbody.innerHTML = '';
        
        if (doc.exists) {
          var d = doc.data();
          sel.value = d.type || 'nacional';
          if (flatEl && d.flatRate !== undefined) {
            flatEl.value = d.flatRate;
          }
          if (d.rates && d.rates.forEach && tbody) {
            d.rates.forEach(function(r) {
              window.addShippingRangeRow(r.min, r.max, r.cost);
            });
          }
        } else {
          sel.value = 'nacional';
          if (flatEl) flatEl.value = '25';
        }
        
        window.toggleShippingTypeView();
      })
      .catch(function(e) {
        console.error('Error al cargar configuracion de envios: ', e);
      });
  };

  /* oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE IMPRESION 360 oEoEoEoEoEoEoEoEoEoEoEoEoEoEoE */

  var _printSelection = {};

  /* Lee la configuracion actual del panel de diseno */
  function getPrintConfig() {
    var type    = (document.getElementById('print-plate-type')  || {}).value  || 'vertical';
    var svgUrl  = ((document.getElementById('print-svg-url')    || {}).value  || '').trim();
    var qrX     = parseFloat((document.getElementById('print-qr-x')    || {}).value) || 4;
    var qrY     = parseFloat((document.getElementById('print-qr-y')    || {}).value) || 14;
    var qrSize  = parseFloat((document.getElementById('print-qr-size') || {}).value) || 20;
    var idX     = parseFloat((document.getElementById('print-id-x')    || {}).value) || 4;
    var idY     = parseFloat((document.getElementById('print-id-y')    || {}).value) || 37;
    var showLogo   = (document.getElementById('print-show-logo')   || {}).checked !== false;
    var showScanMe = (document.getElementById('print-show-scanme') || {}).checked !== false;
    var w = type === 'vertical' ? 28.6 : 50;
    var h = type === 'vertical' ? 45   : 28.6;
    return { type: type, w: w, h: h, svgUrl: svgUrl, qrX: qrX, qrY: qrY, qrSize: qrSize, idX: idX, idY: idY, showLogo: showLogo, showScanMe: showScanMe };
  }

  function updatePrintCount() {
    var count = 0;
    Object.keys(_printSelection).forEach(function(id) { if (_printSelection[id]) count++; });
    var el = document.getElementById('print-selected-count');
    if (el) el.textContent = count + ' placa(s) seleccionada(s)';
  }

  var _validatedSvgUrl = '';
  var _svgValidationError = '';
  var _lastCheckedSvgUrl = '';
  var _svgValidationTimeout = null;

  window.loadPrintableOrders = function() {
    var tbody = document.getElementById('print-orders-tbody');
    if (!tbody) return;
    
    if (!_ordersCache || _ordersCache.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div><p style="margin-top:10px">Cargando cola de impresion...</p></div></td></tr>';
      var db2 = db();
      if (!db2) return;
      db2.collection('orders').where('status', 'in', ['confirmed', 'processing']).get()
        .then(function(snap) {
          _ordersCache = [];
          snap.forEach(function(doc) {
            _ordersCache.push({ id: doc.id, data: doc.data() });
          });
          window.filterPrintableOrders();
        })
        .catch(function(e) {
          tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Error al cargar pedidos: ' + escFn(e.message) + '</div></td></tr>';
        });
    } else {
      window.filterPrintableOrders();
    }
  };

  window.filterPrintableOrders = function() {
    var tbody = document.getElementById('print-orders-tbody');
    if (!tbody) return;

    var searchVal = (document.getElementById('print-filter-search') ? document.getElementById('print-filter-search').value.toLowerCase().trim() : '');
    var deptVal = (document.getElementById('print-filter-dept') ? document.getElementById('print-filter-dept').value.toLowerCase().trim() : '');

    var orders = _ordersCache.filter(function(o) {
      var d = o.data;
      var s = d.status;
      var isConfirmedOrProcessing = (s === 'confirmed' || s === 'processing') && d.activationCode;
      if (!isConfirmedOrProcessing) return false;

      // Filter by search query
      if (searchVal) {
        var buyerName = (d.buyerName || (d.buyer ? d.buyer.name : '') || '').toLowerCase();
        var code = (d.activationCode || '').toLowerCase();
        var oid = (o.id || '').toLowerCase();
        if (buyerName.indexOf(searchVal) === -1 && code.indexOf(searchVal) === -1 && oid.indexOf(searchVal) === -1) {
          return false;
        }
      }

      // Filter by department
      if (deptVal) {
        var de = (d.department || d.shippingType || '').toLowerCase();
        if (deptVal === 'internacional') {
          var standardDepts = ['santa cruz', 'la paz', 'cochabamba', 'oruro', 'potosi', 'tarija', 'chuquisaca', 'beni', 'pando'];
          var isBolivian = standardDepts.some(function(dep) { return de.indexOf(dep) !== -1; });
          if (isBolivian) return false;
        } else {
          if (de.indexOf(deptVal) === -1) {
            return false;
          }
        }
      }

      return true;
    });

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No se encontraron pedidos con los filtros actuales.</div></td></tr>';
      updatePrintCount();
      return;
    }

    var html = '';
    orders.forEach(function(o) {
      var d    = o.data;
      var buyer = escFn((d.buyer ? d.buyer.name : d.buyerName) || '').substring(0, 24);
      var date  = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toLocaleDateString('es-BO') : '';
      if (_printSelection[o.id] === undefined) _printSelection[o.id] = true;
      var chk = _printSelection[o.id] ? 'checked' : '';
      html += '<tr>';
      html += '<td><input type="checkbox" ' + chk + ' data-oid="' + escFn(o.id) + '" onchange="togglePrintSelection(this.getAttribute(\'data-oid\'),this.checked)"></td>';
      html += '<td><code style="font-size:0.8rem;color:#4552CC;">' + escFn(d.activationCode) + '</code></td>';
      html += '<td>' + buyer + '</td>';
      html += '<td>' + escFn(d.planName || '') + '</td>';
      html += '<td><span class="status-badge ' + (d.status||'pending') + '">' + (d.status||'').toUpperCase() + '</span></td>';
      html += '<td style="font-size:0.8rem;color:#9E9E9E;">' + date + '</td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
    updatePrintCount();
    updatePrintPreview();
    loadPrintConfig();
  };

  function loadPrintConfig() {
    var db2 = db(); if (!db2) return;
    db2.collection('config').doc('print_settings').get().then(function(doc) {
      if (!doc.exists) return;
      var d = doc.data();
      if (d.type) {
        var sel = document.getElementById('print-plate-type');
        if (sel) sel.value = d.type;
      }
      var setV = function(id, val) { var el = document.getElementById(id); if (el && val != null) el.value = String(val); };
      var setCbk = function(id, val) { var el = document.getElementById(id); if (el) el.checked = val !== false; };
      setV('print-svg-url',   d.svgUrl);
      setV('print-qr-x',     d.qrX    != null ? d.qrX    : 4);
      setV('print-qr-y',     d.qrY    != null ? d.qrY    : 14);
      setV('print-qr-size',  d.qrSize != null ? d.qrSize : 20);
      setV('print-id-x',     d.idX    != null ? d.idX    : 4);
      setV('print-id-y',     d.idY    != null ? d.idY    : 37);
      setCbk('print-show-logo',    d.showLogo    !== false);
      setCbk('print-show-scanme',  d.showScanMe  !== false);
      updatePrintPreview();
    });
  }

  window.togglePrintSelection = function(orderId, checked) {
    _printSelection[orderId] = checked;
    updatePrintCount();
  };

  window.toggleAllPrint = function(state) {
    document.querySelectorAll('#print-orders-tbody input[type="checkbox"]').forEach(function(cb) {
      cb.checked = state;
      var id = cb.getAttribute('data-oid');
      if (id) _printSelection[id] = state;
    });
    updatePrintCount();
  };

  window.updatePrintPreview = function() {
    var box = document.getElementById('print-preview-box');
    if (!box) return;
    var cfg   = getPrintConfig();
    var scale = 4; // 1 mm = 4 px
    var W = Math.round(cfg.w * scale);
    var H = Math.round(cfg.h * scale);

    if (cfg.svgUrl) {
      if (cfg.svgUrl !== _lastCheckedSvgUrl) {
        _lastCheckedSvgUrl = cfg.svgUrl;
        _svgValidationError = '';
        
        if (_svgValidationTimeout) clearTimeout(_svgValidationTimeout);
        _svgValidationTimeout = setTimeout(function() {
          var lowercaseUrl = cfg.svgUrl.toLowerCase();
          if (!lowercaseUrl.endsWith('.svg') && lowercaseUrl.indexOf('.svg?') === -1) {
            _svgValidationError = 'La URL debe terminar con extension .svg';
            if (typeof toast === 'function') {
              toast('<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Error: La URL debe terminar con extension .svg');
            }
            window.updatePrintPreview();
            return;
          }

          fetch(cfg.svgUrl)
            .then(function(res) {
              if (!res.ok) throw new Error('Error de conexion HTTP ' + res.status);
              return res.text();
            })
            .then(function(text) {
              var parser = new DOMParser();
              var doc = parser.parseFromString(text, 'image/svg+xml');
              var parserError = doc.getElementsByTagName('parsererror');
              if (parserError.length > 0) {
                throw new Error('Sintaxis SVG/XML invalida.');
              }
              if (doc.documentElement.nodeName.toLowerCase() !== 'svg') {
                throw new Error('La respuesta no contiene una etiqueta <svg> raiz valida.');
              }
              _validatedSvgUrl = cfg.svgUrl;
              _svgValidationError = '';
              window.updatePrintPreview();
            })
            .catch(function(err) {
              _svgValidationError = err.message;
              if (typeof toast === 'function') {
                toast('<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Error de plantilla SVG: ' + err.message);
              }
              window.updatePrintPreview();
            });
        }, 500);
      }
    } else {
      _lastCheckedSvgUrl = '';
      _validatedSvgUrl = '';
      _svgValidationError = '';
    }

    var bgStyle = 'background:#fff;';
    var errorOverlay = '';
    
    if (cfg.svgUrl) {
      if (_svgValidationError) {
        bgStyle = 'background:#FFEBEE;border:2px dashed #f43f5e;';
        errorOverlay = '<div style="position:absolute;inset:0;background:rgba(244,63,94,0.08);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;text-align:center;box-sizing:border-box;">' +
          '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt="">' +
          '<span style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.75rem;font-weight:700;color:#f43f5e;line-height:1.2;">Error SVG:</span>' +
          '<span style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.70rem;color:#e11d48;margin-top:4px;word-break:break-word;line-height:1.2;">' + escFn(_svgValidationError) + '</span>' +
        '</div>';
      } else if (cfg.svgUrl === _validatedSvgUrl) {
        bgStyle = 'background:url(' + escFn(cfg.svgUrl) + ') no-repeat center/cover;';
      } else {
        bgStyle = 'background:#F5F5F5;border:1px dashed #BDBDBD;';
        errorOverlay = '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;text-align:center;box-sizing:border-box;">' +
          '<div class="loading-dots"><span></span><span></span><span></span></div>' +
          '<span style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.72rem;color:#757575;margin-top:6px;">Validando plantilla...</span>' +
        '</div>';
      }
    }

    var html = '<div style="position:relative;width:' + W + 'px;height:' + H + 'px;border:1px solid #CCC;border-radius:4px;overflow:hidden;' + bgStyle + '">';
    
    if (!_svgValidationError) {
      if (cfg.showLogo) {
        html += '<div style="position:absolute;top:' + Math.round(2*scale) + 'px;left:' + Math.round(2*scale) + 'px;font-family:\'Sora\',sans-serif;font-size:' + Math.round(1.8*scale) + 'px;font-weight:800;color:#4552CC;letter-spacing:0.05em;">PETCINGO</div>';
      }
      var qrS = Math.round(cfg.qrSize * scale);
      html += '<div style="position:absolute;left:' + Math.round(cfg.qrX*scale) + 'px;top:' + Math.round(cfg.qrY*scale) + 'px;width:' + qrS + 'px;height:' + qrS + 'px;background:#F0F0F0;display:flex;align-items:center;justify-content:center;font-size:' + Math.round(qrS*0.55) + 'px;color:#9E9E9E;"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-qr-bold.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""></div>';
      html += '<div style="position:absolute;left:' + Math.round(cfg.idX*scale) + 'px;top:' + Math.round(cfg.idY*scale) + 'px;font-family:monospace;font-size:' + Math.round(2.2*scale) + 'px;font-weight:700;color:#212121;letter-spacing:0.08em;">AB1234</div>';
      if (cfg.showScanMe) {
        html += '<div style="position:absolute;bottom:' + Math.round(2*scale) + 'px;left:0;right:0;text-align:center;font-size:' + Math.round(1.6*scale) + 'px;color:#757575;font-family:\'Plus Jakarta Sans\',sans-serif;">Scan Me</div>';
      }
    }
    
    html += errorOverlay;
    html += '</div>';
    box.innerHTML = html;
  };

  window.generatePrintSheet = function() {
    var selected = Object.keys(_printSelection).filter(function(id) { return _printSelection[id]; });
    if (selected.length === 0) {
      if (typeof toast === 'function') toast('Selecciona al menos una placa.');
      return;
    }
    var orders = _ordersCache.filter(function(o) { return selected.indexOf(o.id) !== -1 && o.data.activationCode; });
    if (orders.length === 0) {
      if (typeof toast === 'function') toast('No hay placas validas para imprimir.');
      return;
    }
    var cfg   = getPrintConfig();
    var gapX  = 3; var gapY = 3;
    var cols  = Math.max(1, Math.floor((200 + gapX) / (cfg.w + gapX)));
    var rows  = Math.max(1, Math.floor((287 + gapY) / (cfg.h + gapY)));
    var perPage = cols * rows;

    var css = [
      '*{box-sizing:border-box;margin:0;padding:0;}',
      'body{font-family:"Plus Jakarta Sans",sans-serif;background:#fff;}',
      '@page{size:A4;margin:5mm;}',
      '.page{width:200mm;height:287mm;display:flex;flex-wrap:wrap;gap:' + gapY + 'mm ' + gapX + 'mm;align-content:flex-start;page-break-after:always;}',
      '.plate{width:' + cfg.w + 'mm;height:' + cfg.h + 'mm;position:relative;overflow:hidden;border:0.3mm solid #DDD;border-radius:1.5mm;background:#fff;page-break-inside:avoid;flex-shrink:0;}',
      '.p-logo{position:absolute;top:2mm;left:2mm;font-family:"Sora",sans-serif;font-size:4pt;font-weight:800;color:#4552CC;letter-spacing:0.05em;text-transform:uppercase;}',
      '.p-qr{position:absolute;object-fit:contain;}',
      '.p-id{position:absolute;font-family:monospace;font-size:5.5pt;font-weight:700;color:#212121;letter-spacing:0.08em;}',
      '.p-scan{position:absolute;bottom:1.5mm;left:0;right:0;text-align:center;font-size:3.5pt;color:#757575;}',
      '.no-print{display:block;}',
      '@media print{.no-print{display:none!important;}.page{page-break-after:always;}}'
    ].join('\n');

    var win = window.open('', '_blank', 'width=900,height=700');
    win.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">');
    win.document.write('<title>Pliego Petcingo</title>');
    win.document.write('<link href="https://fonts.googleapis.com/css2?family=Sora:wght@800&family=Plus+Jakarta+Sans:wght@400;600&display=swap" rel="stylesheet">');
    win.document.write('<style>' + css + '</style></head><body>');
    win.document.write('<div class="no-print" style="padding:10px 16px;display:flex;gap:8px;align-items:center;border-bottom:1px solid #E0E0E0;margin-bottom:6mm;">');
    win.document.write('<span style="font-family:\'Plus Jakarta Sans\',sans-serif;font-weight:700;color:#212121;font-size:0.9rem;">' + orders.length + ' placa(s) | ' + cols + ' x ' + rows + ' por hoja</span>');
    win.document.write('<button onclick="window.print()" style="background:#4552CC;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.88rem;">Imprimir</button>');
    win.document.write('<button onclick="window.close()" style="background:#F5F5F5;border:1px solid #DDD;padding:8px 16px;border-radius:8px;cursor:pointer;">Cerrar</button>');
    win.document.write('</div><div class="page">');

    orders.forEach(function(o, idx) {
      if (idx > 0 && idx % perPage === 0) win.document.write('</div><div class="page">');
      var d    = o.data;
      var code = d.activationCode;
      var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent('https://prueb2.dashnexpages.net/activacion/?id=' + code);
      var svgAttr = cfg.svgUrl ? ' style="background:url(' + escFn(cfg.svgUrl) + ') no-repeat center/cover;"' : '';
      win.document.write('<div class="plate"' + svgAttr + '>');
      if (cfg.showLogo)   win.document.write('<div class="p-logo">PETCINGO</div>');
      win.document.write('<img class="p-qr" src="' + qrUrl + '" style="left:' + cfg.qrX + 'mm;top:' + cfg.qrY + 'mm;width:' + cfg.qrSize + 'mm;height:' + cfg.qrSize + 'mm;" alt="QR">');
      win.document.write('<div class="p-id" style="left:' + cfg.idX + 'mm;top:' + cfg.idY + 'mm;">' + escFn(code) + '</div>');
      if (cfg.showScanMe) win.document.write('<div class="p-scan">Scan Me</div>');
      win.document.write('</div>');
    });

    win.document.write('</div></body></html>');
    win.document.close();

    var db2 = db();
    if (db2) orders.forEach(function(o) { db2.collection('orders').doc(o.id).update({ printed: true }).catch(function(){}); });
    if (typeof toast === 'function') toast('Pliego generado: ' + orders.length + ' placa(s).');
  };

  window.savePrintConfig = function() {
    var db2 = db(); if (!db2) return;
    var cfg = getPrintConfig();
    db2.collection('config').doc('print_settings').set(cfg, { merge: true })
      .then(function() { if (typeof toast === 'function') toast('Configuracion guardada.'); })
      .catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  window.generatePrintLayout = function() {
    var filterSel = document.getElementById('print-filter-batch');
    var showAll   = filterSel && filterSel.value === 'all';
    var orders    = _ordersCache.filter(function(o) {
      var d = o.data;
      var eligible = d.status === 'confirmed' || d.status === 'processing' || d.status === 'shipped';
      if (!eligible) return false;
      if (!showAll && d.printed === true) return false;
      return !!d.activationCode;
    });

    if (orders.length === 0) {
      if (typeof toast === 'function') toast('No hay pedidos listos para imprimir.');
      return;
    }

    /* Construye ventana de impresion A4 */
    var win = window.open('', '_blank', 'width=900,height=700');
    var css = [
      'body{font-family:"Plus Jakarta Sans",sans-serif;background:#fff;margin:0;padding:0;}',
      '.page{width:210mm;min-height:297mm;margin:0 auto;padding:10mm;box-sizing:border-box;}',
      '.grid{display:flex;flex-wrap:wrap;gap:6mm;justify-content:flex-start;}',
      '.plate{width:54mm;height:86mm;border:1px solid #CCC;border-radius:4mm;padding:4mm;',
      '  display:flex;flex-direction:column;align-items:center;justify-content:space-between;',
      '  page-break-inside:avoid;background:#fff;box-sizing:border-box;}',
      '.plate-logo{font-family:"Sora",sans-serif;font-size:7pt;font-weight:800;color:#4552CC;letter-spacing:0.05em;text-transform:uppercase;}',
      '.plate-id{font-family:monospace;font-size:9pt;font-weight:700;color:#212121;letter-spacing:0.08em;word-break:break-all;text-align:center;}',
      '.plate-qr{width:40mm;height:40mm;object-fit:contain;}',
      '.plate-footer{font-size:5.5pt;color:#757575;text-align:center;line-height:1.4;}',
      'h2{font-family:"Sora",sans-serif;font-size:12pt;color:#212121;margin:0 0 6mm;border-bottom:2px solid #4552CC;padding-bottom:3mm;}',
      '@media print{body{margin:0;}.no-print{display:none!important;} .page{margin:0;padding:6mm;}}'
    ].join('\n');

    win.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">');
    win.document.write('<title>Pliego de Impresion Petcingo</title>');
    win.document.write('<link href="https://fonts.googleapis.com/css2?family=Sora:wght@800&family=Plus+Jakarta+Sans:wght@400;600&display=swap" rel="stylesheet">');
    win.document.write('<style>' + css + '</style></head><body>');
    win.document.write('<div class="page">');
    win.document.write('<h2>Petcingo -- Pliego de impresion (' + orders.length + ' placas) -- ' + new Date().toLocaleDateString('es-BO') + '</h2>');
    win.document.write('<div class="no-print" style="margin-bottom:6mm;display:flex;gap:8px;">');
    win.document.write('<button onclick="window.print()" style="background:#4552CC;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-weight:700;cursor:pointer;font-size:11pt;">Imprimir pliego</button>');
    win.document.write('<button onclick="window.close()" style="background:#F5F5F5;border:1px solid #DDD;padding:8px 16px;border-radius:8px;cursor:pointer;">Cerrar</button>');
    win.document.write('</div><div class="grid">');

    orders.forEach(function(o) {
      var d = o.data;
      var code = d.activationCode || o.id.substring(0, 8).toUpperCase();
      var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent('https://prueb2.dashnexpages.net/activacion/?id=' + code);
      var buyer = d.buyer ? d.buyer.name : (d.buyerName || '');
      win.document.write('<div class="plate">');
      win.document.write('<div class="plate-logo">PETCINGO</div>');
      win.document.write('<img class="plate-qr" src="' + qrUrl + '" alt="QR '+ code +'">');
      win.document.write('<div class="plate-id">' + code + '</div>');
      win.document.write('<div class="plate-footer">Escanea para ver perfil<br>' + escFn(buyer).substring(0, 20) + '</div>');
      win.document.write('</div>');
    });

    win.document.write('</div></div>');
    win.document.write('<script>window.onload=function(){setTimeout(function(){/* auto-print opcional */},800);};<\/script>');
    win.document.write('</body></html>');
    win.document.close();

    /* Marcar como impresos en Firestore */
    var db2 = db();
    if (!db2) return;
    orders.forEach(function(o) {
      db2.collection('orders').doc(o.id).update({ printed: true })
        .catch(function() {});
    });
    if (typeof toast === 'function') toast('Pliego generado: ' + orders.length + ' placa(s).');
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

    function _uploadToR2(file) {
      if (typeof toast === 'function') toast('Subiendo QR...');

      /* Verificar que AWS SDK este disponible */
      if (typeof AWS === 'undefined') {
        if (typeof toast === 'function') toast('Error: AWS SDK no cargado');
        return;
      }

      AWS.config.update({
        accessKeyId:     '6496db9c407984025f99bc0dc6a23264',
        secretAccessKey: 'b270005e8ebf9eef779db72012a0ea6206a9f281eba9d07e0b15f78016c2d94d'
      });

      var s3 = new AWS.S3({
        endpoint:         'https://c11712fefc3437b619d76c69ecc14901.r2.cloudflarestorage.com',
        signatureVersion: 'v4',
        s3ForcePathStyle:  true
      });

      var key = 'config/qr-pago-' + Date.now() + '.png';

      s3.upload({
        Bucket:      'petcingo',
        Key:         key,
        Body:        file,
        ContentType: file.type || 'image/png'
      }, function(err, data) {
        if (err) {
          if (typeof toast === 'function') toast('Error al subir QR: ' + err.message);
          return;
        }

        var publicUrl = 'https://pub-cb882f9b206543b28ea81fcadac0f4b2.r2.dev/' + key;
        var db2 = db();
        if (!db2) { if (typeof toast === 'function') toast('Firebase no disponible'); return; }

        db2.collection('config').doc('bank_info').set(
          { qrImageUrl: publicUrl },
          { merge: true }
        ).then(function() {
          var img  = document.getElementById('ptcg-qr-preview-img');
          var prev = document.getElementById('ptcg-qr-preview');
          if (img)  img.src = publicUrl;
          if (prev) prev.style.display = 'block';
          _qrFile = null;
          if (typeof toast === 'function') toast('QR guardado correctamente');
        }).catch(function(e) {
          if (typeof toast === 'function') toast('Error al guardar URL: ' + e.message);
        });
      });
    }

    /* Comprimir antes de subir si compressImage esta disponible */
    if (typeof compressImage === 'function') {
      compressImage(_qrFile, 400, 0.6, 80000)
        .then(function(blob) { _uploadToR2(blob); })
        .catch(function()    { _uploadToR2(_qrFile); });
    } else {
      _uploadToR2(_qrFile);
    }
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
     _runInitDashboard: punto de extension global
  ================================================================== */
  window._runInitDashboard = function(role, name) {
    var tries = 0;
    var poll = setInterval(function() {
      tries++;
      if (typeof initDashboard === 'function') {
        clearInterval(poll);
        try { initDashboard(); } catch(e) { console.error('[petcingo-dash] initDashboard err:', e); }
        /* Respaldo con guards anti-duplicado */
        setTimeout(function() { if (typeof loadOrders      === 'function' && !window._ordersListenerActive)      loadOrders();      }, 600);
        setTimeout(function() { if (typeof loadCommissions === 'function' && !window._commissionsListenerActive) loadCommissions(); }, 700);
        setTimeout(function() { if (typeof loadProducts    === 'function' && !window._storeListenerActive)       loadProducts();    }, 800);
        setTimeout(function() { if (typeof loadPromotions  === 'function') loadPromotions();  }, 900);
        setTimeout(function() { if (typeof loadSiteConfig  === 'function') loadSiteConfig();  }, 1000);
        setTimeout(function() { if (typeof loadShippingRates === 'function') loadShippingRates(); }, 1100);
        setTimeout(function() { if (typeof loadIntlShippingRates === 'function') loadIntlShippingRates(); }, 1150);
        setTimeout(function() { if (typeof loadShippingSettings === 'function') loadShippingSettings(); }, 1200);
        setTimeout(function() { if (typeof showInitialAlerts === 'function') showInitialAlerts(); }, 2200);
      }
      if (tries > 20) { clearInterval(poll); console.warn('[petcingo-dash] initDashboard no encontrado tras 3s'); }
    }, 150);
  };

  /* ==================================================================
     Monkey-patch de initDashboard (flujo de LOGIN normal)
     Garantiza que los modulos del dashboard se carguen incluso si el
     setTimeout(800ms) de petcingo.js disparo antes de que este archivo
     terminara de cargarse.
     Guards anti-duplicado: cada modulo verifica su propio flag.
  ================================================================== */
  (function() {
    var _originalInit = window.initDashboard;
    if (typeof _originalInit !== 'function') return;
    window.initDashboard = function() {
      _originalInit();
      setTimeout(function() {
        if (typeof loadOrders      === 'function' && !window._ordersListenerActive)      loadOrders();
        if (typeof loadCommissions === 'function' && !window._commissionsListenerActive) loadCommissions();
        if (typeof loadProducts    === 'function' && !window._storeListenerActive)       loadProducts();
        if (typeof loadPromotions  === 'function') loadPromotions();
        if (typeof loadSiteConfig  === 'function') loadSiteConfig();
        if (typeof loadShippingRates === 'function') loadShippingRates();
        if (typeof loadIntlShippingRates === 'function') loadIntlShippingRates();
        if (typeof loadShippingSettings === 'function') loadShippingSettings();
        if (typeof showInitialAlerts === 'function') showInitialAlerts();
        if (typeof loadArchiveToggle === 'function') loadArchiveToggle();
      }, 1000);
    };
  })();

  /* -- Delegado de clics: abre modal al hacer clic en fila de Mascotas -- */
  document.addEventListener('click', function(e) {
    var secPets = document.getElementById('sec-pets');
    if (!secPets || !secPets.classList.contains('active')) return;
    if (e.target.closest('button') || e.target.closest('a')) return;

    var row = e.target.closest('#pets-tbody tr');
    if (!row) return;

    var codeCell = row.querySelector('td:first-child');
    if (!codeCell) return;
    var code = codeCell.textContent.trim();

    if (code && code !== '\u2014' && code !== '...' && typeof window.showPetModal === 'function') {
      window.showPetModal(code);
    }
  });

  /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
     AFILIADOS \u2014 tabla + niveles + status
     \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */

  var _affiliateLevels = [
    { level: 1, name: 'Bronce',   minSales: 0,   maxSales: 25,     rate: 8  },
    { level: 2, name: 'Plata',    minSales: 26,  maxSales: 100,    rate: 12 },
    { level: 3, name: 'Oro',      minSales: 101, maxSales: 250,    rate: 16 },
    { level: 4, name: 'Diamante', minSales: 251, maxSales: 999999, rate: 20 }
  ];

  function getLevelForSales(sales, levels) {
    if (!levels || !levels.length) return null;
    for (var i = levels.length - 1; i >= 0; i--) {
      if (sales >= levels[i].minSales) return levels[i];
    }
    return levels[0];
  }

  window.loadAffiliateLevels = function() {
    var db2 = db(); if (!db2) return;
    db2.collection('config').doc('affiliate_levels').get().then(function(doc) {
      if (doc.exists && doc.data().levels) _affiliateLevels = doc.data().levels;
      renderAffiliateLevelsUI();
    }).catch(function() { renderAffiliateLevelsUI(); });
  };

  function renderAffiliateLevelsUI() {
    var container = document.getElementById('affiliate-levels-container');
    if (!container) return;
    var levelColors = ['#CD7F32', '#9E9E9E', '#D4AF37', '#51CBF5'];
    var h = '<div style="display:grid;gap:10px;">';
    _affiliateLevels.forEach(function(lv, i) {
      var color = levelColors[i] || '#4552CC';
      h += '<div style="display:flex;gap:12px;align-items:center;background:#F8F9FB;border-radius:12px;padding:12px 14px;flex-wrap:wrap;">';
      h += '<span style="font-family:\'Sora\',sans-serif;font-weight:800;min-width:72px;color:' + color + ';">' + escFn(lv.name || 'Nivel ' + lv.level) + '</span>';
      h += '<label style="display:flex;align-items:center;gap:5px;font-size:.82rem;">Desde <input type="number" id="lv-min-' + i + '" value="' + lv.minSales + '" min="0" style="width:64px;padding:4px 8px;border:1.5px solid #E0E0E0;border-radius:8px;font-family:\'Plus Jakarta Sans\',sans-serif;"></label>';
      h += '<label style="display:flex;align-items:center;gap:5px;font-size:.82rem;">Hasta <input type="number" id="lv-max-' + i + '" value="' + lv.maxSales + '" min="0" style="width:72px;padding:4px 8px;border:1.5px solid #E0E0E0;border-radius:8px;font-family:\'Plus Jakarta Sans\',sans-serif;"></label>';
      h += '<label style="display:flex;align-items:center;gap:5px;font-size:.82rem;">Comision % <input type="number" id="lv-rate-' + i + '" value="' + lv.rate + '" min="0" max="100" step="0.5" style="width:64px;padding:4px 8px;border:1.5px solid #E0E0E0;border-radius:8px;font-family:\'Plus Jakarta Sans\',sans-serif;"></label>';
      h += '</div>';
    });
    h += '</div>';
    container.innerHTML = h;
  }

  window.saveAffiliateLevels = function() {
    var db2 = db(); if (!db2) return;
    var levels = [];
    _affiliateLevels.forEach(function(lv, i) {
      var minEl  = document.getElementById('lv-min-'  + i);
      var maxEl  = document.getElementById('lv-max-'  + i);
      var rateEl = document.getElementById('lv-rate-' + i);
      levels.push({
        level:    lv.level,
        name:     lv.name,
        minSales: minEl  ? (parseInt(minEl.value,10)    || 0)      : lv.minSales,
        maxSales: maxEl  ? (parseInt(maxEl.value,10)    || 999999) : lv.maxSales,
        rate:     rateEl ? (parseFloat(rateEl.value) || 0)         : lv.rate
      });
    });
    _affiliateLevels = levels;
    db2.collection('config').doc('affiliate_levels').set({ levels: levels })
      .then(function() { if (typeof toast === 'function') toast('Niveles guardados.'); })
      .catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  window.loadAffiliates = function() {
    var db2 = db(); if (!db2) return;
    var tbody = document.getElementById('affiliates-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="loading-dots"><span></span><span></span><span></span></div></div></td></tr>';

    db2.collection('affiliates').get().then(function(snap) {
      var cEl = document.getElementById('affiliates-count');
      if (cEl) cEl.textContent = snap.size + ' afiliado(s)';
      if (snap.empty) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">No hay afiliados aun.</div></td></tr>'; return; }

      var html = '';
      snap.forEach(function(doc) {
        var d = doc.data();
        var status = d.status || 'active';
        var statusColor = status === 'active' ? '#2ECC71' : status === 'suspended' ? '#E67E22' : '#E74C3C';
        var statusBg    = status === 'active' ? 'rgba(46,204,113,.12)' : status === 'suspended' ? 'rgba(230,126,34,.12)' : 'rgba(231,76,60,.12)';
        var statusLabel = status === 'active' ? 'Activo' : status === 'suspended' ? 'Suspendido' : 'Baneado';
        var statusBadge = '<span style="padding:3px 9px;border-radius:99px;font-size:.70rem;font-weight:700;background:' + statusBg + ';color:' + statusColor + ';">' + statusLabel + '</span>';

        var totalSales = d.totalSales || 0;
        var lvl = getLevelForSales(totalSales, _affiliateLevels);
        var levelColors = ['#CD7F32', '#9E9E9E', '#D4AF37', '#51CBF5'];
        var lvlColor = lvl ? (levelColors[(lvl.level - 1)] || '#4552CC') : '#9E9E9E';
        var lvlBadge = lvl ? '<span style="font-weight:700;color:' + lvlColor + ';">' + escFn(lvl.name) + '</span>' : '-';

        var rate = d.commissionRate != null ? d.commissionRate : (lvl ? lvl.rate : 10);
        var rateCell = '<input type="number" min="0" max="100" step="0.5" value="' + rate + '" id="rate-af-' + doc.id + '" style="width:46px;padding:2px 5px;border:1px solid #E0E0E0;border-radius:6px;font-size:.78rem;text-align:center;">' +
          '<button onclick="saveAffiliateRate(\'' + doc.id + '\')" style="padding:2px 8px;background:#4552CC;color:#fff;border:none;border-radius:6px;font-size:.70rem;cursor:pointer;margin-left:3px;">OK</button>';

        var dropdownStyle = "display:block;width:100%;text-align:left;padding:8px 14px;border:none;background:transparent;font-size:0.82rem;color:#424242;cursor:pointer;white-space:nowrap;";
        
        var suspLabel = status === 'active' ? '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Suspender' : (status === 'suspended' ? '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Activar' : '');
        var suspDropdownBtn = suspLabel ? '<button style="' + dropdownStyle + 'color:#E67E22;" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="setAffiliateStatus(\'' + doc.id + '\',\'suspended\')">' + suspLabel + '</button>' : '';
        if (status === 'suspended') {
          suspDropdownBtn = '<button style="' + dropdownStyle + 'color:#2ECC71;" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="setAffiliateStatus(\'' + doc.id + '\',\'active\')">' + suspLabel + '</button>';
        }

        var banLabel = status !== 'banned' ? '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Banear' : '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-check-circle-bold.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Activar';
        var banColor = status !== 'banned' ? '#E74C3C' : '#2ECC71';
        var banTargetStatus = status !== 'banned' ? 'banned' : 'active';
        var banDropdownBtn = '<button style="' + dropdownStyle + 'color:' + banColor + ';" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" onclick="setAffiliateStatus(\'' + doc.id + '\',\'' + banTargetStatus + '\')">' + banLabel + '</button>';

        var actionDropdown = '<div class="ptcg-actions-menu" style="position:relative;display:inline-block;">' +
          '<button class="ptcg-actions-toggle" onclick="toggleActionsMenu(this, event)" style="background:none;border:1.5px solid #E0E0E0;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:1.1rem;color:#757575;line-height:1;">...</button>' +
          '<div class="ptcg-actions-dropdown" style="display:none;position:absolute;right:0;top:100%;z-index:500;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);min-width:180px;padding:6px 0;margin-top:4px;">' +
            '<a style="' + dropdownStyle + 'text-decoration:none;" onmouseenter="this.style.background=\'#F5F5F5\'" onmouseleave="this.style.background=\'transparent\'" href="https://prueb2.dashnexpages.net/panel-afiliados/?auto='+doc.id+'" target="_blank"><img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-link-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Ir a panel</a>' +
            suspDropdownBtn +
            banDropdownBtn +
          '</div>' +
        '</div>';

        html += '<tr>';
        html += '<td style="font-weight:600;">' + escFn(d.name || '--') + '</td>';
        html += '<td>' + escFn(d.email || '--') + '</td>';
        html += '<td>' + escFn(d.phone || '--') + '</td>';
        html += '<td style="font-weight:700;">' + totalSales + '</td>';
        html += '<td>' + lvlBadge + '</td>';
        html += '<td style="white-space:nowrap;">' + rateCell + '</td>';
        html += '<td>' + statusBadge + '</td>';
        html += '<td class="td-actions" style="white-space:nowrap;">' + actionDropdown + '</td>';
        html += '</tr>';
      });
      tbody.innerHTML = html;
    }).catch(function(e) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">Error: ' + escFn(e.message) + '</div></td></tr>'; });
  };

  window.saveAffiliateRate = function(id) {
    var inp = document.getElementById('rate-af-' + id);
    if (!inp) return;
    var rate = parseFloat(inp.value);
    if (isNaN(rate) || rate < 0 || rate > 100) { if (typeof toast === 'function') toast('Porcentaje invalido (0-100)'); return; }
    db().collection('affiliates').doc(id).update({ commissionRate: rate })
      .then(function() { if (typeof toast === 'function') toast('Comision actualizada: ' + rate + '%'); })
      .catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  window.setAffiliateStatus = function(id, newStatus) {
    var reason = '';
    if (newStatus !== 'active') {
      reason = window.prompt('Motivo (opcional):') || '';
    }
    var update = { status: newStatus };
    if (newStatus === 'suspended') { update.suspendedAt = firebase.firestore.FieldValue.serverTimestamp(); update.suspendedReason = reason; }
    if (newStatus === 'banned')    { update.bannedAt    = firebase.firestore.FieldValue.serverTimestamp(); update.bannedReason    = reason; }
    if (newStatus === 'active')    { update.reactivatedAt = firebase.firestore.FieldValue.serverTimestamp(); }
    db().collection('affiliates').doc(id).update(update)
      .then(function() {
        var lbl = { active: 'Reactivado', suspended: 'Suspendido', banned: 'Baneado' };
        if (typeof toast === 'function') toast((lbl[newStatus] || newStatus) + ' correctamente.');
        window.loadAffiliates();
      }).catch(function(e) { if (typeof toast === 'function') toast('Error: ' + e.message); });
  };

  /* ==================================================================
     API HEALTH MONITORING & STORAGE STATS
     ================================================================== */
  function _updateHealthLed(ledId, statusId, state) {
    var led = document.getElementById(ledId);
    var statusEl = document.getElementById(statusId);
    if (!led || !statusEl) return;

    if (state === 'loading') {
      led.style.background = '#E0E0E0';
      led.style.boxShadow = '0 0 8px #E0E0E0';
      statusEl.textContent = 'Conectando...';
      statusEl.style.color = '#9E9E9E';
    } else if (state === 'online') {
      led.style.background = '#2ECC71';
      led.style.boxShadow = '0 0 8px #2ECC71';
      statusEl.textContent = 'En linea';
      statusEl.style.color = '#2ECC71';
    } else if (state === 'error') {
      led.style.background = '#E74C3C';
      led.style.boxShadow = '0 0 8px #E74C3C';
      statusEl.textContent = 'Error';
      statusEl.style.color = '#E74C3C';
    }
  }

  window.runAllHealthChecks = function() {
    if (typeof checkAuthHealth === 'function') checkAuthHealth();
    if (typeof checkFirestoreHealth === 'function') checkFirestoreHealth();
    if (typeof checkStorageHealth === 'function') checkStorageHealth();
    if (typeof checkR2Health === 'function') checkR2Health();
    if (typeof checkWhatsAppHealth === 'function') checkWhatsAppHealth();
  };

  window.checkAuthHealth = function() {
    _updateHealthLed('led-auth', 'status-auth', 'loading');
    try {
      var auth = _getPcApp().auth();
      if (auth.currentUser) {
        _updateHealthLed('led-auth', 'status-auth', 'online');
      } else {
        _updateHealthLed('led-auth', 'status-auth', 'online');
      }
    } catch (e) {
      _updateHealthLed('led-auth', 'status-auth', 'error');
    }
  };

  window.checkFirestoreHealth = function() {
    _updateHealthLed('led-firestore', 'status-firestore', 'loading');
    var db2 = db();
    if (!db2) {
      _updateHealthLed('led-firestore', 'status-firestore', 'error');
      return;
    }
    db2.collection('siteConfig').doc('main').get().then(function() {
      _updateHealthLed('led-firestore', 'status-firestore', 'online');
    }).catch(function(e) {
      console.error('[Firestore Health] error:', e);
      _updateHealthLed('led-firestore', 'status-firestore', 'error');
    });
  };

  window.checkStorageHealth = function() {
    _updateHealthLed('led-storage', 'status-storage', 'loading');
    var st = storage();
    if (!st) {
      _updateHealthLed('led-storage', 'status-storage', 'error');
      return;
    }
    st.ref().child('ping_health').getMetadata().then(function() {
      _updateHealthLed('led-storage', 'status-storage', 'online');
    }).catch(function(err) {
      if (err && (err.code === 'storage/object-not-found' || err.code === 'storage/unauthorized')) {
        _updateHealthLed('led-storage', 'status-storage', 'online');
      } else {
        _updateHealthLed('led-storage', 'status-storage', 'error');
      }
    });
  };

  window.checkR2Health = function() {
    _updateHealthLed('led-r2', 'status-r2', 'loading');
    if (typeof AWS === 'undefined') {
      var s = document.createElement('script');
      s.src = 'https://sdk.amazonaws.com/js/aws-sdk-2.809.0.min.js';
      s.onload = function() { _runR2Ping(); };
      s.onerror = function() {
        fetch('https://pub-cb882f9b206543b28ea81fcadac0f4b2.r2.dev/', { method: 'HEAD' })
          .then(function() { _updateHealthLed('led-r2', 'status-r2', 'online'); })
          .catch(function() { _updateHealthLed('led-r2', 'status-r2', 'error'); });
      };
      document.head.appendChild(s);
    } else {
      _runR2Ping();
    }

    function _runR2Ping() {
      try {
        AWS.config.update({
          accessKeyId:     '6496db9c407984025f99bc0dc6a23264',
          secretAccessKey: 'b270005e8ebf9eef779db72012a0ea6206a9f281eba9d07e0b15f78016c2d94d'
        });
        var s3 = new AWS.S3({
          endpoint:         'https://c11712fefc3437b619d76c69ecc14901.r2.cloudflarestorage.com',
          signatureVersion: 'v4',
          s3ForcePathStyle:  true
        });
        s3.listObjects({ Bucket: 'petcingo', MaxKeys: 1 }, function(err) {
          if (err) {
            console.error('[R2 Health] error:', err);
            _updateHealthLed('led-r2', 'status-r2', 'error');
          } else {
            _updateHealthLed('led-r2', 'status-r2', 'online');
          }
        });
      } catch(e) {
        console.error('[R2 Health] exception:', e);
        _updateHealthLed('led-r2', 'status-r2', 'error');
      }
    }
  };

  window.checkWhatsAppHealth = function() {
    _updateHealthLed('led-whatsapp', 'status-whatsapp', 'loading');
    if (typeof AbortController === 'undefined') {
      _updateHealthLed('led-whatsapp', 'status-whatsapp', 'online');
      return;
    }
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 3000);
    fetch('https://prueb2.dashnexpages.net/', { mode: 'no-cors', signal: controller.signal })
      .then(function() {
        clearTimeout(timeout);
        _updateHealthLed('led-whatsapp', 'status-whatsapp', 'online');
      })
      .catch(function(err) {
        clearTimeout(timeout);
        console.error('[WhatsApp Health] error:', err);
        _updateHealthLed('led-whatsapp', 'status-whatsapp', 'error');
      });
  };

  window.loadStorageStats = function() {
    var tbody = document.getElementById('storage-collections-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4">Analizando colecciones...</td></tr>';

    var collections = ['orders', 'pets', 'commissions', 'shelters', 'affiliates', 'logs', 'adoption_requests', '_backups'];
    var totalDocs = 0;
    var storageDocsCount = 0;
    var r2Count = 0;

    var promises = collections.map(function(col) {
      return db().collection(col).get().then(function(snap) {
        totalDocs += snap.size;
        var totalSize = 0;
        snap.forEach(function(doc) {
          var data = doc.data();
          totalSize += JSON.stringify(data).length;

          // Extraer estadísticas de almacenamiento de Firebase Storage y Cloudflare R2
          if (col === 'pets' && data.photoUrl && data.photoUrl.indexOf('firebasestorage') !== -1) {
            storageDocsCount++;
          }
          if (col === 'shelters' && data.logoUrl && data.logoUrl.indexOf('firebasestorage') !== -1) {
            storageDocsCount++;
          }
          if (col === 'orders' && data.receiptUrl && data.receiptUrl.indexOf('r2.dev') !== -1) {
            r2Count++;
          }
        });
        var lastMod = snap.docs.length ? (snap.docs[snap.docs.length - 1].data().updatedAt || snap.docs[snap.docs.length - 1].data().createdAt) : null;
        var formattedLastMod = '-';
        if (lastMod) {
          if (typeof lastMod.toDate === 'function') {
            formattedLastMod = lastMod.toDate().toLocaleDateString('es-BO');
          } else {
            formattedLastMod = new Date(lastMod).toLocaleDateString('es-BO');
          }
        }
        return { 
          collection: col, 
          count: snap.size, 
          size: (totalSize / 1024).toFixed(2) + ' KB', 
          lastMod: formattedLastMod 
        };
      }).catch(function(err) {
        console.error('[loadStorageStats] error loading collection ' + col + ':', err);
        return { collection: col, count: 0, size: '0.00 KB', lastMod: '-' };
      });
    });

    Promise.all(promises).then(function(results) {
      var html = '';
      results.forEach(function(r) {
        html += '<tr><td><strong>' + r.collection + '</strong></td><td>' + r.count.toLocaleString() + '</td><td>' + r.size + '</td><td>' + r.lastMod + '</td></tr>';
      });
      tbody.innerHTML = html;

      // Actualizar cuotas con porcentajes reales
      var readPct = Math.min(100, Math.round((totalDocs * 1.5 / 50000) * 100));
      var writePct = Math.min(100, Math.round((totalDocs * 0.4 / 20000) * 100));
      var docPct = Math.min(100, Math.round((totalDocs / 100000) * 100));

      var readsVal = document.getElementById('quota-reads-value');
      var writesVal = document.getElementById('quota-writes-value');
      var docsVal = document.getElementById('quota-docs-value');
      var readsBar = document.getElementById('quota-reads-bar');
      var writesBar = document.getElementById('quota-writes-bar');

      if (readsVal) readsVal.textContent = '~' + Math.floor(totalDocs * 1.5).toLocaleString();
      if (writesVal) writesVal.textContent = '~' + Math.floor(totalDocs * 0.4).toLocaleString();
      if (docsVal) docsVal.textContent = totalDocs.toLocaleString();

      if (readsBar) {
        readsBar.style.width = readPct + '%';
        readsBar.style.background = readPct > 70 ? '#E74C3C' : readPct > 40 ? '#F39C12' : '#2ECC71';
      }
      if (writesBar) {
        writesBar.style.width = writePct + '%';
        writesBar.style.background = writePct > 70 ? '#E74C3C' : writePct > 40 ? '#F39C12' : '#2ECC71';
      }

      // Actualizar Firebase Storage stats
      var storageEl = document.getElementById('storage-used');
      var storageBar = document.getElementById('storage-bar');
      var storageUsedKB = storageDocsCount * 150;
      var storageUsedMB = (storageUsedKB / 1024).toFixed(2);
      if (storageEl) storageEl.textContent = storageUsedMB + ' MB / 5,120 MB';
      if (storageBar) {
        var pctStorage = Math.min((parseFloat(storageUsedMB) / 5120) * 100, 100);
        storageBar.style.width = pctStorage + '%';
        storageBar.style.background = pctStorage > 80 ? '#E74C3C' : pctStorage > 50 ? '#F39C12' : '#F39C12';
      }

      // Actualizar Cloudflare R2 stats
      var r2CountEl = document.getElementById('r2-count');
      var r2BarEl = document.getElementById('r2-bar');
      if (r2CountEl) r2CountEl.textContent = r2Count + ' comprobante(s)';
      if (r2BarEl) {
        var pctR2 = Math.min((r2Count / 10000) * 100, 100);
        r2BarEl.style.width = pctR2 + '%';
        r2BarEl.style.background = pctR2 > 80 ? '#E74C3C' : pctR2 > 50 ? '#F39C12' : '#2ECC71';
      }

      // Alertas de cuotas
      var alertsHtml = '';
      if (readPct > 80 || writePct > 80 || docPct > 80) {
        alertsHtml += '<div style="margin-bottom:12px;padding:12px 16px;background:#FFEBEE;border:1px solid #FFCDD2;border-radius:12px;color:#C62828;font-size:0.85rem;font-weight:600;display:flex;align-items:center;gap:8px;">' +
          '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Alerta: El uso de Firestore esta cerca del limite gratuito del Plan Spark (' + totalDocs + ' docs). Considere archivar logs antiguos para liberar espacio.' +
          '</div>';
      }
      if (parseFloat(storageUsedMB) > 4000) {
        alertsHtml += '<div style="margin-bottom:12px;padding:12px 16px;background:#FFEBEE;border:1px solid #FFCDD2;border-radius:12px;color:#C62828;font-size:0.85rem;font-weight:600;display:flex;align-items:center;gap:8px;">' +
          '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Alerta: El uso de Firebase Storage esta cerca del limite de 5 GB (' + storageUsedMB + ' MB). Considere optimizar las imagenes.' +
          '</div>';
      }
      if (r2Count > 8000) {
        alertsHtml += '<div style="margin-bottom:12px;padding:12px 16px;background:#FFEBEE;border:1px solid #FFCDD2;border-radius:12px;color:#C62828;font-size:0.85rem;font-weight:600;display:flex;align-items:center;gap:8px;">' +
          '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-info-linear.svg" width="20" height="20" style="filter:invert(28%) sepia(67%) saturate(1585%) hue-rotate(218deg) brightness(94%) contrast(91%)" alt=""> Alerta: El uso de Cloudflare R2 esta cerca de su limite sugerido (' + r2Count + ' comprobantes).' +
          '</div>';
      }
      var quotaAlertsDiv = document.getElementById('quota-alerts');
      if (quotaAlertsDiv) {
        if (alertsHtml) {
          quotaAlertsDiv.innerHTML = alertsHtml;
          quotaAlertsDiv.style.display = 'block';
        } else {
          quotaAlertsDiv.style.display = 'none';
        }
      }
    }).catch(function(err) {
      console.error('[loadStorageStats] error:', err);
    });
  };

  window.optimizeLocalCache = function() {
    var keys = Object.keys(localStorage);
    var clearedCount = 0;
    keys.forEach(function(key) {
      if (key.indexOf('geo_logged_') === 0 || key.indexOf('ptcg_') === 0 || key.indexOf('cache_') === 0) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    });
    if (typeof toast === 'function') {
      toast('Cache local optimizada. Se eliminaron ' + clearedCount + ' claves.');
    } else {
      alert('Cache local optimizada. Se eliminaron ' + clearedCount + ' claves.');
    }
    if (typeof loadStorageStats === 'function') loadStorageStats();
    if (typeof loadSiteConfig === 'function') loadSiteConfig();
  };

  // --- Switch de Archivo Automatico ---

  // Cargar estado del switch desde Firestore
  window.loadArchiveToggle = function() {
    db().collection('config').doc('storage_settings').get().then(function(doc) {
      var enabled = doc.exists && doc.data().autoArchive === true;
      _setArchiveToggleUI(enabled);
      
      // Auto-archivado automatico si esta activado y hay logs antiguos
      if (enabled) {
        var thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        db().collection('logs').where('timestamp', '<', thirtyDaysAgo).limit(200).get().then(function(snap) {
          if (snap.size > 0) {
            console.log('[Auto-Archive] Ejecutando archivado de fondo para ' + snap.size + ' logs.');
            _autoArchiveLogs(snap);
          }
        });
      }
    }).catch(function() {
      _setArchiveToggleUI(false);
    });
  };

  // Cambiar estado del switch
  window.toggleAutoArchive = function() {
    db().collection('config').doc('storage_settings').get().then(function(doc) {
      var current = doc.exists && doc.data().autoArchive === true;
      var newState = !current;
      return db().collection('config').doc('storage_settings').set({ autoArchive: newState }, { merge: true });
    }).then(function() {
      return db().collection('config').doc('storage_settings').get();
    }).then(function(doc) {
      var enabled = doc.exists && doc.data().autoArchive === true;
      _setArchiveToggleUI(enabled);
      if (typeof showDashAlert === 'function') {
        showDashAlert(enabled ? 'Archivo automatico ACTIVADO. Los logs se consolidaran mensualmente.' : 'Archivo automatico DESACTIVADO.', enabled ? 'success' : 'info');
      } else if (typeof toast === 'function') {
        toast(enabled ? 'Archivo automatico ACTIVADO.' : 'Archivo automatico DESACTIVADO.');
      }
    }).catch(function(e) {
      if (typeof showDashAlert === 'function') {
        showDashAlert('Error: ' + e.message, 'danger');
      } else if (typeof toast === 'function') {
        toast('Error: ' + e.message);
      }
    });
  };

  // Actualizar UI del switch
  function _setArchiveToggleUI(enabled) {
    var bg = document.getElementById('archive-toggle-bg');
    var knob = document.getElementById('archive-toggle-knob');
    var label = document.getElementById('archive-toggle-label');
    var msgDiv = document.getElementById('archive-status-msg');
    var msgText = document.getElementById('archive-status-text');

    if (bg) bg.style.background = enabled ? '#4552CC' : '#E0E0E0';
    if (knob) knob.style.left = enabled ? '24px' : '2px';
    if (label) {
      label.textContent = enabled ? 'Activado' : 'Desactivado';
      label.style.color = enabled ? '#4552CC' : '#757575';
    }

    // Verificar si hay logs para archivar
    if (enabled && msgDiv && msgText) {
      var thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      db().collection('logs').where('timestamp', '<', thirtyDaysAgo).get().then(function(snap) {
        if (snap.size > 0) {
          msgDiv.style.display = 'block';
          msgDiv.style.background = '#FFF3E0';
          msgDiv.style.color = '#E65100';
          msgText.textContent = 'Hay ' + snap.size + ' logs antiguos listos para archivar. Usa el boton "Archivar logs" para consolidarlos.';
        } else {
          msgDiv.style.display = 'block';
          msgDiv.style.background = '#E8F5E9';
          msgDiv.style.color = '#2E7D32';
          msgText.textContent = 'No hay logs pendientes de archivar. Todo al dia.';
        }
      }).catch(function() {
        msgDiv.style.display = 'none';
      });
    } else if (msgDiv) {
      msgDiv.style.display = 'none';
    }
  }

  // Archivar logs antiguos manualmente
  window.archiveOldLogs = function() {
    if (!confirm('Desea archivar los logs de mas de 30 dias de antiguedad? Se consolidaran por mes y se eliminaran los registros individuales.')) return;

    var thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    var db2 = db();
    if (!db2) {
      if (typeof toast === 'function') toast('Firebase no disponible.');
      return;
    }

    if (typeof toast === 'function') toast('Iniciando proceso de archivo...');

    db2.collection('logs').where('timestamp', '<', thirtyDaysAgo).get().then(function(snap) {
      if (snap.empty) {
        if (typeof toast === 'function') toast('No hay logs antiguos para archivar.');
        return;
      }

      var logsByMonth = {};
      snap.forEach(function(doc) {
        var d = doc.data();
        var date = d.timestamp ? d.timestamp.toDate() : new Date();
        var monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
        if (!logsByMonth[monthKey]) logsByMonth[monthKey] = [];
        logsByMonth[monthKey].push({
          id: doc.id,
          action: d.action || '',
          user: d.user || '',
          details: d.details || '',
          timestamp: date.toISOString()
        });
      });

      var batch = db2.batch();
      var archivePromises = Object.keys(logsByMonth).map(function(month) {
        var archiveRef = db2.collection('archived_logs').doc(month);
        return archiveRef.get().then(function(archiveDoc) {
          var existingLogs = archiveDoc.exists ? (archiveDoc.data().logs || []) : [];
          var newLogs = existingLogs.concat(logsByMonth[month]);
          batch.set(archiveRef, {
            month: month,
            logs: newLogs,
            archivedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        });
      });

      Promise.all(archivePromises).then(function() {
        snap.forEach(function(doc) {
          batch.delete(doc.ref);
        });
        return batch.commit();
      }).then(function() {
        if (typeof toast === 'function') {
          toast('Exito: ' + snap.size + ' logs consolidados en archived_logs.');
        } else {
          alert('Exito: ' + snap.size + ' logs consolidados en archived_logs.');
        }
        if (typeof loadStorageStats === 'function') loadStorageStats();
        if (typeof loadArchiveToggle === 'function') loadArchiveToggle();
      }).catch(function(e) {
        console.error('[archiveOldLogs] Error:', e);
        if (typeof toast === 'function') toast('Error al archivar: ' + e.message);
      });
    }).catch(function(e) {
      console.error('[archiveOldLogs] Query Error:', e);
      if (typeof toast === 'function') toast('Error al buscar logs: ' + e.message);
    });
  };

  // Funcion interna para archivado automatico
  function _autoArchiveLogs(snap) {
    var db2 = db();
    if (!db2) return;
    var logsByMonth = {};
    snap.forEach(function(doc) {
      var d = doc.data();
      var date = d.timestamp ? d.timestamp.toDate() : new Date();
      var monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      if (!logsByMonth[monthKey]) logsByMonth[monthKey] = [];
      logsByMonth[monthKey].push({
        id: doc.id,
        action: d.action || '',
        user: d.user || '',
        details: d.details || '',
        timestamp: date.toISOString()
      });
    });

    var batch = db2.batch();
    var archivePromises = Object.keys(logsByMonth).map(function(month) {
      var archiveRef = db2.collection('archived_logs').doc(month);
      return archiveRef.get().then(function(archiveDoc) {
        var existingLogs = archiveDoc.exists ? (archiveDoc.data().logs || []) : [];
        var newLogs = existingLogs.concat(logsByMonth[month]);
        batch.set(archiveRef, {
          month: month,
          logs: newLogs,
          archivedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
    });

    Promise.all(archivePromises).then(function() {
      snap.forEach(function(doc) {
        batch.delete(doc.ref);
      });
      return batch.commit();
    }).then(function() {
      console.log('[Auto-Archive] Archivado automatico finalizado con exito para ' + snap.size + ' logs.');
      if (typeof loadStorageStats === 'function') loadStorageStats();
      if (typeof loadArchiveToggle === 'function') loadArchiveToggle();
    }).catch(function(e) {
      console.error('[Auto-Archive] Error:', e);
    });
  }

  // Agregar evento click al switch
  document.addEventListener('DOMContentLoaded', function() {
    var toggleBg = document.getElementById('archive-toggle-bg');
    if (toggleBg) {
      toggleBg.addEventListener('click', function() {
        if (typeof toggleAutoArchive === 'function') toggleAutoArchive();
      });
    }
  });

})();

/* =============================================================
   MODULO POS -- NOTA DE VENTA (venta fisica)
   ============================================================= */
(function () {
  'use strict';

  var posProducts  = [];
  var posNote      = [];
  var posPayMethod = 'Efectivo';
  var posLoaded    = false;

  window.posInit = function () {
    if (posLoaded) { posRenderGrid(posProducts); return; }
    posLoadProducts();
  };

  function posLoadProducts() {
    var grid = document.getElementById('pos-product-grid');
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:#9E9E9E;">Cargando...</div>';
    try {
      var dbInst = db();
      dbInst.collection('products').where('status', '==', 'activo').get()
        .then(function (snap) {
          posProducts = [];
          snap.forEach(function (doc) {
            var d = doc.data();
            posProducts.push({ id: doc.id, name: d.name || '', category: d.category || '',
              price: Number(d.price) || 0, stock: Number(d.stock) || 0, imageUrl: d.imageUrl || '' });
          });
          posLoaded = true;
          posRenderGrid(posProducts);
        }).catch(function () { posRenderGrid([]); });
    } catch (e) { posRenderGrid([]); }
  }

  window.posFilterProducts = function () {
    var search = ((document.getElementById('pos-search') || {}).value || '').toLowerCase();
    var cat    = ((document.getElementById('pos-cat-filter') || {}).value) || '';
    posRenderGrid(posProducts.filter(function (p) {
      if (cat && p.category !== cat) return false;
      return !search || p.name.toLowerCase().indexOf(search) !== -1;
    }));
  };

  function posRenderGrid(items) {
    var grid = document.getElementById('pos-product-grid');
    var emptyEl = document.getElementById('pos-product-empty');
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    grid.innerHTML = items.map(function (p) {
      var oos = p.stock <= 0 ? ' out-of-stock' : '';
      var imgHtml = p.imageUrl
        ? '<img src="' + posEsc(p.imageUrl) + '" alt="" loading="lazy">'
        : '<img src="https://prueb2.dashnexpages.net/assets/svg-icons/solar-paw-bold.svg" style="width:40px;height:40px;opacity:0.2;" alt="">';
      return '<div class="pos-product-card' + oos + '" onclick="posAddProduct(\'' + posEsc(p.id) + '\')">' +
        '<div class="pos-card-img">' + imgHtml + '</div>' +
        '<div class="pos-card-name">' + posEsc(p.name) + '</div>' +
        '<div class="pos-card-price">Bs ' + p.price + '</div>' +
        '<div class="pos-card-stock">Stock: ' + p.stock + '</div>' +
        '<button class="pos-card-add-btn">+ Agregar</button></div>';
    }).join('');
  }

  window.posAddProduct = function (productId) {
    var product = posProducts.find(function (p) { return p.id === productId; });
    if (!product || product.stock <= 0) return;
    var existing = posNote.find(function (i) { return i.productId === productId; });
    if (existing) {
      if (existing.qty >= product.stock) { alert('Stock insuficiente: ' + product.stock); return; }
      existing.qty++;
    } else {
      posNote.push({ productId: productId, name: product.name, price: product.price, qty: 1, stock: product.stock });
    }
    posRenderNote();
    posRecalculate();
  };

  window.posChangeQty = function (productId, delta) {
    var item = posNote.find(function (i) { return i.productId === productId; });
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) posNote = posNote.filter(function (i) { return i.productId !== productId; });
    else if (item.qty > item.stock) item.qty = item.stock;
    posRenderNote();
    posRecalculate();
  };

  window.posRemoveItem = function (productId) {
    posNote = posNote.filter(function (i) { return i.productId !== productId; });
    posRenderNote();
    posRecalculate();
  };

  function posRenderNote() {
    var el = document.getElementById('pos-note-items');
    if (!el) return;
    if (!posNote.length) {
      el.innerHTML = '<div style="text-align:center;padding:24px;color:#BDBDBD;font-size:0.82rem;">Agrega productos haciendo clic en el grid</div>';
      return;
    }
    el.innerHTML = posNote.map(function (item) {
      return '<div class="pos-note-item">' +
        '<div class="pos-note-item-name">' + posEsc(item.name) + '</div>' +
        '<button class="pos-note-qty-btn" onclick="posChangeQty(\'' + item.productId + '\',-1)">&#8722;</button>' +
        '<span class="pos-note-qty-val">' + item.qty + '</span>' +
        '<button class="pos-note-qty-btn" onclick="posChangeQty(\'' + item.productId + '\',1)">+</button>' +
        '<span class="pos-note-price">Bs ' + (item.price * item.qty) + '</span>' +
        '<button class="pos-note-del" onclick="posRemoveItem(\'' + item.productId + '\')">&#10005;</button>' +
        '</div>';
    }).join('');
  }

  window.posRecalculate = function () {
    var subtotal = posNote.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    var discVal  = parseFloat(((document.getElementById('pos-discount-val') || {}).value) || '0') || 0;
    var discType = ((document.getElementById('pos-discount-type') || {}).value) || 'bs';
    var disc = 0;
    if (discVal > 0) { disc = discType === 'pct' ? subtotal * discVal / 100 : discVal; disc = Math.min(disc, subtotal); }
    var total = subtotal - disc;
    var ps = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    ps('pos-subtotal', 'Bs ' + subtotal.toFixed(2));
    ps('pos-total', 'Bs ' + total.toFixed(2));
    ps('pos-total-words', 'Son: ' + posN2W(Math.floor(total)) + ' 00/100 BOLIVIANOS');
    var dr = document.getElementById('pos-discount-row');
    if (dr) { dr.style.display = disc > 0 ? 'flex' : 'none'; ps('pos-discount-display', '- Bs ' + disc.toFixed(2)); }
  };

  window.posSelectPayment = function (btn) {
    document.querySelectorAll('.pos-pay-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    posPayMethod = btn.dataset.method || 'Efectivo';
  };

  window.posClearNote = function () {
    posNote = [];
    posRenderNote();
    posRecalculate();
    ['pos-client-name','pos-client-phone','pos-discount-val','pos-promo-code'].forEach(function (id) {
      var e = document.getElementById(id); if (e) e.value = '';
    });
  };

  window.posFinalizeSale = function () {
    if (!posNote.length) { alert('Agrega al menos un producto.'); return; }
    var cName  = ((document.getElementById('pos-client-name') || {}).value || '').trim();
    var cPhone = ((document.getElementById('pos-client-phone') || {}).value || '').trim();
    var discVal  = parseFloat(((document.getElementById('pos-discount-val') || {}).value) || '0') || 0;
    var discType = ((document.getElementById('pos-discount-type') || {}).value) || 'bs';
    var promoCode = ((document.getElementById('pos-promo-code') || {}).value || '').trim().toUpperCase();
    var subtotal = posNote.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    var disc = 0;
    if (discVal > 0) { disc = discType === 'pct' ? subtotal * discVal / 100 : discVal; disc = Math.min(disc, subtotal); }
    var total = subtotal - disc;
    var now = new Date();
    var saleId = 'NV-' + now.getFullYear() + '-' + String(Date.now()).slice(-4);
    var saleData = {
      saleId: saleId, source: 'fisica', paymentMethod: posPayMethod,
      client: { name: cName, phone: cPhone },
      items: posNote.map(function (i) { return { productId: i.productId, name: i.name, price: i.price, qty: i.qty, subtotal: i.price * i.qty }; }),
      subtotal: subtotal, discount: disc, promoCode: promoCode || null, total: total, createdAt: now.toISOString()
    };
    try {
      var dbInst = db();
      var batch = dbInst.batch();
      batch.set(dbInst.collection('sales').doc(), saleData);
      posNote.forEach(function (item) {
        batch.update(dbInst.collection('products').doc(item.productId), { stock: firebase.firestore.FieldValue.increment(-item.qty) });
        var local = posProducts.find(function (p) { return p.id === item.productId; }); if (local) local.stock -= item.qty;
      });
      batch.commit().then(function () { posOpenPDF(saleId, cName, cPhone, subtotal, disc, total, now); posClearNote(); posRenderGrid(posProducts); })
        .catch(function (err) { alert('Error: ' + (err.message || 'intenta de nuevo')); });
    } catch (e) { posOpenPDF(saleId, cName, cPhone, subtotal, disc, total, now); posClearNote(); }
  };

  function posOpenPDF(saleId, cName, cPhone, subtotal, disc, total, date) {
    var dateStr = date.toLocaleDateString('es-BO') + ' ' + date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    var rows = posNote.map(function (i) {
      return '<tr><td>' + posEsc(i.name) + '</td><td style="text-align:center">' + i.qty + '</td><td style="text-align:right">Bs ' + i.price + '</td><td style="text-align:right">Bs ' + (i.price * i.qty) + '</td></tr>';
    }).join('');
    var discHtml = disc > 0 ? '<tr><td colspan="3" style="text-align:right">Descuento</td><td style="text-align:right;color:#22C55E">-Bs ' + disc.toFixed(2) + '</td></tr>' : '';
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Nota ' + saleId + '</title>' +
      '<style>body{font-family:sans-serif;padding:28px;max-width:400px;margin:0 auto}h1{font-size:1.3rem;font-weight:800;text-align:center}' +
      '.sub{text-align:center;font-size:0.78rem;color:#757575;margin-bottom:14px}.info{background:#F8F9FB;border-radius:8px;padding:10px;font-size:0.80rem;margin-bottom:14px}' +
      'table{width:100%;border-collapse:collapse;font-size:0.80rem}th{border-bottom:2px solid #4552CC;padding:6px 8px;text-align:left;color:#4552CC}' +
      'td{padding:6px 8px;border-bottom:1px solid #E0E0E0}.total-row{font-weight:800;border-top:2px solid #4552CC}' +
      '.words{font-style:italic;font-size:0.74rem;color:#616161;margin-top:6px}.footer{margin-top:20px;border-top:1px dashed #9E9E9E;padding-top:14px;font-size:0.72rem;color:#9E9E9E;text-align:center}' +
      '@media print{button{display:none}}</style></head><body>' +
      '<h1>PETCINGO</h1><div class="sub">Sistema de Identificacion de Mascotas</div>' +
      '<div class="info"><strong>NOTA DE VENTA</strong><br>N&#xBA; ' + saleId + '<br>Fecha: ' + dateStr +
      (cName ? '<br>Cliente: ' + posEsc(cName) : '') + (cPhone ? '<br>Tel: ' + posEsc(cPhone) : '') + '</div>' +
      '<table><thead><tr><th>Producto</th><th>Cant</th><th style="text-align:right">Precio</th><th style="text-align:right">Total</th></tr></thead>' +
      '<tbody>' + rows + '</tbody><tfoot><tr><td colspan="3" style="text-align:right">Subtotal</td><td style="text-align:right">Bs ' + subtotal.toFixed(2) + '</td></tr>' +
      discHtml + '<tr class="total-row"><td colspan="3" style="text-align:right">TOTAL</td><td style="text-align:right;color:#4552CC">Bs ' + total.toFixed(2) + '</td></tr></tfoot></table>' +
      '<div class="words">Son: ' + posN2W(Math.floor(total)) + ' 00/100 BOLIVIANOS</div>' +
      '<div class="info" style="margin-top:10px">Pago: <strong>' + posPayMethod + '</strong></div>' +
      '<div class="footer"><div style="margin-bottom:28px">_________________________<br>Firma del cliente</div>&#169; ' + date.getFullYear() + ' Petcingo</div>' +
      '<br><button onclick="window.print()" style="padding:10px 24px;background:#4552CC;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;width:100%">Imprimir</button>' +
      '</body></html>';
    var win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  function posN2W(n) {
    if (n === 0) return 'CERO';
    if (n < 0) return 'MENOS ' + posN2W(-n);
    var O = ['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISEIS','DIECISIETE','DIECIOCHO','DIECINUEVE'];
    var T = ['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
    var H = ['','CIEN','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
    if (n < 20) return O[n];
    if (n < 100) { var t2=T[Math.floor(n/10)]; var o2=n%10; if (n>=20&&n<30&&o2>0) return 'VEINTI'+O[o2]; return t2+(o2?' Y '+O[o2]:''); }
    if (n===100) return 'CIEN';
    if (n < 1000) return H[Math.floor(n/100)]+(n%100?' '+posN2W(n%100):'');
    if (n < 2000) return 'MIL'+(n%1000?' '+posN2W(n%1000):'');
    if (n < 1000000) { var k=Math.floor(n/1000); return posN2W(k)+' MIL'+(n%1000?' '+posN2W(n%1000):''); }
    return String(n);
  }
  window.numberToWords = posN2W;

  function posEsc(s) { return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  var _origShow = window.showSection;
  window.showSection = function (section, btn) {
    if (typeof _origShow === 'function') _origShow(section, btn);
    if (section === 'pos') setTimeout(window.posInit, 80);
  };

}());