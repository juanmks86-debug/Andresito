(function () {
  var script = document.currentScript;
  var color = script.dataset.color || "#0066ff";
  var izq = script.dataset.posicion === "izquierda";
  var icono = script.dataset.icono || ""; // URL opcional de una imagen para el ícono de la burbuja
  var api = script.dataset.api || new URL(script.src).origin + "/api/chat";
  var historial = [], vozActiva = false;

  // ---- Preguntas y respuestas (kw = palabras clave; se comparan sin tildes ni mayúsculas) ----
  var FAQ = [
    { q: "¿Qué materias hay en primer año?", kw: "primer primero 1ro", a: "Primer año: Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I." },
    { q: "¿Qué materias hay en segundo año?", kw: "segundo 2do", a: "Segundo año: Inglés Técnico, Ciencia de Datos, Estadística y Probabilidad, Programación II, Lógica, Introducción a la Inteligencia Artificial, Machine Learning, Prácticas Profesionalizantes II y EDI II." },
    { q: "¿Qué materias hay en tercer año?", kw: "tercer tercero 3ro ultimo", a: "Tercer año: Gestión de Proyectos, Minería de Datos, Reconocimiento Visual, Ciberseguridad, Ética y Deontología Profesional, Analítica Web, Procesamiento del Lenguaje Natural y Prácticas Profesionalizantes III." },
    { q: "¿Qué materias tiene la carrera?", kw: "materias asignaturas plan estudios cursan", a: "Son 25 materias anuales repartidas en 3 años. Preguntame por las de primer, segundo o tercer año y te las detallo." },
    { q: "¿Cuánto dura la carrera?", kw: "dura duracion tiempo anos largo", a: "Dura 3 años, con modalidad presencial. En total son 2912 horas cátedra (aprox. 1941 horas reloj)." },
    { q: "¿Qué título otorga?", kw: "titulo otorga egresa recibo certificado", a: "Otorga el título de Técnico/a Superior en Ciencia de Datos e Inteligencia Artificial." },
    { q: "¿Dónde se dicta?", kw: "donde sede instituto lugar dicta perico ies", a: "Se dicta en el IES N° 6 de la ciudad de Perico, Jujuy." },
    { q: "¿En qué horario se cursa?", kw: "horario hora cursa cursada turno noche tarde", a: "La cursada es de 18:30 a 22:40." },
    { q: "¿Es presencial o virtual?", kw: "presencial virtual online distancia", a: "La modalidad es presencial." },
    { q: "¿Qué requisitos de ingreso hay?", kw: "requisitos ingreso ingresar condiciones secundario medio polimodal", a: "Hay que tener título de nivel medio o polimodal. Los mayores de 25 años sin secundario terminado pueden acogerse a la Resolución 114-SE-02 de Jujuy. Se presentan documentos personales y académicos según la normativa vigente." },
    { q: "¿Cuándo es la inscripción y cuánto cuesta?", kw: "inscripcion inscribir inscribirme fechas costo costos cuesta sale cuota arancel precio contacto telefono mail", a: "No tengo ese dato. Consultalo en la secretaría del IES N° 6 de Perico." },
    { q: "¿Qué hace un técnico en Ciencia de Datos e IA?", kw: "perfil egresado aprendo aprender sirve funciones tareas", a: "Explora y prepara datos, crea modelos de Machine Learning (predicción, recomendación, clustering), redes neuronales, visión por computadora, chatbots y procesamiento de lenguaje, visualiza resultados y gestiona proyectos." },
    { q: "¿Qué salida laboral tiene?", kw: "laboral trabajo empleo trabajar salida ocupacional", a: "Puede trabajar en salud, agro, marketing, finanzas, banca, telefonía y cualquier organización que analice datos, integrar equipos de informática o dirigir emprendimientos propios de pequeña o mediana escala." },
    { q: "¿Hay mucha matemática?", kw: "matematica algebra analisis calculo estadistica probabilidad logica", a: "Sí, es la base: Álgebra y Análisis Matemático en 1° año, y Estadística y Probabilidad y Lógica en 2°." },
    { q: "¿Qué lenguajes de programación se ven?", kw: "programacion programar lenguaje lenguajes python codigo", a: "Hay Programación I y II. En Programación I se trabaja con Python, estructuras de datos y algoritmos." },
    { q: "¿Se ve Inteligencia Artificial y Machine Learning?", kw: "inteligencia artificial machine learning deep redes neuronales vision lenguaje", a: "Sí: Introducción a la IA y Machine Learning en 2° año; Reconocimiento Visual, Procesamiento del Lenguaje Natural y Minería de Datos en 3°." },
    { q: "¿Qué son las prácticas profesionalizantes?", kw: "practicas profesionalizantes pasantias", a: "Son espacios de práctica en los tres años (I, II y III), que se aprueban solo por promoción. Suman 416 horas cátedra." },
    { q: "¿Cómo se aprueban las materias?", kw: "aprueban aprobar promocion promocional examen final rendir", a: "Las materias se aprueban por promoción o con examen final; las Prácticas Profesionalizantes son solo promocionales." },
    { q: "¿Qué son los EDI?", kw: "edi definicion institucional", a: "Los EDI (Espacios de Definición Institucional) son materias cuyos temas define cada instituto con su coordinador y docentes, según las necesidades de la región." },
    { q: "¿Cuáles son las correlatividades?", kw: "correlativas correlatividades correlativa", a: "No tengo ese dato cargado. Consultalo en la secretaría del IES N° 6 de Perico." }
  ];

  function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " "); }
  var VACIAS = " que hay entre como para cual cuale por una uno los las del con mas esta esto ano carre cuant ";
  function stems(s) { return norm(s).split(/\s+/).filter(function (w) { return w.length > 2; }).map(function (w) { return w.slice(0, 5); }).filter(function (w) { return VACIAS.indexOf(" " + w + " ") < 0; }); }
  FAQ.forEach(function (f) { f.set = {}; stems(f.kw).forEach(function (w) { f.set[w] = 1; }); });

  function buscar(t) {
    var nt = norm(t).replace(/\s+/g, " ").trim();
    for (var i = 0; i < FAQ.length; i++) if (norm(FAQ[i].q).replace(/\s+/g, " ").trim() === nt) return FAQ[i];
    var qs = stems(t), mejor = null, max = 0;
    FAQ.forEach(function (f) {
      var p = qs.filter(function (w) { return f.set[w]; }).length;
      if (p > max) { max = p; mejor = f; }
    });
    // Se acepta con 2+ coincidencias si cubren la mitad de la pregunta, o con 1 si la pregunta es muy corta
    if (max === 0 || (max === 1 && qs.length > 2) || (max >= 2 && max / qs.length < 0.5)) return null;
    return mejor;
  }

  // ---- Interfaz ----
  var host = document.createElement("div");
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML =
    "<style>:host{all:initial}*{box-sizing:border-box;font-family:system-ui,sans-serif}" +
    ".b{position:fixed;left:0;top:0;width:56px;height:56px;border-radius:50%;border:0;padding:0;background:" + color + ";color:#fff;cursor:grab;box-shadow:0 4px 12px #0004;z-index:2147483647;touch-action:none;user-select:none;-webkit-user-select:none;display:flex;align-items:center;justify-content:center;transition:transform .15s}" +
    ".b.s{transition:left .25s ease,top .25s ease,transform .15s}.b:hover{transform:scale(1.07)}.b.d{cursor:grabbing;transform:scale(1.12);box-shadow:0 8px 20px #0006}" +
    ".b svg{width:30px;height:30px;pointer-events:none}.b img{width:100%;height:100%;border-radius:50%;object-fit:cover;pointer-events:none}" +
    ".p{position:fixed;left:0;top:0;background:#fff;color:#111;border-radius:14px;box-shadow:0 8px 30px #0005;display:none;flex-direction:column;overflow:hidden;z-index:2147483647}" +
    ".p.o{display:flex}.h{background:" + color + ";color:#fff;padding:12px 14px;font-weight:600;display:flex;justify-content:space-between;align-items:center;font-size:14px}" +
    ".h button{background:none;border:0;color:#fff;font-size:18px;cursor:pointer}" +
    ".m{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f5f6f8}" +
    ".g{max-width:85%;padding:8px 12px;border-radius:12px;font-size:14px;line-height:1.4;white-space:pre-wrap}" +
    ".u{align-self:flex-end;background:" + color + ";color:#fff}.a{align-self:flex-start;background:#fff;border:1px solid #e1e3e8}" +
    ".c{align-self:flex-start;display:flex;flex-wrap:wrap;gap:6px}.c button{border:1px solid " + color + ";background:#fff;color:" + color + ";border-radius:14px;padding:5px 10px;font-size:12px;cursor:pointer}" +
    ".f{display:flex;gap:6px;padding:10px;border-top:1px solid #e1e3e8;background:#fff}.f input{flex:1;padding:8px 10px;border:1px solid #ccc;border-radius:8px;font-size:14px}" +
    ".f button{border:0;border-radius:8px;padding:0 10px;background:" + color + ";color:#fff;cursor:pointer;font-size:16px}</style>" +
    '<button class="b" aria-label="Abrir chat"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="11" rx="4"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1" fill="#fff"/><circle cx="9" cy="13" r="1.2" fill="#fff" stroke="none"/><circle cx="15" cy="13" r="1.2" fill="#fff" stroke="none"/><path d="M9.5 16.2c1.5 1 3.5 1 5 0"/><path d="M2 12v3M22 12v3"/></svg></button><div class="p"><div class="h"><span>Consultas sobre la carrera</span><span><button id="v" title="Leer respuestas en voz alta">🔇</button><button id="x" aria-label="Cerrar">✕</button></span></div>' +
    '<div class="m"></div><div class="f"><input placeholder="Escribí tu pregunta..." maxlength="300"><button id="mic" title="Hablar">🎤</button><button id="s">➤</button></div></div>';

  var $ = function (s) { return root.querySelector(s); };
  var panel = $(".p"), msgs = $(".m"), input = $("input");

  function agregar(txt, cls) {
    var d = document.createElement("div");
    d.className = "g " + cls; d.textContent = txt;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function chips(lista) {
    var c = document.createElement("div"); c.className = "c";
    lista.forEach(function (f) {
      var b = document.createElement("button"); b.textContent = f.q;
      b.onclick = function () { input.value = f.q; enviar(); };
      c.appendChild(b);
    });
    msgs.appendChild(c); msgs.scrollTop = msgs.scrollHeight;
  }
  function sugeridas() { return [FAQ[3], FAQ[4], FAQ[7], FAQ[9]]; }

  agregar("¡Hola! Soy el asistente de la Tecnicatura en Ciencia de Datos e IA. Las respuestas son orientativas; para trámites consultá en el IES N° 6.", "a");
  chips(sugeridas());

  function responder(el, txt, guardar) {
    el.textContent = txt;
    if (guardar) historial.push({ role: "assistant", content: txt });
    hablar(txt);
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function enviar() {
    var t = input.value.trim();
    if (!t) return;
    input.value = "";
    agregar(t, "u");
    var hit = buscar(t);
    historial.push({ role: "user", content: t });
    var el = agregar("...", "a");
    if (hit) return responder(el, hit.a, true);
    try { // sin coincidencia local: respaldo con modelo gratuito
      var r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: historial.slice(-6) }) });
      var d = await r.json();
      if (!d.reply) throw new Error(d.error);
      responder(el, d.reply, true);
    } catch (e) {
      historial.pop();
      responder(el, "No tengo ese dato. Probá con alguna de estas preguntas o consultá en la secretaría del IES N° 6 de Perico.", false);
      chips(sugeridas());
    }
  }

  function hablar(txt) {
    if (!vozActiva || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(txt); u.lang = "es-AR"; speechSynthesis.speak(u);
  }

  // ---- Burbuja arrastrable (se pega al borde más cercano y recuerda su posición) ----
  var bub = $(".b"), TAM = 56, M = 20, drag = null, arrastro = false;
  if (icono) { var im = document.createElement("img"); im.alt = ""; im.src = icono; bub.textContent = ""; bub.appendChild(im); }
  function limitar(n, a, b) { return Math.max(a, Math.min(b, n)); }
  var pos = { lado: izq ? "l" : "r", y: 1 };
  try { var g = JSON.parse(localStorage.getItem("chatbot_pos")); if (g && (g.lado === "l" || g.lado === "r") && typeof g.y === "number") pos = { lado: g.lado, y: limitar(g.y, 0, 1) }; } catch (e) {}
  function aplicarPos() {
    var W = window.innerWidth, H = window.innerHeight;
    bub.style.left = (pos.lado === "l" ? M : W - TAM - M) + "px";
    bub.style.top = limitar(M + pos.y * (H - TAM - 2 * M), 0, H - TAM) + "px";
    posPanel();
  }
  function posPanel() {
    var W = window.innerWidth, H = window.innerHeight;
    var pw = Math.min(360, W - 20), ph = Math.min(520, H - 110);
    var bl = parseFloat(bub.style.left), bt = parseFloat(bub.style.top);
    var l = (bl + TAM / 2 > W / 2) ? bl + TAM - pw : bl;
    var t = (bt - ph - 12 >= 10) ? bt - ph - 12 : bt + TAM + 12;
    panel.style.width = pw + "px"; panel.style.height = ph + "px";
    panel.style.left = limitar(l, 10, W - pw - 10) + "px";
    panel.style.top = Math.max(10, Math.min(t, H - ph - 10)) + "px";
  }
  bub.addEventListener("pointerdown", function (e) {
    if (e.button > 0) return;
    drag = { x: e.clientX, y: e.clientY, l: parseFloat(bub.style.left), t: parseFloat(bub.style.top), mov: false };
    bub.setPointerCapture(e.pointerId);
  });
  bub.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.mov) { if (Math.hypot(dx, dy) < 6) return; drag.mov = true; bub.classList.add("d"); bub.classList.remove("s"); }
    bub.style.left = limitar(drag.l + dx, 0, window.innerWidth - TAM) + "px";
    bub.style.top = limitar(drag.t + dy, 0, window.innerHeight - TAM) + "px";
    posPanel();
  });
  function soltar() {
    if (!drag) return;
    var mov = drag.mov; drag = null; bub.classList.remove("d");
    if (!mov) return;
    arrastro = true; setTimeout(function () { arrastro = false; }, 0);
    var W = window.innerWidth, H = window.innerHeight;
    pos.lado = (parseFloat(bub.style.left) + TAM / 2 < W / 2) ? "l" : "r";
    pos.y = limitar((parseFloat(bub.style.top) - M) / (H - TAM - 2 * M), 0, 1);
    bub.classList.add("s"); aplicarPos();
    try { localStorage.setItem("chatbot_pos", JSON.stringify(pos)); } catch (e) {}
  }
  bub.addEventListener("pointerup", soltar);
  bub.addEventListener("pointercancel", soltar);
  window.addEventListener("resize", aplicarPos);
  aplicarPos();

  bub.onclick = function () {
    if (arrastro) return; // fue un arrastre, no un clic
    panel.classList.toggle("o");
    if (panel.classList.contains("o")) { posPanel(); input.focus(); }
  };
  $("#x").onclick = function () { panel.classList.remove("o"); };
  $("#s").onclick = enviar;
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") enviar(); });

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) $("#mic").onclick = function () {
    var rec = new SR(); rec.lang = "es-AR";
    rec.onresult = function (e) { input.value = e.results[0][0].transcript; enviar(); };
    rec.start();
  }; else $("#mic").style.display = "none";

  if (window.speechSynthesis) $("#v").onclick = function () {
    vozActiva = !vozActiva; $("#v").textContent = vozActiva ? "🔊" : "🔇";
    if (!vozActiva) speechSynthesis.cancel();
  }; else $("#v").style.display = "none";
})();
