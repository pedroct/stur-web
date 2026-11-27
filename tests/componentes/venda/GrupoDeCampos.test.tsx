import { render, screen } from "@testing-library/react";
import { formatarCampo, GrupoDeCampos } from "@/componentes/venda/GrupoDeCampos";
import { CAMPOS_ANEXO_B, type CampoAnexo } from "@/lib/venda/anexo-b";
import { calculos, contaServico, recebimento, servicoAgi, vendaAgi } from "../../fabrica";

function campos(...caminhos: string[]): CampoAnexo[] {
  return caminhos.map((caminho) => {
    const campo = CAMPOS_ANEXO_B.find((c) => c.caminho === caminho);
    if (campo === undefined) throw new Error(`Campo fora do Anexo B: ${caminho}`);
    return campo;
  });
}

test("mostra o rótulo e o valor dos campos preenchidos e deixa de fora os vazios", () => {
  render(
    <GrupoDeCampos
      titulo="Observações"
      nivel={3}
      campos={campos("detalheItem[].observacao", "detalheItem[].observacaoInterna")}
      venda={vendaAgi({ detalheItem: [servicoAgi({ observacao: "Chegada tarde" })] })}
      indices={[0]}
    />,
  );
  expect(screen.getByRole("heading", { level: 3, name: "Observações" })).toBeVisible();
  expect(screen.getByText("Observação").nextElementSibling).toHaveTextContent("Chegada tarde");
  expect(screen.getAllByRole("term")).toHaveLength(1);
  expect(screen.queryByText("Observação interna")).toBeNull();
});

test("sem nenhum campo preenchido não renderiza nada, nem o título", () => {
  const { container } = render(
    <GrupoDeCampos
      titulo="Observações"
      nivel={3}
      campos={campos("detalheItem[].observacao", "detalheItem[].observacaoInterna")}
      venda={vendaAgi({ detalheItem: [servicoAgi()] })}
      indices={[0]}
    />,
  );
  expect(container).toBeEmptyDOMElement();
});

test("zero e falso contam como preenchidos; a data vazia do Stur não", () => {
  render(
    <GrupoDeCampos
      titulo="Situação"
      nivel={3}
      campos={campos(
        "totalAPagarCliente",
        "recebimentos[].cartaoRepassadoAoFornecedor",
        "dtalteracaovinculado",
      )}
      venda={vendaAgi({
        totalAPagarCliente: "0.00",
        dtalteracaovinculado: "1899-12-30T10:00:00",
        recebimentos: [recebimento({ cartaoRepassadoAoFornecedor: false })],
      })}
      indices={[0]}
    />,
  );
  expect(screen.getByText("A pagar ao cliente").nextElementSibling).toHaveTextContent("0,00");
  expect(screen.getByText("Repassado ao Fornecedor").nextElementSibling).toHaveTextContent("Não");
  expect(screen.queryByText("API com dados até")).toBeNull();
});

test("formata cada tipo de campo pelo formato do Anexo B", () => {
  render(
    <GrupoDeCampos
      titulo="Formatos"
      nivel={3}
      campos={campos(
        "totalCliente",
        "recebimentos[].cartaoRepassadoAoFornecedor",
        "recebimentos[].vlrCambio",
        "recebimentos[].dtVencto",
        "dtalteracaovinculado",
        "detalheItem[].percComisRecebida",
        "detalheItem[].horaRetirada",
        "detalheItem[].qtdeDiarias",
        "camposGerenciais",
      )}
      venda={vendaAgi({
        totalCliente: "1234.50",
        dtalteracaovinculado: "2026-11-20 10:30:00",
        recebimentos: [recebimento({ cartaoRepassadoAoFornecedor: true, vlrCambio: "5.17" })],
        detalheItem: [
          servicoAgi({
            percComisRecebida: "13.0000",
            horaRetirada: "1899-12-30T16:59:00",
            qtdeDiarias: 3,
          }),
        ],
        camposGerenciais: ["Alfa", "Beta"],
      })}
      indices={[0]}
    />,
  );
  const valorDe = (rotulo: string) => screen.getByText(rotulo).nextElementSibling;
  expect(valorDe("Total Cliente")).toHaveTextContent(/^1\.234,50$/);
  expect(valorDe("Repassado ao Fornecedor")).toHaveTextContent("Sim");
  expect(valorDe("Câmbio")).toHaveTextContent("5,1700");
  expect(valorDe("Vencimento")).toHaveTextContent("20/11/2026");
  expect(valorDe("API com dados até")).toHaveTextContent("20/11/2026 · 10h30");
  expect(valorDe("Hora de retirada")).toHaveTextContent("16h59");
  expect(valorDe("Diárias")).toHaveTextContent("3");
  expect(valorDe("Campos Gerenciais")).toHaveTextContent("Alfa; Beta");
});

test("uma lista a mais que os índices vira um bloco por item", () => {
  const { container } = render(
    <GrupoDeCampos
      titulo="Apartamentos"
      nivel={3}
      campos={campos(
        "detalheItem[].apartamentos[].qtde",
        "detalheItem[].apartamentos[].tipoApartamento",
      )}
      venda={vendaAgi({
        detalheItem: [
          servicoAgi({
            apartamentos: [
              { qtde: 2, tipoApartamento: "SUITE A" },
              { qtde: 1, tipoApartamento: "SUITE B" },
            ],
          }),
        ],
      })}
      indices={[0]}
    />,
  );
  const blocos = container.querySelectorAll("dl");
  expect(blocos).toHaveLength(2);
  const [primeiro, segundo] = Array.from(blocos);
  expect(primeiro).toHaveTextContent("SUITE A");
  expect(primeiro).not.toHaveTextContent("SUITE B");
  expect(segundo).toHaveTextContent("SUITE B");
});

test("recolhido vira um details com o título no summary, fechado", () => {
  render(
    <GrupoDeCampos
      titulo="Situação no Stur"
      nivel={3}
      recolhido
      campos={campos("situacaoFinanceiroRecebimento")}
      venda={vendaAgi({ situacaoFinanceiroRecebimento: "OK" })}
    />,
  );
  const resumo = screen.getByText("Situação no Stur");
  expect(resumo.tagName).toBe("SUMMARY");
  expect(resumo.closest("details")).not.toHaveAttribute("open");
  expect(screen.queryByRole("heading")).toBeNull();
});

test("a marca da seção vai na raiz do grupo", () => {
  const { container } = render(
    <GrupoDeCampos
      titulo="Situação no Stur"
      nivel={3}
      secao={2}
      campos={campos("situacaoFinanceiroRecebimento")}
      venda={vendaAgi({ situacaoFinanceiroRecebimento: "OK" })}
    />,
  );
  expect(container.firstElementChild).toHaveAttribute("data-anexo-secao", "2");
});

describe("moeda original", () => {
  const MOEDA = campos(
    "recebimentos[].moedaOriginal",
    "recebimentos[].valorMoedaOriginal",
    "recebimentos[].vlrCambio",
  );

  test("num lançamento, só com sigla que não é real e câmbio diferente de 1; o valor leva a sigla", () => {
    render(
      <GrupoDeCampos
        titulo="Detalhes"
        nivel={3}
        campos={MOEDA}
        venda={vendaAgi({
          recebimentos: [
            recebimento({ moedaOriginal: " us$ ", valorMoedaOriginal: "1000", vlrCambio: "5.17" }),
          ],
        })}
        indices={[0]}
      />,
    );
    expect(screen.getByText("Valor na moeda original").nextElementSibling).toHaveTextContent(
      "us$ 1.000,00",
    );
    expect(screen.getByText("Moeda")).toBeVisible();
  });

  test.each([
    ["R$", "5.17"],
    ["brl", "5.17"],
    ["US$", "1"],
    ["US$", "1.0000"],
  ])("sigla %s com câmbio %s não mostra a moeda original", (moedaOriginal, vlrCambio) => {
    render(
      <GrupoDeCampos
        titulo="Detalhes"
        nivel={3}
        campos={MOEDA.slice(0, 2)}
        venda={vendaAgi({
          recebimentos: [recebimento({ moedaOriginal, valorMoedaOriginal: "10", vlrCambio })],
        })}
        indices={[0]}
      />,
    );
    expect(screen.queryByText("Valor na moeda original")).toBeNull();
    expect(screen.queryByText("Moeda")).toBeNull();
  });

  test("num serviço, só com conversão do lado; o fornecedor usa a sigla do fornecedor", () => {
    const venda = vendaAgi({
      detalheItem: [
        servicoAgi({
          siglaMoedaTarifa: "US$",
          siglaMoedaTarifap: "EUR",
          vlrDescontoMoedaOriginal: "10",
          vlrTaxasPMoedaOriginal: "20",
          vlrTxFaturamentoMoedaOriginal: "30",
        }),
      ],
    });
    const conversao = { sigla: "US$", cambio: "5.17", dataCambio: null, tarifaOrigem: "100.00" };
    const base = contaServico();
    const comConversao = calculos({
      servicos: [
        {
          ...base,
          cliente: { ...base.cliente, conversao },
          fornecedor: { ...base.fornecedor, conversao: null },
        },
      ],
    });
    render(
      <GrupoDeCampos
        titulo="Valores na moeda original"
        nivel={3}
        campos={campos(
          "detalheItem[].vlrDescontoMoedaOriginal",
          "detalheItem[].vlrTaxasPMoedaOriginal",
          "detalheItem[].vlrTxFaturamentoMoedaOriginal",
        )}
        venda={venda}
        calculos={comConversao}
        indices={[0]}
      />,
    );
    expect(
      screen.getByText("Cliente: desconto na moeda original").nextElementSibling,
    ).toHaveTextContent("US$ 10,00");
    expect(
      screen.getByText("Taxa de faturamento na moeda original").nextElementSibling,
    ).toHaveTextContent("US$ 30,00");
    expect(screen.queryByText("Fornecedor: taxas na moeda original")).toBeNull();
  });

  test("num serviço, sem os cálculos ou sem conversão, nada aparece", () => {
    const venda = vendaAgi({ detalheItem: [servicoAgi({ vlrDescontoMoedaOriginal: "10" })] });
    const { container } = render(
      <GrupoDeCampos
        titulo="Valores na moeda original"
        nivel={3}
        campos={campos("detalheItem[].vlrDescontoMoedaOriginal")}
        venda={venda}
        calculos={calculos()}
        indices={[0]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

test("no itinerário, a data e hora com a hora zero do Stur sai só com a data", () => {
  const chegada = { caminho: "trechos[].dtChegada", formato: "dataHora" } as const;
  expect(formatarCampo(chegada, "2026-11-15T00:00:00")).toBe("15/11/2026");
  expect(formatarCampo(chegada, "2026-11-15 10:05:00")).toBe("15/11/2026 · 10h05");
  // Fora do itinerário a hora zero é uma hora como as outras.
  expect(formatarCampo({ caminho: "dtcriacao", formato: "dataHora" }, "2026-11-15T00:00:00")).toBe(
    "15/11/2026 · 00h00",
  );
});
