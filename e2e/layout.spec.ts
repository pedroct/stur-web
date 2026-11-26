import type { Locator } from "@playwright/test";
import { calculos, contaServico, servicoAgi, vendaAgi, vendaConsultada } from "../tests/fabrica";
import { expect, test } from "./apoio";

// A geometria que o jsdom não mede: os pares lado a lado (IA 7.1).

const VENDA = "/api/v1/reservas/90000001/vendas/1001";
const PAGINA = "/reservas/90000001/vendas/1001";

async function caixa(alvo: Locator) {
  const c = await alvo.boundingBox();
  if (c === null) throw new Error("elemento sem caixa");
  return c;
}

function hotel() {
  const servico = servicoAgi({
    dtEntrada: "2026-11-20T00:00:00",
    dtSaida: "2026-11-22T00:00:00",
    regime: "CAFÉ DA MANHÃ",
    observacao: "OBSERVACAO EXEMPLO",
  });
  return vendaConsultada({
    venda: vendaAgi({ detalheItem: [servico] }),
    calculos: calculos({ servicos: [contaServico({ indice: 0 })] }),
  });
}

test("pares do grupo: rótulo e valor lado a lado a partir de 720 px, empilhados abaixo", async ({
  page,
  api,
}) => {
  api.responder(VENDA, { corpo: hotel() });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(PAGINA);
  const rotulo = page.locator("dt", { hasText: /^Observação$/ });
  const valor = rotulo.locator("xpath=following-sibling::dd[1]");
  await expect(valor).toHaveText("OBSERVACAO EXEMPLO");
  const r = await caixa(rotulo);
  const v = await caixa(valor);
  expect(Math.abs(v.y - r.y)).toBeLessThan(2);
  expect(v.x).toBeGreaterThan(r.x);

  await page.setViewportSize({ width: 600, height: 900 });
  const r2 = await caixa(rotulo);
  const v2 = await caixa(valor);
  expect(v2.y).toBeGreaterThanOrEqual(r2.y + r2.height - 1);
});
