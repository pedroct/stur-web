import type { Page } from "@playwright/test";
import { erroApi, linha, reserva, resultado, resumoVenda } from "../tests/fabrica";
import { expect, test } from "./apoio";

const VENDAS = "/api/v1/vendas";
const LINK = "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24";

function vendas(
  quantidade: number,
  campos: (i: number) => Parameters<typeof linha>[0] = () => ({}),
) {
  return Array.from({ length: quantidade }, (_, i) =>
    linha({ numero: 90000001 + i, idreserva: 1001 + i, ...campos(i) }),
  );
}

/** Abre o link da consulta (que só a prepara) e a faz, como a pessoa faria. */
async function consultarPeloLink(page: Page, endereco = LINK) {
  await page.goto(endereco);
  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(page.getByRole("table")).toBeVisible();
}

test("link de período não consulta até o clique (critério 21)", async ({ page, api }) => {
  api.responder(VENDAS, { corpo: resultado([linha()]) });
  await page.goto("/consulta?data=emissao&de=2026-11-17&ate=2026-11-24&fornecedor=EXEMPLO");
  await expect(page.getByRole("note")).toContainText("Este link trouxe uma consulta pronta");
  expect(api.chamadas(VENDAS)).toBe(0);
  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  expect(api.chamadas(VENDAS)).toBe(1);
});

test("período longo recusado sem chamar a API (critério 12)", async ({ page, api }) => {
  await page.goto("/");
  await page.getByLabel("De", { exact: true }).fill("2026-10-01");
  await page.getByLabel("Até", { exact: true }).fill("2026-11-24");
  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(
    page.getByText(
      "Sem número de reserva, o período vai até 31 dias. Diminua o período ou informe o número.",
    ),
  ).toBeVisible();
  await expect(page).toHaveURL("/");
  expect(api.chamadas(VENDAS)).toBe(0);
});

test("abrir a venda, voltar e recarregar não consultam de novo (P2)", async ({ page, api }) => {
  api.responder(VENDAS, { corpo: resultado([linha()]) });
  await page.goto("/");
  await page.getByLabel("De", { exact: true }).fill("2026-11-17");
  await page.getByLabel("Até", { exact: true }).fill("2026-11-24");
  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  expect(api.chamadas(VENDAS)).toBe(1);

  await page.getByRole("row").nth(1).getByRole("cell").nth(2).click();
  await expect(page).toHaveURL("/reservas/90000001/vendas/1001");

  await page.goBack();
  await expect(page.getByRole("table")).toBeVisible();
  expect(api.chamadas(VENDAS)).toBe(1);

  await page.reload();
  await expect(page.getByRole("table")).toBeVisible();
  expect(api.chamadas(VENDAS)).toBe(1);
});

test("refinamento e página ficam no endereço", async ({ page, api }) => {
  // 54 vendas: 30 do fornecedor ALFA e 24 do BETA; a busca por ALFA deixa duas páginas de 20.
  api.responder(VENDAS, {
    corpo: resultado(
      vendas(54, (i) => ({ fornecedor: i < 30 ? "FORNECEDOR ALFA" : "FORNECEDOR BETA" })),
    ),
  });
  await consultarPeloLink(page);
  await expect(page.getByText("Mostrando as 54 vendas do resultado.")).toBeVisible();

  await page.getByLabel("Buscar no resultado").fill("ALFA");
  await expect(page).toHaveURL(/[?&]q=ALFA(&|$)/);
  await expect(page.getByText(/Mostrando 30 de 54 vendas/)).toBeVisible();

  await page.getByRole("button", { name: "Próxima página" }).click();
  await expect(page).toHaveURL(/[?&]q=ALFA(&|$)/);
  await expect(page).toHaveURL(/[?&]pagina=2(&|$)/);
  await expect(page.getByText("21–30 de 30")).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/[?&]q=ALFA(&|$)/);
  await expect(page).toHaveURL(/[?&]pagina=2(&|$)/);
  await expect(page.getByLabel("Buscar no resultado")).toHaveValue("ALFA");
  await expect(page.getByText("21–30 de 30")).toBeVisible();
  expect(api.chamadas(VENDAS)).toBe(1);
});

test("Cancelar consulta interrompe e volta preenchido", async ({ page, api }) => {
  api.responder(VENDAS, { corpo: resultado([linha()]), atraso: 5000 });
  await page.goto(LINK);
  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(page.getByRole("button", { name: "Cancelar consulta" })).toBeVisible();

  await page.getByRole("button", { name: "Cancelar consulta" }).click();
  await expect(page).toHaveURL("/?data=emissao&de=2026-11-17&ate=2026-11-24");
  await expect(page.getByLabel("De", { exact: true })).toHaveValue("2026-11-17");
  await expect(page.getByLabel("Até", { exact: true })).toHaveValue("2026-11-24");
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("Atualizar que falha mantém a tabela (decisão 43)", async ({ page, api }) => {
  api.responder(
    VENDAS,
    { corpo: resultado([linha()]) },
    { status: 504, corpo: erroApi("api_stur_sem_resposta") },
  );
  await consultarPeloLink(page);

  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Não foi possível atualizar" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  expect(api.chamadas(VENDAS)).toBe(2);
});

test("número sem vendas e número com uma venda (P7)", async ({ page, api }) => {
  api.responder(VENDAS, { corpo: resultado([linha()]) });
  api.responder("/api/v1/reservas/90000099", { corpo: reserva(90000099, []) });
  api.responder("/api/v1/reservas/90000001", {
    corpo: reserva(90000001, [resumoVenda({ numero: 90000001, idreserva: 1001 })]),
  });
  // A busca do topo só aparece fora da tela inicial e do formulário: parte-se de um resultado.
  await consultarPeloLink(page);
  const busca = page.getByRole("search");

  await busca.getByLabel("Número da reserva").fill("90000099");
  await busca.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByRole("heading", { name: "Nenhuma venda encontrada" })).toBeVisible();
  await expect(page).toHaveURL("/reservas/90000099");

  await busca.getByLabel("Número da reserva").fill("90000001");
  await busca.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL("/reservas/90000001/vendas/1001");
});

test("resultado guardado em formato inesperado: erro da aplicação uma vez; recarregar volta ao link", async ({
  page,
  api,
}) => {
  await page.goto("/");
  const guardado = resultado([linha()], { resumo: { totalCliente: "não é decimal" } });
  await page.evaluate(
    ([chave, json]) => {
      sessionStorage.setItem(`stur-web:resultado:${chave}`, json);
      sessionStorage.setItem("stur-web:resultados", JSON.stringify([chave]));
    },
    [LINK, JSON.stringify(guardado)] as const,
  );
  await page.goto(LINK);
  const alerta = page.getByRole("alert");
  await expect(alerta.getByRole("heading", { level: 1 })).toHaveText("Erro nesta aplicação");

  await page.reload();
  await expect(page.getByRole("note")).toContainText("Este link trouxe uma consulta pronta");
  expect(api.chamadas(VENDAS)).toBe(0);
});
