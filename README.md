# Control de Taller de Maquinaria

Sistema de 3 piezas:

- **celular.html** — formulario táctil para registrar ingresos y cambiar el estado de un equipo (mecánico).
- **tv.html** — dashboard de 3 columnas para la Smart TV (Falla / Standby / Entregados).
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
  }
}
```

La colección `config` (documento `planSemanal`) guarda el % de avance del plan semanal del taller — es un dato aparte de los equipos, editable solo desde la pestaña "Plan Semanal" del celular.

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
| `avance` | number | % de cumplimiento del plan semanal del taller (0–100) |
| `actualizadoAt` | number (ms) | Última vez que se guardó desde el celular |

Es un dato independiente de los equipos — no pertenece a ningún documento de `equipos`, se lee y escribe directo desde la pestaña "Plan Semanal" del celular y se muestra en la tercera tarjeta de métricas de la TV.

Tiempo en reparación = `operativoAt - ingresoAt`. Tiempo en standby = `(salidaAt || ahora) - operativoAt`. Tiempo total = `(salidaAt || ahora) - ingresoAt`.
