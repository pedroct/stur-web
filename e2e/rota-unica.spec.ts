import type { ReservaConsultada } from "../src/contrato/tipos";
import { reserva, resumoVenda, vendaAgi, vendaConsultada } from "../tests/fabrica";
import { expect, test } from "./apoio";

const RESERVA = "/api/v1/reservas/90000001";
const VENDA_1 = "/api/v1/reservas/90000001/vendas/1001";
const VENDA_2 = "/api/v1/reservas/90000001/vendas/1002";

const DUAS_VENDAS = reserva(90000001, [
  resumoVenda({ idreserva: 1001, produto: "HOTEL NAC" }),
  resumoVenda({ idreserva: 1002, produto: "SEGURO VIAGEM", classificacao: "Diversos" }),
]);

function vendaDe(r: ReservaConsultada, idreserva: number, posicao: number) {
  const produto = r.reserva.vendas[posicao - 1]?.resumo.produto ?? null;
  return vendaConsultada({
    venda: vendaAgi({ reserva: r.numero, idreserva, nomeproduto: produto }),
    reserva: r.reserva,
    posicao,
    consultadoEm: r.consultadoEm,
    dadosDoSturAte: r.dadosDoSturAte,
  });
}

// Prova no Next real que o layout de [numero] não remonta quando o segmento filho muda: o estado
// da reserva e das vendas fica, e nada é consultado de novo (decisão 16). `page.goto` recarrega e
// `history.pushState` passa por fora do roteador: a troca é pela linha da tabela das vendas, que a
// barra de troca reabre em "Ver as 2 vendas".
test("trocar de venda não refaz a consulta", async ({ page, api }) => {
  api.responder(VENDA_1, { corpo: vendaDe(DUAS_VENDAS, 1001, 1) });
  api.responder(VENDA_2, { corpo: vendaDe(DUAS_VENDAS, 1002, 2) });
  const caminho = page.getByRole("navigation", { name: "Caminho" });

  await page.goto("/reservas/90000001/vendas/1001");
  await expect(caminho).toHaveText("Consulta › Reserva 90000001 › Venda 1 de 2");
  await expect(page.getByRole("heading", { level: 2, name: "Venda 1 · HOTEL NAC" })).toBeVisible();
  await api.ociosa();
  expect(api.chamadas(VENDA_1)).toBe(1);
  expect(api.chamadas(RESERVA)).toBe(0);

  await page.getByText("Ver as 2 vendas", { exact: true }).click();
  await page.getByRole("link", { name: /^SEGURO VIAGEM venda 2 de 2/ }).click();
  await expect(page).toHaveURL("/reservas/90000001/vendas/1002");
  await expect(caminho).toHaveText("Consulta › Reserva 90000001 › Venda 2 de 2");
  await expect(
    page.getByRole("heading", { level: 2, name: "Venda 2 · SEGURO VIAGEM" }),
  ).toBeVisible();
  await api.ociosa();
  expect(api.chamadas(VENDA_2)).toBe(1);
  expect(api.chamadas(VENDA_1)).toBe(1);

  await page.goBack();
  await expect(page).toHaveURL("/reservas/90000001/vendas/1001");
  await expect(caminho).toHaveText("Consulta › Reserva 90000001 › Venda 1 de 2");
  await expect(page.getByRole("heading", { level: 2, name: "Venda 1 · HOTEL NAC" })).toBeVisible();
  await api.ociosa();
  expect(api.chamadas(VENDA_1)).toBe(1);
  expect(api.chamadas(VENDA_2)).toBe(1);
  expect(api.chamadas(RESERVA)).toBe(0);
});
