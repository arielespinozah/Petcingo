const fs = require('fs');

const htmlPromoBlock = `<!-- Código promocional -->
<div style="border:1px dashed rgba(69,82,204,0.25) !important;border-radius:14px !important;overflow:hidden !important;margin-top:4px;">
  <button onclick="ptcgTogglePromo()" style="width:100% !important;padding:14px 16px !important;background:rgba(238,240,250,0.50) !important;border:none !important;text-align:left !important;color:#4552CC !important;font-weight:600 !important;font-size:0.84rem !important;cursor:pointer !important;display:flex !important;align-items:center !important;justify-content:space-between !important;">
    <span><i class="ri-coupon-line" style="margin-right:8px;"></i>¿Tienes un código promocional?</span>
    <i class="ri-arrow-down-s-line" id="ptcg-promo-arrow" style="transition:transform 0.2s;"></i>
  </button>
  <div id="ptcg-promo-area" style="display:none !important;padding:0 14px 14px;border-top:1px solid rgba(69,82,204,0.08);flex-direction:row;gap:8px;">
    <input id="ptcg-promo-code" type="text" placeholder="Ej: PETCINGO10" style="flex:1;min-width:130px;padding:10px 14px;border:1.5px solid rgba(69,82,204,0.15);border-radius:10px;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.88rem;color:#1E255E;outline:none;" maxlength="20" oninput="this.value=this.value.toUpperCase()">
    <button onclick="ptcgApplyPromo()" style="padding:10px 18px;background:#4552CC;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:0.84rem;cursor:pointer;flex-shrink:0;">Aplicar</button>
  </div>
</div>`;

const jsPromoToggle = `window.ptcgTogglePromo = function() {
  var area = document.getElementById('ptcg-promo-area');
  var arrow = document.getElementById('ptcg-promo-arrow');
  if (!area) return;
  if (area.style.display === 'none' || area.style.display === '') {
    area.style.display = 'flex';
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  } else {
    area.style.display = 'none';
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  }
};`;

const htmlFiles = [
  'f:/Antigravity/Petcingo/paginas_html/checkout.html',
  'f:/Antigravity/Petcingo/paginas_html/checkout-internacional.html'
];

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const oldBlockRegex = /<div style="display:flex;align-items:center;gap:8px;margin-top:8px;">\s*<input type="text" class="ptcg-checkout__input" id="ptcg-promo-input"[^>]*>\s*<button class="ptcg-checkout__btn ptcg-checkout__btn--secondary" type="button" onclick="ptcgApplyPromo\(\)"[^>]*>Aplicar<\/button>\s*<\/div>/;
  content = content.replace(oldBlockRegex, htmlPromoBlock);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated promo block in', file);
});

const jsFile = 'f:/Antigravity/Petcingo/assets/js/petcingo-checkout.js';
let jsContent = fs.readFileSync(jsFile, 'utf8');

if (!jsContent.includes('ptcgTogglePromo')) {
  jsContent += '\n' + jsPromoToggle + '\n';
}

// Update ptcg-promo-input to ptcg-promo-code if found in ptcgApplyPromo
jsContent = jsContent.replace(/byId\('ptcg-promo-input'\)/g, "byId('ptcg-promo-code')");
fs.writeFileSync(jsFile, jsContent, 'utf8');
console.log('Updated petcingo-checkout.js');
