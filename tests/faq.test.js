// Pruebas automáticas del buscador de FAQ de public/widget.js.
// Mantener estas funciones sincronizadas con la implementación del widget.
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const faq = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "faq.json"), "utf8"));

function norm(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ");
}
const VACIAS = " que hay entre como para cual cuale por una uno los las del con mas esta esto ano carre cuant ";
function stem(w) { return w.slice(0, 5); }
function lev(a, b) {
  const p = [];
  let i, j;
  for (j = 0; j <= b.length; j++) p[j] = j;
  for (i = 1; i <= a.length; i++) {
    let prev = p[0];
    p[0] = i;
    for (j = 1; j <= b.length; j++) {
      const t = p[j];
      p[j] = Math.min(p[j] + 1, p[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return p[b.length];
}
function cerca(a, b) {
  if (stem(a) === stem(b)) return true;
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 2) return false;
  return lev(a, b) <= (Math.max(a.length, b.length) >= 9 ? 2 : 1);
}
function utiles(s) {
  return norm(s).split(/\\s+/).filter(function (w) {
    return w.length > 2 && VACIAS.indexOf(" " + stem(w) + " ") < 0 && !cerca(w, "carrera");
  });
}
const preparadas = faq.filter(f => f && typeof f.q === "string" && typeof f.a === "string")
  .map(f => ({ ...f, pal: utiles(f.kw || f.q) }));

function buscar(t) {
  const nt = norm(t).replace(/\\s+/g, " ").trim();
  for (const f of preparadas) {
    if (norm(f.q).replace(/\\s+/g, " ").trim() === nt) return f;
  }
  const qs = utiles(t);
  let mejor = null, max = 0;
  preparadas.forEach(function (f) {
    const p = qs.filter(w => f.pal.some(k => cerca(w, k))).length;
    if (p > max) { max = p; mejor = f; }
  });
  if (max === 0 || (max === 1 && qs.length > 1) || (max >= 2 && max / qs.length < 0.5)) return null;
  return mejor;
}

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
