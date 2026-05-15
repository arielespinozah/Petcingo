const fs = require('fs');

const file = 'f:/Antigravity/Petcingo/paginas_html/checkout.html';
let content = fs.readFileSync(file, 'utf8');

const oldContainer = '<div style="display:flex;flex-direction:column;gap:10px;background:rgba(238,240,250,0.60);border-radius:14px;padding:16px;">';
const newContainer = '<div style="display:flex;flex-direction:column;gap:14px;background:#FAFBFF;border-radius:16px;padding:20px 18px;border:1px solid rgba(69,82,204,0.10);">';

content = content.replace(oldContainer, newContainer);

const oldRow = '<div style="display:flex;justify-content:space-between;align-items:center;">';
const newRow = '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(69,82,204,0.05);">';

// Since there are exactly 4 rows in that card
// And they might be used elsewhere, let's use a regex that matches within the ptcg-bank-card block.
// Or we can just globally replace if that's the only place they look exactly like that?
// Actually I will do it with a strict replace on the block.

const cardRegex = /<div class="ptcg-checkout__card" id="ptcg-bank-card" hidden>([\s\S]*?)<\/div>\s*<p style="font-size:0\.82rem/m;
const match = content.match(cardRegex);
if (match) {
  let block = match[1];
  block = block.replace(new RegExp('<div style="display:flex;justify-content:space-between;align-items:center;">', 'g'), newRow);
  content = content.replace(match[1], block);
}

fs.writeFileSync(file, content, 'utf8');
console.log('checkout.html updated for FASE 3');
