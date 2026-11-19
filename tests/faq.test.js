// Pruebas de la búsqueda FAQ usando las funciones reales de public/widget.js.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const faq = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "faq.json"), "utf8"));
const widget = fs.readFileSync(path.join(__dirname, "..", "public", "widget.js"), "utf8");

// Extrae el bloque real del buscador del widget, evitando mantener una copia paralela
// de norm(), utiles(), cerca(), prepararFAQ() y buscar().
const inicio = widget.indexOf("  // ---- Búsqueda en las FAQ (tolerante a errores de tipeo) ----");
const fin = widget.indexOf("  var AYUDA =", inicio);
assert.notEqual(inicio, -1, "No se encontró el bloque del buscador en public/widget.js");
assert.notEqual(fin, -1, "No se encontró el final del bloque del buscador en public/widget.js");

const sandbox = { FAQ: [] };
vm.runInNewContext(widget.slice(inicio, fin) + "\nthis.prepararFAQ = prepararFAQ; this.buscar = buscar; this.buscarMateriasPorAnio = buscarMateriasPorAnio;", sandbox);
sandbox.prepararFAQ(faq);
const buscar = pregunta => sandbox.buscar(pregunta);

test("la base FAQ es válida y no contiene preguntas duplicadas", () => {
  assert.ok(Array.isArray(faq));
  assert.ok(faq.length > 0);
  assert.equal(new Set(faq.map(f => f.q)).size, faq.length);
  faq.forEach((f, i) => {
    assert.equal(typeof f.q, "string", "FAQ #" + i + " sin pregunta");
    assert.equal(typeof f.a, "string", "FAQ #" + i + " sin respuesta");
    assert.ok(f.q.trim() && f.a.trim(), "FAQ #" + i + " vacía");
  });
});

for (const f of faq) {
  test("pregunta exacta: " + f.q, () => {
    const hit = buscar(f.q);
    assert.ok(hit, "No se encontró coincidencia");
    assert.equal(hit.q, f.q);
    assert.equal(hit.a, f.a);
  });
}

for (const [pregunta, esperada] of [
  ["¿Cuáles son las materias de primer año de la Tecnicatura en Ciencia de Datos e Inteligencia Artificial?", "¿Qué materias hay en primer año?"],
  ["¿Qué materias se cursan en segundo año?", "¿Qué materias hay en segundo año?"],
  ["¿Qué materias se cursan en tercer año de la Tecnicatura?", "¿Qué materias hay en tercer año?"],
  ["Decime las asignaturas del 3er año", "¿Qué materias hay en tercer año?"]
]) {
  test("consulta del plan por año: " + pregunta, () => {
    const hit = sandbox.buscarMateriasPorAnio(pregunta);
    assert.ok(hit, "No se detectó el año solicitado");
    assert.equal(hit.q, esperada);
    if (esperada === "¿Qué materias hay en tercer año?") {
      assert.match(hit.a, /Prácticas Profesionalizantes III/);
      assert.doesNotMatch(hit.a, /Prácticas Profesionalizantes II/);
    }
  });
}
const variantes = [
  ["¿Se pueden solicitar netbooks para usar en clase?", "¿Puedo solicitar una netbook para usar durante las clases?"],
  ["¿Los estudiantes pueden usar la conexión a Internet?", "¿El instituto tiene acceso a Internet para los estudiantes?"],
  ["¿Hay baños para estudiantes?", "¿El instituto cuenta con baños para los estudiantes?"],
  ["¿Se puede pedir una computadora para clase?", "¿Puedo solicitar una netbook para usar durante las clases?"],
  ["¿Cuántos años dura?", "¿Cuánto dura la carrera?"]
];
for (const [pregunta, esperada] of variantes) {
  test("variante de consulta: " + pregunta, () => {
    const hit = buscar(pregunta);
    assert.ok(hit, "La variante no encontró una FAQ");
    assert.equal(hit.q, esperada);
  });
}

for (const pregunta of [
  "¿Qué equipo ganó el Mundial de fútbol?",
  "Contame un chiste sobre animales",
  "¿Cuál es la capital de Francia?"
]) {
  test("no debe forzar una FAQ para una consulta ajena: " + pregunta, () => {
    assert.equal(buscar(pregunta), null);
  });
}
