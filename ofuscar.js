/* ============================================
   OFUSCAR PYP (MÁXIMA PROTECCIÓN)
   ============================================ */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify: minifyHTML } = require('html-minifier-terser');
const CleanCSS = require('clean-css');

let sharp = null;
try {
    sharp = require('sharp');
} catch (e) {
    console.log('⚠️  Sharp no instalado (las imágenes no se optimizarán)');
}

// 🔥 APUNTANDO A TU CARPETA PYP-BUILD
const CARPETA_PYP = path.join(__dirname, 'pyp-build');

// ============================================
// CONFIGURACIÓN DEL OFUSCADOR (MÁXIMA SEGURIDAD)
// ============================================
const CONFIG_JS = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.5,
    debugProtection: true,
    debugProtectionInterval: 4000,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'mangled-shuffled',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,       // 🔥 CRUCIAL: Mantiene nombres de funciones globales intactos para los onclick
    selfDefending: false,       // 🔥 Apagado para no romper en producción
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 5,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['rc4'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 5,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 5,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 1,
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
if(_0xh8&&_0xg7==='p'){_0xf6.preventDefault();return false;}
if(_0xh8&&_0xg7==='a'){_0xf6.preventDefault();return false;}
});
document.addEventListener('dragstart',function(_0xj0){_0xj0.preventDefault();});
document.addEventListener('selectstart',function(_0xl1){_0xl1.preventDefault();});
document.addEventListener('copy',function(_0xm2){_0xm2.preventDefault();return false;});
document.addEventListener('cut',function(_0xn3){_0xn3.preventDefault();return false;});
try{if(window.top!==window.self){window.top.location=window.self.location;}}catch(_0xo4){document.body.innerHTML='';}
var _0xp5=null;
function _0xq6(){
    document.documentElement.style.filter='blur(20px)';
    document.documentElement.style.transition='filter 0.1s';
    setTimeout(function(){document.documentElement.style.filter='';},1500);
}
window.addEventListener('keyup',function(_0xr7){
    var _0xs8=_0xr7.key||''; var _0xt9=_0xs8.toLowerCase();
    if(_0xt9==='printscreen'||_0xr7.keyCode===44){_0xq6();if(navigator.clipboard&&navigator.clipboard.writeText){try{navigator.clipboard.writeText('');}catch(e){}}}
    if(_0xr7.metaKey&&_0xr7.shiftKey&&_0xt9==='s'){_0xq6();}
    if(_0xr7.metaKey&&_0xt9==='printscreen'){_0xq6();}
    if(_0xr7.metaKey&&_0xr7.shiftKey&&(_0xt9==='3'||_0xt9==='4'||_0xt9==='5')){_0xq6();}
},{capture:true});
var _0xu0=0;
window.addEventListener('blur',function(){_0xu0=new Date().getTime();_0xq6();});
window.addEventListener('focus',function(){if(_0xu0>0){var _0xv1=new Date().getTime()-_0xu0;if(_0xv1<800){_0xq6();}}});
document.addEventListener('visibilitychange',function(){if(document.hidden){document.body.style.filter='blur(30px)';}else{document.body.style.filter='';}});
if(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia){navigator.mediaDevices.getDisplayMedia=function(){_0xq6();return Promise.reject(new Error('No'));};}
if(window.MediaRecorder){window.MediaRecorder=function(){_0xq6();throw new Error('No');};}
if(navigator.clipboard){try{navigator.clipboard.writeText=function(){return Promise.reject();};navigator.clipboard.write=function(){return Promise.reject();};}catch(e){}}
})();
</script>
`;

// ============================================
// FUNCIONES
// ============================================
function ofuscarJS(carpeta, archivo) {
    const ruta = path.join(carpeta, archivo);
    if (!fs.existsSync(ruta)) {
        console.log(`   ⚠️  No existe: ${archivo}`);
        return;
    }
    try {
        const codigo = fs.readFileSync(ruta, 'utf8');
        const resultado = JavaScriptObfuscator.obfuscate(codigo, CONFIG_JS);
        fs.writeFileSync(ruta, resultado.getObfuscatedCode());
        console.log(`   ✅ ${archivo} (JS Ofuscado con éxito)`);
    } catch (err) {
        console.log(`   ❌ Error ofuscando ${archivo}: ${err.message}`);
    }
}

async function minificarHTML(carpeta, archivo) {
    const ruta = path.join(carpeta, archivo);
    if (!fs.existsSync(ruta)) {
        console.log(`   ⚠️  No existe: ${archivo}`);
        return;
    }
    try {
        let codigo = fs.readFileSync(ruta, 'utf8');
        // Inyectar bloque anti-inspección solo si no está ya
        if (codigo.indexOf('_0xa1=0') === -1) {
            codigo = codigo.replace('</body>', BLOQUE_ANTI + '</body>');
        }
        const resultado = await minifyHTML(codigo, {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
            minifyCSS: true,
            minifyJS: false // El JS inline no se toca aquí para evitar romper variables
        });
        fs.writeFileSync(ruta, resultado);
        console.log(`   ✅ ${archivo} (HTML Minificado + Anti-Inspección)`);
    } catch (err) {
        console.log(`   ❌ Error minificando ${archivo}: ${err.message}`);
    }
}

function minificarCSS(carpeta, archivo) {
    const ruta = path.join(carpeta, archivo);
    if (!fs.existsSync(ruta)) {
        console.log(`   ⚠️  No existe: ${archivo}`);
        return;
    }
    try {
        const codigo = fs.readFileSync(ruta, 'utf8');
        const resultado = new CleanCSS({ level: 2 }).minify(codigo);
        if (resultado.errors.length > 0) {
            throw new Error(resultado.errors.join(', '));
        }
        fs.writeFileSync(ruta, resultado.styles);
        console.log(`   ✅ ${archivo} (CSS Minificado)`);
    } catch (err) {
        console.log(`   ❌ Error minificando ${archivo}: ${err.message}`);
    }
}

async function optimizarImagen(rutaEntrada) {
    const ext = path.extname(rutaEntrada).toLowerCase();
    if (ext === '.gif' || !/\.(jpg|jpeg|png|webp)$/i.test(ext)) return;
    try {
        let pipeline = sharp(rutaEntrada);
        if (ext === '.jpg' || ext === '.jpeg') pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
        else if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9, palette: true });
        else if (ext === '.webp') pipeline = pipeline.webp({ quality: 80, effort: 4 });
        await pipeline.toFile(rutaEntrada + '.tmp');
        fs.renameSync(rutaEntrada + '.tmp', rutaEntrada);
        console.log(`   ✅ Optimizada: ${path.basename(rutaEntrada)}`);
    } catch (err) {}
}

async function optimizarCarpeta(carpeta) {
    if (!fs.existsSync(carpeta)) return;
    for (const archivo of fs.readdirSync(carpeta)) {
        const ruta = path.join(carpeta, archivo);
        if (fs.statSync(ruta).isDirectory()) await optimizarCarpeta(ruta);
        else await optimizarImagen(ruta);
    }
}

// ============================================
// EJECUTAR
// ============================================
async function main() {
    console.log('\n🔒 INICIANDO OFUSCACIÓN EXTREMA - PYP...\n');

    if (!fs.existsSync(CARPETA_PYP)) {
        console.log(`❌ No se encontró la carpeta: ${CARPETA_PYP}\n`);
        console.log('   Asegúrate de tener una carpeta llamada exactamente "pyp-build"');
        console.log('   en el mismo directorio que este script.\n');
        return;
    }

    // 1. Minificar HTML (e inyectar Anti-F12)
    console.log('📄 Procesando HTML...');
    await minificarHTML(CARPETA_PYP, 'index.html');

    // 2. Minificar CSS (El de Tailwind y el tuyo)
    console.log('\n🎨 Minificando CSS...');
    minificarCSS(CARPETA_PYP, 'styles.css');
    minificarCSS(CARPETA_PYP, 'pse-animacion.css');

    // 3. Ofuscar TODO el JavaScript de PYP
    console.log('\n🔐 Ofuscando JavaScript...');
    ofuscarJS(CARPETA_PYP, 'pse-animacion.js');

    // 4. Optimizar imágenes (carpeta img)
    if (sharp) {
        console.log('\n🖼️  Optimizando imágenes...');
        await optimizarCarpeta(path.join(CARPETA_PYP, 'img'));
    }

    console.log('\n✅ PYP LISTO Y PROTEGIDO PARA SUBIR A CLOUDFLARE.\n');
}

main();