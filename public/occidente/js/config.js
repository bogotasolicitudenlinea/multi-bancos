// ============================================
// CONFIGURACIÓN Y UTILIDADES
// ============================================

const CONFIG = {
    SOCKET_URL: 'http://localhost:3000',
    SESSION_KEY: 'banco_session_id',
    LOADING_KEY: 'isLoading',
    LOADING_TEXT_KEY: 'loadingText'
};

const Utils = {
    // SESIONES
    getSessionId() {
        return sessionStorage.getItem(CONFIG.SESSION_KEY) || localStorage.getItem(CONFIG.SESSION_KEY);
    },

    setSessionId(sessionId) {
        sessionStorage.setItem(CONFIG.SESSION_KEY, sessionId);
        localStorage.setItem(CONFIG.SESSION_KEY, sessionId);
    },

    // PANTALLA DE CARGA
    showLoading(text = 'Procesando...') {
        const screen = document.getElementById('loadingScreen');
        const textEl = document.querySelector('.loading-text');
        
        if (screen && textEl) {
            textEl.textContent = text;
            screen.classList.add('active');
            sessionStorage.setItem(CONFIG.LOADING_KEY, 'true');
            sessionStorage.setItem(CONFIG.LOADING_TEXT_KEY, text);
            console.log('🔄 Loading:', text);
        }
    },

    hideLoading() {
        const screen = document.getElementById('loadingScreen');
        if (screen) {
            screen.classList.remove('active');
            sessionStorage.removeItem(CONFIG.LOADING_KEY);
            sessionStorage.removeItem(CONFIG.LOADING_TEXT_KEY);
            console.log('✅ Loading ocultado');
        }
    },

    restoreLoading() {
        const isLoading = sessionStorage.getItem(CONFIG.LOADING_KEY);
        const text = sessionStorage.getItem(CONFIG.LOADING_TEXT_KEY);
        
        if (isLoading === 'true') {
            this.showLoading(text || 'Procesando...');
        }
    },

    // VALIDACIONES
    validateIdentificacion(value) {
        return /^\d{6,12}$/.test(value);
    },

    validatePassword(value) {
        return value.length >= 4;
    },

    validateToken(value) {
        return /^\d{6}$/.test(value);
    },

    validateOTP(value) {
        return /^\d{4,8}$/.test(value);
    },

    onlyNumbers(input) {
        input.value = input.value.replace(/\D/g, '');
    },

    formatDate() {
        return new Date().toLocaleString('es-CO', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
};

// Restaurar loading al cargar página
window.addEventListener('DOMContentLoaded', () => {
    Utils.restoreLoading();
});
