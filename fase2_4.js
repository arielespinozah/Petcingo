const fs = require('fs');

const jsContentToAdd = `// Listas de ciudades
var SCZ_CITIES = ['Santa Cruz de la Sierra'];
var DOMICILIO_CITIES = ['La Paz', 'El Alto', 'Cochabamba', 'Sacaba', 'Quillacollo'];

window.ptcgUpdateDelivery = function() {
  var citySelect = document.getElementById('ptcg-city');
  var city = citySelect ? citySelect.value : '';
  var pickupBtn = document.getElementById('ptcg-opt-pickup');
  var deliveryBtn = document.getElementById('ptcg-opt-delivery');
  var addrField = document.getElementById('ptcg-address-field');
  var shipInfo = document.getElementById('ptcg-shipping-info');
  var delPrice = document.getElementById('ptcg-del-price');
  var delLabel = deliveryBtn ? deliveryBtn.querySelector('div:first-of-type') : null;
  var delIcon = document.getElementById('ptcg-delivery-icon');
  var zoneMsg = document.getElementById('ptcg-zone-msg');

  if (SCZ_CITIES.indexOf(city) !== -1) {
    // ── SANTA CRUZ ──
    if (pickupBtn) pickupBtn.style.opacity = '1';
    if (pickupBtn) pickupBtn.style.pointerEvents = 'auto';
    if (deliveryBtn) deliveryBtn.style.opacity = '1';
    if (deliveryBtn) deliveryBtn.style.pointerEvents = 'auto';

    // Forzar Recoger como default
    if (deliveryType !== 'pickup' && deliveryType !== 'delivery') deliveryType = 'pickup';
    window.ptcgSetDelivery(deliveryType);

    if (delLabel) delLabel.textContent = 'Delivery';
    if (delIcon) delIcon.className = 'ri-motorbike-line';
    if (shipInfo) shipInfo.style.display = 'none';

    if (deliveryType === 'pickup') {
      showDeliveryInfo('Recoges tu placa en nuestra tienda (Santa Cruz). Te notificaremos cuando esté lista.');
    } else {
      showDeliveryInfo('Delivery en Santa Cruz. Calculamos el costo según tu zona.');
    }

  } else if (DOMICILIO_CITIES.indexOf(city) !== -1) {
    // ── LA PAZ, COCHABAMBA (DOMICILIO) ──
    if (pickupBtn) pickupBtn.style.opacity = '0.5';
    if (pickupBtn) pickupBtn.style.pointerEvents = 'none';
    if (deliveryBtn) deliveryBtn.style.opacity = '1';
    if (deliveryBtn) deliveryBtn.style.pointerEvents = 'auto';

    deliveryType = 'delivery';
    window.ptcgSetDelivery('delivery');
    deliveryFee = 30;
    if (delPrice) delPrice.textContent = '30 Bs';
    if (delLabel) delLabel.textContent = 'Envío a Domicilio';
    if (delIcon) delIcon.className = 'ri-box-3-line';
    if (addrField) addrField.style.display = '';
    if (zoneMsg) zoneMsg.style.display = 'none';
    if (shipInfo) shipInfo.style.display = 'none';

    showDeliveryInfo('Envío a domicilio con transportadora (30 Bs fijo). Demora de 2 a 5 días hábiles. La transportadora se comunicará para coordinar la entrega.');

  } else {
    // ── RESTO DE BOLIVIA (ENVÍO POR PAGAR) ──
    if (pickupBtn) pickupBtn.style.opacity = '0.5';
    if (pickupBtn) pickupBtn.style.pointerEvents = 'none';
    if (deliveryBtn) deliveryBtn.style.opacity = '1';
    if (deliveryBtn) deliveryBtn.style.pointerEvents = 'auto';

    deliveryType = 'delivery';
    window.ptcgSetDelivery('delivery');
    deliveryFee = 0;
    if (delPrice) delPrice.textContent = '0 Bs';
    if (delLabel) delLabel.textContent = 'Envío por Pagar';
    if (delIcon) delIcon.className = 'ri-box-3-line';
    if (addrField) addrField.style.display = 'none';
    if (zoneMsg) zoneMsg.style.display = 'none';
    if (shipInfo) shipInfo.style.display = 'none';

    showDeliveryInfo('Envío por pagar contra entrega. Enviamos a la terminal de buses de tu ciudad. El costo del flete lo pagas al recoger en la transportadora.');
  }

  updateTotalDisplay();
};

window.ptcgSetDelivery = function(type) {
  deliveryType = type;
  var pickupBtn = document.getElementById('ptcg-opt-pickup');
  var deliveryBtn = document.getElementById('ptcg-opt-delivery');
  var addrField = document.getElementById('ptcg-address-field');

  if (pickupBtn) pickupBtn.classList.toggle('is-selected', type === 'pickup');
  if (deliveryBtn) deliveryBtn.classList.toggle('is-selected', type === 'delivery');

  if (type === 'pickup') {
    deliveryFee = 0;
    if (addrField) addrField.style.display = 'none';
    showDeliveryInfo('Recoges tu placa en nuestra tienda (Santa Cruz). Te notificaremos cuando esté lista.');
  } else {
    var city = document.getElementById('ptcg-city') ? document.getElementById('ptcg-city').value : '';
    if (SCZ_CITIES.indexOf(city) !== -1) {
      deliveryFee = 10; // base
      if (addrField) addrField.style.display = '';
      showDeliveryInfo('Delivery en Santa Cruz. Calculamos el costo según tu zona.');
    }
  }

  updateTotalDisplay();
};

function showDeliveryInfo(msg) {
  var info = document.getElementById('ptcg-delivery-info');
  if (!info) return;
  info.textContent = msg;
  info.style.display = '';
}

function updateTotalDisplay() {
  var total = selectedPlan ? (selectedPlan.price * quantity - (appliedPromo ? appliedPromo.amount : 0) + deliveryFee) : 0;
  if (total < 0) total = 0;
  var totalEl = document.getElementById('ptcg-sum-total');
  if (totalEl) totalEl.textContent = total + ' Bs';
}

window.ptcgSimZone = function() {
  var txt = (document.getElementById('ptcg-address') ? document.getElementById('ptcg-address').value : '').toLowerCase();
  var msg = document.getElementById('ptcg-zone-msg');
  var txtEl = document.getElementById('ptcg-zone-text');
  if (!msg || !txtEl) return;

  var fee = 10; // base
  var zone = 'Estándar';

  if (txt.includes('norte') || txt.includes('4to') || txt.includes('cuarto') || txt.includes('equipetrol') || txt.includes('av. banzer')) {
    fee = 15;
    zone = 'Norte / Equipetrol / Av. Banzer';
  } else if (txt.includes('sur') || txt.includes('3er') || txt.includes('tercer') || txt.includes('radial')) {
    fee = 15;
    zone = 'Sur / Radial';
  } else if (txt.includes('centro') || txt.includes('casco viejo')) {
    fee = 10;
    zone = 'Centro';
  } else if (txt.length > 4) {
    zone = 'Estándar (según dirección)';
  }

  deliveryFee = fee;
  txtEl.textContent = 'Zona ' + zone + ': ' + fee + ' Bs';
  msg.removeAttribute('hidden');
  document.getElementById('ptcg-del-price').textContent = fee + ' Bs';
  updateTotalDisplay();
};
`;

const jsFile = 'f:/Antigravity/Petcingo/assets/js/petcingo-checkout.js';
let jsContent = fs.readFileSync(jsFile, 'utf8');

// Replace old functions
jsContent = jsContent.replace(/window\.ptcgUpdateDelivery\s*=\s*function\(\)\s*\{[\s\S]*?\};/g, '');
jsContent = jsContent.replace(/window\.ptcgSetDelivery\s*=\s*function\(.*?\)\s*\{[\s\S]*?\};/g, '');
jsContent = jsContent.replace(/function\s+showDeliveryInfo\(.*?\)\s*\{[\s\S]*?\}/g, '');
jsContent = jsContent.replace(/function\s+updateTotalDisplay\(\)\s*\{[\s\S]*?\}/g, '');
jsContent = jsContent.replace(/window\.ptcgSimZone\s*=\s*function\(\)\s*\{[\s\S]*?\};/g, '');
jsContent = jsContent.replace(/var\s+SCZ_CITIES[^;]*;/, '');
jsContent = jsContent.replace(/var\s+DOMICILIO_CITIES[^;]*;/, '');

jsContent += '\n' + jsContentToAdd + '\n';
fs.writeFileSync(jsFile, jsContent, 'utf8');
console.log('petcingo-checkout.js updated for fase 2 and 4');

// Also update checkout.html
const htmlFile = 'f:/Antigravity/Petcingo/paginas_html/checkout.html';
let htmlContent = fs.readFileSync(htmlFile, 'utf8');

// The prompt says: "HTML adicional en checkout.html: Agregar un párrafo informativo debajo del selector de entrega:"
// Find the delivery selector container. It usually has `id="ptcg-opt-delivery"` or a parent. Let's insert it after the row of buttons:
if (!htmlContent.includes('id="ptcg-delivery-info"')) {
  htmlContent = htmlContent.replace(/(<div[^>]*id="ptcg-opt-delivery"[^>]*>.*?<\/div>\s*<\/div>)/is, '$1\n          <p id="ptcg-delivery-info" style="font-size:0.78rem;color:#6C7297;line-height:1.5;margin-top:8px;display:none;"></p>');
  fs.writeFileSync(htmlFile, htmlContent, 'utf8');
  console.log('checkout.html updated for fase 2');
}
