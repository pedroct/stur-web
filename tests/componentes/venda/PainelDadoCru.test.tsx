import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import LayoutDaReserva from "@/app/reservas/[numero]/layout";
import type { ReservaConsultada } from "@/contrato/tipos";
import {
  calculos,
  contaServico,
  erroApi,
  reserva,
  resumoVenda,
  servicoAgi,
  vendaAgi,
  vendaConsultada,
} from "../../fabrica";
import { definirEndereco, roteador } from "../../navegacao";
import { requisicoesPara, servidor } from "../../servidor";

const VENDA = "/reservas/90000001/vendas/1001";
const DADO_CRU = `${VENDA}/dado-cru`;
const CAMINHO_CRU = "/api/v1/reservas/90000001/vendas/1001/dado-cru";
const SEM_ROLAR = { scroll: false };
const ESPERA = { timeout: 3000 };

const CRU = [
  "{",
  '  "idreserva": 1001,',
  '  "totalCliente": 150197.70,',
  '  "nomecliente": "CLIENTE EXEMPLO LTDA",',
  '  "dtcancelamento": null',
  "}",
].join("\n");

function umaVenda(): ReservaConsultada {
  return reserva(90000001, [resumoVenda({ idreserva: 1001, produto: "HOTEL NAC" })]);
}

function duasVendas(): ReservaConsultada {
  return reserva(90000001, [
    resumoVenda({ idreserva: 1001, produto: "EVENTO", classificacao: "Diversos" }),
    resumoVenda({ idreserva: 1002, produto: "HOTEL NAC" }),
  ]);
}

/** A reserva, a venda 1001 com `servicos` serviços de PESSOA k (com CPF) e o dado cru. */
function programar(r: ReservaConsultada, { servicos = 1, cru = CRU } = {}) {
  const itens = Array.from({ length: servicos }, (_, i) =>
    servicoAgi({
      descricao: `ITEM ${i + 1}`,
      nomePaxCompleto: `PESSOA ${i + 1}`,
      cpfPax: "000.000.000-00",
      dtInicio: "2026-05-21 00:00:00",
      dtTermino: "2026-05-21 00:00:00",
    }),
  );
  servidor.use(
    http.get(`*/api/v1/reservas/${r.numero}`, () => HttpResponse.json(r)),
    http.get(`*/api/v1/reservas/${r.numero}/vendas/:id`, ({ params }) => {
      const idreserva = Number(params.id);
      const posicao = r.reserva.vendas.findIndex((v) => v.resumo.idreserva === idreserva) + 1;
      return HttpResponse.json(
        vendaConsultada({
          venda: vendaAgi({
            reserva: r.numero,
            idreserva,
            classificacaoproduto: "Diversos",
            nomeproduto: "EVENTO",
            detalheItem: itens,
          }),
          calculos: calculos({
            servicos: itens.map((_, indice) => contaServico({ indice })),
          }),
          reserva: r.reserva,
          posicao,
          consultadoEm: r.consultadoEm,
          dadosDoSturAte: r.dadosDoSturAte,
        }),
      );
    }),
    http.get("*/api/v1/reservas/:numero/vendas/:id/dado-cru", () => HttpResponse.text(cru)),
  );
}

function abrir(endereco: string) {
  definirEndereco(endereco);
  return render(<LayoutDaReserva />);
}

/** A venda sozinha, o painel aberto pelo botão do cabeçalho e o JSON já na tela. */
async function abrirOPainel() {
  const botao = await screen.findByRole("button", { name: "Ver dado cru" }, ESPERA);
  await userEvent.click(botao);
  const painel = await screen.findByRole("dialog", {}, ESPERA);
  await within(painel).findByRole("region", { name: "JSON da venda" }, ESPERA);
  return { botao, painel };
}

test("o botão do cabeçalho abre o painel por push e mostra o JSON como veio", async () => {
  programar(umaVenda());
  abrir(VENDA);
  const { painel } = await abrirOPainel();
  expect(roteador.push).toHaveBeenCalledWith(DADO_CRU, SEM_ROLAR);
  expect(painel).toHaveAttribute("aria-modal", "true");
  const p = within(painel);
  expect(p.getByRole("heading", { level: 2, name: "Dado cru da venda" })).toBeVisible();
  expect(
    p.getByText(/^Reserva 90000001 · como a API do Stur devolveu, consultado às \d{2}h\d{2}$/),
  ).toBeVisible();
  expect(p.getByText(/^6 linhas · \d+,\d KB · chaves na ordem da API$/)).toBeVisible();
  const regiao = p.getByRole("region", { name: "JSON da venda" });
  // O número fica como veio: 150197.70, e não 150197.7.
  expect(within(regiao).getByText('"totalCliente"')).toBeVisible();
  expect(within(regiao).getByText("150197.70")).toBeVisible();
  expect(regiao.textContent).toContain('"idreserva": 1001,');
  expect(p.getByRole("button", { name: "Copiar tudo" })).toBeVisible();
  expect(p.getByRole("button", { name: "Baixar .json" })).toBeVisible();
  expect(p.getByLabelText("Buscar no JSON")).toHaveValue("");
});

test("abrir duas vezes faz uma chamada só do dado cru", async () => {
  programar(umaVenda());
  abrir(VENDA);
  const { painel } = await abrirOPainel();
  expect(requisicoesPara(CAMINHO_CRU)).toBe(1);
  await userEvent.click(within(painel).getByRole("button", { name: "Fechar" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await abrirOPainel();
  expect(requisicoesPara(CAMINHO_CRU)).toBe(1);
});

test("Esc com o foco na busca fecha o painel e devolve o foco a Ver dado cru", async () => {
  programar(umaVenda());
  abrir(VENDA);
  const { botao, painel } = await abrirOPainel();
  await userEvent.click(within(painel).getByLabelText("Buscar no JSON"));
  await userEvent.keyboard("{Escape}");
  expect(roteador.back).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(botao).toHaveFocus());
});

test("?q= abre a busca preenchida, com as linhas achadas marcadas e os links", async () => {
  programar(umaVenda());
  abrir(`${DADO_CRU}?q=150197.70`);
  const painel = await screen.findByRole("dialog", {}, ESPERA);
  const p = within(painel);
  const busca = await p.findByLabelText("Buscar no JSON", {}, ESPERA);
  expect(busca).toHaveValue("150197.70");
  expect(p.getByText("1 linha:")).toBeVisible();
  const link = p.getByRole("link", { name: "linha 3" });
  expect(link).toBeVisible();
  const marcada = p.getByText("150197.70").closest("[data-linha]");
  expect(marcada).toHaveClass("bg-estado-atencao-fundo");
  expect(marcada).toHaveAttribute("id", "dado-cru-l3");
  expect(p.getByText('"idreserva"').closest("[data-linha]")).not.toHaveClass(
    "bg-estado-atencao-fundo",
  );
  // O link vai à linha sem mexer no histórico.
  await userEvent.click(link);
  expect(roteador.push).not.toHaveBeenCalled();
});

test("digitar na busca grava ?q= com replace, e sem achado diz que não há linha", async () => {
  programar(umaVenda());
  abrir(VENDA);
  const { painel } = await abrirOPainel();
  const p = within(painel);
  await userEvent.type(p.getByLabelText("Buscar no JSON"), "Exemplo");
  expect(roteador.replace).toHaveBeenLastCalledWith(`${DADO_CRU}?q=Exemplo`, SEM_ROLAR);
  expect(roteador.push).toHaveBeenCalledTimes(1); // só a abertura do painel
  expect(await p.findByText("1 linha:")).toBeVisible();
  await userEvent.clear(p.getByLabelText("Buscar no JSON"));
  expect(roteador.replace).toHaveBeenLastCalledWith(DADO_CRU, SEM_ROLAR);
  await userEvent.type(p.getByLabelText("Buscar no JSON"), "zzz");
  expect(await p.findByText("Nenhuma linha com esse texto.")).toBeVisible();
});

test("a busca não diferencia acentos: ?q=NÃO acha o texto sem acento", async () => {
  programar(umaVenda(), { cru: '{\n  "nao": 1,\n  "outro": 2\n}' });
  abrir(`${DADO_CRU}?q=N%C3%83O`);
  const painel = await screen.findByRole("dialog", {}, ESPERA);
  expect(await within(painel).findByText("1 linha:", {}, ESPERA)).toBeVisible();
  expect(within(painel).getByRole("link", { name: "linha 2" })).toBeVisible();
});

test("Copiar tudo copia o texto inteiro e diz Copiado", async () => {
  programar(umaVenda());
  abrir(VENDA);
  const { painel } = await abrirOPainel();
  const usuario = userEvent.setup();
  const escrever = vi.spyOn(navigator.clipboard, "writeText");
  await usuario.click(within(painel).getByRole("button", { name: "Copiar tudo" }));
  expect(escrever).toHaveBeenCalledWith(CRU);
  expect(await within(painel).findByRole("button", { name: "Copiado" })).toBeVisible();
});

test("Baixar .json baixa o texto como veio, com o nome venda-{numero}-{idreserva}.json", async () => {
  programar(umaVenda());
  abrir(VENDA);
  const { painel } = await abrirOPainel();
  const blobs: Blob[] = [];
  URL.createObjectURL = vi.fn((blob: Blob) => {
    blobs.push(blob);
    return "blob:dado-cru";
  });
  URL.revokeObjectURL = vi.fn();
  const baixados: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    baixados.push(`${this.download}|${this.href}`);
  });
  try {
    await userEvent.click(within(painel).getByRole("button", { name: "Baixar .json" }));
    expect(baixados).toEqual(["venda-90000001-1001.json|blob:dado-cru"]);
    expect(blobs).toHaveLength(1);
    expect(await blobs[0]?.text()).toBe(CRU);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:dado-cru");
  } finally {
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
  }
});

test("o erro diz que o dado cru não carregou, deixa Tentar de novo e Fechar, e tentar de novo carrega", async () => {
  programar(umaVenda());
  let chamadas = 0;
  servidor.use(
    http.get(`*${CAMINHO_CRU}`, () => {
      chamadas += 1;
      return chamadas === 1
        ? HttpResponse.json(erroApi("api_stur_sem_resposta"), { status: 504 })
        : HttpResponse.text(CRU);
    }),
  );
  abrir(VENDA);
  await userEvent.click(await screen.findByRole("button", { name: "Ver dado cru" }, ESPERA));
  const painel = await screen.findByRole("dialog", {}, ESPERA);
  const p = within(painel);
  const alerta = await p.findByRole("alert", {}, ESPERA);
  expect(
    within(alerta).getByText(
      "O dado cru desta venda não carregou: A API do Stur não respondeu em 30 segundos.",
    ),
  ).toBeVisible();
  expect(p.getByRole("button", { name: "Fechar" })).toBeVisible();
  expect(p.queryByLabelText("Buscar no JSON")).toBeNull();
  await userEvent.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
  await p.findByRole("region", { name: "JSON da venda" }, ESPERA);
  expect(chamadas).toBe(2);
  expect(p.queryByRole("alert")).toBeNull();
});

test("Atualizar a venda com o painel aberto pede o dado cru de novo", async () => {
  programar(umaVenda());
  abrir(VENDA);
  const { painel } = await abrirOPainel();
  expect(requisicoesPara(CAMINHO_CRU)).toBe(1);
  // A venda atualizada vem sem o dado cru guardado: o painel pede outra vez.
  const atualizar = screen.getByRole("button", { name: /Atualizar/, hidden: true });
  act(() => atualizar.click());
  await waitFor(() => expect(requisicoesPara(CAMINHO_CRU)).toBe(2), ESPERA);
  await within(painel).findByRole("region", { name: "JSON da venda" }, ESPERA);
});

test("dentro da reserva, o botão do cabeçalho da venda também abre o dado cru", async () => {
  programar(duasVendas());
  abrir("/reservas/90000001/vendas/1002");
  await screen.findByRole("heading", { level: 2, name: /^Venda 2 · / }, ESPERA);
  await userEvent.click(screen.getByRole("button", { name: "Ver dado cru" }));
  expect(roteador.push).toHaveBeenCalledWith("/reservas/90000001/vendas/1002/dado-cru", SEM_ROLAR);
  const painel = await screen.findByRole("dialog", {}, ESPERA);
  expect(
    await within(painel).findByRole("region", { name: "JSON da venda" }, ESPERA),
  ).toBeVisible();
});

test("no painel do serviço, Ver dado cru troca por replace, e Voltar fecha o painel", async () => {
  programar(duasVendas(), { servicos: 3 });
  abrir(VENDA);
  await userEvent.click(await screen.findByRole("button", { name: "ITEM 2, PESSOA 2" }, ESPERA));
  const servico = await screen.findByRole("dialog", {}, ESPERA);
  await userEvent.click(within(servico).getByRole("button", { name: "Ver dado cru" }));
  expect(roteador.replace).toHaveBeenCalledWith(DADO_CRU, SEM_ROLAR);
  expect(roteador.push).toHaveBeenCalledTimes(1); // só a abertura do painel do serviço
  const painel = await screen.findByRole("dialog", { name: "Dado cru da venda" }, ESPERA);
  await within(painel).findByRole("region", { name: "JSON da venda" }, ESPERA);
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  act(() => roteador.back());
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("o painel do serviço copia o serviço e o link dele, sem o CPF", async () => {
  programar(duasVendas(), { servicos: 3 });
  abrir(`${VENDA}/servicos/2`);
  const painel = await screen.findByRole("dialog", {}, ESPERA);
  const usuario = userEvent.setup();
  const escrever = vi.spyOn(navigator.clipboard, "writeText");
  await usuario.click(within(painel).getByRole("button", { name: "Copiar para enviar" }));
  const copiado = String(escrever.mock.calls.at(-1)?.[0]);
  const linhas = copiado.split("\n");
  expect(linhas[1]).toBe(`${window.location.origin}${VENDA}/servicos/2`);
  expect(linhas).toContain("Serviço 2 de 3: PESSOA 2");
  expect(copiado).not.toContain("000.000.000-00");
  expect(await within(painel).findByRole("button", { name: "Copiado" })).toBeVisible();
});
