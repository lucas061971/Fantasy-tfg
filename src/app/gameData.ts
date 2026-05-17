import { FormacionKey, Posicion, Tactic } from "./fantasy";

export const CONFIG_FORMACIONES: Record<FormacionKey, Record<Posicion, number>> = {
  '4-4-2': { POR: 1, DF: 4, MC: 4, DL: 2 },
  '4-3-3': { POR: 1, DF: 4, MC: 3, DL: 3 },
  '3-5-2': { POR: 1, DF: 3, MC: 5, DL: 2 },
};

export const EQUIPOS_BOTS_INICIAL = [
  { nombre: 'Rayo Galáctico', fuerza: 75, puntosLiga: 0, kit_home_color: '#FFD700', kit_away_color: '#FFFFFF' },
  { nombre: 'Olimpo FC', fuerza: 68, puntosLiga: 0, kit_home_color: '#00BFFF', kit_away_color: '#FF4500' },
  { nombre: 'Halcones Dorados', fuerza: 82, puntosLiga: 0, kit_home_color: '#000080', kit_away_color: '#FFC0CB' },
  { nombre: 'Kraken United', fuerza: 78, puntosLiga: 0, kit_home_color: '#8B0000', kit_away_color: '#00FF00' },
  { nombre: 'Dragones del Norte', fuerza: 85, puntosLiga: 0, kit_home_color: '#008080', kit_away_color: '#FFFF00' },
  { nombre: 'Lobos de Hierro', fuerza: 80, puntosLiga: 0, kit_home_color: '#800080', kit_away_color: '#00FFFF' },
  { nombre: 'Valkirias CF', fuerza: 72, puntosLiga: 0, kit_home_color: '#A52A2A', kit_away_color: '#ADD8E6' },
  { nombre: 'Samurai FC', fuerza: 74, puntosLiga: 0, kit_home_color: '#4682B4', kit_away_color: '#FFDAB9' },
  { nombre: 'Titanes de la Red', fuerza: 77, puntosLiga: 0, kit_home_color: '#6A5ACD', kit_away_color: '#F0E68C' },
  { nombre: 'Fénix Club de Fútbol', fuerza: 83, puntosLiga: 0, kit_home_color: '#2F4F4F', kit_away_color: '#FF6347' },
  { nombre: 'Gladiadores del Área', fuerza: 76, puntosLiga: 0, kit_home_color: '#5F9EA0', kit_away_color: '#DDA0DD' },
  { nombre: 'Centellas FC', fuerza: 81, puntosLiga: 0, kit_home_color: '#DAA520', kit_away_color: '#87CEEB' },
];

export const CALENDARIO = [
  { jornada: 1, rival: 'Rayo Galáctico', esLocal: true },
  { jornada: 2, rival: 'Olimpo FC', esLocal: false },
  { jornada: 3, rival: 'Halcones Dorados', esLocal: true },
  { jornada: 4, rival: 'Kraken United', esLocal: false },
  { jornada: 5, rival: 'Dragones del Norte', esLocal: true },
  { jornada: 6, rival: 'Lobos de Hierro', esLocal: false },
  { jornada: 7, rival: 'Valkirias CF', esLocal: true },
  { jornada: 8, rival: 'Samurai FC', esLocal: false },
  { jornada: 9, rival: 'Titanes de la Red', esLocal: true },
  { jornada: 10, rival: 'Fénix Club de Fútbol', esLocal: false },
  { jornada: 11, rival: 'Gladiadores del Área', esLocal: true },
  { jornada: 12, rival: 'Centellas FC', esLocal: false },
  { jornada: 13, rival: 'Rayo Galáctico', esLocal: false },
  { jornada: 14, rival: 'Olimpo FC', esLocal: true },
  { jornada: 15, rival: 'Halcones Dorados', esLocal: false },
  { jornada: 16, rival: 'Kraken United', esLocal: true },
  { jornada: 17, rival: 'Dragones del Norte', esLocal: false },
  { jornada: 18, rival: 'Lobos de Hierro', esLocal: true },
  { jornada: 19, rival: 'Valkirias CF', esLocal: false },
  { jornada: 20, rival: 'Samurai FC', esLocal: true },
  { jornada: 21, rival: 'Titanes de la Red', esLocal: false },
  { jornada: 22, rival: 'Fénix Club de Fútbol', esLocal: true },
  { jornada: 23, rival: 'Gladiadores del Área', esLocal: false },
  { jornada: 24, rival: 'Centellas FC', esLocal: true },
];