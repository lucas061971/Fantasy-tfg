export interface Stats {
  ritmo: number;
  tiro: number;
  pase: number;
  defensa: number;
}

export interface Jugador {
  id: string;
  nombre: string;
  posicion: 'POR' | 'DF' | 'MC' | 'DL';
  equipo_real: string;
  precio: number;
  clausula: number;
  es_titular: boolean;
  stats: Stats;
  media: number;
  puntos?: number;
  puntosUltimaJornada?: number;
  enVenta?: boolean;
  goles?: number;
  asistencias?: number;
  paradas?: number;
  is_injured?: boolean;
  dias_lesion?: number;
  ritmo?: number;
  tiro?: number;
  pase?: number;
  defensa?: number;
}

export interface League {
  id: string;
  name: string;
  invite_code: string;
}

export interface Rival {
  nombre: string;
  fuerza: number;
  ataque: number;
  medio: number;
  defensa: number;
  puntosLiga: number;
  plantilla: Jugador[];
  kit_home_color: string;
  kit_away_color: string;
  tactica?: Tactic;
}

export interface PartidoHistorial {
  jornada: number;
  partidos: {
    local: string;
    visitante: string;
    golesLocal: number;
    golesVisitante: number;
    eventos: string[];
    goleadoresIds: string[];
    asistentesIds: string[];
    notas: Record<string, number>;
    colorLocal?: string;
    colorVisitante?: string;
    posesionLocal?: number;
    posesionVisitante?: number;
    tirosLocal?: number;
    tirosVisitante?: number;
    tirosPuertaLocal?: number;
    tirosPuertaVisitante?: number;
    paradasLocal?: number;
    paradasVisitante?: number;
    porLocalId?: string;
    porVisitanteId?: string;
  }[];
}

export type Posicion = 'POR' | 'DF' | 'MC' | 'DL';
export type FormacionKey = '4-4-2' | '4-3-3' | '3-5-2';
export type Tactic = 'Ofensivo' | 'Defensivo' | 'Equilibrado';