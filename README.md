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
  }
}
```

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
| `empresa` | string | Contrata dueña del equipo |
| `ubicacion` | string | Ej. "Taller Central" |
| `tipoFalla` | string | Mecánica / Eléctrica / Hidráulica / Mantenimiento Preventivo / Otro |
| `estado` | string | `reparacion` \| `standby` \| `entregado` |
| `ingresoAt` | number (ms) | Momento de ingreso a taller |
| `operativoAt` | number \| null | Momento en que se marcó "Listo / Operativo" |
| `salidaAt` | number \| null | Momento en que se marcó "Entregado a operador" |

Tiempo en reparación = `operativoAt - ingresoAt`. Tiempo en standby = `(salidaAt || ahora) - operativoAt`. Tiempo total = `(salidaAt || ahora) - ingresoAt`.
