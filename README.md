# Control de Taller de Maquinaria

Sistema de 3 piezas:

- **celular.html** — formulario táctil para registrar ingresos y cambiar el estado de un equipo (mecánico).
- **tv.html** — dashboard de 3 columnas para la Smart TV (En mantenimiento / Equipos con Observaciones / Standby).
- **server.js** — servidor Node solo para generar los reportes CSV/Excel desde Firestore.

La sincronización en tiempo real entre el celular y la TV la hace **Firestore** directamente (ambas páginas escuchan la misma colección `equipos` con `onSnapshot`). El servidor Node no participa en el tiempo real; solo se usa para exportar reportes.

## 1. Crear el proyecto Firebase

1. Ve a https://console.firebase.google.com y crea un proyecto nuevo.
2. En **Compilación → Firestore Database**, crea la base de datos (modo producción está bien, ajustaremos las reglas abajo).
3. En **Configuración del proyecto → Tus apps**, agrega una app **Web** (ícono `</>`). Copia el objeto `firebaseConfig` que te muestra.
4. Pega esos valores en [firebase-config.js](firebase-config.js), reemplazando los placeholders `TU_...`.

## 2. Reglas de Firestore

Para que celular.html y tv.html puedan leer/escribir sin login, usa estas reglas (Firestore Database → Reglas):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /equipos/{doc} {
      allow read, write: if true;
    }
    match /config/{doc} {
      allow read, write: if true;
    }
    match /observaciones/{doc} {
      allow read, write: if true;
    }
    match /otsPlan/{doc} {
      allow read, write: if true;
    }
    match /campanas/{doc} {
      allow read, write: if true;
    }
    match /standbyManual/{doc} {
      allow read, write: if true;
    }
  }
}
```

La colección `config` (documento `planSemanal`) guarda el % de avance del plan semanal del taller — es un dato aparte de los equipos, editable solo desde la pestaña "Plan Semanal" del celular.

La colección `observaciones` guarda notas sueltas de equipos que siguen operativos en campo (no en mantenimiento) — ver [Observaciones](#observaciones-colección-observaciones) más abajo.

**Esto deja la colección abierta a cualquiera que tenga tu `apiKey`.** Es aceptable para una herramienta interna de bajo riesgo, pero si quieres restringirlo más adelante, la forma correcta es agregar Firebase Authentication (aunque sea anónima) y condicionar `allow` a `request.auth != null`.

## 3. Credencial del servidor (para los reportes)

1. En **Configuración del proyecto → Cuentas de servicio**, haz clic en **Generar nueva clave privada**.
2. Guarda el archivo descargado como `service-account.json` en esta misma carpeta (junto a `server.js`). Ese archivo nunca se sube a git (ver `.gitignore`).

## 4. Instalar y ejecutar

```
npm install
npm start
```

Esto levanta un servidor en `http://localhost:3000` que sirve los archivos estáticos y los reportes.

- En la **Smart TV**: abre `http://<IP-de-tu-PC>:3000/tv.html` en su navegador.
- En el **celular del mecánico**: abre `http://<IP-de-tu-PC>:3000/celular.html` (misma red Wi-Fi).
- Averigua la IP de tu PC con `ipconfig` (busca "Dirección IPv4").

## 5. Reportes

- CSV: `http://<IP-de-tu-PC>:3000/reporte.csv`
- Excel: `http://<IP-de-tu-PC>:3000/reporte.xlsx`

Ambos incluyen: Equipo, Empresa, Ubicación, Tipo de Falla, Fecha Ingreso, Fecha Operativo, Fecha Salida, Horas Reparación, Horas Standby, Horas Totales Inoperativo — para todos los equipos registrados, terminados o no (las horas de un equipo aún activo se calculan hasta el momento de generar el reporte).

## Modelo de datos (colección `equipos`)

| Campo | Tipo | Descripción |
|---|---|---|
| `equipo` | string | Ej. "Volquete CAT-01" |
| `empresa` | string | Contrata dueña del equipo (autocompleta MD, ST, OR, Komatsu — texto libre igual) |
| `ubicacion` | string | Ej. "Taller F" |
| `tipoFalla` | string | Mecánica / Eléctrica / Hidráulica / Soldadura / Llantería / Mantenimiento Preventivo / Otro |
| `descripcionFalla` | string | Detalle libre de la falla (ej. "Fuga de aceite en motor izquierdo") |
| `horometro` | number \| null | Lectura del horómetro al momento del ingreso |
| `estado` | string | `reparacion` \| `standby` \| `entregado` \| `reingreso` (registro cerrado por una nueva avería, no se muestra en la TV) |
| `ingresoAt` | number (ms) | Momento de ingreso a taller |
| `operativoAt` | number \| null | Momento en que se marcó "Listo / Operativo" |
| `salidaAt` | number \| null | Momento en que se marcó "Entregado a operador" |
| `cierreAt` | number \| null | Momento en que el registro se cerró por un reingreso (solo si `estado` es `reingreso`) |
| `prioridad` | string \| null | `"Crítico"` u omitido/null. Es lo único que se puede marcar — no hay "Media" ni "Baja" |
| `avance` | number \| null | % de avance de la reparación (0–100), editable desde el celular mientras está en mantenimiento |
| `bloqueadoPorRepuesto` | boolean | Si está esperando una pieza para poder continuar |
| `repuestoPendiente` | string \| null | Nombre del repuesto pendiente, se muestra como alerta en la TV |

## Plan semanal (colección `config`, documento `planSemanal`)

| Campo | Tipo | Descripción |
|---|---|---|
| `avance` | number | % manual de cumplimiento del plan semanal (0–100). Se usa solo si no hay OT cargadas en `otsPlan` para la semana ISO en curso — ver más abajo |
| `flotaVolquetes` | string[] | Códigos exactos de los volquetes activos de la flota (prefijos CV/CA/CL/CT), uno por elemento. Se usa para el anillo "Volquetes Operativos" de la TV: operativos = `flotaVolquetes.length` menos los que están en la columna "En mantenimiento" |
| `horometrosFlota` | map `{CODIGO_NORMALIZADO: number}` | Último horómetro por equipo de la flota, cargado desde Excel o PDF en el panel de pantalla completa de "Volquetes Operativos" |
| `totalVolquetes` | number | `flotaVolquetes.length`, guardado como referencia (no se usa para calcular, solo informativo) |
| `actualizadoAt` | number (ms) | Última vez que se guardó desde el celular |
| `horometrosFlotaActualizadoAt` | number (ms) | Última vez que se actualizaron lecturas desde la TV |

Es un dato independiente de los equipos — no pertenece a ningún documento de `equipos`, se lee y escribe directo desde la pestaña "Plan" del celular y se muestra en la tercera tarjeta de métricas de la TV.

Para incorporar volquetes nuevos, la pestaña "Plan" permite pegar varios códigos y agregarlos a la lista existente. Se guardan al instante y se omiten los códigos ya incluidos (también si solo cambia el formato de guiones/espacios).

También se pueden agregar volquetes desde la TV: abre la tarjeta **Volquetes Operativos** y usa **Agregar volquetes** en el panel de la flota. Acepta códigos `CV`, `CA`, `CL` y `CT`, uno por línea; los códigos duplicados se omiten. **Cargar Excel** importa lecturas usando encabezados `Equipo` (o `Código`/`EQP`) y `Horómetro` (o `HM`). **Cargar PDF** importa el parque con las columnas `COD INTERNO`, `Contrato_Gold` y `HOROMETRO`; incluye equipos con y sin contrato (`SI` y `NO`) y excluye únicamente los marcados `DESMOVILIZADO`. Si un equipo no tiene horómetro legible, igual se agrega a la flota, pero sin actualizar su lectura. El PDF se procesa localmente en el navegador con PDF.js (no se envía a un servicio externo); debe tener texto seleccionable, pues los PDF escaneados que requieren OCR no son compatibles. Ambos formatos agregan los códigos nuevos y actualizan lecturas existentes sin quitar equipos que ya estén en la flota. El panel de **Estado de flota · Volquetes** muestra el horómetro como una insignia en cada tarjeta de equipo. Las tarjetas de campaña también muestran el horómetro correspondiente y, desde **10,000 horas**, el pendiente cambia de amarillo a un rojo suave.

El sub-texto "X/Y OT cerradas hoy" y la flecha de tendencia que aparecen junto al % se calculan solos en `tv.html` a partir de los ingresos a taller (documentos de `equipos`) abiertos en la jornada actual — no son parte de este documento y no se editan a mano. (Este "OT cerradas hoy" es un conteo automático de ingresos del día, distinto de las OT del plan semanal descritas abajo.)

## OT del plan semanal (colección `otsPlan`)

| Campo | Tipo | Descripción |
|---|---|---|
| `equipo` | string | Código del equipo al que corresponde la OT |
| `descripcion` | string | Detalle del trabajo, ej. "PM3 12000 Mantto Preventivo" |
| `ot` | string | Número de orden de trabajo |
| `fechaProgramada` | number (ms) | Fecha programada de la OT — de aquí se calcula a qué semana ISO-8601 (lunes a domingo) pertenece, no hace falta escribir el número de semana a mano |
| `ejecucion` | string | Quién la ejecuta (ej. MD, ST, OR) |
| `completada` | boolean | Se marca tocando la OT, desde el celular o desde la TV |
| `completadaAt` | number \| null | Momento en que se marcó completada |
| `createdAt` | number (ms) | Momento en que se cargó la OT |

Se cargan semana a semana desde la pestaña "Plan" del celular. Si existe al menos una OT cuya `fechaProgramada` cae en la semana ISO actual, el % del widget "Avance del Plan Semanal" de la TV se calcula solo (`completadas / total`) y reemplaza al `avance` manual; se puede marcar cada OT como completada tocándola tanto en el celular como en el modal que abre el widget en la TV, y ambos quedan sincronizados en tiempo real.

## Campañas de repuestos planificados (colección `campanas`)

| Campo | Tipo | Descripción |
|---|---|---|
| `nombreCampana` | string | Nombre de la campaña, ej. "Cambio de manguera hidráulica" |
| `descripcion` | string | Detalle del repuesto/tarea (opcional) |
| `equipo` | string | Código del equipo |
| `completada` | boolean | Se marca tocando el ítem, desde el celular o desde la TV |
| `completadaAt` | number \| null | Momento en que se marcó completada |
| `createdAt` | number (ms) | Momento en que se creó ese ítem de la campaña |

Al crear una campaña desde la pestaña "Campañas" del celular se genera **un documento por cada volquete de `flotaVolquetes`** (la lista de la pestaña Plan) — no hace falta elegir equipos uno por uno, siempre aplica a toda la flota. Las campañas personalizadas permiten elegir equipos del catálogo y agregar manualmente códigos que no aparecen en él. Al abrir una campaña activa en el celular, los equipos se distinguen visualmente como pendientes o realizados; la opción **Editar equipos de la campaña** permite agregar equipos (incluidos códigos manuales) y quitar pendientes, pero conserva los ya realizados. También se puede usar **Borrar campaña completa** para eliminar permanentemente todos sus documentos y avances; antes de hacerlo aparece una confirmación con el número de registros afectados. Al marcar un equipo como realizado desde el celular o la TV, se guarda automáticamente `completadaAt` con fecha y hora; la TV muestra ese sello en la tarjeta del equipo. En la vista de campaña de la TV, las tarjetas por equipo tienen un tono amarillo suave si están pendientes y verde suave si están realizadas. La TV muestra las campañas activas agrupadas por equipo o nombre. Cuando todos los equipos de una campaña están marcados como completados, queda disponible en el filtro **Backup**, junto al selector Lista/Grupo; sus documentos se conservan en Firestore.

## Observaciones (colección `observaciones`)

| Campo | Tipo | Descripción |
|---|---|---|
| `equipo` | string | Equipo al que pertenece la nota |
| `empresa` | string | Contrata dueña del equipo |
| `ubicacion` | string | Opcional |
| `horometro` | number \| null | Lectura del horómetro al momento de anotar |
| `texto` | string | La observación en sí |
| `fechaAt` | number (ms) \| omitido | Fecha original de la observación, importada de la columna A de la hoja `OBS` |
| `ot` | string \| omitido | Orden de trabajo importada de la columna G de la hoja `OBS` |
| `supervisor` | string \| omitido | Dato legado; la TV muestra la OT para las nuevas importaciones |
| `origen` | string | `manual` si se registró desde el celular; `excel` si se importó desde la hoja OBS. En datos antiguos se reconoce el origen por el ID `excel-` de los registros importados |
| `resuelta` | boolean | `false` al crearse; al tachar se guarda `true` y el documento se conserva en Firestore |
| `createdAt` | number (ms) | Momento en que se registró |

Son notas para un equipo que **sigue operativo en campo** (no está en mantenimiento ni en standby) — completamente independientes del flujo de `equipos`. Se crean desde la pestaña "Observación" del celular. El check tacha/restaura sin borrar; la pantalla del celular separa pendientes y tachadas, y el contador de la TV abre los filtros de pendientes, tachadas, todas, full tarjeta y manuales. El botón **Manual** de la columna también filtra directamente las observaciones ingresadas desde el celular. La caja junto a **Cargar Excel** filtra por código de equipo y admite variantes como `CV-00444`, `CV444` o `444`.

También se pueden sincronizar observaciones en lote con el botón **Cargar Excel** de esa columna en `tv.html`. La importación usa únicamente la hoja `OBS` y requiere su estructura en las columnas A-H: `FECHA`, `CODIGO`, `FRENTE`, `OBS`, `TURNO`, `SUPERVISOR`, `OT`, `STATUS`. Solo se cargan filas con fecha en A, equipo en B, descripción en D y el valor `PENDIENTE` en H; la OT de la columna G se guarda para las tarjetas y el detalle. Al subir un Excel con filas pendientes completas, Firebase queda sincronizado con esas filas: los registros que no estén en ese Excel (incluidas observaciones manuales y tachadas) se reemplazan. Los IDs deterministas usan equipo + OT + descripción (no la fecha), así dos filas del mismo equipo con el mismo texto y OT se consideran una observación; se conserva la fecha más reciente. Esto evita duplicados repetidos en días distintos y también al volver a subir el mismo archivo. Si el archivo válido no contiene ninguna fila pendiente completa, la carga no modifica Firebase. Al abrir el detalle en la TV, cada nota muestra la fecha y su OT.

## Logo en la TV

`tv.html` carga `logo-stracon.png` (junto a `tv.html` en la misma carpeta) para el logo centrado en la barra superior. Si subes los archivos a GitHub, asegúrate de incluir ese PNG en el mismo repositorio.

Tiempo en reparación = `operativoAt - ingresoAt`. Tiempo en standby = `(salidaAt || ahora) - operativoAt`. Tiempo total = `(salidaAt || ahora) - ingresoAt`.

En la TV, el MTTR mensual se muestra por separado para volquetes (`CV`), el grupo de excavadoras `EX-00038`, `EX-00039`, `EX-00047`, `EX-00085` y `EX-00086`, y las demás excavadoras (`EX`). Cada promedio incluye las reparaciones cerradas durante el mes y las reparaciones que siguen abiertas, contando de estas últimas solo el tiempo transcurrido dentro del mes actual.
