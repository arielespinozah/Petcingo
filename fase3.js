const fs = require('fs');

const selectHTML = `<select class="ptcg-checkout__input" id="ptcg-intl-country" style="padding-left:14px;cursor:pointer;">
  <option value="">Selecciona tu país...</option>
  <option value="Argentina">🇦🇷 Argentina</option>
  <option value="Bolivia">🇧🇴 Bolivia</option>
  <option value="Brasil">🇧🇷 Brasil</option>
  <option value="Chile">🇨🇱 Chile</option>
  <option value="Colombia">🇨🇴 Colombia</option>
  <option value="Ecuador">🇪🇨 Ecuador</option>
  <option value="México">🇲🇽 México</option>
  <option value="Perú">🇵🇪 Perú</option>
  <option value="Paraguay">🇵🇾 Paraguay</option>
  <option value="Uruguay">🇺🇾 Uruguay</option>
  <option value="Venezuela">🇻🇪 Venezuela</option>
  <option value="España">🇪🇸 España</option>
  <option value="Estados Unidos">🇺🇸 Estados Unidos</option>
</select>`;

const file = 'f:/Antigravity/Petcingo/paginas_html/checkout-internacional.html';
let content = fs.readFileSync(file, 'utf8');

// Replace the input with the select
content = content.replace(/<input[^>]*id="ptcg-intl-country"[^>]*>/, selectHTML);
fs.writeFileSync(file, content, 'utf8');
console.log('checkout-internacional.html updated for fase 3');
