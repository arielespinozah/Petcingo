const fs = require('fs');
const files = ['index.html', 'checkout.html', 'checkout-internacional.html', 'dashboard.html', 'pet.html', 'activate.html', 'mi-cuenta.html'];
for (const file of files) {
  const path = 'f:/Antigravity/Petcingo/paginas_html/' + file;
  if (!fs.existsSync(path)) { console.log('Not found:', path); continue; }
  let content = fs.readFileSync(path, 'utf8');
  
  // Replace Remixicon CDN
  content = content.replace(
    '<link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">',
    '<link href="https://prueb2.dashnexpages.net/assets/fonts/remixicon/remixicon.css" rel="stylesheet">'
  );
  
  // Add Lucide script at the bottom of the body, before </body>
  if (!content.includes('lucide@latest')) {
    content = content.replace('</body>', '<script src="https://unpkg.com/lucide@latest"></script>\n<script>lucide.createIcons();</script>\n</body>');
  }
  
  fs.writeFileSync(path, content, 'utf8');
  console.log('Updated', file);
}
