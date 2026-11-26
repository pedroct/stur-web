import type { LancamentoCalculado, ReservaConsultada, ResumoVenda } from "@/contrato/tipos";
import {
  fraseDaSituacao,
  fraseDoCliente,
  fraseDoFornecedor,
  linhasDaReserva,
  tituloDoFinanceiro,
} from "@/lib/reserva/lancamentos";
import { lancamento, reserva, resumoVenda } from "../../fabrica";

const HOJE = "2026-11-24";

type Lados = { recebimentos?: LancamentoCalculado[]; pagamentos?: LancamentoCalculado[] };

function montar(
  resumos: ResumoVenda[],
  lados: Lados[],
  totais: Partial<ReservaConsultada["reserva"]["totais"]> = {},
): ReservaConsultada["reserva"] {
  const base = reserva(90000001, resumos).reserva;
  return {
    ...base,
    vendas: base.vendas.map((v, i) => ({ ...v, ...lados[i] })),
    totais: { ...base.totais, ...totais },
  };
}

function ordens(n: number, campos: Partial<LancamentoCalculado> = {}): LancamentoCalculado[] {
  return Array.from({ length: n }, (_, i) =>
    lancamento({
      indice: i,
      valorExibido: "10.50",
      descricaoForma: "Cash",
      vencimento: "2026-05-28 00:00:00",
      documentos: [{ tipo: "outro", numero: `OS${9000001 + i}` }],
      ...campos,
    }),
  );
}

describe("linhasDaReserva", () => {
  test("quatorze pagamentos cash com o mesmo vencimento viram uma linha", () => {
    const r = montar(
      [resumoVenda({ fornecedor: "FORNECEDOR EXEMPLO" })],
      [{ pagamentos: ordens(14) }],
    );
    const linhas = linhasDaReserva(r, HOJE);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      lado: "fornecedor",
      rotulo: "A pagar a FORNECEDOR EXEMPLO, cash (venda 1)",
      documento: "OS9000001 a OS9000014, 14 ordens",
      vencimento: "2026-05-28 00:00:00",
      valor: "147.00",
      selo: { rotulo: "Pago" },
    });
  });

  test("vencimento, situação ou venda diferentes quebram a linha; só os seguidos se juntam", () => {
    const [a, b, c] = ordens(3);
    const r = montar(
      [resumoVenda({ idreserva: 1001 }), resumoVenda({ idreserva: 1002 })],
      [
        {
          pagamentos: [
            a as LancamentoCalculado,
            { ...(b as LancamentoCalculado), vencimento: "2026-06-01 00:00:00" },
            c as LancamentoCalculado,
          ],
        },
        { pagamentos: ordens(2) },
      ],
    );
    expect(linhasDaReserva(r, HOJE).map((l) => [l.venda, l.documento])).toEqual([
      [1, "OS9000001"],
      [1, "OS9000002"],
      [1, "OS9000003"],
      [2, "OS9000001 a OS9000002, 2 ordens"],
    ]);
  });

  test("o crédito vira linha própria, com o valor positivo e sem forma", () => {
    const r = montar(
      [resumoVenda({ fornecedor: "FORNECEDOR EXEMPLO" })],
      [
        {
          pagamentos: [
            ...ordens(1),
            lancamento({
              indice: 1,
              ehCredito: true,
              valorExibido: "-13.20",
              situacao: "em_aberto",
              vencido: true,
              vencimento: "2026-05-29 00:00:00",
              descricaoForma: "Crédito",
              documentos: [{ tipo: "outro", numero: "OS9000099" }],
            }),
          ],
        },
      ],
    );
    const linhas = linhasDaReserva(r, HOJE);
    expect(linhas).toHaveLength(2);
    expect(linhas[1]).toMatchObject({
      rotulo: "Crédito do fornecedor (venda 1)",
      documento: "OS9000099",
      valor: "13.20",
      selo: { rotulo: "Em aberto, venceu em 29/05" },
    });
  });

  test("ordem: venda por venda, recebimentos antes dos pagamentos; cliente sem forma e canceladas fora", () => {
    const r = montar(
      [
        resumoVenda({ idreserva: 1001 }),
        resumoVenda({ idreserva: 1002, situacao: "cancelada" }),
        resumoVenda({ idreserva: 1003 }),
      ],
      [
        { recebimentos: ordens(1, { descricaoForma: "Faturado" }), pagamentos: ordens(1) },
        { recebimentos: ordens(1) },
        { recebimentos: ordens(1, { descricaoForma: null }) },
      ],
    );
    expect(linhasDaReserva(r, HOJE).map((l) => l.rotulo)).toEqual([
      "A receber do cliente, faturado (venda 1)",
      "A pagar a FORNECEDOR EXEMPLO, cash (venda 1)",
      "A receber do cliente (venda 3)",
    ]);
  });

  test("o principal é o fornecedor 2 quando há operadora", () => {
    const r = montar(
      [resumoVenda({ fornecedor: "OPERADORA EXEMPLO", fornecedor2: "AEREA EXEMPLO" })],
      [{ pagamentos: ordens(1) }],
    );
    expect(linhasDaReserva(r, HOJE)[0]?.rotulo).toBe("A pagar a AEREA EXEMPLO, cash (venda 1)");
  });
});

describe("frases do Financeiro", () => {
  const vencido = (i: number) =>
    lancamento({ indice: i, situacao: "em_aberto", vencido: true, valorExibido: "100.00" });

  test("cliente: a receber e vencidos", () => {
    const r = montar(
      [resumoVenda({ idreserva: 1001 }), resumoVenda({ idreserva: 1002 })],
      [{ recebimentos: [vencido(0), vencido(1)] }, { recebimentos: [vencido(0)] }],
      { aReceberCliente: "3591.91" },
    );
    expect(fraseDoCliente(r)).toBe("R$ 3.591,91 a receber, 3 vencidos");
  });

  test("cliente: um vencido no singular, nenhum sem a vírgula, nada a receber", () => {
    const um = montar([resumoVenda()], [{ recebimentos: [vencido(0)] }], {
      aReceberCliente: "100.00",
    });
    expect(fraseDoCliente(um)).toBe("R$ 100,00 a receber, 1 vencido");
    const nenhum = montar(
      [resumoVenda()],
      [{ recebimentos: [lancamento({ situacao: "em_aberto" })] }],
      {
        aReceberCliente: "100.00",
      },
    );
    expect(fraseDoCliente(nenhum)).toBe("R$ 100,00 a receber");
    expect(fraseDoCliente(montar([resumoVenda()], [{}]))).toBe("nada a receber");
  });

  test("fornecedor: só as partes maiores que zero", () => {
    const base = [resumoVenda()];
    expect(
      fraseDoFornecedor(
        montar(base, [{}], { aPagarFornecedor: "285.53", aReceberFornecedor: "620.62" }),
      ),
    ).toBe("R$ 285,53 a pagar · R$ 620,62 a receber do fornecedor");
    expect(fraseDoFornecedor(montar(base, [{}], { aReceberFornecedor: "13620.74" }))).toBe(
      "R$ 13.620,74 a receber do fornecedor",
    );
    expect(fraseDoFornecedor(montar(base, [{}]))).toBe("nada a pagar");
  });

  test("situação pelos totais, com ou sem crédito a receber", () => {
    const r = montar([resumoVenda({ totalCliente: "150.00" })], [{}], {
      totalCliente: "150.00",
      recebidoCliente: "150.00",
      pagoFornecedor: "139.00",
      aReceberFornecedor: "13.00",
    });
    expect(fraseDaSituacao(r)).toBe(
      "A situação vem dos totais das vendas: recebido R$ 150,00 de R$ 150,00, pago R$ 139,00 e R$ 13,00 a receber do fornecedor. A data de baixa de cada título fica no financeiro do Stur. Um valor em aberto pode já ter sido pago sem baixa.",
    );
    expect(
      fraseDaSituacao({ ...r, totais: { ...r.totais, aReceberFornecedor: "0.00" } }),
    ).toContain("pago R$ 139,00. A data de baixa");
  });

  test("título: com canceladas conta as ativas; sem, 'da reserva'", () => {
    const resumos = Array.from({ length: 10 }, (_, i) =>
      resumoVenda({ idreserva: 1001 + i, situacao: i === 1 ? "cancelada" : "fechada" }),
    );
    expect(tituloDoFinanceiro(montar(resumos, []))).toBe("Financeiro das 9 vendas ativas");
    expect(tituloDoFinanceiro(montar(resumos.slice(2), []))).toBe("Financeiro da reserva");
  });
});
