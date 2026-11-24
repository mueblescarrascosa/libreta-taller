// 1.45.0: la mejor cocina también propone altos en las paredes con bajos que aún no tienen ninguno (antes solo en las
// que ya tenían alguno), y puede llenar la pared libre de una vez; sin tapar ventanas.
import { prueba, afirma, igual, fin } from './mini.js';
import { fichaNueva, paredNueva } from '../docs/js/modelo.js';
import { moduloNuevo, REMATES, situarMuebles } from '../docs/js/modulos.js';
import { mejorCocina, aplicarCambios, puntuarCocina } from '../docs/js/puntuacion.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

REMATES.porDefecto = false;
const mod = (tipo, ancho) => Object.assign(moduloNuevo(tipo), { ancho });
const pared = (letra, largo, x) => Object.assign(paredNueva([]), { letra, largo, elementos: [], bajos: [], altos: [] }, x);
const cocina = paredes => { const f = fichaNueva('cocina', null, 't'); f.datos.paredes = paredes; return f; };

prueba('paredes B y C con bajos y sin altos: se proponen altos', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('placa', 900), mod('fregadero', 800), mod('lavavajillas', 600)], altos: [mod('alto', 900), mod('alto', 800)] }),
    pared('B', 2400, { bajos: [mod('cajonero', 600), mod('bajo', 600), mod('bajo', 600)] }), pared('C', 1800, { bajos: [mod('bajo', 900), mod('bajo', 900)] })]);
  const r = mejorCocina(f), al = l => r.ficha.datos.paredes.find(p => p.letra === l).altos;
  afirma(al('B').length && al('C').length, JSON.stringify(r.cambios));
  igual(f.datos.paredes[1].altos, [], 'la ficha no se toca');
});
prueba('pared sin bajos: no se ponen altos', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('placa', 900), mod('fregadero', 800)], altos: [mod('alto', 900)] }), pared('B', 2400)]);
  igual(mejorCocina(f).ficha.datos.paredes[1].altos, []);
});
prueba('pared con una ventana: los altos que se proponen no la tapan', () => {
  const v = { id: 'v', tipo: 'ventana', para: null, nombre: '', distancia: 600, ref: 'izq', altura: 1000, ancho: 1200, alto: 1200 };
  const f = cocina([pared('A', 3000, { bajos: [mod('placa', 900), mod('fregadero', 800)], altos: [mod('alto', 900)] }),
    pared('B', 2400, { elementos: [v], bajos: [mod('bajo', 600), mod('bajo', 600), mod('bajo', 600), mod('bajo', 600)] })]);
  const r = mejorCocina(f), pB = r.ficha.datos.paredes[1];
  situarMuebles(pB, r.ficha.datos).altos.filter(a => a.m.tipo !== 'hueco').forEach(a => afirma(a.hasta <= 600 || a.desde >= 1800, 'tapa la ventana: ' + a.desde + '-' + a.hasta + ' ' + JSON.stringify(r.cambios)));
});
prueba('pared con la placa y su campana: altos del ancho de los bajos y ninguno encima de la campana ni de sus márgenes', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('fregadero', 800), mod('lavavajillas', 600), mod('bajo', 600)], altos: [mod('alto', 800), mod('alto', 600)] }),
    pared('B', 3040, { bajos: [mod('cajonero', 600), mod('bajo', 800), mod('placa', 900), mod('bajo', 600)] })]);
  const r = mejorCocina(f), pB = r.ficha.datos.paredes[1], s = situarMuebles(pB, r.ficha.datos);
  const pl = s.bajos.find(b => b.m.tipo === 'placa'), cx = (pl.desde + pl.hasta) / 2, z = [cx - 300 - 100, cx + 300 + 100];
  const altos = s.altos.filter(a => a.m.tipo === 'alto');
  afirma(altos.length >= 2, JSON.stringify(r.cambios));
  altos.forEach(a => afirma(a.hasta <= z[0] + 1 || a.desde >= z[1] - 1, 'encima de la campana: ' + a.desde + '-' + a.hasta + ' ' + JSON.stringify(r.cambios)));
  afirma(altos.every(a => a.hasta <= 3040), 'fuera de la pared');
  // Simétricos: el del cajonero y el del bajo de 80, de su ancho y encima de ellos
  const sobre = b => altos.find(a => Math.abs(a.desde - b.desde) <= 60);
  igual(sobre(s.bajos[0]) && sobre(s.bajos[0]).m.ancho, 600, JSON.stringify(r.cambios));
  igual(sobre(s.bajos[1]) && sobre(s.bajos[1]).m.ancho, 800, JSON.stringify(r.cambios));
});
prueba('elegir los cambios: todos dan la misma cocina; quitando uno, ese no se hace', () => {
  const f = cocina([pared('A', 3000, { bajos: [mod('placa', 900), mod('fregadero', 800), mod('bajo', 600)], altos: [mod('alto', 900)] }),
    pared('B', 2400, { bajos: [mod('bajo', 600), mod('bajo', 600), mod('bajo', 600)] })]);
  const r = mejorCocina(f);
  afirma(r.pasos.length >= 2, JSON.stringify(r.cambios));
  igual(aplicarCambios(f, r.pasos.map(x => x.op)).datos.paredes, r.ficha.datos.paredes);
  const sinB = r.pasos.filter(x => !(x.op.op === 'altos' && x.op.pared === f.datos.paredes[1].id));
  igual(aplicarCambios(f, sinB.map(x => x.op)).datos.paredes[1].altos, [], 'sin los altos de B');
  igual(aplicarCambios(f, []).datos.paredes, f.datos.paredes, 'nada marcado: igual');
});
const con = fn => async () => { const a = await abrir({}); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
prueba('app: se desmarca un cambio y solo se aplican los marcados', con(async a => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  const A = '[data-pared="A"] ', ab = A + '[data-fila="bajos"] [data-modulo].abierto ';
  await a.page.fill(A + '> .fila-largo > [data-c="largo"] input', '3');
  for (const [t, w] of [['bajo', '600'], ['bajo', '600'], ['fregadero', '800']]) { await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="' + t + '"]'); await a.page.click(ab + '[data-acc="rapido"][data-v="' + w + '"]'); }
  await a.page.click('[data-acc="buscar-mejor"]');
  await a.page.waitForSelector('[data-acc="cambio-mejor"]');
  const n = (await a.page.$$('[data-acc="cambio-mejor"]')).length;
  afirma(n >= 2, 'cambios: ' + n);
  const textos = await a.page.$$eval('.cambios-mejor li', l => l.map(x => x.innerText.trim()));
  await a.page.uncheck('[data-acc="cambio-mejor"][data-v="0"]');
  afirma(/Con lo marcado/.test(await a.page.innerText('[data-acc="nota-marcados"]')));
  for (let i = 0; i < n; i++) await a.page.uncheck('[data-acc="cambio-mejor"][data-v="' + i + '"]');
  afirma(await a.page.$eval('[data-acc="aplicar-mejor"]', b => b.disabled), 'sin nada marcado no se aplica');
  await a.page.check('[data-acc="cambio-mejor"][data-v="1"]');
  await a.page.click('[data-acc="aplicar-mejor"]');
  await a.page.waitForFunction(() => !document.querySelector('[data-acc="cambio-mejor"]'));
  afirma(textos.length === n, JSON.stringify(textos));
}));
fin();
