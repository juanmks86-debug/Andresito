// Pruebas de contrato del backend sin consumir la API real del proveedor.
const { test } = require("node:test");
const assert = require("node:assert/strict");

process.env.IA_KEY = "test-key";
process.env.IA_URL = "https://ia-test.invalid/chat/completions";
process.env.IA_MODELO = "modelo-prueba";

const handler = require("../api/chat.js");

function responseMock() {
  return {
    code: 200,
    headers: {},
    body: undefined,
    setHeader(k, v) { this.headers[k] = v; },
    status(n) { this.code = n; return this; },
    json(v) { this.body = v; return this; },
    end() { this.ended = true; return this; }
  };
}
function request(method, body, ip) {
  return {
    method,
    body,
    headers: { host: "localhost", "x-real-ip": ip || Math.random().toString(36).slice(2) },
    socket: { remoteAddress: "127.0.0.1" }
  };
}

test("rechaza métodos distintos de POST", async () => {
  const res = responseMock();
  await handler(request("GET"), res);
  assert.equal(res.code, 405);
  assert.match(res.body.error, /Método no permitido/);
});

test("acepta preflight CORS sin llamar al proveedor", async () => {
  const anterior = global.fetch;
  global.fetch = async () => { throw new Error("No debe llamar al proveedor"); };
  try {
    const res = responseMock();
    await handler(request("OPTIONS"), res);
    assert.equal(res.code, 204);
    assert.equal(res.ended, true);
  } finally { global.fetch = anterior; }
});

test("rechaza mensajes inválidos antes de llamar al proveedor", async () => {
  const anterior = global.fetch;
  global.fetch = async () => { throw new Error("No debe llamar al proveedor"); };
  try {
    const res = responseMock();
    await handler(request("POST", { messages: [] }), res);
    assert.equal(res.code, 400);
    assert.match(res.body.error, /Solicitud inválida/);
  } finally { global.fetch = anterior; }
});

test("envía a la IA las reglas institucionales y las FAQ, y devuelve su respuesta", async () => {
  const anterior = global.fetch;
  let payload;
  global.fetch = async (url, options) => {
    assert.equal(url, process.env.IA_URL);
    payload = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: "La modalidad es presencial." } }] })
    };
  };
  try {
    const res = responseMock();
    await handler(request("POST", { messages: [{ role: "user", content: "¿La carrera es presencial?" }] }), res);
    assert.equal(res.code, 200);
    assert.equal(res.body.reply, "La modalidad es presencial.");
    assert.equal(payload.model, "modelo-prueba");
    const sistema = payload.messages.find(m => m.role === "system").content;
    assert.match(sistema, /No inventes ni completes por intuición/);
    assert.match(sistema, /PREGUNTAS FRECUENTES/);
    assert.match(sistema, /¿Es presencial o virtual\?/);
    assert.match(sistema, /No tengo ese dato/);
  } finally { global.fetch = anterior; }
});

test("devuelve error controlado si el proveedor falla", async () => {
  const anterior = global.fetch;
  global.fetch = async () => ({ ok: false, status: 503, text: async () => "servicio no disponible" });
  try {
    const res = responseMock();
    await handler(request("POST", { messages: [{ role: "user", content: "Consulta de prueba" }] }), res);
    assert.equal(res.code, 502);
    assert.match(res.body.error, /no está disponible/);
  } finally { global.fetch = anterior; }
});
