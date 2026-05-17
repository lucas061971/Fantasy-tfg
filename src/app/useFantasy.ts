import { useState, useCallback } from 'react';
import { Jugador } from '../app/fantasy';

export function useFantasy(presupuestoInicial: number) {
  const [presupuesto, setPresupuesto] = useState(presupuestoInicial);
  const [misFichajes, setMisFichajes] = useState<Jugador[]>([]);

  const venderJugador = useCallback((jugador: Jugador, precioVenta: number) => {
    setMisFichajes((prev) => prev.filter((j) => j.id !== jugador.id));
    setPresupuesto((prev) => prev + precioVenta);
  }, []);

  const calcularPoderEquipo = useCallback((titulares: Jugador[]) => {
    if (titulares.length === 0) return 0;
    const sumaMedias = titulares.reduce((acc, j) => acc + j.media, 0);
    return Math.round(sumaMedias / titulares.length);
  }, []);

  return {
    presupuesto,
    setPresupuesto,
    misFichajes,
    setMisFichajes,
    venderJugador,
    calcularPoderEquipo
  };
}