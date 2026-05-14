# Plan de Migración: Petcingo Dashboard (Liquid Glass)

Este documento establece el plan de trabajo arquitectónico y visual para migrar el Panel de Administración de Petcingo a la nueva identidad de diseño **Liquid Glass**, asegurando compatibilidad total con Dashnex y respetando el sistema de diseño establecido en `DESIGN_SYSTEM.md`.

## 1. Encapsulamiento y Arquitectura (Protocolo Anti-Dashnex)
Para evitar que los estilos globales inyectados por Dashnex (basados en Bootstrap 4) rompan la interfaz, todo el CSS del dashboard se encapsulará estrictamente.

- **Clase Raíz**: `.ptcg-dashboard` (Toda la app debe vivir dentro de un `div` con esta clase).
- **Prefijos BEM**: Se utilizará el bloque `ptcg-dashboard` para todo.
  - Ejemplos: `.ptcg-dashboard__sidebar`, `.ptcg-dashboard__card`, `.ptcg-dashboard__btn--primary`.
- **Aislamiento**: Variables CSS (colores, tipografía, espaciado) declaradas localmente en el bloque `.ptcg-dashboard` en lugar de `:root`.
- **Reset Local**: Un bloque CSS que purgue márgenes, paddings y force el uso de `Plus Jakarta Sans` sobre todos los elementos descendientes de `.ptcg-dashboard`.

## 2. Propuesta de Navegación

### Desktop (≥ 1024px)
- **Sidebar Fijo**: Navegación lateral permanente (sidebar). Logo en la parte superior, lista de secciones en el centro (con scroll si es necesario) y botón de "Cerrar sesión" pegado en la parte inferior.
- **Top Bar (Opcional)**: Solo si se requieren breadcrumbs o acciones globales rápidas, de lo contrario, contenido directo.

### Mobile / Tablet (≤ 1023px)
- **Top Bar**: Con el logotipo y un menú hamburguesa (`ri-menu-line`).
- **Drawer Lateral (Off-canvas)**: El sidebar en mobile se convierte en un panel lateral oculto que se despliega desde la izquierda, apoyado por un overlay oscuro (backdrop-filter) detrás para atrapar el enfoque y clics (cerrar al hacer tap fuera).
- *Nota:* Aunque el *Bottom Tab Bar* es ideal para apps de cliente, para un panel de administración con más de 8 módulos principales, un Drawer es la opción más escalable y limpia.

## 3. Secciones y Subsecciones (Inventario y Prioridad)

A continuación se desglosan las funcionalidades existentes extraídas de `codigo_original/dashboard.html` y cómo deben adaptarse.

### 3.1. Pantalla de Autenticación (Login)
- **Funcionalidad**: Acceso mediante contraseña maestra o autenticación en Firebase. Preparado para Google + 2FA a futuro.
- **Componentes UI**: `.ptcg-dashboard__login-card` (Tarjeta Liquid Glass muy pulida), inputs con icono de candado, botón primario full-width, mensajes de error flotantes/toast.
- **Estado Original**: Presente (`#login-screen`), usando layout básico.
- **Prioridad**: **Alta** (Punto de entrada).

### 3.2. Resumen (Overview)
- **Funcionalidad**: Dashboard general (KPIs: placas totales, activas, perdidas, vencidas, red de aliados, placas vendidas/stock) y listas de últimas activaciones/reservas.
- **Componentes UI**: Grid de `.ptcg-dashboard__stat-card` (Liquid Glass con colores temáticos pastel de fondo), listas o mini-tablas para los registros recientes.
- **Estado Original**: Presente (`#sec-overview`).
- **Prioridad**: **Alta** (Pantalla principal).

### 3.3. Registrar Placa
- **Funcionalidad**: Selector de cliente, previsualización de ID, generación y reserva de placas en BD. Módulo alternativo para ID personalizado sin prefijo. Visualización y descarga de código QR.
- **Componentes UI**: Formulario en grilla, `.ptcg-dashboard__input`, selectores custom, display QR con placeholder (`ri-qr-scan-2-line`), botones de acciones secundarias (descargar, copiar, rápido).
- **Estado Original**: Presente (`#sec-register`), layout de panel izquierdo (forms) y panel derecho fijo (QR display).
- **Prioridad**: **Alta** (Core de operación diaria).

### 3.4. Mascotas Registradas
- **Funcionalidad**: Listado principal de todas las mascotas, búsqueda por ID/nombre, filtro por estado/cliente, papelera.
- **Componentes UI**: Barra superior de herramientas, selects de filtro, tabla de datos responsive (`.ptcg-dashboard__table`), insignias (badges) de estado.
- **Estado Original**: Presente (`#sec-pets`), tabla estándar.
- **Prioridad**: **Alta** (Visualización core).

### 3.5. Veterinarias
- **Funcionalidad**: 
  - *Main*: Formulario registro veterinaria y listado de veterinarias asociadas.
  - *Detail*: Generación de placas reservadas bajo el prefijo de la veterinaria y tabla de mascotas de la veterinaria. Modales de edición.
- **Componentes UI**: Formularios de 2 o 3 columnas, botón "Volver" (`.ptcg-dashboard__btn-back`), encabezado con badge de prefijo.
- **Estado Original**: Presente (`#sec-vets`, `#sec-vet-detail`, `#vet-edit-modal`).
- **Prioridad**: **Media**.

### 3.6. Refugios
- **Funcionalidad**:
  - *Main*: Registro y listado de refugios, gestión de credenciales (login/password) específicas del refugio, límite de mascotas.
  - *Detail*: Generar QR bajo prefijo de refugio, listado de mascotas en adopción. Modales de edición.
- **Componentes UI**: Idénticos a Veterinarias, sumando campos para credenciales de acceso.
- **Estado Original**: Presente (`#sec-shelters`, `#sec-shelter-detail`, `#shelter-edit-modal`).
- **Prioridad**: **Media**.

### 3.7. Usuarios y Permisos
- **Funcionalidad**: Creación de cuentas administrativas y asignación de permisos (ver resumen, registro, mascotas, etc.). Listado de usuarios.
- **Componentes UI**: Custom checkboxes (`.ptcg-dashboard__checkbox`), formularios simples.
- **Estado Original**: Presente (`#sec-users`).
- **Prioridad**: **Baja**.

### 3.8. Auditoría (Logs)
- **Funcionalidad**: Historial de acciones ejecutadas por staff en el sistema. Configuración de días de retención y limpieza de logs.
- **Componentes UI**: Listado vertical tipo timeline o mini-tabla, controles de números pequeños.
- **Estado Original**: Presente (`#sec-logs`).
- **Prioridad**: **Baja**.

### 3.9. Base de Datos (Backups)
- **Funcionalidad**: Respaldos JSON completos, purga de logs de escaneo (retención), y respaldos independientes por colección (pets, users, veterinarias, shelters, etc.).
- **Componentes UI**: Tarjetas de acción (`.ptcg-dashboard__action-card`) en grid, destacadas con bordes de color (p. ej. cyan, purple, pink), botones de importar/exportar.
- **Estado Original**: Presente (`#sec-backup`).
- **Prioridad**: **Media**.

### 3.10. Configuración
- **Funcionalidad**: Configuración estética del panel: Logo custom y selector de tema (Oscuro, Claro, Cyan).
- **Componentes UI**: Image uploader con preview, botones de selección de tema (`.ptcg-dashboard__theme-btn`).
- **Estado Original**: Presente (`#sec-settings`).
- **Prioridad**: **Baja** (El nuevo diseño Liquid Glass oscuro será el default superior).

### 3.11. Reportes
- **Funcionalidad**: Gestión de buzón de mensajes/reportes del sistema (abiertos, respondidos, cerrados).
- **Componentes UI**: Tabs/Pills de filtrado, tarjetas de reporte expansibles o listado.
- **Estado Original**: Presente (`#sec-reports`).
- **Prioridad**: **Baja**.

---

## 4. Checklist de Implementación (`paginas_html/dashboard.html`)

- [ ] **Estructura Base CSS:** 
  - Definir bloque `div.ptcg-dashboard` englobando todo el documento (fuera del dashboard principal y de la pantalla de login).
  - Incluir el `<style>` con variables `--ptcg-*` scopeadas en `.ptcg-dashboard`.
  - Aplicar reset local anti-Dashnex (padding, margin, font-family).
- [ ] **Tipografía e Iconos:**
  - Enlazar fuentes de Google Fonts (Sora y Plus Jakarta Sans) y SF Mono (sistema).
  - Integrar CDN de Remix Icon v4.2.0.
- [ ] **Pantalla de Login:**
  - Estilizar `#login-screen` con tarjeta Liquid Glass y gradientes.
- [ ] **Layout General (Dashboard):**
  - Construir `#sidebar` (como Sidebar Desktop y Drawer Mobile).
  - Construir `<main class="ptcg-dashboard__main">` con padding top en mobile para la barra de header.
- [ ] **Componentización BEM (Traducción de Clases):**
  - Mapear `.panel` a `.ptcg-dashboard__card`.
  - Mapear `.btn-primary` a `.ptcg-dashboard__btn .ptcg-dashboard__btn--primary`.
  - Mapear inputs y selects (`.form-input`) a `.ptcg-dashboard__input`.
- [ ] **IDs JS Intactos:**
  - Asegurar que los IDs originales (como `#stat-total`, `#reg-seller-select`, `#pets-tbody`, `#btn-full-backup`, etc.) y atributos (como `data-section`, `onclick="showSection(...)"`) permanezcan **inalterados** en los elementos correspondientes para que la lógica de negocio actual (`petcingo.js` y scripts inyectados) funcione de manera transparente (Drop-in replacement).
- [ ] **Modales y Toasts:**
  - Reprogramar la apariencia de `#vet-edit-modal` y `#shelter-edit-modal` para usar Liquid Glass modal.
  - Asegurar el contenedor `#toast`.
- [ ] **Animaciones:**
  - Agregar transiciones suaves al cambiar de secciones, abrir modales o mostrar mensajes de estado (usando los keyframes `ptcg-fade-in` y similares).
