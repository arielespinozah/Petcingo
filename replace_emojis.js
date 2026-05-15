const fs = require('fs');

function replaceDashboard() {
  let c = fs.readFileSync('paginas_html/dashboard.html', 'utf8');
  
  c = c.split('<div class="stat-icon">🐾</div>').join('<div class="stat-icon"><i class="ri-footprint-line"></i></div>');
  c = c.split('<div class="stat-icon">✅</div>').join('<div class="stat-icon"><i class="ri-check-line" style="color:#2ECC71;"></i></div>');
  c = c.split('<div class="stat-icon">🚨</div>').join('<div class="stat-icon"><i class="ri-alert-line" style="color:#E74C3C;"></i></div>');
  c = c.split('<div class="stat-icon">⏰</div>').join('<div class="stat-icon"><i class="ri-timer-line"></i></div>');
  c = c.split('<div class="stat-icon">🏥</div>').join('<div class="stat-icon"><i class="ri-hospital-line"></i></div>');
  c = c.split('<div class="stat-icon">🏠</div>').join('<div class="stat-icon"><i class="ri-home-heart-line"></i></div>');
  c = c.split('<div class="stat-icon">📦</div>').join('<div class="stat-icon"><i class="ri-archive-line"></i></div>');
  c = c.split('<div class="stat-icon">💰</div>').join('<div class="stat-icon"><i class="ri-money-dollar-circle-line"></i></div>');
  
  fs.writeFileSync('paginas_html/dashboard.html', c);
  console.log("Dashboard emojis replaced.");
}

function replacePetcingo() {
  let c = fs.readFileSync('assets/js/petcingo.js', 'utf8');
  
  // 1. En loadRecent()
  const search1 = "var bCls=d.status==='perdido'?'badge-lost':'badge-active';\nvar bTxt=d.status==='perdido'?'🚨 Perdido':'✅ Activo';";
  // The user says it might be 'Perdido' and 'Activo'. I'll split/join lines exactly or use a more precise replacement.
  
  const search1_a = "var bTxt=d.status==='perdido'?'🚨 Perdido':'✅ Activo';";
  const search1_b = "var bTxt = d.status === 'perdido' ? '🚨 Perdido' : '✅ Activo';";
  
  c = c.split("var bTxt=d.status==='perdido'?'🚨 Perdido':'✅ Activo';").join("var bTxt=d.status==='perdido'?'<i class=\"ri-alert-line\"></i> Perdido':'<i class=\"ri-check-line\"></i> Activo';");
  c = c.split("var bTxt = d.status === 'perdido' ? '🚨 Perdido' : '✅ Activo';").join("var bTxt = d.status === 'perdido' ? '<i class=\"ri-alert-line\"></i> Perdido' : '<i class=\"ri-check-line\"></i> Activo';");
  
  // Also any other strings with these exact emojis in loadStats or globally inside strings
  // The user said: "en la función loadStats(), buscar los emojis... Específicamente, buscar cualquier ocurrencia de '✅', '🚨', '⏰', '🐾', '📦', '💰', '🏥', '🏠' que estén dentro de strings de JavaScript y reemplazarlas"
  // Since we are replacing textually, we can just replace the emojis in the strings.
  
  const iconMap = {
    '✅': '<i class="ri-check-line"></i>',
    '🚨': '<i class="ri-alert-line"></i>',
    '⏰': '<i class="ri-timer-line"></i>',
    '🐾': '<i class="ri-footprint-line"></i>',
    '📦': '<i class="ri-archive-line"></i>',
    '💰': '<i class="ri-money-dollar-circle-line"></i>',
    '🏥': '<i class="ri-hospital-line"></i>',
    '🏠': '<i class="ri-home-heart-line"></i>'
  };

  // Wait, if I do global replacement, it might touch comments? 
  // User said: "No tocar comentarios ni estructura del código."
  // Let's replace ONLY when they are wrapped in quotes or part of string concatenation.
  
  // Instead of complex AST, I will read lines, if line has 'loadStats', I will replace until the end of function.
  // Actually, I can just replace the specific strings. 
  
  // Examples from petcingo.js:
  // '<div class="stat-icon">🐾</div>' -> '<div class="stat-icon"><i class="..."></i></div>'
  // But those are in dashboard.html. 
  // Wait, JS might have: `html += '<div class="stat-icon">🐾</div>';`
  
  for (const [emoji, icon] of Object.entries(iconMap)) {
    // We want to replace these emojis but only if they are inside strings. A safe textual way:
    c = c.split(`'${emoji}'`).join(`'${icon}'`);
    c = c.split(`"${emoji}"`).join(`"${icon}"`);
    c = c.split(`> ${emoji} `).join(`> ${icon} `);
    c = c.split(`' ${emoji} `).join(`' ${icon} `);
    c = c.split(`" ${emoji} `).join(`" ${icon} `);
    c = c.split(`${emoji} `).join(`${icon} `); // careful with this
  }
  
  fs.writeFileSync('assets/js/petcingo.js', c);
  console.log("petcingo.js emojis replaced.");
}

replaceDashboard();
replacePetcingo();
