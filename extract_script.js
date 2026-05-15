const fs = require('fs');

const file = 'f:/Antigravity/Petcingo/paginas_html/dashboard.html';
const content = fs.readFileSync(file, 'utf8');

const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
let allJs = '';
while ((match = scriptRegex.exec(content)) !== null) {
  allJs += match[1] + '\n';
}

fs.writeFileSync('f:/Antigravity/Petcingo/check_dashboard.js', allJs, 'utf8');
console.log('check_dashboard.js written for syntax check.');
