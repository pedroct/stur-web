// @vitest-environment node
import { HttpResponse, http } from "msw";
import { beforeAll, expect, test } from "vitest";
import { consultarDadoCru, consultarVenda } from "@/lib/api/cliente";
import { erroApi, vendaConsultada } from "../../fabrica";
import { servidor } from "../../servidor";

beforeAll(() => {
  globalThis.location = new URL("http://localhost:3000/") as unknown as Location;
});

test("consultarVenda chama o caminho da venda e devolve o contrato", async () => {
  let caminho = "";
  servidor.use(
    http.get("*/api/v1/reservas/:numero/vendas/:idreserva", ({ request }) => {
      caminho = new URL(request.url).pathname;
      return HttpResponse.json(vendaConsultada());
    }),
  );
  const venda = await consultarVenda(90000001, 1001);
  expect(caminho).toBe("/api/v1/reservas/90000001/vendas/1001");
  expect(venda.venda.idreserva).toBe(1001);
});

test("consultarVenda: 504 vira sem_resposta e 404 vira nao_encontrada", async () => {
  servidor.use(
    http.get("*/api/v1/reservas/:numero/vendas/:idreserva", () =>
      HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 }),
    ),
  );
  await expect(consultarVenda(90000001, 1001)).rejects.toMatchObject({
    name: "ErroDaConsulta",
    tipo: "sem_resposta",
  });
  servidor.use(
    http.get("*/api/v1/reservas/:numero/vendas/:idreserva", () =>
      HttpResponse.json(erroApi("venda_nao_encontrada"), { status: 404 }),
    ),
  );
  await expect(consultarVenda(90000001, 1001)).rejects.toMatchObject({ tipo: "nao_encontrada" });
});

test("consultarDadoCru devolve o texto igual, byte a byte, sem passar por JSON.parse", async () => {
  const cru = '{\n  "b": 150197.70,\n  "a": 1\n}';
  let caminho = "";
  servidor.use(
    http.get("*/api/v1/reservas/:numero/vendas/:idreserva/dado-cru", ({ request }) => {
      caminho = new URL(request.url).pathname;
      return new HttpResponse(cru, { headers: { "Content-Type": "application/json" } });
    }),
  );
  const texto = await consultarDadoCru(90000001, 1001);
  expect(caminho).toBe("/api/v1/reservas/90000001/vendas/1001/dado-cru");
  expect(texto).toBe(cru);
});

test("consultarDadoCru traduz os erros como o resto do cliente", async () => {
  servidor.use(
    http.get("*/api/v1/reservas/:numero/vendas/:idreserva/dado-cru", () =>
      HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 }),
    ),
  );
  await expect(consultarDadoCru(90000001, 1001)).rejects.toMatchObject({ tipo: "sem_resposta" });
});
