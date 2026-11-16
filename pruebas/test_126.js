// 1.26: consejos para armarios, Ajustes en pestañas, índice y números seguidos en la guía, y textos más claros
// («por subir», botones del resumen).
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva } from '../docs/js/modelo.js';
import { consejosDiseno } from '../docs/js/consejos.js';
import { abrir, entrar } from './arnes.js';

prueba('armario: fondo para colgar, barra larga y puertas u hojas demasiado anchas', () => {
  const c = fichaNueva('armario', 'corredera', 't'), t = f => consejosDiseno(f).map(x => x.texto);
  Object.assign(c.datos, { ancho_medio: 2400, fondo: 600, hojas: 2, cuerpos: [{ id: 'a', ancho: 1200, interior: 'barra' }] });
  igual(t(c), ['Con 60 cm de fondo y puertas correderas la percha no cabe de frente', 'Cuerpo 1: barra de 120 cm sin apoyo', 'Hojas correderas de unos 120 cm']);
  Object.assign(c.datos, { fondo: 650, hojas: 3, cuerpos: [{ id: 'a', ancho: 900, interior: 'barra' }] });
  igual(t(c), [], 'con 65 de fondo y tres hojas, bien');
  const b = fichaNueva('armario', 'abatible', 't');
  Object.assign(b.datos, { ancho_medio: 1500, fondo: 500, puertas: 2, cuerpos: [{ id: 'x', ancho: 700, interior: 'cajonera' }] });
  igual(t(b), ['Puertas de unos 75 cm de ancho'], 'sin barra, el fondo no avisa; dos puertas para 150, sí');
  igual(consejosDiseno(b)[0].grupo, 'armario');
});

prueba('campana piramidal sobre la placa sin alto encima y alto abierto sin puerta', async () => {
  const { paredNueva } = await import('../docs/js/modelo.js');
  const { moduloNuevo, TIPOS_MODULO } = await import('../docs/js/modulos.js');
  const { campanasPared, geometriaAlzado } = await import('../docs/js/alzado.js');
  const { frenteModulo } = await import('../docs/js/frentes.js');
  const { articulo } = await import('../docs/js/presupuesto.js');
  const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
  const f = fichaNueva('cocina', null, 't'), A = Object.assign(paredNueva([]), { letra: 'A', largo: 3000, elementos: [],
    bajos: [mod('bajo', 600), mod('placa', 800), mod('fregadero', 800)], altos: [mod('alto_abierto', 600), mod('hueco', 800), mod('alto', 800)] });
  f.datos.paredes = [A];
  const c = campanasPared(A, f.datos);
  igual(c.map(x => [x.desde, x.hasta, x.ancho]), [[600, 1400, 800]], 'campana del ancho de la placa, centrada');
  const g = geometriaAlzado(f.datos, A);
  afirma(g.piezas.some(p => p.tipo === 'campana' && p.trap), 'la pirámide en el alzado');
  A.altos[1] = mod('alto', 800);
  igual(campanasPared(A, f.datos), [], 'con un alto encima, no');
  A.altos[1] = mod('hueco', 800); f.datos.electro = [{ id: 'e', clave: 'campana', tipo: 'extraible', ancho: 600 }];
  igual(campanasPared(A, f.datos), [], 'extraíble: va en el alto de campana');
  f.datos.electro[0].tipo = 'decorativa';
  igual(campanasPared(A, f.datos)[0].ancho, 600, 'decorativa con su ancho');
  afirma(TIPOS_MODULO.altos.includes('alto_abierto'), 'alto abierto en la lista');
  const fr = frenteModulo('alto_abierto', 600, 1450, 2350);
  afirma(fr.length === 2 && fr.every(q => q.k === 'tablero'), 'sin puertas, dos baldas: ' + JSON.stringify(fr));
  igual(articulo(mod('alto_abierto', 600), f.datos).mo, '2 ESTANTES DECORATIVO');
  // El alto «Campana piramidal»: la campana donde se ponga, sin mueble y sin presupuesto de mueble.
  f.datos.electro = [{ id: 'e', clave: 'campana', tipo: 'extraible', ancho: 600 }];
  A.altos = [mod('alto', 600), mod('campana_deco', 900), mod('alto', 600)];
  igual(campanasPared(A, f.datos).map(x => [x.desde, x.hasta]), [[750, 1350]], 'en el hueco de 90, la campana de 60 de electrodomésticos, centrada');
  f.datos.electro = []; A.altos[1] = mod('campana_deco', 800);
  igual(campanasPared(A, f.datos).map(x => [x.desde, x.hasta, x.ancho]), [[700, 1300, 600]], 'hueco de 80 sin ancho de campana: una de 60');
  A.altos[1] = mod('campana_deco', 900); f.datos.electro = [{ id: 'e', clave: 'campana', tipo: 'extraible', ancho: 600 }];
  const g2 = geometriaAlzado(f.datos, A);
  afirma(g2.piezas.some(p => p.tipo === 'campana' && p.trap) && !g2.piezas.some(p => p.clase === 'alto' && p.tipo === 'campana_deco'), 'pirámide sí, mueble no');
  igual(articulo(mod('campana_deco', 900), f.datos), null);
  // Alto campana: extraíble (visera de acero con tirador) e integrable (solo la ranura) se dibujan distinto.
  const ex = frenteModulo('alto_campana', 600, 1450, 2350, { variante: 'CAMPANA EXTRAÍBLE' }).map(q => q.k), it = frenteModulo('alto_campana', 600, 1450, 2350, { variante: 'CAMPANA INTEGRABLE' }).map(q => q.k);
  afirma(ex.includes('acero') && !ex.includes('campana') && it.includes('campana') && !it.includes('acero'), JSON.stringify({ ex, it }));
  const { varianteAlto } = await import('../docs/js/frentes.js');
  igual([varianteAlto({ tipo: 'alto_campana' }, { electro: [{ clave: 'campana', tipo: 'integrada' }] }), varianteAlto({ tipo: 'alto_campana' }, {}), varianteAlto({ tipo: 'alto_campana', variante: 'CAMPANA INTEGRABLE' }, {})],
    ['CAMPANA INTEGRABLE', 'CAMPANA EXTRAÍBLE', 'CAMPANA INTEGRABLE']);
});

prueba('encimera al presupuesto: tableros de 4,10, colocación, agujeros, juntas y copete; piedra a mano', async () => {
  const { paredNueva } = await import('../docs/js/modelo.js');
  const { moduloNuevo } = await import('../docs/js/modulos.js');
  const { encimeraPresupuesto, tablerosEncimera, paquetePresupuesto } = await import('../docs/js/presupuesto.js');
  igual([tablerosEncimera([{ largo: 1500 }, { largo: 1500 }, { largo: 1500 }]), tablerosEncimera([{ largo: 2500 }, { largo: 2500 }]), tablerosEncimera([{ largo: 5000 }])], [2, 2, 2]);
  const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
  const f = fichaNueva('cocina', null, 't'), A = Object.assign(paredNueva([]), { letra: 'A', largo: 3000, elementos: [], bajos: [mod('bajo', 600), mod('placa', 800), mod('fregadero', 800), mod('bajo', 800)], altos: [] });
  const B = Object.assign(paredNueva([A]), { letra: 'B', largo: 2000, elementos: [], bajos: [mod('bajo', 600), mod('cajonero', 600)], altos: [] });
  f.datos.paredes = [A, B];
  igual(encimeraPresupuesto(f.datos), null, 'sin material: nada');
  f.datos.acabados.encimera = { material: 'Hidrófuga Egger', modelo: '', color: 'F-812', grueso: 40 };
  const e = encimeraPresupuesto(f.datos);
  igual(e.extras.map(x => [x.cat, x.item, x.und]), [['ENCIMERA', 'HIDROFUGA EGGER', 1], ['TRABAJOS ENCIMERA', 'COLOCACIÓN ENCIMERA', 1], ['TRABAJOS ENCIMERA', 'AGUJERO PLACA/FREGADERO', 2],
    ['TRABAJOS ENCIMERA', 'JUNTA DE UNIÓN', 1], ['COPETE', 'A JUEGO CON ENCIMERA EGGER', 4]]);
  const p = paquetePresupuesto(f, null, null);
  const gx = p.grupos.find(g => g.tipo === 'extras');
  afirma(gx && gx.nombre === 'Encimera y zócalo' && !(p.grupos.find(g => g.tipo === 'revisar') || { lineas: [] }).lineas.some(l => /^(Encimera|Zócalo)/.test(l)), 'la encimera y el zócalo van con sus líneas y no a revisar');
  const z = gx.lineas.find(l => l.cat === 'ZÓCALO');
  igual([z.item, z.und], ['ALTO 15', 1], 'zócalo de 15 (cocina tipo 15 + 70 + 4), menos de 4 m: una tira');
  igual(paquetePresupuesto(f, null, { cocina_tipo: { zocalo: 100 } }).grupos.find(g => g.tipo === 'extras').lineas.find(l => l.cat === 'ZÓCALO').item, 'ALTO 10');
  f.datos.acabados.encimera.material = 'Silestone'; f.datos.acabados.encimera.color = 'Calacatta Gold';
  const s = encimeraPresupuesto(f.datos);
  afirma(!s.extras.length && s.libres.length === 1 && /Silestone Calacatta Gold/.test(s.libres[0].texto) && s.libres[0].precio === 0, JSON.stringify(s));
});

prueba('frentes de fabricación propia: puertas y cajones en tableros de 2800×2070', async () => {
  const { paredNueva } = await import('../docs/js/modelo.js'), { moduloNuevo } = await import('../docs/js/modulos.js'), { textoMaterial, empaquetar } = await import('../docs/js/material.js');
  const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
  const f = fichaNueva('cocina', null, 't');
  f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: 3600, elementos: [], bajos: [mod('bajo', 600), mod('cajonero', 600), mod('fregadero', 800), mod('columna_hmo', 600)], altos: [mod('alto', 600), mod('alto', 800)] })];
  const l = textoMaterial(f, 'cm').find(x => /^Frentes/.test(x));
  afirma(/13 piezas, 2,93 m² → 1 tablero de 280×207/.test(l), l);
  igual([empaquetar([{ an: 1500, al: 600, cant: 4 }]).tableros, empaquetar([{ an: 3000, al: 600, cant: 2 }]).partidas], [1, 2]);
  // Vestidor: casco y puertas.
  const v = fichaNueva('armario', 'vestidor', 't');
  v.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: 2800, elementos: [], cuerpos: [{ id: '1', ancho: 1000, interior: 'barra', interior2: 'cajonera', puertas: 'corredera' }, { id: '2', ancho: 800, interior: 'estantes' }, { id: '3', ancho: 1000, interior: 'doble_barra' }] })];
  const lv = textoMaterial(v, 'cm').find(x => /^Tableros de casco/.test(x));
  afirma(/3 tableros de 280×207/.test(lv), lv);
  // Armario de correderas: casco y puertas con las medidas del hueco.
  const c = fichaNueva('armario', 'corredera', 't');
  Object.assign(c.datos, { ancho_medio: 2400, alto_izq: 2500, alto_der: 2505, fondo: 650, rodapie_alto: 80, hojas: 3, cuerpos: [{ id: 'a', ancho: 800, interior: 'barra' }, { id: 'b', ancho: 800, interior: 'estantes' }, { id: 'c', ancho: 800, interior: 'cajonera' }] });
  const lc = textoMaterial(c, 'cm').find(x => /^Tableros de casco/.test(x));
  afirma(/5 tableros de 280×207/.test(lc), lc);
  igual(textoMaterial(fichaNueva('armario', 'abatible', 't'), 'cm').filter(x => /Tableros/.test(x)), [], 'sin medidas, nada');
});

prueba('cascos de cocina y tableros de varias fichas juntas (aprovechan mejor que por separado)', async () => {
  const { paredNueva } = await import('../docs/js/modelo.js'), { moduloNuevo } = await import('../docs/js/modulos.js'), { textoMaterial, tablerosFichas } = await import('../docs/js/material.js');
  const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
  const coc = () => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: 3600, elementos: [], bajos: [mod('columna_hmo', 600), mod('bajo', 600), mod('lavavajillas', 600), mod('fregadero', 800), mod('cajonero', 600)], altos: [mod('alto', 600), mod('alto', 600), mod('alto', 800)] })]; return f; };
  afirma(textoMaterial(coc(), 'cm').some(x => /^Cascos: 37 piezas, 10,93 m² → 3 tableros de 280×207/.test(x)), textoMaterial(coc(), 'cm').join(' | '));
  const t = tablerosFichas([coc(), coc(), coc()]), c = t.find(x => x.clase === 'cascos');
  igual([c.junto.tableros, c.sumaSeparado, c.separado.length], [7, 9, 3], 'tres cocinas: juntas 7 tableros, por separado 9');
  igual(t.map(x => x.clase), ['cascos', 'frentes']);
});

prueba('lavavajillas, lavadora y frigo: integrable con puerta o libre sin puerta (ni frente ni presupuesto)', async () => {
  const { paredNueva } = await import('../docs/js/modelo.js'), { moduloNuevo, instalacionDe } = await import('../docs/js/modulos.js'), { materialCocina } = await import('../docs/js/material.js');
  const { articulo } = await import('../docs/js/presupuesto.js'), { frenteModulo, varianteDe } = await import('../docs/js/frentes.js');
  const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
  const f = fichaNueva('cocina', null, 't'), A = Object.assign(paredNueva([]), { letra: 'A', largo: 3600, elementos: [], bajos: [mod('columna_frigo', 600), mod('lavavajillas', 600), mod('lavadora', 600), mod('bajo', 600)], altos: [] });
  f.datos.paredes = [A];
  const [fr, lv, la] = A.bajos;
  igual([instalacionDe(lv, f.datos), materialCocina(f.datos).frentes.length, articulo(lv, f.datos).mo], [null, 6, 'LAVAVAJILLAS INTEGRABLE'], 'sin contestar: integrable');
  f.datos.electro = [{ id: 'e', clave: 'lavavajillas', tipo: 'libre' }];
  igual(instalacionDe(lv, f.datos), 'libre', 'lo de electrodomésticos vale si el mueble no dice nada');
  [fr, lv, la].forEach(m => { m.instalacion = 'libre'; });
  igual(materialCocina(f.datos).frentes.length, 1, 'libres: solo queda el frente del bajo');
  afirma(/Hueco para lavavajillas libre/.test(articulo(lv, f.datos).revisar) && /Hueco para frigorífico libre/.test(articulo(fr, f.datos).revisar) && /Hueco para lavadora libre/.test(articulo(la, f.datos).revisar), 'huecos sin mueble');
  igual(frenteModulo('lavadora', 600, 100, 800, { variante: varianteDe(la, f.datos) }).map(q => q.k), ['acero', 'electro', 'cristal'], 'se dibuja la lavadora, sin puerta');
  lv.instalacion = 'integrable';
  igual(articulo(lv, f.datos).mo, 'LAVAVAJILLAS INTEGRABLE', 'lo del mueble manda sobre electrodomésticos');
  la.instalacion = 'integrable';
  igual([articulo(la, f.datos).m, articulo(la, f.datos).mo], ['BAJO', 'LAVAVAJILLAS INTEGRABLE'], 'lavadora integrable: su puerta, como el panel del lavavajillas');
});

prueba('campana: tipo y tamaño en el mueble que hace de hueco, y lo que queda a cada lado', async () => {
  const { paredNueva } = await import('../docs/js/modelo.js'), { moduloNuevo } = await import('../docs/js/modulos.js'), { campanasPared, textoHolgurasCampana, geometriaAlzado } = await import('../docs/js/alzado.js');
  const mod = (tipo, ancho, x) => Object.assign(moduloNuevo(tipo), { ancho }, x || {});
  const f = fichaNueva('cocina', null, 't'), A = Object.assign(paredNueva([]), { letra: 'A', largo: 3600, elementos: [], bajos: [mod('bajo', 600), mod('placa', 900), mod('bajo', 600)],
    altos: [mod('alto', 600), mod('campana_deco', 900, { campana_ancho: 600 }), mod('alto', 600)] });
  f.datos.paredes = [A];
  igual(campanasPared(A, f.datos).map(textoHolgurasCampana), ['Campana piramidal de 60 cm en un hueco de 90 cm: quedan 15 cm a la izquierda hasta el mueble y 15 cm a la derecha hasta el mueble.']);
  A.altos[1].campana_tipo = 'recta';
  afirma(!geometriaAlzado(f.datos, A).piezas.some(p => p.trap) && geometriaAlzado(f.datos, A).piezas.filter(p => p.tipo === 'campana').length === 3, 'recta: sin pirámide');
  A.altos = [mod('alto', 600)];
  igual(textoHolgurasCampana(campanasPared(A, f.datos)[0]), 'Campana piramidal de 90 cm encima de la placa: quedan ⚠ 0 cm a la izquierda hasta el mueble y 210 cm a la derecha hasta la pared.');
  const { consejosDiseno } = await import('../docs/js/consejos.js');
  afirma(consejosDiseno(f).some(c => c.texto === 'La campana de la pared A queda a 0 cm del mueble de la izquierda' && /al menos 5 cm/.test(c.porque)), 'avisa del margen: ' + consejosDiseno(f).map(c => c.texto).join(' | '));
  A.altos = [mod('alto', 600), mod('campana_deco', 900, { campana_ancho: 600 })];
  afirma(!consejosDiseno(f).some(c => /campana de la pared/.test(c.texto)), 'con 15 cm a cada lado, bien');
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('ajustes en pestañas e índice de la guía', con(async a => {
  await a.page.click('[data-acc="ajustes"]'); await a.page.waitForSelector('[data-pantalla="ajustes"]');
  const general = await a.page.evaluate(() => ({ on: document.querySelector('[data-acc="pestana"].on').dataset.v, unidad: !!document.querySelector('[data-acc="unidad-pred"]'),
    listas: document.querySelectorAll('[data-lista]').length, copia: !!document.querySelector('[data-acc="copia-seguridad"]') }));
  igual(general, { on: 'general', unidad: true, listas: 0, copia: true }, 'General: lo básico, sin las listas');
  await a.page.click('[data-acc="pestana"][data-v="puertas"]'); await a.page.waitForSelector('[data-acc="pestana"][data-v="puertas"].on');
  const puertas = await a.page.evaluate(() => ({ anchos: !!document.querySelector('[data-lista="puerta_anchos"]'), modulos: !!document.querySelector('[data-lista="modulo_anchos"]'), unidad: !!document.querySelector('[data-acc="unidad-pred"]') }));
  igual(puertas, { anchos: true, modulos: false, unidad: false });
  await a.page.click('[data-acc="pestana"][data-v="todo"]'); await a.page.waitForSelector('[data-acc="pestana"][data-v="todo"].on');
  afirma(await a.page.evaluate(() => !!document.querySelector('[data-lista="modulo_anchos"]') && !!document.querySelector('[data-lista="puerta_anchos"]') && !!document.querySelector('[data-acc="unidad-pred"]')), 'ver todo');
  await a.page.evaluate(() => { location.hash = '#/guia'; }); await a.page.waitForSelector('[data-acc="indice-guia"]');
  const g = await a.page.evaluate(() => ({ titulos: [...document.querySelectorAll('.guia-apartado h2')].map(x => x.textContent), indice: document.querySelectorAll('[data-acc="ir-apartado"]').length }));
  afirma(g.titulos[0] === '1. Reglas de prioridad' && g.titulos.every((t, i) => t.startsWith((i + 1) + '. ')), 'números seguidos: ' + g.titulos.join(' | '));
  igual(g.indice, g.titulos.length, 'un enlace por apartado');
  // Planta: símbolo de la placa con sus fuegos y del fregadero (dos senos en uno de 80).
  const planta = await a.page.evaluate(async () => {
    const { fichaNueva, paredNueva } = await import('./js/modelo.js'), { moduloNuevo } = await import('./js/modulos.js'), { geometriaPlanta, svgPlanta } = await import('./js/plano-vista.js');
    const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
    const f = fichaNueva('cocina', null, 't');
    f.datos.paredes = [Object.assign(paredNueva([]), { letra: 'A', largo: 3000, elementos: [], bajos: [mod('placa', 600), mod('bajo', 600), mod('fregadero', 800)], altos: [] })];
    const svg = svgPlanta(geometriaPlanta(f.datos));
    const pl = svg.querySelector('[data-simbolo="placa"]'), fr = svg.querySelector('[data-simbolo="fregadero"]');
    return { placa: pl ? pl.querySelectorAll('circle').length : -1, senos: fr ? fr.querySelectorAll('polygon').length - 1 : -1, grifo: fr ? fr.querySelectorAll('circle').length : -1, otros: svg.querySelectorAll('[data-simbolo]').length };
  });
  igual(planta, { placa: 4, senos: 2, grifo: 3, otros: 2 }, 'símbolos en la planta');
  // Resumen de todo el trabajo: tableros juntos o por ficha (trabajo de ejemplo: puertas y una cocina).
  await a.page.evaluate(() => { location.hash = '#/'; }); await a.page.waitForSelector('[data-acc="crear-ejemplo"]');
  await a.page.click('[data-acc="crear-ejemplo"]'); await a.page.waitForSelector('[data-pantalla="trabajo"]');
  await a.page.click('[data-acc="resumen-trabajo"]'); await a.page.waitForSelector('[data-acc="tableros-trabajo"]');
  const junto = await a.page.innerText('[data-acc="tableros-trabajo"]');
  await a.page.click('[data-acc="tableros-modo"][data-v="ficha"]'); await a.page.waitForSelector('[data-acc="tableros-modo"][data-v="ficha"].on');
  const ficha = await a.page.innerText('[data-acc="tableros-trabajo"]');
  afirma(/Cascos de cocina: \d+ tableros? de 280×207/.test(junto) && /Cocina: \d+ tableros?/.test(ficha), junto + ' || ' + ficha);
  await a.page.goBack(); await a.page.goBack(); await a.page.goBack();
  await a.page.evaluate(() => { location.hash = '#/guia'; }); await a.page.waitForSelector('[data-apartado="1"]');
  const tipo = await a.page.innerText('[data-apartado="1"]');
  afirma(/Gola en C \(entre cajones\)\s+7,3 cm/.test(tipo) && /Gola vertical \(columnas\)\s+4,7 cm/.test(tipo), 'gola en C y vertical: ' + tipo);
}));

await fin();
