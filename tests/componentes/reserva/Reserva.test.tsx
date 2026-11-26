import { render, screen, within } from "@testing-library/react";
import { CabecalhoReserva } from "@/componentes/reserva/CabecalhoReserva";
import { FinanceiroReserva } from "@/componentes/reserva/FinanceiroReserva";
import { LancamentosReserva } from "@/componentes/reserva/LancamentosReserva";
import { TelaReserva } from "@/componentes/reserva/TelaReserva";
import type { LancamentoCalculado, ReservaConsultada, ResumoVenda } from "@/contrato/tipos";
import { lancamento, reserva, resumoVenda } from "../../fabrica";

const HOJE = "2026-11-24";
const SEM_CONSULTA = { atualizando: false, aoAtualizar: () => undefined, falha: null };

type Lados = { recebimentos?: LancamentoCalculado[]; pagamentos?: LancamentoCalculado[] };

/** Uma reserva consultada com lançamentos por venda e totais ajustados. */
function consultada(
  resumos: ResumoVenda[],
  lados: Lados[] = [],
  totais: Partial<ReservaConsultada["reserva"]["totais"]> = {},
): ReservaConsultada {
  const base = reserva(90000001, resumos);
  return {
    ...base,
    reserva: {
      ...base.reserva,
      vendas: base.reserva.vendas.map((v, i) => ({ ...v, ...lados[i] })),
      totais: { ...base.reserva.totais, ...totais },
    },
  };
}

function dezVendas(): ReservaConsultada {
  const emissoes = ["2026-06-09", "2026-06-09", "2026-06-30", "2026-11-10"];
  return consultada(
    Array.from({ length: 10 }, (_, i) =>
      resumoVenda({
        idreserva: 1001 + i,
        situacao: i === 1 ? "cancelada" : "fechada",
        dataEmissao: `${emissoes[Math.min(i, 3)]}T10:00:00`,
        passageiros: [i < 8 ? "ANA EXEMPLO" : "BIA EXEMPLO"],
      }),
    ),
    [],
    { aReceberCliente: "3591.91" },
  );
}

function pagamentosCash(n: number): LancamentoCalculado[] {
  return Array.from({ length: n }, (_, i) =>
    lancamento({
      indice: i,
      valorExibido: "10.00",
      descricaoForma: "Cash",
      vencimento: "2026-05-28 00:00:00",
      documentos: [{ tipo: "outro", numero: `OS${9000001 + i}` }],
    }),
  );
}

describe("CabecalhoReserva", () => {
  test("reserva, selos, h1 com o cliente, subtítulo e as frases das datas", () => {
    const dados = dezVendas();
    render(<CabecalhoReserva reserva={dados.reserva} hoje={HOJE} />);
    expect(screen.getByText("Reserva 90000001 · 10 vendas")).toBeVisible();
    expect(screen.getByText("9 fechadas no Stur")).toBeVisible();
    expect(screen.getByText("1 cancelada")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: "CLIENTE EXEMPLO LTDA" })).toBeVisible();
    expect(screen.getByText(/^2 passageiros · hotelaria$/)).toBeVisible();
    expect(
      screen.getByText("As 10 vendas foram emitidas em três datas: 09/06, 30/06 e 10/11/2026."),
    ).toBeVisible();
  });

  test("sem cliente em nenhuma venda, o h1 é a reserva", () => {
    const dados = consultada([
      resumoVenda({ idreserva: 1001, cliente: null }),
      resumoVenda({ idreserva: 1002, cliente: null }),
    ]);
    render(<CabecalhoReserva reserva={dados.reserva} hoje={HOJE} />);
    expect(screen.getByRole("heading", { level: 1, name: "Reserva 90000001" })).toBeVisible();
  });
});

describe("FinanceiroReserva", () => {
  test("com canceladas: título das ativas, três cartões e a faixa de superfície sutil", () => {
    const { reserva: r } = dezVendas();
    render(<FinanceiroReserva reserva={r} hoje={HOJE} vendaAberta={false} />);
    const titulo = screen.getByRole("heading", {
      level: 2,
      name: "Financeiro das 9 vendas ativas",
    });
    expect(titulo.parentElement).toHaveClass("bg-superficie-sutil");
    expect(screen.getByText("Cliente · 9 vendas ativas")).toBeVisible();
    expect(screen.getByText("R$ 3.591,91 a receber")).toBeVisible();
    expect(screen.getByText("nada a pagar")).toBeVisible();
    expect(screen.getByText("somada das 9 vendas ativas")).toBeVisible();
  });

  test("sem canceladas: 'Financeiro da reserva'", () => {
    const { reserva: r } = consultada([
      resumoVenda({ idreserva: 1001 }),
      resumoVenda({ idreserva: 1002 }),
    ]);
    render(<FinanceiroReserva reserva={r} hoje={HOJE} vendaAberta={false} />);
    expect(screen.getByRole("heading", { level: 2, name: "Financeiro da reserva" })).toBeVisible();
  });

  test("o percentual de lucro sai quando é nulo", () => {
    const { reserva: r } = consultada(
      [resumoVenda({ idreserva: 1001 }), resumoVenda({ idreserva: 1002 })],
      [],
      { percentualLucro: "16.1800", margem: "200.00" },
    );
    render(<FinanceiroReserva reserva={r} hoje={HOJE} vendaAberta={false} />);
    expect(screen.getByText("R$ 200,00")).toBeVisible();
    expect(screen.getByText("16,18%")).toBeVisible();
  });
});

describe("LancamentosReserva", () => {
  const dados = consultada(
    [resumoVenda({ idreserva: 1001 }), resumoVenda({ idreserva: 1002 })],
    [
      {
        recebimentos: [
          lancamento({
            valorExibido: "150.00",
            documentos: [
              { tipo: "outro", numero: "FT9000001" },
              { tipo: "nota_debito", numero: "ND9000001" },
            ],
          }),
        ],
        pagamentos: [
          ...pagamentosCash(14),
          lancamento({
            indice: 14,
            ehCredito: true,
            valorExibido: "-13.00",
            situacao: "em_aberto",
            vencido: true,
            vencimento: "2026-05-29 00:00:00",
            documentos: [{ tipo: "outro", numero: "OS9000015" }],
          }),
        ],
      },
    ],
    { totalCliente: "150.00", recebidoCliente: "150.00", pagoFornecedor: "140.00" },
  );

  function linhaDe(texto: string): HTMLElement {
    const celula = screen.getByRole("cell", { name: texto });
    const linha = celula.closest("tr");
    if (linha === null) throw new Error("célula sem linha");
    return linha;
  }

  test("a tabela tem as cinco colunas e uma linha por lançamento agrupado", () => {
    render(<LancamentosReserva reserva={dados.reserva} hoje={HOJE} vendaAberta={false} />);
    const tabela = screen.getByRole("table");
    expect(
      within(tabela)
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(["Lançamento", "Documento", "Vencimento", "Valor (R$)", "Situação"]);
    expect(within(tabela).getAllByRole("row")).toHaveLength(4);
  });

  test("a linha do cliente, a das 14 ordens somadas e o crédito com o valor positivo", () => {
    render(<LancamentosReserva reserva={dados.reserva} hoje={HOJE} vendaAberta={false} />);
    const cliente = linhaDe("A receber do cliente, faturado (venda 1)");
    expect(within(cliente).getByText("FT9000001 · ND9000001")).toBeVisible();
    expect(within(cliente).getByText("150,00")).toBeVisible();
    expect(within(cliente).getByText("Recebido")).toBeVisible();

    const ordens = linhaDe("A pagar a FORNECEDOR EXEMPLO, cash (venda 1)");
    expect(within(ordens).getByText("OS9000001 a OS9000014, 14 ordens")).toBeVisible();
    expect(within(ordens).getByText("28/05/2026")).toBeVisible();
    expect(within(ordens).getByText("140,00")).toBeVisible();
    expect(within(ordens).getByText("Pago")).toBeVisible();

    const credito = linhaDe("Crédito do fornecedor (venda 1)");
    expect(within(credito).getByText("13,00")).toBeVisible();
    expect(within(credito).getByText("Em aberto, venceu em 29/05")).toBeVisible();
  });

  test("a frase de baixo usa os totais da reserva", () => {
    render(<LancamentosReserva reserva={dados.reserva} hoje={HOJE} vendaAberta={false} />);
    expect(
      screen.getByText(/^A situação vem dos totais das vendas: recebido R\$ 150,00 de R\$ 150,00/),
    ).toBeVisible();
  });

  test("sem venda aberta a tabela está aberta; com venda aberta, recolhida", () => {
    const { rerender } = render(
      <LancamentosReserva reserva={dados.reserva} hoje={HOJE} vendaAberta={false} />,
    );
    const aberta = screen.getByText("Recebimentos e pagamentos da reserva");
    expect(aberta.closest("details")).toHaveAttribute("open");
    expect(screen.getByRole("table")).toBeVisible();

    rerender(<LancamentosReserva reserva={dados.reserva} hoje={HOJE} vendaAberta />);
    const recolhida = screen.getByText("Ver recebimentos e pagamentos da reserva");
    expect(recolhida.closest("details")).not.toHaveAttribute("open");
    expect(screen.queryByRole("table")).not.toBeVisible();
  });

  test("sem lançamento nenhum: a frase do vazio, sem tabela", () => {
    const vazia = consultada([resumoVenda({ idreserva: 1001 }), resumoVenda({ idreserva: 1002 })]);
    render(<LancamentosReserva reserva={vazia.reserva} hoje={HOJE} vendaAberta={false} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen.getByText(
        "A API não trouxe nenhuma forma de recebimento nem de pagamento nesta reserva.",
      ),
    ).toBeVisible();
  });
});

describe("TelaReserva", () => {
  test("sem venda aberta: cabeçalho, Financeiro com a tabela aberta e a lista da casca", () => {
    render(<TelaReserva dados={dezVendas()} vendaAberta={null} consulta={SEM_CONSULTA} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("CLIENTE EXEMPLO LTDA");
    expect(screen.getByRole("heading", { level: 2, name: /^Financeiro das 9/ })).toBeVisible();
    expect(
      screen.getByText("Recebimentos e pagamentos da reserva").closest("details"),
    ).toHaveAttribute("open");
    expect(screen.getByRole("link", { name: /^Venda 1 de 10/ })).toBeVisible();
  });

  test("com venda aberta: a tabela de lançamentos fica recolhida", () => {
    render(
      <TelaReserva
        dados={dezVendas()}
        vendaAberta={{
          idreserva: 1001,
          estado: { estado: "carregando" },
          aoTentar: () => undefined,
        }}
        consulta={SEM_CONSULTA}
      />,
    );
    expect(
      screen.getByText("Ver recebimentos e pagamentos da reserva").closest("details"),
    ).not.toHaveAttribute("open");
  });
});
