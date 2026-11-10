// Una ficha: sus huecos según el tipo y, en todas, medidas libres, notas, croquis y fotos.
import { h, segmentado, tituloFicha, vivos } from '../util.js';
import { unidadDe } from '../unidades.js';
import { avisos, camposDeElemento, elementoNuevo, paredNueva, puertaNueva, normalizarFicha, resumenPuerta, limpiarDatos, tieneInformacion,
  TIPOS_ELEMENTO, NOMBRE_ELEMENTO, RAPIDAS_PUERTA, USOS, nombreElemento } from '../modelo.js';
import { campoMedida, campoEntero } from '../campos.js';
import { verMedida } from '../unidades.js';
import { TIPOS_MODULO, NOMBRE_MODULO, moduloNuevo, nombreModulo, cuadreBajos, cuadreAltos, cuadreCuerpos, textoCuadre, lineaNueva, nombreLineal, nombreInterior, acabadosNuevos } from '../modulos.js';
import { seccionAdjuntos } from './adjuntos.js';
import { huella } from '../sincro.js';
import { geometriaPlanta, svgPlanta, aplicarPlano } from '../plano-vista.js';
import { abrirPlano } from '../plano-editor.js';

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
  const AJ = App.ajustes(), unidad = unidadDe(trabajo, AJ), d = ficha.datos;
  const usosDe = t => (t === 'toma' ? AJ.usos_toma : t === 'enchufe' ? AJ.usos_enchufe : []);
  const main = App.marco('ficha', tituloFicha(ficha), trabajo ? '#/trabajo/' + trabajo.id : '#/sueltas');

  let espera = null;
  const guardarYa = () => { clearTimeout(espera); espera = null; return App.guardarFila('fichas', ficha); };
  const cambio = () => { refrescarAvisos(); clearTimeout(espera); espera = setTimeout(guardarYa, RETARDO); };
  App.vaciar = () => (espera ? guardarYa() : undefined);
  App.alSalir = () => descartarVacio(App, ficha);
  if (ficha !== leida) await guardarYa();

  const general = h('div', { class: 'avisos', 'data-avisos': '*' });
  let pintarPlanta = null;
  const refrescos = [];
  function refrescarAvisos() {
    const porCampo = {};
    avisos(ficha, unidad, { margen: AJ.margen }).forEach(a => { (porCampo[a.campo] = porCampo[a.campo] || []).push(a.texto); });
    const zonas = [...main.querySelectorAll('[data-avisos]')], conZona = new Set(zonas.map(z => z.dataset.avisos));
    zonas.forEach(z => { z.textContent = (porCampo[z.dataset.avisos] || []).join(' · '); });
    general.textContent = Object.keys(porCampo).filter(k => !conZona.has(k)).map(k => porCampo[k].join(' · ')).join(' · ');
    if (pintarPlanta) pintarPlanta();
    refrescos.forEach(f => f());
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
        medida(p, 'ancho', 'Ancho', { rapidos: AJ.puerta_anchos, aviso: null }),
        medida(p, 'alto', 'Alto', { rapidos: AJ.puerta_altos, aviso: null }),
        medida(p, 'tabique', 'Grosor de tabique', { rapidos: AJ.puerta_tabiques, aviso: null }),
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
  // De qué es una toma o un enchufe: botones; tocar el marcado lo desmarca.
  function segmentadoChips(e) {
    const botones = usosDe(e.tipo).map(([v, t]) => h('button', { type: 'button', 'data-acc': 'para', 'data-v': v, class: e.para === v ? 'on' : '', onclick: ev => {
      e.para = e.para === v ? null : v;
      e.para_nombre = e.para ? t : null;
      botones.forEach(b => b.classList.toggle('on', b.dataset.v === e.para));
      const tit = ev.target.closest('.elemento').querySelector('[data-acc="nombre-elemento-titulo"]');
      if (tit) tit.textContent = nombreElemento(e);
      cambio();
    } }, t));
    return botones;
  }
  function elemento(e, lista, repintar) {
    const c = camposDeElemento(e.tipo);
    // Las mochetas (pilares) se miden siempre en centímetros.
    const medida = (obj, k, etiqueta, extra) => medidaGeneral(obj, k, etiqueta, Object.assign(e.tipo === 'pilar' ? { unidad: 'cm' } : {}, extra));
    const refExtra = { ref: e.ref, alCambiarRef: r => { e.ref = r; d.ref_ultima = r; cambio(); }, aviso: null };
    return h('div', { class: 'elemento', 'data-elemento': e.tipo },
      h('div', { class: 'cab' }, h('b', { 'data-acc': 'nombre-elemento-titulo' }, nombreElemento(e)), h('small', {}, c.punto === 'centro' ? 'medido al centro' : 'medido al borde'),
        h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-elemento', onclick: () => { if (confirmarQuitar(nombreElemento(e).toLowerCase())) { lista.splice(lista.indexOf(e), 1); cambio(); repintar(); } } }, 'Quitar')),
      usosDe(e.tipo).length ? h('div', { class: 'chips usos' }, segmentadoChips(e)) : null,
      e.tipo === 'otro' || e.tipo === 'zona' ? h('input', { 'data-acc': 'nombre-elemento', placeholder: e.tipo === 'zona' ? '¿Qué zona? (campana, fregadero…)' : '¿Qué es?', value: e.nombre, oninput: ev => { e.nombre = ev.target.value; cambio(); } }) : null,
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
    // La altura es una para toda la habitación; lo especial (vigas, buhardillas) va en notas.
    const zonaAlto = h('div', {});
    const pintarAlto = () => zonaAlto.replaceChildren(medida(d, 'alto_techo', 'Altura de suelo a techo', { unidad: enM() ? 'm' : unidad }),
      h('small', { class: 'ayuda' }, 'Si hay algo especial (una viga, una buhardilla, un techo inclinado), apúntalo en Notas.'));
    pintarAlto();
    // Planta dibujada con las medidas: se rehace con cada cambio.
    const zonaPlanta = h('div', { class: 'zona-planta' });
    pintarPlanta = () => {
      const g = geometriaPlanta(d, { margen: AJ.margen }), hijos = [];
      if (g.paredes.length) hijos.push(svgPlanta(g));
      if (g.paredes.length && !g.aEscala) hijos.push(h('small', { class: 'ayuda' }, 'Sin escala: faltan largos o las medidas no cierran.'));
      if (g.sinSituar.length) hijos.push(h('small', { class: 'ayuda', 'data-acc': 'sin-situar' }, 'Sin situar (falta la distancia o el largo de su pared): ' + g.sinSituar.map(e => e.etiqueta + ' en ' + e.pared).join(', ') + '.'));
      zonaPlanta.replaceChildren(...hijos);
    };
    const dibujar = async () => {
      await guardarYa();
      const largos = {}; d.paredes.forEach(p => { largos[p.letra] = p.largo; });
      const r = await abrirPlano({ plano: d.plano || null, largos, unidad: enM() ? 'm' : unidad, margen: AJ.margen });
      if (!r) return;
      Object.assign(d, aplicarPlano(d, r));
      await guardarYa(); repintar();
    };
    return [h('div', { class: 'cab' }, h('h2', {}, 'Habitación'),
      segmentado({ acc: 'ud-paredes', opciones: [[false, unidad], [true, 'm']], valor: !!enM(), alCambiar: v => { d.paredes_m = v; App.cambiarParedesM(v); cambio(); pintarAlto(); repintar(); } })),
    h('div', { class: 'tarjeta' }, zonaAlto),
    h('div', { class: 'tarjeta' }, h('div', { class: 'cab' }, h('b', {}, 'Planta'),
      h('button', { type: 'button', class: 'mini', 'data-acc': 'dibujar-planta', onclick: dibujar }, d.plano ? 'Editar la forma' : 'Dibujar la forma')), zonaPlanta),
    h('h2', {}, 'Paredes'),
    zona,
    h('button', { type: 'button', class: 'ancho', 'data-acc': 'anadir-pared', onclick: () => { d.paredes.push(paredNueva(d.paredes)); cambio(); repintar(); } }, '+ Añadir pared')];
  }
  function pared(p, tipos, repintarTodo, udPared) {
    const zonaEl = h('div', {});
    const repintar = () => { zonaEl.replaceChildren(...p.elementos.map(e => elemento(e, p.elementos, repintar))); refrescarAvisos(); };
    repintar();
    const pilares = h('div', { class: 'campo' }, h('label', { class: 'et' }, '¿Mochetas o pilares?'),
      segmentado({ acc: 'pilares', opciones: SI_NO, valor: p.pilares ?? null, permitirVacio: true, alCambiar: v => {
        p.pilares = v;
        if (v && !p.elementos.some(e => e.tipo === 'pilar')) p.elementos.push(elementoNuevo('pilar', d.ref_ultima));
        cambio(); repintar();
      } }));
    // Azulejo: sin, toda la pared, una franja (desde una altura hasta otra o hasta el techo) o por zonas.
    const zonaAzulejo = h('div', {});
    const pintarAzulejo = () => {
      const extra = [];
      if (p.azulejo === 'franja') {
        extra.push(h('div', { class: 'dos' }, medida(p, 'azulejo_desde', 'Desde (altura)', { aviso: null, unidad: udPared }),
          p.azulejo_techo ? null : medida(p, 'azulejo_hasta', 'Hasta (altura)', { aviso: null, unidad: udPared })),
        h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Hasta el techo'),
          segmentado({ acc: 'azulejo_techo', opciones: SI_NO, valor: p.azulejo_techo ?? null, permitirVacio: true, alCambiar: v => { p.azulejo_techo = v; cambio(); pintarAzulejo(); } })));
      }
      if (p.azulejo === 'zonas') {
        extra.push(h('button', { type: 'button', 'data-acc': 'anadir-zona', onclick: () => { p.elementos.push(elementoNuevo('zona', d.ref_ultima)); cambio(); repintar(); } }, '+ Zona azulejada (campana, fregadero…)'));
      }
      zonaAzulejo.replaceChildren(h('label', { class: 'et' }, 'Azulejo'),
        segmentado({ acc: 'azulejo', opciones: [['no', 'Sin'], ['toda', 'Toda'], ['franja', 'Franja'], ['zonas', 'Por zonas']], valor: p.azulejo ?? null, permitirVacio: true, alCambiar: v => { p.azulejo = v; cambio(); pintarAzulejo(); } }),
        ...extra);
    };
    pintarAzulejo();
    return h('div', { class: 'tarjeta', 'data-pared': p.letra },
      h('div', { class: 'cab' }, h('h3', {}, 'Pared ' + p.letra),
        h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-pared', onclick: () => { if (confirmarQuitar('la pared ' + p.letra)) { d.paredes.splice(d.paredes.indexOf(p), 1); cambio(); repintarTodo(); } } }, 'Quitar')),
      medida(p, 'largo', 'Largo', { aviso: null, unidad: udPared }),
      p.alto !== null && p.alto !== undefined ? medida(p, 'alto', 'Alto', { aviso: null, unidad: udPared }) : null,
      h('div', { class: 'avisos', 'data-avisos': 'pared.' + p.id }),
      pilares,
      h('div', { class: 'campo' }, zonaAzulejo),
      tipos === TIPOS_ELEMENTO.cocina ? muebles(p) : null,
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

  // ── Listas de izquierda a derecha (módulos de una fila, cuerpos de armario): una abierta, las demás resumidas ──
  function listaOrdenada({ lista, atributo, abierto, alAbrir, editor, resumen, repintar }) {
    return lista.map((m, i) => {
      const subir = h('button', { type: 'button', class: 'mini', 'data-acc': 'subir-modulo', 'aria-label': 'Mover a la izquierda', disabled: i === 0, onclick: () => { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; cambio(); repintar(); } }, '←');
      const quitar = h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-modulo', 'aria-label': 'Quitar', onclick: () => { if (confirmarQuitar(resumen(m).toLowerCase())) { lista.splice(i, 1); cambio(); repintar(); } } }, '✕');
      if (m.id === abierto()) return h('div', { class: 'modulo abierto', [atributo]: m.tipo || '' }, h('div', { class: 'cab' }, h('b', {}, resumen(m)), h('span', {}, subir, quitar)), editor(m));
      return h('div', { class: 'modulo', [atributo]: m.tipo || '' },
        h('button', { type: 'button', class: 'resumen', onclick: () => { alAbrir(m.id); repintar(); } }, resumen(m) + (m.ancho ? ' · ' + verMedida(m.ancho, 'cm') : '')), subir, quitar);
    });
  }

  // Módulos de una pared: bajos y altos, de izquierda a derecha, en cm, con el cuadre contra el largo.
  function muebles(p) {
    if (!p.bajos) p.bajos = [];
    if (!p.altos) p.altos = [];
    const caja = h('div', { class: 'campo' });
    const abiertos = { bajos: null, altos: null };
    function fila(nombre, titulo) {
      const zona = h('div', { class: 'modulos' }), cuadre = h('small', { class: 'cuadre', 'data-acc': 'cuadre-' + nombre });
      // Arriba solo se cuadra si hay altos: las columnas solas no son una fila de altos.
      const pintarCuadre = () => { cuadre.textContent = nombre === 'altos' && !p.altos.length ? '' : textoCuadre(nombre === 'bajos' ? cuadreBajos(p) : cuadreAltos(p), 'cm'); };
      const repintar = () => {
        zona.replaceChildren(...listaOrdenada({ lista: p[nombre], atributo: 'data-modulo', abierto: () => abiertos[nombre], alAbrir: idm => { abiertos[nombre] = idm; }, repintar,
          resumen: nombreModulo,
          editor: m => [m.tipo === 'otro' ? h('input', { 'data-acc': 'nombre-modulo', placeholder: '¿Qué módulo?', value: m.nombre, oninput: ev => { m.nombre = ev.target.value; cambio(); } }) : null,
            campoMedida({ etiqueta: 'Ancho', acc: 'ancho', valor: m.ancho, mal: m.mal && m.mal.ancho, unidad: 'cm', rapidos: AJ.modulo_anchos, alCambiar: (v, t) => { anotarMedida(m, 'ancho', v, t); cambio(); pintarCuadre(); } })] }));
        pintarCuadre(); refrescarAvisos();
      };
      refrescos.push(pintarCuadre);
      repintar();
      return h('div', { 'data-fila': nombre }, h('label', { class: 'et' }, titulo), zona, cuadre,
        h('div', { class: 'chips' }, TIPOS_MODULO[nombre].map(t => h('button', { type: 'button', 'data-acc': 'anadir-modulo', 'data-v': t, onclick: () => {
          const m = moduloNuevo(t); p[nombre].push(m); abiertos[nombre] = m.id; cambio(); repintar();
        } }, NOMBRE_MODULO[t]))));
    }
    caja.append(h('label', { class: 'et' }, 'Muebles, de izquierda a derecha'), fila('bajos', 'Bajos y columnas'), fila('altos', 'Altos'));
    return caja;
  }

  // Cuerpos de armario, de izquierda a derecha, con su ancho y su interior.
  function cuerpos() {
    if (!d.cuerpos) d.cuerpos = [];
    const zona = h('div', { class: 'modulos' }), cuadre = h('small', { class: 'cuadre', 'data-acc': 'cuadre-cuerpos' });
    let abierto = null;
    const pintarCuadre = () => { cuadre.textContent = textoCuadre(cuadreCuerpos(d), 'cm'); };
    const interiores = AJ.interiores.concat([['otro', 'Otro']]);
    const repintar = () => {
      zona.replaceChildren(...listaOrdenada({ lista: d.cuerpos, atributo: 'data-cuerpo', abierto: () => abierto, alAbrir: idc => { abierto = idc; }, repintar,
        resumen: c => 'Cuerpo ' + (d.cuerpos.indexOf(c) + 1) + (c.interior ? ' · ' + (c.interior === 'otro' ? c.nombre || 'otro' : nombreInterior(c.interior, AJ).toLowerCase()) : ''),
        editor: c => [campoMedida({ etiqueta: 'Ancho', acc: 'ancho', valor: c.ancho, mal: c.mal && c.mal.ancho, unidad: 'cm', rapidos: AJ.modulo_anchos, alCambiar: (v, t) => { anotarMedida(c, 'ancho', v, t); cambio(); pintarCuadre(); } }),
          h('label', { class: 'et' }, 'Interior'),
          h('div', { class: 'chips' }, interiores.map(([v, t]) => h('button', { type: 'button', 'data-acc': 'interior', 'data-v': v, class: c.interior === v ? 'on' : '', onclick: () => { c.interior = c.interior === v ? null : v; cambio(); repintar(); } }, t))),
          c.interior === 'otro' ? h('input', { 'data-acc': 'nombre-cuerpo', placeholder: '¿Qué interior?', value: c.nombre || '', oninput: ev => { c.nombre = ev.target.value; cambio(); } }) : null] }));
      pintarCuadre(); refrescarAvisos();
    };
    refrescos.push(pintarCuadre);
    repintar();
    return [h('h2', {}, 'Cuerpos, de izquierda a derecha'), zona, cuadre,
      h('button', { type: 'button', class: 'ancho', 'data-acc': 'anadir-cuerpo', onclick: () => { const c = { id: nuevoId(), ancho: null, interior: null, nombre: '' }; d.cuerpos.push(c); abierto = c.id; cambio(); repintar(); } }, '+ Añadir cuerpo')];
  }

  const texto = (obj, k, acc, ph) => h('input', { 'data-acc': acc, placeholder: ph, value: obj[k] || '', oninput: ev => { obj[k] = ev.target.value; cambio(); } });

  // Acabados de cocina: modelo y color (o por separado altos y bajos si es bitono), encimera y lineales.
  function acabados() {
    if (!d.acabados) d.acabados = acabadosNuevos();
    const ac = d.acabados, caja = h('div', { class: 'tarjeta' }), zonaLin = h('div', { class: 'lista' });
    const pintarLineales = () => zonaLin.replaceChildren(...ac.lineales.map(l => h('div', { class: 'libre', 'data-lineal': l.tipo },
      l.tipo === 'otro' ? texto(l, 'nombre', 'lineal-nombre', '¿Qué lineal?') : h('span', {}, nombreLineal(l, AJ)),
      texto(l, 'modelo', 'lineal-modelo', 'Modelo o color'),
      h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-lineal', onclick: () => { if (confirmarQuitar(nombreLineal(l, AJ).toLowerCase())) { ac.lineales.splice(ac.lineales.indexOf(l), 1); cambio(); pintarLineales(); } } }, '✕'))));
    const pintar = () => {
      caja.replaceChildren(h('b', {}, 'Acabados'),
        h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Bitono (altos y bajos distintos)'),
          segmentado({ acc: 'bitono', opciones: SI_NO, valor: ac.bitono, permitirVacio: true, alCambiar: v => { ac.bitono = v; cambio(); pintar(); } })),
        ...(ac.bitono
          ? [h('label', { class: 'et' }, 'Altos'), h('div', { class: 'dos' }, texto(ac, 'modelo_altos', 'acab-modelo_altos', 'Modelo'), texto(ac, 'color_altos', 'acab-color_altos', 'Color')),
            h('label', { class: 'et' }, 'Bajos'), h('div', { class: 'dos' }, texto(ac, 'modelo_bajos', 'acab-modelo_bajos', 'Modelo'), texto(ac, 'color_bajos', 'acab-color_bajos', 'Color'))]
          : [h('label', { class: 'et' }, 'Muebles'), h('div', { class: 'dos' }, texto(ac, 'modelo', 'acab-modelo', 'Modelo'), texto(ac, 'color', 'acab-color', 'Color'))]),
        h('label', { class: 'et' }, 'Encimera'),
        h('div', { class: 'dos' }, texto(ac.encimera, 'material', 'encimera-material', 'Material o modelo'), texto(ac.encimera, 'color', 'encimera-color', 'Color')),
        campoMedida({ etiqueta: 'Grueso', acc: 'encimera-grueso', valor: ac.encimera.grueso, unidad: 'mm', alCambiar: v => { ac.encimera.grueso = v; cambio(); } }),
        h('label', { class: 'et' }, 'Lineales'), zonaLin,
        h('div', { class: 'chips' }, AJ.lineales.concat([['otro', 'Otro']]).map(([v, t]) => h('button', { type: 'button', 'data-acc': 'anadir-lineal', 'data-v': v, onclick: () => { ac.lineales.push(lineaNueva(v)); cambio(); pintarLineales(); } }, t))));
      pintarLineales();
    };
    pintar();
    return caja;
  }

  function propios() {
    if (ficha.tipo === 'puerta') return [h('div', { class: 'tarjeta' }, h('b', {}, 'Para todas las puertas'), h('div', { class: 'dos' }, texto(d, 'modelo', 'puertas-modelo', 'Modelo'), texto(d, 'color', 'puertas-color', 'Color'))), ...puertas()];
    if (ficha.tipo === 'cocina') return [acabados(), ...paredes(TIPOS_ELEMENTO.cocina)];
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
      r.push(...cuerpos());
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
