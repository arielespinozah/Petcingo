const fs = require('fs');

const file = 'f:/Antigravity/Petcingo/paginas_html/dashboard.html';
let content = fs.readFileSync(file, 'utf8');

const qrHtml = `
        <!-- QR de Pago para Checkout -->
        <div class="ptcg-index__card">
          <div class="ptcg-activate__title" style="margin-bottom:8px;font-size:1.1rem;display:flex;align-items:center;gap:8px;">
            <i class="ri-qr-code-line"></i> QR de Pago para Checkout
          </div>
          <div class="ptcg-activate__subtitle" style="margin-bottom:16px;font-size:0.85rem;">
            Sube la imagen QR de tu banca mobile. Se mostrará en el checkout cuando el cliente elija "QR Transferencia".
          </div>
          
          <!-- Dropzone -->
          <div id="ptcg-qr-upload-area" style="border:2px dashed rgba(69,82,204,0.25);border-radius:14px;padding:28px 20px;text-align:center;cursor:pointer;background:rgba(238,240,250,0.40);transition:all 0.2s;"
               onclick="document.getElementById('ptcg-qr-file-input').click()">
            <i class="ri-upload-cloud-2-line" style="font-size:2rem;color:#4552CC;display:block;margin-bottom:8px;"></i>
            <span style="font-size:0.85rem;font-weight:600;color:#333959;">Toca para subir el QR</span>
            <span style="font-size:0.74rem;color:#6C7297;">PNG o JPG — max 2 MB</span>
          </div>
          <input type="file" id="ptcg-qr-file-input" accept="image/*" style="display:none;" onchange="ptcgHandleQrUpload(this.files[0])">
          
          <!-- Vista previa -->
          <div id="ptcg-qr-preview" style="display:none;margin-top:12px;text-align:center;">
            <img id="ptcg-qr-preview-img" src="" style="max-width:200px;border-radius:12px;border:1px solid #E0E0E0;">
            <button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="ptcgRemoveQr()" style="margin-top:8px;">
              <i class="ri-delete-bin-line"></i> Quitar QR
            </button>
          </div>
          
          <button class="ptcg-index__btn ptcg-index__btn--primary btn-sm" onclick="ptcgSaveQr()" style="margin-top:12px;">
            <i class="ri-save-line"></i> Guardar QR
          </button>
        </div>
`;

if (!content.includes('ptcg-qr-upload-area')) {
  content = content.replace('<!-- Datos Bancarios -->', qrHtml + '\n        <!-- Datos Bancarios -->');
}

const qrJs = `
var _qrFile = null;

window.ptcgHandleQrUpload = function(file) {
  if (!file || !file.type.match(/^image\\//)) return;
  if (file.size > 2 * 1024 * 1024) { toast('Máximo 2 MB'); return; }
  _qrFile = file;
  
  // Vista previa
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('ptcg-qr-preview-img').src = e.target.result;
    document.getElementById('ptcg-qr-preview').style.display = 'block';
  };
  reader.readAsDataURL(file);
};

window.ptcgSaveQr = function() {
  if (!_qrFile) { toast('Selecciona una imagen QR primero'); return; }
  
  var storageRef = firebase.storage().ref('config/qr-pago-' + Date.now() + '.png');
  storageRef.put(_qrFile).then(function() {
    return storageRef.getDownloadURL();
  }).then(function(url) {
    return db().collection('config').doc('bank_info').set({ qrImageUrl: url }, { merge: true });
  }).then(function() {
    toast('QR guardado correctamente');
    _qrFile = null;
  }).catch(function(e) {
    toast('Error: ' + e.message);
  });
};

window.ptcgRemoveQr = function() {
  db().collection('config').doc('bank_info').set({ qrImageUrl: '' }, { merge: true }).then(function() {
    document.getElementById('ptcg-qr-preview').style.display = 'none';
    document.getElementById('ptcg-qr-preview-img').src = '';
    _qrFile = null;
    toast('QR eliminado');
  });
};

// Cargar vista previa al iniciar
(function() {
  setTimeout(function() {
    if (typeof db === 'function') {
      db().collection('config').doc('bank_info').get().then(function(doc) {
        if (doc.exists && doc.data().qrImageUrl) {
          document.getElementById('ptcg-qr-preview-img').src = doc.data().qrImageUrl;
          document.getElementById('ptcg-qr-preview').style.display = 'block';
        }
      });
    }
  }, 1000);
})();
`;

if (!content.includes('ptcgHandleQrUpload')) {
  content = content.replace('// --- GLOBALS & INITS ---', '// --- GLOBALS & INITS ---\n' + qrJs + '\n');
}

fs.writeFileSync(file, content, 'utf8');
console.log('dashboard.html updated with FASE 2 logic');
