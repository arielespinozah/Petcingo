const fs = require('fs');

const content = fs.readFileSync('paginas_html/mi-cuenta.html', 'utf-8');

const jsMatch = content.match(/<script>[\s\S]*?'use strict';([\s\S]*?)\}\)\(\);[\s\S]*?<\/script>/);
if (!jsMatch) {
  console.error('Could not find JS block');
  process.exit(1);
}

let jsContent = jsMatch[1];

// Remove old auth functions
jsContent = jsContent.replace(/window\.switchLoginTab\s*=\s*function[\s\S]*?(?=window\.handleLogout)/, '');
jsContent = jsContent.replace(/window\.handleLoginGoogle\s*=\s*function[\s\S]*?(?=window\.switchLoginTab)/, '');
jsContent = jsContent.replace(/window\.handleLoginEmail\s*=\s*function[\s\S]*?(?=window\.handleRegisterEmail)/, '');
jsContent = jsContent.replace(/window\.handleRegisterEmail\s*=\s*function[\s\S]*?(?=window\.handleLogout)/, '');
jsContent = jsContent.replace(/function showLoginScreen\(\) \{[\s\S]*?\}/, '');

// Modify calls to showLoginScreen
jsContent = jsContent.replace(/showLoginScreen\(\);/g, "if(window.ptcgOpenModal) window.ptcgOpenModal('login');");
jsContent = jsContent.replace("document.getElementById('cnt-login-screen').hidden = false;", "if(window.ptcgOpenModal) window.ptcgOpenModal('login');");

// In buildViewModeHtml and buildEditFormHtml, change classes
jsContent = jsContent.replace(/ptcg-cuenta__card/g, 'ptcg-index__card');
jsContent = jsContent.replace(/ptcg-cuenta__btn--primary/g, 'ptcg-index__btn--primary');
jsContent = jsContent.replace(/ptcg-cuenta__btn--secondary/g, 'ptcg-index__btn--secondary');
jsContent = jsContent.replace(/ptcg-cuenta__btn/g, 'ptcg-index__btn');

jsContent = jsContent.replace(/ptcg-cuenta__form-input/g, 'ptcg-activate__input');
jsContent = jsContent.replace(/ptcg-cuenta__form-select/g, 'ptcg-activate__select');
jsContent = jsContent.replace(/ptcg-cuenta__form-textarea/g, 'ptcg-activate__input');
jsContent = jsContent.replace(/ptcg-cuenta__form-label/g, 'ptcg-activate__label');
jsContent = jsContent.replace(/ptcg-cuenta__form-row/g, 'ptcg-activate__form-row');
jsContent = jsContent.replace(/ptcg-cuenta__form-field/g, 'ptcg-activate__form-group');
jsContent = jsContent.replace(/ptcg-cuenta__form-radio-group/g, 'ptcg-activate__radio-group');
jsContent = jsContent.replace(/ptcg-cuenta__form-radio/g, 'ptcg-activate__radio');

const newHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Mi Cuenta — Petcingo</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
  <link rel="stylesheet" href="https://prueb2.dashnexpages.net/assets/css/petcingo-index.css">
  <link rel="stylesheet" href="https://prueb2.dashnexpages.net/assets/css/petcingo-activate.css">

  <style>
    body { background: #F8F9FB; min-height: 100vh; }
    
    /* Reused utilities */
    .ptcg-index__btn {
      display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 8px;
      padding: 12px 20px; border-radius: 12px; font-family: 'Plus Jakarta Sans', sans-serif !important;
      font-size: 0.90rem; font-weight: 600; cursor: pointer; text-decoration: none !important;
      transition: all 0.2s; white-space: nowrap; line-height: 1; border: none;
    }
    .ptcg-index__btn--primary { background: #4552CC !important; color: #fff !important; }
    .ptcg-index__btn--secondary { background: rgba(69,82,204,0.08) !important; color: #4552CC !important; border: 1.5px solid rgba(69,82,204,0.2) !important; }
    .ptcg-index__btn--danger { background: rgba(231,76,60,0.1) !important; color: #E74C3C !important; border: 1.5px solid rgba(231,76,60,0.3) !important; }
    .ptcg-index__btn--success { background: rgba(46,204,113,0.1) !important; color: #2ECC71 !important; border: 1.5px solid rgba(46,204,113,0.3) !important; }

    .ptcg-index__card {
      position: relative; overflow: hidden; isolation: isolate; border-radius: 24px; border: 1px solid rgba(255,255,255,.95);
      box-shadow: 0 8px 40px rgba(69,82,204,.1), 0 2px 8px rgba(69,82,204,.04), inset 0 1px 0 rgba(255,255,255,1);
      padding: 32px 24px; transition: transform .25s ease, box-shadow .25s ease; margin-bottom: 16px; background: #fff;
    }
    .ptcg-index__card::before {
      content: ''; position: absolute; inset: 0; backdrop-filter: blur(40px) saturate(200%); -webkit-backdrop-filter: blur(40px) saturate(200%);
      background: rgba(255,255,255,.72); z-index: 0;
    }
    .ptcg-index__card > * { position: relative; z-index: 2; }
    .ptcg-cuenta__card-title { font-family: 'Sora', sans-serif !important; font-size: 1.1rem; font-weight: 800; color: #212121 !important; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 12px; margin-bottom: 16px; }
    .ptcg-cuenta__card-title i { color: #4552CC !important; font-size: 1.2rem; }

    /* Topbar */
    .ptcg-index__topbar { position: fixed; top: 0; left: 0; right: 0; height: 68px; z-index: 300; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; }
    
    .ptcg-cuenta__main { padding-top: 100px; max-width: 780px; margin: 0 auto; padding-bottom: 80px; padding-left: 20px; padding-right: 20px; }
    .ptcg-cuenta__page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    .ptcg-cuenta__page-title { font-family: 'Sora', sans-serif !important; font-size: 1.8rem; font-weight: 800; color: #212121 !important; letter-spacing: -0.03em; margin: 0; }
    .ptcg-cuenta__page-sub { font-size: 0.9rem; color: #757575 !important; margin-top: 4px; }

    .ptcg-cuenta__pet-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
    .ptcg-cuenta__pet-pill { display: flex; align-items: center; gap: 8px; padding: 8px 20px; border-radius: 99px; border: 1.5px solid #E0E0E0; background: #fff !important; font-size: 0.85rem; font-weight: 600; color: #616161 !important; cursor: pointer; transition: all 0.2s; font-family: 'Plus Jakarta Sans', sans-serif !important; }
    .ptcg-cuenta__pet-pill:hover { border-color: #4552CC; color: #4552CC !important; }
    .ptcg-cuenta__pet-pill.is-active { border-color: #4552CC; background: #4552CC !important; color: #fff !important; }
    .ptcg-cuenta__pet-pill img { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .ptcg-cuenta__pet-pill-no-photo { width: 24px; height: 24px; border-radius: 50%; background: #EEF1FB; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0; color: #4552CC; }
    
    .ptcg-cuenta__empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 56px 24px; text-align: center; }
    .ptcg-cuenta__empty-icon { font-size: 4rem; opacity: 0.45; }
    .ptcg-cuenta__empty-title { font-family: 'Sora', sans-serif !important; font-size: 1.3rem; font-weight: 800; color: #424242 !important; margin: 0; }

    /* Loading Overlay */
    .ptcg-cuenta__loading { position: fixed; inset: 0; z-index: 9999; background: rgba(243,243,243,0.85); backdrop-filter: blur(14px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
    .ptcg-cuenta__loading-spinner { width: 44px; height: 44px; border: 3px solid rgba(69,82,204,0.15); border-top-color: #4552CC; border-radius: 50%; animation: ptcg-spin 0.7s linear infinite; }
    @keyframes ptcg-spin { to { transform: rotate(360deg); } }

    /* Hero inside Card */
    .ptcg-cuenta__pet-hero { display: flex; align-items: center; gap: 18px; }
    .ptcg-cuenta__pet-avatar { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; border: 3px solid #D9DEF5; box-shadow: 0 4px 16px rgba(69,82,204,0.18); flex-shrink: 0; }
    .ptcg-cuenta__pet-avatar-placeholder { width: 88px; height: 88px; border-radius: 50%; background: #EEF1FB; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; flex-shrink: 0; border: 3px solid rgba(255,255,255,0.8); }
    .ptcg-cuenta__pet-info { flex: 1; min-width: 0; }
    .ptcg-cuenta__pet-name { font-family: 'Sora', sans-serif !important; font-size: 1.5rem; font-weight: 800; color: #212121 !important; line-height: 1.1; margin: 0; }
    .ptcg-cuenta__pet-meta { font-size: 0.82rem; color: #757575 !important; margin-top: 4px; }
    .ptcg-cuenta__pet-plate { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; padding: 4px 10px; border-radius: 8px; background: #EEF1FB; border: 1px solid #D9DEF5; font-size: 0.72rem; font-weight: 700; color: #4552CC !important; font-family: monospace !important; letter-spacing: 0.05em; }
    
    .ptcg-cuenta__status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 99px; font-size: 0.72rem; font-weight: 700; margin-top: 6px; }
    .ptcg-cuenta__status-badge--activo { background: #D5F5E3; color: #1a7a45 !important; border: 1px solid rgba(46,204,113,0.25); }
    .ptcg-cuenta__status-badge--perdido { background: #FDEBD0; color: #966003 !important; border: 1px solid rgba(243,156,18,0.3); }

    .ptcg-cuenta__actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; margin-top: 16px; }

    .ptcg-cuenta__info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .ptcg-cuenta__info-item { display: flex; flex-direction: column; gap: 4px; }
    .ptcg-cuenta__info-label { font-size: 0.70rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #9E9E9E !important; }
    .ptcg-cuenta__info-value { font-size: 0.9rem; font-weight: 600; color: #212121 !important; line-height: 1.4; }
    .ptcg-cuenta__info-value--empty { color: #BDBDBD !important; font-style: italic; font-weight: 400; }

    .ptcg-cuenta__contact-list { display: flex; flex-direction: column; gap: 8px; }
    .ptcg-cuenta__contact-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.65) !important; border-radius: 12px; border: 1px solid #E0E0E0; }
    .ptcg-cuenta__contact-label { font-size: 0.8rem; font-weight: 600; color: #616161 !important; }
    .ptcg-cuenta__contact-number { font-size: 0.95rem; font-weight: 700; color: #212121 !important; font-family: monospace; }
    .ptcg-cuenta__btn-wa { display: inline-flex !important; align-items: center !important; gap: 6px; padding: 8px 16px; border-radius: 10px; font-family: 'Plus Jakarta Sans', sans-serif !important; font-size: 0.80rem; font-weight: 700; cursor: pointer; text-decoration: none !important; border: none !important; background: #25D366 !important; color: #fff !important; transition: all 0.2s; white-space: nowrap; }
    .ptcg-cuenta__btn-wa:hover { background: #1eba55 !important; transform: translateY(-1px); }
    
    .ptcg-cuenta__scan-list { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; }
    .ptcg-cuenta__scan-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px; background: rgba(255,255,255,0.60) !important; border-radius: 10px; border: 1px solid #E0E0E0; font-size: 0.80rem; }
    .ptcg-cuenta__scan-item-left { display: flex; align-items: center; gap: 8px; }
    .ptcg-cuenta__scan-item-left i { color: #4552CC !important; font-size: 1rem; flex-shrink: 0; }
    .ptcg-cuenta__scan-time { color: #9E9E9E !important; font-size: 0.74rem; }
    .ptcg-cuenta__scan-empty { font-size: 0.82rem; color: #BDBDBD !important; text-align: center; padding: 16px; font-style: italic; }

    .ptcg-cuenta__edit-mode { display: none; }
    .ptcg-cuenta__edit-mode.is-active { display: flex; flex-direction: column; gap: 16px; }
    
    .ptcg-cuenta__photo-edit-zone { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 24px; }
    .ptcg-cuenta__photo-edit-drop { width: 160px; height: 160px; border-radius: 50%; border: 2px dashed #BDBDBD; background: #fff !important; cursor: pointer; position: relative; overflow: hidden; transition: all 0.2s; }
    .ptcg-cuenta__photo-edit-drop:hover { border-color: #4552CC; }
    .ptcg-cuenta__photo-edit-drop img { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; z-index: 1; }
    .ptcg-cuenta__photo-edit-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #9E9E9E; }
    .ptcg-cuenta__photo-edit-placeholder i { font-size: 2.4rem; color: #BDBDBD !important; }
    .ptcg-cuenta__photo-edit-placeholder span { font-size: 0.70rem; color: #9E9E9E !important; font-weight: 600; text-align: center; padding: 0 12px; }
    .ptcg-cuenta__photo-edit-overlay { position: absolute; inset: 0; background: rgba(69,82,204,0.48); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; opacity: 0; transition: opacity 0.2s; z-index: 2; border-radius: 50%; }
    .ptcg-cuenta__photo-edit-drop:hover .ptcg-cuenta__photo-edit-overlay { opacity: 1; }
    .ptcg-cuenta__photo-edit-overlay i { font-size: 1.8rem; color: #fff !important; }
    .ptcg-cuenta__photo-edit-overlay span { font-size: 0.72rem; color: #fff !important; font-weight: 700; }
    
    .ptcg-cuenta__phone-edit-wrap { display: flex; gap: 8px; align-items: stretch; }
    .ptcg-cuenta__phone-edit-flag { position: relative; display: flex; align-items: center; gap: 4px; padding: 10px 10px 10px 12px; border: 1.5px solid #E0E0E0; border-radius: 10px; background: rgba(255,255,255,0.88) !important; cursor: pointer; flex-shrink: 0; transition: border-color 0.2s; white-space: nowrap; font-size: 0.88rem; min-width: 90px; }
    .ptcg-cuenta__phone-edit-flag:focus-within { border-color: #4552CC !important; }
    .ptcg-cuenta__phone-edit-flag select { position: absolute; inset: 0; opacity: 0; width: 100%; cursor: pointer; font-size: 0.88rem; }
    .ptcg-cuenta__phone-edit-wrap .ptcg-activate__input { flex: 1; }
    
    .ptcg-cuenta__form-actions { display: flex; gap: 10px; margin-top: 16px; }

    /* Toast */
    .ptcg-cuenta__toast-wrap { position: fixed; bottom: 24px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 8px; }
    .ptcg-cuenta__toast { padding: 12px 18px; border-radius: 12px; font-size: 0.84rem; font-weight: 600; color: #212121 !important; background: #fff !important; border: 1px solid #E0E0E0; box-shadow: 0 4px 20px rgba(0,0,0,0.12); }
    .ptcg-cuenta__toast--success { background: #D5F5E3 !important; border-color: rgba(46,204,113,0.25); color: #1a7a45 !important; }
    .ptcg-cuenta__toast--error { background: #FADBD8 !important; border-color: rgba(231,76,60,0.25); color: #922b21 !important; }

    .ptcg-activate__radio.is-checked { border-color: #4552CC; background: #EEF1FB !important; color: #4552CC !important; font-weight: 700; }
    
    /* Reponsive */
    @media (max-width: 767px) {
      .ptcg-cuenta__main { padding-top: 80px; padding-left: 14px; padding-right: 14px; }
      .ptcg-cuenta__info-grid { grid-template-columns: 1fr; }
      .ptcg-cuenta__pet-hero { flex-direction: column; align-items: flex-start; gap: 12px; }
      .ptcg-cuenta__actions { flex-direction: column; }
      .ptcg-cuenta__actions .ptcg-index__btn { width: 100%; }
      .ptcg-activate__form-row { grid-template-columns: 1fr; }
      .ptcg-cuenta__form-actions { flex-direction: column; }
      .ptcg-cuenta__form-actions .ptcg-index__btn { width: 100%; }
    }
  </style>
</head>
<body>

  <!-- Loading Overlay -->
  <div class="ptcg-cuenta__loading" id="cnt-loading">
    <div class="ptcg-cuenta__loading-spinner"></div>
    <p class="ptcg-cuenta__loading-text" id="cnt-loading-text">Verificando sesión…</p>
  </div>

  <!-- Topbar -->
  <header class="ptcg-index__topbar">
    <a href="index.html" style="display:flex;align-items:center;">
      <img src="https://prueb2.dashnexpages.net/assets/images/logo/PETCINGO_DARK.svg" alt="Petcingo" style="height:36px;">
    </a>
    <div style="display:flex;align-items:center;gap:12px;" id="cnt-topbar-user" hidden>
      <span style="font-size:0.85rem;font-weight:700;color:#212121;" id="cnt-user-name"></span>
      <button onclick="handleLogout()" style="background:rgba(231,76,60,0.1);color:#E74C3C;border:none;padding:8px 16px;border-radius:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
        <i class="ri-logout-box-line"></i> Cerrar sesión
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <main class="ptcg-cuenta__main" id="cnt-main" hidden>
    <div class="ptcg-cuenta__page-header">
      <div>
        <h1 class="ptcg-cuenta__page-title">Mis mascotas</h1>
        <p class="ptcg-cuenta__page-sub" id="cnt-subtitle">Cargando…</p>
      </div>
      <a href="activate.html" class="ptcg-index__btn ptcg-index__btn--secondary" style="flex-shrink:0;">
        <i class="ri-add-line"></i> Activar placa
      </a>
    </div>
    
    <div class="ptcg-cuenta__pet-pills" id="cnt-pet-pills" hidden></div>
    
    <div class="ptcg-cuenta__empty" id="cnt-empty" hidden>
      <div class="ptcg-cuenta__empty-icon">🐾</div>
      <h2 class="ptcg-cuenta__empty-title">Aún no tienes mascotas activadas</h2>
      <p class="ptcg-cuenta__empty-sub" style="color:#757575;">Activa una placa Petcingo para vincular a tu primera mascota.</p>
      <a href="activate.html" class="ptcg-index__btn ptcg-index__btn--primary" style="margin-top:16px;">
        <i class="ri-shield-check-line"></i> Activar mi primera placa
      </a>
    </div>
    
    <div id="cnt-pet-panels"></div>
  </main>

  <div class="ptcg-cuenta__toast-wrap" id="cnt-toast-wrap"></div>

  <!-- Modal Auth from index.html -->
  <div class="ptcg-index" style="position:static;min-height:0;background:transparent !important">
    <div class="ptcg-index__modal-overlay" id="ptcg-modal" hidden aria-modal="true" role="dialog">
      <div class="ptcg-index__modal-card">
        <button class="ptcg-index__modal-close" id="ptcg-modal-close" onclick="ptcgCloseModal()"><i class="ri-close-line"></i></button>
        <div class="ptcg-index__modal-inner">
          <div style="text-align:center;margin-bottom:24px;">
            <img src="https://prueb2.dashnexpages.net/assets/images/logo/PETCINGO_DARK.svg" alt="Petcingo" style="height:44px;">
          </div>

          <div class="ptcg-index__modal-view" id="ptcg-view-login">
            <h2 class="ptcg-index__modal-title">Bienvenido de vuelta</h2>
            <p class="ptcg-index__modal-sub">Ingresa para gestionar el perfil de tu mascota.</p>
            <button class="ptcg-index__btn-google" onclick="ptcgGoogleLogin()">
              <svg class="ptcg-index__google-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continuar con Google
            </button>
            <div class="ptcg-index__modal-divider">o con tu correo</div>
            <div class="ptcg-index__modal-error" id="ptcg-login-err" hidden><i class="ri-error-warning-line"></i><span id="ptcg-login-err-msg"></span></div>
            <div class="ptcg-index__modal-field">
              <label class="ptcg-index__modal-label">Correo electrónico</label>
              <div class="ptcg-index__modal-iw">
                <i class="ri-mail-line"></i><input class="ptcg-index__modal-input" id="ptcg-login-email" type="email" placeholder="tu@correo.com">
              </div>
            </div>
            <div class="ptcg-index__modal-field">
              <label class="ptcg-index__modal-label">Contraseña</label>
              <div class="ptcg-index__modal-iw">
                <i class="ri-lock-line"></i><input class="ptcg-index__modal-input" id="ptcg-login-pass" type="password" placeholder="••••••••">
                <button class="ptcg-index__modal-eye" type="button" onclick="ptcgToggleEye(this,'ptcg-login-pass')"><i class="ri-eye-line"></i></button>
              </div>
            </div>
            <a class="ptcg-index__modal-forgot" onclick="ptcgShowView('recovery')">¿Olvidaste tu contraseña?</a>
            <button class="ptcg-index__modal-submit" id="ptcg-login-submit" onclick="ptcgEmailLogin()"><span class="ptcg-index__modal-btn-text"><i class="ri-login-box-line"></i> Ingresar</span></button>
            <div class="ptcg-index__modal-switch">¿No tienes cuenta? <a onclick="ptcgShowView('register')">Crear cuenta</a></div>
          </div>

          <div class="ptcg-index__modal-view" id="ptcg-view-register" hidden>
            <h2 class="ptcg-index__modal-title">Crear cuenta</h2>
            <p class="ptcg-index__modal-sub">Registra tu cuenta y activa la placa de tu mascota.</p>
            <button class="ptcg-index__btn-google" onclick="ptcgGoogleLogin()">
              <svg class="ptcg-index__google-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Registrarse con Google
            </button>
            <div class="ptcg-index__modal-divider">o con correo y contraseña</div>
            <div class="ptcg-index__modal-error" id="ptcg-reg-err" hidden><i class="ri-error-warning-line"></i><span id="ptcg-reg-err-msg"></span></div>
            <div class="ptcg-index__modal-field">
              <label class="ptcg-index__modal-label">Nombre completo</label>
              <div class="ptcg-index__modal-iw"><i class="ri-user-line"></i><input class="ptcg-index__modal-input" id="ptcg-reg-name" type="text" placeholder="Juan Pérez"></div>
            </div>
            <div class="ptcg-index__modal-field">
              <label class="ptcg-index__modal-label">Correo electrónico</label>
              <div class="ptcg-index__modal-iw"><i class="ri-mail-line"></i><input class="ptcg-index__modal-input" id="ptcg-reg-email" type="email" placeholder="tu@correo.com"></div>
            </div>
            <div class="ptcg-index__modal-field">
              <label class="ptcg-index__modal-label">Contraseña</label>
              <div class="ptcg-index__modal-iw">
                <i class="ri-lock-line"></i><input class="ptcg-index__modal-input" id="ptcg-reg-pass" type="password" placeholder="Mínimo 6 caracteres">
                <button class="ptcg-index__modal-eye" type="button" onclick="ptcgToggleEye(this,'ptcg-reg-pass')"><i class="ri-eye-line"></i></button>
              </div>
            </div>
            <button class="ptcg-index__modal-submit" id="ptcg-reg-submit" onclick="ptcgEmailRegister()"><span class="ptcg-index__modal-btn-text"><i class="ri-user-add-line"></i> Crear cuenta</span></button>
            <div class="ptcg-index__modal-switch">¿Ya tienes cuenta? <a onclick="ptcgShowView('login')">Ingresar</a></div>
          </div>

          <div class="ptcg-index__modal-view" id="ptcg-view-recovery" hidden>
            <h2 class="ptcg-index__modal-title">Recuperar contraseña</h2>
            <p class="ptcg-index__modal-sub">Te enviamos un enlace para restablecer tu contraseña.</p>
            <div class="ptcg-index__modal-error" id="ptcg-rec-err" hidden><i class="ri-error-warning-line"></i><span id="ptcg-rec-err-msg"></span></div>
            <div class="ptcg-index__modal-success" id="ptcg-rec-ok" hidden><i class="ri-checkbox-circle-line"></i><span>¡Enviado! Revisa tu correo.</span></div>
            <div class="ptcg-index__modal-field">
              <label class="ptcg-index__modal-label">Correo electrónico</label>
              <div class="ptcg-index__modal-iw"><i class="ri-mail-line"></i><input class="ptcg-index__modal-input" id="ptcg-rec-email" type="email" placeholder="tu@correo.com"></div>
            </div>
            <button class="ptcg-index__modal-submit" id="ptcg-rec-submit" onclick="ptcgSendRecovery()"><span class="ptcg-index__modal-btn-text"><i class="ri-send-plane-line"></i> Enviar enlace</span></button>
            <div class="ptcg-index__modal-switch"><a onclick="ptcgShowView('login')"><i class="ri-arrow-left-line"></i> Volver al inicio de sesión</a></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
  <script src="https://sdk.amazonaws.com/js/aws-sdk-2.1500.0.min.js"></script>
  <script src="https://prueb2.dashnexpages.net/assets/js/petcingo-shield.js"></script>

<script>
(function() {
  'use strict';
  ` + jsContent + `
  // Modal scripts
  window.ptcgGoogleLogin = function () {
    var btn = document.getElementById('ptcg-login-submit');
    if(btn) btn.disabled = true;
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .then(function (r) { if(window.ptcgCloseModal) window.ptcgCloseModal(); })
      .catch(function (e) { if(btn) btn.disabled = false; ptcgShowErr('ptcg-login-err', e.message); });
  };

  window.ptcgEmailLogin = function () {
    var email = document.getElementById('ptcg-login-email').value.trim();
    var pass  = document.getElementById('ptcg-login-pass').value;
    if (!email || !pass) { ptcgShowErr('ptcg-login-err', 'Completa todos los campos.'); return; }
    var btn = document.getElementById('ptcg-login-submit');
    btn.disabled = true;
    auth.signInWithEmailAndPassword(email, pass)
      .then(function (r) { if(window.ptcgCloseModal) window.ptcgCloseModal(); })
      .catch(function (e) { btn.disabled = false; ptcgShowErr('ptcg-login-err', 'Error de autenticación.'); });
  };

  window.ptcgEmailRegister = function () {
    var name  = document.getElementById('ptcg-reg-name').value.trim();
    var email = document.getElementById('ptcg-reg-email').value.trim();
    var pass  = document.getElementById('ptcg-reg-pass').value;
    if (!name || !email || !pass) { ptcgShowErr('ptcg-reg-err', 'Completa todos los campos.'); return; }
    if (pass.length < 6) { ptcgShowErr('ptcg-reg-err', 'La contraseña debe tener al menos 6 caracteres.'); return; }
    var btn = document.getElementById('ptcg-reg-submit');
    btn.disabled = true;
    auth.createUserWithEmailAndPassword(email, pass)
      .then(function (r) {
        return r.user.updateProfile({ displayName: name })
          .then(function () { if(window.ptcgCloseModal) window.ptcgCloseModal(); });
      })
      .catch(function (e) { btn.disabled = false; ptcgShowErr('ptcg-reg-err', 'Error al registrar.'); });
  };

  window.ptcgSendRecovery = function () {
    var email = document.getElementById('ptcg-rec-email').value.trim();
    if (!email) { ptcgShowErr('ptcg-rec-err', 'Ingresa tu correo.'); return; }
    var btn = document.getElementById('ptcg-rec-submit');
    btn.disabled = true;
    auth.sendPasswordResetEmail(email)
      .then(function () {
        btn.disabled = false;
        document.getElementById('ptcg-rec-ok').hidden  = false;
        document.getElementById('ptcg-rec-err').hidden = true;
      })
      .catch(function (e) { btn.disabled = false; ptcgShowErr('ptcg-rec-err', 'Error al enviar.'); });
  };

  window.ptcgOpenModal = function (view) {
    var m = document.getElementById('ptcg-modal');
    m.hidden = false;
    ptcgShowView(view || 'login');
  };

  window.ptcgCloseModal = function () { document.getElementById('ptcg-modal').hidden = true; };

  window.ptcgShowView = function (view) {
    ['login','register','recovery'].forEach(function (v) {
      var el = document.getElementById('ptcg-view-' + v);
      if (el) el.hidden = (v !== view);
    });
    ['ptcg-login-err','ptcg-reg-err','ptcg-rec-err','ptcg-rec-ok'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.hidden = true;
    });
  };

  window.ptcgToggleEye = function (btn, inputId) {
    var input = document.getElementById(inputId);
    var icon  = btn.querySelector('i');
    if (input.type === 'password') { input.type = 'text'; icon.className = 'ri-eye-off-line'; }
    else { input.type = 'password'; icon.className = 'ri-eye-line'; }
  };

  function ptcgShowErr(id, msg) {
    var el = document.getElementById(id); if (!el) return;
    el.hidden = false;
    var sp = el.querySelector('span'); if (sp) sp.textContent = msg;
  }
})();
</script>
</body>
</html>`;

fs.writeFileSync('paginas_html/mi-cuenta.html', newHtml, 'utf-8');
console.log('Successfully rewrote paginas_html/mi-cuenta.html');
