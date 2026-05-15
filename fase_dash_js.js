const fs = require('fs');

const file = 'f:/Antigravity/Petcingo/paginas_html/dashboard.html';
let content = fs.readFileSync(file, 'utf8');

const jsUpdates = `
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
        html += '<img src="' + d.receiptUrl + '" style="width:100%;max-height:300px;object-fit:contain;border-radius:12px;border:1px solid #E0E0E0;cursor:pointer;" alt="Comprobante" onerror="this.style.display=\\'none\\'">';
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
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--success" style="flex:1;" onclick="verifyOrderApprove(\\'' + orderId + '\\')"><i class="ri-check-line"></i> Aceptar pago</button>';
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--danger" style="flex:1;" onclick="verifyOrderReject(\\'' + orderId + '\\')"><i class="ri-close-line"></i> Rechazar</button>';
      } else if (d.status === 'confirmed') {
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--primary" style="flex:1;" onclick="markAsProcessing(\\'' + orderId + '\\')"><i class="ri-box-3-line"></i> Marcar en preparacion</button>';
      } else if (d.status === 'processing') {
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--primary" style="flex:1;" onclick="openShippingForm(\\'' + orderId + '\\')"><i class="ri-truck-line"></i> Registrar envio</button>';
      } else if (d.status === 'shipped') {
        btnsHtml += '<button class="ptcg-index__btn ptcg-index__btn--success" style="flex:1;" onclick="markAsDelivered(\\'' + orderId + '\\')"><i class="ri-check-double-line"></i> Marcar entregado</button>';
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
    win.document.write('<script>window.onload=function(){window.print();};<\\/script></body></html>');
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
        acciones += '<button class="ptcg-index__btn ptcg-index__btn--success btn-sm" onclick="openVerifyModal(\\'' + o.id + '\\')"><i class="ri-shield-check-line"></i> Verificar pago</button> ';
      } else {
        acciones += '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="openVerifyModal(\\'' + o.id + '\\')" title="Ver detalles"><i class="ri-eye-line"></i></button> ';
      }
      
      if (status !== 'pending' && status !== 'rejected') {
        acciones += '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="printShippingGuide(\\'' + o.id + '\\')" title="Imprimir guía"><i class="ri-printer-line"></i></button> ';
      }
      
      acciones += '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" style="color:' + (isUrgent ? '#f44336' : '#757575') + '" onclick="toggleUrgent(\\'' + o.id + '\\',' + isUrgent + ')" title="' + (isUrgent ? 'Quitar urgente' : 'Marcar urgente') + '"><i class="ri-flashlight-line"></i></button>';

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
`;

// Replace existing order functions
// Let's remove the block from "var _ordersCache = [];" up to "window.printGuide"
const oldOrdersRegex = /var _ordersCache = \[\];[\s\S]*?<\/script>/;
// Let's just find the closing script tag at the very end of the file and replace everything after "var _ordersCache ="
const splitPoint = content.indexOf('var _ordersCache =');
if (splitPoint !== -1) {
  let firstPart = content.substring(0, splitPoint);
  let secondPart = content.substring(splitPoint);
  
  // Actually we need to make sure we don't delete other important things that are below `window.printGuide`.
  // Is there anything below printGuide?
  // I will just append jsUpdates inside the script before `</script>`. But I need to clear the old loadOrders, renderOrders, printGuide etc.
  // It's safer to use regex to replace specific functions.
}

// Since I have a regex, I will do a function-by-function replacement to be safe.
function replaceFunc(funcName, newImpl) {
  const r = new RegExp('window\\.' + funcName + '\\s*=\\s*function\\s*\\([\\s\\S]*?\\{([\\s\\S]*?\\n\\s*\\};)', 'g');
  if (content.match(r)) {
    content = content.replace(r, newImpl);
  } else {
    const r2 = new RegExp('function\\s+' + funcName + '\\s*\\([\\s\\S]*?\\{([\\s\\S]*?\\n\\s*\\})', 'g');
    if (content.match(r2)) {
      content = content.replace(r2, newImpl);
    } else {
      // Not found, append it before closing script
      content = content.replace('</script>\n</body>', newImpl + '\n</script>\n</body>');
    }
  }
}

// Let's just wipe out the old implementations of these specifically:
content = content.replace(/window\.loadOrders\s*=\s*function[\s\S]*?\}\;/g, '');
content = content.replace(/function\s+renderOrders[\s\S]*?\}\n/g, '');
content = content.replace(/window\.changeOrderStatus\s*=\s*function[\s\S]*?\}\;/g, '');
content = content.replace(/window\.printGuide\s*=\s*function[\s\S]*?\}\;/g, '');
content = content.replace(/function\s+getNextOrderStatus[\s\S]*?\}\n/g, '');
content = content.replace(/window\.openVerifyModal\s*=\s*function[\s\S]*?\}\;/g, '');
content = content.replace(/window\.closeVerifyModal\s*=\s*function[\s\S]*?\}\;/g, '');
content = content.replace(/window\._currentVerifyOrderId\s*=\s*null;/g, '');

// Now append new implementations before the closing script
content = content.replace(/<\/script>\s*(<script src="https:\/\/unpkg\.com\/lucide@latest"><\/script>\s*<script>lucide\.createIcons\(\);<\/script>\s*)?<\/body>/, jsUpdates + '\n</script>\n$1</body>');

fs.writeFileSync(file, content, 'utf8');
console.log('Javascript functions replaced successfully.');
