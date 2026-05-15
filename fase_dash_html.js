const fs = require('fs');

const file = 'f:/Antigravity/Petcingo/paginas_html/dashboard.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the duplicate sec-orders (Pedidos y Pagos) if it exists, leaving only the first one or replacing it.
// Wait, the prompt says "Actualizar renderOrders() en el script inline del dashboard".
// Let's first replace the Modal HTML.

const oldModalRegex = /<!-- Verify Payment Modal -->[\s\S]*?<\/div>\s*<\/div>\s*<script>/;
const newModal = `<!-- Modal Verificar Pago -->
<div id="verify-payment-modal" style="display:none;position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;padding:16px;">
  <div style="background:#fff;border-radius:24px;max-width:560px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.15);padding:28px;">
    
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;border-bottom:1px solid rgba(69,82,204,0.08);padding-bottom:16px;">
      <h3 style="font-family:'Sora',sans-serif;font-size:1.2rem;font-weight:800;color:#212121;margin:0;display:flex;align-items:center;gap:8px;">
        <i class="ri-shield-check-line" style="color:#4552CC;"></i> Verificar Pago
      </h3>
      <button onclick="closeVerifyModal()" style="background:none;border:none;cursor:pointer;font-size:1.3rem;color:#757575;line-height:1;padding:4px;">
        <i class="ri-close-line"></i>
      </button>
    </div>

    <!-- Contenido dinámico -->
    <div id="verify-modal-content"></div>

    <!-- Acciones -->
    <div id="verify-modal-actions" style="display:flex;gap:10px;margin-top:20px;border-top:1px solid rgba(69,82,204,0.08);padding-top:16px;"></div>
  </div>
</div>
<script>`;

if (content.match(oldModalRegex)) {
  content = content.replace(oldModalRegex, newModal);
} else {
  // if not found, just append it before closing body
  content = content.replace('</body>', newModal.replace('<script>', '') + '\n</body>');
}

// 2. Add Stats to sec-orders
const statsHtml = `
      <div class="stats-grid" style="margin-bottom:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
        <div class="stat-card" style="background:rgba(255,152,0,0.08);border:1px solid rgba(255,152,0,0.2);border-radius:14px;padding:16px;text-align:center;">
          <div class="stat-icon"><i class="ri-time-line" style="color:#F39C12;font-size:1.5rem;"></i></div>
          <div class="stat-value" id="stat-pending" style="font-size:1.8rem;font-weight:800;color:#212121;">—</div>
          <div class="stat-label" style="font-size:0.8rem;color:#757575;font-weight:600;text-transform:uppercase;">Pendientes</div>
        </div>
        <div class="stat-card" style="background:rgba(69,82,204,0.08);border:1px solid rgba(69,82,204,0.2);border-radius:14px;padding:16px;text-align:center;">
          <div class="stat-icon"><i class="ri-box-3-line" style="color:#4552CC;font-size:1.5rem;"></i></div>
          <div class="stat-value" id="stat-processing" style="font-size:1.8rem;font-weight:800;color:#212121;">—</div>
          <div class="stat-label" style="font-size:0.8rem;color:#757575;font-weight:600;text-transform:uppercase;">En proceso</div>
        </div>
        <div class="stat-card" style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:14px;padding:16px;text-align:center;">
          <div class="stat-icon"><i class="ri-check-line" style="color:#2ECC71;font-size:1.5rem;"></i></div>
          <div class="stat-value" id="stat-delivered" style="font-size:1.8rem;font-weight:800;color:#212121;">—</div>
          <div class="stat-label" style="font-size:0.8rem;color:#757575;font-weight:600;text-transform:uppercase;">Entregados</div>
        </div>
      </div>
`;

// Insert after the header of sec-orders (the first one)
const orderHeaderRegex = /(<section class="section" id="sec-orders">[\s\S]*?<div class="page-header">[\s\S]*?<\/div>)/;
if (!content.includes('stat-pending') && content.match(orderHeaderRegex)) {
  content = content.replace(orderHeaderRegex, '$1\n' + statsHtml);
}

// 3. Update Toolbar Filters
const newToolbar = `<div class="table-toolbar" style="margin-bottom:0;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <select class="ptcg-activate__select" id="order-filter-status" onchange="filterOrders()" style="width:auto;flex:1;">
            <option value="">Estados (Todos)</option>
            <option value="pending">Pendientes</option>
            <option value="confirmed">Confirmados</option>
            <option value="processing">En Proceso</option>
            <option value="shipped">Enviados</option>
            <option value="delivered">Entregados</option>
            <option value="rejected">Rechazados</option>
          </select>
          <select class="ptcg-activate__select" id="order-filter-channel" onchange="filterOrders()" style="width:auto;flex:1;">
            <option value="">Canal (Todos)</option>
            <option value="Directo">Directo</option>
            <option value="Refugio">Refugio</option>
            <option value="Afiliado">Afiliado</option>
            <option value="Veterinaria">Veterinaria</option>
          </select>
          <select class="ptcg-activate__select" id="order-filter-destino" onchange="filterOrders()" style="width:auto;flex:1;">
            <option value="">Destino (Todos)</option>
            <option value="Santa Cruz">Santa Cruz</option>
            <option value="Nacional">Nacional</option>
            <option value="Internacional">Internacional</option>
          </select>
          <input type="text" id="order-filter-search" placeholder="Buscar comprador o código" oninput="filterOrders()" class="ptcg-activate__input" style="width:200px;margin-bottom:0;">
          <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:600;color:#212121;cursor:pointer;">
            <input type="checkbox" id="order-filter-urgent" onchange="filterOrders()"> Urgentes
          </label>
          <button class="ptcg-index__btn ptcg-index__btn--secondary btn-sm" onclick="loadOrders()" style="margin-left:auto;"><i class="ri-refresh-line"></i></button>
        </div>`;

const toolbarRegex = /<div class="table-toolbar" style="margin-bottom:0;">[\s\S]*?<\/div>/;
if (content.match(toolbarRegex)) {
  content = content.replace(toolbarRegex, newToolbar);
}

// Write temporarily
fs.writeFileSync(file, content, 'utf8');
console.log('HTML parts replaced successfully.');
