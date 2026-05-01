
  window.addEventListener('DOMContentLoaded', function() {
    if (typeof firebase !== 'undefined' && !firebase.apps.length && typeof FIREBASE_CONFIG !== 'undefined') {
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    /* Vacuna toggle */
    document.querySelectorAll('input[name="edit-vacc-status"]').forEach(function(r){
      r.addEventListener('change', function(){
        document.getElementById('wrap-edit-vacc-details').style.display = this.value === 'yes' ? 'grid' : 'none';
      });
    });

    /* Bolivia: departamentos y provincias */
    var BOLIVIA_PROVINCIAS = {
      'La Paz': ['Murillo','Omasuyos','Pacajes','Camacho','Muñecas','Larecaja','Franz Tamayo','Inquisivi','Sud Yungas','Los Andes','Aroma','Loayza','Nor Yungas','Abel Iturralde','Bautista Saavedra','Manco Kapac','Gualberto Villarroel','Ingavi','José Manuel Pando','Caranavi'],
      'Cochabamba': ['Cercado','Arani','Arque','Ayopaya','Bolívar','Campero','Capinota','Carrasco','Chapare','Esteban Arze','Germán Jordán','Mizque','Punata','Quillacollo','Sacaba','Tapacarí','Tiraque'],
      'Santa Cruz': ['Andrés Ibáñez','Warnes','Ichilo','Chiquitos','Sara','Cordillera','Vallegrande','Florida','Obispo Santistevan','Ñuflo de Chávez','Ángel Sandoval','Manuel María Caballero','Velasco','Germán Busch','Guarayos'],
      'Oruro': ['Cercado','Sajama','Litoral','Carangas','Saucarí','Nor Carangas','San Pedro de Totora','Mejillones','Sur Carangas','Ladislao Cabrera','Poopó','Pantaleón Dalence','Avaroa','Tomás Barron','Sebastián Pagador'],
      'Potosí': ['Tomás Frías','Rafael Bustillo','Cornelio Saavedra','Chayanta','Alonso de Ibáñez','Nor Chichas','Sur Chichas','Nor Lípez','Sur Lípez','Modesto Omiste','Antonio Quijarro','José María Linares','Daniel Campos','Enrique Baldivieso','Charcas','Saavedra'],
      'Chuquisaca': ['Oropeza','Yamparáez','Zudáñez','Tomina','Hernando Siles','Nor Cinti','Belisario Boeto','Sur Cinti','Luis Calvo','Azurduy'],
      'Tarija': ['Cercado','Avilés','Méndez','Aniceto Arce','O Connor','Gran Chaco'],
      'Beni': ['Cercado','Vaca Díez','General José Ballivián','Yacuma','Moxos','Marban','Mojos','Iténez'],
      'Pando': ['Nicolás Suárez','Manuripi','Madre de Dios','Abuná','Federico Román']
    };

    window.onCountryChange = function(country, prefix) {
      var wrapDept = document.getElementById(prefix+'-wrap-dept');
      var wrapProv = document.getElementById(prefix+'-wrap-prov');
      var deptSel  = document.getElementById(prefix+'-loc-dept');
      if (country === 'Bolivia') {
        wrapDept.style.display = 'block';
        deptSel.innerHTML = '<option value="">Seleccionar departamento…</option>';
        Object.keys(BOLIVIA_PROVINCIAS).forEach(function(d) {
          deptSel.innerHTML += '<option value="'+d+'">'+d+'</option>';
        });
        if (wrapProv) wrapProv.style.display = 'none';
      } else {
        if (wrapDept) wrapDept.style.display = 'none';
        if (wrapProv) wrapProv.style.display = 'none';
      }
    };

    window.onDeptChange = function(dept, prefix) {
      var wrapProv = document.getElementById(prefix+'-wrap-prov');
      var provSel  = document.getElementById(prefix+'-loc-prov');
      var provs = BOLIVIA_PROVINCIAS[dept];
      if (provs && provSel) {
        provSel.innerHTML = '<option value="">Seleccionar provincia…</option>';
        provs.forEach(function(p) { provSel.innerHTML += '<option value="'+p+'">'+p+'</option>'; });
        if (wrapProv) wrapProv.style.display = 'block';
      }
    };

    /* Pre-seleccionar Bolivia al cargar */
    var cSel = document.getElementById('edit-loc-country');
    if (cSel && cSel.value === 'Bolivia') { onCountryChange('Bolivia', 'edit'); }

    if (typeof window.initClientDashboard === 'function') {
      window.initClientDashboard();
    } else {
      console.error('initClientDashboard no está definido. Revisa si petcingo.js cargó correctamente.');
    }
  });
