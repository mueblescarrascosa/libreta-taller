import { prueba, igual, fin } from './mini.js';
import { ordenFichas, alturaZona } from '../docs/js/trabajos.js';

const F = (tipo, nombre, creado, subtipo = null) => ({ tipo, subtipo, nombre, creado_at: creado });

prueba('zona: de abajo a arriba', () => {
  igual(['Sótano', 'Bajo', 'Planta baja', 'Piso 1', '2º piso', 'Planta 3', 'Ático', 'Casa'].map(alturaZona), [-1, 0, 0, 1, 2, 3, 900, null]);
});

prueba('fichas: por categoría, de abajo a arriba y de menos a más, sin separar', () => {
  const l = [F('nota', '', '1'), F('cocina', 'Piso 2', '2'), F('puerta', 'Piso 10', '3'), F('puerta', 'Ático', '4'), F('armario', 'Piso 1', '5', 'vestidor'),
    F('puerta', 'Piso 2', '6'), F('puerta', 'Bajo', '7'), F('armario', 'Piso 1', '8', 'abatible'), F('cocina', 'Bajo', '9'), F('puerta', '', '10')];
  igual(ordenFichas(l).map(f => f.creado_at), ['7', '6', '3', '4', '10', '9', '2', '8', '5', '1']);
});
fin();
