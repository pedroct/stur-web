// @vitest-environment node
import { HttpResponse, http } from "msw";
import { beforeAll, expect, test } from "vitest";
import { consultarVendas } from "@/lib/api/cliente";
import { CONSULTA_VAZIA } from "@/lib/consulta/consulta";
import { linha, resultado } from "../../fabrica";
import { servidor } from "../../servidor";

beforeAll(() => {
  globalThis.location = new URL("http://localhost:3000/") as unknown as Location;
});

function capturar(): { url: () => URL } {
  let capturada: URL | null = null;
  servidor.use(
    http.get("*/api/v1/vendas", ({ request }) => {
      capturada = new URL(request.url);
      return HttpResponse.json(resultado([linha()]));
    }),
  );
  return {
    url: () => {
      if (!capturada) throw new Error("a rota não foi chamada");
      return capturada;
    },
  };
}

test("manda listas repetidas e os nomes do backend", async () => {
  const chamada = capturar();
  await consultarVendas(
    {
      ...CONSULTA_VAZIA,
      reserva: 90000001,
      tipoData: "confirmacao",
      de: "2026-11-01",
      ate: "2026-11-24",
      situacao: ["reservada", "cancelada"],
      classificacao: ["aereo"],
      fornecedor: "AEREA EXEMPLO",
    },
    { atualizar: true },
  );
  expect(chamada.url().search).toBe(
    "?reserva=90000001&tipoData=confirmacao&de=2026-11-01&ate=2026-11-24&situacao=reservada&situacao=cancelada&classificacao=aereo&fornecedor=AEREA%20EXEMPLO&atualizar=true",
  );
});

test("sem número, sem filtros e sem pedir atualização, manda só o período", async () => {
  const chamada = capturar();
  await consultarVendas({ ...CONSULTA_VAZIA, de: "2026-11-17", ate: "2026-11-24" });
  expect(chamada.url().search).toBe("?tipoData=emissao&de=2026-11-17&ate=2026-11-24");
});

test("cliente e emissor vão com acento e espaço codificados e devolve o resultado", async () => {
  const chamada = capturar();
  const devolvido = await consultarVendas({
    ...CONSULTA_VAZIA,
    reserva: 90000001,
    cliente: "São Paulo",
    emissor: "EMISSOR EXEMPLO",
  });
  expect(chamada.url().searchParams.get("cliente")).toBe("São Paulo");
  expect(chamada.url().searchParams.get("emissor")).toBe("EMISSOR EXEMPLO");
  expect(devolvido.vendas).toHaveLength(1);
});
