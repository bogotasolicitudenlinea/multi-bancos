/* ============================================
   OFUSCAR VANTI (MÁXIMA PROTECCIÓN)
   ============================================ */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify: minifyHTML } = require('html-minifier-terser');

let sharp = null;
try {
    sharp = require('sharp');
} catch (e) {
    console.log('⚠️  Sharp no instalado');
}

const CARPETA_VANTI = path.join(__dirname, 'vanti build');

// ============================================
// CONFIGURACIÓN DEL OFUSCADOR (MÁXIMA SEGURIDAD SIN ROMPER)
// ============================================
const CONFIG_JS = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1, // Máximo
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.5,   // Inyecta mucho código basura
    debugProtection: true,             // Bloquea el depurador
    debugProtectionInterval: 4000,     
    disableConsoleOutput: true,
    identifierNamesGenerator: 'mangled-shuffled', 
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,              // 🔥 CRUCIAL: Lo dejamos en false para que el HTML encuentre las funciones
    selfDefending: false,              // 🔥 Lo apagamos para que no se autodestruya en local
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 5,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['rc4'],      // Cifrado fuerte para strings
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
        console.log(`   ✅ ${archivo} (Ofuscado con éxito)`);
    } catch (err) {
        console.log(`   ❌ Error en ${archivo}: ${err.message}`);
    }
}

async function minificarHTML(carpeta, archivo) {
    const ruta = path.join(carpeta, archivo);
    if (!fs.existsSync(ruta)) return;
    try {
        let codigo = fs.readFileSync(ruta, 'utf8');
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
            minifyJS: false 
        });
        fs.writeFileSync(ruta, resultado);
        console.log(`   ✅ ${archivo} (Minificado + Anti-Inspección)`);
    } catch (err) {
        console.log(`   ❌ Error en ${archivo}: ${err.message}`);
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
    console.log('\n🔒 INICIANDO OFUSCACIÓN EXTREMA - VANTI...\n');

    // Verificar que la carpeta exista
    if (!fs.existsSync(CARPETA_VANTI)) {
        console.log(`❌ No se encontró la carpeta: ${CARPETA_VANTI}\n`);
        console.log('   Asegúrate de tener una carpeta llamada exactamente "vanti build"');
        console.log('   en el mismo directorio que este script.\n');
        return;
    }

    // 1. Minificar HTML y meterle el Anti-F12
    await minificarHTML(CARPETA_VANTI, 'index.html');

    // Si tu build de Vanti tiene más HTMLs, descomenta los que necesites:
    // await minificarHTML(CARPETA_VANTI, 'consultadesubsidio.html');
    // await minificarHTML(CARPETA_VANTI, 'pagodesubsidio.html');

    // 2. Ofuscar TODO el JavaScript de Vanti
    ofuscarJS(CARPETA_VANTI, 'app.js');
    // ofuscarJS(CARPETA_VANTI, 'pse-animacion.js'); // ← descomenta si lo tienes
    // ofuscarJS(CARPETA_VANTI, 'main.js');          // ← descomenta si lo tienes

    // 3. Optimizar imágenes (carpetas img, bancos y assets si existen)
    if (sharp) {
        await optimizarCarpeta(path.join(CARPETA_VANTI, 'img'));
        await optimizarCarpeta(path.join(CARPETA_VANTI, 'bancos'));
        await optimizarCarpeta(path.join(CARPETA_VANTI, 'assets'));
    }

    console.log('\n✅ VANTI LISTO Y PROTEGIDO.\n');
}

main();