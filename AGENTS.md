# Petcingo — AGENTS.md

> Contexto de proyecto para OpenCode. Leer al inicio de cada sesión.

---

## Identidad

Plataforma boliviana de identificación inteligente para mascotas (QR + NFC). Placas PVC con chip NFC 213. Dueño: Ariel Espinoza. Ciudad: Santa Cruz, Bolivia.

---

## Arquitectura Técnica

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3 vanilla, JS vanilla (sin frameworks) |
| CSS | BEM bajo clase raíz `.ptcg-*` |
| Backend | Firebase (Firestore + Storage + Auth) |
| Hosting | Dashnex (HTML arrastrado al constructor, assets subidos a hosting) |
| Assets estáticos | `https://prueb2.dashnexpages.net/assets/` |
| Dominio actual | `https://prueb2.dashnexpages.net` |
| Dominio futuro | `https://petcingo.com.bo` |
| Flujo | Trabajamos local en `F:/Antigravity/Petcingo/`. Assets se suben al hosting, HTML se arrastra al constructor Dashnex. |

---

## Firebase

```
apiKey: "AIzaSyAEE3yLFFsJTMORNFLYZWW2_DNHwzF0hE8"
authDomain: "petcingo-43096.firebaseapp.com"
projectId: "petcingo-43096"
storageBucket: "petcingo-43096.firebasestorage.app"
messagingSenderId: "679546185536"
appId: "1:679546185536:web:ceccd210b7c73b296f7ca5"
```

- Admin email: `arielespinoza.bo@gmail.com`
- MCP server: `firebase-mcp` configurado en `opencode.json` + `firebase-mcp.json`
- Service account: `secrets/serviceAccount.json` (NO subir a git)
- App nombrada `'petcingo'` para no confligir con Dashnex

---

## Diseño Visual (Consultar `DESIGN_SYSTEM.md` para detalles)

### Paleta
- **Purple primario:** `#4552CC` / oscuro `#2E3A9E`
- **Cyan secundario:** `#51CBF5`
- **Fondo claro:** `#F3F3F3` / `#F8F9FB`
- Funcionales: success `#2ECC71`, warning `#F39C12`, danger `#E74C3C`

### Tipografía
- Headings: `'Sora'` (700, 800)
- Body: `'Plus Jakarta Sans'` (400, 500, 600)
- Monospace: `'SF Mono'`, `ui-monospace`
- Fuentes servidas locales desde `assets/fonts/`

### Iconos
- Remix Icon v4.2.0: `ri-*`, preferir `-line` para UI, `-fill` para activos
- === CRÍTICO: Forzar `font-family: 'remixicon' !important` en TODAS las reglas de iconos ===

### Componentes BEM clave
- Tarjetas **Liquid Glass**: 4 capas (backdrop blur, specular highlight, borde blanco semitransparente, sombra suave)
- Botones: `--primary`, `--secondary`, `--ghost`, `--google`
- Inputs: fondo translúcido, icono izquierdo, focus ring purple
- Badges/Chips: `border-radius: 99px`, fondo pastel

---

## === REGLAS ANTI-DASHNEX (CRÍTICAS) ===

Dashnex inyecta Bootstrap 4 y CSS global que pisa nuestros estilos.

### Lo que SÍ funciona:
1. **CSS encapsulado** con clase raíz `.ptcg-*` para cada página
2. **`!important`** en TODAS las propiedades críticas: `background`, `color`, `border-radius`, `backdrop-filter`, `box-shadow`
3. **Doble clase** para máxima especificidad: `.ptcg-dashboard.ptcg-dashboard .ptcg-dashboard__card {}`
4. **JavaScript shield** (`petcingo-shield.js`): aplica estilos con `style.setProperty(..., 'important')` después de que Dashnex carga
5. **Variables CSS dentro del bloque raíz** (ej. `.ptcg-dashboard { --var: val; }`), NUNCA en `:root`
6. **Forzar fuente de iconos**: `font-family: 'remixicon' !important` en todas las reglas
7. **Tipografía suave**: `text-shadow: 0 0 1px rgba(0,0,0,0.02) !important`
8. **Usar `background: inherit` NUNCA**; siempre color explícito

### Lo que NO funciona:
- `all: unset` — rompe fondos
- Cambiar el `body` de Dashnex (`background: #fff !important` inamovible)
- `backdrop-filter` sin fondo semitransparente base
- Depender de Bootstrap para estética
- Google Fonts desde CDN en Dashnex (fallan). Usar locales.

---

## Estructura de Archivos

```
F:/Antigravity/Petcingo/
├── paginas_html/          ← Páginas encapsuladas listas para Dashnex
│   ├── index.html
│   ├── activate.html
│   ├── dashboard.html
│   ├── cliente.html        (pendiente)
│   ├── refugio-panel.html  (pendiente)
│   └── panel-afiliados.html(pendiente)
├── codigo_original/        ← Versiones legacy, solo lectura
├── assets/
│   ├── css/
│   │   ├── petcingo-index.css
│   │   ├── petcingo-core.css
│   │   └── petcingo-theme.css (legacy, ya no usar)
│   ├── js/
│   │   ├── petcingo.js          (~4663 líneas, lógica central)
│   │   ├── petcingo-checkout.js (~1034 líneas, checkout unificado)
│   │   ├── petcingo-dash.js
│   │   ├── petcingo-shield.js   (blindaje Anti-Dashnex)
│   │   └── app.js               (unificado, Firebase init)
│   ├── fonts/  (Sora, Plus Jakarta Sans .woff2)
│   ├── images/
│   └── svg-icons/
├── DESIGN_SYSTEM.md
├── dashboard_plan.md
├── firebase-mcp.json
├── opencode.json
├── secrets/
│   └── serviceAccount.json  (NO COMMITEAR)
└── .gitignore
```

---

## URLs en Producción (Dashnex)

### Páginas publicadas (dominio principal)

| Página | URL |
|---|---|
| Landing | `https://prueb2.dashnexpages.net/home/` |
| Perfil mascota | `https://prueb2.dashnexpages.net/id/` |
| Dashboard admin | `https://prueb2.dashnexpages.net/panel-control/` |
| Tienda | `https://prueb2.dashnexpages.net/tienda/` |
| Mi cuenta (dueño) | `https://prueb2.dashnexpages.net/mi-cuenta/` |
| Checkout Bolivia | `https://prueb2.dashnexpages.net/finalizar-compra/` |
| Checkout Intl. | `https://prueb2.dashnexpages.net/checkout/` |
| Login | `https://prueb2.dashnexpages.net/login/` |
| 404 | `https://prueb2.dashnexpages.net/error-404/` |
| Catálogo | `https://prueb2.dashnexpages.net/catalogo/` |
| Producto | `https://prueb2.dashnexpages.net/producto/` |
| Item | `https://prueb2.dashnexpages.net/item/` |
| Veterinarias | `https://prueb2.dashnexpages.net/veterinarias/` |
| Vet Admin | `https://prueb2.dashnexpages.net/vet-admin/` |
| Ayuda | `https://prueb2.dashnexpages.net/ayuda/` |
| Carrito | `https://prueb2.dashnexpages.net/carrito/` |

### Páginas en preview (subdominio dashnexpages.net)

| Página | URL preview |
|---|---|
| Activación | `https://dashnexpages.net/subdomain/21770/pages/preview/161787` |
| Dashboard cliente | `https://dashnexpages.net/subdomain/21770/pages/preview/161784` |
| Refugio público | `https://dashnexpages.net/subdomain/21770/pages/preview/161785` |
| Refugio dashboard | `https://dashnexpages.net/subdomain/21770/pages/preview/161786` |
| Afiliado dashboard | `https://dashnexpages.net/subdomain/21770/pages/preview/162200` |
| Afiliados (marketing) | `https://dashnexpages.net/subdomain/21770/pages/preview/162201` |

### Assets en hosting

| Tipo | URL base |
|---|---|
| CSS | `https://prueb2.dashnexpages.net/assets/css/` |
| JS | `https://prueb2.dashnexpages.net/assets/js/` |
| Fonts | `https://prueb2.dashnexpages.net/assets/fonts/` |
| SVG Icons | `https://prueb2.dashnexpages.net/assets/svg-icons/` |
| SCSS | `https://prueb2.dashnexpages.net/assets/scss/` |

---

## Estado del Proyecto y Roadmap

### Hecho
- Landing page, activación, perfil público, dashboard admin, checkout Bolivia e Internacional
- Lógica de negocio central en `petcingo.js`
- Sistema de backup, tienda, promociones, comisiones
- MCP Firebase configurado

### 🔴 Fase 1 (inmediato)
- Verificación de comprobantes en dashboard (modal aceptar/rechazar)
- Estados de pedido completos (pending → confirmed → processing → shipped → delivered)
- Cancelación y reembolsos
- QR real con qrcodejs
- Datos bancarios desde Firestore al checkout
- Remixicon local (solucionar iconos cuadrados)
- URLs configurables (`petcingo-config.js`)

### 🟡 Fase 2
- Panel de envíos con filtros
- Guías imprimibles, registro de número de guía
- Configuración de tarifas de envío desde dashboard
- Pasarelas de pago (API keys)

### 🟢 Fase 3
- Módulo de impresión de placas (vista previa, organizador A4, PDF)
- Sistema de diseño de placa

### 🔵 Fase 4
- `refugio-panel.html`, `afiliado-panel.html`, `refugio-publico.html`
- Conexión con index para adopciones reales

### ⚪ Fase 5
- Pasarela real (PagosNet/Libélula + Stripe/PayPal)
- Firebase Functions para notificaciones y renovaciones
- Migración a `petcingo.com.bo`

---

## Reglas para Editar Código

1. **NUNCA modificar `petcingo.js`** sin preguntar primero (lógica central de negocio)
2. **NUNCA modificar `codigo_original/`** (solo lectura)
3. Todo CSS nuevo DEBE estar encapsulado bajo `.ptcg-*` y usar `!important` en propiedades críticas
4. No usar frameworks CSS (Bootstrap ya lo inyecta Dashnex y causa conflictos)
5. No usar Google Fonts CDN — usar las fuentes locales en `assets/fonts/`
6. Seguir BEM estricto con prefijo `.ptcg-`
7. No incluir emojis en código sin preguntar
8. No agregar comentarios en el código sin preguntar
9. Mantener JS vanilla, sin TypeScript en assets/ (el proyecto React Native en root es aparte)

---

## Comandos Útiles

- **"subir"** = `git add -A && git commit -m "..." && git push` a `https://github.com/arielespinozah/Petcingo.git`
- El MCP de Firebase permite consultar Firestore en vivo (colecciones: pets, orders, users, products, shelters, promotions, veterinarias, staff, config, logs, commissions)
