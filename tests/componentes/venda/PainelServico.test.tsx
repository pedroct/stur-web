import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import LayoutDaReserva from "@/app/reservas/[numero]/layout";
import { Moldura } from "@/componentes/moldura/Moldura";
import type { ReservaConsultada, VendaConsultada } from "@/contrato/tipos";
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

const RESERVA = "/api/v1/reservas/90000001";
const VENDA_1 = "/api/v1/reservas/90000001/vendas/1001";
const VENDA = "/reservas/90000001/vendas/1001";
const SEM_ROLAR = { scroll: false };

function duasVendas(): ReservaConsultada {
  return reserva(90000001, [
    resumoVenda({ idreserva: 1001, produto: "EVENTO", classificacao: "Diversos" }),
    resumoVenda({ idreserva: 1002, produto: "HOTEL NAC" }),
  ]);
}

function umaVenda(): ReservaConsultada {
  return reserva(90000001, [
    resumoVenda({ idreserva: 1001, produto: "EVENTO", classificacao: "Diversos" }),
  ]);
}

/** A venda 1001 com `n` serviços de Diversos, "ITEM k" de "PESSOA k". */
function comServicos(r: ReservaConsultada, n: number): VendaConsultada {
  const servicos = Array.from({ length: n }, (_, i) =>
    servicoAgi({
      descricao: `ITEM ${i + 1}`,
      nomePaxCompleto: `PESSOA ${i + 1}`,
      dtInicio: "2026-05-21 00:00:00",
      dtTermino: "2026-05-21 00:00:00",
      numeroOS: `OS${i + 1}`,
      observacao: i === 1 ? "Nota do item dois" : null,
    }),
  );
  return vendaConsultada({
    venda: vendaAgi({
      reserva: r.numero,
      idreserva: 1001,
      classificacaoproduto: "Diversos",
      nomeproduto: "EVENTO",
      detalheItem: servicos,
    }),
    calculos: calculos({ servicos: servicos.map((_, i) => contaServico({ indice: i })) }),
    reserva: r.reserva,
    posicao: 1,
    consultadoEm: r.consultadoEm,
    dadosDoSturAte: r.dadosDoSturAte,
  });
}

function programar(r: ReservaConsultada, n: number) {
  servidor.use(
    http.get(`*/api/v1/reservas/${r.numero}`, () => HttpResponse.json(r)),
    http.get(`*/api/v1/reservas/${r.numero}/vendas/:id`, ({ params }) =>
      Number(params.id) === 1001
        ? HttpResponse.json(comServicos(r, n))
        : HttpResponse.json(erroApi("venda_nao_encontrada"), { status: 404 }),
    ),
  );
}

function abrir(endereco: string, { moldura = false } = {}) {
  definirEndereco(endereco);
  return render(
    moldura ? (
      <Moldura parametrosIniciais={{}}>
        <LayoutDaReserva />
      </Moldura>
    ) : (
      <LayoutDaReserva />
    ),
  );
}

async function abrirPelaLinha(k = 1) {
  const linha = await screen.findByRole("button", { name: `ITEM ${k}, PESSOA ${k}` });
  await userEvent.click(linha);
  const painel = await screen.findByRole("dialog");
  // A Base UI leva o foco para dentro do painel logo depois de abrir.
  await waitFor(() => expect(painel).toContainElement(document.activeElement as HTMLElement));
  return { linha, painel };
}

test("a linha abre o painel pelo contexto da página: push, Serviço 1 de 14 · venda 1 de 2", async () => {
  programar(duasVendas(), 14);
  abrir(VENDA);
  const { painel } = await abrirPelaLinha();
  expect(roteador.push).toHaveBeenCalledWith(`${VENDA}/servicos/1`, SEM_ROLAR);
  const p = within(painel);
  expect(p.getByText("Serviço 1 de 14 · venda 1 de 2")).toBeVisible();
  expect(p.getByRole("heading", { level: 2, name: "ITEM 1" })).toBeVisible();
  // A seta anterior fica desativada no primeiro, sem perder o foco.
  expect(p.getByRole("button", { name: "Serviço anterior" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  const proximo = p.getByRole("button", { name: "Próximo serviço" });
  expect(proximo).not.toHaveAttribute("aria-disabled", "true");
  expect(proximo).toHaveAttribute("title", "Próximo serviço (→)");
  expect(proximo).toHaveAttribute("aria-keyshortcuts", "ArrowRight");
  // As marcas das seções 3, 4 e 5 do serviço.
  for (const secao of ["3", "4", "5"]) {
    expect(painel.querySelector(`[data-anexo-secao="${secao}"]`)).not.toBeNull();
  }
});

test("o popup tem aria-modal", async () => {
  programar(duasVendas(), 3);
  abrir(`${VENDA}/servicos/2`);
  expect(await screen.findByRole("dialog")).toHaveAttribute("aria-modal", "true");
});

test("→ faz replace para o serviço 2, e ← volta; na última, a seta próxima desativa", async () => {
  programar(duasVendas(), 2);
  abrir(VENDA);
  const { painel } = await abrirPelaLinha();
  await userEvent.keyboard("{ArrowRight}");
  expect(roteador.replace).toHaveBeenCalledWith(`${VENDA}/servicos/2`, SEM_ROLAR);
  expect(await within(painel).findByText("Serviço 2 de 2 · venda 1 de 2")).toBeVisible();
  expect(within(painel).getByRole("heading", { level: 2, name: "ITEM 2" })).toBeVisible();
  expect(within(painel).getByRole("button", { name: "Próximo serviço" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  // Outra seta → na última não faz nada.
  roteador.replace.mockClear();
  await userEvent.keyboard("{ArrowRight}");
  expect(roteador.replace).not.toHaveBeenCalled();
  await userEvent.keyboard("{ArrowLeft}");
  expect(roteador.replace).toHaveBeenCalledWith(`${VENDA}/servicos/1`, SEM_ROLAR);
  expect(await within(painel).findByText("Serviço 1 de 2 · venda 1 de 2")).toBeVisible();
  // Trocar não empilha: Voltar fecha o painel.
  act(() => roteador.back());
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("Esc com o foco num botão do painel fecha e devolve o foco à linha que abriu", async () => {
  programar(duasVendas(), 3);
  abrir(VENDA);
  const { linha, painel } = await abrirPelaLinha(2);
  act(() => within(painel).getByRole("button", { name: "Próximo serviço" }).focus());
  await userEvent.keyboard("{Escape}");
  expect(roteador.back).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(linha).toHaveFocus());
});

test("Fechar depois de abrir pela página chama back", async () => {
  programar(duasVendas(), 3);
  abrir(VENDA);
  const { painel } = await abrirPelaLinha();
  const fechar = within(painel).getByRole("button", { name: "Fechar" });
  expect(fechar).toHaveAttribute("title", "Fechar (Esc)");
  await userEvent.click(fechar);
  expect(roteador.back).toHaveBeenCalledTimes(1);
  expect(roteador.replace).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

test("por link direto: uma chamada da venda, a venda atrás, e Fechar faz replace para ela", async () => {
  programar(duasVendas(), 3);
  abrir(`${VENDA}/servicos/2`);
  const painel = await screen.findByRole("dialog");
  expect(within(painel).getByText("Serviço 2 de 3 · venda 1 de 2")).toBeVisible();
  // A venda continua atrás, com a lista dos serviços.
  expect(
    screen.getByRole("heading", { level: 2, name: "CLIENTE EXEMPLO LTDA", hidden: true }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "ITEM 1, PESSOA 1", hidden: true }),
  ).toBeInTheDocument();
  expect(requisicoesPara(VENDA_1)).toBe(1);
  expect(requisicoesPara(RESERVA)).toBe(0);

  await userEvent.click(within(painel).getByRole("button", { name: "Fechar" }));
  expect(roteador.replace).toHaveBeenCalledWith(VENDA, SEM_ROLAR);
  expect(roteador.back).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  // Sem quem abriu, o foco vai para o título da venda.
  await waitFor(() =>
    expect(screen.getByRole("heading", { level: 2, name: "CLIENTE EXEMPLO LTDA" })).toHaveFocus(),
  );
  expect(requisicoesPara(VENDA_1)).toBe(1);
});

test("serviço fora da faixa faz replace para a venda", async () => {
  programar(duasVendas(), 3);
  abrir(`${VENDA}/servicos/99`);
  await waitFor(() => expect(roteador.replace).toHaveBeenCalledWith(VENDA, SEM_ROLAR));
  expect(
    await screen.findByRole("heading", { level: 2, name: "CLIENTE EXEMPLO LTDA" }),
  ).toBeVisible();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("/servicos/1 numa venda de um serviço só faz replace para a venda", async () => {
  programar(umaVenda(), 1);
  abrir(`${VENDA}/servicos/1`);
  await waitFor(() => expect(roteador.replace).toHaveBeenCalledWith(VENDA, SEM_ROLAR));
  expect(
    await screen.findByRole("heading", { level: 1, name: "CLIENTE EXEMPLO LTDA" }),
  ).toBeVisible();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("abrir, trocar e fechar o painel não chamam a API", async () => {
  programar(duasVendas(), 3);
  abrir(VENDA);
  const { painel } = await abrirPelaLinha();
  expect(requisicoesPara(VENDA_1)).toBe(1);
  await userEvent.click(within(painel).getByRole("button", { name: "Próximo serviço" }));
  expect(await within(painel).findByText("Serviço 2 de 3 · venda 1 de 2")).toBeVisible();
  await userEvent.click(within(painel).getByRole("button", { name: "Fechar" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(requisicoesPara(VENDA_1)).toBe(1);
  expect(requisicoesPara(RESERVA)).toBe(0);
});

test("/ com o painel aberto não tira o foco do painel", async () => {
  programar(duasVendas(), 3);
  abrir(`${VENDA}/servicos/1`, { moldura: true });
  const painel = await screen.findByRole("dialog");
  const proximo = within(painel).getByRole("button", { name: "Próximo serviço" });
  act(() => proximo.focus());
  await userEvent.keyboard("/");
  expect(proximo).toHaveFocus();
  expect(
    screen.getByRole("textbox", { name: "Número da reserva", hidden: true }),
  ).not.toHaveFocus();
});

test("o painel traz a pessoa, a conta, o resultado, a seção 3 e os grupos da seção 5", async () => {
  programar(duasVendas(), 3);
  abrir(`${VENDA}/servicos/2`);
  const painel = await screen.findByRole("dialog");
  const p = within(painel);
  expect(p.getByText("Evento nacional · 21/05/2026")).toBeVisible();
  expect(p.getByRole("heading", { level: 3, name: "Cliente" })).toBeVisible();
  expect(p.getByRole("heading", { level: 3, name: "Fornecedor" })).toBeVisible();
  expect(p.getByText("Total do cliente")).toBeVisible();
  expect(p.getByRole("heading", { level: 3, name: "Resultado do serviço" })).toBeVisible();
  expect(p.getByText("R$ 100,00")).toBeVisible();
  expect(p.getByText("10,00%")).toBeVisible();
  expect(p.getByText("Totais calculados pela aplicação.")).toBeVisible();
  // Seção 3 do serviço 2: os itens e a confirmação, pelo grupo.
  const secao3 = painel.querySelector('[data-anexo-secao="3"]') as HTMLElement;
  expect(within(secao3).getByText("OS2")).toBeVisible();
  // Seção 5: a observação do serviço 2, em h3.
  expect(p.getByRole("heading", { level: 3, name: "Observações" })).toBeVisible();
  expect(p.getByText("Nota do item dois")).toBeVisible();
});
