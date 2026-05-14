# Petcingo Design System — Guía de Estilo Oficial

> **Versión:** 2026.1 — basada en `petcingo-activate.css` (paleta confirmada 2026-05-02)
> **Alcance:** Toda página HTML nueva que se integre al proyecto Petcingo / Dashnex.
> **Regla de oro:** Si el selector no empieza con `.ptcg-[nombre]`, no pertenece a este sistema.

---

## 1. Paleta de Colores

Todas las variables se declaran dentro del selector raíz de cada página (ej. `.ptcg-activate { ... }`), no en `:root`, para evitar colisiones con el CSS global de Dashnex.

### 1.1 Primarios

| Token | Variable CSS | Hex | Uso |
|---|---|---|---|
| Purple base | `--ptcg-purple` | `#4552CC` | Botones primarios, links activos, acentos principales |
| Purple oscuro | `--ptcg-purple-dark` | `#2E3A9E` | Hover de botones primarios, profundidad |
| Purple claro | `--ptcg-purple-light` | `#6C7AE0` | Gradientes, iconos decorativos |
| Cyan base | `--ptcg-cyan` | `#51CBF5` | Acentos secundarios, gradientes, highlights |
| Cyan oscuro | `--ptcg-cyan-dark` | `#2EA8D0` | Gradientes oscuros en elementos cyan |
| Cyan claro | `--ptcg-cyan-light` | `#7DDDF7` | Decorativo, fondo de chips |
| Light | `--ptcg-light` | `#F3F3F3` | Fondo de página principal |

### 1.2 Pasteles (derivados)

| Token | Variable CSS | Hex | Uso |
|---|---|---|---|
| Purple pastel | `--ptcg-purple-pastel` | `#D9DEF5` | Fondos de badges, radio seleccionado, chips |
| Purple pastel 2 | `--ptcg-purple-pastel2` | `#EEF1FB` | Fondo de página, hover suave, greeting banners |
| Cyan pastel | `--ptcg-cyan-pastel` | `#D0F0FB` | Decorativo |
| Cyan pastel 2 | `--ptcg-cyan-pastel2` | `#E8F7FD` | Fondo de página (extremo inferior del gradiente) |

### 1.3 Funcionales

| Token | Variable CSS | Hex | Uso |
|---|---|---|---|
| Success | `--ptcg-success` | `#2ECC71` | Estados de éxito, checks, validación positiva |
| Success pastel | `--ptcg-success-pastel` | `#D5F5E3` | Fondo de toast success, banners ok |
| Warning | `--ptcg-warning` | `#F39C12` | Alertas, intentos restantes, advertencias |
| Warning pastel | `--ptcg-warning-pastel` | `#FDEBD0` | Fondo de alertas de advertencia |
| Danger | `--ptcg-danger` | `#E74C3C` | Errores, campos inválidos, estados destructivos |
| Danger pastel | `--ptcg-danger-pastel` | `#FADBD8` | Fondo de banners de error, campos con error |
| Pink | `--ptcg-pink` | `#E91E8C` | Decorativo, badges especiales |
| Pink pastel | `--ptcg-pink-pastel` | `#F8BBD0` | Fondos de chips especiales |
| Blue | `--ptcg-blue` | `#3498DB` | Informativo (no confundir con purple primario) |
| Blue pastel | `--ptcg-blue-pastel` | `#D6EAF8` | Fondo de banners informativos |

### 1.4 Neutros (escala de grises)

| Token | Variable CSS | Hex |
|---|---|---|
| Gray 50 | `--ptcg-gray-50` | `#FAFAFA` |
| Gray 100 | `--ptcg-gray-100` | `#F5F5F5` |
| Gray 200 | `--ptcg-gray-200` | `#EEEEEE` |
| Gray 300 | `--ptcg-gray-300` | `#E0E0E0` |
| Gray 400 | `--ptcg-gray-400` | `#BDBDBD` |
| Gray 500 | `--ptcg-gray-500` | `#9E9E9E` |
| Gray 600 | `--ptcg-gray-600` | `#757575` |
| Gray 700 | `--ptcg-gray-700` | `#616161` |
| Gray 800 | `--ptcg-gray-800` | `#424242` |
| Gray 900 | `--ptcg-gray-900` | `#212121` |

### 1.5 Sistema Glass (Liquid Glass)

| Token | Variable CSS | Valor |
|---|---|---|
| Blur | `--ptcg-glass-blur` | `40px` (reducir a 20px en mobile) |
| Saturación | `--ptcg-glass-sat` | `180%` |
| Overlay | `--ptcg-glass-overlay` | `rgba(255,255,255,0.20)` |
| Borde | `--ptcg-glass-border` | `rgba(255,255,255,0.65)` |
| Sombra | `--ptcg-glass-shadow` | `0 8px 32px rgba(69,82,204,0.08)` |

### 1.6 Gradiente de fondo de página estándar

```css
background: linear-gradient(135deg,
  var(--ptcg-purple-pastel2) 0%,
  #EEF5FF 45%,
  var(--ptcg-cyan-pastel2) 100%);
```

---

## 2. Tipografía

### 2.1 Fuentes

| Rol | Familia | Import |
|---|---|---|
| Headings / Display | **Sora** | Google Fonts |
| Body / UI | **Plus Jakarta Sans** | Google Fonts |
| Monospace (código, placas) | SF Mono, `ui-monospace`, monospace | Sistema |

**Import estándar en `<head>`:**

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### 2.2 Escala tipográfica

| Elemento | Familia | Tamaño | Peso | Uso |
|---|---|---|---|---|
| Page title | Sora | `1.70rem` | 800 | Título principal de pantalla |
| Section title | Sora | `0.90rem` | 700 | Títulos de sección dentro de card |
| Logo | Sora | `1.15rem` | 800 | Topbar logo text |
| Body regular | Plus Jakarta Sans | `0.88–0.90rem` | 400 | Texto de párrafo, subtítulos |
| Label | Plus Jakarta Sans | `0.80rem` | 600 | Labels de campos de formulario |
| Helper / hint | Plus Jakarta Sans | `0.75–0.78rem` | 400–500 | Texto auxiliar, hints |
| Badge / tag | Plus Jakarta Sans | `0.65–0.68rem` | 700 | Tags, chips, badges |
| Button | Plus Jakarta Sans | `0.90rem` | 600 | Texto de botones |
| Code / plate | SF Mono / ui-monospace | variable | 700 | Códigos de activación, placas |

**Parámetros comunes de headings:**
```css
font-family: 'Sora', sans-serif !important;
font-weight: 800;
letter-spacing: -0.03em;
line-height: 1.20;
color: var(--ptcg-gray-900) !important;
```

**Parámetros comunes de body:**
```css
font-family: 'Plus Jakarta Sans', sans-serif !important;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

---

## 3. Componentes UI

### 3.1 Radios y espaciado

| Token | Variable CSS | Valor | Uso |
|---|---|---|---|
| Small | `--ptcg-radius-sm` | `10px` | Inputs, badges, botones pequeños |
| Default | `--ptcg-radius` | `16px` | Cards medianas, dropzones, alertas |
| Large | `--ptcg-radius-lg` | `24px` | Cards principales (Liquid Glass) |
| Pill | — | `99px` | Chips, progress bar, dividers |

### 3.2 Tarjeta Liquid Glass (`.ptcg-[page]__card`)

La tarjeta principal usa un sistema de 4 capas para el efecto vidrio:

```css
.ptcg-[page]__card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  border-radius: var(--ptcg-radius-lg);         /* 24px */
  border: 1px solid var(--ptcg-glass-border);   /* rgba(255,255,255,0.65) */
  box-shadow: var(--ptcg-glass-shadow), inset 0 1px 0 rgba(255,255,255,0.95);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

/* Capa 1+2: frosted glass backdrop */
.ptcg-[page]__card::before {
  content: '';
  position: absolute;
  inset: 0;
  backdrop-filter: blur(var(--ptcg-glass-blur)) saturate(var(--ptcg-glass-sat));
  -webkit-backdrop-filter: blur(var(--ptcg-glass-blur)) saturate(var(--ptcg-glass-sat));
  background: var(--ptcg-glass-overlay);
  z-index: 0;
}

/* Capa 3: specular highlight (brillo superior) */
.ptcg-[page]__card::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 48%;
  background: linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 100%);
  z-index: 1;
  pointer-events: none;
  border-radius: var(--ptcg-radius-lg) var(--ptcg-radius-lg) 0 0;
}

/* Capa 4: todo el contenido va sobre z-index: 2 */
.ptcg-[page]__card > * {
  position: relative;
  z-index: 2;
}
```

**Hover (solo desktop ≥1024px):**
```css
.ptcg-[page]__card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(69,82,204,0.12), inset 0 1px 0 rgba(255,255,255,0.95);
}
```

### 3.3 Botones

Todos los botones comparten la clase base `.ptcg-[page]__btn`. Las variantes de estilo se aplican con modificadores BEM.

**Clase base:**
```css
.ptcg-[page]__btn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px;
  padding: 11px 24px;
  border-radius: 12px;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-size: 0.90rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none !important;
  border: 2px solid transparent;
  transition: background-color 0.2s ease, box-shadow 0.2s ease,
              transform 0.15s ease, border-color 0.2s ease;
  white-space: nowrap;
  user-select: none;
  line-height: 1;
}
```

**`--primary` (CTA principal):**
```css
background-color: var(--ptcg-purple) !important;  /* #4552CC */
color: #FFFFFF !important;
box-shadow: 0 4px 18px rgba(69,82,204,0.30);

/* hover */
background-color: var(--ptcg-purple-dark) !important;  /* #2E3A9E */
box-shadow: 0 6px 22px rgba(69,82,204,0.38);
transform: translateY(-1px);

/* active */
transform: scale(0.97);
```

**`--secondary` (acción alternativa):**
```css
background-color: transparent !important;
color: var(--ptcg-purple) !important;
border-color: var(--ptcg-purple) !important;

/* hover */
background-color: var(--ptcg-purple-pastel) !important;
```

**`--ghost` (acción terciaria / cancelar):**
```css
background-color: transparent !important;
color: var(--ptcg-gray-600) !important;
border-color: transparent !important;
padding-left: 8px;
padding-right: 8px;

/* hover */
color: var(--ptcg-purple) !important;
```

**`--google` (OAuth):**
```css
background-color: #FFFFFF !important;
color: #3c4043 !important;
border-color: var(--ptcg-gray-300) !important;
box-shadow: 0 1px 4px rgba(0,0,0,0.08);
```

**Modificadores de tamaño:**
```css
/* Full width */
.ptcg-[page]__btn--full { width: 100%; }

/* Large */
.ptcg-[page]__btn--lg { padding: 14px 32px; font-size: 1.0rem; }

/* Small */
.ptcg-[page]__btn--sm { padding: 7px 16px; font-size: 0.78rem; border-radius: 8px; }
```

**Estado disabled:**
```css
.ptcg-[page]__btn:disabled {
  opacity: 0.50;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
  pointer-events: none;
}
```

### 3.4 Inputs y Formularios

**Input estándar:**
```css
.ptcg-[page]__input {
  width: 100%;
  padding: 11px 14px;
  font-size: 0.90rem;
  font-family: 'Plus Jakarta Sans', sans-serif !important;
  font-weight: 400;
  color: var(--ptcg-gray-900) !important;
  background-color: rgba(255,255,255,0.72) !important;
  border: 1.5px solid var(--ptcg-gray-300) !important;
  border-radius: var(--ptcg-radius-sm);   /* 10px */
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  -webkit-appearance: none;
  appearance: none;
}

/* Focus */
.ptcg-[page]__input:focus {
  border-color: var(--ptcg-purple) !important;
  background-color: rgba(255,255,255,0.95) !important;
  box-shadow: 0 0 0 3px rgba(69,82,204,0.15) !important;
}
```

**Input con icono a la izquierda:** Envolver en `.ptcg-[page]__input-wrap`. El icono usa `position: absolute; left: 14px` y el input recibe `padding-left: 42px !important`.

**Input de código (monospace grande):**
```css
font-size: 1.55rem !important;
font-family: 'SF Mono', ui-monospace, monospace !important;
letter-spacing: 0.20em;
text-align: center;
height: 68px;
font-weight: 700;
```

**Radio buttons custom (pill):**
```css
.ptcg-[page]__radio-option {
  padding: 7px 16px;
  border-radius: 10px;
  border: 1.5px solid var(--ptcg-gray-300);
  background: rgba(255,255,255,0.65) !important;
  transition: all 0.15s;
}
/* Seleccionado (usa :has) */
.ptcg-[page]__radio-option:has(input:checked) {
  border-color: var(--ptcg-purple);
  background: var(--ptcg-purple-pastel) !important;
  color: var(--ptcg-purple) !important;
  font-weight: 700;
}
/* Input real invisible */
.ptcg-[page]__radio-option input[type="radio"] {
  width: 0; height: 0; opacity: 0;
  position: absolute; pointer-events: none;
}
```

### 3.5 Barra de Progreso Multi-paso

**Estructura HTML:**
```html
<div class="ptcg-[page]__progress">
  <div class="ptcg-[page]__progress-steps">
    <div class="ptcg-[page]__progress-step is-done">
      <div class="ptcg-[page]__progress-dot"></div>
      <span class="ptcg-[page]__progress-label">Verificar</span>
    </div>
    <div class="ptcg-[page]__progress-line"></div>
    <div class="ptcg-[page]__progress-step is-active">
      <div class="ptcg-[page]__progress-dot"></div>
      <span class="ptcg-[page]__progress-label">Cuenta</span>
    </div>
  </div>
  <div class="ptcg-[page]__progress-track">
    <div class="ptcg-[page]__progress-fill" style="width: 66%"></div>
  </div>
</div>
```

**Estados de dot:** `.is-active` → dot purple con ring; `.is-done` → dot verde con check `✓`.

**Barra fill (gradiente):**
```css
background: linear-gradient(90deg, var(--ptcg-purple), var(--ptcg-cyan));
transition: width 0.55s cubic-bezier(0.4,0,0.2,1);
```

### 3.6 Pantallas de Estado

Cada pantalla de flujo de una sola página tiene clase `.ptcg-[page]__screen` con `[hidden]` para ocultar. Se anima con `ptcg-fade-in` al activarse.

| Pantalla | Clase modificadora | Icono | Alineación |
|---|---|---|---|
| Detectando | `--detect` | Spinner animado | Centrado, padding-top: 56px |
| Error | `--error` | RI icon rojo grande | Centrado |
| Ya activado | `--already` | RI icon warning | Centrado |
| Éxito | `--success` | RI icon verde/cyan | Centrado |

**Iconos de estado:**
```css
.ptcg-[page]__screen-icon {
  font-size: 4.5rem;
  display: block;
  text-align: center;
  animation: ptcg-icon-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
}
```

### 3.7 Banners y Alertas inline

| Tipo | Background | Border | Texto |
|---|---|---|---|
| Error | `--ptcg-danger-pastel` | `rgba(231,76,60,0.20)` | `#C0392B` |
| Warning | `--ptcg-warning-pastel` | `rgba(243,156,18,0.25)` | `#966003` |
| Success | `--ptcg-success-pastel` | `rgba(46,204,113,0.25)` | `#1a7a45` |
| Info (purple) | `--ptcg-purple-pastel2` | `--ptcg-purple-pastel` | `--ptcg-purple-dark` |

Padding estándar: `12px 16px`. Border-radius: `var(--ptcg-radius-sm)` (10px).

### 3.8 Toast Notifications

Posición fija: `bottom: 24px; right: 20px; z-index: 10000`.

```css
.ptcg-[page]__toast {
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  background: rgba(255,255,255,0.95) !important;
  border: 1px solid var(--ptcg-gray-200);
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  backdrop-filter: blur(12px);
  animation: ptcg-toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
  max-width: 300px;
}
```

### 3.9 Topbar Sticky

```css
.ptcg-[page]__topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 68px;                   /* --ptcg-topbar-h */
  padding: 0 24px;
  background: rgba(243,243,243,0.78);
  backdrop-filter: blur(20px) saturate(200%);
  border-bottom: 1px solid rgba(255,255,255,0.70);
  box-shadow: 0 1px 0 rgba(69,82,204,0.06);
}
```

### 3.10 Tabs de autenticación

```css
.ptcg-[page]__auth-tabs {
  display: flex;
  background: var(--ptcg-gray-100);
  border-radius: var(--ptcg-radius-sm);
  padding: 3px;
  gap: 3px;
}
/* Tab inactivo: fondo transparente, texto gray-500 */
/* Tab activo (.auth-tab--active o [aria-selected="true"]): */
  background: #FFFFFF !important;
  color: var(--ptcg-gray-900) !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.10);
```

### 3.11 Drop Zone (carga de foto/archivo)

```css
border: 2px dashed var(--ptcg-purple-pastel);
border-radius: var(--ptcg-radius);
min-height: 170px;

/* Hover / drag activo */
border-color: var(--ptcg-purple);
background: var(--ptcg-purple-pastel2) !important;
```

### 3.12 Badge / Chip

```html
<span class="ptcg-[page]__step-tag">
  <i class="ri-shield-check-line"></i> Paso 1
</span>
```

```css
display: inline-flex;
align-items: center;
font-size: 0.68rem;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.10em;
color: var(--ptcg-purple) !important;
background: var(--ptcg-purple-pastel);
padding: 4px 12px;
border-radius: 99px;
```

### 3.13 Orbes decorativos de fondo

```html
<div class="ptcg-[page]__orb ptcg-[page]__orb--1" aria-hidden="true"></div>
<div class="ptcg-[page]__orb ptcg-[page]__orb--2" aria-hidden="true"></div>
```

Orbe 1 (esquina superior derecha): `560×560px`, `background: radial-gradient(circle, rgba(69,82,204,0.10) 0%, transparent 70%)`.  
Orbe 2 (esquina inferior izquierda): `380×380px`, `background: radial-gradient(circle, rgba(81,203,245,0.12) 0%, transparent 70%)`.  
Ambos: `position: fixed; pointer-events: none; z-index: 0`. Se ocultan en mobile.

---

## 4. Protocolo Anti-Dashnex

Dashnex inyecta un CSS global basado en Bootstrap 4 que puede sobrescribir colores, tipografía, y estados de formularios. El protocolo previene colisiones.

### 4.1 Reglas obligatorias

1. **Clase raíz única por página.** Cada página define un contenedor raíz con una clase semántica:
   ```html
   <!-- Activación -->       <div class="ptcg-activate">
   <!-- Dashboard cliente --> <div class="ptcg-dashboard">
   <!-- Perfil mascota -->    <div class="ptcg-pet">
   <!-- Refugio -->           <div class="ptcg-refugio">
   ```

2. **Reset local dentro de la clase raíz.** El primer bloque CSS encapsula el reset:
   ```css
   .ptcg-[page],
   .ptcg-[page] * {
     margin: 0;
     padding: 0;
     box-sizing: border-box;
     font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
     color: #212121;
     -webkit-font-smoothing: antialiased;
   }
   ```

3. **Prefijo en todos los selectores.** Ningún selector CSS debe existir fuera de `.ptcg-[page]`. No usar clases genéricas como `.btn`, `.card`, `.container`.

4. **`!important` estratégico.** Aplicar `!important` únicamente en propiedades que Dashnex conocidamente sobrescribe: `color`, `background-color`, `background`, `border-color`, `font-family`, `text-decoration`, `display`. No usar en `margin`, `padding` ni `transform`.

5. **Variables CSS localizadas.** Declarar todas las `--ptcg-*` variables dentro del selector raíz, no en `:root`:
   ```css
   .ptcg-[page] {
     --ptcg-purple: #4552CC;
     /* ... resto de variables */
   }
   ```

6. **Hex hardcodeado como fallback.** En casos donde Dashnex pueda suprimir CSS custom properties (plataformas legacy), usar el valor hex directamente como valor inline de las reglas críticas.

### 4.2 Convención de nomenclatura BEM

```
.ptcg-[page]                    → Bloque raíz
.ptcg-[page]__[elemento]        → Elemento hijo
.ptcg-[page]__[elemento]--[mod] → Modificador de elemento
.ptcg-[page]--[mod]             → Modificador de bloque
```

Ejemplos:
```
.ptcg-activate__btn--primary
.ptcg-dashboard__card--highlighted
.ptcg-pet__screen--loading
```

### 4.3 Estados JS con clases utilitarias

Para estados dinámicos manejados por JavaScript, usar clases sin prefijo de página pero con prefijo `is-`:

| Clase | Uso |
|---|---|
| `is-active` | Tab o step activo |
| `is-done` | Step completado |
| `is-loading` | Estado de carga |
| `is-dragover` | Drop zone con archivo encima |
| `is-error` | Campo con error de validación |

Estas clases solo tienen efecto cuando van combinadas con un selector encapsulado:
```css
.ptcg-activate__progress-step.is-active .ptcg-activate__progress-dot { ... }
```

---

## 5. Breakpoints Responsive

El sistema usa Mobile First como estrategia base.

### 5.1 Definición de breakpoints

| Nombre | Rango | Media Query |
|---|---|---|
| Mobile | ≤ 767px | `@media (max-width: 767px)` |
| Tablet | 768px – 1023px | `@media (min-width: 768px) and (max-width: 1023px)` |
| Desktop | ≥ 1024px | `@media (min-width: 1024px)` |

### 5.2 Adaptaciones por breakpoint

**Mobile (≤767px):**
```css
@media (max-width: 767px) {
  .ptcg-[page] {
    --ptcg-glass-blur: 20px;        /* reducir para performance */
  }
  .ptcg-[page]__orb--1,
  .ptcg-[page]__orb--2 { display: none; }    /* eliminar decoración pesada */

  .ptcg-[page]__topbar {
    padding: 0 16px;
    height: 58px;
    --ptcg-topbar-h: 58px;
  }
  .ptcg-[page]__progress { display: none; }   /* progreso va al body, no topbar */

  .ptcg-[page]__main { padding: 20px 12px 56px; }
  .ptcg-[page]__card {
    padding: 18px;
    border-radius: var(--ptcg-radius);         /* 16px en lugar de 24px */
  }
  .ptcg-[page]__screen-title { font-size: 1.40rem; }  /* reducir heading */
  .ptcg-[page]__field-row { grid-template-columns: 1fr; } /* columnas → fila */

  /* Toasts full-width */
  .ptcg-[page]__toast-wrap { right: 12px; bottom: 16px; }
  .ptcg-[page]__toast { max-width: calc(100vw - 24px); }
}
```

**Tablet (768–1023px):**
```css
@media (min-width: 768px) and (max-width: 1023px) {
  .ptcg-[page]__main { padding: 36px 24px 72px; }
  .ptcg-[page]__screen-inner { max-width: 540px; }
}
```

**Desktop (≥1024px):**
```css
@media (min-width: 1024px) {
  .ptcg-[page]__screen-inner { max-width: 560px; }
  /* Hover lift — solo en dispositivos con puntero preciso */
  .ptcg-[page]__card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(69,82,204,0.12),
                inset 0 1px 0 rgba(255,255,255,0.95);
  }
}
```

---

## 6. Iconos — Remix Icon

**Versión obligatoria:** Remix Icon **4.2.0**

**CDN:**
```html
<link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
```

### 6.1 Reglas de uso

- Usar **exclusivamente** Remix Icon. No mezclar con Font Awesome, Material Icons, etc.
- Los iconos se insertan como `<i class="ri-[nombre]-[estilo]"></i>`.
- Estilos disponibles: `-line` (outline, preferido para UI) y `-fill` (filled, para iconos de estado activo).
- El color del icono se hereda del contexto o se sobreescribe explícitamente con `color: var(--ptcg-...) !important`.
- No escalar iconos con `width`/`height`. Usar `font-size` únicamente.

### 6.2 Iconos frecuentes en Petcingo

| Contexto | Icono | Clase |
|---|---|---|
| Logo / mascota | Paw | `ri-paw-fill` |
| Placa / tag | Tag | `ri-price-tag-3-line` |
| Verificación | Shield | `ri-shield-check-line` |
| Usuario | Cuenta | `ri-account-circle-line` |
| Éxito / check | Check circle | `ri-checkbox-circle-fill` |
| Error | Close circle | `ri-close-circle-fill` |
| Advertencia | Alert | `ri-alert-line` |
| Info | Information | `ri-information-line` |
| Foto / cámara | Camera | `ri-camera-line` |
| Email | Mail | `ri-mail-line` |
| Teléfono | Phone | `ri-phone-line` |
| Contraseña | Lock | `ri-lock-password-line` |
| Google OAuth | Google | `ri-google-fill` |
| Cerrar / X | Close | `ri-close-line` |
| Editar | Pencil | `ri-pencil-line` |
| Flecha derecha | Arrow | `ri-arrow-right-line` |
| Dashboard | Grid | `ri-layout-grid-line` |
| Mascota | Paw | `ri-paw-line` |
| Copiado | Clipboard | `ri-clipboard-check-line` |
| Salud / vital | Heart pulse | `ri-heart-pulse-line` |
| Ayuda | Question | `ri-question-line` |
| Ojo (mostrar pw) | Eye | `ri-eye-line` / `ri-eye-off-line` |

### 6.3 Tamaños de icono

| Rol | `font-size` |
|---|---|
| Inline en texto | `1rem` (hereda) |
| Icono de campo (input) | `1rem` |
| Icono de botón | `1rem` |
| Icono de sección | `1rem` |
| Icono de step / badge | `1.25rem` |
| Icono de estado grande | `4.5rem` |
| Icono hero / decorativo | `2.6rem` |

---

## 7. Animaciones y Microinteracciones

Todos los keyframes llevan el prefijo `ptcg-` para evitar colisiones con animaciones de Dashnex.

### 7.1 Keyframes disponibles

```css
/* Entrada de pantalla — fadeInUp */
@keyframes ptcg-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Pop de icono de estado con spring */
@keyframes ptcg-icon-pop {
  from { transform: scale(0.5); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

/* Entrada de toast desde la derecha */
@keyframes ptcg-toast-in {
  from { opacity: 0; transform: translateX(24px) scale(0.95); }
  to   { opacity: 1; transform: translateX(0)    scale(1); }
}

/* Spinner de carga */
@keyframes ptcg-spin {
  to { transform: rotate(360deg); }
}

/* Pulso de texto loading */
@keyframes ptcg-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}

/* Shimmer skeleton */
@keyframes ptcg-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}

/* Float de orbes decorativos */
@keyframes ptcg-orb-float {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(40px,-25px) scale(1.06); }
  66%      { transform: translate(-25px,35px) scale(0.97); }
}
```

### 7.2 Aplicación estándar

| Elemento | Animación | Duración / Timing |
|---|---|---|
| Pantalla activa | `ptcg-fade-in` | `0.35s ease-out both` |
| Icono de estado | `ptcg-icon-pop` | `0.5s cubic-bezier(0.34,1.56,0.64,1) both` |
| Toast | `ptcg-toast-in` | `0.3s cubic-bezier(0.34,1.56,0.64,1) both` |
| Spinner de carga | `ptcg-spin` | `0.7s linear infinite` |
| Texto "cargando..." | `ptcg-pulse` | `1.4–1.5s ease-in-out infinite` |
| Orbes de fondo | `ptcg-orb-float` | `18s ease-in-out infinite` |

### 7.3 Easing estándar

| Nombre | Valor | Uso |
|---|---|---|
| Ease suave | `cubic-bezier(0.25, 1, 0.5, 1)` | Transiciones de color, fondo, opacidad |
| Spring (rebote) | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Pop de iconos, toasts, scale |
| Material ease | `cubic-bezier(0.4, 0, 0.2, 1)` | Progress bar fill |
| Linear | `linear` | Spinners de rotación continua |

### 7.4 Microinteracciones hover

- **Botón primary:** `translateY(-1px)` + sombra más intensa → `scale(0.97)` en active.
- **Botón secondary / ghost:** solo cambio de color de fondo.
- **Card (desktop):** `translateY(-2px)` + sombra expandida.
- **Input:** border-color → `--ptcg-purple` + ring `box-shadow: 0 0 0 3px rgba(69,82,204,0.15)`.
- **Dot de progreso activo:** `scale(1.1)` + ring `0 0 0 5px rgba(69,82,204,0.16)`.
- **Drop zone:** `border-color` + `background` → pastel purple.
- **Input icon:** `color` → `--ptcg-purple` cuando su `.input-wrap` tiene `:focus-within`.

### 7.5 Shimmer skeleton (loading de contenido)

```css
.ptcg-[page]__skeleton {
  background: linear-gradient(
    90deg,
    var(--ptcg-gray-200) 25%,
    var(--ptcg-gray-100) 50%,
    var(--ptcg-gray-200) 75%
  );
  background-size: 800px 100%;
  animation: ptcg-shimmer 1.5s infinite;
  border-radius: var(--ptcg-radius-sm);
}
```

---

## 8. Estructura HTML de Página Nueva

Template mínimo para una página nueva que siga este sistema:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Petcingo — [Nombre de Página]</title>

  <!-- Remix Icon 4.2.0 -->
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- CSS encapsulado de la página -->
  <link rel="stylesheet" href="https://assets.petcingo.com/css/petcingo-[nombre].css">
</head>
<body>

<!-- ROOT ENCAPSULADO — todo el HTML va dentro de este div -->
<div class="ptcg-[nombre]">

  <!-- Orbes decorativos (opcionales) -->
  <div class="ptcg-[nombre]__orb ptcg-[nombre]__orb--1" aria-hidden="true"></div>
  <div class="ptcg-[nombre]__orb ptcg-[nombre]__orb--2" aria-hidden="true"></div>

  <!-- Topbar -->
  <header class="ptcg-[nombre]__topbar">
    <a href="/" class="ptcg-[nombre]__logo">
      <i class="ri-paw-fill ptcg-[nombre]__logo-icon"></i>
      <span class="ptcg-[nombre]__logo-text">Petcingo</span>
    </a>
  </header>

  <!-- Contenido principal -->
  <main class="ptcg-[nombre]__main">
    <!-- pantallas, cards, formularios -->
  </main>

  <!-- Toast container (JS lo llena dinámicamente) -->
  <div class="ptcg-[nombre]__toast-wrap" aria-live="polite"></div>

</div><!-- /.ptcg-[nombre] -->

<!-- JS encapsulado de la página -->
<script src="https://assets.petcingo.com/js/petcingo-[nombre].js"></script>
</body>
</html>
```

---

## 9. Checklist para IA al generar código nuevo

Antes de entregar CSS o HTML nuevo para Petcingo, verificar:

- [ ] ¿Toda clase CSS empieza con `.ptcg-[nombre]-`?
- [ ] ¿Las variables `--ptcg-*` están declaradas dentro del selector raíz (no en `:root`)?
- [ ] ¿Los colores usan la paleta oficial? (`#4552CC` purple, `#51CBF5` cyan, no valores legacy)
- [ ] ¿Los headings usan `font-family: 'Sora'`? ¿El body usa `'Plus Jakarta Sans'`?
- [ ] ¿Los `!important` se aplican solo donde Dashnex puede sobrescribir?
- [ ] ¿Los iconos son exclusivamente Remix Icon `ri-*`?
- [ ] ¿Los keyframes tienen prefijo `ptcg-`?
- [ ] ¿El breakpoint mobile (`≤767px`) desactiva los orbes y reduce el glass blur?
- [ ] ¿La card principal usa el sistema de 4 capas (`::before` glass + `::after` highlight + `z-index: 2` en children)?
- [ ] ¿Los estados de JS usan clases `is-*` (no atributos `data-*` para visual)?
- [ ] ¿El HTML tiene el div raíz `.ptcg-[nombre]` envolviendo todo?
