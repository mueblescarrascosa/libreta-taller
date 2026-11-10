// Una ficha: sus huecos según el tipo y, en todas, medidas libres, notas, croquis y fotos.
import { h, segmentado, tituloFicha, vivos } from '../util.js';
import { unidadDe } from '../unidades.js';
import { avisos, camposDeElemento, elementoNuevo, paredNueva, puertaNueva, normalizarFicha, resumenPuerta, limpiarDatos, tieneInformacion,
  TIPOS_ELEMENTO, NOMBRE_ELEMENTO, RAPIDAS_PUERTA } from '../modelo.js';
import { campoMedida, campoEntero } from '../campos.js';
import { seccionAdjuntos } from './adjuntos.js';
import { huella } from '../sincro.js';

const RETARDO = 300;
const nuevoId = () => crypto.randomUUID();
const SI_NO = [[true, 'Sí'], [false, 'No']];

// Una medida mal escrita no se guarda como número: queda vacía y el texto se conserva en obj.mal para seguir avisando.
function anotarMedida(obj, k, mm, textoMal) {
  obj[k] = mm;
  if (textoMal) { obj.mal = Object.assign({}, obj.mal, { [k]: textoMal }); return; }
  if (obj.mal) { delete obj.mal[k]; if (!Object.keys(obj.mal).length) delete obj.mal; }
}

// Al salir de la ficha: fuera las notas y medidas vacías, y si no queda nada, la ficha entera.
export async function descartarVacio(App, ficha) {
  const actual = await App.almacen.leer('fichas', ficha.id);
  if (!actual || actual.borrado_at) return;
  const limpia = Object.assign({}, actual, { datos: limpiarDatos(actual.datos) });
  const conAdjuntos = vivos(await App.almacen.todos('adjuntos')).some(a => a.ficha_id === ficha.id);
  if (!limpia.nombre.trim() && !conAdjuntos && !tieneInformacion(limpia.datos)) {
    limpia.borrado_at = new Date().toISOString();
    return App.guardarFila('fichas', limpia);
  }
  if (huella(limpia) !== huella(actual)) return App.guardarFila('fichas', limpia);
}

export async function pintarFicha(App, id) {
  const leida = await App.almacen.leer('fichas', id);
  if (!leida || leida.borrado_at) return App.ir('#/');
  const ficha = normalizarFicha(leida);
  const trabajo = ficha.trabajo_id ? await App.almacen.leer('trabajos', ficha.trabajo_id) : null;
  const unidad = unidadDe(trabajo, App.ajustes()), d = ficha.datos;
  const main = App.marco('ficha', tituloFicha(ficha), trabajo ? '#/trabajo/' + trabajo.id : '#/sueltas');

  let espera = null;
  const guardarYa = () => { clearTimeout(espera); espera = null; return App.guardarFila('fichas', ficha); };
  const cambio = () => { refrescarAvisos(); clearTimeout(espera); espera = setTimeout(guardarYa, RETARDO); };
  App.vaciar = () => (espera ? guardarYa() : undefined);
  App.alSalir = () => descartarVacio(App, ficha);
  if (ficha !== leida) await guardarYa();

  const general = h('div', { class: 'avisos', 'data-avisos': '*' });
  function refrescarAvisos() {
    const porCampo = {};
    avisos(ficha, unidad).forEach(a => { (porCampo[a.campo] = porCampo[a.campo] || []).push(a.texto); });
    const zonas = [...main.querySelectorAll('[data-avisos]')], conZona = new Set(zonas.map(z => z.dataset.avisos));
    zonas.forEach(z => { z.textContent = (porCampo[z.dataset.avisos] || []).join(' · '); });
    general.textContent = Object.keys(porCampo).filter(k => !conZona.has(k)).map(k => porCampo[k].join(' · ')).join(' · ');
  }
  const confirmarQuitar = que => confirm('¿Quitar ' + que + '?');
  const medida = (obj, k, etiqueta, extra) => campoMedida(Object.assign({ etiqueta, acc: k, valor: obj[k], mal: obj.mal && obj.mal[k], unidad, aviso: k,
    alCambiar: (v, textoMal) => { anotarMedida(obj, k, v, textoMal); cambio(); } }, extra));
  const medidaGeneral = medida;
  const siNo = (obj, k, etiqueta) => h('div', { class: 'campo' }, h('label', { class: 'et' }, etiqueta),
    segmentado({ acc: k, opciones: SI_NO, valor: obj[k], permitirVacio: true, alCambiar: v => { obj[k] = v; cambio(); } }));

  // ── Puertas: varias por ficha; solo una abierta, las demás en una línea ──
  function puertas() {
    const zona = h('div', { class: 'lista' });
    let abierta = d.puertas.length ? d.puertas[d.puertas.length - 1].id : null;
    const nombre = (p, i) => p.nombre || 'Puerta ' + (i + 1);
    function editor(p, i) {
      return h('div', { class: 'tarjeta abierta', 'data-puerta': '' },
        h('div', { class: 'cab' }, h('h3', {}, nombre(p, i)),
          h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-puerta', onclick: () => {
            if (!confirmarQuitar(nombre(p, i).toLowerCase())) return;
            d.puertas.splice(d.puertas.indexOf(p), 1); abierta = null; cambio(); repintar();
          } }, 'Quitar')),
        h('input', { 'data-acc': 'nombre-puerta', placeholder: 'Nombre (por ejemplo, Dormitorio 1)', value: p.nombre, oninput: ev => { p.nombre = ev.target.value; cambio(); } }),
        medida(p, 'ancho', 'Ancho', { rapidos: RAPIDAS_PUERTA.ancho, aviso: null }),
        medida(p, 'alto', 'Alto', { rapidos: RAPIDAS_PUERTA.alto, aviso: null }),
        medida(p, 'tabique', 'Grosor de tabique', { rapidos: RAPIDAS_PUERTA.tabique, aviso: null }),
        h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Abre a'),
          segmentado({ acc: 'mano', opciones: [['izq', 'Izquierda'], ['der', 'Derecha']], valor: p.mano, permitirVacio: true, alCambiar: v => { p.mano = v; cambio(); } })),
        h('div', { class: 'dos' }, siNo(p, 'condena', 'Condena'), siNo(p, 'vidriera', 'Vidriera')),
        h('div', { class: 'avisos', 'data-avisos': 'puerta.' + p.id }));
    }
    function resumen(p, i) {
      return h('div', { class: 'tarjeta', 'data-puerta': '' },
        h('button', { type: 'button', class: 'resumen', 'data-acc': 'abrir-puerta', onclick: () => { abierta = p.id; repintar(); } },
          h('b', {}, nombre(p, i)), h('small', {}, resumenPuerta(p, unidad))),
        h('div', { class: 'avisos', 'data-avisos': 'puerta.' + p.id }));
    }
    function repintar() {
      zona.replaceChildren(...d.puertas.map((p, i) => (p.id === abierta ? editor : resumen)(p, i)));
      refrescarAvisos();
    }
    repintar();
    return [h('h2', {}, 'Puertas'), zona,
      h('button', { type: 'button', class: 'prin ancho', 'data-acc': 'anadir-puerta', onclick: () => {
        const p = puertaNueva(d.puertas[d.puertas.length - 1]);
        d.puertas.push(p); abierta = p.id; cambio(); repintar();
      } }, '+ Añadir puerta')];
  }

  // ── Paredes ──
  function elemento(e, lista, repintar) {
    const c = camposDeElemento(e.tipo);
    // Los pilares y columnas se miden siempre en centímetros.
    const medida = (obj, k, etiqueta, extra) => medidaGeneral(obj, k, etiqueta, Object.assign(e.tipo === 'pilar' ? { unidad: 'cm' } : {}, extra));
    const refExtra = { ref: e.ref, alCambiarRef: r => { e.ref = r; d.ref_ultima = r; cambio(); }, aviso: null };
    return h('div', { class: 'elemento', 'data-elemento': e.tipo },
      h('div', { class: 'cab' }, h('b', {}, NOMBRE_ELEMENTO[e.tipo]), h('small', {}, c.punto === 'centro' ? 'medido al centro' : 'medido al borde'),
        h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-elemento', onclick: () => { if (confirmarQuitar(NOMBRE_ELEMENTO[e.tipo].toLowerCase())) { lista.splice(lista.indexOf(e), 1); cambio(); repintar(); } } }, 'Quitar')),
      e.tipo === 'otro' ? h('input', { 'data-acc': 'nombre-elemento', placeholder: '¿Qué es?', value: e.nombre, oninput: ev => { e.nombre = ev.target.value; cambio(); } }) : null,
      h('div', { class: 'dos' }, medida(e, 'distancia', 'Distancia', refExtra), c.altura ? medida(e, 'altura', 'Altura del suelo', { aviso: null }) : null),
      c.ancho || c.alto || c.fondo ? h('div', { class: 'dos' },
        c.ancho ? medida(e, 'ancho', 'Ancho', { aviso: null }) : null,
        c.alto ? medida(e, 'alto', 'Alto', { aviso: null }) : null,
        c.fondo ? medida(e, 'fondo', 'Sobresale de la pared', { aviso: null }) : null) : null,
      h('div', { class: 'avisos', 'data-avisos': 'elemento.' + e.id }));
  }

  function paredes(tipos) {
    const zona = h('div', {});
    const enM = () => d.paredes_m ?? App.ajustes().paredesM;
    const repintar = () => { zona.replaceChildren(...d.paredes.map(p => pared(p, tipos, repintar, enM() ? 'm' : unidad))); refrescarAvisos(); };
    repintar();
    return [h('div', { class: 'cab' }, h('h2', {}, 'Paredes'),
      segmentado({ acc: 'ud-paredes', opciones: [[false, unidad], [true, 'm']], valor: !!enM(), alCambiar: v => { d.paredes_m = v; App.cambiarParedesM(v); cambio(); repintar(); } })),
    h('small', { class: 'et' }, 'Largo y alto de las paredes; tócalo para escribirlos en metros.'),
    zona,
    h('button', { type: 'button', class: 'ancho', 'data-acc': 'anadir-pared', onclick: () => { d.paredes.push(paredNueva(d.paredes)); cambio(); repintar(); } }, '+ Añadir pared')];
  }
  function pared(p, tipos, repintarTodo, udPared) {
    const zonaEl = h('div', {});
    const repintar = () => { zonaEl.replaceChildren(...p.elementos.map(e => elemento(e, p.elementos, repintar))); refrescarAvisos(); };
    repintar();
    const pilares = h('div', { class: 'campo' }, h('label', { class: 'et' }, '¿Pilares o columnas?'),
      segmentado({ acc: 'pilares', opciones: SI_NO, valor: p.pilares ?? null, permitirVacio: true, alCambiar: v => {
        p.pilares = v;
        if (v && !p.elementos.some(e => e.tipo === 'pilar')) p.elementos.push(elementoNuevo('pilar', d.ref_ultima));
        cambio(); repintar();
      } }));
    return h('div', { class: 'tarjeta', 'data-pared': p.letra },
      h('div', { class: 'cab' }, h('h3', {}, 'Pared ' + p.letra),
        h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-pared', onclick: () => { if (confirmarQuitar('la pared ' + p.letra)) { d.paredes.splice(d.paredes.indexOf(p), 1); cambio(); repintarTodo(); } } }, 'Quitar')),
      medida(p, 'largo', 'Largo', { aviso: null, unidad: udPared }),
      medida(p, 'alto', 'Alto', { aviso: null, unidad: udPared }),
      h('div', { class: 'avisos', 'data-avisos': 'pared.' + p.id }),
      pilares,
      zonaEl,
      h('label', { class: 'et' }, 'Añadir'),
      h('div', { class: 'chips' }, tipos.map(t => h('button', { type: 'button', 'data-acc': 'anadir-elemento', 'data-v': t, onclick: () => { p.elementos.push(elementoNuevo(t, d.ref_ultima)); cambio(); repintar(); } }, NOMBRE_ELEMENTO[t]))));
  }

  function enchufes() {
    const zona = h('div', {});
    const repintar = () => {
      zona.replaceChildren(...d.enchufes.map(e => h('div', { class: 'elemento', 'data-elemento': 'enchufe' },
        h('div', { class: 'cab' }, h('b', {}, 'Enchufe'), h('small', {}, 'medido al centro'),
          h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-elemento', onclick: () => { if (confirmarQuitar('el enchufe')) { d.enchufes.splice(d.enchufes.indexOf(e), 1); cambio(); repintar(); } } }, 'Quitar')),
        h('div', { class: 'dos' }, medida(e, 'distancia', 'Distancia', { ref: e.ref, alCambiarRef: r => { e.ref = r; d.ref_ultima = r; cambio(); }, aviso: null }), medida(e, 'altura', 'Altura del suelo', { aviso: null })),
        h('div', { class: 'avisos', 'data-avisos': 'enchufe.' + e.id }))));
      refrescarAvisos();
    };
    repintar();
    return [h('h2', {}, 'Enchufes'), zona, h('button', { type: 'button', class: 'ancho', 'data-acc': 'anadir-enchufe', onclick: () => {
      const e = elementoNuevo('enchufe', d.ref_ultima);
      d.enchufes.push({ id: e.id, distancia: null, ref: e.ref, altura: null }); cambio(); repintar();
    } }, '+ Añadir enchufe')];
  }

  function propios() {
    if (ficha.tipo === 'puerta') return puertas();
    if (ficha.tipo === 'cocina') return [h('div', { class: 'tarjeta' }, medida(d, 'alto_techo', 'Altura de suelo a techo')), ...paredes(TIPOS_ELEMENTO.cocina)];
    if (ficha.tipo === 'armario') {
      const r = [h('div', { class: 'tarjeta' },
        h('label', { class: 'et' }, 'Ancho del hueco'),
        h('small', { class: 'ayuda' }, 'Mídelo arriba, en medio y abajo. Si no coinciden, las paredes no están rectas y se avisa.'),
        h('div', { class: 'dos' }, medida(d, 'ancho_arriba', 'Arriba'), medida(d, 'ancho_medio', 'En medio')), medida(d, 'ancho_abajo', 'Abajo'),
        h('div', { class: 'avisos', 'data-avisos': 'anchos' }),
        h('label', { class: 'et' }, 'Alto del hueco'),
        h('small', { class: 'ayuda' }, 'Mídelo en el lado izquierdo y en el lado derecho. Si no coinciden, el suelo o el techo no están a nivel.'),
        h('div', { class: 'dos' }, medida(d, 'alto_izq', 'Lado izquierdo'), medida(d, 'alto_der', 'Lado derecho')),
        h('div', { class: 'avisos', 'data-avisos': 'altos' }),
        medida(d, 'fondo', 'Fondo del hueco'),
        h('div', { class: 'dos' }, medida(d, 'rodapie_alto', 'Alto de rodapié'), medida(d, 'rodapie_grosor', 'Grosor de rodapié')),
        ficha.subtipo === 'corredera' ? campoEntero({ etiqueta: 'Número de hojas', acc: 'hojas', valor: d.hojas, alCambiar: v => { d.hojas = v; cambio(); } }) : null,
        ficha.subtipo === 'abatible' ? campoEntero({ etiqueta: 'Número de puertas', acc: 'puertas', valor: d.puertas, alCambiar: v => { d.puertas = v; cambio(); } }) : null)];
      r.push(...enchufes());
      if (ficha.subtipo === 'vestidor') r.push(...paredes(TIPOS_ELEMENTO.vestidor));
      return r;
    }
    return [];
  }

  const zonaLibres = h('div', { class: 'tarjeta' });
  function repintarLibres() {
    zonaLibres.replaceChildren(...d.libres.map(m => h('div', { class: 'libre', 'data-libre': '' },
      h('input', { 'data-acc': 'libre-nombre', placeholder: 'Nombre', value: m.nombre, oninput: ev => { m.nombre = ev.target.value; cambio(); } }),
      campoMedida({ acc: 'libre-valor', valor: m.mm, mal: m.mal && m.mal.mm, unidad, aviso: 'libre.' + m.id, alCambiar: (v, textoMal) => { anotarMedida(m, 'mm', v, textoMal); cambio(); } }),
      h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-libre', onclick: () => { if (confirmarQuitar('la medida')) { d.libres.splice(d.libres.indexOf(m), 1); cambio(); repintarLibres(); } } }, '✕'))),
      h('button', { type: 'button', 'data-acc': 'anadir-libre', onclick: () => { d.libres.push({ id: nuevoId(), nombre: '', mm: null }); cambio(); repintarLibres(); zonaLibres.querySelectorAll('[data-acc="libre-nombre"]')[d.libres.length - 1].focus(); } }, '+ Añadir medida'));
    refrescarAvisos();
  }

  function notas() {
    const zona = h('div', { class: 'tarjeta' });
    const repintar = () => zona.replaceChildren(...d.notas.map(n => h('div', { class: 'campo' },
      h('textarea', { 'data-acc': 'nota', placeholder: 'Nota', oninput: ev => { n.texto = ev.target.value; cambio(); } }, n.texto),
      h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-nota', onclick: () => { if (confirmarQuitar('la nota')) { d.notas.splice(d.notas.indexOf(n), 1); cambio(); repintar(); } } }, 'Quitar nota'))),
      h('button', { type: 'button', 'data-acc': 'anadir-nota', onclick: () => { d.notas.push({ id: nuevoId(), texto: '' }); cambio(); repintar(); const t = zona.querySelectorAll('textarea'); t[t.length - 1].focus(); } }, '+ Añadir nota'));
    repintar();
    return [h('h2', {}, 'Notas'), zona];
  }

  // Las líneas medidas con la regla en fotos y croquis pasan a «Otras medidas».
  async function anadirCotas(cotas) {
    let n = d.libres.filter(m => /^Cota \d+$/.test(m.nombre)).length;
    cotas.forEach(c => d.libres.push({ id: nuevoId(), nombre: 'Cota ' + (++n), mm: c.mm }));
    repintarLibres();
    await guardarYa();
  }

  const adjuntos = await seccionAdjuntos(App, ficha, { unidad, anadirCotas });
  repintarLibres();
  main.append(
    general,
    ficha.tipo === 'puerta' ? null : h('input', { 'data-acc': 'nombre-ficha', placeholder: 'Nombre', value: ficha.nombre, oninput: ev => { ficha.nombre = ev.target.value; cambio(); } }),
    ...propios(), h('h2', {}, 'Otras medidas'), zonaLibres, ...notas(),
    ...adjuntos.nodos,
    h('button', { type: 'button', class: 'peligro', 'data-acc': 'borrar-ficha', onclick: async () => {
      if (!confirm('¿Borrar esta ficha?')) return;
      ficha.borrado_at = new Date().toISOString();
      await guardarYa(); App.vaciar = null; App.alSalir = null;
      history.back();
    } }, 'Borrar ficha'));
  refrescarAvisos();
  App.refrescar = async () => {
    const nueva = await App.almacen.leer('fichas', id);
    if (!espera && nueva && huella(normalizarFicha(nueva)) !== huella(ficha)) return pintarFicha(App, id);
    adjuntos.pintar();
  };
}
