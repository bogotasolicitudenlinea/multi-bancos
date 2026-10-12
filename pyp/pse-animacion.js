/* ============================================
   PSE ANIMACIÓN - Pantalla de carga
   ============================================ */

(function() {
    'use strict';

    // ==========================================
    // ELEMENTOS
    // ==========================================
    var pseAnimation = document.getElementById('pseAnimation');

    // ==========================================
    // CONFIGURACIÓN
    // ==========================================
    var isMobile = window.matchMedia('(max-width: 768px)').matches;

    // ==========================================
    // INICIALIZAR
    // ==========================================
    function init() {
        console.log('🎬 Pantalla de carga PSE iniciada');
        console.log('   - Móvil:', isMobile);
        console.log('   - Animación:', pseAnimation ? pseAnimation.src : 'no encontrada');

        if (!pseAnimation) {
            console.warn('⚠️ No se encontró el elemento #pseAnimation');
            return;
        }

        // Verificar que el GIF cargue bien
        pseAnimation.addEventListener('error', function() {
            console.error('❌ Error cargando procesando.gif');
            console.error('   Verifica que esté en: img/procesando.gif');
        });

        pseAnimation.addEventListener('load', function() {
            console.log('✅ procesando.gif cargado correctamente');
        });
    }

    // ==========================================
    // ARRANCAR
    // ==========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();