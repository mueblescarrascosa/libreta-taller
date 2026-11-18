// 1.32: hojas de pedido (cascos y frentes), alturas propias de cada cocina, electrodomésticos que se rellenan solos y
// con color, puntuación de la cocina (en la ficha y, si se elige, en el resumen), y plegar «Islas y penínsulas» ya no
// esconde Acabados, Electrodomésticos ni Material.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva, AJUSTES_FABRICA } from '../docs/js/modelo.js';
import { moduloNuevo, sincronizarElectros, textoElectro } from '../docs/js/modulos.js';
import { alturasCocina, fijarCocinaTipo, ALTURAS } from '../docs/js/alzado.js';
import { pedidoCascos, pedidoFrentes, textoPedidoCascos, textoPedidoFrentes } from '../docs/js/pedido.js';
import { puntuarCocina } from '../docs/js/puntuacion.js';
import { textoResumen } from '../docs/js/resumen.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const mod = (tipo, ancho, x) => Object.assign(moduloNuevo(tipo), { ancho }, x || {});
const cocina = paredes => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = paredes; return f; };
const pared = (letra, largo, x) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, x);
const tipica = () => cocina([pared('A', 3600, { bajos: [mod('columna_frigo', 600), mod('placa', 900), mod('cajonero', 600), mod('lavavajillas', 600), mod('fregadero', 800)], altos: [mod('alto', 600), mod('alto_campana', 900), mod('alto', 600), mod('alto', 600), mod('alto', 800)] })]);

prueba('alturas: las de Ajustes y, encima, las de la cocina', () => {
  igual(alturasCocina({}, AJUSTES_FABRICA), AJUSTES_FABRICA.cocina_tipo);
  const ct = alturasCocina({ alturas: { mueble: 800, zocalo: 100 } }, AJUSTES_FABRICA);
  igual([ct.mueble, ct.zocalo, ct.grueso], [800, 100, AJUSTES_FABRICA.cocina_tipo.grueso]);
  fijarCocinaTipo(ct); igual(ALTURAS.encimera, 100 + 800 + AJUSTES_FABRICA.cocina_tipo.grueso);
  fijarCocinaTipo(AJUSTES_FABRICA.cocina_tipo);
});

prueba('hoja de pedido de cascos: juntos los iguales, con su alto × ancho × fondo', () => {
  fijarCocinaTipo(AJUSTES_FABRICA.cocina_tipo);
  const f = tipica(), c = pedidoCascos(f.datos);
  const altos = c.filter(x => x.grupo === 'Altos' && x.ancho === 600);
  igual(altos.length, 1); igual(altos[0].cant, 3, 'los tres altos de 600 en una fila');
  afirma(!c.some(x => /Lavavajillas/i.test(x.mueble)), 'el lavavajillas no lleva casco');
  afirma(c.some(x => x.grupo === 'Columnas'), 'la columna del frigo');
  afirma(/Pedido de cascos/.test(textoPedidoCascos(f.datos, 'Blanco')), textoPedidoCascos(f.datos, 'Blanco'));
});

prueba('hoja de pedido de frentes: por acabado (bitono: altos y bajos aparte)', () => {
  const f = tipica();
  f.datos.acabados = { bitono: true, modelo_altos: 'Lisa', color_altos: 'Blanco', modelo_bajos: 'Ranurada', color_bajos: 'Roble' };
  const fr = pedidoFrentes(f.datos);
  afirma(fr.some(x => x.acabado === 'Lisa Blanco') && fr.some(x => x.acabado === 'Ranurada Roble'), JSON.stringify(fr.map(x => x.acabado)));
  afirma(fr.some(x => x.pieza === 'Cajón'), 'el cajonero da cajones');
  afirma(fr.some(x => /lavavajillas/i.test(x.pieza)), 'frente del lavavajillas integrable');
  afirma(/Total: \d+ piezas/.test(textoPedidoFrentes(f.datos)));
});

prueba('electrodomésticos: se ponen solos con los muebles, lo tocado a mano manda', () => {
  const f = tipica(), d = f.datos;
  afirma(sincronizarElectros(d), 'cambia');
  const claves = d.electro.map(e => e.clave).sort();
  igual(claves, ['campana', 'frigo', 'lavavajillas', 'placa'].sort());
  igual(d.electro.find(e => e.clave === 'campana').tipo, 'extraible', 'con alto campana, la campana va dentro');
  // Columna de horno y micro: aparecen los dos; si se quita, se van (no tenían modelo)
  d.paredes[0].bajos.push(mod('columna_hmo', 600)); sincronizarElectros(d);
  afirma(d.electro.some(e => e.clave === 'horno') && d.electro.some(e => e.clave === 'microondas'));
  d.paredes[0].bajos.pop(); sincronizarElectros(d);
  afirma(!d.electro.some(e => e.clave === 'horno'), 'se quita el horno puesto solo');
  // Lo tocado a mano no se cambia ni se quita
  const lv = d.electro.find(e => e.clave === 'lavavajillas'); lv.auto = false; lv.ancho = 450; sincronizarElectros(d);
  igual(lv.ancho, 450);
  lv.color = 'negro'; afirma(/negro/.test(textoElectro(lv)), textoElectro(lv));
  igual(sincronizarElectros(d), false, 'sin cambios, no hace nada');
});

prueba('puntuación: almacenaje, usabilidad y total', () => {
  const f = tipica(), p = puntuarCocina(f);
  afirma(p && p.total >= 0 && p.total <= 100, JSON.stringify(p));
  igual(p.total, Math.round((p.almacenaje.nota + p.usabilidad.nota) / 2));
  // Más cajones y una despensa: más almacenaje
  const g = cocina([pared('A', 3600, { bajos: [mod('despensero', 600), mod('placa', 900), mod('cajonero', 600), mod('lavavajillas', 600), mod('fregadero', 800)], altos: f.datos.paredes[0].altos })]);
  afirma(puntuarCocina(g).almacenaje.nota > p.almacenaje.nota, 'la despensa sube el almacenaje');
  igual(puntuarCocina(cocina([])), null, 'sin muebles, sin nota');
  // En el resumen solo si se pide
  const t0 = textoResumen({ ficha: f, trabajo: null, ajustes: AJUSTES_FABRICA }), t1 = textoResumen({ ficha: f, trabajo: null, ajustes: AJUSTES_FABRICA, conPuntuacion: true });
  afirma(!/Puntuación de la cocina/.test(t0) && /Puntuación de la cocina: \d+\/100/.test(t1), t1);
});

const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };

prueba('ficha: plegar «Islas y penínsulas» no esconde Acabados; alturas; electro solo; puntuación; hojas de pedido', con(async a => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  const A = '[data-pared="A"] ', abierto = A + '[data-fila="bajos"] [data-modulo].abierto ';
  await a.page.fill(A + '> .fila-largo > [data-c="largo"] input', '3');
  await a.page.click('[data-acc="anadir-isla"]');
  // Plegar el apartado de islas tocando su título
  await a.page.locator('h2', { hasText: 'Islas y penínsulas' }).click();
  await a.page.waitForTimeout(200);
  afirma(await a.page.isVisible('[data-acc="plegable-acabados"]'), 'Acabados sigue a la vista con las islas plegadas');
  afirma(await a.page.isVisible('[data-acc="plegable-electro"]'), 'y Electrodomésticos');
  await a.page.locator('h2', { hasText: 'Islas y penínsulas' }).click();
  // Muebles: placa y frigo → electrodomésticos solos
  await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="placa"]'); await a.page.click(abierto + '[data-acc="rapido"][data-v="900"]');
  await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="columna_frigo"]'); await a.page.click(abierto + '[data-acc="rapido"][data-v="600"]');
  await a.page.click('[data-acc="abrir-electro"]');
  await a.page.waitForSelector('[data-electro="placa"]'); await a.page.waitForSelector('[data-electro="frigo"]');
  await a.page.click('[data-electro="placa"] [data-acc="electro-color"][data-v="negro"]');
  // Alturas propias en Acabados
  await a.page.click('[data-acc="abrir-acabados"]');
  await a.page.fill('[data-c="altura-mueble"] input', '80'); await a.page.dispatchEvent('[data-c="altura-mueble"] input', 'change');
  await a.page.waitForFunction(() => /Encimera a 99/.test(document.querySelector('[data-acc="alturas-info"]')?.textContent || ''));
  // Puntuación en la tarjeta de consejos
  await a.page.waitForSelector('[data-acc="puntuacion"]');
  afirma(/Puntuación: \d+\/100/.test(await a.page.innerText('[data-acc="puntuacion"]')));
  // Resumen: interruptor de la puntuación y hojas de pedido
  await a.page.click('[data-acc="terminar"]'); await a.page.waitForSelector('[data-pantalla="resumen"]');
  await a.page.waitForSelector('[data-acc="parte-resumen"][data-v="puntuacion"]');
  afirma(/Puntuación de la cocina/.test(await a.page.innerText('.resumen-doc')), 'va en el resumen');
  await a.page.click('[data-acc="parte-resumen"][data-v="puntuacion"]'); await a.page.waitForTimeout(300);
  afirma(!/Puntuación de la cocina/.test(await a.page.innerText('.resumen-doc')), 'y se puede quitar');
  await a.page.click('[data-acc="parte-resumen"][data-v="puntuacion"]');
  await a.page.click('[data-acc="pedido-cascos"]'); await a.page.waitForSelector('.pedido-doc .tabla-pedido');
  afirma(/Pedido de cascos/.test(await a.page.innerText('.pedido-doc')));
  await a.page.goBack(); await a.page.waitForSelector('[data-acc="pedido-frentes"]');
  await a.page.click('[data-acc="pedido-frentes"]'); await a.page.waitForSelector('.pedido-doc');
  afirma(/Pedido de frentes/.test(await a.page.innerText('.pedido-doc')));
}));

await fin();
