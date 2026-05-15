const fs = require('fs');

const file = 'f:/Antigravity/Petcingo/paginas_html/dashboard.html';
let content = fs.readFileSync(file, 'utf8');

// The second sec-orders starts at <!-- ── PEDIDOS Y PAGOS ── -->
// and ends before <!-- ── PASARELAS Y ENVÍOS ── -->
const regex = /<!-- ── PEDIDOS Y PAGOS ── -->[\s\S]*?(?=<!-- ── PASARELAS Y ENVÍOS ── -->)/;

if (content.match(regex)) {
  content = content.replace(regex, '');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Duplicate sec-orders removed');
} else {
  console.log('Duplicate sec-orders not found');
}
