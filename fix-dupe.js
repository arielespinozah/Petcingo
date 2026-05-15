const fs = require('fs');
const file = 'f:/Antigravity/Petcingo/assets/js/petcingo-checkout.js';
let content = fs.readFileSync(file, 'utf8');

// I will remove the first occurrence of window.ptcgSetDelivery and window.ptcgUpdateDelivery and window.ptcgSimZone
const regex = /\/\*\s*-{66}\s*\*\/\s*\/\*\s*DELIVERY \(solo Bolivia\)\s*\*\/\s*\/\*\s*-{66}\s*\*\/[\s\S]*?(?=\/\*\s*-{66}\s*\*\/\s*\/\*\s*FORMULARIO FASE 2)/;

if (regex.test(content)) {
  content = content.replace(regex, '');
  console.log('Removed old delivery functions block.');
} else {
  // Try another approach
  console.log('Regex did not match, using manual slicing.');
  const lines = content.split('\n');
  let startIdx = -1;
  let endIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('DELIVERY (solo Bolivia)')) {
      startIdx = i;
    }
    if (startIdx !== -1 && lines[i].includes('FORMULARIO FASE 2')) {
      endIdx = i;
      break;
    }
  }
  if (startIdx !== -1 && endIdx !== -1) {
    // startIdx is around line 190. The FASE 2 is around 305.
    lines.splice(startIdx - 1, endIdx - startIdx + 1);
    content = lines.join('\n');
    console.log('Removed via slicing from line', startIdx, 'to', endIdx);
  }
}

// 2. Agregar updateTotalDisplay() y conectarla a todos los eventos
// The user asks to use updateTotalDisplay() instead of ptcgUpdateTotals() or replace the call ptcgUpdateTotals with updateTotalDisplay.
// Wait, my FASE 2 appended updateTotalDisplay:
/*
function updateTotalDisplay() {
  var total = selectedPlan ? (selectedPlan.price * quantity - (appliedPromo ? appliedPromo.amount : 0) + deliveryFee) : 0;
  if (total < 0) total = 0;
  var totalEl = document.getElementById('ptcg-sum-total');
  if (totalEl) totalEl.textContent = total + ' Bs';
}
*/
// The existing code has ptcgUpdateTotals which updates 'ptcg-summary-total'.
// Since the user EXPLICITLY requested to use updateTotalDisplay and update #ptcg-summary-total (or ptcg-sum-total), let's ensure updateTotalDisplay updates ptcg-summary-total and replace ptcgUpdateTotals with updateTotalDisplay where necessary, or just rename ptcgUpdateTotals to updateTotalDisplay and adjust.
// Actually, it's safer to just replace 'ptcgUpdateTotals()' with 'updateTotalDisplay()' everywhere and modify updateTotalDisplay to update 'ptcg-summary-total' instead of 'ptcg-sum-total'.

content = content.replace(/ptcgUpdateTotals\(\)/g, 'updateTotalDisplay()');
content = content.replace(/'ptcg-sum-total'/g, "'ptcg-summary-total'");

// And ensure appliedPromo uses the right property. The promo obj has `discount` not `amount` in ptcgApplyPromo.
// Original FASE 2 script: `(appliedPromo ? appliedPromo.amount : 0)`
// It should be `discount` or whatever. Let's fix that.
content = content.replace(/appliedPromo \? appliedPromo\.amount : 0/g, 'appliedPromo ? (appliedPromo.type === "amount" ? appliedPromo.discount : (selectedPlan.price * quantity * (appliedPromo.discount / 100))) : 0');

fs.writeFileSync(file, content, 'utf8');
console.log('petcingo-checkout.js duplicated functions fixed');
