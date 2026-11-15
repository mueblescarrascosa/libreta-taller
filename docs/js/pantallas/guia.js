// Guía de medidas para diseñar una cocina: alturas, anchos, distancias y soluciones habituales.
// Las cifras son las de referencia que usa la app para dar los consejos de diseño (consejos.js).
import { h } from '../util.js';
import { REGLAS } from '../consejos.js';

const cm = mm => Math.round(mm / 10) + ' cm';
// Altura cómoda de encimera según la estatura de quien más cocina: el codo (≈ 63 % de la estatura) menos unos 15 cm.
export function alturaEncimera(estatura) {
  const e = Number(estatura);
  if (!e || e < 120 || e > 230) return null;
  return Math.max(82, Math.min(100, Math.round(e * 0.63 - 15)));
}

const tabla = (cab, filas) => h('table', { class: 'tabla-guia' }, h('thead', {}, h('tr', {}, cab.map(t => h('th', {}, t)))),
  h('tbody', {}, filas.map(f => h('tr', {}, f.map(t => h('td', {}, t))))));
const apartado = (titulo, ...hijos) => h('section', { class: 'tarjeta guia-apartado' }, h('h2', {}, titulo), ...hijos);
const lista = items => h('ul', { class: 'guia-lista' }, items.map(([b, t]) => h('li', {}, h('b', {}, b), ' ', t)));

export function pintarGuia(App, fichaId) {
  const main = App.marco('guia', 'Guía de medidas', fichaId ? '#/ficha/' + fichaId : '#/');
  // Calculadora: estatura → altura de encimera.
  const salida = h('p', { class: 'guia-resultado', 'data-res': 'encimera' }, 'Escribe la estatura de quien más cocina.');
  const entrada = h('input', { type: 'number', inputmode: 'numeric', min: '120', max: '230', placeholder: 'p. ej. 170', 'data-acc': 'estatura',
    oninput: () => {
      const a = alturaEncimera(entrada.value);
      salida.textContent = a === null ? 'Escribe la estatura en cm (entre 120 y 230).'
        : 'Encimera a unos ' + a + ' cm del suelo.' + (a > 87 ? ' Lo normal es 85 (zócalo 10 + mueble 72 + encimera 3): sube el zócalo a 15 o pon patas más altas.' : a < 84 ? ' Con zócalo de 8 cm se baja un poco.' : ' Es la altura normal (zócalo 10 + mueble 72 + encimera 3).');
    } });

  main.append(
    h('p', { class: 'ayuda' }, 'Medidas de referencia para diseñar la cocina. La app las usa para darte los consejos de diseño de cada ficha. Son orientativas: manda el manual de cada electrodoméstico.'),
    apartado('Altura de la encimera',
      h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Estatura (cm)'), entrada), salida,
      h('small', { class: 'ayuda' }, 'Lo cómodo: entre 10 y 15 cm por debajo del codo.')),
    apartado('Alturas',
      tabla(['Qué', 'Medida', 'Nota'], [
        ['Encimera', '85–95 cm', 'Normal 85; personas altas, 90–95'],
        ['Altos (desde la encimera)', '50–60 cm', 'Menos de 50 molesta para trabajar; desde el suelo, 140–145'],
        ['Parte de arriba de los altos', 'hasta 215–220 cm', 'Más arriba no se alcanza el estante sin escalera'],
        ['Campana sobre inducción o vitro', '65 cm', 'Mirar el manual de la campana'],
        ['Campana sobre gas', '75 cm', 'Por seguridad, nunca menos de 65'],
        ['Microondas en alto o columna', 'base a 130–150 cm', 'Que se vea dentro sin levantar los brazos'],
        ['Horno en columna', 'base a 80–90 cm', 'Se saca la bandeja sin agacharse'],
        ['Enchufes de encimera', '110–120 cm del suelo', '20–30 cm sobre la encimera'],
        ['Barra para comer', '75 / 90 / 105 cm', 'Mesa con sillas / mostrador con taburete de 65 / barra alta con taburete de 75–80'],
      ])),
    apartado('Anchos y fondos',
      tabla(['Qué', 'Medida', 'Nota'], [
        ['Fondo de bajos', '56–60 cm', 'Encimera de 62–65 (vuela 2–3 cm)'],
        ['Fondo de altos', '32–35 cm', 'En pasillos estrechos, 25–30'],
        ['Fregadero', '80 cm (1 seno) · 90–100 (2 senos)', 'Mira la medida mínima de mueble del fregadero'],
        ['Placa', '60 cm (4 zonas) · 80–90 (5 o grande)', 'La campana, igual o más ancha'],
        ['Lavavajillas', '45 o 60 cm', 'Integrable: hueco de 60 justo'],
        ['Frigorífico', 'columna 60 · americano 92', 'Libre instalación: deja 2–3 cm a cada lado para que respire'],
        ['Por persona en barra o isla', '60 cm de ancho', 'Y 25–30 cm de vuelo para las rodillas'],
      ])),
    apartado('Distancias',
      tabla(['Qué', 'Mínimo', 'Cómodo'], [
        ['Paso entre muebles enfrentados', cm(REGLAS.pasillo), '100–' + cm(REGLAS.pasillo_bien) + ' (dos cocinando, 120)'],
        ['Paso hasta la isla o península', cm(REGLAS.pasillo), '100–' + cm(REGLAS.pasillo_bien)],
        ['Encimera a cada lado de la placa', cm(REGLAS.lado_placa), cm(REGLAS.lado_placa_bien) + ' o más'],
        ['Encimera entre fregadero y placa', cm(REGLAS.preparar), cm(REGLAS.preparar_bien)],
        ['Frigorífico – placa', cm(REGLAS.frigo_placa), 'o panel aislante entre los dos'],
        ['Lavavajillas – fregadero', 'pegado', 'como mucho ' + cm(REGLAS.lavavajillas)],
        ['Encimera de trabajo en total', cm(REGLAS.encimera_libre), '120 cm o más seguidos'],
        ['Triángulo frigo – fregadero – placa', 'cada lado 120 cm', 'cada lado hasta 270; en total 4 a 8 m'],
      ])),
    apartado('Soluciones habituales', lista([
      ['Rincones:', 'rinconero en L de 90–100 con bandejas extraíbles o carrusel; si no, rincón ciego con puerta. Entre el rincón y el lavavajillas, el horno o un cajonero, deja un bajo o una regleta de 5–10 cm para que abran las puertas y no choquen los tiradores.'],
      ['Frigo o columna junto a la pared:', 'deja una regleta de 3–5 cm para que la puerta abra más de 90° y salgan los cajones del frigo.'],
      ['Cocina estrecha (menos de 2,1 m entre paredes):', 'muebles en una sola pared, o en la de enfrente solo altos o bajos de poco fondo (30–40 cm). Cajones mejor que puertas.'],
      ['Poca encimera:', 'placa de dos zonas, tabla de cortar sobre el fregadero, estante o sobre-encimera para los pequeños electrodomésticos.'],
      ['Ventana baja:', 'debajo va bien el fregadero, nunca la placa. La encimera debe quedar al menos 5 cm por debajo del marco.'],
      ['Isla:', 'con placa o fregadero, al menos 90–100 cm de fondo; con barra, 25–30 cm más de vuelo. Paso de 100–120 cm alrededor.'],
      ['Altos hasta el techo:', 'remata con altillos o una tapeta para que no se acumule polvo encima.'],
      ['Columnas:', 'mejor juntas y al final de un tramo, sin partir la encimera. Horno y microondas en columna liberan encimera.'],
      ['Enchufes:', 'uno doble cada 1–1,5 m de encimera; los de lavavajillas, horno y frigo, en el mueble de al lado y no detrás.'],
    ])),
  );
}
