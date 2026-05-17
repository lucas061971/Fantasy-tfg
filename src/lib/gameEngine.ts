import { Jugador, Stats, Tactic } from '@/app/fantasy';

type EquipoSimulacion = {
  nombre: string;
  fuerza: number;
  ataque: number;
  medio: number;
  defensa: number;
  plantilla: Jugador[];
};

const getAtkMod = (t: Tactic) => (t === 'Ofensivo' ? 1.3 : t === 'Defensivo' ? 0.7 : 1.0);
const getMidMod = (t: Tactic) => (t === 'Ofensivo' ? 1.2 : t === 'Defensivo' ? 0.8 : 1.0);

export const simularPartidoGenerico = (
  equipoA: EquipoSimulacion,
  equipoB: EquipoSimulacion,
  tacticA: Tactic = 'Equilibrado',
  tacticB: Tactic = 'Equilibrado'
) => {
  const midA = (equipoA.medio || equipoA.fuerza || 70) * getMidMod(tacticA);
  const midB = (equipoB.medio || equipoB.fuerza || 70) * getMidMod(tacticB);
  const diffMid = midA - midB;
  const posesionA = Math.max(10, Math.min(90, Math.round(50 + diffMid * 2.5 + (Math.random() * 4 - 2))));
  const posesionB = 100 - posesionA;

  const calcTiros = (atk: number, defOpp: number, pos: number, t: Tactic) => {
    const powerAtk = (atk || 70) * getAtkMod(t);
    const wallDef = (defOpp || 70) * 0.9;
    const superioridad = Math.max(2, powerAtk - wallDef);
    return Math.max(1, Math.round((superioridad / 4.5) * (pos / 50) + Math.random() * 3));
  };

  const tirosA = calcTiros(equipoA.ataque, equipoB.defensa, posesionA, tacticA);
  const tirosB = calcTiros(equipoB.ataque, equipoA.defensa, posesionB, tacticB);
  const tirosPuertaA = Math.max(0, Math.floor(tirosA * (0.35 + Math.random() * 0.15)));
  const tirosPuertaB = Math.max(0, Math.floor(tirosB * (0.35 + Math.random() * 0.15)));

  const porA_media = equipoA.plantilla?.find(j => j.posicion === 'POR')?.media || equipoA.fuerza || 70;
  const porB_media = equipoB.plantilla?.find(j => j.posicion === 'POR')?.media || equipoB.fuerza || 70;

  const calcGoles = (tirosP: number, mediaPOR: number) => {
    const penalizacionPOR = Math.max(0, (mediaPOR - 55) / 110);
    let g = 0;
    for (let i = 0; i < tirosP; i++) {
      if (Math.random() < 0.35 - penalizacionPOR) g++;
    }
    return g;
  };

  const golesA = calcGoles(tirosPuertaA, porB_media);
  const golesB = calcGoles(tirosPuertaB, porA_media);
  const paradasA = tirosPuertaB - golesB;
  const paradasB = tirosPuertaA - golesA;
  const porAId = equipoA.plantilla.find(j => j.posicion === 'POR')?.id;
  const porBId = equipoB.plantilla.find(j => j.posicion === 'POR')?.id;

  const eventos: string[] = [];
  const goleadoresIds: string[] = [];
  const asistentesIds: string[] = [];

  const generarGoles = (goles: number, equipo: { nombre: string; plantilla: Jugador[] }) => {
    for (let i = 0; i < goles; i++) {
      const pool = (equipo.plantilla || []).flatMap(j => {
        const peso = j.posicion === 'DL' ? 10 : j.posicion === 'MC' ? 4 : 1;
        return Array(peso).fill(j);
      });
      const goleador = pool[Math.floor(Math.random() * pool.length)];
      if (!goleador) continue;
      goleadoresIds.push(goleador.id);

      let assistString = '';
      if (Math.random() < 0.7) {
        const poolAsist = (equipo.plantilla || [])
          .filter(p => p.id !== goleador.id && p.posicion !== 'POR')
          .flatMap(j => {
            const peso = j.posicion === 'MC' ? 10 : j.posicion === 'DL' ? 5 : 3;
            return Array(peso).fill(j);
          });
        if (poolAsist.length > 0) {
          const asistente = poolAsist[Math.floor(Math.random() * poolAsist.length)];
          asistentesIds.push(asistente.id);
          assistString = ` [Asist: ${asistente.nombre}]`;
        }
      }
      const minuto = Math.floor(Math.random() * 90) + 1;
      eventos.push(`${minuto}' ⚽ GOL de ${goleador.nombre}${assistString} (${equipo.nombre})`);
    }
  };

  generarGoles(golesA, equipoA);
  generarGoles(golesB, equipoB);
  eventos.sort((a, b) => parseInt(a.split("'")[0] || '0') - parseInt(b.split("'")[0] || '0'));

  return {
    golesA, golesB, eventos, goleadoresIds, asistentesIds,
    posesionA, posesionB, tirosA, tirosB,
    tirosPuertaA, tirosPuertaB, paradasA, paradasB,
    porAId, porBId,
  };
};

export const calcularPuntosJugador = (
  posicion: string,
  nota: number,
  goles: number,
  asistencias: number,
  paradas: number,
  esTitular: boolean,
  esCapitan: boolean
): number => {
  let puntosGoles = 0;
  if (goles > 0) {
    if (posicion === 'DL') puntosGoles = goles * 4;
    else if (posicion === 'MC') puntosGoles = goles * 5;
    else if (posicion === 'DF') puntosGoles = goles * 6;
    else if (posicion === 'POR') puntosGoles = goles * 7;
  }
  let pts = nota + puntosGoles + asistencias * 3 + paradas * 0.5;
  if (!esTitular) pts = 0;
  if (esCapitan) pts *= 2;
  return pts;
};

export const actualizarJugadorTrasPuntos = (
  jugador: Jugador,
  ptsNuevos: number,
  golesNuevos: number,
  asistenciasNuevas: number,
  paradasNuevas: number
): Jugador => {
  let nuevoPrecio = jugador.precio;
  if (ptsNuevos >= 8) nuevoPrecio = Math.round(jugador.precio * 1.05);
  else if (ptsNuevos > 0 && ptsNuevos <= 3) nuevoPrecio = Math.round(jugador.precio * 0.95);

  const factorPrecio = jugador.precio > 0 ? nuevoPrecio / jugador.precio : 1;
  const factorEvolucion = 1 + (factorPrecio - 1) * 0.3;
  const factorMedia = 1 + (factorPrecio - 1) * 0.1;

  const nuevasStats: Stats = {
    ritmo: Math.min(99, Math.max(5, Math.round(jugador.stats.ritmo * factorEvolucion))),
    tiro: Math.min(99, Math.max(5, Math.round(jugador.stats.tiro * factorEvolucion))),
    pase: Math.min(99, Math.max(5, Math.round(jugador.stats.pase * factorEvolucion))),
    defensa: Math.min(99, Math.max(5, Math.round(jugador.stats.defensa * factorEvolucion))),
  };

  return {
    ...jugador,
    puntos: (jugador.puntos || 0) + ptsNuevos,
    puntosUltimaJornada: ptsNuevos,
    goles: (jugador.goles || 0) + golesNuevos,
    asistencias: (jugador.asistencias || 0) + asistenciasNuevas,
    paradas: (jugador.paradas || 0) + paradasNuevas,
    precio: nuevoPrecio,
    clausula: Math.round(jugador.clausula * factorPrecio),
    media: Math.min(99, Math.max(40, Math.round(jugador.media * factorMedia))),
    stats: nuevasStats,
  };
};
