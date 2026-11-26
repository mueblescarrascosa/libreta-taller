// 1.51.0: llevar la cocina a TeoWin (escena .3d con paredes, huecos de ventanas y puertas y muebles del catálogo de
// Cincocina, 19024). Plantillas de mentira (con lo que importa de las de verdad) para no depender de TeoWin.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo } from '../docs/js/modulos.js';
import { fijarCocinaTipo, alturasCocina } from '../docs/js/alzado.js';
import { planTeowin, escenaTeowin, plantillasNecesarias, cadPared, darLaVuelta, muebleDePlantilla, bytesLatin1 } from '../docs/js/teowin.js';
import { nombreEscena } from '../docs/js/pantallas/teowin-ui.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho, extra) => Object.assign(moduloNuevo(tipo), { ancho }, extra || {});
const el = (tipo, distancia, extra) => Object.assign({ id: tipo + distancia, tipo, para: null, nombre: '', distancia, ref: 'izq', altura: 0, ancho: null, alto: null }, extra || {});
// Cocina en U de 3 × 2,5 × 3 (sin plano: en escuadra), con ventana en B y puerta en C
function cocina() {
  const f = fichaNueva('cocina', null, 't'), d = f.datos;
  d.paredes = [['A', 2500], ['B', 3000], ['C', 2500]].map(([letra, largo]) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }));
  d.paredes[1].elementos = [el('ventana', 1000, { ancho: 1000, alto: 1100, altura: 1050 })];
  d.paredes[2].elementos = [el('puerta', 1500, { ancho: 800, alto: 2030 })];
  d.paredes[1].bajos = [mod('rinconero', 1000, { forma: 'recto', gira: 'izq' }), mod('bajo', 450), mod('fregadero', 900), mod('cajonero', 600)];
  d.paredes[1].altos = [mod('alto', 600), mod('alto', 800)];
  d.paredes[0].bajos = [mod('placa', 600), mod('bajo', 400)];
  d.alto_techo = 2500;
  fijarCocinaTipo(alturasCocina(d, null));
  return d;
}
const plantilla = (cod, extra = '') => `//version 12\nobj"${cod}"\n{\n\tIDCatalogo"19024"\n\tfamilia"X"\n\tud 1.00\n\tobjeti"BA"\n\tsimetric abatible notxr \n\tidClaveUnica(7)\n\tidJ(1) idJT"1" maxIdJ(4) \n\tuse L  =600\n\tuse H  =800\n\tuse P  =600\n${extra}\n\tobj"normal"\n\t{\n\t\tidClaveUnica(8)\n\t}\n}\n`;
const leer = (cat, fam, cod) => plantilla(cod);

prueba('plan: paredes seguidas con su giro y muebles mirando hacia dentro', () => {
  const p = planTeowin(cocina());
  igual(p.paredes.map(x => x.letra), ['A', 'B', 'C']);
  // Cada pared empieza donde acaba la anterior y su giro es el de su dirección
  for (let i = 1; i < p.paredes.length; i++) afirma(Math.hypot(p.paredes[i].a.x - p.paredes[i - 1].b.x, p.paredes[i].a.z - p.paredes[i - 1].b.z) < 1, 'pared seguida ' + i);
  p.paredes.forEach(w => { const r = w.ang * Math.PI / 180; afirma(Math.abs(Math.cos(r) - w.u.x) < 1e-6 && Math.abs(-Math.sin(r) - w.u.z) < 1e-6, 'giro de ' + w.letra); });
  // Los muebles de la pared B: su giro es el de la pared B, empiezan sobre ella y van seguidos
  const B = p.paredes[1], deB = p.muebles.filter(m => m.ang === B.ang && m.y === 0 && m.nombre !== 'Regleta' && m.nombre !== 'Costado');
  igual(deB.map(m => m.plantilla[1]), ['RB', 'B1', 'SF2', 'BCCCA']);
  deB.forEach(m => afirma(Math.abs((m.x - B.a.x) * -B.u.z + (m.z - B.a.z) * B.u.x) < 1, 'sobre la pared B: ' + m.nombre));
  for (let i = 1; i < deB.length; i++) { const a = deB[i - 1], b = deB[i]; afirma(Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - a.L) < 1, 'seguidos: ' + a.nombre + ' → ' + b.nombre); }
  // El rinconero recto con la esquina a la izquierda va dado la vuelta
  afirma(deB[0].inv === true, 'rinconero dado la vuelta');
  // Altos a la altura de los altos, de 35 de fondo
  const altos = p.muebles.filter(m => m.plantilla[0] === 'A90S');
  igual(altos.map(m => [m.L, m.P, m.y]), [[600, 350, 1450 + 0], [800, 350, 1450]].map(([L, P]) => [L, P, altos[0].y]));
  igual(p.huecos.map(h => [h.tipo, h.pared, h.s, h.L]), [['ventana', 'B', 1000, 1000], ['puerta', 'C', 1500, 800]]);
});

prueba('plan: el lavavajillas, la lavadora y el frigorífico libre no son muebles: se avisa', () => {
  const d = cocina(); d.paredes[0].bajos.push(mod('lavavajillas', 600));
  const p = planTeowin(d);
  afirma(p.avisos.some(a => /lavavajillas: ponlo a mano/.test(a)), p.avisos.join(' | '));
  afirma(!p.muebles.some(m => m.nombre === 'Lavavajillas'));
});

prueba('plan: el hueco que se sale de la pared va recortado y se avisa', () => {
  const d = cocina(); d.paredes[2].elementos = [el('puerta', 2000, { ancho: 1000, alto: 2030 })];
  const p = planTeowin(d), h = p.huecos.find(x => x.tipo === 'puerta');
  igual([h.s, h.L], [2000, 500]);
  afirma(p.avisos.some(a => /se sale de la pared/.test(a)));
});

prueba('pared: el hueco de la ventana y la muesca de la puerta, con su objeto y la longitud del XML bien', () => {
  const ids = { seccion: 1 };
  const c = cadPared(3000, 2500, [{ tipo: 'ventana', s: 1000, y: 1050, L: 1000, H: 1100, clave: 55 }, { tipo: 'puerta', s: 200, y: 0, L: 800, H: 2030, clave: 56 }], ids);
  const m = c.match(/^CAD"1\/1""(\d+)""(<cad>.*<\/cad>)"$/);
  afirma(m && Number(m[1]) === m[2].length, 'longitud');
  afirma(/<FINESTRA>.*<PORTA_FINESTRA_IDOBJ>55</.test(c) && /<PORTA>.*<PORTA_FINESTRA_IDOBJ>56</.test(c), 'enlazados');
  afirma(/<NSUBSECCIONS>2<\/NSUBSECCIONS>/.test(c), 'dos huecos');
  // La región de la pared: la muesca de la puerta (de 275 a 925, hasta 1955) y la ventana como agujero
  afirma(/<NFORATS>1<\/NFORATS>/.test(c), 'un agujero');
  afirma(c.includes('<POINT><X>275</X><Y>1955</Y></POINT>') && c.includes('<POINT><X>925</X><Y>0</Y></POINT>'), 'muesca');
});

prueba('mueble: la plantilla en su sitio, con sus medidas y claves nuevas; el rinconero dado la vuelta como TeoWin', () => {
  const ids = { clave: 100, escena: 5 };
  const q = muebleDePlantilla(plantilla('B1'), { x: 10, y: 0, z: 20, ang: 90, L: 450, H: 700, P: 600 }, ids);
  const t = q.lineas.join('\n');
  afirma(/\tpos\(10,0,20\)\n\tang\(0,90,0\)\n\tidEscena\(5\)\n\tidClaveUnica\(100\)/.test(t), t);
  afirma(/use L  =450/.test(t) && /use H  =700/.test(t) && /idClaveUnica\(101\)/.test(t) && q.clave === 100);
  const rb = darLaVuelta('obj"RB"\n{\n\tsimetric abatible \n\tuse L  =900\n\t\tobj"abat.d"\n\t\t\tvirtual(DTOPAI,DTOPAINF+HOLZOCINF,P-REBFR)(L-L2,H,GF)\n\t\t\tvirtual(L-L2,0,P-10)(L2,H,GF)\n\t\t\tcamino(R)(0,0)(300,0,600)\tfcamino(L-L2,0,Par)(0)\n}');
  afirma(/file_inv/.test(rb) && /abat\.i/.test(rb) && /virtual\(L2,DTOPAINF/.test(rb) && /virtual\(0,0,P\)\(L2,H,GF\)/.test(rb) && /camino\(R\)\(0,0\)\(600,0,600\)\tfcamino\(L2,0,Par\)/.test(rb), rb);
});

prueba('escena: cabecera con la vista y el zócalo de la ficha, todas las plantillas y bytes en latin1', () => {
  const d = cocina(), lista = plantillasNecesarias(d);
  afirma(lista.some(x => x.cat === '19024' && x.cod === 'RB') && lista.some(x => x.cat === '522' && x.cod === 'PMADERAT5I'), JSON.stringify(lista));
  const { texto, avisos } = escenaTeowin(d, leer);
  afirma(texto.startsWith('//version 12') && /\nmetai s \d{14}LIBRETA\n/.test(texto), 'cabecera');
  afirma(/\tvista {2}\(/.test(texto) && !/@@VISTA@@/.test(texto), 'vista');
  afirma(/globalParam Hz {2}= "150"/.test(texto), 'zócalo');
  igual((texto.match(/^\tobj"#\d"/gm) || []).length, 3, 'tres paredes');
  afirma(/obj"RB"[\s\S]*file_inv/.test(texto), 'rinconero dado la vuelta');
  const ab = texto.split('{').length, ce = texto.split('}').length; igual(ab, ce, 'llaves');
  afirma(!avisos.some(a => /No están en tu catálogo/.test(a)), avisos.join(' | '));
  const b = bytesLatin1('Parámetros €'); igual([b[3], b[11]], [0xe1, 63]);
  // Sin plantilla: se avisa
  afirma(escenaTeowin(d, () => null).avisos.some(a => /No están en tu catálogo de TeoWin/.test(a)));
});

prueba('nombre de la escena: trabajo y ficha, sin lo que Windows no deja', () => {
  igual(nombreEscena({ nombre: 'Cocina La Iruela' }, { nombre: 'Piso 1/2' }), 'Cocina La Iruela Piso 1 2 (Libreta)');
  igual(nombreEscena(null, { nombre: '' }), 'Cocina (Libreta)');
});

// En la app: con una carpeta de TeoWin de mentira, el botón guarda la escena en «Escenas»
prueba('app: guardar la cocina en TeoWin', async () => {
  const a = await abrir({});
  try {
    await entrar(a);
    await a.page.evaluate(() => {
      const archivo = (nombre, texto) => ({ kind: 'file', name: nombre, texto, getFile: async () => new Blob([texto]), createWritable: async function () { const yo = this; const partes = []; return { write: async b => partes.push(b), close: async () => { yo.texto = new TextDecoder('latin1').decode(partes[0]); window.__escena = { nombre: yo.name, texto: yo.texto }; } }; } });
      const dir = (nombre, hijos) => ({ kind: 'directory', name: nombre, hijos,
        getDirectoryHandle: async n => { const x = hijos[n]; if (!x || x.kind !== 'directory') throw new DOMException('no', 'NotFoundError'); return x; },
        getFileHandle: async (n, o) => { let x = hijos[n]; if (!x && o && o.create) x = hijos[n] = archivo(n, ''); if (!x || x.kind !== 'file') throw new DOMException('no', 'NotFoundError'); return x; },
        queryPermission: async () => 'granted', requestPermission: async () => 'granted' });
      const pl = cod => `obj"${cod}"\n{\n\tsimetric \n\tidClaveUnica(1)\n\tuse L  =600\n\tuse H  =800\n\tuse P  =600\n}\n`;
      const fams = { B80S: ['B1', 'B2'], B80F: ['SF', 'SF2'], B80SP: ['SPCCCA', 'BHCA'], '80BCF': ['BCCCA'], B80R: ['RB', 'RBA'], A90S: ['A1', 'A2'], CRE: ['R'], CRENV: ['PLCI'], '220HM': ['CHM'], '225S': ['CD2P', 'CL2P', 'CL1PE'] };
      const cat = dir('Catalogo', Object.fromEntries(Object.entries(fams).map(([f, cs]) => [f, dir(f, Object.fromEntries(cs.map(c => [c + '.3d', archivo(c + '.3d', pl(c))])))])));
      const huecos = dir('Catalogo', { PRACT: dir('PRACT', { '2HPRACTICA-RE.3d': archivo('x', pl('2HPRACTICA-RE')), '1HOJAD-RE.3d': archivo('x', pl('1HOJAD-RE')) }), PMADE: dir('PMADE', { 'PMADERAT5I.3d': archivo('x', pl('PMADERAT5I')) }) });
      const e107 = dir('E_107', { Escenas: dir('Escenas', {}), 19024: dir('19024', { Catalogo: cat }), 522: dir('522', { Catalogo: huecos }) });
      window.showDirectoryPicker = async () => dir('TeoWin', { datos: dir('datos', { '3d': dir('3d', { E_107: e107 }) }) });
    });
    await crearTrabajo(a, 'Casa Prueba'); await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
    await a.page.fill('[data-pared="A"] > .fila-largo > [data-c="largo"] input', '3');
    await a.page.waitForSelector('[data-acc="exportar-teowin"]');
    await a.page.click('[data-acc="exportar-teowin"]');
    await a.page.waitForSelector('[data-acc="teowin-hecho"]');
    const e = await a.page.evaluate(() => window.__escena);
    afirma(e && /^Casa Prueba.*\(Libreta\)\.3d$/.test(e.nombre), JSON.stringify(e && e.nombre));
    afirma(/^\/\/version 12/.test(e.texto) && /obj"#1"/.test(e.texto), 'escena con su pared');
    igual(a.errores, [], 'errores de página');
  } finally { await a.cerrar(); }
});

fin();
