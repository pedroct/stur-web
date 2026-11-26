import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Financeiro } from "@/componentes/venda/Financeiro";
import { formatarCampo } from "@/componentes/venda/GrupoDeCampos";
import type { CalculosVenda, VendaAgi, VendaConsultada } from "@/contrato/tipos";
import { CAMPOS_ANEXO_B } from "@/lib/venda/anexo-b";
import { valorDoCampo } from "@/lib/venda/campos";
import { MOLDES } from "@/lib/venda/moldes";
import {
  calculos,
  lancamento,
  pagamento,
  recebimento,
  vendaAgi,
  vendaCheia,
  vendaConsultada,
} from "../../fabrica";

type Campos = { venda?: Partial<VendaAgi>; calculos?: Partial<CalculosVenda> };

/** `consultadoEm` é 24/11/2026 em Fortaleza: é o "hoje" das datas das linhas. */
function dados({ venda, calculos: c }: Campos = {}): VendaConsultada {
  return vendaConsultada({ venda: vendaAgi(venda), calculos: calculos(c) });
}

function cartao(nome: "Cliente" | "Fornecedor" | "Receita"): HTMLElement {
  const rotulo = screen.getByText(nome, { selector: "p" });
  const raiz = rotulo.parentElement;
  if (raiz === null) throw new Error("cartão sem raiz");
  return raiz;
}

test("três cartões, com o total, o título Financeiro e a marca da seção 2", () => {
  const { container } = render(<Financeiro dados={dados()} />);
  expect(screen.getByRole("heading", { level: 2, name: "Financeiro" })).toBeInTheDocument();
  expect(within(cartao("Cliente")).getByText("R$ 1.000,00")).toBeVisible();
  expect(within(cartao("Fornecedor")).getByText("R$ 900,00")).toBeVisible();
  expect(within(cartao("Receita")).getByText("R$ 100,00")).toBeVisible();
  expect(within(cartao("Receita")).getByText("10,00%")).toBeVisible();
  expect(container.querySelector('[data-anexo-secao="2"]')).not.toBeNull();
});

test("a faixa é superficie-sutil, lado a lado só a partir de 1.100 px", () => {
  render(<Financeiro dados={dados()} />);
  const faixa = cartao("Cliente").parentElement;
  expect(faixa).toHaveClass("bg-superficie-sutil", "min-[1100px]:grid-cols-3");
  expect(faixa).not.toHaveClass("grid-cols-3");
});

test("dentro da reserva, o Financeiro desce para h3", () => {
  render(<Financeiro dados={dados()} nivelBase={2} />);
  expect(screen.getByRole("heading", { level: 3, name: "Financeiro" })).toBeInTheDocument();
});

describe("saldos", () => {
  test("só os preenchidos entram, e zero conta", () => {
    render(
      <Financeiro
        dados={dados({
          venda: {
            totalRecebidoCliente: "0.00",
            totalAReceberCliente: "924.01",
            totalPagoFornec: "900.00",
            totalAReceberFornecedor: "0.00",
          },
        })}
      />,
    );
    const cliente = cartao("Cliente");
    expect(cliente).toHaveTextContent("Recebido R$ 0,00 · A receber R$ 924,01");
    expect(cliente).not.toHaveTextContent("Taxas administrativas");
    const fornecedor = cartao("Fornecedor");
    expect(fornecedor).toHaveTextContent("Pago R$ 900,00 · A receber R$ 0,00");
    expect(fornecedor).not.toHaveTextContent("A pagar");
  });

  test("com os sete preenchidos, a ordem é a do Anexo B", () => {
    render(
      <Financeiro
        dados={dados({
          venda: {
            totalRecebidoCliente: "1.00",
            totalAReceberCliente: "2.00",
            taxasAdministrativas: "3.00",
            totalPagoFornec: "4.00",
            totalAPagarFornec: "5.00",
            totalAReceberFornecedor: "6.00",
            totalRecebidoFornec: "7.00",
          },
        })}
      />,
    );
    expect(cartao("Cliente")).toHaveTextContent(
      "Recebido R$ 1,00 · A receber R$ 2,00 · Taxas administrativas R$ 3,00",
    );
    expect(cartao("Fornecedor")).toHaveTextContent(
      "Pago R$ 4,00 · A pagar R$ 5,00 · A receber R$ 6,00 · Recebido R$ 7,00",
    );
  });

  test("sem nenhum saldo, não há linha de pares", () => {
    render(<Financeiro dados={dados()} />);
    expect(cartao("Cliente")).not.toHaveTextContent("Recebido R$");
    expect(cartao("Cliente")).not.toHaveTextContent("A receber");
    expect(cartao("Fornecedor")).not.toHaveTextContent("Pago R$");
  });
});

describe("receita", () => {
  test("percentual nulo dá '% de lucro: não se aplica' e nenhum número de percentual", () => {
    render(<Financeiro dados={dados({ calculos: { percentualLucro: null } })} />);
    const receita = cartao("Receita");
    expect(receita).toHaveTextContent("% de lucro: não se aplica");
    expect(within(receita).queryByText(/^\d+,\d+%$/)).toBeNull();
  });

  test("margem negativa não leva cor de erro", () => {
    render(
      <Financeiro
        dados={dados({
          venda: { totalCliente: "0.00", margemLucroBruta: "-900.00" },
          calculos: { percentualLucro: null },
        })}
      />,
    );
    const receita = cartao("Receita");
    const valor = within(receita).getByText("R$ −900,00");
    expect(receita).toHaveTextContent("custo sem cobrança ao cliente; % de lucro: não se aplica");
    for (let e: HTMLElement | null = valor; e !== null && e !== receita; e = e.parentElement) {
      expect(e.className).not.toMatch(/erro/);
    }
    expect(receita.className).not.toMatch(/erro/);
  });

  test("sem caso de regra, sem frase", () => {
    render(<Financeiro dados={dados()} />);
    expect(cartao("Receita")).not.toHaveTextContent("custo");
    expect(cartao("Receita")).not.toHaveTextContent("lucro");
  });
});

describe("lançamentos", () => {
  test("cada lançamento tem o selo e o texto; o valor só quando o lado tem mais de um", () => {
    render(
      <Financeiro
        dados={dados({
          venda: {
            recebimentos: [
              recebimento({ valor: "224.00", descricaoForma: "CASH" }),
              recebimento({ valor: "776.00", descricaoForma: "FATURADO" }),
            ],
          },
          calculos: {
            recebimentos: [
              lancamento({
                indice: 0,
                valorExibido: "224.00",
                descricaoForma: "CASH",
                documentos: [{ tipo: "recibo", numero: "RC90000001" }],
              }),
              lancamento({
                indice: 1,
                valorExibido: "776.00",
                descricaoForma: "FATURADO",
                situacao: "em_aberto",
                vencido: true,
                vencimento: "2026-11-17 00:00:00",
                documentos: [{ tipo: "nota_debito", numero: "ND90000002" }],
              }),
            ],
          },
        })}
      />,
    );
    const cliente = cartao("Cliente");
    expect(within(cliente).getByText("Recebido")).toBeVisible();
    expect(within(cliente).getByText("cash, R$ 224,00, recibo RC90000001")).toBeVisible();
    expect(within(cliente).getByText("Em aberto, venceu em 17/11")).toBeVisible();
    expect(within(cliente).getByText("faturado, R$ 776,00, ND90000002")).toBeVisible();
    // O lado do fornecedor tem um lançamento só: sem valor na linha.
    expect(within(cartao("Fornecedor")).getByText("faturado")).toBeVisible();
  });

  test("reservada: 'Previsto' em todos os lançamentos, com o título ainda não gerado", () => {
    render(
      <Financeiro
        dados={dados({
          venda: { status: "RESERVADA" },
          calculos: {
            recebimentos: [lancamento({ situacao: "previsto", descricaoForma: "FATURADO" })],
            pagamentos: [lancamento({ situacao: "previsto", descricaoForma: "FATURADO" })],
          },
        })}
      />,
    );
    expect(screen.getAllByText("Previsto")).toHaveLength(2);
    expect(screen.getAllByText("faturado; título ainda não gerado")).toHaveLength(2);
  });

  test("a vencer leva o selo neutro com borda", () => {
    render(
      <Financeiro
        dados={dados({
          calculos: {
            recebimentos: [
              lancamento({ situacao: "em_aberto", vencimento: "2026-12-07 00:00:00" }),
            ],
          },
        })}
      />,
    );
    const selo = screen.getByText("A vencer em 07/12");
    expect(selo).toHaveClass("border-borda-controle");
    expect(selo.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  test("cartão repassado e crédito do fornecedor vão nos cartões certos", () => {
    render(
      <Financeiro
        dados={dados({
          venda: {
            nomefornec: "FORNECEDOR EXEMPLO",
            recebimentos: [
              recebimento({
                cartaoRepassadoAoFornecedor: true,
                numeroCartaoMascarado: "************1234",
                dtVencto: "2026-11-20 00:00:00",
              }),
            ],
            pagamentos: [pagamento({ valor: "150.00", descricaoForma: "CREDITO" })],
          },
          calculos: {
            recebimentos: [lancamento({ cartaoRepassado: true })],
            pagamentos: [
              lancamento({ ehCredito: true, valorExibido: "-150.00", descricaoForma: "CREDITO" }),
            ],
          },
        })}
      />,
    );
    const cliente = cartao("Cliente");
    expect(within(cliente).getByText("Cartão do cliente")).toBeVisible();
    expect(
      within(cliente).getByText("Cartão final 1234 repassado para FORNECEDOR EXEMPLO em 20/11"),
    ).toBeVisible();
    expect(
      within(cartao("Fornecedor")).getByText("Crédito de R$ 150,00 a receber do fornecedor"),
    ).toBeVisible();
    expect(within(cartao("Receita")).queryByText(/Crédito/)).toBeNull();
  });

  test("'Detalhes do lançamento' mostra o pagante e o que a linha não mostra", async () => {
    const { container } = render(
      <Financeiro
        dados={dados({
          venda: {
            recebimentos: [
              recebimento({
                valor: "1000.00",
                descricaoForma: "FATURADO",
                nomePagante: "PAGANTE EXEMPLO",
                valorLiquido: "980.00",
                vlrRetTarifa: "20.00",
              }),
            ],
          },
          calculos: { recebimentos: [lancamento({ descricaoForma: "FATURADO" })] },
        })}
      />,
    );
    const detalhes = within(cartao("Cliente")).getByText("Detalhes do lançamento");
    const raiz = detalhes.closest("details");
    expect(raiz).not.toHaveAttribute("open");
    expect(raiz).toHaveAttribute("data-anexo-secao", "6");
    await userEvent.click(detalhes);
    expect(raiz).toHaveAttribute("open");
    const dentro = within(raiz as HTMLElement);
    expect(dentro.getByText("Cliente Pagador").nextElementSibling).toHaveTextContent(
      "PAGANTE EXEMPLO",
    );
    expect(dentro.getByText("Valor líquido").nextElementSibling).toHaveTextContent("980,00");
    expect(dentro.getByText("Retenção: tarifa").nextElementSibling).toHaveTextContent("20,00");
    // Com um lançamento só, o valor não vai na linha: fica nos detalhes. A forma já está na linha.
    expect(dentro.getByText("Valor Recebido").nextElementSibling).toHaveTextContent("1.000,00");
    expect(dentro.queryByText("Forma")).toBeNull();
    // Um por lançamento: o do cliente e o do fornecedor.
    expect(container.querySelectorAll('details[data-anexo-secao="6"]')).toHaveLength(2);
  });

  test("os detalhes não repetem o que a linha já mostra", async () => {
    render(
      <Financeiro
        dados={dados({
          venda: {
            recebimentos: [
              recebimento({ valor: "224.00", descricaoForma: "CASH", nomePagante: "A" }),
              recebimento({ valor: "776.00", descricaoForma: "FATURADO", nomePagante: "B" }),
            ],
          },
          calculos: {
            recebimentos: [
              lancamento({ indice: 0, valorExibido: "224.00", descricaoForma: "CASH" }),
              lancamento({ indice: 1, valorExibido: "776.00", descricaoForma: "FATURADO" }),
            ],
          },
        })}
      />,
    );
    const resumos = within(cartao("Cliente")).getAllByText("Detalhes do lançamento");
    const primeiro = resumos[0]?.closest("details") as HTMLElement;
    await userEvent.click(resumos[0] as HTMLElement);
    expect(within(primeiro).getByText("Cliente Pagador").nextElementSibling).toHaveTextContent("A");
    expect(within(primeiro).queryByText("Forma")).toBeNull();
    expect(within(primeiro).queryByText("Valor Recebido")).toBeNull();
    const segundo = resumos[1]?.closest("details") as HTMLElement;
    expect(within(segundo).getByText("Cliente Pagador", { exact: true })).toBeInTheDocument();
  });

  test("lado sem lançamentos mostra a frase de vazio, e não uma lista vazia", () => {
    render(
      <Financeiro
        dados={dados({
          venda: { recebimentos: [], pagamentos: [] },
          calculos: { recebimentos: [], pagamentos: [] },
        })}
      />,
    );
    expect(
      within(cartao("Cliente")).getByText(
        "A API não trouxe nenhuma forma de recebimento nesta venda.",
      ),
    ).toBeVisible();
    expect(
      within(cartao("Fornecedor")).getByText(
        "A API não trouxe nenhuma forma de pagamento ao fornecedor nesta venda.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
  });

  test("o lançamento sem nenhum campo a mais não leva detalhes", () => {
    render(
      <Financeiro
        dados={dados({
          venda: {
            recebimentos: [recebimento({ valor: null, descricaoForma: "CASH", dtVencto: null })],
          },
          calculos: { recebimentos: [lancamento({ descricaoForma: "CASH", vencimento: null })] },
        })}
      />,
    );
    expect(within(cartao("Cliente")).queryByText("Detalhes do lançamento")).toBeNull();
  });
});

describe("rodapé do Financeiro", () => {
  test("a frase da situação e o grupo 'Situação no Stur' recolhido", () => {
    render(<Financeiro dados={dados({ venda: { situacaoFinanceiroRecebimento: "OK" } })} />);
    expect(
      screen.getByText(
        "Situação pelos totais da venda no Stur. Um valor em aberto pode já ter sido pago sem baixa.",
      ),
    ).toBeVisible();
    const grupo = screen.getByText("Situação no Stur", { selector: "summary" });
    expect(grupo.closest("details")).not.toHaveAttribute("open");
    expect(grupo.closest("details")).toHaveTextContent("Situação do recebimento");
  });

  test("na cancelada, a frase diz que o Stur zera o saldo", () => {
    render(<Financeiro dados={dados({ venda: { status: "CANCELADA" } })} />);
    expect(
      screen.getByText(
        "Situação pelos totais da venda no Stur. O Stur zera o saldo a receber e a pagar da venda cancelada.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/pago sem baixa/)).toBeNull();
  });

  test("sem campos da 'Situação no Stur' preenchidos, o grupo não aparece", () => {
    render(<Financeiro dados={dados()} />);
    expect(screen.queryByText("Situação no Stur")).toBeNull();
  });

  test("quando a conta fecha, diz que fecha", () => {
    render(<Financeiro dados={dados()} />);
    expect(screen.getByText("A soma dos serviços fecha com os totais da API.")).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("quando não fecha, o aviso traz uma linha por conta, com os números", () => {
    const base = calculos();
    render(
      <Financeiro
        dados={dados({
          calculos: {
            servicos: [...base.servicos, ...base.servicos],
            verificacao: {
              fecha: false,
              tolerancia: "0.02",
              contas: [
                {
                  conta: "cliente",
                  calculado: "1000.00",
                  api: "1000.00",
                  diferenca: "0.00",
                  fecha: true,
                },
                {
                  conta: "fornecedor",
                  calculado: "950.00",
                  api: "900.00",
                  diferenca: "50.00",
                  fecha: false,
                },
                {
                  conta: "margem",
                  calculado: "50.00",
                  api: "100.00",
                  diferenca: "-50.00",
                  fecha: false,
                },
              ],
            },
          },
        })}
      />,
    );
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("A soma dos 2 serviços não fecha com os totais da API");
    const itens = within(alerta).getAllByRole("listitem");
    expect(itens.map((i) => i.textContent)).toEqual([
      "Total do fornecedor: serviços R$ 950,00, API R$ 900,00, diferença R$ 50,00.",
      "Margem: serviços R$ 50,00, API R$ 100,00, diferença R$ −50,00.",
    ]);
    expect(screen.queryByText(/fecha com os totais da API\.$/)).toBeNull();
  });

  test("com um serviço só, o título do aviso fica no singular", () => {
    render(
      <Financeiro
        dados={dados({
          calculos: {
            verificacao: {
              fecha: false,
              tolerancia: "0.02",
              contas: [
                {
                  conta: "cliente",
                  calculado: "1000.00",
                  api: "990.00",
                  diferenca: "10.00",
                  fecha: false,
                },
              ],
            },
          },
        })}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A soma do serviço não fecha com os totais da API",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Total do cliente: serviços R$ 1.000,00, API R$ 990,00, diferença R$ 10,00.",
    );
  });
});

describe("molde do Financeiro e do lançamento", () => {
  function declarado(caminho: string) {
    return [...MOLDES.financeiro, ...MOLDES.lancamento].find((d) => d.caminho === caminho);
  }

  function esperado(caminho: string, dados: VendaConsultada, indices: number[]): string {
    const campo = CAMPOS_ANEXO_B.find((c) => c.caminho === caminho);
    const molde = declarado(caminho);
    if (campo === undefined || molde?.naTela.tipo !== "valor") throw new Error("molde");
    const formatado = formatarCampo(campo, valorDoCampo(dados.venda, caminho, indices));
    return molde.naTela.transformar?.(formatado) ?? formatado;
  }

  test.each([
    "hotelaria",
    "aereo",
    "diversos",
    "pacote",
  ] as const)("cada campo preenchido das seções 2 e 6 está na tela, como o molde declara (%s)", (classificacao) => {
    const cheia = vendaCheia(classificacao);
    render(<Financeiro dados={cheia} />);
    const secao2 = document.querySelector('[data-anexo-secao="2"]') as HTMLElement;
    const rotulos = (raiz: ParentNode) =>
      Array.from(raiz.querySelectorAll("dt")).map((dt) => dt.textContent);
    const dasSecoes6 = Array.from(document.querySelectorAll('[data-anexo-secao="6"]'));
    const rotulosDa6 = dasSecoes6.flatMap((raiz) => rotulos(raiz));
    expect(rotulosDa6.length).toBeGreaterThan(0);

    for (const campo of CAMPOS_ANEXO_B) {
      if (campo.conteiner || !campo.classes.includes(classificacao)) continue;
      if (campo.secao === 2) {
        const molde = declarado(campo.caminho);
        if (molde === undefined) {
          expect(rotulos(secao2), campo.caminho).toContain(campo.rotulo);
        } else {
          expect(secao2, campo.caminho).toHaveTextContent(esperado(campo.caminho, cheia, []));
        }
      }
      if (campo.secao === 6) {
        if (declarado(campo.caminho) !== undefined) {
          // O primeiro lançamento de cada lado mostra o campo na linha.
          const linha = dasSecoes6.map((e) => e.textContent).join("\n");
          expect(linha, campo.caminho).toContain(esperado(campo.caminho, cheia, [0]));
        } else {
          const vezes = rotulosDa6.filter((r) => r === campo.rotulo).length;
          expect(vezes, campo.caminho).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
});
