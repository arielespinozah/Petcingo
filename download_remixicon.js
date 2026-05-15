const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = 'assets/fonts/remixicon';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const baseUrl = 'https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/';
const files = ['remixicon.css', 'remixicon.woff2', 'remixicon.woff', 'remixicon.ttf'];

async function downloadFiles() {
  for (const file of files) {
    const filePath = path.join(dir, file);
    await new Promise((resolve, reject) => {
      https.get(baseUrl + file, (res) => {
        const fileStream = fs.createWriteStream(filePath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log('Downloaded', file);
          resolve();
        });
      }).on('error', (err) => {
        console.error('Error downloading', file, err);
        reject(err);
      });
    });
  }

  // Update HTML files
  const pagesDir = 'paginas_html';
  const htmlFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
  
  htmlFiles.forEach(f => {
    let content = fs.readFileSync(path.join(pagesDir, f), 'utf8');
    let original = content;
    content = content.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/remixicon@[^\/]+\/fonts\/remixicon\.css/g, 'https://prueb2.dashnexpages.net/assets/fonts/remixicon/remixicon.css');
    
    // Also check index.html if it's in the root
    if (content !== original) {
      fs.writeFileSync(path.join(pagesDir, f), content);
      console.log('Updated', f);
    }
  });

  // What about root html files?
  const rootFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
  rootFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;
    content = content.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/remixicon@[^\/]+\/fonts\/remixicon\.css/g, 'https://prueb2.dashnexpages.net/assets/fonts/remixicon/remixicon.css');
    if (content !== original) {
      fs.writeFileSync(f, content);
      console.log('Updated root', f);
    }
  });
}

downloadFiles();
