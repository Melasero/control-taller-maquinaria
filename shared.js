export const COLLECTION = "equipos";

// Notas ligadas a un equipo que sigue operativo en campo — independientes del
// flujo de reparación/standby/entregado. Se crean y se marcan resueltas desde
// la pestaña "Observación" del celular; la TV solo las muestra agrupadas por
// equipo, en modo lectura.
export const OBS_COLLECTION = "observaciones";

export const ESTADOS = {
  REPARACION: "reparacion",
  STANDBY: "standby",
  ENTREGADO: "entregado",
  // Cierra un registro cuando el equipo vuelve a mantenimiento por una nueva
  // avería (ver "Volver a mantenimiento" en celular.html). Nunca aparece en
  // las columnas de la TV, pero queda en Firestore para el reporte.
  REINGRESO: "reingreso"
};

export const PRIORIDADES = {
  CRITICO: "Crítico"
};

// Documento único (fuera de la colección "equipos") con el avance del plan
// semanal del taller. Se llena a mano desde la pestaña "Plan Semanal" del
// celular y es independiente del estado de cualquier equipo.
export const PLAN_COLLECTION = "config";
export const PLAN_DOC = "planSemanal";

// Órdenes de Trabajo (OT) del plan semanal — se cargan semana a semana desde
// la pestaña "Plan" del celular (equipo, descripción, N° de OT, fecha programada,
// ejecución) y se marcan como completadas ahí o directo desde la TV al tocar el
// widget de "Avance del Plan Semanal". Independiente de la colección "equipos".
export const OT_PLAN_COLLECTION = "otsPlan";

export const STANDBY_ALERT_MS = 2 * 60 * 60 * 1000; // 2 horas

// Campañas de repuestos planificados (ej. "Cambio de manguera hidráulica") —
// al crear una campaña se genera un documento por cada volquete de la flota
// (flotaVolquetes), cada uno con su propio estado "completada". Se cargan y
// se marcan desde la pestaña "Campañas" del celular, o directo desde la TV
// (columna "Campañas en Curso" y el tablero de volquetes). Independiente de
// la colección "equipos".
export const CAMPANAS_COLLECTION = "campanas";

export const TIPOS_FALLA = ["Mecánica", "Eléctrica", "Hidráulica", "Soldadura", "Llantería", "Mantenimiento Preventivo", "Otro"];

export const UBICACIONES_SUGERIDAS = ["Taller F", "Campo", "Punto G"];

export const EMPRESAS_SUGERIDAS = [
  { valor: "MD", etiqueta: "Mannucci Diesel" },
  { valor: "ST", etiqueta: "Stracon Perú" },
  { valor: "OR", etiqueta: "Maquinarias OR" },
  { valor: "Komatsu", etiqueta: "Komatsu" }
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function toDatetimeLocal(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fromDatetimeLocal(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.getTime();
}

export function formatHMS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

export function formatHM(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${pad2(m)}m`;
}

export function formatDateTime(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatTime(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

// Semana y año ISO-8601 (lunes a domingo; la semana 1 es la que contiene el
// primer jueves del año). Se usa para agrupar las OT del plan semanal por
// semana sin depender de que alguien escriba el número de semana a mano.
export function isoWeekInfo(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return { week, year: d.getFullYear() };
}
