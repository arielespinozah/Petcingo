# Registro de Cambios (Changelog) - Petcingo

Este documento mantiene un registro histórico de las actualizaciones, mejoras y correcciones realizadas en el proyecto Petcingo.

---

## [2026-05-01] - Sistema de Reportes y Mejoras en pet.html

### 🆕 Sistema de Reportes (Admin Dashboard)

*   **Sección "Reportes" en `dashboard.html`**: Nueva entrada en el sidebar con badge de contador de reportes abiertos. Incluye filtros "Todos / Abiertos / Respondidos / Cerrados".
*   **Colección Firestore `reports`**: Recibe mensajes desde perfiles de mascota (`pet_profile`), propietarios (`owner`) y refugios (`refugio`). Campos: `fromType`, `plateId`, `petName`, `fromName`, `message`, `status`, `adminReply`, `replyAt`, `createdAt`.
*   **Nuevas funciones en `petcingo.js`**: `loadReports(filter)`, `filterReports(status, btn)`, `toggleReplyForm(id)`, `replyToReport(id)`, `closeReportById(id)` — CRUD completo para el admin.
*   **`sendPetReport()`**: Función pública llamada desde `pet.html`; guarda el reporte en Firestore y muestra confirmación al usuario.

### ✨ Mejoras en pet.html

*   **Nombre de mascota**: CSS simplificado a `DM Sans weight 700`, sin `letter-spacing` ni fuente Syne para evitar distorsión visual en ciertos dispositivos.
*   **Chips**: Solo 3 chips: Edad, Género, Peso. Se eliminó la especie (que ya aparece en los datos de la mascota).
*   **Información del propietario**: Accordión ampliado para mostrar teléfono principal, teléfono secundario, dirección, departamento/provincia y botón de Google Maps.
*   **Soporte Técnico — Formulario inline**: Reemplaza el enlace estático por un `<textarea>` real que envía el reporte a Firestore al pulsar "Enviar reporte".
*   **Contacto Petcingo**: Enlace cambiado de `tel:` a `wa.me/59171040074` (WhatsApp).
*   **Logo footer**: Tamaño `height:36px` en desktop, `height:30px` en móvil (`≤480px`).

---

## [2026-05-01] - Rediseño Completo de pet.html (Perfil Público de Mascota)

### 🎨 Rediseño Visual

*   **Hero completamente rediseñado**: Gradiente morado `#5100c0 → #5151fc`. Sin el texto "Petcingo" debajo del avatar. Foto centrada correctamente con `display:flex` en el contenedor. Tamaño aumentado a 124px con sombra más profunda.
*   **Modo perdido — emergencia visual**: Cuando `status === 'perdido'` el hero cambia a gradiente rojo `#990030 → #ff3b6b` con animación `heroEmergency` pulsante + banner sticky en la parte superior animado con degradado deslizante. Badge "Perdido" también parpadea. El `<meta name="theme-color">` cambia a rojo.
*   **Chips mejorados**: Ahora muestran Especie, Edad (calculada desde birthdate si no hay campo age), Género y Peso. Antes solo mostraban especie y género.
*   **Fuente unificada**: Página usa `DM Sans` (cuerpo) y `Syne` (títulos), consistente con el dashboard.

### 📋 Nueva Estructura de Secciones (orden lógico)

1. **Contacto urgente** — Botones WhatsApp + llamada (primero, lo más importante)
2. **Información del propietario** — Nombre dueño, dirección, departamento/provincia, GPS link *(nuevo)*
3. **Mensaje al rescatista** — Renombrado desde "Mensaje del dueño"
4. **Datos de la mascota** — Especie, raza, edad, peso, comportamiento (sin duplicado de dueño)
5. **Información médica** — Vacunas, microchip, castrado (igual que antes)
6. **Soporte Técnico** *(nuevo)* — Reporte por WhatsApp al equipo, link a Petcingo.com, teléfono +591 71040074
7. **Footer con logo** — Logo de Petcingo + texto de identificación

### 🛠️ Cambios en `petcingo.js`

*   **`renderPetProfile`**: Agrega clase `is-lost` al hero y actualiza `meta-theme-color` cuando perdido. Llama al nuevo `_buildPetOwnerAccordion`. Configura dinámicamente el href del botón de reporte en Soporte Técnico.
*   **Nueva función `_buildPetOwnerAccordion`**: Muestra nombre del dueño, dirección texto, departamento/provincia, y enlace GPS desde `d.ownerLocation`.
*   **`_buildPetDataAccordion`**: Eliminado `ownerName` (movido al accordion de propietario). Añadida especie y raza. Eliminado el accordion `pet-acc-location` redundante (integrado en owner accordion).
*   **`prefillEditForm`**: Ahora rellena `edit-loc-gps` (GPS link), `edit-loc-country`, `edit-loc-dept`, `edit-loc-prov` al abrir el formulario de edición.
*   **`updatePetData`**: Ahora guarda `ownerLocation.gpsLink`, `ownerLocation.country`, `ownerLocation.dept`, `ownerLocation.prov` en Firestore.
*   **`var(--primary)` → `#5100c0`** en todos los botones generados dinámicamente en `initPetPage`.

---

## [2026-05-01] - Botón "Editar" del Topbar — Acceso Directo al Modo Edición

### ✨ UX

*   **Topbar "Editar" abre directamente el formulario**: Antes el botón llevaba a la vista de solo lectura de "Mi Mascota", obligando al usuario a un segundo clic en "Editar Información". Ahora llama a `toggleEditMode(true)` junto con `showClientTab`, abriendo el formulario directamente en un solo toque.

---

## [2026-04-30] - UX/UI: Responsive Móvil, Tab Redesign y Correcciones Menores

### 🎨 Rediseño de Interfaz

*   **Tab nav — iOS Segmented Control**: Los botones del menú principal ya no usan el color cyan (`#00e1f3`) como estado activo. Ahora tienen estilo "Segmented Control" de iOS: contenedor con fondo lila suave (`#ede8fa`), tab activo con fondo blanco + texto morado (`#5100c0`) + sombra sutil. Actualizado en `client-dashboard.html` y `petcingo-theme.css`.
*   **En móvil el ícono del tab se muestra en bloque** sobre el texto para aprovechar mejor el espacio reducido.
*   **Área de cambio de foto mejorada**: El botón circular de lápiz ahora muestra el texto "Cambiar" junto al ícono, con color blanco explícito para garantizar contraste.

### 📱 Responsive Móvil (iOS / Android)

*   **Formulario "Mi Mascota" en modo edición**: Todos los grids de 2 columnas (`grid-template-columns:1fr 1fr`) colapsan a una columna en pantallas ≤640px. Los inputs tienen `min-height:48px` y `font-size:16px` para evitar el zoom automático de iOS. El botón "Guardar cambios" ocupa el 100% del ancho.
*   **Historial de escaneos en móvil**: Cada fila de la tabla se convierte en una tarjeta con bordes redondeados y sombra sutil. El label "Acciones" ya no aparece sobre los botones de GPS (se suprime el `::before` en `.td-actions`). Los botones de acción tienen mayor padding táctil.
*   **Tab nav en móvil**: Tabs más compactos con íconos apilados sobre el texto.

### 🐛 Corrección de Bugs

*   **Flash de "Acceso no autorizado"**: Se corrigió el flash visible al ingresar al panel con credenciales válidas. El `auth-wall` ahora inicia con `display:none` en el HTML; `showAuthWall()` lo activa solo cuando corresponde.
*   **"Acciones" en tabla móvil**: Se cambió `data-label="Acciones"` a `data-label=""` en el generador de filas de `petcingo.js` y se ocultó el pseudo-elemento `::before` de `.td-actions` en móvil.
*   **Texto GPS en tarjeta "Mascota Perdida"**: Se eliminó la frase "El historial de escaneos GPS se conservará mientras dure tu suscripción." del HTML (`#lost-card-desc`) y del JS (`_updateLostUI` en `petcingo.js`) en ambos estados (perdido y no perdido).
*   **CSS variables en `petcingo.js`**: Se reemplazaron todos los `var(--...)` en HTML generado por JS con valores hex hardcodeados:
    *   `var(--accent-lost)` → `#f43f5e`
    *   `var(--brand-primary)` → `#5100c0`
    *   `var(--text-muted)`, `var(--muted-dark)` → `#6c757d`
    *   `var(--error)` → `#fc032d`
*   **CSS variable en formulario de edición**: `color:var(--muted-dark)` en el label "FOTO DE PERFIL" reemplazado por `color:#8878a8`.

---

## [2026-04-30] - Auditoría Crítica, Sistema de Diseño y Paleta de Colores

### 🚨 Corrección de Bugs Críticos (Raíz de los problemas)

*   **[CRÍTICO] `</style>` faltante en `client-dashboard.html`**: Gemini eliminó accidentalmente el tag de cierre del bloque `<style>`. El browser interpretaba todo el HTML del body como CSS → **página completamente en blanco**. Causa raíz del bug de dashboard en blanco.
*   **[CRÍTICO] `showAuthWall()` borraba estilos inline en `petcingo.js`**: La función usaba `setAttribute('style', 'display:flex!important')` que **reemplaza** el atributo completo, eliminando `background-color:#f4f6f9` y `color:#1a1a2e`. Con Dashnex, el auth-wall quedaba invisible (texto sobre fondo del mismo color). Corrección: se incluyen bg y color en el mismo `setAttribute`.
*   **[CRÍTICO] `act-step0` con `display:block` hardcodeado en `activate.html`**: El step 0 era visible desde el HTML antes de que JavaScript validara si había `?id=`. Causaba flash de 1 segundo del formulario al cargar sin código de placa. Corrección: inicia `display:none`, JS lo muestra solo tras verificar la placa en Firebase.

### 🐛 Corrección de Bugs Adicionales

*   **`act-success-view` sin `display:none` inicial**: El panel de "Mascota Protegida" podía aparecer visible desde el inicio sin que el usuario guardara. Corrección: `style="display:none"` en el HTML.
*   **`act-step3.style.display` no se ocultaba al guardar**: Solo se removía la clase `active` pero no se seteaba `display:none`. Con el CSS de Dashnex anulando las clases, step3 quedaba visible Y el panel de éxito se apilaba debajo. Corrección: `style.display='none'` explícito antes de mostrar el éxito.
*   **Atributo `style` duplicado en `act-wrap-prov`**: El elemento tenía dos atributos `style="..."`. El browser ignora el segundo → `display:none` no aplicaba. Corregido fusionando ambos en un solo atributo.
*   **Nuclear override afectaba `.btn-cancel`**: El selector `#app button:not(.btn-solid-primary):not(.tab-btn)` no excluía `.btn-cancel`, forzando su texto a `#090909` negro en vez del rojo de la paleta. Corrección: se añadió `:not(.btn-cancel):not(.scan-action-btn)`.

### 🎨 Sistema de Diseño — Paleta de Colores Oficial

*   **Creación de `assets/css/petcingo-theme.css`**: Archivo CSS compartido para todo el proyecto. Centraliza la paleta de colores evitando duplicación de estilos entre páginas. Paleta oficial:
    *   Primario: `#5100c0` (morado Petcingo)
    *   Secundario: `#5151fc` (azul eléctrico) — hovers, bordes activos
    *   Acento: `#00e1f3` (cyan) — tabs activos, highlights
    *   Verde neón: `#abff5a` — hover del botón Editar en topbar
    *   Rojo error: `#fc032d` — botones cancelar, alertas
    *   Texto principal: `#090909` (casi negro)
    *   Fondo: `#f8f6ff` (blanco-morado suave)
*   **Todas las variables CSS (`var(--...)`) reemplazadas por hex hardcodeado**: Dashnex strippeaba las custom properties CSS, dejando botones sin color. Ahora todos los valores son literales.
*   **`client-dashboard.html` y `activate.html` ahora cargan `petcingo-theme.css`** después de `main.css`, garantizando que los estilos de Petcingo tengan prioridad sobre los de Dashnex.
*   **WhatsApp button color**: Actualizado a `#00906c` (Deep Green de la paleta) para coherencia con la marca.

---

## [2026-04-30] - Corrección de Bug Crítico: Código Zombie en Renderizador de Escaneos

### 🐛 Corrección de Errores (Bug Fixes)
*   **[CRÍTICO] Llave de cierre faltante en `initClientApp`**: Al eliminar el bloque zombie en la sesión anterior, se eliminó accidentalmente la llave de cierre `}` de la función `initClientApp`. Esto causaba el error `Uncaught SyntaxError: Unexpected end of input` que impedía que **todo el archivo `petcingo.js` cargara**, dejando en blanco tanto el dashboard del cliente como el perfil público de la mascota.
*   **Código Zombie en `petcingo.js`**: Se detectó y eliminó un bloque de código residual (zombie) que referenciaba variables (`s`, `geoHtml`) fuera de su scope.
*   **Render Duplicado Eliminado**: Se limpió un renderizado doble del historial de escaneos para un render directo y eficiente.

---

## [2026-04-30] - Refactorización UI/UX del Dashboard Cliente y Gestión de GPS

### ✨ Interfaz y Experiencia de Usuario (UX/UI)
*   **Sistema de Diseño Unificado**: Se implementó una paleta de colores global (`:root` con variables CSS) en `client-dashboard.html` utilizando los colores de marca (`#5100c0`, `#c4a8ff`, etc.) para asegurar consistencia en futuras páginas.
*   **Fondo y Estructura**: Se reemplazó el fondo oscuro y plano por un fondo con degradado elegante claro (`linear-gradient`) y se alinearon los contenedores principales a un máximo de 900px para pantallas grandes.
*   **Limpieza de Cabecera**: Se simplificó la barra superior para mostrar únicamente el logotipo y "Panel del Propietario".
*   **Pestaña "Mi Mascota" (Lectura vs Edición)**: Se separó la visualización de la mascota en dos modos:
    *   **Modo Lectura**: Muestra la información en un formato limpio (ocultando los datos que el usuario dejó vacíos).
    *   **Modo Edición**: Se desbloquea al presionar "Editar Información" mostrando el formulario interactivo original.

### 🛠️ Funcionalidades Añadidas
*   **Controles de Escaneo Avanzados**: En la pestaña de escaneos, ahora se muestran tres botones interactivos en los registros con GPS: `Ver mapa` (Google Maps), `Copiar link` y `Compartir en WhatsApp`.
*   **Rastreo de Ruta (Modo Perdido)**: Se habilitó una vista visual de "Línea de Tiempo" (Timeline) que se activa únicamente cuando la mascota está reportada como perdida, mostrando todos los puntos secuenciales GPS recientes.
*   **Aviso de Retención de Datos**: Se incorporó un sistema de alertas informando a los usuarios que los escaneos regulares solo se almacenan por 3 meses para optimizar el almacenamiento (salvo en reportes de pérdida).

### 🐛 Corrección de Errores (Bug Fixes)
*   **Error "lastDate is not defined"**: Se corrigió el error en consola al ingresar a un perfil nuevo sin escaneos, predefiniendo la variable correctamente. Ahora, si no hay escaneos, se muestra una interfaz amigable (Empty State) de "Todavía no hay escaneos registrados".
*   **Contraste de Mapas**: Se corrigió el botón cyan de Google Maps, cambiándolo al color primario delineado para garantizar un alto contraste con el fondo.

---

## [2026-04-29] - Modernización y Refactorización

### 🚀 Infraestructura y Configuración
*   **Migración de Almacenamiento**: Se migró el sistema de subida de imágenes de ImgBB a **Cloudflare R2** directamente desde el navegador (implementado en `activate.html`), utilizando credenciales seguras.
*   **Asistente IA**: Instalación y configuración de Qwen Code vinculado a la API de MuleRouter para asistencia de desarrollo.

### ✨ Interfaz y Experiencia de Usuario (UX/UI)
*   **Rediseño de `activate.html`**:
    *   Modernización visual completa con botones tipo "pill", sombras interactivas y mejor alineación de columnas.
    *   Reemplazo de la alerta genérica del navegador por un modal de confirmación personalizado y oscuro.
    *   Implementación de una animación de confeti (`canvas-confetti`) al registrar exitosamente una mascota.
    *   Aclaración visual de los enlaces generados (Enlace Privado de Edición vs. Perfil Público).
*   **Rediseño de `client-dashboard.html`**:
    *   Transición de modo oscuro a un **tema claro** (`#f8f9fa`) más moderno y alineado con la marca.
    *   Inclusión del logotipo de Petcingo en la barra superior.
    *   Simplificación de la interfaz eliminando secciones redundantes (ej. cuadro repetido del enlace de edición).

### 🛠️ Funcionalidades Añadidas
*   **Procesamiento de Imágenes en Cliente**: Se implementó una función robusta (`crop1To1AndCompress`) en `activate.html` que recorta automáticamente la imagen subida al centro en proporción 1:1 (cuadrada), la redimensiona a 800x800px y la comprime iterativamente para asegurar un peso óptimo (~10-15KB).
*   **Nuevos Datos Clínicos y Físicos (`activate.html`)**:
    *   Adición de campos para: Especie (Perro, Gato, Conejo, Vaca, Caballo, etc.), Raza, y Género.
    *   Implementación de campos dinámicos para Información Médica y Vacunas (solo visibles si se selecciona "Sí").
*   **Geolocalización Optimizada**: Se añadió la solicitud de enlace GPS (Google Maps) con avisos de privacidad claros para el propietario.
*   **Edición de Foto Posterior**: Se integró la capacidad de subir y reemplazar la foto de la mascota directamente desde la pestaña "Editar Perfil" en `client-dashboard.html`.

### 🐛 Corrección de Errores (Bug Fixes)
*   **Seguridad de Acceso (`activate.html`)**: Se corrigió un error crítico donde el enlace de edición generado al final del formulario no incluía el token de seguridad, lo que causaba un error de "Acceso no autorizado" en el panel del cliente.
*   **Inicialización de Firebase (`client-dashboard.html`)**: Se reparó un fallo que impedía cargar el panel debido a que Firebase no se estaba inicializando correctamente antes de solicitar los datos.
*   **Error de Índice en Firebase (`js/petcingo.js`)**: Se solucionó el mensaje *"Se requiere un índice de Firebase"* en la sección de historial de escaneos, optimizando la consulta para evitar índices compuestos innecesarios (se eliminó `orderBy` y la ordenación se hace en el cliente).
*   **Manejo de Imágenes Rotas**: Se implementó la generación de URLs temporales (`createObjectURL`) seguras para previsualizar la foto recién recortada sin depender del caché, evitando previsualizaciones rotas. Adicionalmente, se configuró un avatar por defecto (🐶) para mascotas sin foto.
