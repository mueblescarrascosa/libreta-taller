// Una ficha: sus huecos según el tipo y, en todas, medidas libres, notas, croquis y fotos.
import { h, reemplazar, segmentado, tituloFicha, vivos, icono, altoSegunTexto } from '../util.js';
import { unidadDe } from '../unidades.js';
import { nombrarPuerta, CORTO_ELEMENTO, HUMOS_DIAMETROS, HUMOS_RECTANGULARES, islaNueva, avisos, camposDeElemento, elementoNuevo, paredNueva, puertaNueva, normalizarFicha, resumenPuerta, limpiarDatos, tieneInformacion,
  TIPOS_ELEMENTO, NOMBRE_ELEMENTO, RAPIDAS_PUERTA, USOS, nombreElemento, tiposPuertaPara, CORREDERAS, otraHoja, anchoFijo, pilarEnPunta, esquinaDe, esquinaDescuadrada } from '../modelo.js';
import { duplicarFicha } from '../trabajos.js';
import { campoMedida, campoEntero } from '../campos.js';
import { verMedida } from '../unidades.js';
import { ANCHOS_ELECTRO, ALTOS_ELECTRO, TIPOS_MODULO, GRUPOS_MODULO, NOMBRE_MODULO, CORTO_MODULO, moduloNuevo, nombreModulo, medidasModulo, anchosDe, FORMAS_RINCONERO, LADOS_RINCONERO, paredesVecinas, cuadreBajos, cuadreAltos, cuadreCuerpos, cuadreCuerposPared, FORMAS_RINCON_CUERPO, LADOS_RINCON_CUERPO, INTERIOR_RINCON, textoRincon, textoCuadre, lineaNueva, nombreLineal, nombreInterior, interioresDe, elegirInterior, textoInteriores, acabadosNuevos, MATERIALES_ENCIMERA, ELECTRO, datosElectro, electroNuevo, tieneInstalacion, instalacionDe, sincronizarElectros, COLORES_ELECTRO, colorElectroComun, altoHorno, ABAJO_COLUMNA, ARRIBA_COLUMNA, microLibre, MICRO_LIBRE, MICRO_INTEGRABLE, cuadreAltillos, HUECOS_DESAYUNO, huecoDesayuno, PUENTE, topePuente } from '../modulos.js';
import { seccionAdjuntos } from './adjuntos.js';
import { textoMaterial, textoRemates, TIPOS_REMATE, MATERIALES_REMATE, opcionRemate } from '../material.js';
import { variantesDe, varianteHabitual, alturasDe, alturaHabitual, NOMBRE_VARIANTE, articulo, paquetePresupuesto, CLAVE_PASO } from '../presupuesto.js';
import { textoResumen, urlWhatsapp } from '../resumen.js';
import { huella } from '../sincro.js';
import { geometriaPlanta, svgPlanta, aplicarPlano, pilarEnParedes, pilaresEnParedes, pasarAPilar } from '../plano-vista.js';
import { abrirPlano } from '../plano-editor.js';
import { geometriaAlzado, svgAlzado, campanasPared, salidaCampana, textoHolgurasCampana, centrosCampana, textoCentroCampana, anchoPlaca, anchoCampana, textoTubo, fijarCocinaTipo, alturasCocina, CAMPOS_ALTURA, placaDeGas, SOBRE_GAS, MINIMO_GAS, ALTURAS } from '../alzado.js';
import { puntuarCocina, mejorCocina, aplicarCambios } from '../puntuacion.js';
import { TAPETAS } from '../pedido.js';
import { airePlaca, textoAirePlaca } from '../consejos.js';
import { vistaInteractiva, abrirPerspectivaGrande } from './perspectiva-ui.js';
import { consejosDiseno, GRUPOS as GRUPOS_CONSEJO } from '../consejos.js';
import { instalacionesQueFaltan, colocarPropuestas, quitarPropuestas, hayPropuestas } from '../avisos-obra.js';
import { comoRellenar } from '../ayuda.js';
import { estimarConTarifa, estimarGamas, sinPrecio } from '../tarifa.js';
import { IVA, MOTIVOS_CORTOS, NOMBRE_MOTIVO, estimacionRapida, aceptarPropuesta, descartarPropuesta, pctRecargo, pctDe, euros, metros } from '../coste.js';

const RETARDO = 300;
const nuevoId = () => crypto.randomUUID();
const SI_NO = [[true, 'Sí'], [false, 'No']];
const TIRADORES = [['visto', 'Visto'], ['gola', 'Gola'], ['unero', 'Uñero'], ['integrado', 'Integrado']];

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
  if (ficha.tipo === 'cocina') { fijarCocinaTipo(alturasCocina(d, AJ)); sincronizarElectros(d); }
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
  const guardarPronto = () => { clearTimeout(espera); espera = setTimeout(guardarYa, RETARDO); };   // guardar sin volver a refrescar
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
      reemplazar(zona, h('label', { class: 'et' }, titulo),
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
          segmentado({ acc: 'tipo-puerta', opciones: tiposPuertaPara(p), valor: p.tipo || null, permitirVacio: true, alCambiar: v => { p.tipo = v; if (v === 'doble' || v === 'corredera') quitarFijo(p); if (v !== 'corredera') delete p.corredera; cambio(); repintar(); } })),
        p.tipo === 'corredera' ? h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Corredera'),
          segmentado({ acc: 'corredera', opciones: CORREDERAS, valor: p.corredera || null, permitirVacio: true, alCambiar: v => { p.corredera = v || null; cambio(); } })) : null,
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
      reemplazar(zona, ...d.puertas.map((p, i) => (p.id === abierta ? editor : resumen)(p, i)));
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
      reemplazar(zona, h('label', { class: 'et' }, 'Medido desde (hay un pilar de ' + verMedida(ancho, 'cm') + ' cm en esa esquina)'),
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
      reemplazar(zona, ...n);
    };
    pintar();
    return zona;
  }
  function elemento(e, lista, repintar, pared) {
    const c = camposDeElemento(e.tipo);
    // Las mochetas (pilares) se miden siempre en centímetros.
    const medida = (obj, k, etiqueta, extra) => medidaGeneral(obj, k, etiqueta, Object.assign(e.tipo === 'pilar' ? { unidad: 'cm' } : {}, extra));
    const refExtra = { ref: e.ref, alCambiarRef: r => { e.ref = r; d.ref_ultima = r; cambio(); }, aviso: null };
    return h('div', { class: 'elemento' + (e.propuesta ? ' propuesta' : ''), 'data-elemento': e.tipo },
      h('div', { class: 'cab' }, h('b', { 'data-acc': 'nombre-elemento-titulo' }, nombreElemento(e)),
        e.propuesta ? h('span', { class: 'etiqueta-poner' }, 'A poner') : h('small', {}, c.punto === 'centro' ? 'medido al centro' : 'medido al borde'),
        e.propuesta ? h('button', { type: 'button', class: 'mini', 'data-acc': 'ya-hecha', title: 'Ya está hecha en la obra: pasa a medida', onclick: () => { delete e.propuesta; cambio(); repintar(); } }, 'Ya está hecha') : null,
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
    const repintar = () => { reemplazar(zona, ...d.paredes.map(p => pared(p, tipos, repintar, enM() ? 'm' : unidad))); refrescarAvisos(); };
    repintar();
    // La altura es una para toda la habitación; lo especial (vigas, buhardillas) va en notas.
    const zonaAlto = h('div', {});
    const pintarAlto = () => reemplazar(zonaAlto, medida(d, 'alto_techo', 'Altura de suelo a techo', { unidad: enM() ? 'm' : unidad }),
      h('small', { class: 'ayuda' }, 'Vigas, buhardillas o techos inclinados: en una nota.'));
    pintarAlto();
    // Alzados: una pared de frente, elegida con su letra; se rehace con cada cambio, como la planta.
    const zonaAlzado = h('div', { class: 'zona-alzado' }), botonesAlzado = h('div', { class: 'chips' });
    let paredAlzado = null;
    function pintarAlzado() {
      const letras = d.paredes.map(p => p.letra);
      if (!letras.includes(paredAlzado)) paredAlzado = letras[0] || null;
      reemplazar(botonesAlzado, ...letras.map(l => h('button', { type: 'button', 'data-acc': 'alzado-pared', 'data-v': l, class: l === paredAlzado ? 'on' : '',
        onclick: () => { paredAlzado = l; pintarAlzado(); } }, 'Pared ' + l)));
      const p = d.paredes.find(x => x.letra === paredAlzado), g = p ? geometriaAlzado(d, p, AJ) : null;
      reemplazar(zonaAlzado, ...(g ? [svgAlzado(g, { unidad }), g.techoMedido ? null : h('small', { class: 'ayuda' }, 'Sin la altura del techo: dibujado con 2,50 m.'),
        h('small', { class: 'ayuda' }, 'Alturas de muebles orientativas.')].filter(Boolean)
        : [h('small', { class: 'ayuda' }, 'Pon el largo de la pared para verla de frente.')]));
    }
    // Perspectiva, de pie (ojos a 160 por defecto, se pueden cambiar); también a pantalla completa.
    const zonaPersp = h('div', { class: 'zona-perspectiva' });
    const pintarPerspectiva = () => reemplazar(zonaPersp, vistaInteractiva({ d, margen: AJ.margen, ajustes: AJ, alGuardar: cambio,
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
      reemplazar(zonaPlanta, ...hijos);
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
      h('small', { class: 'ayuda et-paredes' }, 'Paredes en:'),
      segmentado({ acc: 'ud-paredes', opciones: [[false, unidad], [true, 'm']], valor: !!enM(), alCambiar: v => { d.paredes_m = v; App.cambiarParedesM(v); cambio(); pintarAlto(); repintar(); } })),
    // Altura y planta juntas: en el ordenador van a la derecha y se quedan fijas al bajar.
    h('div', { class: 'lateral' },
      h('div', { class: 'tarjeta' }, zonaAlto),
      (() => { const t = h('b', {}, 'Planta'); return plegarCaja(h('div', { class: 'tarjeta tarjeta-planta' }, h('div', { class: 'cab' }, t, botonForma), zonaPlanta), t, 'lat:planta'); })(),
      (() => { const t = h('b', {}, 'Paredes de frente'); return plegarCaja(h('div', { class: 'tarjeta tarjeta-alzado' }, t, botonesAlzado, zonaAlzado), t, 'lat:alzado'); })(),
      (() => { const t = h('b', {}, 'Perspectiva'); return plegarCaja(h('div', { class: 'tarjeta tarjeta-perspectiva' }, t, zonaPersp), t, 'lat:perspectiva'); })(),
      tarjetaConsejos(), tarjetaInstalaciones(repintar)),
    h('h2', {}, 'Paredes'),
    zona,
    h('button', { type: 'button', class: 'ancho', 'data-acc': 'anadir-pared', onclick: () => { d.paredes.push(paredNueva(d.paredes)); cambio(); repintar(); } }, '+ Añadir pared')];
  }
  // Instalaciones para el electricista y el fontanero (reformas): coloca como «A poner» lo que falta según los muebles.
  function tarjetaInstalaciones(repintar) {
    if (ficha.tipo !== 'cocina') return null;
    const t = h('b', {}, 'Instalaciones a poner'), zonaI = h('div', {});
    const pintar = () => {
      const n = instalacionesQueFaltan(d).filter(x => x.pon).length, hay = hayPropuestas(d);
      const colocar = () => { colocarPropuestas(d); cambio(); repintar(); };
      reemplazar(zonaI,
        h('small', { class: 'ayuda' }, 'Para reformas: pone los enchufes, tomas, desagües, gas y salida de humos donde deben ir según los muebles. Salen en naranja («A poner») y se pueden mover o quitar.'),
        h('div', { class: 'chips' },
          n ? h('button', { type: 'button', 'data-acc': 'colocar-propuestas', onclick: colocar }, 'Colocar lo que falta (' + n + ')') : null,
          hay ? h('button', { type: 'button', 'data-acc': 'volver-colocar', onclick: () => { quitarPropuestas(d); colocar(); } }, 'Volver a colocar') : null,
          hay ? h('button', { type: 'button', 'data-acc': 'quitar-propuestas', onclick: () => { if (!confirm('¿Quitar todas las instalaciones «A poner»? Lo medido no se toca.')) return; quitarPropuestas(d); cambio(); repintar(); } }, 'Quitar propuestas') : null),
        !n && !hay ? h('p', { class: 'ayuda' }, 'No falta nada con los muebles que hay puestos.') : null);
    };
    pintar(); refrescos.push(() => { if (zonaI.isConnected) pintar(); });
    return plegarCaja(h('div', { class: 'tarjeta tarjeta-instalaciones', 'data-acc': 'instalaciones' }, t, zonaI), t, 'lat:instalaciones');
  }
  // Consejos de diseño (cocinas, armarios y vestidores): lo que funcionaría mal al usarlo, con su porqué; se rehacen con cada cambio.
  function tarjetaConsejos() {
    if (ficha.tipo !== 'cocina' && ficha.tipo !== 'armario') return null;
    const t = h('b', {}), zonaC = h('div', { class: 'zona-consejos' });
    const pintar = () => {
      const c = consejosDiseno(ficha), pu = ficha.tipo === 'cocina' ? puntuarCocina(ficha) : null;
      t.textContent = 'Consejos de diseño' + (c.length ? ' (' + c.length + ')' : '');
      const nota = pu ? h('div', { class: 'puntuacion', 'data-acc': 'puntuacion' },
        h('p', {}, h('b', {}, 'Puntuación: ' + pu.total + '/100'), ' · almacenaje ' + pu.almacenaje.nota + ' · usabilidad ' + pu.usabilidad.nota),
        pu.almacenaje.detalle.length ? h('small', { class: 'ayuda' }, pu.almacenaje.detalle.join(', ')) : null,
        ...pu.almacenaje.mejoras.map(m => h('small', { class: 'ayuda' }, '↑ ' + m)),
        // La mejor combinación posible sin tocar los electrodomésticos: se enseña al lado y se aplica si se quiere
        h('button', { type: 'button', class: 'mini', 'data-acc': 'buscar-mejor', onclick: ev => {
          const r = mejorCocina(ficha), caja = ev.currentTarget.parentElement.querySelector('.mejor-cocina');
          const porQue = r && r.motivos && r.motivos.length ? h('div', { class: 'motivos-mejor', 'data-acc': 'motivos-mejor' }, h('small', { class: 'ayuda' }, 'Sin altos propuestos:'), h('ul', { class: 'consejos' }, r.motivos.map(t => h('li', {}, t)))) : null;
          if (!r || !r.pasos.length) { reemplazar(caja, h('small', { class: 'ayuda' }, 'No encuentro nada mejor sin tocar los electrodomésticos ni alejarlos de sus tomas: está bien así.'), porQue); return; }
          // Cada cambio con su casilla: se aplican solo los marcados (la nota se recalcula con ellos).
          const marcados = r.pasos.map(x => x.marcado !== false), notaSel = h('p', { 'data-acc': 'nota-marcados' }), elegida = () => aplicarCambios(ficha, r.pasos.filter((x, i) => marcados[i]).map(x => x.op));
          const aplicar = h('button', { type: 'button', 'data-acc': 'aplicar-mejor', onclick: async () => {
            const n = marcados.filter(Boolean).length; if (!n) return;
            if (!confirm('¿Hacer ' + (n === 1 ? 'este cambio' : 'estos ' + n + ' cambios') + ' en la cocina? Los electrodomésticos no cambian ni se alejan de su desagüe, salida de humos o enchufe.')) return;
            d.paredes = elegida().datos.paredes; cambio(); await guardarYa(); window.dispatchEvent(new HashChangeEvent('hashchange'));
          } }, 'Aplicar los marcados');
          const recalcular = () => {
            const n = marcados.filter(Boolean).length, pu = n ? puntuarCocina(elegida()) : null;
            reemplazar(notaSel, n ? h('b', {}, 'Con lo marcado: ' + pu.total + '/100') : h('b', {}, 'Nada marcado'), ' (la tuya, ' + r.antes.total + ')' + (pu ? ' · almacenaje ' + pu.almacenaje.nota + ' · usabilidad ' + pu.usabilidad.nota : ''));
            aplicar.disabled = !n;
          };
          reemplazar(caja, h('p', {}, h('b', {}, 'La mejor que encuentro: ' + r.despues.total + '/100'), ' (la tuya, ' + r.antes.total + '). Quita los cambios que no quieras:'),
            h('ul', { class: 'consejos cambios-mejor' }, r.pasos.map((x, i) => h('li', {}, h('label', {}, h('input', { type: 'checkbox', checked: marcados[i], 'data-acc': 'cambio-mejor', 'data-v': String(i),
              onchange: ev => { marcados[i] = ev.currentTarget.checked; recalcular(); } }), ' ' + x.texto)))),
            notaSel, porQue,
            h('div', { class: 'dos' },
              aplicar,
              h('button', { type: 'button', 'data-acc': 'dejar-mia', onclick: () => caja.replaceChildren() }, 'Dejar la mía')));
          recalcular();
        } }, 'Buscar la mejor combinación'),
        h('div', { class: 'mejor-cocina', 'data-acc': 'mejor-cocina' })) : null;
      reemplazar(zonaC, ...[nota].filter(Boolean), c.length
        ? h('div', {}, GRUPOS_CONSEJO.filter(([k]) => c.some(x => x.grupo === k)).map(([k, t]) => h('div', { class: 'grupo-consejos', 'data-grupo': k }, h('h5', {}, t),
          h('ul', { class: 'consejos' }, c.filter(x => x.grupo === k).map(x => h('li', { 'data-consejo': x.campo }, h('b', {}, x.texto), h('small', {}, x.porque)))))))
        : h('p', { class: 'ayuda' }, 'Nada que mejorar con lo que hay puesto.'));
    };
    pintar(); refrescos.push(() => { if (zonaC.isConnected) pintar(); });
    return plegarCaja(h('div', { class: 'tarjeta tarjeta-consejos', 'data-acc': 'consejos' }, t, zonaC,
      h('a', { class: 'mini enlace-guia', href: '#/guia/' + ficha.id, 'data-acc': 'ver-guia' }, 'Guía de medidas →')), t, 'lat:consejos');
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
      reemplazar(zonaPilares, ...de(e => e.tipo === 'pilar'));
      reemplazar(zonaZonas, ...de(e => e.tipo === 'zona'));
      reemplazar(zonaEl, ...de(e => e.tipo !== 'pilar' && e.tipo !== 'zona'));
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
    const pintarEsquinas = () => reemplazar(zonaEsquinas, ...(verEsquinas ? ladosEsq().map(({ lado, q }) => editorDescuadre({
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
      reemplazar(zonaAzulejo, 
        segmentado({ acc: 'azulejo', opciones: [['no', 'Sin'], ['toda', 'Toda'], ['franja', 'Franja'], ['zonas', 'Por zonas']], valor: p.azulejo ?? null, permitirVacio: true, alCambiar: v => { p.azulejo = v; cambio(); pintarAzulejo(); } }),
        ...extra, zonaZonas);
    };
    pintarAzulejo();
    // Plegada, la pared enseña en su título lo que lleva.
    const resPared = h('small', { class: 'res-pared' });
    const pintarRes = () => {
      const n = (l, uno, varios) => (l || []).length ? (l.length + ' ' + (l.length > 1 ? varios : uno)) : null;
      resPared.textContent = [hay(p.largo) ? verMedida(p.largo, udPared) + ' ' + udPared : 'sin largo', n(p.bajos, 'bajo', 'bajos'), n(p.altos, 'alto', 'altos'), p.puente ? n(p.altillos, 'alto de arriba', 'altos de arriba') : null,
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
      reemplazar(zona, ...d.enchufes.map(e => h('div', { class: 'elemento', 'data-elemento': 'enchufe' },
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
        h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Vuelo para sentarse'),
          segmentado({ acc: 'isla-vuelo', opciones: [[250, '25'], [300, '30'], [400, '40']], valor: x.vuelo || null, permitirVacio: true, alCambiar: v => { x.vuelo = v || null; cambio(); repintar(); } }),
          x.vuelo ? h('small', { class: 'ayuda', 'data-acc': 'vuelo-personas' }, 'La encimera sale ' + verMedida(x.vuelo, 'cm') + ' cm por el lado que no da a la cocina' + (x.largo ? ': caben ' + Math.floor(x.largo / 600) + ' personas (60 cm cada una).' : '.')) : null),
        h('small', { class: 'ayuda' }, peninsula ? 'Desde la esquina de la pared hasta el lado de la península.' : 'Desde la esquina de la pared hasta el lado de la isla, a lo largo de la pared.'));
    }
    const repintar = () => { reemplazar(zona, ...d.islas.map(tarjeta)); refrescarAvisos(); };
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
  // Recargo por complicación (cajeado por pilar, tubo o contador, pared descuadrada): en el coste estimado suma su % al
  // precio del mueble. Sin % escrito, el de Ajustes.
  const marcaRecargo = o => (o && o.recargo ? ' · +' + pctRecargo(o, AJ) + ' %' : '');
  function editorRecargo(o, alCambiar = () => {}) {
    const zonaPct = h('div', {});
    const pintarPct = () => reemplazar(zonaPct, ...(o.recargo ? [h('input', { 'data-acc': 'recargo-pct-mueble', inputmode: 'decimal', placeholder: pctDe(AJ) + ' % (el de Ajustes)', value: Number.isFinite(o.recargo.pct) ? o.recargo.pct : '',
      oninput: ev => { const x = Number(String(ev.target.value).replace(',', '.')); o.recargo.pct = ev.target.value.trim() === '' || !Number.isFinite(x) || x < 0 ? null : x; cambio(); alCambiar(); } }),
      h('small', { class: 'ayuda' }, NOMBRE_MOTIVO[o.recargo.motivo] + ': porcentaje sobre el precio de este mueble (vacío: el de Ajustes).')] : []));
    pintarPct();
    return h('div', { class: 'campo recargo', 'data-acc': 'recargo' }, h('label', { class: 'et' }, 'Complicación (recargo)'),
      segmentado({ acc: 'recargo-motivo', opciones: [[null, 'No']].concat(MOTIVOS_CORTOS), valor: o.recargo ? o.recargo.motivo : null, alCambiar: x => {
        if (x) { o.recargo = { motivo: x, pct: o.recargo ? o.recargo.pct : null }; delete o.recargo_no; } else { delete o.recargo; if (x === null) o.recargo_no = true; }
        cambio(); pintarPct(); alCambiar(); } }), zonaPct);
  }
  function muebles(p) {
    const repintarFila = {};
    // Un módulo abierto: su tipo (se puede cambiar), su ancho con las medidas habituales y lo propio de cada tipo.
    function editorModulo(m, nombre, repintar, pintarCuadre) {
      const med = (k, etiqueta, rapidos) => campoMedida({ etiqueta, acc: k, valor: m[k], mal: m.mal && m.mal[k], unidad: 'cm', rapidos,
        alCambiar: (v, t) => {
          anotarMedida(m, k, v, t);
          // Columna de frigo: 92 es la del americano, y el americano solo va en 92.
          if (m.tipo === 'columna_frigo' && k === 'ancho' && (v === 920) !== (m.instalacion === 'americano')) { m.instalacion = v === 920 ? 'americano' : null; cambio(); repintar(); return; }
          cambio(); pintarCuadre(); pintarCampana(); } });
      // Lo que queda a cada lado de la campana y dónde queda su centro: cambia al poner anchos, sin repintar el mueble.
      const textosCampana = h('div', { class: 'textos-campana' });
      function pintarCampana() {
        const x = campanasPared(p, d).find(c => (c.alto || c.placa) === m), c = centrosCampana(p, d).find(q => q.mueble === m);
        const g = geometriaAlzado(d, p), t = g && (g.tubos || []).find(q => q.mueble === m);
        reemplazar(textosCampana, ...[x && h('small', { class: 'ayuda holguras-campana', 'data-acc': 'holguras-campana' }, textoHolgurasCampana(x)),
          c && h('small', { class: 'ayuda centro-campana', 'data-acc': 'centro-campana' }, textoCentroCampana(c) + '.'),
          t && h('small', { class: 'ayuda tubo-humos' + (t.cajear || !t.salida ? ' aviso-tubo' : ''), 'data-acc': 'tubo-humos' }, textoTubo(t)),
          m.extractor === 'recirculacion' && h('small', { class: 'ayuda', 'data-acc': 'tubo-humos' }, 'Placa extractora con recirculación: sin tubo ni salida de humos (filtros de carbón).'),
          c && !m.extractor && salidaCampana(m, p, d) === 'recirculacion' && h('small', { class: 'ayuda', 'data-acc': 'tubo-humos' }, 'Campana de recirculación: sin tubo ni salida de humos (filtros de carbón).'),
          ...airePlaca(d, p).filter(a => a.mueble === m).map(a => h('small', { class: 'ayuda aire-placa', 'data-acc': 'aire-placa' }, textoAirePlaca(a)))].filter(Boolean));
      }
      const sel = h('select', { class: 'select-tipo', 'data-acc': 'tipo-modulo', 'aria-label': 'Tipo de mueble', onchange: () => {
        const t = sel.value; m.tipo = t; if (t === 'rinconero' && !m.forma) Object.assign(m, { forma: 'L', lado2: null, gira: 'der' }); cambio(); repintar(); } },
        GRUPOS_MODULO[nombre].map(([g, l]) => h('optgroup', { label: g }, l.map(t => h('option', { value: t }, NOMBRE_MODULO[t])))));
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
      // Lavavajillas, lavadora y frigo: integrable (con puerta) o libre (sin puerta, no cuenta en frentes ni presupuesto).
      // Campana: tipo y tamaño en el mueble «Campana piramidal» (que hace de hueco) y lo que queda a cada lado; en la placa,
      // si ya lleva una decorativa encima, lo mismo.
      // Placa y campana de 60 si no se elige otra (o la de Electrodomésticos). Debajo de una campana sin mueble de placa
      // se dibuja la placa centrada (p. ej. encima de dos cajoneras), con su tamaño aquí.
      if (m.tipo === 'campana_deco' || m.tipo === 'placa' || m.tipo === 'alto_campana') {
        const x = campanasPared(p, d).find(c => (c.alto || c.placa) === m), cm = v => Math.round(v / 10);
        const tamano = (acc, etiqueta, clave, opciones, porDefecto) => h('div', { class: 'campo' }, h('label', { class: 'et' }, etiqueta + ' (sin marcar: ' + cm(porDefecto) + ')'),
          segmentado({ acc, opciones: opciones.map(v => [v, String(cm(v))]), valor: m[clave] ?? null, permitirVacio: true, alCambiar: v => { m[clave] = v; cambio(); repintar(); } }));
        if (m.tipo === 'campana_deco') {
          n.push(tamano('campana-ancho', 'Tamaño de la campana (el mueble es el hueco)', 'campana_ancho', [600, 900, 1200], anchoCampana(null, d)));
        }
        n.push(tamano('placa-ancho', m.tipo === 'placa' ? 'Tamaño de la placa' : 'Placa debajo: tamaño', 'placa_ancho', [300, 600, 700, 800, 900], anchoPlaca(null, d)));
        n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, m.tipo === 'placa' ? 'Tipo de placa' : 'Placa debajo: tipo'),
          segmentado({ acc: 'placa-tipo', opciones: [['induccion', 'Inducción'], ['vitro', 'Vitro'], ['gas', 'Gas']], valor: m.placa_tipo ?? null, permitirVacio: true,
            alCambiar: v => { m.placa_tipo = v; if (v && v !== 'induccion') delete m.extractor; cambio(); repintar(); } })));
        // Placa extractora (el extractor en la propia placa; solo las hay de inducción): sin campana encima; el aire se
        // limpia y vuelve (recirculación) o sale a la calle con un tubo a ras de suelo, por detrás del zócalo.
        if (m.tipo === 'placa' && (!m.placa_tipo || m.placa_tipo === 'induccion' || m.extractor)) n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Placa con extractor (solo inducción)'),
          segmentado({ acc: 'placa-extractor', opciones: [['recirculacion', 'Recirculación'], ['exterior', 'Sale a la calle (a ras de suelo)']], valor: m.extractor ?? null, permitirVacio: true,
            alCambiar: v => {
              m.extractor = v;
              if (v) { m.placa_tipo = 'induccion'; p.altos = p.altos.filter(x => x.tipo !== 'alto_campana'); if (repintarFila.altos) repintarFila.altos(); }   // sin campana: fuera su mueble
              if (v === 'recirculacion') { m.horno = null; m.variante = null; }   // el filtro va debajo: sin horno
              cambio(); repintar(); } }),
          m.extractor === 'recirculacion' ? h('small', { class: 'ayuda', 'data-acc': 'extractor-sin-horno' }, 'Con recirculación el filtro va debajo de la placa: sin horno; el cajón de arriba es ciego y abajo van dos caceroleros.') : null));
        // La campana va con la placa: vista (decorativa; en los altos se le deja el sitio, centrada con la placa) o un mueble
        // con el extractor dentro (el «Alto campana», que se pone solo en los altos, centrado con la placa).
        if (m.tipo === 'placa' && !m.extractor) {
          const ac = p.altos.find(x => x.tipo === 'alto_campana'), refrescarAltos = () => { if (repintarFila.altos) repintarFila.altos(); };
          n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Campana'),
            segmentado({ acc: 'campana-forma', opciones: [['vista', 'Campana vista'], ['mueble', 'Mueble con extractor']], valor: ac ? 'mueble' : 'vista', alCambiar: v => {
              if (v === 'mueble' && !ac) p.altos.push(Object.assign(moduloNuevo('alto_campana'), { ancho: m.campana_ancho === 900 ? 900 : 600 }));
              if (v === 'vista') p.altos = p.altos.filter(x => x.tipo !== 'alto_campana');
              cambio(); repintar(); refrescarAltos(); } })));
          if (ac) n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Ancho del mueble de la campana'),
            segmentado({ acc: 'campana-ancho', opciones: [[600, '60'], [900, '90']], valor: ac.ancho, alCambiar: v => { anotarMedida(ac, 'ancho', v); m.campana_ancho = v; cambio(); repintar(); refrescarAltos(); } })),
            h('small', { class: 'ayuda', 'data-acc': 'campana-mueble' }, 'El alto de la campana va solo en los altos, centrado con la placa' + (placaDeGas(d) ? ', a ' + Math.round(SOBRE_GAS / 10) + ' cm de la placa (gas) y a ras por arriba con los demás altos.' : '.')));
          else n.push(tamano('campana-ancho', 'Tamaño de la campana', 'campana_ancho', [600, 900, 1200], anchoCampana(null, d)));
        }
        if (placaDeGas(d) && (m.tipo !== 'placa' || !m.extractor)) n.push(h('small', { class: 'ayuda', 'data-acc': 'campana-gas' }, 'Placa de gas: la campana a ' + Math.round(SOBRE_GAS / 10) + ' cm de la placa (' + Math.round(MINIMO_GAS / 10) + ' como mínimo).'));
        if (m.tipo !== 'placa' || !m.extractor) n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Salida de la campana' + (m.campana_salida ? '' : salidaCampana(m, p, d) === 'recirculacion' ? ' (sin marcar: recirculación, por la salida de humos)' : '')),
          segmentado({ acc: 'campana-salida', opciones: [['exterior', 'A la calle (con tubo)'], ['recirculacion', 'Recirculación (sin tubo)']], valor: m.campana_salida ?? null, permitirVacio: true, alCambiar: v => { m.campana_salida = v; cambio(); repintar(); } })));
        pintarCampana(); n.push(textosCampana);
      }
      if (tieneInstalacion(m)) {
        const ops = [['integrable', 'Integrable (con puerta)'], ['libre', 'Libre (sin puerta)']].concat(m.tipo === 'columna_frigo' ? [['americano', 'Americano']] : []), actual = instalacionDe(m, d);
        n.push(h('div', { class: 'campo instalacion' + (actual ? '' : ' sin-contestar'), 'data-acc': 'instalacion-campo' }, h('label', { class: 'et' }, '¿Integrable o de libre instalación?'),
          segmentado({ acc: 'instalacion', opciones: ops, valor: actual, permitirVacio: true, alCambiar: x => {
            // El frigorífico americano solo va en un hueco de 92; y al dejar de serlo, el 92 se quita.
            if (m.tipo === 'columna_frigo' && x === 'americano') anotarMedida(m, 'ancho', 920);
            else if (m.tipo === 'columna_frigo' && m.instalacion === 'americano' && m.ancho === 920) anotarMedida(m, 'ancho', null);
            m.instalacion = x; cambio(); repintar(); } }),
          h('small', { class: 'ayuda' }, !actual ? 'Sin contestar: se cuenta como integrable.' : actual === 'integrable' ? 'Lleva la puerta del mueble: cuenta en los frentes y en el presupuesto.' : 'Sin puerta: no cuenta en los frentes ni en el presupuesto (queda el hueco).')));
      }
      // Alto micro: de 50, microondas de libre instalación (46 × 29); de 60, integrable
      if (m.tipo === 'alto_micro') n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Microondas'),
        segmentado({ acc: 'micro-tipo', opciones: [['libre', 'Libre (mueble de 50)'], ['integrable', 'Integrable (mueble de 60)']], valor: m.ancho ? (microLibre(m) ? 'libre' : 'integrable') : null,
          alCambiar: v => { anotarMedida(m, 'ancho', v === 'libre' ? MICRO_LIBRE.mueble : 600); cambio(); repintar(); pintarCuadre(); } }),
        h('small', { class: 'ayuda' }, 'Libre: suelen medir de 44 a 48 de ancho y de 28 a 30 de alto (se cuenta 46 × 29).')));
      // Columna desayunador: el hueco libre sobre la encimera (70 u 80); el alto de fondo 60 llega hasta arriba
      if (m.tipo === 'columna_desayuno') {
        const top = p.puente ? topePuente(d) : ALTURAS.columna, puertas = top - (ALTURAS.encimera + huecoDesayuno(m));
        n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Hueco libre sobre la encimera'),
          segmentado({ acc: 'hueco-desayuno', opciones: HUECOS_DESAYUNO.map(v => [v, String(v / 10)]), valor: huecoDesayuno(m), alCambiar: v => { m.hueco = v === 800 ? 800 : null; cambio(); repintar(); } })),
          h('small', { class: 'ayuda' + (puertas > 900 ? ' aviso-tubo' : ''), 'data-acc': 'desayuno-alto' }, 'Arriba, alto de fondo 60 con puertas de ' + verMedida(puertas, 'cm') + ' cm' + (puertas > 900 ? ' ⚠ pasa de 90: mejor un hueco de 80 o partirlo en dos.' : '.') + ' Pon enchufes en el hueco (tostadora, cafetera).'));
      }
      // Columna con un electrodoméstico abajo: qué va abajo y qué va arriba
      if (m.tipo === 'columna_electro') {
        n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Abajo'),
          segmentado({ acc: 'columna-abajo', opciones: ABAJO_COLUMNA, valor: m.abajo || 'lavavajillas', alCambiar: v => { m.abajo = v; cambio(); repintar(); } })));
        if ((m.abajo || 'lavavajillas') === 'lavavajillas') n.push(h('small', { class: 'ayuda' }, 'Subido: frente fijo hasta 28 cm del suelo y hueco de 85 para el lavavajillas.'));
        n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Arriba'),
          segmentado({ acc: 'columna-arriba', opciones: ARRIBA_COLUMNA, valor: m.arriba || 'puertas', alCambiar: v => { m.arriba = v; cambio(); repintar(); } })));
      }
      // Para el presupuesto: modelo y altura del catálogo (si no se elige, va el habitual, que sale marcado).
      const vs = variantesDe(m), al = alturasDe(m);
      if (vs.length > 1 || al.length) {
        const art = articulo(m, d), cajaP = h('div', { class: 'campo presupuesto-modulo' }, h('label', { class: 'et' }, 'Para el presupuesto'));
        // En la placa, el frente dice si lleva horno debajo (soporte de horno) o no (cajones, puertas)
        if (vs.length > 1) cajaP.append(h('div', { class: 'chips' }, vs.map(v => h('button', { type: 'button', 'data-acc': 'variante', 'data-v': v, class: (m.variante || varianteHabitual(m, d)) === v ? 'on' : '',
          onclick: () => { if (m.tipo === 'placa') m.horno = v.startsWith('SOPORTE HORNO') || null; m.variante = v === varianteHabitual(m, d) ? null : v; cambio(); repintar(); } }, NOMBRE_VARIANTE(v)))));
        if (m.tipo === 'placa') cajaP.append(h('small', { class: 'ayuda' }, 'Con horno debajo: un soporte de horno.'));
        if (al.length) cajaP.append(h('div', { class: 'chips' }, al.map(v => h('button', { type: 'button', 'data-acc': 'altura-catalogo', 'data-v': v, class: (m.altura || alturaHabitual(m, d)) === v ? 'on' : '',
          onclick: () => { m.altura = v === alturaHabitual(m, d) ? null : v; cambio(); repintar(); } }, NOMBRE_VARIANTE(v)))));
        cajaP.append(h('small', { class: 'ayuda', 'data-acc': 'articulo' }, art ? (art.revisar ? '⚠ ' + art.revisar : art.texto) : ''));
        n.push(cajaP);
      }
      // Alto del horno (60 o compacto de 45): en la columna H/MO, la semicolumna con horno, la columna con horno arriba
      // y el soporte de horno con cajón de la placa (el cajón llena lo que queda)
      const v = m.variante || varianteHabitual(m, d) || '';
      if (m.tipo === 'columna_hmo' || (m.tipo === 'placa' && v === 'SOPORTE HORNO Y 1 GAVETERO') || (m.tipo === 'semicolumna' && /HORNO/.test(v)) || (m.tipo === 'columna_electro' && ['hmo', 'horno'].includes(m.arriba)))
        n.push(h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Alto del horno'),
          segmentado({ acc: 'horno-alto', opciones: [[600, '60'], [450, '45 (compacto)']], valor: altoHorno(m), alCambiar: x => { m.horno_alto = x === 450 ? 450 : null; cambio(); repintar(); } })));
      n.push(editorRecargo(m, () => repintarFila[nombre] && repintarFila[nombre]()));
      return n;
    }
    if (!p.bajos) p.bajos = [];
    if (!p.altos) p.altos = [];
    const caja = h('div', { class: 'campo' });
    const abiertos = { bajos: null, altos: null };
    function fila(nombre, titulo) {
      const zona = h('div', { class: 'modulos' }), cuadre = h('small', { class: 'cuadre', 'data-acc': 'cuadre-' + nombre });
      // Arriba solo se cuadra si hay altos: las columnas solas no son una fila de altos.
      const pintarCuadre = () => { cuadre.textContent = nombre !== 'bajos' && !p[nombre].length ? '' : textoCuadre(nombre === 'bajos' ? cuadreBajos(p, d) : nombre === 'altos' ? cuadreAltos(p, d) : cuadreAltillos(p, d), 'cm'); };
      const repintar = () => {
        reemplazar(zona, ...listaOrdenada({ lista: p[nombre], atributo: 'data-modulo', abierto: () => abiertos[nombre], alAbrir: idm => { abiertos[nombre] = idm; }, repintar,
          resumen: nombreModulo, detalle: m => (m.ancho ? ' · ' + medidasModulo(m) : '') + marcaRecargo(m),
          editor: m => editorModulo(m, nombre, repintar, pintarCuadre) }));
        pintarCuadre(); refrescarAvisos();
      };
      refrescos.push(pintarCuadre);
      repintarFila[nombre] = repintar;
      repintar();
      // Botones para añadir, en grupos (bajos, columnas, otros); bajos y altos, separados por una raya
      return h('div', { 'data-fila': nombre, class: 'fila-muebles fila-' + nombre }, h('label', { class: 'et' }, titulo), zona, cuadre,
        ...GRUPOS_MODULO[nombre].map(([g, l]) => h('div', { class: 'grupo-anadir' }, h('small', { class: 'et-grupo' }, g),
          h('div', { class: 'chips' }, l.map(t => h('button', { type: 'button', 'data-acc': 'anadir-modulo', 'data-v': t, onclick: () => {
            const m = moduloNuevo(t); p[nombre].push(m); abiertos[nombre] = m.id; cambio(); repintar();
          } }, CORTO_MODULO[t] || NOMBRE_MODULO[t]))))));
    }
    // Cocina puente (cocinas altas): encima de los altos, otra fila de fondo 60 desde los 195 hasta el techo; las columnas, también
    if (!p.altillos) p.altillos = [];
    const zonaPuente = h('div', {});
    const pintarPuente = () => reemplazar(zonaPuente, ...(p.puente ? [fila('altillos', 'Altos de arriba (fondo 60, de ' + verMedida(PUENTE.desde, 'cm') + ' cm hasta el techo menos ' + verMedida(PUENTE.cierre, 'cm') + ')')] : []));
    const puente = h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Cocina puente (altos a dos alturas)'),
      segmentado({ acc: 'puente', opciones: SI_NO, valor: !!p.puente, alCambiar: v => { p.puente = v || null; cambio(); pintarPuente(); refrescarAvisos(); refrescos.forEach(f => f()); } }));
    pintarPuente();
    caja.append(fila('bajos', 'Bajos y columnas'), fila('altos', 'Altos'), puente, zonaPuente);
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
      reemplazar(zona, ...listaOrdenada({ lista, atributo: 'data-cuerpo', abierto: () => abierto, alAbrir: idc => { abierto = idc; }, repintar,
        resumen: c => 'Cuerpo ' + (lista.indexOf(c) + 1) + (c.rincon ? ' · ' + textoRincon(c) : '') + (interioresDe(c).length ? ' · ' + textoInteriores(c, AJ) : '') + (c.puertas ? ' · puertas ' + (c.puertas === 'corredera' ? 'correderas' : 'abatibles') : '') + marcaRecargo(c),
        editor: c => [enPared ? editorRincon(c) : null,
          campoMedida({ etiqueta: c.rincon && c.rincon !== 'recto' ? 'Ancho en esta pared' : 'Ancho', acc: 'ancho', valor: c.ancho, mal: c.mal && c.mal.ancho, unidad: 'cm', rapidos: c.rincon && c.rincon !== 'recto' ? LADOS_RINCON_CUERPO : AJ.modulo_anchos, alCambiar: (v, t) => { anotarMedida(c, 'ancho', v, t); cambio(); pintarCuadre(); } }),
          c.rincon && c.rincon !== 'recto' ? campoMedida({ etiqueta: 'En la pared ' + (vecinaDe(c) ? vecinaDe(c).letra : 'de al lado'), acc: 'lado2', valor: c.lado2, unidad: 'cm', rapidos: LADOS_RINCON_CUERPO, alCambiar: v => { c.lado2 = v; cambio(); pintarCuadre(); } }) : null,
          h('label', { class: 'et' }, 'Interior'),
          h('small', { class: 'ayuda' }, c.rincon && c.rincon !== 'recto' ? 'En el rincón: estantes o barra.' : 'Hasta dos (p. ej. barra y cajonera); la doble barra va sola.'),
          h('div', { class: 'chips' }, interiores.filter(([v]) => !(c.rincon && c.rincon !== 'recto') || INTERIOR_RINCON.includes(v)).map(([v, t]) => h('button', { type: 'button', 'data-acc': 'interior', 'data-v': v, class: interioresDe(c).includes(v) ? 'on' : '', onclick: () => { elegirInterior(c, v); cambio(); repintar(); } }, t))),
          interioresDe(c).includes('otro') ? h('input', { 'data-acc': 'nombre-cuerpo', placeholder: '¿Qué interior?', value: c.nombre || '', oninput: ev => { c.nombre = ev.target.value; cambio(); } }) : null,
          enPared ? h('label', { class: 'et' }, 'Puertas') : null,
          enPared ? segmentado({ acc: 'puertas-cuerpo', opciones: [['abatible', 'Abatibles'], ['corredera', 'Correderas']], valor: c.puertas || null, permitirVacio: true, alCambiar: v => { c.puertas = v || null; cambio(); repintar(); } }) : null,
          editorRecargo(c, () => repintar())] }));
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
    if (ac.tirador) t.push((TIRADORES.find(x => x[0] === ac.tirador) || [, ac.tirador])[1].toLowerCase());
    if (ac.encimera && (ac.encimera.material || ac.encimera.modelo || ac.encimera.color)) t.push('encimera ' + [ac.encimera.material, ac.encimera.modelo, ac.encimera.color].filter(Boolean).join(' '));
    if ((ac.lineales || []).length) t.push(ac.lineales.length + ' lineal' + (ac.lineales.length > 1 ? 'es' : ''));
    return t.join(' · ');
  };
  // Material para pedir (encimera, lineales, herrajes), sacado de lo medido; se rehace con cada cambio.
  // En el título de «Material», cuántos tableros hacen falta (sin tener que abrirla).
  const resumenMaterial = () => {
    const l = textoMaterial(ficha, unidad, AJ);
    if (!l.length) return '';
    const tb = l.map(t => { const m = /^(Cascos|Frentes|Tableros de casco y puertas).*?(\d+) (tableros?) de 280×207/.exec(t); return m ? m[2] + ' ' + m[3] + (m[1] === 'Frentes' ? ' de frentes' : m[1] === 'Cascos' ? ' de cascos' : ' de casco y puertas') : null; }).filter(Boolean);
    const otros = l.filter(t => !/^(Cascos|Frentes|Tableros de casco)/.test(t) && !t.startsWith('- '));
    return [otros.length ? otros[0].replace(/:.*/, '') : '', ...tb].filter(Boolean).join(' · ');
  };
  function material() {
    const caja = h('div', { class: 'tarjeta material', 'data-acc': 'material' });
    const pintar = () => { const l = textoMaterial(ficha, unidad, AJ);
      reemplazar(caja, ...(l.length ? l.map(t => h('p', { class: t.startsWith('- ') ? 'sub' : '' }, t)) : [h('p', { class: 'ayuda' }, 'Aún no hay muebles con medida.')]),
        h('small', { class: 'ayuda' }, 'Orientativo: sale de los muebles medidos. Lo medido y lo pedido mandan.')); };
    pintar(); refrescos.push(() => { if (caja.isConnected) pintar(); });
    return caja;
  }
  // Coste estimado: por metro lineal con los precios de Ajustes y los recargos de cada mueble. Solo en pantalla.
  const resumenCoste = () => {
    const e = estimacionRapida(ficha, AJ);
    if (e.vacio) return '';
    return euros(e.total) + ' sin IVA' + (e.propuestas.length ? ' · ' + e.propuestas.length + ' cajeado' + (e.propuestas.length > 1 ? 's' : '') + ' por confirmar' : '');
  };
  // Con la tarifa de Presupuestos (cocina, vestidor y armarios): a petición, porque abre Presupuestos por dentro.
  let tarifa = null;   // { estado: 'calculando' | 'ok' | 'error', res, firma }
  const conTarifa = ficha.tipo === 'cocina' || ficha.tipo === 'armario';
  const firmaPaquete = () => JSON.stringify(paquetePresupuesto(ficha, trabajo, AJ, { estimar: true }).grupos);
  function costeEstimado() {
    const caja = h('div', { class: 'tarjeta coste', 'data-acc': 'coste' });
    const calcular = async () => {
      const firma = firmaPaquete();
      tarifa = { estado: 'calculando', firma }; pintar();
      try {
        const paq = paquetePresupuesto(ficha, trabajo, AJ, { estimar: true });
        // Cocina: tres gamas (económica, media, alta); el desglose, el de la media. Vestidor y armario: uno.
        if (ficha.tipo === 'cocina') { const gs = await estimarGamas(paq); tarifa = { estado: 'ok', gamas: gs, res: gs[1].res, firma }; }
        else tarifa = { estado: 'ok', res: await estimarConTarifa(paq), firma };
      }
      catch (e) { tarifa = { estado: 'error', error: e && e.message, firma }; }
      if (caja.isConnected) pintar();
    };
    const desglose = r => [...r.grupos.filter(g => g.total > 0).map(g => fila(g.nombre, g.total, { 'data-grupo-tarifa': g.nombre })),
      r.instalacion > 0 ? fila('Instalación', r.instalacion, { 'data-grupo-tarifa': 'Instalación' }) : null,
      h('div', { class: 'fila-coste total', 'data-acc': 'tarifa-total' }, h('span', {}, 'Total sin IVA'), h('b', {}, euros(r.total))),
      h('div', { class: 'fila-coste iva' }, h('span', {}, 'Con IVA (' + IVA + ' %)'), h('span', {}, euros(r.total * (1 + IVA / 100))))];
    const nomGama = c => (c.charAt(0) + c.slice(1).toLowerCase()).replace(/^Dm-/, 'DM-');
    // Tres horquillas: total sin IVA y con IVA de cada gama; el desglose de la media, plegado.
    const gamasTarifa = (gs, media) => [...gs.map(g => h('div', { class: 'fila-coste gama', 'data-acc': 'tarifa-gama', 'data-v': g.cal },
        h('span', {}, h('b', {}, g.nombre), h('small', {}, ' · ' + nomGama(g.cal))), h('span', { class: 'importes' }, h('b', {}, euros(g.res.total)), h('small', {}, ' · ' + euros(g.res.total * (1 + IVA / 100)) + ' con IVA')))),
      h('small', { class: 'ayuda' }, 'Sin IVA; detrás, con IVA (' + IVA + ' %).'),
      h('details', { class: 'desglose-tarifa', 'data-acc': 'tarifa-desglose' }, h('summary', {}, 'Desglose de la gama media'), ...desglose(media))];
    const bloqueTarifa = () => {
      if (!conTarifa) return null;
      const r = tarifa && tarifa.res, cambiado = tarifa && tarifa.estado === 'ok' && tarifa.firma !== firmaPaquete(), sp = sinPrecio(r);
      const boton = t => h('button', { type: 'button', 'data-acc': 'calcular-tarifa', onclick: calcular }, t);
      return h('div', { class: 'tarifa' + (cambiado ? ' viejo' : ''), 'data-acc': 'tarifa' }, h('b', { class: 'titulo-tarifa' }, 'Con la tarifa de Presupuestos'),
        ...(!tarifa ? [h('small', { class: 'ayuda' }, ficha.tipo === 'cocina' ? 'Mueble a mueble, con los precios de Presupuestos de este móvil, en tres gamas: económica (Básico), media (DM-Laca medio) y alta (Alto gama). Con costados, regletas, tiradores (los de Acabados), encimera, zócalo, cornisa, LED, electrodomésticos (orientativos, de Ajustes) e instalación.' : 'Con la calculadora de armarios de Presupuestos de este móvil (casco, puertas e interior).'), boton('Calcular con la tarifa')]
          : tarifa.estado === 'calculando' ? [h('p', { 'data-acc': 'tarifa-calculando' }, 'Calculando con la tarifa…')]
          : tarifa.estado === 'error' ? [h('p', { class: 'aviso-tarifa', 'data-acc': 'tarifa-error' }, 'No se ha podido calcular. Abre Presupuestos una vez en este móvil (con tu sesión) para tener la tarifa, y vuelve a probar.'), boton('Probar otra vez')]
          : [...(tarifa.gamas ? gamasTarifa(tarifa.gamas, r) : desglose(r)),
            sp.length ? h('details', { class: 'sin-precio', 'data-acc': 'tarifa-sin-precio' }, h('summary', {}, '⚠ ' + sp.length + (sp.length > 1 ? ' cosas' : ' cosa') + ' sin precio (no suman)'), h('ul', {}, sp.map(t => h('li', {}, t)))) : null,
            cambiado ? h('small', { class: 'aviso-tarifa', 'data-acc': 'tarifa-vieja' }, 'Has cambiado algo desde el cálculo.') : null,
            boton('Volver a calcular')]));
    };
    const fila = (t, imp, extra = {}) => h('div', Object.assign({ class: 'fila-coste' }, extra), h('span', {}, t), h('b', {}, euros(imp)));
    const pintar = () => {
      const e = estimacionRapida(ficha, AJ), armarioEntero = ficha.tipo === 'armario' && ficha.subtipo !== 'vestidor' && !(d.cuerpos || []).some(c => c.ancho > 0);
      reemplazar(caja,
        ...e.propuestas.map(x => h('div', { class: 'propuesta-recargo', 'data-acc': 'propuesta-recargo' },
          h('span', {}, '⚠ ' + x.texto + ' choca con un pilar: ¿cajeado (+' + pctDe(AJ) + ' %)?'),
          h('div', { class: 'dos' }, h('button', { type: 'button', 'data-acc': 'aceptar-recargo', onclick: () => { aceptarPropuesta(x.obj); cambio(); pintar(); } }, 'Sí, añadir'),
            h('button', { type: 'button', 'data-acc': 'descartar-recargo', onclick: () => { descartarPropuesta(x.obj); cambio(); pintar(); } }, 'No')))),
        ...(e.vacio ? [h('p', { class: 'ayuda' }, 'Aún no hay muebles con medida.')] : [
          ...e.lineas.map(l => fila(l.texto + ': ' + metros(l.metros) + ' × ' + euros(l.precio) + '/m', l.importe, { 'data-linea': l.clase })),
          ...e.recargos.map(r => fila(r.texto + ' (+' + r.pct + ' %)', r.importe, { 'data-recargo': r.motivo })),
          h('div', { class: 'fila-coste total', 'data-acc': 'coste-total' }, h('span', {}, 'Total sin IVA'), h('b', {}, euros(e.total))),
          h('div', { class: 'fila-coste iva', 'data-acc': 'coste-iva' }, h('span', {}, 'Con IVA (21 %)'), h('span', {}, euros(e.conIva)))]),
        armarioEntero ? editorRecargo(d, pintar) : null,
        bloqueTarifa(),
        h('small', { class: 'ayuda' }, 'Orientativo, por metro lineal (precios en Ajustes → Cocina y armarios). Solo lo ves tú: no sale en el PDF ni en lo que compartes.'));
    };
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
    // Alturas de esta cocina: vacías, las de Ajustes (cocina tipo); lo que se ponga aquí manda solo en esta cocina.
    const infoAlturas = h('small', { class: 'ayuda', 'data-acc': 'alturas-info' });
    const pintarInfo = () => { const ct = alturasCocina(d, AJ), enc = ct.zocalo + ct.mueble + ct.grueso, des = enc + ct.separacion;
      infoAlturas.textContent = 'Encimera a ' + verMedida(enc, 'cm') + ' cm · altos de ' + verMedida(des, 'cm') + ' a ' + verMedida(des + ct.alto_alto, 'cm') + ' cm del suelo · columna hasta arriba de los altos: casco de ' + verMedida(des + ct.alto_alto - ct.zocalo, 'cm') + ' cm'
        + (ct.redondeada ? ' (altos a ' + verMedida(ct.separacion, 'cm') + ' cm de la encimera, para que la columna quede en número redondo).' : '.'); };
    const alturas = () => {
      if (!d.alturas) d.alturas = {};
      const ctAj = (AJ && AJ.cocina_tipo) || {};
      pintarInfo();
      // «De la encimera a los altos» y «Altos desde el suelo» son la misma cosa vista de dos maneras: se apunta una y la
      // otra se rellena sola (desde el suelo − zócalo − mueble bajo − encimera). Apuntar una borra la otra guardada.
      const calc = () => { const ct = alturasCocina(d, AJ), enc = ct.zocalo + ct.mueble + ct.grueso;
        return { separacion: d.alturas.separacion ?? (d.alturas.desde ? ct.separacion : null), desde: d.alturas.desde ?? (d.alturas.separacion ? enc + ct.separacion : null) }; };
      const caja2 = h('div', { class: 'dos alturas-cocina' });
      const otro = { separacion: 'desde', desde: 'separacion' };
      const rellenar = () => { const c = calc(); ['separacion', 'desde'].forEach(k => { const i = caja2.querySelector('input[data-acc="altura-' + k + '"]'); if (i && document.activeElement !== i) i.value = c[k] ? verMedida(c[k], 'cm') : ''; }); };
      // Medidas de siempre a un toque, en la misma línea: zócalo 10/15, bajos 70/80, encimera (las de Ajustes), altos 70/90 o libre.
      // El grueso de la encimera solo se pregunta aquí (vale también para la encimera de los acabados).
      const RAPIDAS = { zocalo: [100, 150], mueble: [700, 800], grueso: AJ.encimera_gruesos, alto_alto: [700, 900] };
      const valorDe = k => (otro[k] ? calc()[k] : k === 'grueso' ? d.alturas.grueso ?? ac.encimera.grueso ?? null : d.alturas[k] ?? null);
      caja2.append(...CAMPOS_ALTURA.map(([k, t]) => campoMedida({ etiqueta: t + (ctAj[k] ? ' (' + verMedida(ctAj[k], 'cm') + ')' : ''), acc: 'altura-' + k, valor: valorDe(k), unidad: 'cm',
        rapidos: RAPIDAS[k], enLinea: !!RAPIDAS[k], libre: k === 'alto_alto' ? 'libre' : null,
        alCambiar: v => {
          if (otro[k] && v > 0 && !d.alturas[k] && v === calc()[k]) return;   // el valor calculado, sin tocar: no cambia nada
          if (v > 0) d.alturas[k] = v; else delete d.alturas[k];
          if (k === 'grueso') ac.encimera.grueso = v > 0 ? v : null;
          if (otro[k] && v > 0) delete d.alturas[otro[k]];
          fijarCocinaTipo(alturasCocina(d, AJ)); pintarInfo(); rellenar(); cambio();
        } })));
      return [h('label', { class: 'et' }, 'Alturas de esta cocina (vacío: las de Ajustes)'),
        caja2,
        infoAlturas];
    };
    // Remates: costados vistos, regletas y cierres a techo. Salen solos de las medidas; aquí se elige si van y de qué
    // material (como los frentes, como el casco u otro). Lo que va cuenta en los tableros y en las hojas de pedido.
    const infoRemates = h('small', { class: 'ayuda', 'data-acc': 'remates-info' });
    const pintarRemates = () => { const t = textoRemates(d); infoRemates.textContent = t.length ? t[0] + (t.length > 1 ? ': ' + t.slice(1).map(x => x.replace(/^- /, '')).join(' · ') : '') : 'Con lo medido no hace falta ningún remate.'; };
    refrescos.push(() => { if (infoRemates.isConnected) pintarRemates(); });
    const remates = () => {
      if (!d.remates) d.remates = {};
      pintarRemates();
      return [h('label', { class: 'et' }, 'Remates (costados vistos, regletas y cierres a techo)'),
        ...TIPOS_REMATE.map(([k, t]) => {
          const o = () => (d.remates[k] = d.remates[k] || {}), op = opcionRemate(d, k);
          return h('div', { class: 'campo remate', 'data-remate': k }, h('label', { class: 'et' }, t),
            segmentado({ acc: 'remate-usar', opciones: SI_NO, valor: op.usar, alCambiar: v => { o().usar = v; cambio(); pintar(); } }),
            op.usar ? segmentado({ acc: 'remate-material', opciones: MATERIALES_REMATE, valor: op.material, alCambiar: v => { o().material = v; cambio(); pintar(); } }) : null,
            op.usar && op.material === 'otro' ? texto(o(), 'otro', 'remate-otro', '¿Qué material? (p. ej. DM lacado, roble…)') : null);
        }),
        h('div', { class: 'dos' },
          campoMedida({ etiqueta: 'Regleta a la pared (mín.)', acc: 'remate-regleta', valor: d.remates.regleta_mm ?? null, unidad: 'cm', rapidos: [30, 40, 50], alCambiar: v => { if (v > 0) d.remates.regleta_mm = v; else delete d.remates.regleta_mm; cambio(); } }),
          campoMedida({ etiqueta: 'Grueso del costado', acc: 'remate-costado', valor: d.remates.costado_mm ?? null, unidad: 'cm', rapidos: [16, 19, 20], alCambiar: v => { if (v > 0) d.remates.costado_mm = v; else delete d.remates.costado_mm; cambio(); } })),
        h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Costado de columna junto a un bajo'),
          segmentado({ acc: 'costado-columna', opciones: [['suelo', 'Hasta el suelo'], ['encimera', 'Sobre la encimera']], valor: d.remates.costado_columna || 'suelo', alCambiar: v => { if (v === 'encimera') d.remates.costado_columna = v; else delete d.remates.costado_columna; cambio(); pintar(); } }),
          h('small', { class: 'ayuda' }, 'Sobre la encimera: los bajos van pegados a la columna y se ganan esos 2 cm abajo.')),
        h('small', { class: 'ayuda' }, 'Vacío: regleta de 4 cm (que abran las bisagras de 110° con el tirador) y costado de 2 cm. Ocupan su sitio en la pared.'),
        infoRemates];
    };
    const pintarLineales = () => reemplazar(zonaLin, ...ac.lineales.map(l => h('div', { class: 'libre', 'data-lineal': l.tipo },
      l.tipo === 'otro' ? texto(l, 'nombre', 'lineal-nombre', '¿Qué lineal?') : h('span', {}, nombreLineal(l, AJ)),
      texto(l, 'modelo', 'lineal-modelo', 'Modelo o color'),
      h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-lineal', onclick: () => { if (confirmarQuitar(nombreLineal(l, AJ).toLowerCase())) { ac.lineales.splice(ac.lineales.indexOf(l), 1); cambio(); pintarLineales(); } } }, '✕'))));
    const pintar = () => {
      reemplazar(caja, 
        h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Bitono (altos y bajos distintos)'),
          segmentado({ acc: 'bitono', opciones: SI_NO, valor: ac.bitono, permitirVacio: true, alCambiar: v => { ac.bitono = v; cambio(); pintar(); } })),
        ...(ac.bitono
          ? [h('label', { class: 'et' }, 'Altos'), h('div', { class: 'dos' }, texto(ac, 'modelo_altos', 'acab-modelo_altos', 'Modelo'), texto(ac, 'color_altos', 'acab-color_altos', 'Color')),
            h('label', { class: 'et' }, 'Bajos'), h('div', { class: 'dos' }, texto(ac, 'modelo_bajos', 'acab-modelo_bajos', 'Modelo'), texto(ac, 'color_bajos', 'acab-color_bajos', 'Color'))]
          : [h('label', { class: 'et' }, 'Frentes (puertas)'), h('div', { class: 'dos' }, texto(ac, 'modelo', 'acab-modelo', 'Modelo'), texto(ac, 'color', 'acab-color', 'Color'))]),
        ...cascos(),
        ...(vestidor ? [] : [
          h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Tirador'),
            segmentado({ acc: 'tirador', opciones: TIRADORES, valor: ac.tirador || null, permitirVacio: true, alCambiar: v => { ac.tirador = v || null; cambio(); } })),
          h('label', { class: 'et' }, 'Encimera'),
          segmentado({ acc: 'encimera-material', opciones: MATERIALES_ENCIMERA.map(m => [m, m]), valor: ac.encimera.material || null, permitirVacio: true, alCambiar: v => { ac.encimera.material = v || ''; cambio(); } }),
          h('div', { class: 'dos' }, texto(ac.encimera, 'modelo', 'encimera-modelo', 'Modelo'), texto(ac.encimera, 'color', 'encimera-color', 'Color')),
          ...alturas(),
          ...remates(),
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
    const repintar = () => reemplazar(zona, ...d.electro.map(e => {
      const [, nombre, tipos] = datosElectro(e.clave);
      return h('div', { class: 'elemento', 'data-electro': e.clave },
        h('div', { class: 'cab' }, e.clave === 'otro' ? texto(e, 'nombre', 'electro-nombre', '¿Qué es?') : h('b', {}, nombre),
          h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-electro', onclick: () => { if (confirmarQuitar((e.clave === 'otro' ? e.nombre || 'el electrodoméstico' : nombre).toLowerCase())) { d.electro.splice(d.electro.indexOf(e), 1); cambio(); repintar(); } } }, 'Quitar')),
        tipos.length ? h('div', { class: 'campo' }, segmentado({ acc: 'electro-tipo', opciones: tipos, valor: e.tipo, permitirVacio: true, alCambiar: v => {
          if (e.clave === 'frigo' && v === 'americano') anotarMedida(e, 'ancho', 920);
          else if (e.clave === 'frigo' && e.tipo === 'americano' && e.ancho === 920) anotarMedida(e, 'ancho', null);
          // Microondas libre: 46 × 29 y su alto micro de 50; integrable, el alto micro de 60
          if (e.clave === 'microondas' && v) {
            // las medidas se ponen solas: libre 46 × 29, integrable 60 × 38
            const q = v === 'libre' ? MICRO_LIBRE : MICRO_INTEGRABLE;
            anotarMedida(e, 'ancho', q.ancho); e.alto = q.alto;
            (d.paredes || []).forEach(p => (p.altos || []).filter(m => m.tipo === 'alto_micro').forEach(m => anotarMedida(m, 'ancho', v === 'libre' ? MICRO_LIBRE.mueble : 600)));
          }
          e.tipo = v; e.auto = false; cambio(); repintar(); } })) : null,
        h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Color'),
          segmentado({ acc: 'electro-color', opciones: COLORES_ELECTRO, valor: e.color || null, permitirVacio: true, alCambiar: v => { e.color = v || null; cambio(); } })),
        e.auto ? h('small', { class: 'ayuda' }, 'Puesto solo por los muebles: cámbialo y se queda como lo dejes.') : null,
        h('div', { class: 'dos' },
          campoMedida({ etiqueta: 'Ancho', acc: 'ancho', valor: e.ancho, mal: e.mal && e.mal.ancho, unidad: 'cm', rapidos: ANCHOS_ELECTRO[e.clave], alCambiar: (v, t) => {
            anotarMedida(e, 'ancho', v, t); e.auto = false;
            if (e.clave === 'frigo' && (v === 920) !== (e.tipo === 'americano')) { e.tipo = v === 920 ? 'americano' : null; cambio(); repintar(); return; }
            cambio(); } }),
          ALTOS_ELECTRO[e.clave] ? campoMedida({ etiqueta: 'Alto', acc: 'alto', valor: e.alto, mal: e.mal && e.mal.alto, unidad: 'cm', rapidos: ALTOS_ELECTRO[e.clave], alCambiar: (v, t) => { anotarMedida(e, 'alto', v, t); cambio(); } }) : null),
        h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Modelo'), texto(e, 'modelo', 'electro-modelo', 'Marca y modelo')));
    }));
    repintar();
    // Al poner o quitar muebles, los electrodomésticos que piden se ponen (o se quitan) solos
    if (ficha.tipo === 'cocina') refrescos.push(() => { if (zona.isConnected && sincronizarElectros(d)) { repintar(); guardarPronto(); } });
    return h('div', { class: 'tarjeta' }, h('b', {}, 'Electrodomésticos'), h('small', { class: 'ayuda' }, 'Se rellenan solos con los muebles que pones (placa, campana, horno, micro, frigorífico, lavavajillas…).'), zona,
      h('div', { class: 'chips' }, ELECTRO.map(([k, n]) => h('button', { type: 'button', 'data-acc': 'anadir-electro', 'data-v': k, onclick: () => { d.electro.push(Object.assign(electroNuevo(k), { color: colorElectroComun(d) })); cambio(); repintar(); } }, n))));
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

  // Tapetas (tapajuntas) de la ficha de puertas: de 7, de 9 o a medida; salen en la hoja de pedido de puertas
  function campoTapetas() {
    const zona = h('div', { class: 'campo', 'data-acc': 'tapetas-campo' });
    const pintarT = () => reemplazar(zona, h('label', { class: 'et' }, 'Tapetas'),
      segmentado({ acc: 'tapetas', opciones: TAPETAS, valor: d.tapeta ?? null, permitirVacio: true, alCambiar: v => { d.tapeta = v || null; cambio(); pintarT(); } }),
      ...(d.tapeta === 'especial' ? [campoMedida({ etiqueta: 'Ancho de la tapeta', acc: 'tapeta-mm', valor: d.tapeta_mm ?? null, unidad: 'cm', alCambiar: v => { d.tapeta_mm = v; cambio(); } })] : []),
      ...(!d.tapeta ? [h('small', { class: 'ayuda' }, 'Sin contestar: en el pedido sale que falta elegirlas.')] : []));
    pintarT();
    return zona;
  }
  function propios() {
    if (ficha.tipo === 'puerta') return [h('div', { class: 'tarjeta' }, h('b', {}, 'Para todas las puertas'),
      // Se suele medir el premarco; si aún no está puesto, la puerta.
      h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Se mide'),
        segmentado({ acc: 'medida-de', opciones: [['premarco', 'Premarco'], ['puerta', 'Puerta']], valor: d.medida === 'premarco' ? 'premarco' : 'puerta',
          alCambiar: v => { d.medida = v; cambio(); repintarPuertas(); } })),
      h('div', { class: 'dos' }, texto(d, 'modelo', 'puertas-modelo', 'Modelo'), texto(d, 'color', 'puertas-color', 'Color')),
      // Tapetas (tapajuntas): de 7, de 9 o a medida; salen en la hoja de pedido de puertas
      campoTapetas()), ...puertas()];
    if (ficha.tipo === 'cocina') return [...paredes(TIPOS_ELEMENTO.cocina), ...islas(), plegable('acabados', 'Acabados', acabados(), resumenAcabados), plegable('electro', 'Electrodomésticos', electro(), resumenElectro), plegable('material', 'Material', material(), resumenMaterial), plegable('coste', 'Coste estimado', costeEstimado(), resumenCoste)];
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
        h('div', { class: 'dos' }, medida(d, 'diag_1', 'Diagonal 1 (desde arriba izq.)', { aviso: null }), medida(d, 'diag_2', 'Diagonal 2 (desde arriba dcha.)', { aviso: null })),
        h('div', { class: 'avisos', 'data-avisos': 'diagonales' }),
        medida(d, 'fondo', 'Fondo del hueco'),
        h('div', { class: 'dos' }, medida(d, 'rodapie_alto', 'Rodapié alto'), medida(d, 'rodapie_grosor', 'Rodapié grueso')),
        ficha.subtipo === 'corredera' ? h('div', { class: 'campo' }, h('label', { class: 'et' }, 'Hojas'),
          segmentado({ acc: 'hojas-rapido', opciones: [[2, '2'], [3, '3'], [4, '4']], valor: d.hojas, permitirVacio: true, alCambiar: v => { d.hojas = v; cambio(); const c = main.querySelector('[data-acc="hojas"]'); if (c) c.value = v ?? ''; } }),
          campoEntero({ acc: 'hojas', valor: d.hojas, placeholder: 'Otro número', alCambiar: v => { d.hojas = v; cambio(); } })) : null,
        ficha.subtipo === 'abatible' ? campoEntero({ etiqueta: 'Número de puertas', acc: 'puertas', valor: d.puertas, alCambiar: v => { d.puertas = v; cambio(); } }) : null)];
      if (!ves || (d.cuerpos || []).length) r.push(...cuerpos());
      // En el vestidor los enchufes van en sus paredes; la lista aparte solo se ve si ya tenía alguno.
      if (ficha.subtipo !== 'vestidor' || (d.enchufes || []).length) r.push(...enchufes());
      if (ficha.subtipo === 'vestidor') r.push(...paredes(TIPOS_ELEMENTO.vestidor), plegable('acabados', 'Acabados', acabados(true), resumenAcabados), plegable('material', 'Material', material(), resumenMaterial));
      else r.push(plegable('material', 'Material', material(), resumenMaterial));   // tableros de casco y puertas
      r.push(plegable('coste', 'Coste estimado', costeEstimado(), resumenCoste));
      return r;
    }
    return [];
  }

  const zonaLibres = h('div', { class: 'tarjeta' }), tituloLibres = h('h2', {}, 'Otras medidas');
  const nuevaLibre = () => { d.libres.push({ id: nuevoId(), nombre: '', mm: null }); cambio(); repintarLibres(); zonaLibres.querySelectorAll('[data-acc="libre-nombre"]')[d.libres.length - 1].focus(); };
  function repintarLibres() {
    zonaLibres.hidden = tituloLibres.hidden = !d.libres.length;
    reemplazar(zonaLibres, ...d.libres.map(m => h('div', { class: 'libre', 'data-libre': '' },
      h('input', { 'data-acc': 'libre-nombre', placeholder: 'Nombre', value: m.nombre, oninput: ev => { m.nombre = ev.target.value; cambio(); } }),
      campoMedida({ acc: 'libre-valor', valor: m.mm, mal: m.mal && m.mal.mm, unidad, aviso: 'libre.' + m.id, alCambiar: (v, textoMal) => { anotarMedida(m, 'mm', v, textoMal); cambio(); } }),
      h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-libre', onclick: () => { if (confirmarQuitar('la medida')) { d.libres.splice(d.libres.indexOf(m), 1); cambio(); repintarLibres(); } } }, '✕'))));
    refrescarAvisos();
  }

  const zonaNotas = h('div', { class: 'tarjeta' }), tituloNotas = h('h2', {}, 'Notas');
  function repintarNotas() {
    zonaNotas.hidden = tituloNotas.hidden = !d.notas.length;
    reemplazar(zonaNotas, ...d.notas.map(n => h('div', { class: 'campo' },
      h('textarea', { 'data-acc': 'nota', placeholder: 'Nota', onfocus: ev => altoSegunTexto(ev.target), oninput: ev => { n.texto = ev.target.value; altoSegunTexto(ev.target); cambio(); } }, n.texto),
      h('button', { type: 'button', class: 'mini', 'data-acc': 'quitar-nota', onclick: () => { if (confirmarQuitar('la nota')) { d.notas.splice(d.notas.indexOf(n), 1); cambio(); repintarNotas(); } } }, 'Quitar nota'))));
    // Cada nota, del alto de su texto y un renglón más (cuando ya está en la pantalla, que antes no se sabe el alto).
    requestAnimationFrame(() => zonaNotas.querySelectorAll('textarea').forEach(altoSegunTexto));
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
    comoRellenar(ficha.tipo, ficha.subtipo),
    ...(ficha.tipo === 'puerta' ? [nombreZona()] : [h('input', { 'data-acc': 'nombre-ficha', placeholder: 'Nombre de esta ficha (opcional)', 'aria-label': 'Nombre de esta ficha', value: ficha.nombre, oninput: ev => { ficha.nombre = ev.target.value; cambio(); } })]),
    ...propios(), tituloLibres, zonaLibres, ...notas(),
    ...adjuntos.nodos,
    // Lo que se puede añadir a cualquier ficha, en una sola fila.
    h('div', { class: 'barra-extras' },
      h('button', { type: 'button', 'data-acc': 'anadir-libre', onclick: nuevaLibre }, '＋ Medida'),
      h('button', { type: 'button', 'data-acc': 'anadir-nota', onclick: nuevaNota }, '＋ Nota'),
      ...adjuntos.botones),
    h('button', { type: 'button', class: 'prin ancho', 'data-acc': 'terminar', onclick: async () => { await guardarYa(); App.ir('#/resumen/' + id); } }, 'Terminar y ver resumen'),
    // Cocina, vestidor o armario: a la app de presupuestos (misma web), que crea un presupuesto nuevo con lo medido.
    ...((ficha.tipo === 'cocina' || ficha.tipo === 'armario') ? [h('button', { type: 'button', class: 'ancho', 'data-acc': 'pasar-presupuesto', onclick: async () => {
      await guardarYa();
      const t = ficha.trabajo_id ? await App.almacen.leer('trabajos', ficha.trabajo_id) : null;
      try { localStorage.setItem(CLAVE_PASO, JSON.stringify(paquetePresupuesto(ficha, t, AJ))); } catch (e) { alert('No se ha podido preparar el paso a presupuestos.'); return; }
      window.open(new URL('../cocinas/', location.href).href, '_blank');
    } }, '💶 Pasar a presupuesto')] : []),
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
    const corte = n => n.matches('h2, .barra-extras, [data-acc="terminar"], details.plegable') || (n.matches('.cab') && n.querySelector(':scope > h2'));
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
