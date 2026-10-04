# Chatbot de la carrera (versión gratuita)

Primero responde con las preguntas y respuestas del widget (sin costo, sin límite).
Si no encuentra coincidencia, consulta a un modelo con plan gratuito (Gemini).

## Despliegue en Vercel (plan gratuito)
1. Subí esta carpeta a un repo de GitHub e importalo en Vercel.
2. Sacá una API key gratuita en Google AI Studio (aistudio.google.com).
3. En Vercel > Settings > Environment Variables:
   - GEMINI_API_KEY = tu clave
   - ALLOWED_ORIGINS = dominios autorizados, separados por coma (ej: https://tu-chatbot.vercel.app)
   - MODELO (opcional) = nombre del modelo vigente en AI Studio
4. Probalo en https://tu-chatbot.vercel.app/demo.html

## Integrarlo en cualquier página
<script src="https://tu-chatbot.vercel.app/widget.js" data-color="#0066ff" defer></script>

## Mantenimiento
- Preguntas y respuestas: arreglo FAQ al inicio de public/widget.js.
- Información para el modelo de respaldo: conocimiento_carrera.md.
- Sin GEMINI_API_KEY el bot sigue funcionando; ante preguntas sin coincidencia sugiere preguntas disponibles.
