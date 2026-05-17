import { Jugador, Stats } from '@/app/fantasy';

export const deduplicarPorNombre = (jugadores: Jugador[]): Jugador[] => {
  const nombresVistos = new Set<string>();
  return jugadores.filter(j => {
    const nombreNormalizado = j.nombre.trim().toLowerCase();
    if (nombresVistos.has(nombreNormalizado)) return false;
    nombresVistos.add(nombreNormalizado);
    return true;
  });
};

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);

export const obtenerStatsArea = (plantilla: Jugador[]) => {
  const avg = (players: Jugador[]) =>
    players.length > 0
      ? Math.round(players.reduce((acc, j) => acc + j.media, 0) / players.length)
      : 0;

  return {
    ataque: avg(plantilla.filter(j => j.posicion === 'DL')),
    medio: avg(plantilla.filter(j => j.posicion === 'MC')),
    defensa: avg(plantilla.filter(j => j.posicion === 'DF' || j.posicion === 'POR')),
  };
};

export const calcularMediaJugador = (stats: Stats, posicion: string): number => {
  switch (posicion) {
    case 'POR': return Math.round(stats.defensa * 0.7 + stats.pase * 0.3);
    case 'DF': return Math.round(stats.defensa * 0.6 + stats.ritmo * 0.2 + stats.pase * 0.2);
    case 'MC': return Math.round(stats.pase * 0.5 + stats.tiro * 0.2 + stats.defensa * 0.15 + stats.ritmo * 0.15);
    case 'DL': return Math.round(stats.tiro * 0.6 + stats.ritmo * 0.3 + stats.pase * 0.1);
    default: return Math.round((stats.ritmo + stats.tiro + stats.pase + stats.defensa) / 4);
  }
};

export const generarStatsRealistas = (posicion: string, precio: number): Stats => {
  const factorCalidad = Math.min(1.3, Math.max(0.2, precio / 70000000));
  const base = 72 + factorCalidad * 22;
  const rng = (mod = 0) => Math.min(99, Math.max(72, Math.round(base + mod + (Math.random() * 4 - 2))));

  switch (posicion) {
    case 'POR': return { ritmo: rng(-5), tiro: rng(-25), pase: rng(5), defensa: rng(12) };
    case 'DF': return { ritmo: rng(2), tiro: rng(-10), pase: rng(5), defensa: rng(14) };
    case 'MC': return { ritmo: rng(5), tiro: rng(8), pase: rng(16), defensa: rng(5) };
    case 'DL': return { ritmo: rng(12), tiro: rng(20), pase: rng(6), defensa: rng(-10) };
    default: return { ritmo: 95, tiro: 95, pase: 95, defensa: 95 };
  }
};

export const calcularPoderEquipo = (misFichajes: Jugador[]): number => {
  const titulares = misFichajes.filter(j => j.es_titular);
  if (titulares.length === 0) return 0;
  return Math.round(titulares.reduce((acc, j) => acc + j.media, 0) / titulares.length);
};
