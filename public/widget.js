(function () {
  var script = document.currentScript;
  var color = script.dataset.color || "#0066ff";
  var izq = script.dataset.posicion === "izquierda";
  var icono = script.dataset.icono || ""; // URL opcional de una imagen para el ícono de la burbuja
  var api = script.dataset.api || new URL(script.src).origin + "/api/chat";
  var historial = [], vozActiva = false, preguntadas = {}, rec = null, ocupado = false;

  // ---- Preguntas y respuestas (kw = palabras clave; sd = la respuesta es "no tengo ese dato") ----
  var FAQ = [
    { q: "¿Qué materias hay en primer año?", kw: "primer primero 1ro", a: "Primer año: Álgebra, Análisis Matemático, Programación I, Ciencia y TIC, Base de Datos, Redes, Prácticas Profesionalizantes I y EDI I." },
    { q: "¿Qué materias hay en segundo año?", kw: "segundo 2do", a: "Segundo año: Inglés Técnico, Ciencia de Datos, Estadística y Probabilidad, Programación II, Lógica, Introducción a la Inteligencia Artificial, Machine Learning, Prácticas Profesionalizantes II y EDI II." },
    { q: "¿Qué materias hay en tercer año?", kw: "tercer tercero 3ro ultimo", a: "Tercer año: Gestión de Proyectos, Minería de Datos, Reconocimiento Visual, Ciberseguridad, Ética y Deontología Profesional, Analítica Web, Procesamiento del Lenguaje Natural y Prácticas Profesionalizantes III." },
    { q: "¿Qué materias tiene la carrera?", kw: "materias asignaturas plan estudios cursan curricula contenidos", a: "Son 25 materias anuales repartidas en 3 años. Preguntame por las de primer, segundo o tercer año y te las detallo." },
    { q: "¿Cuánto dura la carrera?", kw: "dura duracion tiempo anos largo", a: "Dura 3 años, con modalidad presencial. En total son 2912 horas cátedra (aprox. 1941 horas reloj)." },
    { q: "¿Qué título otorga?", kw: "titulo otorga egresa recibo certificado diploma", a: "Otorga el título de Técnico/a Superior en Ciencia de Datos e Inteligencia Artificial." },
    { q: "¿Dónde se dicta?", kw: "donde sede instituto lugar dicta perico ies", a: "Se dicta en el IES N° 6 de la ciudad de Perico, Jujuy." },
    { q: "¿En qué horario se cursa?", kw: "horario hora cursa cursada turno noche tarde", a: "La cursada es de 18:30 a 22:40." },
    { q: "¿Es presencial o virtual?", kw: "presencial virtual online distancia", a: "La modalidad es presencial." },
    { q: "¿Qué requisitos de ingreso hay?", kw: "requisitos ingreso ingresar condiciones secundario medio polimodal", a: "Hay que tener título de nivel medio o polimodal. Los mayores de 25 años sin secundario terminado pueden acogerse a la Resolución 114-SE-02 de Jujuy. Se presentan documentos personales y académicos según la normativa vigente." },
    { q: "¿Cuándo es la inscripción y cuánto cuesta?", kw: "inscripcion inscribir inscribirme fechas costo costos cuesta sale cuota arancel precio contacto telefono mail beca becas gratis gratuita", sd: 1, a: "No tengo ese dato. Consultalo en la secretaría del IES N° 6 de Perico." },
    { q: "¿Qué hace un técnico en Ciencia de Datos e IA?", kw: "perfil egresado aprendo aprender sirve funciones tareas", a: "Explora y prepara datos, crea modelos de Machine Learning (predicción, recomendación, clustering), redes neuronales, visión por computadora, chatbots y procesamiento de lenguaje, visualiza resultados y gestiona proyectos." },
    { q: "¿Qué salida laboral tiene?", kw: "laboral trabajo empleo trabajar salida ocupacional sueldo profesion", a: "Puede trabajar en salud, agro, marketing, finanzas, banca, telefonía y cualquier organización que analice datos, integrar equipos de informática o dirigir emprendimientos propios de pequeña o mediana escala." },
    { q: "¿Hay mucha matemática?", kw: "matematica algebra analisis calculo estadistica probabilidad logica", a: "Sí, es la base: Álgebra y Análisis Matemático en 1° año, y Estadística y Probabilidad y Lógica en 2°." },
    { q: "¿Qué lenguajes de programación se ven?", kw: "programacion programar lenguaje lenguajes python codigo", a: "Hay Programación I y II. En Programación I se trabaja con Python, estructuras de datos y algoritmos." },
    { q: "¿Se ve Inteligencia Artificial y Machine Learning?", kw: "inteligencia artificial machine learning deep redes neuronales vision lenguaje", a: "Sí: Introducción a la IA y Machine Learning en 2° año; Reconocimiento Visual, Procesamiento del Lenguaje Natural y Minería de Datos en 3°." },
    { q: "¿Qué son las prácticas profesionalizantes?", kw: "practicas profesionalizantes pasantias", a: "Son espacios de práctica en los tres años (I, II y III), que se aprueban solo por promoción. Suman 416 horas cátedra." },
    { q: "¿Cómo se aprueban las materias?", kw: "aprueban aprobar promocion promocional examen final rendir", a: "Las materias se aprueban por promoción o con examen final; las Prácticas Profesionalizantes son solo promocionales." },
    { q: "¿Qué son los EDI?", kw: "edi definicion institucional", a: "Los EDI (Espacios de Definición Institucional) son materias cuyos temas define cada instituto con su coordinador y docentes, según las necesidades de la región." },
    { q: "¿Cuáles son las correlatividades?", kw: "correlativas correlatividades correlativa", sd: 1, a: "No tengo ese dato cargado. Consultalo en la secretaría del IES N° 6 de Perico." }
  ];

  // ---- Búsqueda tolerante a errores de tipeo ----
  function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " "); }
  var VACIAS = " que hay entre como para cual cuale por una uno los las del con mas esta esto ano carre cuant ";
  function stem(w) { return w.slice(0, 5); }
  function utiles(s) { return norm(s).split(/\s+/).filter(function (w) { return w.length > 2 && VACIAS.indexOf(" " + stem(w) + " ") < 0 && !cerca(w, "carrera"); }); }
  function lev(a, b) {
    var p = [], i, j;
    for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) {
      var prev = p[0]; p[0] = i;
      for (j = 1; j <= b.length; j++) { var t = p[j]; p[j] = Math.min(p[j] + 1, p[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
    }
    return p[b.length];
  }
  function cerca(a, b) {
    if (stem(a) === stem(b)) return true;
    if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 2) return false;
    return lev(a, b) <= (Math.max(a.length, b.length) >= 9 ? 2 : 1);
  }
  FAQ.forEach(function (f, i) { f.i = i; f.pal = utiles(f.kw); });

  function buscar(t) {
    var nt = norm(t).replace(/\s+/g, " ").trim();
    for (var i = 0; i < FAQ.length; i++) if (norm(FAQ[i].q).replace(/\s+/g, " ").trim() === nt) return FAQ[i];
    var qs = utiles(t), mejor = null, max = 0;
    FAQ.forEach(function (f) {
      var p = qs.filter(function (w) { return f.pal.some(function (k) { return cerca(w, k); }); }).length;
      if (p > max) { max = p; mejor = f; }
    });
    // Prioriza la precisión: si la coincidencia es dudosa, mejor consultar a la IA que responder otra cosa.
    // Se acepta con 2+ coincidencias que cubran la mitad de la pregunta, o con 1 si es la única palabra útil.
    if (max === 0 || (max === 1 && qs.length > 1) || (max >= 2 && max / qs.length < 0.5)) return null;
    return mejor;
  }

  var AYUDA = " Preguntame por materias, duración, horarios, requisitos de ingreso o salida laboral.";
  function charla(t) {
    var n = norm(t).replace(/\s+/g, " ").trim();
    if (!n) return null;
    if (n.replace(/\b(hola|holis|buenas|buenos|dias|tardes|noches|buen|dia|hey|que|tal|como|estas|andas|todo|bien)\b/g, "").trim() === "") return "¡Hola! Soy el asistente de la carrera." + AYUDA;
    if (/^(muchas )?gracias\b|^(genial|perfecto|ok|dale|listo|excelente)$/.test(n)) return "¡De nada! Si tenés otra duda sobre la carrera, preguntame.";
    if (/^(chau|adios|hasta luego|nos vemos)\b/.test(n)) return "¡Hasta luego! Cualquier duda sobre la carrera, acá estoy.";
    return null;
  }

  // ---- Interfaz ----
  var host = document.createElement("div");
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML =
    "<style>:host{all:initial}*{box-sizing:border-box;font-family:system-ui,sans-serif}" +
    "button:focus-visible,input:focus-visible{outline:2px solid #ffb300;outline-offset:2px}" +
    ".b{position:fixed;left:0;top:0;width:56px;height:56px;border-radius:50%;border:0;padding:0;background:" + color + ";color:#fff;cursor:grab;box-shadow:0 4px 12px #0004;z-index:2147483647;touch-action:none;user-select:none;-webkit-user-select:none;display:flex;align-items:center;justify-content:center;transition:transform .15s}" +
    ".b.s{transition:left .25s ease,top .25s ease,transform .15s}.b:hover{transform:scale(1.07)}.b.d{cursor:grabbing;transform:scale(1.12);box-shadow:0 8px 20px #0006}.b.h{display:none}" +
    ".b svg{width:30px;height:30px;pointer-events:none}.b img{width:100%;height:100%;border-radius:50%;object-fit:cover;pointer-events:none}" +
    ".p{position:fixed;left:0;top:0;background:#fff;color:#111;border-radius:14px;box-shadow:0 8px 30px #0005;display:none;flex-direction:column;overflow:hidden;z-index:2147483647}" +
    ".p.o{display:flex}.h{background:" + color + ";color:#fff;padding:12px 14px;font-weight:600;display:flex;justify-content:space-between;align-items:center;font-size:14px}" +
    ".h button{background:none;border:0;color:#fff;font-size:18px;cursor:pointer;padding:2px 6px}" +
    ".m{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f5f6f8}" +
    ".g{max-width:85%;padding:8px 12px;border-radius:12px;font-size:14px;line-height:1.4;white-space:pre-wrap}" +
    ".u{align-self:flex-end;background:" + color + ";color:#fff}.a{align-self:flex-start;background:#fff;border:1px solid #e1e3e8}" +
    ".t{display:flex;gap:4px;align-items:center;padding:12px}.t i{width:6px;height:6px;border-radius:50%;background:#888;animation:z 1s infinite}.t i:nth-child(2){animation-delay:.15s}.t i:nth-child(3){animation-delay:.3s}@keyframes z{0%,80%,100%{opacity:.3}40%{opacity:1}}" +
    ".c{align-self:flex-start;display:flex;flex-wrap:wrap;gap:6px}.c button{border:1px solid " + color + ";background:#fff;color:" + color + ";border-radius:14px;padding:5px 10px;font-size:12px;cursor:pointer}" +
    ".st{font-size:12px;color:#444;padding:6px 12px;background:#fff;border-top:1px solid #e1e3e8}.st:empty{display:none}" +
    ".f{display:flex;gap:6px;padding:10px;border-top:1px solid #e1e3e8;background:#fff}.f input{flex:1;min-width:0;padding:8px 10px;border:1px solid #ccc;border-radius:8px;font-size:16px}" +
    ".f button{border:0;border-radius:8px;padding:0 12px;min-height:38px;background:" + color + ";color:#fff;cursor:pointer;font-size:16px}.f button.on{background:#d93025;animation:y 1s infinite}@keyframes y{50%{opacity:.6}}" +
    "@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}</style>" +
    '<button class="b" aria-label="Abrir chat de consultas" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="8" width="16" height="11" rx="4"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1" fill="#fff"/><circle cx="9" cy="13" r="1.2" fill="#fff" stroke="none"/><circle cx="15" cy="13" r="1.2" fill="#fff" stroke="none"/><path d="M9.5 16.2c1.5 1 3.5 1 5 0"/><path d="M2 12v3M22 12v3"/></svg></button>' +
    '<div class="p" role="dialog" aria-label="Consultas sobre la carrera"><div class="h"><span>Consultas sobre la carrera</span><span>' +
    '<button id="r" title="Nueva conversación" aria-label="Nueva conversación">↺</button>' +
    '<button id="v" title="Leer respuestas en voz alta" aria-label="Leer respuestas en voz alta" aria-pressed="false">🔇</button>' +
    '<button id="x" title="Cerrar" aria-label="Cerrar chat">✕</button></span></div>' +
    '<div class="m" role="log" aria-live="polite" aria-relevant="additions"></div><div class="st" role="status"></div>' +
    '<div class="f"><input aria-label="Escribí tu pregunta" placeholder="Escribí tu pregunta..." maxlength="300" autocomplete="off">' +
    '<button id="mic" title="Hablar" aria-label="Preguntar con la voz" aria-pressed="false">🎤</button><button id="s" aria-label="Enviar pregunta">➤</button></div></div>';

  var $ = function (s) { return root.querySelector(s); };
  var panel = $(".p"), msgs = $(".m"), input = $("input"), st = $(".st"), bub = $(".b");
  function estado(t) { st.textContent = t || ""; }

  function agregar(txt, cls) {
    var d = document.createElement("div");
    d.className = "g " + cls; d.textContent = txt;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function escribiendo() {
    var d = document.createElement("div");
    d.className = "g a t"; d.setAttribute("role", "status"); d.setAttribute("aria-label", "Escribiendo…");
    d.innerHTML = "<i></i><i></i><i></i>";
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function quitarChips() { Array.prototype.forEach.call(msgs.querySelectorAll(".c"), function (c) { c.remove(); }); }
  function chips(lista) {
    quitarChips();
    if (!lista.length) return;
    var c = document.createElement("div"); c.className = "c";
    lista.forEach(function (f) {
      var b = document.createElement("button"); b.textContent = f.q;
      b.onclick = function () { input.value = f.q; enviar(); };
      c.appendChild(b);
    });
    msgs.appendChild(c); msgs.scrollTop = msgs.scrollHeight;
  }
  var ORDEN = [3, 4, 7, 9, 12, 11, 5, 8, 0, 1, 2, 13, 14, 10, 15, 16, 17, 6, 18];
  function sugerencias(n) {
    return ORDEN.filter(function (i) { return !preguntadas[i]; }).slice(0, n || 3).map(function (i) { return FAQ[i]; });
  }
  function bienvenida() {
    agregar("¡Hola! Soy el asistente de la Tecnicatura en Ciencia de Datos e IA. Las respuestas son orientativas; para trámites consultá en el IES N° 6. Las preguntas que no sé responder se guardan sin datos personales para mejorar el asistente.", "a");
    chips([FAQ[3], FAQ[4], FAQ[7], FAQ[9]]);
  }
  bienvenida();

  function responder(el, txt, guardar) {
    el.className = "g a"; el.removeAttribute("role"); el.removeAttribute("aria-label");
    el.textContent = txt;
    if (guardar) historial.push({ role: "assistant", content: txt });
    hablar(txt);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function pausa(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function enviar() {
    var t = input.value.trim();
    if (!t || ocupado) return;
    ocupado = true;
    input.value = ""; quitarChips(); agregar(t, "u");
    try {
      var sal = charla(t);
      if (sal) { var e0 = agregar(sal, "a"); hablar(sal); chips(sugerencias()); return; }
      var hit = buscar(t);
      historial.push({ role: "user", content: t });
      var el = escribiendo();
      if (hit) {
        await pausa(300);
        preguntadas[hit.i] = 1;
        responder(el, hit.a, true);
        if (hit.sd) fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registrar: true, messages: [{ role: "user", content: t }] }) }).catch(function () {});
        chips(sugerencias());
        return;
      }
      try { // sin coincidencia local: respaldo con modelo gratuito
        var r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: historial.slice(-6) }) });
        var d = await r.json();
        if (!d.reply) { var err = new Error(d.error); err.limite = r.status === 429; throw err; }
        responder(el, d.reply, true);
      } catch (e) {
        historial.pop();
        responder(el, e && e.limite ? e.message : "No tengo ese dato. Probá con alguna de estas preguntas o consultá en la secretaría del IES N° 6 de Perico.", false);
      }
      chips(sugerencias());
    } finally { ocupado = false; }
  }

  function hablar(txt) {
    if (!vozActiva || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(txt); u.lang = "es-AR"; speechSynthesis.speak(u);
  }

  // ---- Burbuja arrastrable (se pega al borde más cercano y recuerda su posición) ----
  var TAM = 56, M = 20, drag = null, arrastro = false;
  if (icono) { var im = document.createElement("img"); im.alt = ""; im.src = icono; bub.textContent = ""; bub.appendChild(im); }
  function limitar(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function movil() { return window.innerWidth <= 520; }
  var pos = { lado: izq ? "l" : "r", y: 1 };
  try { var g = JSON.parse(localStorage.getItem("chatbot_pos")); if (g && (g.lado === "l" || g.lado === "r") && typeof g.y === "number") pos = { lado: g.lado, y: limitar(g.y, 0, 1) }; } catch (e) {}
  function aplicarPos() {
    var W = window.innerWidth, H = window.innerHeight;
    bub.style.left = (pos.lado === "l" ? M : W - TAM - M) + "px";
    bub.style.top = limitar(M + pos.y * (H - TAM - 2 * M), 0, H - TAM) + "px";
    bub.classList.toggle("h", panel.classList.contains("o") && movil());
    posPanel();
  }
  function posPanel() {
    var W = window.innerWidth, vv = window.visualViewport;
    if (movil()) { // en celular el chat ocupa casi toda la pantalla y respeta el teclado
      var H2 = vv ? vv.height : window.innerHeight;
      panel.style.left = "8px"; panel.style.top = ((vv ? vv.offsetTop : 0) + 8) + "px";
      panel.style.width = (W - 16) + "px"; panel.style.height = (H2 - 16) + "px";
      return;
    }
    var H = window.innerHeight, pw = Math.min(360, W - 20), ph = Math.min(520, H - 110);
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
  if (window.visualViewport) { visualViewport.addEventListener("resize", posPanel); visualViewport.addEventListener("scroll", posPanel); }
  aplicarPos();

  function abrir() {
    panel.classList.add("o"); bub.setAttribute("aria-expanded", "true");
    bub.classList.toggle("h", movil()); posPanel(); input.focus();
  }
  function cerrar() {
    panel.classList.remove("o"); bub.setAttribute("aria-expanded", "false"); bub.classList.remove("h");
    if (rec) rec.abort();
    if (window.speechSynthesis) speechSynthesis.cancel();
    bub.focus();
  }
  bub.onclick = function () {
    if (arrastro) return; // fue un arrastre, no un clic
    if (panel.classList.contains("o")) cerrar(); else abrir();
  };
  $("#x").onclick = cerrar;
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrar(); });
  $("#s").onclick = enviar;
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") enviar(); });

  $("#r").onclick = function () {
    historial = []; preguntadas = {}; msgs.textContent = ""; estado("");
    if (window.speechSynthesis) speechSynthesis.cancel();
    bienvenida(); input.focus();
  };

  // ---- Micrófono con avisos de estado ----
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function micEstado(on) { $("#mic").classList.toggle("on", on); $("#mic").setAttribute("aria-pressed", on ? "true" : "false"); }
  var ERRORES = {
    "not-allowed": "El navegador bloqueó el micrófono. Permitilo desde el candado de la barra de direcciones.",
    "service-not-allowed": "El navegador bloqueó el micrófono. Permitilo desde la configuración del sitio.",
    "no-speech": "No te escuché. Probá de nuevo.",
    "audio-capture": "No encontré un micrófono conectado.",
    "network": "Sin conexión: el reconocimiento de voz la necesita."
  };
  if (SR) $("#mic").onclick = function () {
    if (rec) { rec.stop(); return; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    var texto = "", fallo = false, r = new SR();
    rec = r; r.lang = "es-AR"; r.interimResults = false;
    r.onstart = function () { micEstado(true); estado("🎤 Escuchando… hablá ahora (tocá de nuevo para parar)"); };
    r.onresult = function (e) { texto = e.results[0][0].transcript; };
    r.onerror = function (e) {
      if (e.error === "aborted") return;
      fallo = true; estado(ERRORES[e.error] || "No pude usar el micrófono.");
      setTimeout(function () { if (!rec) estado(""); }, 6000);
    };
    r.onend = function () {
      rec = null; micEstado(false);
      if (!fallo) estado("");
      if (texto) { input.value = texto; enviar(); }
    };
    try { r.start(); } catch (e) { rec = null; micEstado(false); estado("No pude iniciar el micrófono."); }
  }; else $("#mic").style.display = "none";

  if (window.speechSynthesis) $("#v").onclick = function () {
    vozActiva = !vozActiva; $("#v").textContent = vozActiva ? "🔊" : "🔇";
    $("#v").setAttribute("aria-pressed", vozActiva ? "true" : "false");
    if (!vozActiva) speechSynthesis.cancel();
  }; else $("#v").style.display = "none";
})();
