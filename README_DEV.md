# Petcingo — Guía de Desarrollo

## Estructura de carpetas

```
Petcingo/
├── paginas_html/          ← Subir mediante drag & drop al constructor de Dashnex
│   ├── index.html         ← Landing page principal
│   ├── login.html         ← Autenticación (login + registro + Google)
│   ├── cart.html          ← Carrito de compras (lee localStorage)
│   ├── catalogo.html      ← Galería con sidebar de filtros
│   ├── item.html          ← Ficha de producto (variantes + qty + galería)
│   ├── product.html       ← Plantilla maestra (item + tabs desc/specs/reseñas)
│   ├── store.html         ← Tienda con búsqueda + pills de categoría
│   └── 404.html           ← Página de error 404
│
├── assets/                ← Subir al hosting estático de Dashnex
│   ├── css/
│   │   ├── petcingo-core.css   ← Sistema de diseño compartido (variables, nav, footer, lg)
│   │   └── petcingo-theme.css  ← Tema legado (mantener por compatibilidad)
│   ├── js/
│   │   ├── petcingo-core.js    ← Utilidades: nav, carrito, toast, animaciones
│   │   ├── petcingo.js         ← Lógica legada (dashboards)
│   │   └── app.js              ← Firebase + funciones de app legada
│   ├── scss/
│   │   └── _variables.scss     ← Fuente SCSS: variables, mixins, breakpoints
│   ├── images/            ← Imágenes optimizadas (WebP recomendado)
│   └── fonts/             ← Fuentes locales si se abandona Google Fonts
│
└── README_DEV.md          ← Este archivo
```

---

## Protocolo Anti-Dashnex (reglas críticas)

Dashnex inyecta Bootstrap 4 y CSS propio de forma global. Esto causa que botones y textos aparezcan blancos sobre blanco. Cada página usa un contenedor raíz único para aislar sus estilos.

### Clase contenedora por página

| Archivo         | Clase raíz         |
|-----------------|--------------------|
| `index.html`    | `.ptcg-index`      |
| `login.html`    | `.ptcg-login`      |
| `cart.html`     | `.ptcg-cart`       |
| `catalogo.html` | `.ptcg-catalogo`   |
| `item.html`     | `.ptcg-item`       |
| `product.html`  | `.ptcg-product`    |
| `store.html`    | `.ptcg-store`      |
| `404.html`      | `.ptcg-404`        |

### Regla #1 — Reset local

Cada página incluye este bloque al inicio de su `<style>`:

```css
.ptcg-[page], .ptcg-[page] * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  color: #1D1D1F;   /* color explícito, nunca heredado */
  -webkit-font-smoothing: antialiased;
}
```

### Regla #2 — Prefijado obligatorio

Todo selector CSS debe iniciar con la clase contenedora:

```css
/* ✅ CORRECTO */
.ptcg-index .hero__title { font-size: 2rem; color: #1D1D1F; }

/* ❌ PROHIBIDO — Bootstrap lo sobrescribirá */
h1 { font-size: 2rem; }
.hero__title { color: #1D1D1F; }
```

### Regla #3 — Colores explícitos en componentes interactivos

Para botones, inputs y tarjetas, siempre definir `color`, `background-color` y `border` explícitamente. Usar `!important` solo como último recurso documentado:

```css
/* Anti-Dashnex: !important necesario — Bootstrap sobreescribe .btn con color:white */
.ptcg-index .btn-primary {
  background-color: #5100C0 !important;
  color: #FFFFFF !important;
  border-color: transparent !important;
}
```

### Regla #4 — Depuración de conflictos

Si un botón aparece blanco sobre blanco:
1. Abrir DevTools → inspeccionar el elemento
2. Buscar qué regla de Dashnex sobrescribe `color` o `background-color`
3. Crear una regla más específica dentro del prefijo de encapsulamiento
4. NO agregar `!important` sin documentarlo con un comentario

---

## Sistema Liquid Glass

El efecto iOS Liquid Glass se implementa en 4 capas sobre cada tarjeta.

### Estructura HTML

```html
<div class="lg-card">
  <!-- Capa 1+2: Backdrop + distorsión SVG -->
  <div class="lg-base" aria-hidden="true"></div>
  <!-- Capa 3: Realce especular (via ::after en CSS) -->
  <!-- Capa 4: Contenido real -->
  <div class="lg-body">
    <!-- tu contenido aquí -->
  </div>
</div>
```

### Filtro SVG (incluir en cada HTML, una sola vez)

```html
<svg style="display:none;position:absolute;width:0;height:0" aria-hidden="true">
  <defs>
    <filter id="lg-dist" x="-20%" y="-20%" width="140%" height="140%"
            color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008"
                    numOctaves="2" seed="92" result="noise"/>
      <feGaussianBlur in="noise" stdDeviation="2" result="blurred"/>
      <feDisplacementMap in="SourceGraphic" in2="blurred"
                         scale="70" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
</svg>
```

### Variables CSS para ajustar el efecto

Modificar en `:root` o en el prefijo de la página:

| Variable                   | Valor por defecto           | Efecto                           |
|----------------------------|-----------------------------|----------------------------------|
| `--ptcg-glass-blur`        | `40px`                      | Desenfoque del vidrio            |
| `--ptcg-glass-sat`         | `180%`                      | Saturación de colores del fondo  |
| `--ptcg-glass-overlay`     | `rgba(255,255,255,0.18)`    | Color de la película de vidrio   |
| `--ptcg-glass-border`      | `rgba(255,255,255,0.55)`    | Borde del vidrio                 |
| `--ptcg-glass-shadow`      | `0 8px 32px rgba(81,0,192,0.08)` | Sombra exterior            |

Para el efecto de distorsión SVG, el parámetro clave es `scale="70"` en `feTurbulence`. Mayor valor = más distorsión.

### Ejemplo: tarjeta con blur reducido para mobile

```css
@media (max-width: 767px) {
  .ptcg-index {
    --ptcg-glass-blur: 20px; /* Reducir para mejor rendimiento en móvil */
  }
}
```

---

## Sistema de Colores

| Variable                  | Valor       | Uso                          |
|---------------------------|-------------|------------------------------|
| `--ptcg-primary`          | `#5100C0`   | Color primario (botones, links) |
| `--ptcg-primary-light`    | `#5151FC`   | Variante clara del primario  |
| `--ptcg-primary-dark`     | `#320078`   | Hover / estados activos      |
| `--ptcg-primary-pastel`   | `#EBE3FF`   | Fondos suaves                |
| `--ptcg-accent`           | `#00E1F3`   | Acento cian (CTA secundarios)|
| `--ptcg-accent-light`     | `#5CEEFA`   | Hover del acento             |
| `--ptcg-text`             | `#1D1D1F`   | Texto principal              |
| `--ptcg-text2`            | `#515154`   | Texto secundario             |
| `--ptcg-text3`            | `#86868B`   | Texto terciario / placeholders|
| `--ptcg-bg`               | `#F5F5F7`   | Fondo de página              |
| `--ptcg-success`          | `#34C759`   | Estados de éxito             |
| `--ptcg-error`            | `#FF3B30`   | Errores / alertas            |
| `--ptcg-warn`             | `#FF9500`   | Advertencias                 |

---

## Sistema Responsive (Mobile First)

| Breakpoint    | Rango                          | Columnas catálogo |
|---------------|--------------------------------|-------------------|
| Mobile        | `max-width: 767px`             | 2                 |
| Tablet        | `768px – 1023px`               | 2–3               |
| Desktop       | `min-width: 1024px`            | 3–4               |

En mobile, el efecto Liquid Glass reduce el blur a `20px` para mejorar rendimiento.

---

## Carrito de compras

El carrito funciona con `localStorage` — sin backend. Funciones disponibles vía `window.Ptcg.Cart`:

```javascript
// Agregar producto
Ptcg.Cart.add({ id: 'sku-001', name: 'Nombre', price: 149, variant: 'Talla M' });

// Obtener items
const items = Ptcg.Cart.get(); // Array de objetos

// Total
const total = Ptcg.Cart.total(); // número

// Cantidad total de items
const qty = Ptcg.Cart.count();

// Eliminar
Ptcg.Cart.remove('sku-001', 'Talla M');

// Vaciar
Ptcg.Cart.clear();
```

---

## Deployment en Dashnex

### Assets (hosting estático)
1. Subir toda la carpeta `assets/` al hosting estático de Dashnex
2. Anotar la URL base (ej: `https://prueb2.dashnexpages.net/`)
3. En cada `paginas_html/*.html`, reemplazar `https://assets.petcingo.com/` con la URL real

### Páginas HTML
1. En el constructor de páginas de Dashnex, crear una nueva página
2. Arrastrar y soltar el archivo `.html` correspondiente
3. Verificar que el contenido aparezca dentro del contenedor `.ptcg-[page]`

### Verificación post-deploy
- [ ] Los botones primarios muestran texto blanco sobre fondo morado (#5100C0)
- [ ] El efecto Liquid Glass es visible en las tarjetas de producto
- [ ] El navbar sticky funciona en desktop y mobile
- [ ] El carrito persiste entre páginas (localStorage)
- [ ] El login con Google/email funciona
- [ ] La página 404 se muestra para rutas inválidas

---

## Firebase

Configuración actual en `assets/js/app.js`:

```javascript
{
  apiKey: 'AIzaSyAEE3yLFFsJTMORNFLYZWW2_DNHwzF0hE8',
  authDomain: 'petcingo-43096.firebaseapp.com',
  projectId: 'petcingo-43096',
  storageBucket: 'petcingo-43096.firebasestorage.app',
  messagingSenderId: '679546185536',
  appId: '1:679546185536:web:ceccd210b7c73b296f7ca5'
}
```

La autenticación Google en `login.html` requiere que el dominio de Dashnex esté en la lista de dominios autorizados en Firebase Console → Authentication → Settings → Authorized domains.

---

*Última actualización: 2025-05-09*
