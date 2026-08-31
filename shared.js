export const COLLECTION = "equipos";

export const ESTADOS = {
  REPARACION: "reparacion",
  STANDBY: "standby",
  ENTREGADO: "entregado"
};

export const STANDBY_ALERT_MS = 2 * 60 * 60 * 1000; // 2 horas

export const TIPOS_FALLA = ["Mecánica", "Eléctrica", "Hidráulica", "Mantenimiento Preventivo", "Otro"];

export const UBICACIONES_SUGERIDAS = ["Taller F", "Campo", "Punto G"];

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
