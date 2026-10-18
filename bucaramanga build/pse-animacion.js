/* ============================================
   PSE - Animación
   Reinicia la animación del GIF cuando se muestra la pantalla PSE
   ============================================ */

(function() {
    'use strict';

    var pseAnimation = document.getElementById('pseAnimation');
    var originalSrc = window.__PSE_ORIGINAL_SRC__ || (pseAnimation ? pseAnimation.src : '');

    function reiniciarAnimacion() {
        if (!pseAnimation) {
            console.warn('⚠️ No se encontró el elemento pseAnimation');
            return;
        }

        var srcActual = originalSrc || pseAnimation.src;

        // Vaciar el src para forzar al navegador a recargar el GIF
        pseAnimation.src = '';

        // Restaurarlo después de un pequeño delay
        setTimeout(function() {
            pseAnimation.src = srcActual;
        }, 50);

        console.log('✅ procesando.gif - Animación reiniciada');
    }

    // Escuchar errores de carga del GIF
    if (pseAnimation) {
        pseAnimation.addEventListener('error', function() {
            console.warn('⚠️ Error cargando procesando.gif');
        });

        pseAnimation.addEventListener('load', function() {
            console.log('✅ procesando.gif - Cargado correctamente');
        });
    }

    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', reiniciarAnimacion);
    } else {
        reiniciarAnimacion();
    }

    // Exponer la función para usarla desde otros scripts
    window.__PSE_REINICIAR__ = reiniciarAnimacion;
})();