// Una ficha: sus huecos según el tipo y, en todas, medidas libres, notas, croquis y fotos.
import { h, segmentado, tituloFicha, vivos, icono } from '../util.js';
import { unidadDe } from '../unidades.js';
import { nombrarPuerta, CORTO_ELEMENTO, HUMOS_DIAMETROS, HUMOS_RECTANGULARES, islaNueva, avisos, camposDeElemento, elementoNuevo, paredNueva, puertaNueva, normalizarFicha, resumenPuerta, limpiarDatos, tieneInformacion,
  TIPOS_ELEMENTO, NOMBRE_ELEMENTO, RAPIDAS_PUERTA, USOS, nombreElemento, tiposPuertaPara, otraHoja, anchoFijo, pilarEnPunta, esquinaDe, esquinaDescuadrada } from '../modelo.js';
import { duplicarFicha } from '../trabajos.js';
import { campoMedida, campoEntero } from '../campos.js';
import { verMedida } from '../unidades.js';
import { TIPOS_MODULO, NOMBRE_MODULO, CORTO_MODULO, moduloNuevo, nombreModulo, medidasModulo, anchosDe, FORMAS_RINCONERO, LADOS_RINCONERO, paredesVecinas, cuadreBajos, cuadreAltos, cuadreCuerpos, cuadreCuerposPared, FORMAS_RINCON_CUERPO, LADOS_RINCON_CUERPO, INTERIOR_RINCON, textoRincon, textoCuadre, lineaNueva, nombreLineal, nombreInterior, interioresDe, elegirInterior, textoInteriores, acabadosNuevos, MATERIALES_ENCIMERA, ELECTRO, datosElectro, electroNuevo } from '../modulos.js';
import { seccionAdjuntos } from './adjuntos.js';
import { textoMaterial } from '../material.js';
import { textoResumen, urlWhatsapp } from '../resumen.js';
import { huella } from '../sincro.js';
import { geometriaPlanta, svgPlanta, aplicarPlano, pilarEnParedes, pilaresEnParedes, pasarAPilar } from '../plano-vista.js';
import { abrirPlano } from '../plano-editor.js';
import { geometriaAlzado, svgAlzado } from '../alzado.js';
import { vistaInteractiva, abrirPerspectivaGrande } from './perspectiva-ui.js';

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
  // En el vestidor los usos de enchufe son de cocina (placa, campana...): no se ofrecen.
  const usosDe = t => (t === 'toma' ? AJ.usos_toma : t === 'enchufe' && ficha.subtipo !== 'vestidor' ? AJ.usos_enchufe : []);
  // En la cabecera, junto al nombre: ver el resumen o mandarlo por WhatsApp tal como está ahora.
  const main = App.marco('ficha', tituloFicha(ficha), trabajo ? '#/trabajo/' + trabajo.id : '#/sueltas', [
    icono(h('button', { type: 'button', class: 'boton-cab', 'data-acc': 'cab-resumen', onclick: async () => { await guardarYa(); App.ir('#/resumen/' + id); } }), 'resumen', 'Ver resumen'),
    icono(h('a', { class: 'boton-cab wa', href: '#', target: '_blank', rel: 'noopener', 'data-acc': 'cab-whatsapp',
      onclick: ev => { ev.currentTarget.href = urlWhatsapp(textoResumen({ ficha, trabajo, ajustes: AJ })); guardarYa(); } }), 'whatsapp', 'Enviar por WhatsApp')]);

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
  // Plegar: tocar el título de una pared, un bloque o un apartado lo esconde (y otra vez lo enseña).
  // Se recuerda en este dispositivo: los bloques, para todas las fichas; las paredes, por ficha.
  const hay = v => v !== null && v !== undefined;
  const PLEG = 'med-plegado';
  const plegados = () => { try { return JSON.parse(localStorage.getItem(PLEG)) || {}; } catch { return {}; } };
  function plegador(titulo, clave, alCambiar) {
    titulo.classList.add('plegador'); titulo.dataset.plegar = clave;
    const aplicar = v => { titulo.classList.toggle('cerrado', v); alCambiar(v); };
    aplicar(!!plegados()[clave]);
    titulo.addEventListener('click', ev => {
      if (ev.target !== titulo && ev.target.closest('button, input, select, a, textarea')) return;
      const m = plegados(), v = !m[clave];
      if (v) m[clave] = true; else delete m[clave];
      try { localStorage.setItem(PLEG, JSON.stringify(m)); } catch { /* sin almacenamiento: solo en pantalla */ }
      aplicar(v);
    });
    return titulo;
  }
  const plegarCaja = (caja, titulo, clave) => { plegador(titulo, clave, v => caja.classList.toggle('plegado', v)); return caja; };
  const confirmarQuitar = que => confirm('¿Quitar ' + que + '?');
  // Descuadre de una esquina o de la cara de un pilar: a escuadra, abre (más de 90°) o cierra (menos), y cuánto.
  // valor() lee lo guardado; poner(v) lo guarda. conEn: pedir también en cuánto largo se mide (las esquinas).
  function editorDescuadre({ titulo, acc, valor, poner, conEn, alCambiarEstado }) {
    const zona = h('div', { class: 'campo descuadre', 'data-acc': acc });
    const pintar = () => {
      const v = valor() || { estado: 'escuadra', sentido: null, mm: null, en: 1000 }, des = esquinaDescuadrada(v);
      zona.replaceChildren(h('label', { class: 'et' }, titulo),
        segmentado({ acc: 'descuadre', opciones: [['escuadra', 'A escuadra'], ['abierta', 'Abre'], ['cerrada', 'Cierra']], valor: des ? (v.sentido || 'abierta') : 'escuadra',
          alCambiar: x => {
            poner(x === 'escuadra' ? Object.assign({}, v, { estado: 'escuadra' }) : Object.assign({}, v, { estado: 'descuadrada', sentido: x, en: conEn ? (v.en ?? 1000) : null }));
            cambio(); pintar(); if (alCambiarEstado) alCambiarEstado();
          } }),
        des ? h('div', { class: 'dos' },
          campoMedida({ etiqueta: 'Se desvía', acc: 'desvio', valor: v.mm, unidad: 'mm', alCambiar: n => { poner(Object.assign({}, valor(), { mm: n })); cambio(); } }),
          conEn ? campoMedida({ etiqueta: 'En (largo medido)', acc: 'desvio-en', valor: v.en, unidad: 'cm', rapidos: [500, 1000], alCambiar: n => { poner(Object.assign({}, valor(), { en: n })); cambio(); } }) : null) : null);
    };
    pintar();
    return zona;
  }
  const medida = (obj, k, etiqueta, extra) => campoMedida(Object.assign({ etiqueta, acc: k, valor: obj[k], mal: obj.mal && obj.mal[k], unidad, aviso: k,
    alCambiar: (v, textoMal) => { anotarMedida(obj, k, v, textoMal); cambio(); } }, extra));
  const medidaGeneral = medida;
  const siNo = (obj, k, etiqueta) => h('div', { class: 'campo' }, h('label', { class: 'et' }, etiqueta),
    segmentado({ acc: k, opciones: SI_NO, valor: obj[k], permitirVacio: true, alCambiar: v => { obj[k] = v; cambio(); } }));

  // Ficha de puertas con nombre de zona (varias en un trabajo: Piso 1, Piso 2, Bajo…), con botones rápidos.
  function nombreZona() {
    const input = h('input', { 'data-acc': 'nombre-ficha', placeholder: 'Zona (Piso 1, Bajo, Casa…)', value: ficha.nombre, oninput: ev => { ficha.nombre = ev.target.value; cambio(); } });
    return h('div', { class: 'campo' }, input,
      h('div', { class: 'chips' }, ['Bajo', 'Piso 1', 'Piso 2', 'Piso 3', 'Ático'].map(z => h('button', { type: 'button', 'data-acc': 'zona-rapida', 'data-v': z,
        onclick: () => { ficha.nombre = z; input.value = z; cambio(); } }, z))));
  }
  const premarco = () => d.medida === 'premarco';
  let repintarPuertas = () => {};
  // ── Puertas: varias por ficha; solo una abierta, las demás en una línea ──
  function puertas() {
    const zona = h('div', { class: 'lista' });
    let abierta = d.puertas.length ? d.puertas[d.puertas.length - 1].id : null;
    const nombre = (p, i) => p.nombre || 'Puerta ' + (i + 1);
    function editor(p, i) {
      return h('div', { class: 'tarjeta abierta', 'data-puerta': '' },
        h('div', { class: 'cab' },
          h('button', { type: 'button', class: 'resumen titulo-modulo', 'data-acc': 'cerrar-puerta', title: 'Cerrar', onclick: () => { abierta = null; repintar(); } }, h('h3', {}, nombre(p, i) + ' ▴')),
          h('span', { class: 'botones-puerta' },
            i > 0 ? h('button', { type: 'button', class: 'mini', 'data-acc': 'subir-puerta', 'aria-label': 'Subir', title: 'Subir', onclick: () => { [d.puertas[i - 1], d.puertas[i]] = [d.puertas[i], d.puertas[i - 1]]; cambio(); repintar(); } }, '↑') : null,
            h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-puerta', onclick: () => {
              if (!confirmarQuitar(nombre(p, i).toLowerCase())) return;
              d.puertas.splice(d.puertas.indexOf(p), 1); abierta = null; cambio(); repintar();
            } }, 'Quitar'))),
        h('input', { 'data-acc': 'nombre-puerta', placeholder: 'Nombre (o déjalo: Puerta ' + (i + 1) + ')', value: p.nombre, oninput: ev => { p.nombre = ev.target.value; cambio(); } }),
        // Nombres rápidos: si se repite uno, se numeran solos.
        h('div', { class: 'chips nombres-rapidos' }, AJ.nombres_puerta.map(([, t]) => h('button', { type: 'button', 'data-acc': 'nombre-rapido', 'data-v': t,
          onclick: () => { nombrarPuerta(d.puertas, p, t); cambio(); repintar(); } }, t))),
        medida(p, 'ancho', premarco() ? 'Ancho del premarco' : 'Ancho', { rapidos: premarco() ? AJ.premarco_anchos : AJ.puerta_anchos, aviso: null }),
        medida(p, 'alto', premarco() ? 'Alto del premarco' : 'Alto', { rapidos: premarco() ? AJ.premarco_altos : AJ.puerta_altos, aviso: null }),
        medida(p, 'tabique', 'Tabique', { rapidos: AJ.puerta_tabiques, aviso: null }),
        h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Tipo'),
          segmentado({ acc: 'tipo-puerta', opciones: tiposPuertaPara(p), valor: p.tipo || null, permitirVacio: true, alCambiar: v => { p.tipo = v; if (v === 'doble' || v === 'corredera') quitarFijo(p); cambio(); repintar(); } })),
        ...extrasPuerta(p),
        h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Abre a (desde el pasillo)'),
          segmentado({ acc: 'mano', opciones: [['izq', '← Izquierda'], ['der', 'Derecha →']], valor: p.mano, permitirVacio: true, alCambiar: v => { p.mano = v; cambio(); } })),
        // Lo que lleva o no lleva: un toque lo marca (verde) y otro lo quita.
        h('div', { class: 'chips interruptores' },
          interruptor(p, 'condena', 'Condena'), interruptor(p, 'vidriera', 'Vidriera'), ...botonFijo(p)),
        h('div', { class: 'avisos', 'data-avisos': 'puerta.' + p.id }));
    }
    const quitarFijo = p => { ['fijo', 'puerta_ancho', 'fijo_lado'].forEach(k => delete p[k]); if (p.mal) delete p.mal.puerta_ancho; };
    const interruptor = (obj, k, texto) => h('button', { type: 'button', 'data-acc': k, 'data-v': 'true', class: obj[k] ? 'on si' : '', 'aria-pressed': obj[k] ? 'true' : 'false',
      onclick: ev => { obj[k] = !obj[k]; ev.currentTarget.classList.toggle('on', obj[k]); ev.currentTarget.classList.toggle('si', obj[k]); ev.currentTarget.setAttribute('aria-pressed', String(obj[k])); cambio(); } }, (obj[k] ? '✓ ' : '') + texto);
    const botonFijo = p => (p.tipo === 'doble' || p.tipo === 'corredera' || p.tipo === 'fija' || p.fijo ? []
      : [h('button', { type: 'button', 'data-acc': 'fijo', onclick: () => { p.fijo = true; cambio(); repintar(); } }, '＋ Paño fijo')]);
    // Doble: ¿hojas iguales? Si no, el ancho de cada una. Paño fijo en cualquier puerta: ancho y lado.
    function extrasPuerta(p) {
      const n = [];
      if (p.tipo === 'doble') {
        n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Hojas'),
          segmentado({ acc: 'hojas-iguales', opciones: [[true, 'Iguales'], [false, 'Distintas']], valor: p.hojas_iguales ?? null, permitirVacio: true, alCambiar: v => { p.hojas_iguales = v; cambio(); repintar(); } })));
        if (p.hojas_iguales === false) {
          const otra = h('small', { class: 'ayuda', 'data-acc': 'otra-hoja' });
          const pintarOtra = () => { const o = otraHoja(p); otra.textContent = o !== null ? 'La otra hoja: ' + verMedida(o, unidad) + ' ' + unidad : (p.fijo ? 'La otra hoja sale sola con el ancho de la puerta y el de esta.' : 'La otra hoja sale sola con el ancho total y el de esta.'); };
          pintarOtra(); refrescos.push(() => { if (otra.isConnected) pintarOtra(); });
          n.push(medida(p, 'hoja1', 'Ancho de la hoja que abre', { aviso: null }), otra);
        }
      }
      // Paño fijo: poco frecuente y solo en abatibles; su botón va con condena y vidriera, y aquí sus campos.
      if (p.tipo === 'doble' || p.tipo === 'corredera' || p.tipo === 'fija' || !p.fijo) return n;
      {
        n.push(h('div', { class: 'cab' }, h('label', { class: 'et' }, 'Paño fijo al lado'),
          h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-fijo', onclick: () => { quitarFijo(p); cambio(); repintar(); } }, 'Quitar paño')));
        const paño = h('small', { class: 'ayuda', 'data-acc': 'ancho-fijo' });
        const pintarFijo = () => { const f = anchoFijo(p); paño.textContent = f !== null ? 'El paño fijo: ' + verMedida(f, unidad) + ' ' + unidad + ' (ancho total menos la puerta)' : 'Arriba, el ancho total del hueco; aquí el de la puerta, y el paño sale solo.'; };
        pintarFijo(); refrescos.push(() => { if (paño.isConnected) pintarFijo(); });
        n.push(medida(p, 'puerta_ancho', 'Ancho de la puerta (sin el paño)', { rapidos: AJ.puerta_anchos, aviso: null }), paño,
        h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Lado del paño (mirando desde el pasillo)'),
          segmentado({ acc: 'fijo-lado', opciones: [['izq', 'Izquierda'], ['der', 'Derecha']], valor: p.fijo_lado || null, permitirVacio: true, alCambiar: v => { p.fijo_lado = v; cambio(); } })));
      }
      return n;
    }
    function resumen(p, i) {
      return h('div', { class: 'tarjeta puerta-cerrada', 'data-puerta': '' },
        h('button', { type: 'button', class: 'resumen', 'data-acc': 'abrir-puerta', onclick: () => { abierta = p.id; repintar(); } },
          h('b', {}, nombre(p, i)), h('small', {}, resumenPuerta(p, unidad))),
        i > 0 ? h('button', { type: 'button', class: 'mini', 'data-acc': 'subir-puerta', 'aria-label': 'Subir', title: 'Subir', onclick: () => { [d.puertas[i - 1], d.puertas[i]] = [d.puertas[i], d.puertas[i - 1]]; cambio(); repintar(); } }, '↑') : null,
        h('div', { class: 'avisos', 'data-avisos': 'puerta.' + p.id }));
    }
    function repintar() {
      zona.replaceChildren(...d.puertas.map((p, i) => (p.id === abierta ? editor : resumen)(p, i)));
      refrescarAvisos();
    }
    repintarPuertas = repintar;
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
  // Si en la punta desde la que se mide hay un pilar, se pregunta si la medida es desde la esquina o desde el pilar.
  function medidoDesde(e, pared) {
    const zona = h('div', { class: 'campo desde-pilar', 'data-acc': 'zona-desde' });
    const pintar = () => {
      const ancho = e.tipo === 'pilar' || !pared ? null : pilarEnPunta(d, pared, e.ref === 'der' ? 'der' : 'izq');
      if (ancho === null) { zona.replaceChildren(); zona.hidden = true; return; }
      zona.hidden = false;
      zona.replaceChildren(h('label', { class: 'et' }, 'Medido desde (hay un pilar de ' + verMedida(ancho, 'cm') + ' cm en esa esquina)'),
        segmentado({ acc: 'desde', opciones: [['esquina', 'Esquina'], ['pilar', 'Pilar']], valor: e.desde === 'pilar' ? 'pilar' : 'esquina',
          alCambiar: v => { if (v === 'pilar') e.desde = 'pilar'; else delete e.desde; cambio(); } }));
    };
    pintar(); refrescos.push(() => { if (zona.isConnected) pintar(); });
    return zona;
  }
  // Salida de humos: redonda (diámetro en mm) o rectangular (ancho × alto en cm), con las medidas habituales a un toque.
  function tamanoHumosEditor(e, repintarPared) {
    const zona = h('div', { class: 'campo humos' });
    const pintar = () => {
      const n = [h('label', { class: 'et' }, 'Salida'),
        segmentado({ acc: 'humos-forma', opciones: [['redonda', 'Redonda'], ['rectangular', 'Rectangular'], ['recirculacion', 'Recirculación']], valor: e.humos_forma || null, permitirVacio: true,
          alCambiar: v => { const antes = e.humos_forma; e.humos_forma = v; cambio(); if ((antes === 'recirculacion') !== (v === 'recirculacion')) repintarPared(); else pintar(); } })];
      if (e.humos_forma === 'redonda') n.push(campoMedida({ etiqueta: 'Diámetro', acc: 'diametro', valor: e.diametro, mal: e.mal && e.mal.diametro, unidad: 'mm', rapidos: HUMOS_DIAMETROS,
        alCambiar: (v, t) => { anotarMedida(e, 'diametro', v, t); cambio(); } }));
      if (e.humos_forma === 'rectangular') {
        n.push(h('div', { class: 'chips' }, HUMOS_RECTANGULARES.map(([an, al]) => h('button', { type: 'button', 'data-acc': 'humos-rapido', 'data-v': an + 'x' + al,
          class: e.rect_ancho === an && e.rect_alto === al ? 'on' : '', onclick: () => { e.rect_ancho = an; e.rect_alto = al; cambio(); pintar(); } }, verMedida(an, 'cm') + '×' + verMedida(al, 'cm')))),
          h('div', { class: 'dos' },
            campoMedida({ etiqueta: 'Ancho', acc: 'rect_ancho', valor: e.rect_ancho, mal: e.mal && e.mal.rect_ancho, unidad: 'cm', alCambiar: (v, t) => { anotarMedida(e, 'rect_ancho', v, t); cambio(); } }),
            campoMedida({ etiqueta: 'Alto', acc: 'rect_alto', valor: e.rect_alto, mal: e.mal && e.mal.rect_alto, unidad: 'cm', alCambiar: (v, t) => { anotarMedida(e, 'rect_alto', v, t); cambio(); } })));
      }
      zona.replaceChildren(...n);
    };
    pintar();
    return zona;
  }
  function elemento(e, lista, repintar, pared) {
    const c = camposDeElemento(e.tipo);
    // Las mochetas (pilares) se miden siempre en centímetros.
    const medida = (obj, k, etiqueta, extra) => medidaGeneral(obj, k, etiqueta, Object.assign(e.tipo === 'pilar' ? { unidad: 'cm' } : {}, extra));
    const refExtra = { ref: e.ref, alCambiarRef: r => { e.ref = r; d.ref_ultima = r; cambio(); }, aviso: null };
    return h('div', { class: 'elemento', 'data-elemento': e.tipo },
      h('div', { class: 'cab' }, h('b', { 'data-acc': 'nombre-elemento-titulo' }, nombreElemento(e)), h('small', {}, c.punto === 'centro' ? 'medido al centro' : 'medido al borde'),
        h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-elemento', onclick: () => { if (confirmarQuitar(nombreElemento(e).toLowerCase())) { lista.splice(lista.indexOf(e), 1); cambio(); repintar(); } } }, 'Quitar')),
      usosDe(e.tipo).length ? h('div', { class: 'chips usos' }, segmentadoChips(e)) : null,
      e.tipo === 'humos' && e.humos_forma !== 'recirculacion' ? h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Sale por'),
        segmentado({ acc: 'humos-sale', opciones: [['pared', 'Pared'], ['techo', 'Techo']], valor: e.humos_sale || 'pared', alCambiar: v => { e.humos_sale = v; cambio(); repintar(); } })) : null,
      e.tipo === 'humos' ? tamanoHumosEditor(e, repintar) : null,
      e.tipo === 'otro' || e.tipo === 'zona' ? h('input', { 'data-acc': 'nombre-elemento', placeholder: e.tipo === 'zona' ? '¿Qué zona? (campana, fregadero…)' : '¿Qué es?', value: e.nombre, oninput: ev => { e.nombre = ev.target.value; cambio(); } }) : null,
      h('div', { class: 'dos' }, medida(e, 'distancia', 'Distancia', refExtra),
        e.tipo === 'humos' && e.humos_forma === 'recirculacion' ? null
          : e.tipo === 'humos' && e.humos_sale === 'techo' ? medida(e, 'separacion', 'Separación de la pared', { aviso: null })
          : c.altura ? medida(e, 'altura', e.tipo === 'ventana' ? 'Alféizar (altura del suelo)' : 'Altura del suelo', { aviso: null }) : null),
      medidoDesde(e, pared),
      c.ancho || c.alto || c.fondo ? h('div', { class: 'dos' },
        c.ancho ? medida(e, 'ancho', 'Ancho', { aviso: null }) : null,
        c.alto && !(e.tipo === 'zona' && e.techo) ? medida(e, 'alto', 'Alto', { aviso: null }) : null,
        c.fondo ? medida(e, 'fondo', 'Sobresale de la pared', { aviso: null }) : null) : null,
      e.tipo === 'pilar' ? editorDescuadre({ titulo: 'Cara del pilar', acc: 'descuadre-pilar', valor: () => e.esquina, poner: v => { e.esquina = v; } }) : null,
      // Una zona azulejada puede subir hasta el techo: entonces no hace falta su alto.
      e.tipo === 'zona' ? h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Hasta el techo'),
        segmentado({ acc: 'techo', opciones: SI_NO, valor: e.techo ?? null, permitirVacio: true, alCambiar: v => { e.techo = v; cambio(); repintar(); } })) : null,
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
      h('small', { class: 'ayuda' }, 'Vigas, buhardillas o techos inclinados: en una nota.'));
    pintarAlto();
    // Alzados: una pared de frente, elegida con su letra; se rehace con cada cambio, como la planta.
    const zonaAlzado = h('div', { class: 'zona-alzado' }), botonesAlzado = h('div', { class: 'chips' });
    let paredAlzado = null;
    function pintarAlzado() {
      const letras = d.paredes.map(p => p.letra);
      if (!letras.includes(paredAlzado)) paredAlzado = letras[0] || null;
      botonesAlzado.replaceChildren(...letras.map(l => h('button', { type: 'button', 'data-acc': 'alzado-pared', 'data-v': l, class: l === paredAlzado ? 'on' : '',
        onclick: () => { paredAlzado = l; pintarAlzado(); } }, 'Pared ' + l)));
      const p = d.paredes.find(x => x.letra === paredAlzado), g = p ? geometriaAlzado(d, p, AJ) : null;
      zonaAlzado.replaceChildren(...(g ? [svgAlzado(g, { unidad }), g.techoMedido ? null : h('small', { class: 'ayuda' }, 'Sin la altura del techo: dibujado con 2,50 m.'),
        h('small', { class: 'ayuda' }, 'Alturas de muebles orientativas.')].filter(Boolean)
        : [h('small', { class: 'ayuda' }, 'Pon el largo de la pared para verla de frente.')]));
    }
    // Perspectiva, de pie con los ojos a 175 cm; también a pantalla completa.
    const zonaPersp = h('div', { class: 'zona-perspectiva' });
    const pintarPerspectiva = () => zonaPersp.replaceChildren(vistaInteractiva({ d, margen: AJ.margen, ajustes: AJ, alGuardar: cambio,
      alAmpliar: () => abrirPerspectivaGrande({ d, margen: AJ.margen, ajustes: AJ, alGuardar: cambio, alCerrar: pintarPerspectiva }) }));
    // Planta dibujada con las medidas: se rehace con cada cambio.
    const zonaPlanta = h('div', { class: 'zona-planta' });
    pintarPlanta = () => {
      const g = geometriaPlanta(d, { margen: AJ.margen, unidad }), hijos = [];
      if (g.paredes.length) hijos.push(svgPlanta(g));
      if (g.paredes.length && !g.aEscala) hijos.push(h('small', { class: 'ayuda' }, 'Sin escala: faltan largos o las medidas no cierran.'));
      if (!d.plano && d.paredes.length >= 5) hijos.push(h('small', { class: 'ayuda', 'data-acc': 'aviso-forma' }, 'Con 5 o más paredes el dibujo es aproximado (todas en ángulo recto). Pulsa «Dibujar la forma» para que se parezca.'));
      // Planos de antes con un pilar dibujado como paredes: se ofrece pasarlo a mocheta de su pared.
      const pps = pilarEnParedes(d) ? pilaresEnParedes(d) : [];
      if (pps.length) {
        const lista = pps.map(pp => pp.paredes.join('-') + ' → pilar de ' + pp.en).join(', ');
        hijos.push(h('div', { class: 'aviso-pilares', 'data-acc': 'pilar-en-paredes' },
          h('span', {}, '▪ ' + (pps.length > 1 ? 'Parecen pilares: ' : 'Parece un pilar: ') + lista + '. '),
          h('button', { type: 'button', class: 'mini', 'data-acc': 'pasar-a-pilar', onclick: () => {
            if (!confirm('¿Pasar a pilar? ' + lista + '. Las paredes cambian de letra.')) return;
            Object.assign(d, pasarAPilar(d)); cambio(); repintar(); pintarPlanta();
          } }, pps.length > 1 ? 'Pasar los ' + pps.length + ' a pilar' : 'Pasar a pilar de ' + pps[0].en)));
      }
      if (g.sinSituar.length) hijos.push(h('small', { class: 'ayuda', 'data-acc': 'sin-situar' }, 'Sin situar (falta la distancia o el largo de su pared): ' + g.sinSituar.map(e => e.etiqueta + ' en ' + e.pared).join(', ') + '.'));
      zonaPlanta.replaceChildren(...hijos);
      pintarAlzado();
      if (!document.querySelector('.capa-perspectiva')) pintarPerspectiva();
    };
    const dibujar = async () => {
      await guardarYa();
      const largos = {}; d.paredes.forEach(p => { largos[p.letra] = p.largo; });
      const r = await abrirPlano({ plano: d.plano || null, largos, unidad: enM() ? 'm' : unidad, margen: AJ.margen });
      if (!r) return;
      Object.assign(d, aplicarPlano(d, r));
      await guardarYa(); repintar();
      botonForma.textContent = 'Editar la forma';
    };
    const botonForma = h('button', { type: 'button', class: 'mini', 'data-acc': 'dibujar-planta', onclick: dibujar }, d.plano ? 'Editar la forma' : 'Dibujar la forma');
    return [h('div', { class: 'cab' }, h('h2', {}, 'Habitación'),
      segmentado({ acc: 'ud-paredes', opciones: [[false, unidad], [true, 'm']], valor: !!enM(), alCambiar: v => { d.paredes_m = v; App.cambiarParedesM(v); cambio(); pintarAlto(); repintar(); } })),
    // Altura y planta juntas: en el ordenador van a la derecha y se quedan fijas al bajar.
    h('div', { class: 'lateral' },
      h('div', { class: 'tarjeta' }, zonaAlto),
      (() => { const t = h('b', {}, 'Planta'); return plegarCaja(h('div', { class: 'tarjeta tarjeta-planta' }, h('div', { class: 'cab' }, t, botonForma), zonaPlanta), t, 'lat:planta'); })(),
      (() => { const t = h('b', {}, 'Paredes de frente'); return plegarCaja(h('div', { class: 'tarjeta tarjeta-alzado' }, t, botonesAlzado, zonaAlzado), t, 'lat:alzado'); })(),
      (() => { const t = h('b', {}, 'Perspectiva'); return plegarCaja(h('div', { class: 'tarjeta tarjeta-perspectiva' }, t, zonaPersp), t, 'lat:perspectiva'); })()),
    h('h2', {}, 'Paredes'),
    zona,
    h('button', { type: 'button', class: 'ancho', 'data-acc': 'anadir-pared', onclick: () => { d.paredes.push(paredNueva(d.paredes)); cambio(); repintar(); } }, '+ Añadir pared')];
  }
  const seccion = (clase, titulo, ...hijos) => {
    const t = h('h4', {}, titulo);
    return plegarCaja(h('section', { class: 'sec-pared sec-' + clase, 'data-sec': clase }, t, ...hijos), t, 'sec:' + clase);
  };
  function pared(p, tipos, repintarTodo, udPared) {
    // Pilares y zonas de azulejo salen junto a su botón; el resto de elementos, abajo.
    const zonaEl = h('div', {}), zonaPilares = h('div', { class: 'zona-pilares' }), zonaZonas = h('div', { class: 'zona-zonas' });
    const de = f => p.elementos.filter(f).map(e => elemento(e, p.elementos, repintar, p));
    function repintar() {
      zonaPilares.replaceChildren(...de(e => e.tipo === 'pilar'));
      zonaZonas.replaceChildren(...de(e => e.tipo === 'zona'));
      zonaEl.replaceChildren(...de(e => e.tipo !== 'pilar' && e.tipo !== 'zona'));
      refrescarAvisos();
    }
    repintar();
    // Mocheta o pilar: un botón pequeño en la línea del largo.
    const botonPilar = h('button', { type: 'button', class: 'mini boton-pilar', 'data-acc': 'pilares', 'data-v': 'true', title: 'Añadir mocheta o pilar', onclick: () => {
      p.pilares = true; p.elementos.push(elementoNuevo('pilar', d.ref_ultima)); cambio(); repintar();
    } }, '＋ Pilar');
    // Esquinas de esta pared (con la de antes y con la de después): se abren con «∠ Esquinas», o solas si hay alguna descuadrada.
    const zonaEsquinas = h('div', { class: 'zona-esquinas' });
    const ladosEsq = () => ['izq', 'der'].map(lado => ({ lado, q: esquinaDe(d, p, lado) })).filter(x => x.q);
    let verEsquinas = ladosEsq().some(x => esquinaDescuadrada(x.q.valor));
    const pintarEsquinas = () => zonaEsquinas.replaceChildren(...(verEsquinas ? ladosEsq().map(({ lado, q }) => editorDescuadre({
      titulo: 'Esquina con ' + q.con + (lado === 'izq' ? ' (izq.)' : ' (dcha.)'), acc: 'esquina-' + lado,
      valor: () => { const x = esquinaDe(d, p, lado); return x && x.valor; }, poner: v => { const x = esquinaDe(d, p, lado); if (x) x.poner(v); }, conEn: true })) : []));
    pintarEsquinas();
    const botonEsquinas = ladosEsq().length ? h('button', { type: 'button', class: 'mini boton-esquinas', 'data-acc': 'esquinas', title: 'Esquinas descuadradas', onclick: () => { verEsquinas = !verEsquinas; pintarEsquinas(); } }, '∠ Esquinas') : null;
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
      if (p.azulejo === 'zonas' || p.azulejo === 'franja') {
        extra.push(h('button', { type: 'button', 'data-acc': 'anadir-zona', onclick: () => {
          const z = elementoNuevo('zona', d.ref_ultima);
          // Con franja, la zona empieza con su misma altura (desde y hasta, o hasta el techo).
          if (p.azulejo === 'franja') {
            if (p.azulejo_desde !== null && p.azulejo_desde !== undefined) z.altura = p.azulejo_desde;
            if (p.azulejo_techo) z.techo = true;
            else if (p.azulejo_hasta != null && p.azulejo_desde != null && p.azulejo_hasta > p.azulejo_desde) z.alto = p.azulejo_hasta - p.azulejo_desde;
          }
          p.elementos.push(z); cambio(); repintar();
        } }, '＋ Zona azulejada (campana, fregadero…)'));
      }
      zonaAzulejo.replaceChildren(
        segmentado({ acc: 'azulejo', opciones: [['no', 'Sin'], ['toda', 'Toda'], ['franja', 'Franja'], ['zonas', 'Por zonas']], valor: p.azulejo ?? null, permitirVacio: true, alCambiar: v => { p.azulejo = v; cambio(); pintarAzulejo(); } }),
        ...extra, zonaZonas);
    };
    pintarAzulejo();
    // Plegada, la pared enseña en su título lo que lleva.
    const resPared = h('small', { class: 'res-pared' });
    const pintarRes = () => {
      const n = (l, uno, varios) => (l || []).length ? (l.length + ' ' + (l.length > 1 ? varios : uno)) : null;
      resPared.textContent = [hay(p.largo) ? verMedida(p.largo, udPared) + ' ' + udPared : 'sin largo', n(p.bajos, 'bajo', 'bajos'), n(p.altos, 'alto', 'altos'),
        n(p.cuerpos, 'cuerpo', 'cuerpos'), n((p.elementos || []).filter(e => e.tipo === 'pilar'), 'pilar', 'pilares'), n((p.elementos || []).filter(e => e.tipo !== 'pilar' && e.tipo !== 'zona'), 'toma/hueco', 'tomas/huecos')].filter(Boolean).join(' · ');
    };
    pintarRes(); refrescos.push(() => { if (resPared.isConnected) pintarRes(); });
    const tituloPared = h('h3', {}, 'Pared ' + p.letra, ' ', resPared);
    return plegarCaja(h('div', { class: 'tarjeta tarjeta-pared', 'data-pared': p.letra },
      h('div', { class: 'cab' }, tituloPared,
        h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-pared', onclick: () => { if (confirmarQuitar('la pared ' + p.letra)) { d.paredes.splice(d.paredes.indexOf(p), 1); cambio(); repintarTodo(); } } }, 'Quitar')),
      h('div', { class: 'fila-largo' }, medida(p, 'largo', 'Largo', { aviso: null, unidad: udPared }), botonPilar, botonEsquinas),
      zonaEsquinas,
      p.alto !== null && p.alto !== undefined ? medida(p, 'alto', 'Alto', { aviso: null, unidad: udPared }) : null,
      h('div', { class: 'avisos', 'data-avisos': 'pared.' + p.id }),
      zonaPilares,
      // Cada parte de la pared en su bloque, con su título y su color: azulejo, muebles y tomas/huecos.
      seccion('azulejo', '🧱 Azulejo', h('div', { class: 'campo' }, zonaAzulejo)),
      tipos === TIPOS_ELEMENTO.cocina ? seccion('muebles', '🗄️ Muebles, de izquierda a derecha', muebles(p)) : null,
      ficha.subtipo === 'vestidor' ? seccion('muebles', '🗄️ Cuerpos', h('div', { class: 'campo' }, ...cuerpos(p, () => cuadreCuerposPared(p, d), false))) : null,
      seccion('elementos', '🔌 Tomas, huecos y cotas', zonaEl,
        h('div', { class: 'chips' }, tipos.map(t => h('button', { type: 'button', 'data-acc': 'anadir-elemento', 'data-v': t, onclick: () => { p.elementos.push(elementoNuevo(t, d.ref_ultima)); cambio(); repintar(); } }, '＋ ' + (CORTO_ELEMENTO[t] || NOMBRE_ELEMENTO[t])))))), tituloPared, 'pared:' + ficha.id + ':' + p.letra);
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

  // ── Islas y penínsulas: su pared, su tamaño y las cotas al suelo ──
  function islas() {
    if (!d.islas) d.islas = [];
    const zona = h('div', { class: 'lista' });
    function tarjeta(x) {
      const peninsula = x.tipo === 'peninsula', nombre = peninsula ? 'Península' : 'Isla';
      return h('div', { class: 'tarjeta', 'data-isla': x.tipo },
        h('div', { class: 'cab' }, h('b', {}, nombre),
          h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-isla', onclick: () => { if (confirmarQuitar('la ' + nombre.toLowerCase())) { d.islas.splice(d.islas.indexOf(x), 1); cambio(); repintar(); } } }, 'Quitar')),
        h('div', { class: 'campo' }, h('label', { class: 'et' }, peninsula ? 'Sale de la pared' : 'Paralela a la pared'),
          segmentado({ acc: 'isla-pared', opciones: d.paredes.map(p => [p.letra, p.letra]), valor: x.pared, alCambiar: v => { x.pared = v; cambio(); } })),
        h('div', { class: 'dos' }, medida(x, 'largo', peninsula ? 'Largo (lo que sale)' : 'Largo', { aviso: null }), medida(x, 'fondo', 'Fondo', { aviso: null })),
        peninsula ? null : medida(x, 'separacion', 'Separación de la pared', { aviso: null }),
        medida(x, 'distancia', 'Distancia desde la esquina', { ref: x.ref, alCambiarRef: r => { x.ref = r; cambio(); }, aviso: null }),
        h('small', { class: 'ayuda' }, peninsula ? 'Desde la esquina de la pared hasta el lado de la península.' : 'Desde la esquina de la pared hasta el lado de la isla, a lo largo de la pared.'));
    }
    const repintar = () => { zona.replaceChildren(...d.islas.map(tarjeta)); refrescarAvisos(); };
    repintar();
    const nueva = tipo => () => { d.islas.push(islaNueva(tipo, d.paredes[0] && d.paredes[0].letra)); cambio(); repintar(); };
    return [h('h2', {}, 'Islas y penínsulas'), zona,
      h('div', { class: 'dos' }, h('button', { type: 'button', 'data-acc': 'anadir-isla', onclick: nueva('isla') }, '+ Isla'),
        h('button', { type: 'button', 'data-acc': 'anadir-peninsula', onclick: nueva('peninsula') }, '+ Península'))];
  }

  // ── Listas de izquierda a derecha (módulos de una fila, cuerpos de armario): una abierta, las demás resumidas ──
  function listaOrdenada({ lista, atributo, abierto, alAbrir, editor, resumen, repintar, detalle = m => (m.ancho ? ' · ' + verMedida(m.ancho, 'cm') : '') }) {
    return lista.map((m, i) => {
      const subir = h('button', { type: 'button', class: 'mini', 'data-acc': 'subir-modulo', 'aria-label': 'Mover a la izquierda', disabled: i === 0, onclick: () => { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; cambio(); repintar(); } }, '←');
      const quitar = h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-modulo', 'aria-label': 'Quitar', onclick: () => { if (confirmarQuitar(resumen(m).toLowerCase())) { lista.splice(i, 1); cambio(); repintar(); } } }, '✕');
      // Abierto: tocar el título lo cierra.
      if (m.id === abierto()) return h('div', { class: 'modulo abierto', [atributo]: m.tipo || '' },
        h('div', { class: 'cab' }, h('button', { type: 'button', class: 'resumen titulo-modulo', 'data-acc': 'cerrar-modulo', title: 'Cerrar', onclick: () => { alAbrir(null); repintar(); } }, h('b', {}, resumen(m) + ' ▴')), h('span', {}, subir, quitar)), editor(m));
      return h('div', { class: 'modulo', [atributo]: m.tipo || '' },
        h('button', { type: 'button', class: 'resumen', 'data-acc': 'abrir-modulo', onclick: () => { alAbrir(m.id); repintar(); } }, resumen(m) + detalle(m)), subir, quitar);
    });
  }

  // Módulos de una pared: bajos y altos, de izquierda a derecha, en cm, con el cuadre contra el largo.
  function muebles(p) {
    // Un módulo abierto: su tipo (se puede cambiar), su ancho con las medidas habituales y lo propio de cada tipo.
    function editorModulo(m, nombre, repintar, pintarCuadre) {
      const med = (k, etiqueta, rapidos) => campoMedida({ etiqueta, acc: k, valor: m[k], mal: m.mal && m.mal[k], unidad: 'cm', rapidos,
        alCambiar: (v, t) => { anotarMedida(m, k, v, t); cambio(); pintarCuadre(); } });
      const sel = h('select', { class: 'select-tipo', 'data-acc': 'tipo-modulo', 'aria-label': 'Tipo de mueble', onchange: () => {
        const t = sel.value; m.tipo = t; if (t === 'rinconero' && !m.forma) Object.assign(m, { forma: 'L', lado2: null, gira: 'der' }); cambio(); repintar(); } },
        TIPOS_MODULO[nombre].map(t => h('option', { value: t }, NOMBRE_MODULO[t])));
      sel.value = m.tipo;
      const n = [sel];
      if (m.tipo === 'otro') n.push(h('input', { 'data-acc': 'nombre-modulo', placeholder: '¿Qué módulo?', value: m.nombre, oninput: ev => { m.nombre = ev.target.value; cambio(); } }));
      if (m.tipo === 'rinconero') {
        n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Forma'),
          segmentado({ acc: 'forma-rinconero', opciones: FORMAS_RINCONERO, valor: m.forma || 'L', alCambiar: v => { m.forma = v; cambio(); repintar(); } })));
        if (m.forma === 'recto') n.push(med('ancho', 'Largo (fondo 60)', anchosDe(m, AJ.modulo_anchos)));
        else n.push(h('div', { class: 'dos' }, med('ancho', 'Lado en esta pared', LADOS_RINCONERO), med('lado2', 'Lado en la otra pared', LADOS_RINCONERO)));
        const v = paredesVecinas(d, p), opciones = [['izq', v.izq ? 'Pared ' + v.izq.letra + ' (izq.)' : 'A la izquierda'], ['der', v.der ? 'Pared ' + v.der.letra + ' (dcha.)' : 'A la derecha']];
        n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Sigue en'),
          segmentado({ acc: 'gira-rinconero', opciones, valor: m.gira === 'izq' ? 'izq' : 'der', alCambiar: x => { m.gira = x; cambio(); refrescarAvisos(); } })));
      } else n.push(med('ancho', 'Ancho', anchosDe(m, AJ.modulo_anchos)));
      if (m.tipo === 'placa') n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Horno debajo'),
        segmentado({ acc: 'placa-horno', opciones: SI_NO, valor: m.horno ?? null, permitirVacio: true, alCambiar: x => { m.horno = x; cambio(); repintar(); } })));
      return n;
    }
    if (!p.bajos) p.bajos = [];
    if (!p.altos) p.altos = [];
    const caja = h('div', { class: 'campo' });
    const abiertos = { bajos: null, altos: null };
    function fila(nombre, titulo) {
      const zona = h('div', { class: 'modulos' }), cuadre = h('small', { class: 'cuadre', 'data-acc': 'cuadre-' + nombre });
      // Arriba solo se cuadra si hay altos: las columnas solas no son una fila de altos.
      const pintarCuadre = () => { cuadre.textContent = nombre === 'altos' && !p.altos.length ? '' : textoCuadre(nombre === 'bajos' ? cuadreBajos(p, d) : cuadreAltos(p), 'cm'); };
      const repintar = () => {
        zona.replaceChildren(...listaOrdenada({ lista: p[nombre], atributo: 'data-modulo', abierto: () => abiertos[nombre], alAbrir: idm => { abiertos[nombre] = idm; }, repintar,
          resumen: nombreModulo, detalle: m => (m.ancho ? ' · ' + medidasModulo(m) : ''),
          editor: m => editorModulo(m, nombre, repintar, pintarCuadre) }));
        pintarCuadre(); refrescarAvisos();
      };
      refrescos.push(pintarCuadre);
      repintar();
      return h('div', { 'data-fila': nombre }, h('label', { class: 'et' }, titulo), zona, cuadre,
        h('div', { class: 'chips' }, TIPOS_MODULO[nombre].map(t => h('button', { type: 'button', 'data-acc': 'anadir-modulo', 'data-v': t, onclick: () => {
          const m = moduloNuevo(t); p[nombre].push(m); abiertos[nombre] = m.id; cambio(); repintar();
        } }, CORTO_MODULO[t] || NOMBRE_MODULO[t]))));
    }
    caja.append(fila('bajos', 'Bajos y columnas'), fila('altos', 'Altos'));
    return caja;
  }

  // Cuerpos de izquierda a derecha, con su ancho y su interior: los del hueco del armario
  // o, en el vestidor, los de cada pared (cuadrados contra su largo).
  function cuerpos(dueno = d, cuadreDe = () => cuadreCuerpos(d), conTitulo = true) {
    if (!dueno.cuerpos) dueno.cuerpos = [];
    const lista = dueno.cuerpos;
    const zona = h('div', { class: 'modulos' }), cuadre = h('small', { class: 'cuadre', 'data-acc': 'cuadre-cuerpos' });
    let abierto = null;
    const pintarCuadre = () => { cuadre.textContent = textoCuadre(cuadreDe(), 'cm'); };
    const interiores = AJ.interiores.concat([['otro', 'Otro']]);
    // En el vestidor (cuerpos de una pared) un cuerpo puede ser de rincón: en L, recto (ciego) o en chaflán, y gira a una pared de al lado.
    const enPared = dueno !== d, vecinas = () => (enPared ? paredesVecinas(d, dueno) : { izq: null, der: null });
    const vecinaDe = c => vecinas()[c.gira === 'izq' ? 'izq' : 'der'];
    const editorRincon = c => {
      const v = vecinas(), lados = [['izq', '← ' + (v.izq ? v.izq.letra : 'Izq.')], ['der', (v.der ? v.der.letra : 'Dcha.') + ' →']].filter(([k]) => v[k]);
      return h('div', { class: 'campo rincon-cuerpo' }, h('label', { class: 'et' }, 'Rincón'),
        segmentado({ acc: 'rincon', opciones: [[null, 'No']].concat(FORMAS_RINCON_CUERPO), valor: c.rincon || null, alCambiar: x => {
          c.rincon = x || null;
          if (x && !c.gira) c.gira = lista.indexOf(c) === 0 && lista.length > 1 && v.izq ? 'izq' : v.der ? 'der' : 'izq';
          // En L o chaflán, el interior de estantes o barra.
          if (x && x !== 'recto') { const ok = interioresDe(c).filter(k => INTERIOR_RINCON.includes(k)); c.interior = ok[0] || null; c.interior2 = ok[1] || null; }
          cambio(); repintar(); refrescarAvisos();
        } }),
        c.rincon && lados.length ? h('div', { class: 'fila-gira' }, h('small', {}, 'Gira hacia la pared'),
          segmentado({ acc: 'gira-cuerpo', opciones: lados, valor: c.gira || null, alCambiar: x => { c.gira = x; cambio(); repintar(); refrescarAvisos(); } })) : null,
        c.rincon && !lados.length ? h('small', { class: 'ayuda' }, 'Esta pared no tiene otra al lado: añade la pared o dibuja la forma.') : null);
    };
    const repintar = () => {
      zona.replaceChildren(...listaOrdenada({ lista, atributo: 'data-cuerpo', abierto: () => abierto, alAbrir: idc => { abierto = idc; }, repintar,
        resumen: c => 'Cuerpo ' + (lista.indexOf(c) + 1) + (c.rincon ? ' · ' + textoRincon(c) : '') + (interioresDe(c).length ? ' · ' + textoInteriores(c, AJ) : '') + (c.puertas ? ' · puertas ' + (c.puertas === 'corredera' ? 'correderas' : 'abatibles') : ''),
        editor: c => [enPared ? editorRincon(c) : null,
          campoMedida({ etiqueta: c.rincon && c.rincon !== 'recto' ? 'Ancho en esta pared' : 'Ancho', acc: 'ancho', valor: c.ancho, mal: c.mal && c.mal.ancho, unidad: 'cm', rapidos: c.rincon && c.rincon !== 'recto' ? LADOS_RINCON_CUERPO : AJ.modulo_anchos, alCambiar: (v, t) => { anotarMedida(c, 'ancho', v, t); cambio(); pintarCuadre(); } }),
          c.rincon && c.rincon !== 'recto' ? campoMedida({ etiqueta: 'En la pared ' + (vecinaDe(c) ? vecinaDe(c).letra : 'de al lado'), acc: 'lado2', valor: c.lado2, unidad: 'cm', rapidos: LADOS_RINCON_CUERPO, alCambiar: v => { c.lado2 = v; cambio(); pintarCuadre(); } }) : null,
          h('label', { class: 'et' }, 'Interior'),
          h('small', { class: 'ayuda' }, c.rincon && c.rincon !== 'recto' ? 'En el rincón: estantes o barra.' : 'Hasta dos (p. ej. barra y cajonera); la doble barra va sola.'),
          h('div', { class: 'chips' }, interiores.filter(([v]) => !(c.rincon && c.rincon !== 'recto') || INTERIOR_RINCON.includes(v)).map(([v, t]) => h('button', { type: 'button', 'data-acc': 'interior', 'data-v': v, class: interioresDe(c).includes(v) ? 'on' : '', onclick: () => { elegirInterior(c, v); cambio(); repintar(); } }, t))),
          interioresDe(c).includes('otro') ? h('input', { 'data-acc': 'nombre-cuerpo', placeholder: '¿Qué interior?', value: c.nombre || '', oninput: ev => { c.nombre = ev.target.value; cambio(); } }) : null,
          enPared ? h('label', { class: 'et' }, 'Puertas') : null,
          enPared ? segmentado({ acc: 'puertas-cuerpo', opciones: [['abatible', 'Abatibles'], ['corredera', 'Correderas']], valor: c.puertas || null, permitirVacio: true, alCambiar: v => { c.puertas = v || null; cambio(); repintar(); } }) : null] }));
      pintarCuadre(); refrescarAvisos();
    };
    refrescos.push(pintarCuadre);
    repintar();
    return [conTitulo ? h('h2', {}, 'Cuerpos, de izquierda a derecha') : h('label', { class: 'et' }, 'Cuerpos, de izquierda a derecha'), zona, cuadre,
      h('button', { type: 'button', class: 'ancho', 'data-acc': 'anadir-cuerpo', onclick: () => { const c = { id: nuevoId(), ancho: null, interior: null, interior2: null, nombre: '' }; lista.push(c); abierto = c.id; cambio(); repintar(); } }, '+ Añadir cuerpo')];
  }

  const texto = (obj, k, acc, ph) => h('input', { 'data-acc': acc, placeholder: ph, value: obj[k] || '', oninput: ev => { obj[k] = ev.target.value; cambio(); } });

  // Acabados de cocina: modelo y color (o por separado altos y bajos si es bitono), encimera y lineales.
  // Sección plegada: el título con un resumen de lo que tiene; un toque la abre.
  function plegable(acc, titulo, contenido, resumen) {
    const res = h('small', { class: 'res-plegable' });
    const pintarRes = () => { res.textContent = resumen() || 'sin apuntar'; };
    const det = h('details', { class: 'plegable', 'data-acc': 'plegable-' + acc }, h('summary', { 'data-acc': 'abrir-' + acc }, h('b', {}, titulo), res), contenido);
    pintarRes(); refrescos.push(pintarRes);
    return det;
  }
  const resumenAcabados = () => {
    const ac = d.acabados || {}, t = [];
    if (ac.bitono) t.push('bitono'); if (ac.modelo || ac.color) t.push([ac.modelo, ac.color].filter(Boolean).join(' '));
    if (ac.casco) t.push('cascos ' + ac.casco);
    if (ac.encimera && (ac.encimera.material || ac.encimera.modelo || ac.encimera.color)) t.push('encimera ' + [ac.encimera.material, ac.encimera.modelo, ac.encimera.color].filter(Boolean).join(' '));
    if ((ac.lineales || []).length) t.push(ac.lineales.length + ' lineal' + (ac.lineales.length > 1 ? 'es' : ''));
    return t.join(' · ');
  };
  // Material para pedir (encimera, lineales, herrajes), sacado de lo medido; se rehace con cada cambio.
  const resumenMaterial = () => { const l = textoMaterial(ficha, unidad, AJ); return l.length ? l[0].replace(/:.*/, '') + (l.length > 1 ? ' y más' : '') : ''; };
  function material() {
    const caja = h('div', { class: 'tarjeta material', 'data-acc': 'material' });
    const pintar = () => { const l = textoMaterial(ficha, unidad, AJ);
      caja.replaceChildren(...(l.length ? l.map(t => h('p', { class: t.startsWith('- ') ? 'sub' : '' }, t)) : [h('p', { class: 'ayuda' }, 'Aún no hay muebles con medida.')]),
        h('small', { class: 'ayuda' }, 'Orientativo: sale de los muebles medidos. Lo medido y lo pedido mandan.')); };
    pintar(); refrescos.push(() => { if (caja.isConnected) pintar(); });
    return caja;
  }
  const resumenElectro = () => (d.electro || []).map(e => (e.clave === 'otro' ? e.nombre || 'otro' : datosElectro(e.clave)[1].toLowerCase())).join(', ');
  // Acabados: frentes (puertas), interior (cascos) y, en la cocina, encimera y lineales. vestidor: solo frentes y cascos.
  function acabados(vestidor = false) {
    if (!d.acabados) d.acabados = acabadosNuevos();
    const ac = d.acabados, caja = h('div', { class: 'tarjeta' }), zonaLin = h('div', { class: 'lista' });
    if (!ac.encimera) ac.encimera = { material: '', modelo: '', color: '', grueso: null };
    if (!Array.isArray(ac.lineales)) ac.lineales = [];
    // Un material de antes que no es de la lista pasa a «modelo».
    if (ac.encimera.material && !MATERIALES_ENCIMERA.includes(ac.encimera.material) && !ac.encimera.modelo) { ac.encimera.modelo = ac.encimera.material; ac.encimera.material = ''; }
    const cascos = () => [h('label', { class: 'et' }, 'Interior (cascos)'), texto(ac, 'casco', 'acab-casco', 'Color de los cascos'),
      h('div', { class: 'chips' }, AJ.colores_casco.map(([v, t]) => h('button', { type: 'button', 'data-acc': 'casco-rapido', 'data-v': v, class: ac.casco === t ? 'on' : '',
        onclick: () => { ac.casco = ac.casco === t ? '' : t; cambio(); pintar(); } }, t)))];
    const pintarLineales = () => zonaLin.replaceChildren(...ac.lineales.map(l => h('div', { class: 'libre', 'data-lineal': l.tipo },
      l.tipo === 'otro' ? texto(l, 'nombre', 'lineal-nombre', '¿Qué lineal?') : h('span', {}, nombreLineal(l, AJ)),
      texto(l, 'modelo', 'lineal-modelo', 'Modelo o color'),
      h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-lineal', onclick: () => { if (confirmarQuitar(nombreLineal(l, AJ).toLowerCase())) { ac.lineales.splice(ac.lineales.indexOf(l), 1); cambio(); pintarLineales(); } } }, '✕'))));
    const pintar = () => {
      caja.replaceChildren(
        h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Bitono (altos y bajos distintos)'),
          segmentado({ acc: 'bitono', opciones: SI_NO, valor: ac.bitono, permitirVacio: true, alCambiar: v => { ac.bitono = v; cambio(); pintar(); } })),
        ...(ac.bitono
          ? [h('label', { class: 'et' }, 'Altos'), h('div', { class: 'dos' }, texto(ac, 'modelo_altos', 'acab-modelo_altos', 'Modelo'), texto(ac, 'color_altos', 'acab-color_altos', 'Color')),
            h('label', { class: 'et' }, 'Bajos'), h('div', { class: 'dos' }, texto(ac, 'modelo_bajos', 'acab-modelo_bajos', 'Modelo'), texto(ac, 'color_bajos', 'acab-color_bajos', 'Color'))]
          : [h('label', { class: 'et' }, 'Frentes (puertas)'), h('div', { class: 'dos' }, texto(ac, 'modelo', 'acab-modelo', 'Modelo'), texto(ac, 'color', 'acab-color', 'Color'))]),
        ...cascos(),
        ...(vestidor ? [] : [
          h('label', { class: 'et' }, 'Encimera'),
          segmentado({ acc: 'encimera-material', opciones: MATERIALES_ENCIMERA.map(m => [m, m]), valor: ac.encimera.material || null, permitirVacio: true, alCambiar: v => { ac.encimera.material = v || ''; cambio(); } }),
          h('div', { class: 'dos' }, texto(ac.encimera, 'modelo', 'encimera-modelo', 'Modelo'), texto(ac.encimera, 'color', 'encimera-color', 'Color')),
          campoMedida({ etiqueta: 'Grueso', acc: 'encimera-grueso', valor: ac.encimera.grueso, unidad: 'cm', rapidos: AJ.encimera_gruesos, alCambiar: v => { ac.encimera.grueso = v; cambio(); } }),
          h('label', { class: 'et' }, 'Lineales'), zonaLin,
          h('div', { class: 'chips' }, AJ.lineales.concat([['otro', 'Otro']]).map(([v, t]) => h('button', { type: 'button', 'data-acc': 'anadir-lineal', 'data-v': v, onclick: () => { ac.lineales.push(lineaNueva(v)); cambio(); pintarLineales(); } }, t)))]));
      pintarLineales();
    };
    pintar();
    return caja;
  }

  // Electrodomésticos: tipo, ancho (cm) y modelo.
  function electro() {
    if (!d.electro) d.electro = [];
    const zona = h('div', { class: 'lista' });
    const repintar = () => zona.replaceChildren(...d.electro.map(e => {
      const [, nombre, tipos] = datosElectro(e.clave);
      return h('div', { class: 'elemento', 'data-electro': e.clave },
        h('div', { class: 'cab' }, e.clave === 'otro' ? texto(e, 'nombre', 'electro-nombre', '¿Qué es?') : h('b', {}, nombre),
          h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-electro', onclick: () => { if (confirmarQuitar((e.clave === 'otro' ? e.nombre || 'el electrodoméstico' : nombre).toLowerCase())) { d.electro.splice(d.electro.indexOf(e), 1); cambio(); repintar(); } } }, 'Quitar')),
        tipos.length ? h('div', { class: 'campo' }, segmentado({ acc: 'electro-tipo', opciones: tipos, valor: e.tipo, permitirVacio: true, alCambiar: v => { e.tipo = v; cambio(); } })) : null,
        h('div', { class: 'dos' },
          campoMedida({ etiqueta: 'Ancho', acc: 'ancho', valor: e.ancho, mal: e.mal && e.mal.ancho, unidad: 'cm', alCambiar: (v, t) => { anotarMedida(e, 'ancho', v, t); cambio(); } }),
          h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Modelo'), texto(e, 'modelo', 'electro-modelo', 'Marca y modelo'))));
    }));
    repintar();
    return h('div', { class: 'tarjeta' }, h('b', {}, 'Electrodomésticos'), zona,
      h('div', { class: 'chips' }, ELECTRO.map(([k, n]) => h('button', { type: 'button', 'data-acc': 'anadir-electro', 'data-v': k, onclick: () => { d.electro.push(electroNuevo(k)); cambio(); repintar(); } }, n))));
  }

  // Duplicar (la copia va al mismo trabajo, sin las fotos) y mover a otro trabajo o a notas sueltas.
  async function duplicar() {
    await guardarYa();
    const copia = duplicarFicha(ficha, ficha.trabajo_id);
    await App.guardarFila('fichas', copia);
    App.ir('#/ficha/' + copia.id);
  }
  async function mover() {
    await guardarYa();
    const trabajos = vivos(await App.almacen.todos('trabajos')).filter(t => t.id !== ficha.trabajo_id).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    const destinos = (ficha.trabajo_id ? [[null, 'Notas sueltas']] : []).concat(trabajos.map(t => [t.id, t.nombre || 'Trabajo sin nombre']));
    const capa = h('div', { class: 'cota-dialogo' }, h('form', { onsubmit: ev => ev.preventDefault() },
      h('b', {}, '¿A dónde la mueves?'),
      destinos.length ? h('div', { class: 'lista destinos' }, destinos.map(([tid, n]) => h('button', { type: 'button', 'data-acc': 'mover-a', onclick: async () => {
        capa.remove();
        ficha.trabajo_id = tid;
        await guardarYa(); App.vaciar = null; App.alSalir = null;
        await pintarFicha(App, id);
      } }, n))) : h('p', {}, 'No hay otros trabajos.'),
      h('div', { class: 'botones' }, h('button', { type: 'button', 'data-acc': 'mover-cancelar', onclick: () => capa.remove() }, 'Cancelar'))));
    document.body.append(capa);
  }

  function propios() {
    if (ficha.tipo === 'puerta') return [h('div', { class: 'tarjeta' }, h('b', {}, 'Para todas las puertas'),
      // Se suele medir el premarco; si aún no está puesto, la puerta.
      h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Se mide'),
        segmentado({ acc: 'medida-de', opciones: [['premarco', 'Premarco'], ['puerta', 'Puerta']], valor: d.medida === 'premarco' ? 'premarco' : 'puerta',
          alCambiar: v => { d.medida = v; cambio(); repintarPuertas(); } })),
      h('div', { class: 'dos' }, texto(d, 'modelo', 'puertas-modelo', 'Modelo'), texto(d, 'color', 'puertas-color', 'Color'))), ...puertas()];
    if (ficha.tipo === 'cocina') return [...paredes(TIPOS_ELEMENTO.cocina), ...islas(), plegable('acabados', 'Acabados', acabados(), resumenAcabados), plegable('electro', 'Electrodomésticos', electro(), resumenElectro), plegable('material', 'Material', material(), resumenMaterial)];
    if (ficha.tipo === 'armario') {
      // El vestidor se mide por paredes: el hueco y la lista general de cuerpos solo se ven si ya tenía datos de antes.
      const ves = ficha.subtipo === 'vestidor';
      const huecoViejo = ['ancho_arriba', 'ancho_medio', 'ancho_abajo', 'alto_izq', 'alto_der', 'diag_1', 'diag_2', 'fondo', 'rodapie_alto', 'rodapie_grosor'].some(k => d[k] !== null && d[k] !== undefined);
      const r = ves && !huecoViejo ? [] : [h('div', { class: 'tarjeta' },
        h('label', { class: 'et titulo-grupo' }, 'Ancho del hueco ', h('small', { class: 'ayuda' }, '(si no coinciden, avisa)')),
        h('div', { class: 'tres' }, medida(d, 'ancho_arriba', 'Arriba'), medida(d, 'ancho_medio', 'Medio'), medida(d, 'ancho_abajo', 'Abajo')),
        h('div', { class: 'avisos', 'data-avisos': 'anchos' }),
        h('label', { class: 'et titulo-grupo' }, 'Alto del hueco ', h('small', { class: 'ayuda' }, '(a cada lado)')),
        h('div', { class: 'dos' }, medida(d, 'alto_izq', 'Izquierda'), medida(d, 'alto_der', 'Derecha')),
        h('div', { class: 'avisos', 'data-avisos': 'altos' }),
        h('label', { class: 'et titulo-grupo' }, 'Diagonales ', h('small', { class: 'ayuda' }, '(de esquina a esquina: escuadra)')),
        h('div', { class: 'dos' }, medida(d, 'diag_1', '↘ Diagonal 1', { aviso: null }), medida(d, 'diag_2', '↙ Diagonal 2', { aviso: null })),
        h('div', { class: 'avisos', 'data-avisos': 'diagonales' }),
        medida(d, 'fondo', 'Fondo del hueco'),
        h('div', { class: 'dos' }, medida(d, 'rodapie_alto', 'Rodapié alto'), medida(d, 'rodapie_grosor', 'Rodapié grueso')),
        ficha.subtipo === 'corredera' ? h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Hojas'),
          segmentado({ acc: 'hojas-rapido', opciones: [[2, '2'], [3, '3'], [4, '4']], valor: d.hojas, permitirVacio: true, alCambiar: v => { d.hojas = v; cambio(); const c = main.querySelector('[data-acc="hojas"]'); if (c) c.value = v ?? ''; } }),
          campoEntero({ acc: 'hojas', valor: d.hojas, alCambiar: v => { d.hojas = v; cambio(); } })) : null,
        ficha.subtipo === 'abatible' ? campoEntero({ etiqueta: 'Número de puertas', acc: 'puertas', valor: d.puertas, alCambiar: v => { d.puertas = v; cambio(); } }) : null)];
      if (!ves || (d.cuerpos || []).length) r.push(...cuerpos());
      // En el vestidor los enchufes van en sus paredes; la lista aparte solo se ve si ya tenía alguno.
      if (ficha.subtipo !== 'vestidor' || (d.enchufes || []).length) r.push(...enchufes());
      if (ficha.subtipo === 'vestidor') r.push(...paredes(TIPOS_ELEMENTO.vestidor), plegable('acabados', 'Acabados', acabados(true), resumenAcabados), plegable('material', 'Material', material(), resumenMaterial));
      return r;
    }
    return [];
  }

  const zonaLibres = h('div', { class: 'tarjeta' }), tituloLibres = h('h2', {}, 'Otras medidas');
  const nuevaLibre = () => { d.libres.push({ id: nuevoId(), nombre: '', mm: null }); cambio(); repintarLibres(); zonaLibres.querySelectorAll('[data-acc="libre-nombre"]')[d.libres.length - 1].focus(); };
  function repintarLibres() {
    zonaLibres.hidden = tituloLibres.hidden = !d.libres.length;
    zonaLibres.replaceChildren(...d.libres.map(m => h('div', { class: 'libre', 'data-libre': '' },
      h('input', { 'data-acc': 'libre-nombre', placeholder: 'Nombre', value: m.nombre, oninput: ev => { m.nombre = ev.target.value; cambio(); } }),
      campoMedida({ acc: 'libre-valor', valor: m.mm, mal: m.mal && m.mal.mm, unidad, aviso: 'libre.' + m.id, alCambiar: (v, textoMal) => { anotarMedida(m, 'mm', v, textoMal); cambio(); } }),
      h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-libre', onclick: () => { if (confirmarQuitar('la medida')) { d.libres.splice(d.libres.indexOf(m), 1); cambio(); repintarLibres(); } } }, '✕'))));
    refrescarAvisos();
  }

  const zonaNotas = h('div', { class: 'tarjeta' }), tituloNotas = h('h2', {}, 'Notas');
  function repintarNotas() {
    zonaNotas.hidden = tituloNotas.hidden = !d.notas.length;
    zonaNotas.replaceChildren(...d.notas.map(n => h('div', { class: 'campo' },
      h('textarea', { 'data-acc': 'nota', placeholder: 'Nota', oninput: ev => { n.texto = ev.target.value; cambio(); } }, n.texto),
      h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-nota', onclick: () => { if (confirmarQuitar('la nota')) { d.notas.splice(d.notas.indexOf(n), 1); cambio(); repintarNotas(); } } }, 'Quitar nota'))));
  }
  const nuevaNota = () => { d.notas.push({ id: nuevoId(), texto: '' }); cambio(); repintarNotas(); const t = zonaNotas.querySelectorAll('textarea'); t[t.length - 1].focus(); };
  function notas() { repintarNotas(); return [tituloNotas, zonaNotas]; }

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
    ...(ficha.tipo === 'puerta' ? [nombreZona()] : [h('input', { 'data-acc': 'nombre-ficha', placeholder: 'Nombre', value: ficha.nombre, oninput: ev => { ficha.nombre = ev.target.value; cambio(); } })]),
    ...propios(), tituloLibres, zonaLibres, ...notas(),
    ...adjuntos.nodos,
    // Lo que se puede añadir a cualquier ficha, en una sola fila.
    h('div', { class: 'barra-extras' },
      h('button', { type: 'button', 'data-acc': 'anadir-libre', onclick: nuevaLibre }, '＋ Medida'),
      h('button', { type: 'button', 'data-acc': 'anadir-nota', onclick: nuevaNota }, '＋ Nota'),
      ...adjuntos.botones),
    h('button', { type: 'button', class: 'prin ancho', 'data-acc': 'terminar', onclick: async () => { await guardarYa(); App.ir('#/resumen/' + id); } }, 'Terminar y ver resumen'),
    h('div', { class: 'dos' },
      h('button', { type: 'button', 'data-acc': 'duplicar-ficha', onclick: duplicar }, 'Duplicar'),
      h('button', { type: 'button', 'data-acc': 'mover-ficha', onclick: mover }, 'Mover a otro trabajo')),
    h('button', { type: 'button', class: 'peligro', 'data-acc': 'borrar-ficha', onclick: async () => {
      if (!confirm('¿Borrar esta ficha?')) return;
      ficha.borrado_at = new Date().toISOString();
      await guardarYa(); App.vaciar = null; App.alSalir = null;
      history.back();
    } }, 'Borrar ficha'));
  // Apartados con título grande (Paredes, Enchufes, Islas, Otras medidas, Notas…): el título pliega lo que va debajo hasta el siguiente.
  {
    const corte = n => n.matches('h2, .barra-extras, [data-acc="terminar"]') || (n.matches('.cab') && n.querySelector(':scope > h2'));
    const hijos = [...main.children];
    hijos.forEach((n, i) => {
      const t = n.matches('h2') ? n : n.matches('.cab') ? n.querySelector(':scope > h2') : null;
      if (!t) return;
      const grupo = [];
      for (let k = i + 1; k < hijos.length && !corte(hijos[k]); k++) grupo.push(hijos[k]);
      if (grupo.length) plegador(t, 'apartado:' + ficha.tipo + ':' + t.textContent, v => grupo.forEach(g => g.classList.toggle('plegado-grupo', v)));
    });
  }
  refrescarAvisos();
  // Una ficha de nota se abre lista para escribir.
  if (ficha.tipo === 'nota' && !d.notas.length) nuevaNota();
  App.refrescar = async () => {
    const nueva = await App.almacen.leer('fichas', id);
    // Se repinta sin perder el sitio: un cambio de otro dispositivo no debe llevar la ficha arriba.
    if (!espera && nueva && huella(normalizarFicha(nueva)) !== huella(ficha)) {
      const y = window.scrollY;
      await pintarFicha(App, id);
      window.scrollTo(0, y);
      return;
    }
    adjuntos.pintar();
  };
}
