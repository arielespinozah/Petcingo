const fs = require('fs');
const path = 'f:/Antigravity/Petcingo/paginas_html/dashboard.html';
let content = fs.readFileSync(path, 'utf8');

// Replace icons
content = content.replace(/ri-footprint-line/g, 'data-lucide=\"paw-print\"');
// Replace ri-close-line with data-lucide="x" (careful, might be many, let's just do it for modals)
// Wait, prompt says: "El icono de cerrar modal: ri-close-line → data-lucide=\"x\""
content = content.replace(/<i class=\"ri-close-line\"><\/i>/g, '<i data-lucide=\"x\"></i>');

// Add styles
if (!content.includes('.lucide {')) {
  content = content.replace('</style>', `
    .lucide { width: 1.2em; height: 1.2em; stroke-width: 2; }
    .lucide.text-success { color: #2ECC71; }
  </style>`);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Dashboard Lucide icons updated.');
