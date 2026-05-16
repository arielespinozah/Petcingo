const fs = require('fs');
const content = fs.readFileSync('f:/Antigravity/Petcingo/assets/js/petcingo-dash-raw.js', 'utf8');

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
  
  // also check if the function was declared with window.fname = function() { ... }; or just function fname() { ... }
  // we want to remove the semicolon if it exists
  let before = str.substring(0, match);
  let after = str.substring(i);
  after = after.trimStart();
  if (after.startsWith(';') || after.startsWith(',')) {
    after = after.substring(1);
  }
  return removeFunc(before + after, fname); // recursive in case there are duplicates
}

let clean = content;
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
  clean = removeFunc(clean, f);
});

fs.writeFileSync('f:/Antigravity/Petcingo/assets/js/petcingo-dash.js', '(function() {\n\"use strict\";\n' + clean + '\n})();');
console.log('petcingo-dash.js created and cleaned');
