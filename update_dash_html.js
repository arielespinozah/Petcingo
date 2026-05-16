const fs = require('fs');
const lines = fs.readFileSync('f:/Antigravity/Petcingo/paginas_html/dashboard.html', 'utf8').split('\n');

// 1881 is '<!-- FUNCIONES DE NAVEGACIÓN INLINE: independientes de petcingo.js -->'
// 3494 is '<script src="https://prueb2.dashnexpages.net/assets/js/petcingo.js?v=20260501"></script>'
// We want to keep 3494! But we can just put both.

const top = lines.slice(0, 1880);
const middle = [
  '<script src="https://prueb2.dashnexpages.net/assets/js/petcingo.js?v=20260516"></script>',
  '<script src="https://prueb2.dashnexpages.net/assets/js/petcingo-dash.js?v=20260516"></script>'
];
const bottom = lines.slice(3563);

const newLines = [...top, ...middle, ...bottom];
fs.writeFileSync('f:/Antigravity/Petcingo/paginas_html/dashboard.html', newLines.join('\n'));
console.log('dashboard.html updated.');
