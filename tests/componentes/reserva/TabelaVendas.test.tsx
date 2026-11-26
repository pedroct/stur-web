import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { BarraDeTroca } from "@/componentes/reserva/BarraDeTroca";
import { TabelaVendas } from "@/componentes/reserva/TabelaVendas";
import { TelaReserva, type VendaAberta } from "@/componentes/reserva/TelaReserva";
import { PainelContexto } from "@/componentes/venda/painel-contexto";
import type { Reserva, ReservaConsultada, ResumoVenda, VendaDaReserva } from "@/contrato/tipos";
import { ErroDaConsulta } from "@/lib/api/cliente";
import { reserva, resumoVenda, vendaAgi, vendaConsultada } from "../../fabrica";
import { definirEndereco, roteador } from "../../navegacao";

const HOJE = "2026-11-24";
const SEM_CONSULTA = { atualizando: false, aoAtualizar: () => undefined, falha: null };

function consultada(
  resumos: Partial<ResumoVenda>[],
  extras: Partial<VendaDaReserva>[] = [],
): ReservaConsultada {
  const base = reserva(
    90000001,
    resumos.map((c, i) => resumoVenda({ idreserva: 1001 + i, ...c })),
  );
  return {
    ...base,
    reserva: {
      ...base.reserva,
      vendas: base.reserva.vendas.map((v, i) => ({ ...v, ...extras[i] })),
      totais: { ...base.reserva.totais, percentualLucro: "10.00" },
    },
  };
}

/** Três vendas: aéreo, a cancelada e outro aéreo; mesmo passageiro em todas. */
function tresVendas(passageiros: string[][] = [["ANA EXEMPLO"], ["ANA EXEMPLO"], ["ANA EXEMPLO"]]) {
  return consultada(
    [
      { produto: "BILHETE EXEMPLO", classificacao: "Aéreo", passageiros: passageiros[0] },
      {
        produto: "RAV EXEMPLO",
        classificacao: "Diversos",
        situacao: "cancelada",
        totalCliente: "757.12",
        passageiros: passageiros[1],
      },
      { produto: "HOTEL EXEMPLO", classificacao: "Hotelaria", passageiros: passageiros[2] },
    ],
    [{}, { dataCancelamento: "2026-06-30T10:00:00" }],
  );
}

function linhaDe(texto: RegExp): HTMLElement {
  const linha = screen.getByRole("link", { name: texto }).closest("tr");
  if (linha === null) throw new Error("link fora da linha");
  return linha;
}

describe("TabelaVendas", () => {
  test("o caption, as colunas, os grupos na ordem e a cancelada no fim, fora do total", () => {
    const { reserva: r } = tresVendas();
    render(<TabelaVendas reserva={r} hoje={HOJE} />);
    const tabela = screen.getByRole("table", {
      name: "Vendas da reserva 90000001, agrupadas pela classificação do Stur",
    });
    expect(
      within(tabela)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(["Venda", "Fornecedor e serviço", "Emitida", "Cliente (R$)", "Receita (R$)"]);
    const grupos = within(tabela)
      .getAllByRole("rowheader")
      .map((c) => c.textContent);
    expect(grupos).toEqual(["Aéreo · 1 venda", "Hotelaria · 1 venda", "Cancelada · 1 venda"]);

    const cancelada = linhaDe(/^RAV EXEMPLO venda 2 de 3/);
    expect(within(cancelada).getByText("RAV EXEMPLO")).toHaveClass("line-through");
    expect(within(cancelada).getByText("Cancelada em 30/06")).toBeVisible();
    expect(within(cancelada).getByText("757,12")).toBeVisible();
    expect(within(cancelada).getByText("fora do total")).toBeVisible();

    const rodape = screen.getByText("Total das 2 vendas ativas").closest("tr");
    expect(rodape).toHaveTextContent("2.000,00");
    expect(rodape).toHaveTextContent("200,00");
    expect(rodape).toHaveTextContent("10,00%");
  });

  test("sem a coluna Passageiro quando as vendas têm o mesmo passageiro", () => {
    const { reserva: r } = tresVendas();
    render(<TabelaVendas reserva={r} hoje={HOJE} />);
    expect(screen.queryByRole("columnheader", { name: "Passageiro" })).toBeNull();
    expect(screen.queryByText("ANA EXEMPLO")).toBeNull();
  });

  test("a coluna Passageiro só aparece quando os passageiros diferem", () => {
    const { reserva: r } = tresVendas([["ANA EXEMPLO"], ["ANA EXEMPLO"], ["BIA EXEMPLO"]]);
    render(<TabelaVendas reserva={r} hoje={HOJE} />);
    expect(screen.getByRole("columnheader", { name: "Passageiro" })).toBeVisible();
    expect(within(linhaDe(/^HOTEL EXEMPLO venda 3 de 3/)).getByText("BIA EXEMPLO")).toBeVisible();
  });

  test("cada linha diz 'venda k de n'; a aberta, ' · aberta abaixo'", () => {
    const { reserva: r } = tresVendas();
    render(<TabelaVendas reserva={r} hoje={HOJE} aberta={1003} />);
    expect(screen.getByRole("link", { name: "BILHETE EXEMPLO venda 1 de 3" })).toBeVisible();
    const aberta = screen.getByRole("link", { name: "HOTEL EXEMPLO venda 3 de 3 · aberta abaixo" });
    expect(aberta).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText(/^Escolha uma venda/)).toBeNull();
  });

  test("sem venda aberta, a frase para escolher uma; com receita negativa, a frase dela", () => {
    const { reserva: r } = consultada([
      {},
      { totalCliente: "0.00", totalFornecedor: "490.00", margem: "-490.00" },
    ]);
    render(<TabelaVendas reserva={r} hoje={HOJE} />);
    expect(
      screen.getByText(
        "Escolha uma venda para abrir a conta, os serviços e os lançamentos dela logo abaixo da tabela.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("1 venda tem receita negativa: custo lançado sem cobrança ao cliente."),
    ).toBeVisible();
  });

  test("clicar faz push sem rolar para o topo e desce até a venda", async () => {
    const { reserva: r } = tresVendas();
    const rolar = vi.spyOn(Element.prototype, "scrollIntoView");
    const { rerender } = render(<TabelaVendas reserva={r} hoje={HOJE} />);
    await userEvent.click(screen.getByRole("link", { name: /^HOTEL EXEMPLO venda 3 de 3/ }));
    expect(roteador.push).toHaveBeenCalledWith("/reservas/90000001/vendas/1003", {
      scroll: false,
    });
    expect(rolar).not.toHaveBeenCalled();
    // A venda abre embaixo: a TelaReserva monta a seção e a rolagem acontece.
    rerender(
      <TelaReserva
        dados={{ ...tresVendas(), reserva: r }}
        vendaAberta={{ idreserva: 1003, estado: { estado: "carregando" }, aoTentar: () => {} }}
        consulta={SEM_CONSULTA}
      />,
    );
    expect(rolar).toHaveBeenCalledOnce();
    expect(rolar.mock.contexts[0]).toHaveAttribute("id", "venda-aberta");
  });
});

function comPainel(ui: ReactElement, painelAberto: boolean) {
  const nada = () => {};
  return (
    <PainelContexto
      value={{
        abrirServico: nada,
        abrirDadoCru: nada,
        trocarServico: nada,
        trocarParaDadoCru: nada,
        fecharPainel: nada,
        painelAberto,
      }}
    >
      {ui}
    </PainelContexto>
  );
}

describe("BarraDeTroca", () => {
  function barra(r: Reserva, aberta: number, painelAberto = false) {
    return render(
      comPainel(<BarraDeTroca reserva={r} hoje={HOJE} aberta={aberta} />, painelAberto),
    );
  }

  test("a venda, a linha dela, a próxima e as setas com os rótulos da IA 10.1", () => {
    const { reserva: r } = tresVendas();
    barra(r, 1001);
    expect(screen.getByText("Venda 1 de 3 · BILHETE EXEMPLO")).toBeVisible();
    expect(
      screen.getByText("ANA EXEMPLO · FORNECEDOR EXEMPLO · R$ 1.000,00 · receita R$ 100,00"),
    ).toBeVisible();
    expect(screen.getByText("próxima: venda 2, RAV EXEMPLO, cancelada")).toBeVisible();

    const anterior = screen.getByRole("button", { name: "Venda anterior" });
    expect(anterior).toHaveAttribute("aria-disabled", "true");
    expect(anterior).toHaveAttribute("title", "Esta é a primeira venda");
    const proxima = screen.getByRole("link", {
      name: "Próxima venda: venda 2 de 3, RAV EXEMPLO, cancelada",
    });
    expect(proxima).toHaveAttribute("href", "/reservas/90000001/vendas/1002");
    expect(proxima).toHaveAttribute("title", "Próxima venda (])");
    expect(proxima).toHaveAttribute("aria-keyshortcuts", "]");
    expect(screen.getByText("Ver as 3 vendas", { selector: "summary" })).toBeVisible();
  });

  test("a barra fica presa no topo; na cancelada, a data dela no lugar dos valores", () => {
    const { reserva: r } = tresVendas();
    const { container } = barra(r, 1002);
    expect(container.querySelector(".sticky")).not.toBeNull();
    expect(screen.getByText("ANA EXEMPLO · FORNECEDOR EXEMPLO · cancelada em 30/06")).toBeVisible();
  });

  test("na última venda, a seta da próxima fica desativada e não há 'próxima'", () => {
    const { reserva: r } = tresVendas();
    barra(r, 1003);
    const proxima = screen.getByRole("button", { name: "Próxima venda" });
    expect(proxima).toHaveAttribute("aria-disabled", "true");
    expect(proxima).toHaveAttribute("title", "Esta é a última venda");
    expect(screen.queryByText(/^próxima:/)).toBeNull();
    expect(
      screen.getByRole("link", { name: "Venda anterior: venda 2 de 3, RAV EXEMPLO, cancelada" }),
    ).toHaveAttribute("title", "Venda anterior ([)");
  });

  test("']' vai para a próxima e muda o endereço; '[' volta", async () => {
    definirEndereco("/reservas/90000001/vendas/1002");
    const { reserva: r } = tresVendas();
    barra(r, 1002);
    await userEvent.keyboard("]");
    expect(roteador.push).toHaveBeenLastCalledWith("/reservas/90000001/vendas/1003", {
      scroll: false,
    });
    await userEvent.keyboard("[[");
    expect(roteador.push).toHaveBeenLastCalledWith("/reservas/90000001/vendas/1001", {
      scroll: false,
    });
  });

  test("'[' na primeira não faz nada", async () => {
    const { reserva: r } = tresVendas();
    barra(r, 1001);
    await userEvent.keyboard("[[");
    expect(roteador.push).not.toHaveBeenCalled();
  });

  test("com um painel aberto, ']' não troca a venda", async () => {
    const { reserva: r } = tresVendas();
    barra(r, 1001, true);
    await userEvent.keyboard("]");
    expect(roteador.push).not.toHaveBeenCalled();
  });

  test("clicar na seta faz push sem rolar para o topo", async () => {
    const { reserva: r } = tresVendas();
    barra(r, 1001);
    await userEvent.click(screen.getByRole("link", { name: /^Próxima venda:/ }));
    expect(roteador.push).toHaveBeenCalledWith("/reservas/90000001/vendas/1002", {
      scroll: false,
    });
  });
});

describe("TelaReserva com uma venda aberta", () => {
  function aberta(estado: VendaAberta["estado"], aoTentar = () => {}): VendaAberta {
    return { idreserva: 1002, estado, aoTentar };
  }

  test("o cabeçalho da reserva, a faixa, a barra na venda e a venda com h2", () => {
    const dados = tresVendas();
    const venda = vendaConsultada({
      venda: vendaAgi({ idreserva: 1002, nomeproduto: "RAV EXEMPLO", status: "CANCELADA" }),
      reserva: dados.reserva,
      posicao: 2,
    });
    render(
      <TelaReserva
        dados={dados}
        vendaAberta={aberta({ estado: "pronta", dados: venda })}
        consulta={SEM_CONSULTA}
      />,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "Vendas desta reserva" })).toBeVisible();
    expect(screen.getByText("3 vendas, 1 cancelada")).toBeVisible();
    expect(screen.getByText("Venda 2 de 3 · RAV EXEMPLO")).toBeVisible();
    // A tabela vai recolhida na barra.
    expect(screen.getByText("Ver as 3 vendas").closest("details")).not.toHaveAttribute("open");
    const titulo = screen.getByRole("heading", { level: 2, name: "Venda 2 · RAV EXEMPLO" });
    expect(titulo).toHaveAttribute("data-titulo-venda");
    const cabecalho = titulo.closest('[data-anexo-secao="1"]');
    expect(cabecalho).not.toBeNull();
    expect(within(cabecalho as HTMLElement).getByText("Cancelada no Stur")).toBeVisible();
    expect(within(cabecalho as HTMLElement).getByText("Lançada direto no Stur")).toBeVisible();
    expect(cabecalho).toHaveTextContent("Rav exemplo nacional (Hotelaria)");
    expect(cabecalho).toHaveTextContent("Reserva 90000001 · CLIENTE EXEMPLO LTDA");
    expect(cabecalho).toHaveTextContent("Dados do Stur até 18/11, 09h30");
  });

  test("sem venda aberta: a tabela à vista, sem a barra", () => {
    render(<TelaReserva dados={tresVendas()} vendaAberta={null} consulta={SEM_CONSULTA} />);
    expect(screen.getByRole("table", { name: /^Vendas da reserva/ })).toBeVisible();
    expect(screen.queryByText("Ver as 3 vendas")).toBeNull();
    expect(screen.queryByRole("link", { name: /^Próxima venda/ })).toBeNull();
  });

  test("a venda que carrega: a barra já nela, a linha de status e o esqueleto", () => {
    const { container } = render(
      <TelaReserva
        dados={tresVendas()}
        vendaAberta={aberta({ estado: "carregando" })}
        consulta={SEM_CONSULTA}
      />,
    );
    expect(screen.getByText("Venda 2 de 3 · RAV EXEMPLO")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Consultando a venda 2 na API do Stur. Pode levar até 30 segundos.",
    );
    expect(container.querySelector("[data-esqueleto-venda]")).not.toBeNull();
  });

  test("12c: a barra na venda 2 e o erro com h2, Tentar de novo e Ver as vendas", async () => {
    const aoTentar = vi.fn();
    render(
      <TelaReserva
        dados={tresVendas()}
        vendaAberta={aberta({ estado: "erro", erro: new ErroDaConsulta("sem_resposta") }, aoTentar)}
        consulta={SEM_CONSULTA}
      />,
    );
    expect(screen.getByText("Venda 2 de 3 · RAV EXEMPLO")).toBeVisible();
    const alerta = screen.getByRole("alert");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(within(alerta).getByRole("heading", { level: 2 })).toHaveTextContent(
      "A API do Stur não respondeu",
    );
    expect(alerta).toHaveTextContent(
      "A venda 2 não abriu: a API do Stur não respondeu em 30 segundos. Tente de novo em alguns minutos.",
    );
    await userEvent.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
    expect(aoTentar).toHaveBeenCalledOnce();
    expect(within(alerta).getByRole("link", { name: "Alterar consulta" })).toHaveAttribute(
      "href",
      "/?reserva=90000001",
    );
    await userEvent.click(within(alerta).getByRole("button", { name: "Ver as 3 vendas" }));
    expect(roteador.push).toHaveBeenCalledWith("/reservas/90000001");
  });

  test("12c sem Tentar de novo: a mensagem não manda tentar", () => {
    render(
      <TelaReserva
        dados={tresVendas()}
        vendaAberta={aberta({ estado: "erro", erro: new ErroDaConsulta("acesso_recusado") })}
        consulta={SEM_CONSULTA}
      />,
    );
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent(
      "A venda 2 não abriu: a API do Stur recusou o acesso desta aplicação.",
    );
    expect(alerta).not.toHaveTextContent("Tente de novo");
    expect(within(alerta).queryByRole("button", { name: "Tentar de novo" })).toBeNull();
  });

  test("o Atualizar fica desativado enquanto a venda aberta carrega ou falhou", () => {
    const { rerender } = render(
      <TelaReserva
        dados={tresVendas()}
        vendaAberta={aberta({ estado: "carregando" })}
        consulta={SEM_CONSULTA}
      />,
    );
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeDisabled();
    rerender(
      <TelaReserva
        dados={tresVendas()}
        vendaAberta={aberta({ estado: "erro", erro: new ErroDaConsulta("sem_resposta") })}
        consulta={SEM_CONSULTA}
      />,
    );
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeDisabled();
    rerender(<TelaReserva dados={tresVendas()} vendaAberta={null} consulta={SEM_CONSULTA} />);
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeEnabled();
  });

  test("a linha da consulta mostra o consultadoEm da venda aberta, quando ele difere", () => {
    const dados = { ...tresVendas(), consultadoEm: "2026-11-24T10:00:00-03:00" };
    const venda = vendaConsultada({
      venda: vendaAgi({ idreserva: 1002 }),
      reserva: dados.reserva,
      posicao: 2,
      consultadoEm: "2026-11-24T11:15:00-03:00",
    });
    render(
      <TelaReserva
        dados={dados}
        vendaAberta={aberta({ estado: "pronta", dados: venda })}
        consulta={SEM_CONSULTA}
      />,
    );
    expect(screen.getByText(/^Consultado às 11h15/)).toBeVisible();
  });
});
