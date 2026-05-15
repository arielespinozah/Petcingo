const fs = require('fs');
const file = 'f:/Antigravity/Petcingo/paginas_html/dashboard.html';
let content = fs.readFileSync(file, 'utf8');

// I will just wipe out the `approvePayment` and `rejectPayment` blocks using regex.
const approveRegex = /window\.approvePayment\s*=\s*function\(\)\s*\{[\s\S]*?^\};\s*$/m;
if (content.match(approveRegex)) {
  content = content.replace(approveRegex, '');
}

const rejectRegex = /window\.rejectPayment\s*=\s*function\(\)\s*\{[\s\S]*?^\};\s*$/m;
if (content.match(rejectRegex)) {
  content = content.replace(rejectRegex, '');
}

// Since sometimes the regex might be tricky if it doesn't match the closing brace perfectly,
// I'll do it securely.
const regex = /window\.approvePayment\s*=\s*function\(\)\s*\{[\s\S]*?window\.rejectPayment\s*=\s*function\(\)\s*\{[\s\S]*?\}\;\s*/g;
if (content.match(regex)) {
  content = content.replace(regex, '');
}

fs.writeFileSync(file, content, 'utf8');
console.log('Removed old approvePayment and rejectPayment');
