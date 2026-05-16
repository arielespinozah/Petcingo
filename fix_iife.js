const fs = require('fs');
let content = fs.readFileSync('f:/Antigravity/Petcingo/assets/js/petcingo-dash.js', 'utf8');

// The file currently has outer IIFE from previous script, and inner IIFEs from the original HTML.
// Let's strip ALL IIFE wrappers and re-wrap the entire thing once.
content = content.replace(/^\(function\(\) \{\n"use strict";\n/, '');
content = content.replace(/\}\)\(\);\n*$/, '');

// Remove the inline "(function() { 'use strict';"
content = content.replace(/\(function\(\) \{\n\s*'use strict';/g, '');

// Remove other (function() { and })();
// Be careful not to remove normal IIFEs inside functions!
// Wait, replacing all of them might break IIFEs used for closure.

// The safest way is to just let standard node syntax formatting fix it, or we just remove the specific ones.
// I know the ones we extracted are:
// Block 1 starts with `(function() {\n  'use strict';` and ends with `})();`
// Block 2 starts with `document.addEventListener` (no IIFE)
// Block 3 starts with `(function() {` and ends with `})();`

// Let's go back to the original dashboard.html to cleanly extract these without regex hacks.
const html = fs.readFileSync('f:/Antigravity/Petcingo/paginas_html/dashboard.html', 'utf8');
const lines = html.split('\n');
const block1 = lines.slice(1883, 3492).join('\n'); // this has (function() {\n  'use strict'; ... })();
const block2 = lines.slice(3498, 3509).join('\n'); // document.addEventListener(...)
const block3 = lines.slice(3513, 3562).join('\n'); // (function() { ... })();

// Strip the IIFE wrappers from block1 and block3.
let b1 = block1.trim();
if (b1.startsWith('(function() {')) {
  b1 = b1.replace(/^\(function\(\) \{\s*'use strict';/, '');
  b1 = b1.replace(/\}\)\(\);$/, '');
}

let b3 = block3.trim();
if (b3.startsWith('(function() {')) {
  b3 = b3.replace(/^\(function\(\) \{/, '');
  b3 = b3.replace(/\}\)\(\);$/, '');
}

let combined = b1 + '\n' + block2 + '\n' + b3;

// Remove functions that are already in petcingo.js
function removeFunc(str, fname) {
  let match = str.indexOf('window.' + fname + ' = function');
  if (match === -1) match = str.indexOf('function ' + fname + '(');
  if (match === -1) return str;
  let idx = str.indexOf('{', match);
  if (idx === -1) return str;
  
  let count = 1;
  let i = idx + 1;
  while (count > 0 && i < str.length) {
    if (str[i] === '{') count++;
    else if (str[i] === '}') count--;
    i++;
  }
  
  let before = str.substring(0, match);
  let after = str.substring(i);
  after = after.trimStart();
  if (after.startsWith(';') || after.startsWith(',')) {
    after = after.substring(1);
  }
  return removeFunc(before + after, fname);
}

const toDelete = [
  'doLogin', 'enterDashboard', 'initDashboard', 'showSection', 'loadPets', 'loadVets', 'loadShelters', 
  'loadUsers', 'loadLogs', 'loadLostPets', 'loadRecent', 'loadRecentReserved', 'loadRegisterSelect', 
  'loadSellersCache', 'renderTable', 'filterTable', 'toggleTrash', 'archivePet', 'restorePet', 
  'permanentDelete', 'saveVet', 'editVet', 'updateVet', 'closeVetModal', 'saveShelter', 'editShelter', 
  'updateShelter', 'closeShelterModal', 'openVetDetail', 'openShelterDetail', 'generateVetQR', 
  'generateShelterQR', 'saveUser', 'editUser', 'updateUser', 'resetUserForm', 'clearOldLogs', 
  'deleteRecord', 'saveLogo', 'removeLogo', 'applyTheme', 'saveStaff', 'generateQR', 'downloadQR', 
  'generateNew', 'exportFullBackup', 'exportDatabase', 'downloadJson', 'importDatabase', 'copyText', 
  'purgeScanLogs', 'applyPermissions', 'addLog', 'loadStats', 'getDb'
];

toDelete.forEach(f => { combined = removeFunc(combined, f); });

// Wrap in one IIFE
combined = '(function() {\n"use strict";\n' + combined + '\n})();';

fs.writeFileSync('f:/Antigravity/Petcingo/assets/js/petcingo-dash.js', combined);
console.log('Fixed syntax and combined blocks.');
