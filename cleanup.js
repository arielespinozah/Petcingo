const fs = require('fs');
const file = 'f:/Antigravity/Petcingo/assets/js/petcingo-checkout.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

let inOldDelivery = false;
let newLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  if (line.includes('DELIVERY (solo Bolivia)')) {
    inOldDelivery = true;
    newLines.push(line); // keep the comment header
    continue;
  }
  
  if (inOldDelivery && line.includes('METODOS DE PAGO')) {
    inOldDelivery = false;
    // We just finished skipping the old delivery block.
    // The previous line was likely the end of the comment block for METODOS DE PAGO
    // So we keep this line.
  }

  if (!inOldDelivery) {
    newLines.push(line);
  }
}

// Now remove the duplicate updateTotalDisplay at the end of the file.
// It looks like:
// function updateTotalDisplay() {
//   var total = selectedPlan ? ...
//   if (total < 0) total = 0;
//   var totalEl = document.getElementById('ptcg-summary-total');
//   if (totalEl) totalEl.textContent = total + ' Bs';
// }
let resultStr = newLines.join('\n');
resultStr = resultStr.replace(/function updateTotalDisplay\(\) \{\s*var total = selectedPlan[\s\S]*?\}\s*window\.ptcgSimZone/g, 'window.ptcgSimZone');

fs.writeFileSync(file, resultStr, 'utf8');
console.log('Cleaned up petcingo-checkout.js');
