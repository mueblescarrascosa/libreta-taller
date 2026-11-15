// Guía de medidas para diseñar una cocina. Parte de la cocina tipo del taller (zócalo 15 + mueble 70 + encimera 4)
// y de las mismas medidas de referencia que usan los consejos de diseño (consejos.js: MEDIDAS), en el mismo orden.
import { h } from '../util.js';
import { MEDIDAS as M } from '../consejos.js';

const cm = mm => String(Math.round(mm) / 10).replace('.', ',') + ' cm';
const ZOCALOS = [100, 150];   // zócalos de serie (mm)

// Altura cómoda de encimera según la estatura de quien más cocina: el codo (≈ 63 % de la estatura) menos unos 15 cm.
export function alturaEncimera(estatura) {
  const e = Number(estatura);
  if (!e || e < 120 || e > 230) return null;
  return Math.max(82, Math.min(100, Math.round(e * 0.63 - 15)));
}
// Cómo llegar a esa altura con la cocina tipo: el mueble (70) y la encimera (4) no cambian; se juega con el zócalo.
export function zocaloPara(alturaCm) {
  const sinZocalo = (M.mueble_bajo + M.grueso_encimera) / 10, z = alturaCm - sinZocalo;
  const serie = ZOCALOS.map(x => x / 10).reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a));
  return { zocalo: z, serie, queda: serie + sinZocalo, aMedida: Math.abs(serie - z) > 2 };
}

const tabla = (cab, filas) => h('table', { class: 'tabla-guia' }, h('thead', {}, h('tr', {}, cab.map(t => h('th', {}, t)))),
  h('tbody', {}, filas.map(f => h('tr', {}, f.map(t => h('td', {}, t))))));
const apartado = (n, titulo, ...hijos) => h('section', { class: 'tarjeta guia-apartado', 'data-apartado': n }, h('h2', {}, n + '. ' + titulo), ...hijos);
const lista = items => h('ul', { class: 'guia-lista' }, items.map(([b, t]) => h('li', {}, h('b', {}, b), ' ', t)));
const nota = t => h('small', { class: 'ayuda' }, t);

export function pintarGuia(App, fichaId) {
  const main = App.marco('guia', 'Guía de medidas', fichaId ? '#/ficha/' + fichaId : '#/');
  const tipo = cm(M.zocalo) + ' + ' + cm(M.mueble_bajo) + ' + ' + cm(M.grueso_encimera);
  // Calculadora: estatura → altura de encimera y zócalo.
  const salida = h('p', { class: 'guia-resultado', 'data-res': 'encimera' }, 'Escribe la estatura de quien más cocina.');
  const entrada = h('input', { type: 'number', inputmode: 'numeric', min: '120', max: '230', placeholder: 'p. ej. 170', 'data-acc': 'estatura',
    oninput: () => {
      const a = alturaEncimera(entrada.value);
      if (a === null) { salida.textContent = 'Escribe la estatura en cm (entre 120 y 230).'; return; }
      const z = zocaloPara(a), tipoCm = M.encimera / 10;
      salida.textContent = 'Encimera a unos ' + a + ' cm. ' + (Math.abs(a - tipoCm) <= 2 ? 'Es la cocina tipo (' + tipoCm + ' cm): no hay que cambiar nada.'
        : z.aMedida ? 'Haría falta un zócalo de ' + z.zocalo + ' cm (a medida o con patas más altas); con el de ' + z.serie + ' queda en ' + z.queda + ' cm.'
          : 'Con zócalo de ' + z.serie + ' cm queda en ' + z.queda + ' cm.');
    } });

  main.append(
    nota('Medidas de referencia del taller. Los consejos de diseño de cada ficha usan estas mismas cifras. Son orientativas: manda el manual de cada electrodoméstico.'),
    apartado(1, 'La cocina tipo',
      tabla(['Pieza', 'Medida', ''], [
        ['Zócalo', cm(M.zocalo), 'De serie hay de 10 y de 15'],
        ['Mueble bajo', cm(M.mueble_bajo) + ' de alto', 'Fondo ' + cm(M.fondo_bajo) + ' con la puerta'],
        ['Encimera', cm(M.grueso_encimera) + ' de grueso', 'Fondo ' + cm(M.fondo_encimera) + ' (vuela 2–4 cm)'],
        ['Altura de la encimera', cm(M.encimera), tipo],
        ['Altos', 'de ' + cm(M.altos_desde) + ' a ' + cm(M.altos_hasta), 'Altos de 70; quedan ' + cm(M.altos_desde - M.encimera) + ' sobre la encimera; fondo ' + cm(M.fondo_alto)],
        ['Columnas', 'hasta ' + cm(M.columna), 'A la misma altura que los altos'],
      ]),
      nota('Así salen los dibujos, la perspectiva y el material de la app.')),
    apartado(2, 'Altura de encimera según la estatura',
      h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Estatura (cm)'), entrada), salida,
      nota('Lo cómodo: 10–15 cm por debajo del codo. Se ajusta con el zócalo: el mueble y la encimera son siempre los mismos.')),
    apartado(3, 'Placa y campana',
      tabla(['Qué', 'Medida', 'Nota'], [
        ['Placa (aparato)', cm(M.placa) + ' lo normal', 'En un mueble de 60, 80 o 90 suele ir una de 60; las de 70–90 se dicen aparte'],
        ['Encimera a cada lado de la placa', cm(M.lado_placa) + ' mínimo', cm(M.lado_placa_bien) + ' o más; cuenta lo que sobra del mueble de placa'],
        ['Campana', 'igual o más ancha que la placa', 'No que el mueble: una de 60 vale para una placa de 60 en mueble de 90'],
        ['Altura de campana: inducción o vitro', cm(M.campana_sobre_electrica) + ' sobre la placa', 'Mirar el manual'],
        ['Altura de campana: gas', cm(M.campana_sobre_gas) + ' sobre la placa', 'Nunca menos de 65'],
        ['Ventana', 'nunca encima de la placa', 'Sin campana, con corrientes y cortinas cerca'],
      ])),
    apartado(4, 'Fregadero y lavavajillas',
      tabla(['Qué', 'Medida', 'Nota'], [
        ['Encimera entre fregadero y placa', cm(M.preparar) + ' mínimo', cm(M.preparar_bien) + ' es lo cómodo: es la zona de preparar'],
        ['Mueble de fregadero', '80 (un seno) · 90–100 (dos)', 'Mirar la medida mínima de mueble del fregadero'],
        ['Lavavajillas', '45 o 60', 'Pegado al fregadero, como mucho a ' + cm(M.lavavajillas)],
        ['Lavavajillas en el rincón', 'no', 'Su puerta tapa el rinconero: un bajo o regleta de 5–10 cm entre medias'],
      ])),
    apartado(5, 'Frigorífico',
      tabla(['Qué', 'Medida', 'Nota'], [
        ['Columna de frigo', '60 · americano 92', 'Libre instalación: 2–3 cm a cada lado para que respire'],
        ['Frigo – placa', cm(M.frigo_placa) + ' mínimo', 'O panel aislante entre los dos'],
        ['Frigo contra pared o en rincón', 'regleta de 3–5 cm', 'Para que la puerta abra más de 90° y salgan los cajones'],
      ])),
    apartado(6, 'Encimera y columnas',
      tabla(['Qué', 'Medida', 'Nota'], [
        ['Encimera de trabajo en total', cm(M.encimera_libre) + ' mínimo', 'Mejor 120 cm o más seguidos'],
        ['Columnas', 'juntas, al final de un tramo', 'En medio parten la encimera'],
        ['Horno y microondas en columna', 'horno a 80–90 · micro a 130–150', 'Del suelo a la base del aparato'],
        ['Enchufes de encimera', '110–120 cm del suelo', 'Uno doble cada 1–1,5 m; los de electrodomésticos, en el mueble de al lado'],
        ['Barra', '25–30 cm de vuelo · 60 cm por persona', 'Mesa 75 · mostrador 90 (taburete 65) · barra alta 105 (taburete 75–80)'],
      ])),
    apartado(7, 'Pasos y pasillos',
      tabla(['Qué', 'Mínimo', 'Cómodo'], [
        ['Entre encimeras enfrentadas', cm(M.pasillo), cm(M.pasillo_bien) + ' si cocinan dos'],
        ['Hasta la isla o península', cm(M.pasillo), '100–' + cm(M.pasillo_bien)],
        ['Paredes enfrentadas con muebles en las dos', cm(M.pasillo + 2 * M.fondo_encimera), 'Por debajo, muebles solo en una pared o de poco fondo'],
      ]),
      nota('El paso se mide desde el canto de la encimera (' + cm(M.fondo_encimera) + ' desde la pared).')),
    apartado(8, 'Soluciones habituales', lista([
      ['Rincones:', 'rinconero en L de 90–100 con bandejas extraíbles o carrusel; si no, rincón ciego con puerta. Entre el rincón y un lavavajillas, horno o cajonero, un bajo o regleta de 5–10 cm.'],
      ['Cocina estrecha:', 'muebles en una sola pared, o enfrente solo altos o bajos de 30–40 cm de fondo. Cajones mejor que puertas.'],
      ['Poca encimera:', 'placa de dos zonas, tabla sobre el fregadero, estante o sobre-encimera para los pequeños electrodomésticos.'],
      ['Ventana baja:', 'debajo va bien el fregadero, nunca la placa. La encimera ' + cm(M.encimera) + ' tiene que quedar 5 cm por debajo del marco.'],
      ['Isla:', 'con placa o fregadero, 90–100 cm de fondo; con barra, 25–30 cm más de vuelo.'],
      ['Altos hasta el techo:', 'por encima de ' + cm(M.altos_hasta) + ', altillos o una tapeta para que no se acumule polvo.'],
    ])),
  );
}
