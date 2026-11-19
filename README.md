# Andy — Asistente académico del IES N.º 6

Andy es un chatbot web para acompañar a estudiantes y aspirantes de la **Tecnicatura Superior en Ciencia de Datos e Inteligencia Artificial** del Instituto de Educación Superior N.º 6, sede Perico (Jujuy).

El asistente combina respuestas rápidas a partir de preguntas frecuentes con una consulta a un modelo de IA cuando la FAQ no alcanza. La IA utiliza la información institucional incluida en este repositorio y debe reconocer cuando no cuenta con un dato, en lugar de inventarlo.

## Funciones actuales

### Chat e interfaz
- Chat flotante que puede abrirse y cerrarse desde la burbuja del asistente.
- Burbuja arrastrable para ubicarla en la pantalla.
- Interfaz adaptable a computadora y celular.
- Accesos rápidos para **Ingreso, Materias, Inscripciones, Carrera y Vida institucional**.
- Consultas mediante texto.
- Entrada por micrófono y reproducción de respuestas por audio.
- Indicadores visuales del estado del asistente.
- Mensajes de bienvenida y respuestas breves para saludos, agradecimientos y despedidas.

### Avatar y estados visuales
El avatar utiliza imágenes individuales para cada expresión. No se recorta una plantilla completa en tiempo de ejecución.

Estados disponibles:
- `idle`: espera.
- `thinking`: pensamiento.
- `processing`: procesamiento.
- `answering`: respuesta hablada (estado interno `speaking`).
- `error`: error.
- `offline`: asistente sin conexión.

Las imágenes se organizan por temporada en `public/avatars/`:
- `graduacion/`
- `navidad/`
- `verano/`
- `normal/`

Cada carpeta debe contener las seis imágenes individuales: `idle.jpg`, `thinking.jpg`, `processing.jpg`, `answering.jpg`, `error.jpg` y `offline.jpg`.

### Calendario de temporadas
El avatar selecciona automáticamente la plantilla según la fecha local del dispositivo:

| Temporada | Período |
|---|---|
| Graduación | 18/11/2026 al 24/12/2026 |
| Navidad | 25/12/2026 al 14/01/2027 |
| Verano | 15/01/2027 al 26/03/2027 |
| Normal | Desde el 27/03/2027 y fuera de los períodos anteriores |

El widget revisa periódicamente si cambió la temporada para actualizar la expresión sin exigir que el usuario recargue la página. Si una imagen de temporada no carga, utiliza la imagen equivalente de la carpeta `normal/` como alternativa.

### Prueba visual de temporadas
Para probar una fecha sin modificar el calendario real, agregá el parámetro `avatarTest=AAAA-MM-DD` a la URL de la página que contiene el chatbot.

Ejemplos:
- Graduación: `?avatarTest=2026-11-20`
- Navidad: `?avatarTest=2026-12-26`
- Verano: `?avatarTest=2027-01-20`
- Normal: `?avatarTest=2027-03-30`

También se conserva la compatibilidad con el parámetro en la URL del script del widget. El modo de prueba es visual: no cambia las respuestas ni la personalidad del asistente.

## Base de conocimientos

Andy utiliza dos fuentes complementarias:

| Archivo | Función |
|---|---|
| `public/faq.json` | Preguntas frecuentes y respuestas rápidas que utiliza el widget; también se incorporan al contexto de la IA. |
| `conocimiento_carrera.md` | Información institucional y académica ampliada que consulta la IA. |

La búsqueda de FAQ normaliza mayúsculas y tildes, contempla errores de tipeo y utiliza palabras clave y sinónimos. Cuando la coincidencia no es suficientemente confiable, deriva la consulta a la IA en lugar de arriesgar una respuesta incorrecta.

### Cómo actualizar las respuestas frecuentes

Editá `public/faq.json`. Cada entrada tiene este formato:

```json
{
  "q": "¿Quién es el coordinador de la carrera?",
  "a": "El coordinador de la carrera es ...",
  "kw": "coordinador coordinadora coordina autoridad responsable",
  "s": 15
}
```

- `q`: pregunta que se muestra como sugerencia.
- `a`: respuesta.
- `kw`: palabras clave y sinónimos en minúscula, sin tildes y separados por espacios.
- `s` (opcional): orden de aparición entre las sugerencias; los números menores aparecen primero.
- `sd` (opcional, valor `1`): marca que falta completar o confirmar el dato y permite registrar cuántas personas consultan por él.

Usá comillas dobles en JSON, separá las entradas con comas y no agregues una coma después de la última. Dentro de una respuesta, los saltos de línea se escriben como `\\n`.

Cuando se actualicen datos importantes —por ejemplo fechas, costos, autoridades o requisitos— revisá también `conocimiento_carrera.md` para mantener coherentes las dos fuentes. No publiques datos institucionales sin confirmarlos.

### Consultas que Andy no pudo resolver

Las consultas sin respuesta útil pueden registrarse de forma anonimizada para detectar qué información falta. El endpoint administrativo es:

`/api/preguntas?clave=TU_ADMIN_KEY`

El acceso requiere la variable `ADMIN_KEY`. Si Upstash está configurado, los registros se guardan allí; sin ese servicio, el registro persistente no está disponible. Antes de incorporar una pregunta a la FAQ, verificá la respuesta con una fuente institucional.

## Estructura principal del proyecto

| Archivo o carpeta | Función |
|---|---|
| `public/widget.js` | Interfaz del chat, accesos rápidos, voz, estados y avatar. |
| `public/faq.json` | Preguntas frecuentes y respuestas rápidas. |
| `public/avatars/` | Imágenes individuales del avatar, organizadas por temporada. |
| `conocimiento_carrera.md` | Base de conocimiento ampliada de la carrera. |
| `api/chat.js` | Backend: valida solicitudes, aplica límites y consulta al proveedor de IA. |
| `api/preguntas.js` | Consulta administrativa protegida de preguntas sin respuesta. |
| `public/index.html` | Página de prueba del widget. |
| `vercel.json` | Configuración de despliegue y cabeceras. |

## Cómo integrar Andy en otra página

Pegá este código antes de cerrar la etiqueta `</body>`:

```html
<script src="https://andresito-seven.vercel.app/widget.js" data-color="#0066ff" defer></script>
```

Atributos opcionales:

| Atributo | Función | Ejemplo |
|---|---|---|
| `data-color` | Color principal del widget. | `#0066ff` |
| `data-nombre` | Nombre mostrado por el asistente. | `Andy` |
| `data-posicion` | Posición inicial de la burbuja. | `izquierda` |
| `data-icono` | Imagen propia para la burbuja. | URL de una imagen |
| `data-api` | URL alternativa del endpoint de chat. | `https://dominio/api/chat` |
| `data-faq` | URL alternativa del archivo de FAQ. | `https://dominio/faq.json` |

Para permitir el uso desde otro dominio, agregá su origen a `ALLOWED_ORIGINS` en las variables de entorno de Vercel y volvé a desplegar.

## Despliegue en Vercel

1. Importá el repositorio en Vercel.
2. Dejá **Root Directory** vacío (raíz del repositorio). Si se configura `public`, la carpeta `api` no se desplegará correctamente.
3. Configurá las variables de entorno necesarias:

| Variable | Requerida | Descripción |
|---|---|---|
| `IA_KEY` | Sí | Clave del proveedor de IA compatible con la API de OpenAI. |
| `IA_MODELO` | No | Permite seleccionar uno o ambos modelos de la lista gratuita autorizada (`openai/gpt-oss-20b`, `openai/gpt-oss-120b`). Cualquier modelo fuera de esa lista se ignora. Si no se configura o no contiene un modelo permitido, se usan ambos. |
| `IA_URL` | No | Endpoint del proveedor. Por defecto se utiliza Groq. |
| `ALLOWED_ORIGINS` | Según integración | Orígenes externos autorizados, separados por coma. |
| `LIMITE_IP_HORA` | No | Límite de mensajes por IP por hora (predeterminado: 20). |
| `LIMITE_DIA` | No | Límite global diario (predeterminado: 500). |
| `ADMIN_KEY` | Para consultas administrativas | Clave para acceder a `/api/preguntas`. |
| `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` | Recomendadas | Persistencia de límites y registro de preguntas sin respuesta. |

### Política de modelos gratuitos y límites de cuota

El backend mantiene una **lista cerrada de modelos permitidos**:

- `openai/gpt-oss-20b`
- `openai/gpt-oss-120b`

El orden predeterminado es el indicado arriba. Si se configura `IA_MODELO`, solo se consideran los nombres que pertenezcan a esa lista; no se habilitan modelos externos a ella. Si la variable está vacía o no contiene ningún modelo permitido, se recupera la lista predeterminada.

Comportamiento ante límites del proveedor:

1. Si el primer modelo devuelve HTTP `429` (límite temporal o cuota), el backend intenta el siguiente modelo permitido.
2. Si los modelos gratuitos disponibles devuelven `429`, Andy responde HTTP `503` e informa que la cuota gratuita alcanzó temporalmente su límite.
3. En ese caso no se cambia a un modelo pago ni se activa una alternativa de facturación por uso. El servicio queda temporalmente indisponible hasta que el proveedor restablezca la cuota.
4. Los errores `400` o `404` permiten probar el siguiente modelo de la lista; otros errores generan una respuesta controlada.

**Importante:** la lista es una restricción aplicada por el código de Andy, no una garantía de gratuidad permanente del proveedor. La disponibilidad y las condiciones del plan gratuito pueden cambiar. Antes de actualizar la lista o el proveedor, verificá sus condiciones vigentes. No habilites facturación, recargas automáticas ni modelos pagos para resolver un límite de uso. La configuración de facturación y las condiciones de la cuenta del proveedor son externas a este repositorio.

4. Después de modificar variables de entorno, generá un nuevo despliegue.
5. Revisá los registros de Vercel para confirmar que la base de conocimiento y las FAQ se cargaron correctamente.

## Seguridad y mantenimiento

- La clave del proveedor de IA debe permanecer en variables de entorno; nunca la incluyas en el código del navegador ni en el repositorio.
- El backend valida el origen, el método y el contenido de las solicitudes.
- Se aplican límites de uso por IP y globales. Sin Upstash, el contador en memoria es de mejor esfuerzo y puede reiniciarse entre ejecuciones.
- Los registros de preguntas eliminan correos, URLs y números largos antes de guardarse; aun así, revisá los registros antes de compartirlos.
- Si la IA deja de responder, revisá la vigencia de `IA_KEY`, el modelo configurado y los registros de Vercel.
- Mantené actualizadas las FAQ y la base de conocimiento con información confirmada por el instituto.
- Protegé las cuentas de GitHub y Vercel con verificación en dos pasos.


## Pruebas automáticas

Las pruebas se ejecutan con Node.js, sin necesitar una clave real del proveedor de IA:

```bash
node --test tests/*.test.js
```

- `tests/faq.test.js`: extrae y ejecuta las funciones reales del buscador desde `public/widget.js` (sin duplicar su implementación) y valida la estructura de la FAQ, preguntas exactas, variantes y consultas ajenas al ámbito institucional.
- `tests/chat-api.test.js`: verifica el contrato del endpoint, validaciones de solicitudes, inclusión de las reglas y FAQ en el contexto de IA, respuesta correcta, manejo de errores, selección restringida de modelos gratuitos, fallback ante HTTP `429` y respuesta HTTP `503` cuando se agota la cuota de los modelos permitidos. El proveedor se simula; no se realizan llamadas reales ni se utiliza una clave válida.
- `.github/workflows/faq-tests.yml`: ejecuta ambas suites automáticamente en GitHub Actions ante cambios relevantes y en las solicitudes de integración.
