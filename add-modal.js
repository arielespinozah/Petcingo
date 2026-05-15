const fs = require('fs');
const path = 'f:/Antigravity/Petcingo/paginas_html/dashboard.html';
let content = fs.readFileSync(path, 'utf8');

// 1. Update renderOrders button
// Original: (nextLabel ? '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="changeOrderStatus(\'' + o.id + '\',\'' + nextStatus + '\')" title="Avanzar a ' + nextLabel + '"><i class="ri-arrow-right-line"></i></button> ' : '') +
if (!content.includes('openVerifyModal')) {
  content = content.replace(
    /(\(nextLabel \? '<button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="changeOrderStatus\(\'' \+ o\.id \+ '\',\'' \+ nextStatus \+ '\'\)" title="Avanzar a ' \+ nextLabel \+ '"><i class="ri-arrow-right-line"><\/i><\/button> ' : ''\)\s*\+)/,
    '(status === "pendiente" || status === "pending" ? \'<button class="ptcg-index__btn ptcg-index__btn--success btn-sm" style="margin-right:4px;" onclick="openVerifyModal(\\\'\' + o.id + \'\\\')" title="Verificar Pago"><i data-lucide="shield-check"></i></button>\' : \'\') + \n          $1'
  );
}

// 2. Add Modal HTML and JS functions
if (!content.includes('verify-payment-modal')) {
  const modalHTML = `
<!-- Verify Payment Modal -->
<div id="verify-payment-modal" style="display:none;position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;padding:16px;">
  <div class="ptcg-index__modal-card" style="max-width:500px;width:100%;padding:28px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h3 style="font-family:'Sora',sans-serif;font-size:1.2rem;font-weight:800;margin:0;display:flex;align-items:center;gap:8px;"><i data-lucide="shield-check" style="color:#4552CC;"></i> Verificar Pago</h3>
      <button onclick="closeVerifyModal()" style="background:rgba(69,82,204,0.06);border:1px solid rgba(69,82,204,0.12);color:#616161;font-size:1rem;cursor:pointer;padding:6px 10px;border-radius:10px;line-height:1;transition:background 0.15s;" onmouseover="this.style.background='rgba(231,76,60,0.08)';this.style.color='#E74C3C'" onmouseout="this.style.background='rgba(69,82,204,0.06)';this.style.color='#616161'"><i data-lucide="x"></i></button>
    </div>
    <div id="verify-payment-details" style="font-size:0.9rem;color:#424242;margin-bottom:20px;line-height:1.5;"></div>
    <div style="display:flex;gap:10px;">
      <button class="ptcg-index__btn ptcg-index__btn--danger" style="flex:1;" onclick="rejectPayment()">Rechazar</button>
      <button class="ptcg-index__btn ptcg-index__btn--success" style="flex:1;" onclick="approvePayment()">Aprobar y Activar</button>
    </div>
  </div>
</div>

<script>
window._currentVerifyOrderId = null;

window.openVerifyModal = function(orderId) {
  var order = _ordersCache.find(function(o) { return o.id === orderId; });
  if (!order) return;
  window._currentVerifyOrderId = orderId;
  
  var d = order.data;
  var receiptHtml = d.receiptUrl 
    ? '<div style="margin-top:12px;"><a href="' + d.receiptUrl + '" target="_blank"><img src="' + d.receiptUrl + '" style="max-width:100%;max-height:250px;border-radius:8px;border:1px solid #ddd;" alt="Comprobante"></a></div>'
    : '<div style="margin-top:12px;color:#f44336;font-weight:600;">⚠️ Sin comprobante adjunto</div>';
    
  var detailsHtml = 
    '<strong>Comprador:</strong> ' + (d.buyerName || '—') + '<br>' +
    '<strong>Email:</strong> ' + (d.email || '—') + '<br>' +
    '<strong>Monto:</strong> ' + (d.amount ? d.amount + ' Bs' : '—') + '<br>' +
    '<strong>Mascota:</strong> ' + (d.petName || '—') + '<br>' +
    receiptHtml;
    
  document.getElementById('verify-payment-details').innerHTML = detailsHtml;
  document.getElementById('verify-payment-modal').style.display = 'flex';
  if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.closeVerifyModal = function() {
  document.getElementById('verify-payment-modal').style.display = 'none';
  window._currentVerifyOrderId = null;
};

window.approvePayment = function() {
  if (!window._currentVerifyOrderId) return;
  var orderId = window._currentVerifyOrderId;
  var order = _ordersCache.find(function(o) { return o.id === orderId; });
  if (!order) return;
  var db2 = typeof db === 'function' ? db() : firebase.firestore();
  
  var batch = db2.batch();
  var orderRef = db2.collection('orders').doc(orderId);
  batch.update(orderRef, { status: 'preparando', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  
  if (order.data.petId) {
    var petRef = db2.collection('pets').doc(order.data.petId);
    batch.update(petRef, { isActive: true, status: 'active', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  }
  
  batch.commit().then(function() {
    if (typeof toast === 'function') toast('Pago aprobado y mascota activada.');
    closeVerifyModal();
  }).catch(function(e) {
    if (typeof toast === 'function') toast('Error al aprobar: ' + e.message);
  });
};

window.rejectPayment = function() {
  if (!window._currentVerifyOrderId) return;
  if (!confirm('¿Seguro que deseas rechazar este pago?')) return;
  var db2 = typeof db === 'function' ? db() : firebase.firestore();
  
  db2.collection('orders').doc(window._currentVerifyOrderId).update({
    status: 'rechazado',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() {
    if (typeof toast === 'function') toast('Pago rechazado.');
    closeVerifyModal();
  }).catch(function(e) {
    if (typeof toast === 'function') toast('Error al rechazar: ' + e.message);
  });
};
</script>
`;
  content = content.replace('</body>', modalHTML + '\n</body>');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Verify modal added.');
