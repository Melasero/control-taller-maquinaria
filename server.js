const path = require("path");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const ExcelJS = require("exceljs");

const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const COLUMNS = [
  { header: "Equipo", key: "equipo", width: 24 },
  { header: "Empresa", key: "empresa", width: 26 },
  { header: "Ubicación", key: "ubicacion", width: 22 },
  { header: "Tipo de Falla", key: "tipoFalla", width: 22 },
  { header: "Descripción de Falla", key: "descripcionFalla", width: 32 },
  { header: "Horómetro", key: "horometro", width: 14 },
  { header: "Fecha Ingreso", key: "fechaIngreso", width: 20 },
  { header: "Fecha Operativo", key: "fechaOperativo", width: 20 },
  { header: "Fecha Salida", key: "fechaSalida", width: 20 },
  { header: "Horas Reparación", key: "horasReparacion", width: 18 },
  { header: "Horas Standby", key: "horasStandby", width: 16 },
  { header: "Horas Totales Inoperativo", key: "horasTotales", width: 22 }
];

function fmtDate(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleString("es-PE", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
  });
}

function toHours(ms) {
  if (!ms || ms < 0) return "";
  return (ms / 3600000).toFixed(2);
}

async function buildRows() {
  const snap = await db.collection("equipos").orderBy("ingresoAt", "desc").get();
  return snap.docs.map((doc) => {
    const v = doc.data();
    const now = Date.now();
    const horasReparacion = v.operativoAt && v.ingresoAt ? v.operativoAt - v.ingresoAt : null;
    const horasStandby = v.operativoAt ? (v.salidaAt || now) - v.operativoAt : null;
    const horasTotales = v.ingresoAt ? (v.salidaAt || now) - v.ingresoAt : null;

    return {
      equipo: v.equipo || "",
      empresa: v.empresa || "",
      ubicacion: v.ubicacion || "",
      tipoFalla: v.tipoFalla || "",
      descripcionFalla: v.descripcionFalla || "",
      horometro: v.horometro != null ? v.horometro : "",
      fechaIngreso: fmtDate(v.ingresoAt),
      fechaOperativo: fmtDate(v.operativoAt),
      fechaSalida: fmtDate(v.salidaAt),
      horasReparacion: toHours(horasReparacion),
      horasStandby: toHours(horasStandby),
      horasTotales: toHours(horasTotales)
    };
  });
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

app.get("/reporte.csv", async (req, res) => {
  try {
    const rows = await buildRows();
    const header = COLUMNS.map((c) => c.header).join(",");
    const lines = rows.map((r) => COLUMNS.map((c) => csvEscape(r[c.key])).join(","));
    const csv = "﻿" + [header, ...lines].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="reporte_taller.csv"');
    res.send(csv);
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando el reporte CSV");
  }
});

app.get("/reporte.xlsx", async (req, res) => {
  try {
    const rows = await buildRows();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reporte Taller");
    sheet.columns = COLUMNS;
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: "middle" };
    rows.forEach((r) => sheet.addRow(r));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="reporte_taller.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).send("Error generando el reporte Excel");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
  console.log(`  TV:      http://localhost:${PORT}/tv.html`);
  console.log(`  Celular: http://localhost:${PORT}/celular.html`);
  console.log(`  Reporte: http://localhost:${PORT}/reporte.csv | /reporte.xlsx`);
});
