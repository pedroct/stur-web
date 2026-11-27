import type { Page } from "@playwright/test";
import type { ReservaConsultada, VendaConsultada } from "../src/contrato/tipos";
import {
  calculos,
  contaServico,
  erroApi,
  linha,
  reserva,
  resultado,
  resumoVenda,
  servicoAgi,
  vendaAgi,
  vendaConsultada,
} from "../tests/fabrica";
import { type Api, expect, test } from "./apoio";

const VENDAS = "/api/v1/vendas";
const NUMERO = 90000001;
const RESERVA = `/api/v1/reservas/${NUMERO}`;
const caminhoDaVenda = (id: number) => `${RESERVA}/vendas/${id}`;
const VENDA_1 = caminhoDaVenda(1001);
const VENDA_2 = caminhoDaVenda(1002);
const VENDA_3 = caminhoDaVenda(1003);
const DADO_CRU_1 = `${VENDA_1}/dado-cru`;
const PAGINA_1 = `/reservas/${NUMERO}/vendas/1001`;
const LINK = "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24";

type Venda = {
  idreserva: number;
  produto: string;
  classificacao?: string;
  /** Quantos serviços de "ITEM k" de "PESSOA k" a venda tem. */
  servicos?: number;
};

/** Reserva com as vendas dadas, na ordem; o endereço de cada uma é `caminhoDaVenda(idreserva)`. */
function reservaDe(...vendas: Venda[]): ReservaConsultada {
  return reserva(
    NUMERO,
    vendas.map((v) =>
      resumoVenda({
        numero: NUMERO,
        idreserva: v.idreserva,
        produto: v.produto,
        classificacao: v.classificacao ?? "Diversos",
      }),
    ),
  );
}

/** A resposta de `/vendas/{id}`: a venda de Diversos com os serviços pedidos. */
function vendaDe(r: ReservaConsultada, v: Venda): VendaConsultada {
  const itens = Array.from({ length: v.servicos ?? 1 }, (_, i) =>
    servicoAgi({
      descricao: `ITEM ${i + 1}`,
      nomePaxCompleto: `PESSOA ${i + 1}`,
      dtInicio: "2026-05-21 00:00:00",
      dtTermino: "2026-05-21 00:00:00",
    }),
  );
  return vendaConsultada({
    venda: vendaAgi({
      reserva: r.numero,
      idreserva: v.idreserva,
      nomeproduto: v.produto,
      classificacaoproduto: v.classificacao ?? "Diversos",
      detalheItem: itens,
    }),
    calculos: calculos({ servicos: itens.map((_, indice) => contaServico({ indice })) }),
    reserva: r.reserva,
    posicao: r.reserva.vendas.findIndex((x) => x.resumo.idreserva === v.idreserva) + 1,
    consultadoEm: r.consultadoEm,
    dadosDoSturAte: r.dadosDoSturAte,
  });
}

const TRES: Venda[] = [
  { idreserva: 1001, produto: "HOTEL NAC", classificacao: "Hotelaria" },
  { idreserva: 1002, produto: "SEGURO VIAGEM" },
  { idreserva: 1003, produto: "EVENTO FEIRA" },
];

/** Programa a reserva e a resposta de cada uma das vendas. */
function programar(api: Api, ...vendas: Venda[]) {
  const r = reservaDe(...vendas);
  api.responder(RESERVA, { corpo: r });
  for (const v of vendas) api.responder(caminhoDaVenda(v.idreserva), { corpo: vendaDe(r, v) });
  return r;
}

/** Abre o link da consulta (que só a prepara) e a faz, como a pessoa faria. */
async function consultarPeloLink(page: Page) {
  await page.goto(LINK);
  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(page.getByRole("table")).toBeVisible();
}

const titulo = (page: Page, nivel: number, nome: string) =>
  page.getByRole("heading", { level: nivel, name: nome });

test("venda por link direto: serviço, ←, Voltar; uma chamada só", async ({ page, api }) => {
  programar(api, { idreserva: 1001, produto: "EVENTO", servicos: 3 });
  await page.goto(PAGINA_1);
  await expect(titulo(page, 1, "CLIENTE EXEMPLO LTDA")).toBeVisible();

  await page.getByRole("button", { name: "ITEM 2, PESSOA 2" }).click();
  await expect(page).toHaveURL(`${PAGINA_1}/servicos/2`);
  const painel = page.getByRole("dialog", { name: "ITEM 2" });
  await expect(painel).toBeVisible();

  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(`${PAGINA_1}/servicos/1`);
  await expect(page.getByRole("dialog", { name: "ITEM 1" })).toBeVisible();

  // ← trocou o serviço por `replace`: um Voltar só fecha o painel.
  await page.goBack();
  await expect(page).toHaveURL(PAGINA_1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(titulo(page, 1, "CLIENTE EXEMPLO LTDA")).toBeVisible();

  await api.ociosa();
  expect(api.chamadas(VENDA_1)).toBe(1);
  expect(api.chamadas(RESERVA)).toBe(0);
  expect(api.chamadas(DADO_CRU_1)).toBe(0);
});

test("reserva de 3 vendas pela busca do topo: tabela, barra, ] e Voltar", async ({ page, api }) => {
  api.responder(VENDAS, { corpo: resultado([linha()]) });
  programar(api, ...TRES);
  await consultarPeloLink(page);

  const busca = page.getByRole("search");
  await busca.getByLabel("Número da reserva").fill(String(NUMERO));
  await busca.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(`/reservas/${NUMERO}`);
  await expect(page.getByRole("heading", { name: "Vendas desta reserva" })).toBeVisible();
  // A tabela vem sem venda aberta: nada de barra de troca.
  await expect(page.getByText("Ver as 3 vendas")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^HOTEL NAC venda 1 de 3/ })).toBeVisible();

  await page.getByRole("link", { name: /^SEGURO VIAGEM venda 2 de 3/ }).click();
  await expect(page).toHaveURL(`/reservas/${NUMERO}/vendas/1002`);
  const barra2 = page.getByText("Venda 2 de 3 · SEGURO VIAGEM", { exact: true });
  await expect(barra2).toBeVisible();
  await expect(titulo(page, 2, "Venda 2 · SEGURO VIAGEM")).toBeVisible();

  await page.keyboard.press("]");
  await expect(page).toHaveURL(`/reservas/${NUMERO}/vendas/1003`);
  await expect(titulo(page, 2, "Venda 3 · EVENTO FEIRA")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(`/reservas/${NUMERO}/vendas/1002`);
  await expect(barra2).toBeVisible();
  await expect(titulo(page, 2, "Venda 2 · SEGURO VIAGEM")).toBeVisible();

  await api.ociosa();
  expect(api.chamadas(RESERVA)).toBe(1);
  expect(api.chamadas(VENDA_2)).toBe(1);
  expect(api.chamadas(VENDA_3)).toBe(1);
  expect(api.chamadas(VENDA_1)).toBe(0);
});

test("12c: a venda 3 não responde, a barra fica na 3 e Tentar de novo abre", async ({
  page,
  api,
}) => {
  const r = programar(api, ...TRES);
  const terceira = TRES[2];
  if (terceira === undefined) throw new Error("sem a terceira venda");
  api.responder(
    VENDA_3,
    { status: 504, corpo: erroApi("api_stur_sem_resposta") },
    { corpo: vendaDe(r, terceira) },
  );
  await page.goto(`/reservas/${NUMERO}`);

  await page.getByRole("link", { name: /^EVENTO FEIRA venda 3 de 3/ }).click();
  await expect(page).toHaveURL(`/reservas/${NUMERO}/vendas/1003`);
  // O anunciador de rota do Next também é um `alert`: o erro é o da seção das vendas.
  const erro = page.getByRole("region", { name: "Vendas desta reserva" }).getByRole("alert");
  await expect(erro).toContainText(
    "A venda 3 não abriu: a API do Stur não respondeu em 30 segundos. Tente de novo em alguns minutos.",
  );
  await expect(page.getByText("Venda 3 de 3 · EVENTO FEIRA", { exact: true })).toBeVisible();

  await erro.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(titulo(page, 2, "Venda 3 · EVENTO FEIRA")).toBeVisible();
  await expect(erro).toHaveCount(0);
  await expect(page.getByText("Venda 3 de 3 · EVENTO FEIRA", { exact: true })).toBeVisible();
  await api.ociosa();
  expect(api.chamadas(VENDA_3)).toBe(2);
  expect(api.chamadas(RESERVA)).toBe(1);
});

// O texto de um valor com U+2028 cru no meio, como o backend o manda: o JavaScript, o Playwright
// e o navegador o tratam como quebra de linha; a tela e o backend contam só o `\n`.
const CRU = [
  "{",
  '  "idreserva": 1001,',
  '  "totalCliente": 1000.00,',
  '  "nomecliente": "CLIENTE EXEMPLO LTDA",',
  '  "observacao": "primeira parte segunda parte",',
  '  "dtcancelamento": null',
  "}",
].join("\n");

const CRU_EM_LINHAS = CRU.split("\n").length;

test("dado cru: busca no endereço, recarga e Fechar", async ({ page, api }) => {
  programar(api, { idreserva: 1001, produto: "HOTEL NAC", classificacao: "Hotelaria" });
  api.responder(DADO_CRU_1, { texto: CRU });
  await page.goto(PAGINA_1);
  await expect(titulo(page, 1, "CLIENTE EXEMPLO LTDA")).toBeVisible();

  await page.getByRole("button", { name: "Ver dado cru" }).click();
  await expect(page).toHaveURL(`${PAGINA_1}/dado-cru`);
  const painel = page.getByRole("dialog", { name: "Dado cru da venda" });
  await expect(painel).toBeVisible();
  // A linha com o U+2028 é uma linha só: a contagem é a de `\n`.
  await expect(painel.getByText(new RegExp(`^${CRU_EM_LINHAS} linhas · `))).toBeVisible();
  await expect(painel.locator("[data-linha]")).toHaveCount(CRU_EM_LINHAS);

  await painel.getByLabel("Buscar no JSON").fill("cliente");
  await expect(page).toHaveURL(`${PAGINA_1}/dado-cru?q=cliente`);
  await expect(painel.getByText("2 linhas:")).toBeVisible();

  const vendaAntes = api.chamadas(VENDA_1);
  const cruAntes = api.chamadas(DADO_CRU_1);
  await page.reload();
  await expect(page).toHaveURL(`${PAGINA_1}/dado-cru?q=cliente`);
  const depois = page.getByRole("dialog", { name: "Dado cru da venda" });
  await expect(depois.getByLabel("Buscar no JSON")).toHaveValue("cliente");
  await expect(depois.getByText("2 linhas:")).toBeVisible();
  await api.ociosa();
  expect(api.chamadas(VENDA_1) - vendaAntes).toBe(1);
  expect(api.chamadas(DADO_CRU_1) - cruAntes).toBe(1);

  // Aberto por recarga, o painel fecha para a venda, sem a busca.
  await depois.getByRole("button", { name: "Fechar" }).click();
  await expect(page).toHaveURL(PAGINA_1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(titulo(page, 1, "CLIENTE EXEMPLO LTDA")).toBeVisible();
});

test("dado cru: Esc logo depois de digitar fecha o painel e deixa o histórico certo", async ({
  page,
  api,
}) => {
  programar(api, { idreserva: 1001, produto: "HOTEL NAC", classificacao: "Hotelaria" });
  api.responder(DADO_CRU_1, { texto: CRU });
  await page.goto(PAGINA_1);
  await page.getByRole("button", { name: "Ver dado cru" }).click();
  const busca = page
    .getByRole("dialog", { name: "Dado cru da venda" })
    .getByLabel("Buscar no JSON");
  await expect(busca).toBeVisible();
  const entradas = await page.evaluate(() => history.length);

  // Cada tecla faz `router.replace`: o Esc vem enquanto elas ainda andam.
  await busca.pressSequentially("cliente");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(PAGINA_1);
  await expect(titulo(page, 1, "CLIENTE EXEMPLO LTDA")).toBeVisible();
  // As teclas só trocaram a entrada do painel: nenhuma entrada nova, e o endereço não volta a ela.
  await expect.poll(() => page.evaluate(() => history.length)).toBe(entradas);
  await expect(page).toHaveURL(PAGINA_1);

  // O Esc fez Voltar: Avançar mostra a entrada do painel, com as teclas que já tinham chegado.
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`${PAGINA_1}/dado-cru(\\?q=c[a-z]*)?$`));
  await expect(page.getByRole("dialog", { name: "Dado cru da venda" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(PAGINA_1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goBack();
  await expect(page).not.toHaveURL(/\/reservas\//);

  await api.ociosa();
  expect(api.chamadas(VENDA_1)).toBe(1);
  expect(api.chamadas(DADO_CRU_1)).toBe(1);
});

test("Copiar para enviar leva o endereço da venda", async ({ page, api, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  programar(api, { idreserva: 1001, produto: "HOTEL NAC", classificacao: "Hotelaria" });
  await page.goto(PAGINA_1);
  await expect(titulo(page, 1, "CLIENTE EXEMPLO LTDA")).toBeVisible();

  await page.getByRole("button", { name: "Copiar para enviar" }).click();
  await expect(page.getByRole("button", { name: "Copiado" })).toBeVisible();
  const copiado = await page.evaluate(() => navigator.clipboard.readText());
  const origem = new URL(page.url()).origin;
  expect(copiado.split("\n")[1]).toBe(`${origem}${PAGINA_1}`);
  expect(copiado).toContain("Consulta de reserva do Stur");
  expect(copiado).toContain("Id interno da venda: 1001");
  expect(copiado.endsWith("O que diverge do Stur:")).toBe(true);
});

test("Atualizar que falha mantém a venda (12b)", async ({ page, api }) => {
  const r = programar(api, { idreserva: 1001, produto: "HOTEL NAC", classificacao: "Hotelaria" });
  const venda = vendaDe(r, { idreserva: 1001, produto: "HOTEL NAC", classificacao: "Hotelaria" });
  api.responder(
    VENDA_1,
    { corpo: venda },
    { status: 504, corpo: erroApi("api_stur_sem_resposta") },
  );
  await page.goto(PAGINA_1);
  await expect(titulo(page, 1, "CLIENTE EXEMPLO LTDA")).toBeVisible();

  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Não foi possível atualizar" }),
  ).toBeVisible();
  await expect(titulo(page, 1, "CLIENTE EXEMPLO LTDA")).toBeVisible();
  await api.ociosa();
  expect(api.chamadas(VENDA_1)).toBe(2);
  expect(api.chamadas(RESERVA)).toBe(0);
});

test("da linha do resultado até a venda: caminho, . e volta sem consultar", async ({
  page,
  api,
}) => {
  const linhas = [0, 1, 2].map((i) => linha({ numero: NUMERO + i, idreserva: 1001 + i }));
  api.responder(VENDAS, { corpo: resultado(linhas) });
  for (const l of linhas) {
    const r = reserva(l.numero, [resumoVenda({ numero: l.numero, idreserva: l.idreserva })]);
    api.responder(`/api/v1/reservas/${l.numero}/vendas/${l.idreserva}`, {
      corpo: vendaConsultada({
        venda: vendaAgi({ reserva: l.numero, idreserva: l.idreserva }),
        reserva: r.reserva,
        consultadoEm: r.consultadoEm,
        dadosDoSturAte: r.dadosDoSturAte,
      }),
    });
  }
  await consultarPeloLink(page);
  await page.getByRole("row").nth(1).getByRole("cell").nth(2).click();
  await expect(page).toHaveURL(PAGINA_1);

  const caminho = page.getByRole("navigation", { name: "Caminho" });
  await expect(caminho).toHaveText(
    `Consulta › Vendas emitidas de 17/11 a 24/11 › Reserva ${NUMERO}`,
  );
  await expect(page.getByText("1 de 3 no resultado")).toBeVisible();

  await page.keyboard.press(".");
  await expect(page).toHaveURL(`/reservas/${NUMERO + 1}/vendas/1002`);
  await expect(page.getByText("2 de 3 no resultado")).toBeVisible();
  await expect(caminho).toHaveText(
    `Consulta › Vendas emitidas de 17/11 a 24/11 › Reserva ${NUMERO + 1}`,
  );

  await caminho.getByRole("link", { name: /^Vendas emitidas/ }).click();
  await expect(page).toHaveURL(LINK);
  await expect(page.getByRole("table")).toBeVisible();
  await api.ociosa();
  expect(api.chamadas(VENDAS)).toBe(1);
});
