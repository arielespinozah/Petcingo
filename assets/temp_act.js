
(function() {
  'use strict';

  /* ── Init Firebase ── */
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  var _db = firebase.firestore();

  /* ── State ── */
  var plateId        = null;
  var compressedBlob = null;
  var editLinkFull   = '';
  var publicLinkFull = '';
  var ownerGpsLat    = null;
  var ownerGpsLng    = null;

  window.getOwnerGps = function() {
    if (!navigator.geolocation) { document.getElementById('gps-status').textContent='GPS no disponible en este dispositivo.'; return; }
    var btn=document.getElementById('btn-get-gps');
    if(btn){btn.disabled=true;btn.textContent='📍 Obteniendo ubicación…';}
    document.getElementById('gps-status').textContent='Obteniendo coordenadas…';
    navigator.geolocation.getCurrentPosition(
      function(pos){
        ownerGpsLat=pos.coords.latitude;ownerGpsLng=pos.coords.longitude;
        document.getElementById('gps-status').textContent='✅ GPS obtenido: '+ownerGpsLat.toFixed(5)+', '+ownerGpsLng.toFixed(5);
        if(btn){btn.disabled=false;btn.textContent='📍 Ubicación GPS ✓ (actualizar)';}
      },
      function(err){
        document.getElementById('gps-status').textContent='⚠️ No se pudo obtener GPS. Usa el campo de texto en su lugar.';
        if(btn){btn.disabled=false;btn.textContent='📍 Usar mi ubicación GPS';}
      },
      {enableHighAccuracy:true,timeout:12000}
    );
  };

  var COUNTRIES = {
    BO:{code:'+591',flag:'🇧🇴',hint:'Ej: 71234567'},AR:{code:'+54',flag:'🇦🇷',hint:'Ej: 1123456789'},
    BR:{code:'+55',flag:'🇧🇷',hint:'Ej: 11987654321'},CL:{code:'+56',flag:'🇨🇱',hint:'Ej: 912345678'},
    CO:{code:'+57',flag:'🇨🇴',hint:'Ej: 3101234567'},CR:{code:'+506',flag:'🇨🇷',hint:'Ej: 81234567'},
    CU:{code:'+53',flag:'🇨🇺',hint:'Ej: 51234567'},EC:{code:'+593',flag:'🇪🇨',hint:'Ej: 991234567'},
    SV:{code:'+503',flag:'🇸🇻',hint:'Ej: 71234567'},ES:{code:'+34',flag:'🇪🇸',hint:'Ej: 612345678'},
    US:{code:'+1',flag:'🇺🇸',hint:'Ej: 2025551234'},GT:{code:'+502',flag:'🇬🇹',hint:'Ej: 41234567'},
    HN:{code:'+504',flag:'🇭🇳',hint:'Ej: 91234567'},MX:{code:'+52',flag:'🇲🇽',hint:'Ej: 5512345678'},
    NI:{code:'+505',flag:'🇳🇮',hint:'Ej: 81234567'},PA:{code:'+507',flag:'🇵🇦',hint:'Ej: 61234567'},
    PY:{code:'+595',flag:'🇵🇾',hint:'Ej: 981234567'},PE:{code:'+51',flag:'🇵🇪',hint:'Ej: 987654321'},
    PR:{code:'+1',flag:'🇵🇷',hint:'Ej: 7871234567'},DO:{code:'+1',flag:'🇩🇴',hint:'Ej: 8091234567'},
    UY:{code:'+598',flag:'🇺🇾',hint:'Ej: 91234567'},VE:{code:'+58',flag:'🇻🇪',hint:'Ej: 4121234567'}
  };

  /* Toggle details for Health radios */
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('input[name="vacc"]').forEach(function(r){
      r.addEventListener('change',function(){
        var wrap=document.getElementById('vacc-details-wrap');
        if(wrap)wrap.style.display=this.value==='yes'?'block':'none';
      });
    });
    document.querySelectorAll('input[name="chip"]').forEach(function(r){
      r.addEventListener('change',function(){
        var wrap=document.getElementById('microchip-id-wrap');
        if(wrap)wrap.style.display=this.value==='yes'?'block':'none';
      });
    });
  });

  window.onCountryChange = function(n) {
    var sel=document.getElementById('country-select-'+n), iso=sel.value, c=COUNTRIES[iso]||COUNTRIES['BO'];
    document.getElementById('flag-'+n).textContent=c.flag;
    document.getElementById('code-'+n).textContent=c.code;
  };
  /* ── Bolivia Location Cascade ── */
  var BOLIVIA_DEPTS = {
    'La Paz': ['Murillo','Omasuyos','Pacajes','Camacho','Mu\u00f1ecas','Larecaja','Franz Tamayo','Inquisivi','Sud Yungas','Los Andes','Aroma','Loayza','Nor Yungas','Abel Iturralde','Bautista Saavedra','Manco Kapac','Gualberto Villarroel','Ingavi','Jos\u00e9 Manuel Pando','Caranavi'],
    'Cochabamba': ['Cercado','Arani','Arque','Ayopaya','Bol\u00edvar','Campero','Capinota','Carrasco','Chapare','Esteban Arze','Germ\u00e1n Jord\u00e1n','Mizque','Punata','Quillacollo','Sacaba','Tapaca\u00ed','Tiraque'],
    'Santa Cruz': ['Andr\u00e9s Ib\u00e1\u00f1ez','Warnes','Ichilo','Chiquitos','Sara','Cordillera','Vallegrande','Florida','Obispo Santistevan','\u00d1uflo de Ch\u00e1vez','\u00c1ngel Sandoval','Manuel Mar\u00eda Caballero','Velasco','Germ\u00e1n Busch','Guarayos'],
    'Oruro': ['Cercado','Sajama','Litoral','Carangas','Saucar\u00ed','Nor Carangas','San Pedro de Totora','Mejillones','Sur Carangas','Ladislao Cabrera','Poop\u00f3','Pantalee\u00f3n Dalence','Avaroa','Tom\u00e1s Barron','Sebasti\u00e1n Pagador'],
    'Potos\u00ed': ['Tom\u00e1s Fr\u00edas','Rafael Bustillo','Cornelio Saavedra','Chayanta','Alonso de Ib\u00e1\u00f1ez','Nor Chichas','Sur Chichas','Nor L\u00edpez','Sur L\u00edpez','Modesto Omiste','Antonio Quijarro','Jos\u00e9 Mar\u00eda Linares','Daniel Campos','Enrique Baldivieso','Charcas','Saavedra'],
    'Chuquisaca': ['Oropeza','Yampar\u00e1ez','Zud\u00e1\u00f1ez','Tomina','Hernando Siles','Nor Cinti','Belisario Boeto','Sur Cinti','Luis Calvo','Azurduy'],
    'Tarija': ['Cercado','Avil\u00e9s','M\u00e9ndez','Aniceto Arce','O Connor','Gran Chaco'],
    'Beni': ['Cercado','Vaca D\u00edez','General Jos\u00e9 Ballivi\u00e1n','Yacuma','Moxos','Marban','Mojos','It\u00e9nez'],
    'Pando': ['Nicol\u00e1s Su\u00e1rez','Manuripi','Madre de Dios','Abu\u00f3n','Federico Rom\u00e1n']
  };

  function populateLocDepts() {
    var deptSel = document.getElementById('owner-dept');
    if (!deptSel) return;
    deptSel.innerHTML = '<option value="">-- Departamento --</option>';
    Object.keys(BOLIVIA_DEPTS).forEach(function(d) {
      deptSel.innerHTML += '<option value="'+d+'">'+d+'</option>';
    });
  }

  window.onLocCountryChange = function(country) {
    var wrap     = document.getElementById('act-wrap-bolivia');
    var wrapProv = document.getElementById('act-wrap-prov');
    if (country === 'Bolivia') {
      if (wrap) { wrap.style.display = 'grid'; wrap.style.gridTemplateColumns = '1fr 1fr'; wrap.style.gap = '16px'; }
      populateLocDepts();
      if (wrapProv) wrapProv.style.display = 'none';
    } else {
      if (wrap) wrap.style.display = 'none';
    }
  };

  window.onLocDeptChange = function(dept) {
    var wrapProv = document.getElementById('act-wrap-prov');
    var provSel  = document.getElementById('owner-province');
    var provs    = BOLIVIA_DEPTS[dept];
    if (provs && provSel) {
      provSel.innerHTML = '<option value="">-- Provincia --</option>';
      provs.forEach(function(p) { provSel.innerHTML += '<option value="'+p+'">'+p+'</option>'; });
      if (wrapProv) wrapProv.style.display = 'block';
    }
  };

  function getPhone(fieldId, selectorId) {
    var raw=document.getElementById(fieldId).value.trim();
    if(!raw)return'';
    var sel=document.getElementById(selectorId), iso=sel?sel.value:'BO', c=COUNTRIES[iso]||COUNTRIES['BO'];
    return c.code+raw.replace(/\D/g,'');
  }

  /* ── DOMContentLoaded ── */
  window.addEventListener('DOMContentLoaded', function() {
    var params=new URLSearchParams(window.location.search);
    plateId=(params.get('id')||'').trim();

    /* Set max date for birthdate */
    var bd=document.getElementById('pet-birthdate');
    if(bd)bd.max=new Date().toISOString().split('T')[0];

    setupPhotoUpload();

    /* Auto-init Bolivia location if pre-selected */
    var initCountry = document.getElementById('owner-country');
    if (initCountry && initCountry.value === 'Bolivia') { window.onLocCountryChange('Bolivia'); }
    /* Hide Bolivia wrap initially if not Bolivia */
    var bWrap = document.getElementById('act-wrap-bolivia');
    if (bWrap && (!initCountry || initCountry.value !== 'Bolivia')) { bWrap.style.display = 'none'; }
    else if (bWrap) { bWrap.style.display = 'grid'; }

    if(!plateId){
      var steps=document.getElementById('act-steps-wrap');if(steps)steps.style.display='none';
      var badge=document.getElementById('act-plate-badge');if(badge)badge.style.display='none';
      var step0=document.getElementById('act-step0');if(step0)step0.style.display='none';
      var step1=document.getElementById('act-step1');if(step1)step1.style.display='none';
      showErr('<strong>⚠️ ID de placa no detectado</strong><br>Accede usando el enlace QR/NFC de la placa.<br><code style="background:rgba(255,59,107,.1);padding:2px 6px;border-radius:4px">activate.html?id=TU_ID</code>');
      hideLoading(); return;
    }

    // Ocultar Steps UI hasta que salgamos del paso 0
    var sw = document.getElementById('act-steps-wrap');
    if(sw) sw.style.display='none';

    document.getElementById('act-plate-id').textContent=plateId;
    showLoading('Verificando placa…');

    _db.collection('pets').doc(plateId).get()
      .then(function(docSnap){
        if(docSnap.exists){
          var status=(docSnap.data()||{}).status;
          /* reservada = plate registered but NOT yet activated by owner → allow form */
          if(status==='activo'||status==='perdido'){
            showErr('Esta placa ya fue activada. <a href="https://prueb2.dashnexpages.net/perfil-mascota-petcingo/?id='+plateId+'" style="color:#5100c0;font-weight:600">Ver perfil →</a>');
            var s0=document.getElementById('act-step0');if(s0)s0.style.display='none';
            var s1=document.getElementById('act-step1');if(s1)s1.style.display='none';
            if(sw)sw.style.display='none';
          }
        }
      })
      .catch(function(e){showErr('Error al verificar: '+e.message);})
      .finally(function(){hideLoading();});
  });

  /* ── Photo upload ── */
  function setupPhotoUpload() {
    var input=document.getElementById('act-photo-input');
    var drop=document.getElementById('act-photo-drop');
    var placeholder=document.getElementById('act-placeholder');
    var compressing=document.getElementById('act-compressing');
    var previewWrap=document.getElementById('act-preview-wrap');
    var previewImg=document.getElementById('act-preview-img');
    var previewSize=document.getElementById('act-preview-size');
    if(!input||!drop)return;

    drop.addEventListener('click',function(e){if(e.target===input)return;if(e.target.classList.contains('act-preview-change'))return;input.click();});

    var crop1To1AndCompress = function(file) {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onerror = function() { reject(new Error('Error al leer el archivo.')); };
        reader.onload = function(evt) {
          var img = new Image();
          img.onerror = function() { reject(new Error('Imagen inválida o corrupta.')); };
          img.onload = function() {
            var canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 800;
            var ctx = canvas.getContext('2d');
            
            // 1. Fondo blanco para evitar transparencias negras en PNG -> JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 800, 800);

            // 2. Calcular recorte cuadrado perfecto (1:1) al centro
            var size = Math.min(img.naturalWidth, img.naturalHeight);
            if (size <= 0) { reject(new Error('Imagen vacía (0px).')); return; }
            
            var sx = (img.naturalWidth - size) / 2;
            var sy = (img.naturalHeight - size) / 2;
            
            try {
              ctx.drawImage(img, sx, sy, size, size, 0, 0, 800, 800);
            } catch(e) {
              reject(new Error('Fallo al procesar imagen: ' + e.message));
              return;
            }
            
            // 3. Comprimir hasta ~15KB iterativamente
            var bestBlob = null;
            var iterate = function(q) {
              try {
                canvas.toBlob(function(blob) {
                  if (!blob) {
                    if (bestBlob) resolve(bestBlob);
                    else reject(new Error('Tu navegador no soporta esta compresión.'));
                    return;
                  }
                  bestBlob = blob;
                  // Si logramos el tamaño objetivo (~15KB) o la calidad es mínima, terminamos
                  if (blob.size <= 15000 || q <= 0.1) {
                    resolve(blob);
                  } else {
                    iterate(+(q - 0.1).toFixed(2));
                  }
                }, 'image/jpeg', q);
              } catch(e) {
                reject(new Error('Error de toBlob: ' + e.message));
              }
            };
            iterate(0.8);
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      });
    };

    var handleFile=function(file){
      if(!file||!file.type.startsWith('image/'))return;
      placeholder.style.display='none';previewWrap.style.display='none';
      compressing.style.display='flex';drop.classList.remove('has-photo');

      crop1To1AndCompress(file).then(function(blob){
        compressedBlob=blob;
        var url=URL.createObjectURL(blob);previewImg.src=url;
        previewSize.textContent='Comprimida a '+(blob.size/1024).toFixed(1)+' KB (1:1) — lista';
        compressing.style.display='none';previewWrap.style.display='flex';drop.classList.add('has-photo');
        setBar(1,'done');
      }).catch(function(e){
        compressedBlob=null;compressing.style.display='none';placeholder.style.display='block';
        showErr('No se pudo procesar la imagen: '+e.message);
      });
    };

    input.addEventListener('change',function(e){if(e.target.files&&e.target.files[0])handleFile(e.target.files[0]);e.target.value='';});
    drop.addEventListener('dragover',function(e){e.preventDefault();drop.classList.add('dragover');});
    drop.addEventListener('dragleave',function(){drop.classList.remove('dragover');});
    drop.addEventListener('drop',function(e){e.preventDefault();drop.classList.remove('dragover');if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0]);});
  }

  window.resetActPhoto=function(){
    compressedBlob=null;
    document.getElementById('act-photo-input').value='';
    document.getElementById('act-preview-wrap').style.display='none';
    document.getElementById('act-compressing').style.display='none';
    document.getElementById('act-placeholder').style.display='block';
    document.getElementById('act-photo-drop').classList.remove('has-photo');
    setBar(1,'active');
  };

  /* ── Step navigation ── */
  window.actGoStep2=function(){
    clearAlerts();
    var ownerName=document.getElementById('owner-name').value.trim();
    var phone=document.getElementById('pet-phone').value.trim();
    if(!ownerName){showErr('El nombre del propietario es obligatorio.');return;}
    if(!phone){showErr('El número de WhatsApp principal es obligatorio.');return;}
    switchStep(1,2,'Paso <span>2 de 3</span> — Datos de la mascota');
  };

  window.actGoStep1=function(){clearAlerts();switchStep(2,1,'Paso <span>1 de 3</span> — Propietario y foto');};

  window.actGoStep3=function(){
    clearAlerts();
    var petName=document.getElementById('pet-name').value.trim();
    if(!petName){showErr('El nombre de la mascota es obligatorio.');return;}

    /* Validate optional fields */
    var bd=document.getElementById('pet-birthdate').value;
    if(bd&&new Date(bd)>new Date()){showErr('La fecha de nacimiento no puede ser en el futuro.');return;}
    var wt=document.getElementById('pet-weight').value.trim();
    if(wt&&(isNaN(parseFloat(wt))||parseFloat(wt)<=0)){showErr('El peso debe ser un número positivo.');return;}

    /* Populate review */
    var ownerName=document.getElementById('owner-name').value.trim();
    var phone=getPhone('pet-phone','country-select-1');
    var phone2=getPhone('pet-phone2','country-select-2');
    
    var countryEl=document.getElementById('owner-country'); var country=countryEl?countryEl.value.trim():'';
    var cityEl=document.getElementById('owner-city'); var city=cityEl?cityEl.value.trim():'';
    var provEl=document.getElementById('owner-province'); var prov=provEl?provEl.value.trim():'';
    var mapsEl=document.getElementById('owner-maps'); var mapsUrl=mapsEl?mapsEl.value.trim():'';
    
    var speciesEl=document.getElementById('pet-species'); var species=speciesEl?speciesEl.value:'';
    var breedEl=document.getElementById('pet-breed'); var breed=breedEl?breedEl.value.trim():'';
    var genderEl=document.getElementById('pet-gender'); var gender=genderEl?genderEl.value:'';
    var messageEl=document.getElementById('pet-message'); var message=messageEl?messageEl.value.trim():'';
    var behaviorEl=document.getElementById('pet-behavior'); var behavior=behaviorEl?behaviorEl.value.trim():'';
    var medicalEl=document.getElementById('pet-medical'); var medical=medicalEl?medicalEl.value.trim():'';
    /* New health fields */
    var vaccChecked=document.querySelector('input[name="vacc"]:checked');
    var vaccVal=vaccChecked?vaccChecked.value:'';
    var vaccDetailsEl=document.getElementById('vacc-details'); var vaccDetails=vaccDetailsEl?vaccDetailsEl.value.trim():'';
    var rabiesCodeEl=document.getElementById('rabies-code'); var rabiesCode=rabiesCodeEl?rabiesCodeEl.value.trim():'';
    var rabiesExpiryEl=document.getElementById('rabies-expiry'); var rabiesExpiry=rabiesExpiryEl?rabiesExpiryEl.value:'';
    var chipChecked=document.querySelector('input[name="chip"]:checked');
    var chipIdEl=document.getElementById('microchip-id'); var chipId=chipIdEl?chipIdEl.value.trim():'';
    var spayChecked=document.querySelector('input[name="spay"]:checked');

    document.getElementById('act-review-pet-name').textContent=petName;
    document.getElementById('act-review-owner').textContent='Propietario/a: '+ownerName;

    /* Avatar */
    var aw=document.getElementById('act-review-avatar-wrap');
    if(compressedBlob){
      aw.innerHTML='<img class="act-review-avatar" src="'+URL.createObjectURL(compressedBlob)+'" alt="foto"/>';
    } else {
      aw.innerHTML='<div class="act-review-avatar-ph" style="font-size:3.5rem;line-height:80px;text-align:center;background:#f0f0f5;color:#5100c0;border-radius:50%;width:80px;height:80px;display:flex;align-items:center;justify-content:center;">🐶</div>';
    }

    /* Photo status */
    document.getElementById('rval-photo').textContent=compressedBlob?'✅ Foto cargada exitosamente':'⚠️ Sin foto (se puede agregar después)';
    document.getElementById('rval-phone').textContent=phone;

    fillRRow('rrow-phone2','rval-phone2',phone2);
    fillRRow('rrow-species','rval-species',species);
    fillRRow('rrow-breed','rval-breed',breed);
    fillRRow('rrow-gender','rval-gender',gender);
    fillRRow('rrow-birth','rval-birth',bd);
    fillRRow('rrow-weight','rval-weight',wt ? wt + ' kg' : '');
    fillRRow('rrow-message','rval-message',message);
    fillRRow('rrow-behavior','rval-behavior',behavior);
    fillRRow('rrow-medical','rval-medical',medical);
    /* New fields review */
    var vaccDisplay=vaccVal==='yes'?('Sí'+(vaccDetails?' — '+vaccDetails:'')):vaccVal==='no'?'No':'';
    fillRRow('rrow-vacc','rval-vacc',vaccDisplay);
    var rabiesParts=[];if(rabiesCode)rabiesParts.push('Cód: '+rabiesCode);if(rabiesExpiry)rabiesParts.push('Vence: '+rabiesExpiry);
    fillRRow('rrow-rabies','rval-rabies',rabiesParts.join(' · '));
    var chipParts=[];
    if(chipChecked){ chipParts.push('Microchip: '+(chipChecked.value==='yes'?'Sí'+(chipId?' ('+chipId+')':''):'No')); }
    if(spayChecked){ chipParts.push('Castrado: '+(spayChecked.value==='yes'?'Sí':'No')); }
    fillRRow('rrow-chip','rval-chip',chipParts.join(' · '));
    var locParts=[country,city,prov].filter(Boolean);
    var locDisplay=locParts.join(', ')+(mapsUrl?' + Link de Maps':'');
    fillRRow('rrow-loc','rval-loc',locDisplay);

    switchStep(2,3,'Paso <span>3 de 3</span> — Revisión final');
  };

  /* ── Modales de Confirmación ── */
  window.actShowConfirmModal=function(){
    document.getElementById('custom-confirm').classList.add('active');
  };
  window.actCloseConfirmModal=function(){
    document.getElementById('custom-confirm').classList.remove('active');
  };

  window.actGoStep2=function(){
    clearAlerts();
    var ownerName=document.getElementById('owner-name').value.trim();
    var phone=document.getElementById('pet-phone').value.trim();
    if(!ownerName){showErr('El nombre del propietario es obligatorio.');return;}
    if(!phone){showErr('El número de WhatsApp principal es obligatorio.');return;}
    switchStep(1,2,'Paso <span>2 de 3</span> — Datos de la mascota');
  };

  /* Go back from step 3 to step 2 */
  window.actGoStep2Back=function(){clearAlerts();switchStep(3,2,'Paso <span>2 de 3</span> — Datos de la mascota');};

  /* Override the goStep2 back button in step3 */
  document.addEventListener('DOMContentLoaded',function(){
    var backBtn=document.querySelector('#act-step3 .act-btn-back');
    if(backBtn)backBtn.onclick=window.actGoStep2Back||window.actGoStep2;
  });

  function switchStep(from, to, labelHtml) {
    /* Hide ALL step panels first */
    [0,1,2,3].forEach(function(n) {
      var el = document.getElementById('act-step'+n);
      if(el) { el.style.display='none'; el.classList.remove('active'); }
    });
    /* Show only the target step */
    var toEl = document.getElementById('act-step'+to);
    if(toEl) { toEl.style.display='block'; toEl.classList.add('active'); }
    /* Update step bars */
    for(var i=1; i<=4; i++) {
      var bar = document.getElementById('act-bar-'+i);
      if(!bar) continue;
      if(i < to) { bar.classList.add('done'); bar.classList.remove('active'); }
      else if(i === to) { bar.classList.add('active'); bar.classList.remove('done'); }
      else { bar.classList.remove('done','active'); }
    }
    /* Update label */
    var lbl=document.getElementById('act-step-label');
    if(lbl && labelHtml) lbl.innerHTML=labelHtml;
    /* Show/hide steps progress bar */
    var stepsWrap=document.getElementById('act-steps-wrap');
    if(stepsWrap) stepsWrap.style.display = (to===0) ? 'none' : 'flex';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  window.actGoStep1=function(){
    document.getElementById('act-step0').classList.remove('active');
    switchStep(0,1,'Paso <span>1 de 3</span> — Propietario y foto');
  };

  function fillRRow(rowId, valId, text) {
    var row=document.getElementById(rowId), val=document.getElementById(valId);
    if(!row||!val)return;
    if(text){val.textContent=text;row.style.display='flex';}
    else{row.style.display='none';}
  }

  /* ── Confirm and Save ── */
  window.actProceedConfirm=function(){
    actCloseConfirmModal();
    clearAlerts();
    var petName=document.getElementById('pet-name').value.trim();
    var ownerName=document.getElementById('owner-name').value.trim();
    var rawPhone=document.getElementById('pet-phone').value.trim();
    if(!petName){showErr('El nombre de la mascota es obligatorio.');window.actGoStep2Back();return;}
    if(!ownerName||!rawPhone){showErr('Faltan datos del propietario.');actGoStep1();return;}

    var phone=getPhone('pet-phone','country-select-1');
    var phone2=getPhone('pet-phone2','country-select-2');

    var btn=document.getElementById('act-btn-confirm');
    btn.disabled=true;btn.innerHTML='<span class="act-spinner"></span>Guardando…';
    showLoading('Iniciando activación…');

    var photoUrl='';

    var detectSeller=function(){
      var parts=plateId.split('-');
      var prefix=null;
      if(parts.length>=3)prefix=parts.slice(0,parts.length-1).join('-');
      else if(parts.length===2)prefix=parts[0];
      if(!prefix)return Promise.resolve(null);
      return _db.collection('veterinarias').where('prefix','==',prefix).limit(1).get()
        .then(function(snap){return snap.empty?null:snap.docs[0].id;})
        .catch(function(){return null;});
    };

    var saveToFirestore=function(sellerId){
      setLoadingText('Guardando en Firestore…');
      var editToken=crypto.randomUUID();
      var wt=document.getElementById('pet-weight').value.trim();
      var vaccChecked2=document.querySelector('input[name="vacc"]:checked');
      var chipChecked2=document.querySelector('input[name="chip"]:checked');
      var spayChecked2=document.querySelector('input[name="spay"]:checked');
      
      var ctry=document.getElementById('owner-country')?document.getElementById('owner-country').value.trim():'';
      var cty=document.getElementById('owner-city')?document.getElementById('owner-city').value.trim():'';
      var prv=document.getElementById('owner-province')?document.getElementById('owner-province').value.trim():'';
      var mUrl=document.getElementById('owner-maps')?document.getElementById('owner-maps').value.trim():'';
      
      var ownerLocation={
        country: ctry||null,
        city: cty||null,
        province: prv||null,
        mapsUrl: mUrl||null
      };
      
      var petData={
        id:plateId,name:petName,ownerName:ownerName,phone:phone,phone2:phone2,
        age:document.getElementById('pet-age')?document.getElementById('pet-age').value.trim():null,
        species:document.getElementById('pet-species').value,
        breed:document.getElementById('pet-breed')?document.getElementById('pet-breed').value.trim():null,
        gender:document.getElementById('pet-gender').value,
        birthdate:document.getElementById('pet-birthdate').value,
        weight:wt?parseFloat(wt):null,
        photoUrl:photoUrl,
        message:document.getElementById('pet-message').value.trim(),
        behavior:document.getElementById('pet-behavior').value.trim(),
        medical:document.getElementById('pet-medical').value.trim(),
        vaccinationStatus:vaccChecked2?vaccChecked2.value:null,
        vaccinationDetails:document.getElementById('vacc-details')?document.getElementById('vacc-details').value.trim():null,
        rabiesVaccineCode:document.getElementById('rabies-code')?document.getElementById('rabies-code').value.trim():null,
        rabiesVaccineExpiry:document.getElementById('rabies-expiry')?document.getElementById('rabies-expiry').value:null,
        microchipped:chipChecked2?chipChecked2.value:null,
        microchipId:document.getElementById('microchip-id')?document.getElementById('microchip-id').value.trim():null,
        spayNeutered:spayChecked2?spayChecked2.value:null,
        ownerLocation:ownerLocation,
        status:'activo',sellerId:sellerId||null,
        subscription:{type:'annual',expiresAt:new Date(Date.now()+365*24*60*60*1000),autoDelete:true},
        editToken:editToken,
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      };
      return _db.collection('pets').doc(plateId).set(petData).then(function(){
        var base=window.location.origin;
        editLinkFull='https://prueb2.dashnexpages.net/cliente/?id='+plateId+'&token='+editToken;
        publicLinkFull='https://prueb2.dashnexpages.net/perfil-mascota-petcingo/?id='+plateId;
        document.getElementById('act-edit-link').textContent=editLinkFull;
        document.getElementById('act-public-link').textContent=publicLinkFull;
        document.getElementById('act-step3').classList.remove('active');
        document.getElementById('act-steps-wrap').style.display='none';
        document.getElementById('act-plate-badge').style.display='none';
        document.getElementById('act-success-view').style.display='block';
        window.scrollTo({top:0,behavior:'smooth'});
        if(window.confetti){
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#5100c0', '#c4a8ff', '#f0ecff'],
            zIndex: 9999
          });
        }
      });
    };

    var doUpload=function(){
      if(!compressedBlob)return Promise.resolve();
      setLoadingText('Subiendo foto a R2…');
      
      return new Promise(function(resolve,reject){
        // Configuración de Cloudflare R2
        AWS.config.update({
          accessKeyId: '6496db9c407984025f99bc0dc6a23264',
          secretAccessKey: 'b270005e8ebf9eef779db72012a0ea6206a9f281eba9d07e0b15f78016c2d94d'
        });

        var s3 = new AWS.S3({
          endpoint: 'https://c11712fefc3437b619d76c69ecc14901.r2.cloudflarestorage.com',
          signatureVersion: 'v4',
          s3ForcePathStyle: true
        });

        var fileName = 'pets/' + plateId + '-' + Date.now() + '.jpg';
        var params = {
          Bucket: 'petcingo',
          Key: fileName,
          Body: compressedBlob,
          ContentType: 'image/jpeg'
        };

        s3.upload(params, function(err, data) {
          if (err) {
            console.error('Cloudflare R2 upload error:', err);
            photoUrl = '';
            resolve(); // Continuamos sin foto para no bloquear la activación en caso de error
          } else {
            // IMPORTANTE: Aquí se debe usar la URL pública de tu bucket. 
            // Si tienes un dominio personalizado o el r2.dev activado, cámbialo aquí.
            // Por defecto intentamos construir la URL del bucket (usa tu dominio personalizado si tienes uno):
            photoUrl = 'https://pub-cb882f9b206543b28ea81fcadac0f4b2.r2.dev/' + fileName; 
            console.log('Upload success! Photo URL:', photoUrl);
            resolve();
          }
        });
      });
    };

    doUpload()
      .then(function(){setLoadingText('Detectando vendedor…');return detectSeller();})
      .then(function(sid){return saveToFirestore(sid);})
      .catch(function(e){showErr('Error al activar: '+e.message);btn.disabled=false;btn.innerHTML='✅ Confirmar y guardar';})
      .finally(function(){hideLoading();});
  };

  window.actCopyLink=function(type){
    var url=type==='edit'?editLinkFull:publicLinkFull;
    navigator.clipboard.writeText(url).then(function(){showSucc(type==='edit'?'✓ Enlace de edición copiado':'✓ Enlace público copiado');});
  };

  /* ── UI helpers ── */
  function showErr(msg){var el=document.getElementById('act-error');el.innerHTML=msg;el.style.display='block';el.scrollIntoView({behavior:'smooth',block:'nearest'});}
  function showSucc(msg){var el=document.getElementById('act-success');el.textContent=msg;el.style.display='block';}
  function clearAlerts(){document.getElementById('act-error').style.display='none';document.getElementById('act-success').style.display='none';}
  function showLoading(t){document.getElementById('act-loading-text').textContent=t;document.getElementById('act-loading').classList.add('active');}
  function setLoadingText(t){document.getElementById('act-loading-text').textContent=t;}
  function hideLoading(){document.getElementById('act-loading').classList.remove('active');}
  function setBar(n,state){var el=document.getElementById('act-bar-'+n);if(!el)return;el.className='act-step-bar'+(state?' '+state:'');}


})();
