const fs = require('fs');
let content = fs.readFileSync('f:/Antigravity/Petcingo/assets/js/petcingo-dash.js', 'utf8');

// Replace specific emojis and characters
content = content.replace(/📦/g, '[Paquete]');
content = content.replace(/🐾/g, '[Huella]');
content = content.replace(/✅/g, '[OK]');
content = content.replace(/⚠️/g, '[!]');
content = content.replace(/—/g, '-');
content = content.replace(/…/g, '...');
content = content.replace(/¿/g, '');
content = content.replace(/¡/g, '');

// Replace accented characters
const map = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n',
  'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ñ': 'N',
  'A': 'A'
};

content = content.replace(/[áéíóúñÁÉÍÓÚÑ]/g, m => map[m]);

// Remove any remaining non-ASCII characters
let clean = '';
for (let i = 0; i < content.length; i++) {
  let c = content.charCodeAt(i);
  if (c <= 127) {
    clean += content[i];
  }
}

fs.writeFileSync('f:/Antigravity/Petcingo/assets/js/petcingo-dash.js', clean, 'utf8');
console.log('Sanitized petcingo-dash.js completely. No Unicode remains.');
