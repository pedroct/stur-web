import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CabecalhoVenda } from "@/componentes/venda/CabecalhoVenda";
import { Incentivo } from "@/componentes/venda/Incentivo";
import { Venda } from "@/componentes/venda/Venda";
import type { CalculosVenda, VendaAgi, VendaConsultada } from "@/contrato/tipos";
import {
  calculos,
  contaServico,
  lancamento,
  pagamento,
  servicoAgi,
  vendaAgi,
  vendaConsultada,
} from "../../fabrica";

const CONSULTA = { atualizando: false, aoAtualizar: () => {}, falha: null };

type Campos = { venda?: Partial<VendaAgi>; calculos?: Partial<CalculosVenda> };

/** `consultadoEm` é 24/11/2026 em Fortaleza: é o "hoje" das datas. */
function incentivo({ venda, calculos: c }: Campos = {}): VendaConsultada {
  return vendaConsultada({
    venda: vendaAgi({
      nomeproduto: "INCENTIVO",
      classificacaoproduto: "Diversos",
      categoriaproduto: "Nacional",
      nomefornec: "FORNECEDOR EXEMPLO",
      nomecliente: "CLIENTE EXEMPLO LTDA",
      dtemissao: "2026-11-11 00:00:00",
      totalCliente: "0.00",
      totalFornecedor: "-3698.14",
      margemLucroBruta: "3698.14",
      detalheItem: [
        servicoAgi({
          descricao: "INCENTIVO EXEMPLO/25",
          observacao: "REF. AO INCENTIVO EXEMPLO, VALOR 3698,14",
          numeroOS: "OS90000001",
          vlrTarifaTotalp: "3698.14",
          dtInicio: "2024-12-12 00:00:00",
          nomePax: "INCENTIVO EXEMPLO",
          nomePaxCompleto: "INCENTIVO",
        }),
      ],
      recebimentos: [],
      pagamentos: [pagamento({ valor: "3698.14", descricaoForma: "Crédito" })],
      ...venda,
    }),
    calculos: calculos({
      tipo: "incentivo",
      servicos: [contaServico()],
      totaisServicos: {
        cliente: "0.00",
        fornecedor: "-3698.14",
        margem: "3698.14",
        percentualLucro: null,
      },
      percentualLucro: null,
      recebimentos: [],
      pagamentos: [
        lancamento({
          valorExibido: "-3698.14",
          ehCredito: true,
          situacao: "em_aberto",
          vencido: true,
          vencimento: "2026-11-11 00:00:00",
          descricaoForma: "Crédito",
          documentos: [{ tipo: "recibo", numero: "RC90000001" }],
        }),
      ],
      ...c,
    }),
  });
}

function cartao(nome: "Valor do incentivo" | "Recebimento" | "Referência no Stur"): HTMLElement {
  const rotulo = screen.getByText(nome, { selector: "p" });
  const raiz = rotulo.parentElement;
  if (raiz === null) throw new Error("cartão sem raiz");
  return raiz;
}

describe("cabeçalho do incentivo", () => {
  test("o fornecedor é o h1, e o selo do incentivo vem antes da situação", () => {
    render(<CabecalhoVenda dados={incentivo()} consulta={CONSULTA} />);
    expect(screen.getByRole("heading", { level: 1, name: "FORNECEDOR EXEMPLO" })).toBeVisible();
    const incentivoDeFornecedor = screen.getByText("Incentivo de fornecedor");
    const situacao = screen.getByText("Fechada no Stur");
    expect(
      incentivoDeFornecedor.compareDocumentPosition(situacao) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(incentivoDeFornecedor.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  test("sem selo de estado, com o subtítulo e a frase de apoio do incentivo", () => {
    render(
      <CabecalhoVenda
        dados={incentivo({
          calculos: {
            estadoServico: {
              estado: "concluido",
              inicio: "2026-11-20",
              fim: "2026-11-22",
              base: "inicio_termino",
            },
          },
        })}
        consulta={CONSULTA}
      />,
    );
    expect(screen.queryByText(/concluíd/)).toBeNull();
    expect(screen.queryByText(/A situação d/)).toBeNull();
    expect(
      screen.getByText("Incentivo pago pelo fornecedor à A3 · lançado em 11/11/2026"),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Não há venda a cliente: o Stur registra a própria CLIENTE EXEMPLO LTDA como cliente.",
      ),
    ).toBeVisible();
  });

  test("mantém o foco do título e a marca da seção 1", () => {
    const { container } = render(<CabecalhoVenda dados={incentivo()} consulta={CONSULTA} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveAttribute("data-titulo-venda");
    expect(container.querySelector('[data-anexo-secao="1"]')).not.toBeNull();
  });

  test("sem cliente, a frase diz só que não há venda a cliente; sem fornecedor, o h1 é a reserva", () => {
    render(
      <CabecalhoVenda
        dados={incentivo({ venda: { nomecliente: null, nomefornec: null, dtemissao: null } })}
        consulta={CONSULTA}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Reserva 90000001" })).toBeVisible();
    expect(screen.getByText("Incentivo pago pelo fornecedor à A3")).toBeVisible();
    expect(screen.getByText("Não há venda a cliente.")).toBeVisible();
  });

  test("uma venda que não é incentivo não ganha o selo", () => {
    render(<CabecalhoVenda dados={vendaConsultada()} consulta={CONSULTA} />);
    expect(screen.queryByText("Incentivo de fornecedor")).toBeNull();
  });
});

describe("cartões", () => {
  test("três cartões: valor, recebimento e referência", () => {
    const { container } = render(<Incentivo dados={incentivo()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Incentivo" })).toBeInTheDocument();
    expect(within(cartao("Valor do incentivo")).getByText("R$ 3.698,14")).toBeVisible();
    expect(
      within(cartao("Valor do incentivo")).getByText("receita da A3, sem custo"),
    ).toBeVisible();
    const recebimento = cartao("Recebimento");
    expect(within(recebimento).getByText("R$ 3.698,14")).toBeVisible();
    expect(within(recebimento).getByText("Em aberto, venceu em 11/11")).toBeVisible();
    expect(recebimento).toHaveTextContent("crédito com FORNECEDOR EXEMPLO, recibo RC90000001");
    const referencia = cartao("Referência no Stur");
    expect(within(referencia).getByText("INCENTIVO EXEMPLO/25")).toBeVisible();
    expect(
      within(referencia).getByText('"REF. AO INCENTIVO EXEMPLO, VALOR 3698,14"'),
    ).toBeVisible();
    expect(container.querySelector('[data-anexo-secao="2"]')).not.toBeNull();
  });

  test("o selo do recebimento tem ícone e palavra", () => {
    render(<Incentivo dados={incentivo()} />);
    expect(
      within(cartao("Recebimento")).getByText("Em aberto, venceu em 11/11").querySelector("svg"),
    ).toHaveAttribute("aria-hidden", "true");
  });

  test("crédito a vencer e crédito recebido", () => {
    const a = render(
      <Incentivo
        dados={incentivo({
          calculos: {
            pagamentos: [
              lancamento({
                ehCredito: true,
                situacao: "em_aberto",
                vencido: false,
                vencimento: "2026-12-05 00:00:00",
              }),
            ],
          },
        })}
      />,
    );
    expect(within(cartao("Recebimento")).getByText("A vencer em 05/12")).toBeVisible();
    a.unmount();
    render(
      <Incentivo
        dados={incentivo({
          calculos: {
            pagamentos: [lancamento({ ehCredito: true, situacao: "sem_saldo" })],
          },
        })}
      />,
    );
    expect(within(cartao("Recebimento")).getByText("Recebido")).toBeVisible();
    expect(cartao("Recebimento")).toHaveTextContent("crédito com FORNECEDOR EXEMPLO");
    expect(cartao("Recebimento")).not.toHaveTextContent("crédito com FORNECEDOR EXEMPLO,");
  });

  test("sem crédito, vale o primeiro pagamento", () => {
    render(
      <Incentivo
        dados={incentivo({
          calculos: {
            pagamentos: [
              lancamento({
                ehCredito: false,
                situacao: "em_aberto",
                vencido: false,
                vencimento: "2026-12-05 00:00:00",
                descricaoForma: "Faturado",
              }),
            ],
          },
        })}
      />,
    );
    const recebimento = cartao("Recebimento");
    expect(within(recebimento).getByText("A vencer em 05/12")).toBeVisible();
    expect(recebimento).toHaveTextContent("faturado");
  });

  test("sem pagamento nenhum, o cartão diz que a API não trouxe a forma", () => {
    render(
      <Incentivo dados={incentivo({ venda: { pagamentos: [] }, calculos: { pagamentos: [] } })} />,
    );
    expect(cartao("Recebimento")).toHaveTextContent(
      "A API não trouxe nenhuma forma de pagamento ao fornecedor nesta venda.",
    );
  });

  test("referência sem descrição e sem observação não desenha texto vazio", () => {
    render(
      <Incentivo
        dados={incentivo({
          venda: { detalheItem: [servicoAgi({ descricao: null, observacao: null })] },
        })}
      />,
    );
    const referencia = cartao("Referência no Stur");
    expect(referencia).toHaveTextContent(/^Referência no Stur—$/);
    expect(referencia).not.toHaveTextContent('"');
  });

  test("a frase da situação pelos totais, e a da venda cancelada", () => {
    const a = render(<Incentivo dados={incentivo()} />);
    expect(
      screen.getByText(
        "Situação pelos totais da venda no Stur. Um valor em aberto pode já ter sido pago sem baixa.",
      ),
    ).toBeVisible();
    a.unmount();
    render(<Incentivo dados={incentivo({ venda: { status: "CANCELADA" } })} />);
    expect(
      screen.getByText(
        "Situação pelos totais da venda no Stur. O Stur zera o saldo a receber e a pagar da venda cancelada.",
      ),
    ).toBeVisible();
  });
});

describe("Como o Stur registra", () => {
  function secaoDaConta(): HTMLElement {
    const resumo = screen.getByText("Como o Stur registra");
    const detalhes = resumo.closest("details");
    if (detalhes === null) throw new Error("sem details");
    return detalhes;
  }

  test("vem aberto, com os quatro pares e a frase de que a conta fecha", () => {
    render(<Incentivo dados={incentivo()} />);
    const detalhes = secaoDaConta();
    expect(detalhes).toHaveAttribute("open");
    expect(detalhes).toHaveTextContent("Total do cliente0,00não há venda a cliente");
    expect(detalhes).toHaveTextContent(
      "Total do fornecedor−3.698,14acordo com o fornecedor, que vira receita",
    );
    expect(detalhes).toHaveTextContent("Margem3.698,14% de lucro: não se aplica");
    expect(detalhes).toHaveTextContent(
      "Crédito a receber do fornecedor3.698,14no Stur, aparece em pagamentos ao fornecedor, com sinal negativo; vencimento 11/11/2026",
    );
    expect(
      within(detalhes).getByText(
        "A conta fecha com os totais da API do Stur: o total do fornecedor é o acordo com sinal negativo.",
      ),
    ).toBeVisible();
  });

  test("com a verificação que não fecha, a frase some", () => {
    render(
      <Incentivo
        dados={incentivo({
          calculos: {
            verificacao: {
              fecha: false,
              tolerancia: "0.02",
              contas: [
                {
                  conta: "margem",
                  calculado: "3000.00",
                  api: "3698.14",
                  diferenca: "-698.14",
                  fecha: false,
                },
              ],
            },
          },
        })}
      />,
    );
    expect(screen.queryByText(/A conta fecha/)).toBeNull();
    expect(secaoDaConta()).toHaveTextContent("Total do fornecedor−3.698,14");
  });

  test("com percentual de lucro, o par da margem o mostra", () => {
    render(<Incentivo dados={incentivo({ calculos: { percentualLucro: "100.00" } })} />);
    expect(secaoDaConta()).not.toHaveTextContent("% de lucro: não se aplica");
    expect(secaoDaConta()).toHaveTextContent("Margem3.698,14100,00%");
  });

  test("sem crédito, o quarto par não aparece", () => {
    render(
      <Incentivo
        dados={incentivo({
          calculos: { pagamentos: [lancamento({ ehCredito: false })] },
        })}
      />,
    );
    expect(secaoDaConta()).not.toHaveTextContent("Crédito a receber do fornecedor");
  });
});

describe("Serviço lançado", () => {
  test("os pares do serviço e os campos de datas e nome recolhidos", async () => {
    const { container } = render(<Incentivo dados={incentivo()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Serviço lançado" })).toBeVisible();
    const secao = screen.getByRole("heading", { name: "Serviço lançado" }).closest("section");
    if (secao === null) throw new Error("sem seção");
    for (const [rotulo, valor] of [
      ["Descrição", "INCENTIVO EXEMPLO/25"],
      ["Observação", "REF. AO INCENTIVO EXEMPLO, VALOR 3698,14"],
      ["Acordo com o fornecedor", "3.698,14"],
      ["Ordem de serviço", "OS90000001"],
    ] as const) {
      const dt = within(secao).getByText(rotulo, { selector: "dt" });
      expect(dt.nextElementSibling).toHaveTextContent(valor);
    }
    const resumo = within(secao).getByText("Datas e nome no serviço");
    const detalhes = resumo.closest("details");
    expect(detalhes).not.toHaveAttribute("open");
    await userEvent.click(resumo);
    expect(detalhes).toHaveAttribute("open");
    expect(within(detalhes as HTMLElement).getByText("12/12/2024")).toBeVisible();
    expect(within(detalhes as HTMLElement).getByText("INCENTIVO EXEMPLO")).toBeVisible();
    expect(screen.queryByText("Outros campos do serviço")).toBeNull();
    expect(container.querySelector('[data-anexo-secao="3"]')).not.toBeNull();
    expect(container.querySelector('[data-anexo-secao="4"]')).not.toBeNull();
    expect(container.querySelector('[data-anexo-secao="5"]')).not.toBeNull();
  });

  test("os campos que o molde não declara entram pelo grupo, como pares e recolhidos", async () => {
    render(
      <Incentivo
        dados={incentivo({
          venda: {
            detalheItem: [
              servicoAgi({
                descricao: "INCENTIVO EXEMPLO/25",
                vlrComissaoEmissor: "10.00",
                confirmadopor: "EMISSOR EXEMPLO",
                vlrTxFaturamento: "5.00",
              }),
            ],
          },
        })}
      />,
    );
    expect(screen.getByText("Confirmado por", { selector: "dt" })).toBeVisible();
    // Do grupo recolhido, o nome é o do Anexo B.
    expect(screen.getByText("Repasses e faturamento")).toBeInTheDocument();
    expect(screen.queryByText("Outros campos")).toBeNull();
  });

  test("dentro da reserva, os títulos descem um nível", () => {
    render(<Incentivo dados={incentivo()} nivelBase={2} />);
    expect(screen.getByRole("heading", { level: 3, name: "Incentivo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Serviço lançado" })).toBeVisible();
  });

  test("os campos de saldo do Anexo B não somem", () => {
    render(
      <Incentivo
        dados={incentivo({
          venda: { totalAReceberFornecedor: "3698.14", taxasAdministrativas: "0.00" },
        })}
      />,
    );
    expect(screen.getByText("A receber do fornecedor", { selector: "dt" })).toBeVisible();
    expect(screen.getByText("Taxas administrativas", { selector: "dt" })).toBeVisible();
  });
});

describe("Venda de incentivo", () => {
  test("troca o Financeiro e a conta pelo Incentivo", () => {
    render(<Venda dados={incentivo()} naReserva={false} nivelBase={1} consulta={CONSULTA} />);
    expect(screen.getByRole("heading", { level: 2, name: "Incentivo" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Financeiro" })).toBeNull();
    expect(screen.queryByRole("heading", { name: /^Conta d/ })).toBeNull();
    expect(screen.getByText("Como o Stur registra")).toBeVisible();
    expect(screen.queryByText("Custo do fornecedor")).toBeNull();
    expect(screen.queryByText("Cliente", { selector: "p" })).toBeNull();
    expect(screen.queryByText("Fornecedor", { selector: "p" })).toBeNull();
    expect(screen.getByText("Incentivo de fornecedor")).toBeVisible();
  });

  test("a venda que não é incentivo continua com o Financeiro", () => {
    render(<Venda dados={vendaConsultada()} naReserva={false} nivelBase={1} consulta={CONSULTA} />);
    expect(screen.getByRole("heading", { level: 2, name: "Financeiro" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Incentivo" })).toBeNull();
  });
});
