const fs = require('fs');
const file = 'f:/Antigravity/Petcingo/paginas_html/dashboard.html';
let content = fs.readFileSync(file, 'utf8');

// The button "Verificar pago" currently has class ptcg-index__btn--success btn-sm
// Update: ptcg-index__btn ptcg-index__btn--primary btn-sm
content = content.replace(/ptcg-index__btn--success btn-sm" style="margin-right:4px;" onclick="openVerifyModal/g, 'ptcg-index__btn--primary btn-sm" style="margin-right:4px;" onclick="openVerifyModal');

// For "escFn" I've seen it earlier, let's verify if it's there
if (!content.includes('function escFn(')) {
  content = content.replace(/(\(function\(\) \{\s*'use strict';\s*)/, '$1\n  function escFn(s) { return String(s == null ? \'\' : s).replace(/&/g,\'&amp;\').replace(/</g,\'&lt;\').replace(/>/g,\'&gt;\').replace(/"/g,\'&quot;\'); }\n');
}

// Add lucide.createIcons() inside modals
if (content.includes('window.openVerifyModal = function(orderId) {') && !content.includes('lucide.createIcons()')) {
  content = content.replace(/document\.getElementById\('verify-payment-modal'\)\.style\.display = 'flex';/g, "document.getElementById('verify-payment-modal').style.display = 'flex';\n  if(typeof lucide !== 'undefined') lucide.createIcons();");
}

fs.writeFileSync(file, content, 'utf8');
console.log('dashboard.html updated for fase 5');
