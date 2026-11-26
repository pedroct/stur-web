// @vitest-environment node
import { delay, HttpResponse, http } from "msw";
import { beforeAll, expect, test, vi } from "vitest";
import {
  buscarJson,
  consultarReserva,
  type ErroDaConsulta,
  TEMPO_LIMITE_NAVEGADOR_MS,
} from "@/lib/api/cliente";
import { TEXTOS_ERRO } from "@/lib/api/textos-erro";
import { erroApi, reserva, resumoVenda } from "../../fabrica";
import { servidor } from "../../servidor";

// fetch do Node com AbortSignal do Node; location definido no beforeAll
beforeAll(() => {
  globalThis.location = new URL("http://localhost:3000/") as unknown as Location;
});

test.each([
  [504, erroApi("api_stur_sem_resposta"), "sem_resposta"],
  [502, erroApi("api_stur_acesso_recusado"), "acesso_recusado"],
  [
    502,
    erroApi("api_stur_resposta_invalida", "…", ["venda 1001: totalCliente: decimal_parsing"]),
    "formato",
  ],
  [500, erroApi("erro_interno"), "aplicacao"],
  [404, erroApi("venda_nao_encontrada"), "nao_encontrada"],
  [404, erroApi("rota_inexistente"), "aplicacao"],
] as const)("HTTP %i com %o vira %s", async (status, corpo, tipo) => {
  servidor.use(http.get("*/api/v1/x", () => HttpResponse.json(corpo, { status })));
  await expect(buscarJson("/api/v1/x")).rejects.toMatchObject({ tipo, codigo: corpo.codigo });
});

test("a mensagem e o detalhe do backend vão para o erro", async () => {
  const corpo = erroApi("api_stur_resposta_invalida", "Formato novo.", ["venda 1001: sem total"]);
  servidor.use(http.get("*/api/v1/x", () => HttpResponse.json(corpo, { status: 502 })));
  const erro = await buscarJson<never>("/api/v1/x").catch((e: ErroDaConsulta) => e);
  expect(erro).toBeInstanceOf(Error);
  expect(erro).toMatchObject({
    message: "Formato novo.",
    mensagem: "Formato novo.",
    campo: null,
    detalhe: ["venda 1001: sem total"],
  });
});

test("422 traz o campo e a mensagem do backend", async () => {
  servidor.use(
    http.get("*/api/v1/x", () =>
      HttpResponse.json(
        { codigo: "periodo_longo", mensagem: "Sem número…", campo: "de" },
        { status: 422 },
      ),
    ),
  );
  await expect(buscarJson("/api/v1/x")).rejects.toMatchObject({
    tipo: "invalida",
    campo: "de",
    mensagem: "Sem número…",
  });
});

test("504 sem JSON (Traefik) é sem resposta; 502 sem JSON é desta aplicação", async () => {
  servidor.use(http.get("*/api/v1/a", () => new HttpResponse("Gateway Timeout", { status: 504 })));
  await expect(buscarJson("/api/v1/a")).rejects.toMatchObject({ tipo: "sem_resposta" });
  servidor.use(http.get("*/api/v1/b", () => new HttpResponse("Bad Gateway", { status: 502 })));
  await expect(buscarJson("/api/v1/b")).rejects.toMatchObject({ tipo: "aplicacao", codigo: null });
});

test("sem JSON, a mensagem é a do texto da tabela", async () => {
  servidor.use(http.get("*/api/v1/a", () => new HttpResponse("Gateway Timeout", { status: 504 })));
  await expect(buscarJson("/api/v1/a")).rejects.toMatchObject({
    mensagem: TEXTOS_ERRO.sem_resposta.mensagem(30),
  });
  servidor.use(http.get("*/api/v1/b", () => new HttpResponse("Bad Gateway", { status: 502 })));
  await expect(buscarJson("/api/v1/b")).rejects.toMatchObject({
    mensagem: TEXTOS_ERRO.aplicacao.mensagem(30),
  });
});

test("rede fora é desta aplicação, com a causa guardada", async () => {
  servidor.use(http.get("*/api/v1/x", () => HttpResponse.error()));
  const erro = await buscarJson<never>("/api/v1/x").catch((e: ErroDaConsulta) => e);
  expect(erro).toMatchObject({ tipo: "aplicacao", codigo: null });
  expect(erro.cause).toBeInstanceOf(TypeError);
});

test("tempo do navegador esgotado é sem resposta", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  servidor.use(
    http.get("*/api/v1/lento", async () => {
      await delay("infinite");
      return HttpResponse.json({});
    }),
  );
  // a asserção vem antes de avançar, para a rejeição ter dono
  const esperado = expect(buscarJson("/api/v1/lento")).rejects.toMatchObject({
    tipo: "sem_resposta",
    mensagem: TEXTOS_ERRO.sem_resposta.mensagem(30),
  });
  await vi.advanceTimersByTimeAsync(TEMPO_LIMITE_NAVEGADOR_MS);
  await esperado;
});

test("cancelar pela pessoa é cancelada, não erro", async () => {
  servidor.use(
    http.get("*/api/v1/lento", async () => {
      await delay("infinite");
      return HttpResponse.json({});
    }),
  );
  const controle = new AbortController();
  const promessa = buscarJson("/api/v1/lento", { sinal: controle.signal });
  controle.abort();
  await expect(promessa).rejects.toMatchObject({
    tipo: "cancelada",
    mensagem: "Consulta cancelada.",
    codigo: null,
  });
});

test("um sinal que já nasceu cancelado também é cancelada", async () => {
  await expect(buscarJson("/api/v1/x", { sinal: AbortSignal.abort() })).rejects.toMatchObject({
    tipo: "cancelada",
  });
});

test("resposta boa devolve o JSON", async () => {
  servidor.use(http.get("*/api/v1/ok", () => HttpResponse.json({ valor: 1 })));
  await expect(buscarJson("/api/v1/ok")).resolves.toEqual({ valor: 1 });
});

test("consultarReserva chama a rota da reserva", async () => {
  const corpo = reserva(90000001, [resumoVenda()]);
  servidor.use(http.get("*/api/v1/reservas/90000001", () => HttpResponse.json(corpo)));
  await expect(consultarReserva(90000001)).resolves.toEqual(corpo);
});
