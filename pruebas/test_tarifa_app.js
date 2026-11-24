// 1.43.0: «Calcular con la tarifa» en el coste estimado: Presupuestos (aquí, uno de mentira en /cocinas/) contesta con
// los totales; el recargo del mueble va en el paquete; error si no contesta bien.
import { prueba, afirma, igual, fin } from './mini.js';
import { abrir, entrar, crearTrabajo } from './arnes.js';

const con = (op, fn) => async () => { const a = await abrir(op); try { await entrar(a); await fn(a); igual(a.errores, [], 'errores de página'); } finally { await a.cerrar(); } };
// Presupuestos de mentira: dice que está lista y contesta con un resultado fijo (o con error), y guarda lo recibido.
const falso = ok => '<!doctype html><script>addEventListener("message", ev => { if (ev.data.tipo !== "libreta-estimar") return; window.parent.__recibido = ev.data.paquete;'
  + 'var g0 = ev.data.paquete.grupos[0], cal = g0 && g0.cal; (window.parent.__cals = window.parent.__cals || []).push(cal || "");'
  + 'var tot = { "DM-LACA MEDIO": 900, "ALTO GAMA": 1200.4 }[cal] || 652.3;'
  + 'ev.source.postMessage(' + (ok ? '{ tipo: "libreta-estimacion", id: ev.data.id, ok: true, resultado: { grupos: [{ nombre: "Bajos y columnas", tipo: "muebles", total: tot - 140, sinPrecio: [] }, { nombre: "Complicaciones", tipo: "libre", total: 40, sinPrecio: [] }, { nombre: "Revisar (de la libreta)", tipo: "libre", total: 0, sinPrecio: ["Electrodoméstico: horno"] }], subtotal: tot - 100, instalacion: 100, total: tot } }'
  : '{ tipo: "libreta-estimacion", id: ev.data.id, ok: false, error: "no-arranca" }') + ', location.origin); });'
  + 'window.parent.postMessage({ tipo: "libreta-lista" }, location.origin);</script>';
const cocina = async a => {
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="cocina"]'); await a.page.waitForSelector('[data-pantalla="ficha"]');
  const A = '[data-pared="A"] ';
  await a.page.fill(A + '> .fila-largo > [data-c="largo"] input', '3');
  await a.page.click(A + '[data-fila="bajos"] [data-acc="anadir-modulo"][data-v="bajo"]');
  await a.page.click(A + '[data-fila="bajos"] [data-modulo].abierto [data-acc="rapido"][data-v="600"]');
  await a.page.click(A + '[data-fila="bajos"] [data-modulo].abierto [data-acc="recargo-motivo"][data-v="pilar"]');
  await a.page.click('[data-acc="abrir-coste"]');
};

prueba('cocina con la tarifa: tres gamas, desglose de la media, sin precio y el recargo en el paquete', con({}, async a => {
  await a.page.route('**/cocinas/**', r => r.fulfill({ contentType: 'text/html', body: falso(true) }));
  await cocina(a);
  await a.page.click('[data-acc="calcular-tarifa"]');
  await a.page.waitForSelector('[data-acc="tarifa-gama"][data-v="ALTO GAMA"]');
  igual(await a.page.evaluate(() => window.__cals), ['BÁSICO', 'DM-LACA MEDIO', 'ALTO GAMA']);
  igual(await a.page.$$eval('[data-acc="tarifa-gama"] .importes > b', l => l.map(x => x.innerText)), ['652 €', '900 €', '1.200 €']);
  igual(await a.page.$eval('[data-acc="tarifa-desglose"] [data-acc="tarifa-total"] b', x => x.textContent), '900 €');
  afirma(await a.page.$('[data-grupo-tarifa="Instalación"]'), 'sale la instalación');
  afirma(/1 cosa sin precio/.test(await a.page.innerText('[data-acc="tarifa-sin-precio"]')));
  const p = await a.page.evaluate(() => window.__recibido);
  igual(p.plano3d, null, 'sin el plano');
  igual(p.grupos[0].lineas[0].recargo, { motivo: 'pilar', pct: 20, texto: 'Cajeado por pilar – Bajo 60 (pared A)' });
  // Al cambiar algo, avisa de que el cálculo es de antes
  await a.page.click('[data-pared="A"] [data-fila="bajos"] [data-acc="anadir-modulo"][data-v="bajo"]');
  await a.page.click('[data-pared="A"] [data-fila="bajos"] [data-modulo].abierto [data-acc="rapido"][data-v="600"]');
  await a.page.waitForSelector('[data-acc="tarifa-vieja"]');
}));
prueba('si Presupuestos no puede calcular, lo dice y deja probar otra vez', con({}, async a => {
  await a.page.route('**/cocinas/**', r => r.fulfill({ contentType: 'text/html', body: falso(false) }));
  await cocina(a);
  await a.page.click('[data-acc="calcular-tarifa"]');
  await a.page.waitForSelector('[data-acc="tarifa-error"]');
  afirma(/Abre Presupuestos una vez/.test(await a.page.innerText('[data-acc="tarifa-error"]')));
  afirma(await a.page.$('[data-acc="calcular-tarifa"]'), 'botón para probar otra vez');
}));
prueba('armario de correderas: también con la tarifa, con su tramo y el recargo del armario', con({}, async a => {
  await a.page.route('**/cocinas/**', r => r.fulfill({ contentType: 'text/html', body: falso(true) }));
  await crearTrabajo(a, 'Casa'); await a.page.click('[data-acc="tipo"][data-v="armario"]'); await a.page.click('[data-acc="subtipo"][data-v="corredera"]');
  await a.page.waitForSelector('[data-pantalla="ficha"]');
  await a.page.fill('[data-acc="ancho_medio"]', '2000');
  await a.page.click('[data-acc="abrir-coste"]');
  await a.page.click('[data-acc="coste"] [data-acc="recargo-motivo"][data-v="descuadre"]');
  await a.page.click('[data-acc="calcular-tarifa"]');
  await a.page.waitForSelector('[data-acc="tarifa-total"]');
  const p = await a.page.evaluate(() => window.__recibido), t = p.grupos[0].tramos[0];
  igual([p.grupos[0].tipo, t.clase, t.ancho, t.puertas], ['armario', 'armario', 200, 'corredera_tablero']);
  igual(t.recargos.map(r => [r.motivo, r.pct]), [['descuadre', 20]]);
  afirma(await a.page.$('[data-acc="pasar-presupuesto"]'), 'el armario también se pasa a presupuesto');
}));
fin();
