const fs = require('fs');

const html = fs.readFileSync('f:/Antigravity/Petcingo/paginas_html/dashboard.html', 'utf8');
const lines = html.split('\n');

// Extract the main IIFE body (lines 1883 to 3491)
let mainBodyLines = lines.slice(1883, 3492);
let mainBody = mainBodyLines.join('\n');

// Clean the main body from IIFE wrappers if any
mainBody = mainBody.replace(/^\(function\(\) \{\s*'use strict';/, '');
mainBody = mainBody.replace(/\}\)\(\);\s*$/, '');

// Extract block 2 (click delegate)
let block2 = lines.slice(3498, 3509).join('\n');

// Extract block 3 (mutation observer)
let block3 = lines.slice(3513, 3561).join('\n');
// block3 has its own IIFE wrapper, let's remove it so it shares the outer one
block3 = block3.replace(/^\(function\(\) \{/, '');
block3 = block3.replace(/\}\)\(\);\s*$/, '');

// Helper to remove function definitions
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

toDelete.forEach(f => {
  mainBody = removeFunc(mainBody, f);
});

// Combine everything
let combined = mainBody + '\n\n' + block2 + '\n\n' + block3;

// Wrap in single IIFE
const finalOutput = '(function() {\n"use strict";\n' + combined + '\n})();\n';

fs.writeFileSync('f:/Antigravity/Petcingo/assets/js/petcingo-dash.js', finalOutput);
console.log('petcingo-dash.js built successfully.');
