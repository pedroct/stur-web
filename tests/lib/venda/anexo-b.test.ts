import openapi from "@/contrato/openapi.json";
import { CAMPOS_ANEXO_B, type CampoAnexo } from "@/lib/venda/anexo-b";

function campo(caminho: string): CampoAnexo {
  const achado = CAMPOS_ANEXO_B.find((c) => c.caminho === caminho);
  if (achado === undefined) throw new Error(`Campo fora do Anexo B: ${caminho}`);
  return achado;
}

test("o Anexo B tem os 278 campos, um por caminho", () => {
  expect(CAMPOS_ANEXO_B).toHaveLength(278);
  expect(new Set(CAMPOS_ANEXO_B.map((c) => c.caminho)).size).toBe(278);
});

test("cada seção tem os campos da visão geral do Anexo B", () => {
  const porSecao = new Map<number, number>();
  for (const c of CAMPOS_ANEXO_B) porSecao.set(c.secao, (porSecao.get(c.secao) ?? 0) + 1);
  expect(Object.fromEntries(porSecao)).toEqual({
    1: 9,
    2: 14,
    3: 51,
    4: 14,
    5: 75,
    6: 46,
    7: 10,
    8: 28,
    9: 31,
  });
});

// Os itens de uma lista viram um bloco cada (Global Constraints, Listas): no grupo de códigos,
// "Código da forma" e "Sinal" do recebimento e do pagamento ficam em blocos diferentes.
test("não há dois rótulos iguais no mesmo grupo, em cada bloco de itens", () => {
  const bloco = (c: CampoAnexo) => c.caminho.slice(0, c.caminho.lastIndexOf("[]") + 1);
  const chaves = CAMPOS_ANEXO_B.map((c) => `${c.grupo}|${bloco(c)}|${c.rotulo}`);
  expect(chaves.filter((chave, i) => chaves.indexOf(chave) !== i)).toEqual([]);
});

test("o rótulo é o do Anexo B sem as anotações; (%) e (sigla) ficam", () => {
  expect(campo("categoriaproduto").rotulo).toBe("Categoria");
  expect(campo("dtalteracaovinculado").rotulo).toBe("API com dados até");
  expect(campo("intinerario").rotulo).toBe("Itinerário");
  expect(campo("idreserva").rotulo).toBe("Id interno da venda");
  expect(campo("recebimentos[].cartaoRepassadoAoFornecedor").rotulo).toBe(
    "Repassado ao Fornecedor",
  );
  expect(campo("detalheItem[].perTaxas").rotulo).toBe("Cliente: + Taxas (%)");
  expect(campo("detalheItem[].vlrTaxas").rotulo).toBe("Cliente: + Taxas");
  expect(campo("siglaCCustoCliente").rotulo).toBe("C. Custo Cliente (sigla)");
  expect(campo("nomeCCustoCliente").rotulo).toBe("C. Custo Cliente");
  expect(CAMPOS_ANEXO_B.filter((c) => /[;(]/.test(c.rotulo.replace(/\((%|sigla)\)/, "")))).toEqual(
    [],
  );
});

test("seção, grupo e como aparece", () => {
  expect(campo("reserva")).toMatchObject({
    secao: 1,
    grupo: "Identificação da venda",
    aparece: "visivel",
  });
  expect(campo("detalheItem[].cpfPax")).toMatchObject({
    secao: 4,
    grupo: "Documentos e contato",
    aparece: "recolhido",
  });
  expect(campo("detalheItem[].vlrTaxasMoedaOriginal").aparece).toBe("moeda");
  expect(campo("idreservavinculadafee").aparece).toBe("quando-houver");
  expect(campo("detalheItem[].horaRetirada").aparece).toBe("visivel");
  expect(campo("nomefornec2")).toMatchObject({
    aparece: "recolhido",
    apareceNa: [{ classificacao: "rodoviario", aparece: "visivel" }],
  });
  expect(CAMPOS_ANEXO_B.filter((c) => c.apareceNa !== undefined)).toHaveLength(1);
});

test("as classes são as colunas preenchidas, inclusive com <1 e 0", () => {
  expect(campo("taxasAdministrativas").classes).toEqual([
    "aereo",
    "hotelaria",
    "diversos",
    "pacote",
  ]);
  expect(campo("totalAPagarCliente").classes).toEqual(["aereo"]);
  expect(campo("recebimentos[].vlrRetTarifa").classes).toEqual([
    "aereo",
    "hotelaria",
    "rodoviario",
    "diversos",
  ]);
  expect(campo("detalheItem[].dtEntrada").classes).toEqual(["hotelaria"]);
  expect(campo("atividade").classes).toEqual([]);
});

test("os sete contêineres de lista", () => {
  expect(
    CAMPOS_ANEXO_B.filter((c) => c.conteiner)
      .map((c) => c.caminho)
      .sort(),
  ).toEqual(
    [
      "trechos",
      "detalheItem[].taxas",
      "recebimentos",
      "pagamentos",
      "reembolsoVinculado",
      "financeiroVinculado.contasPagar",
      "financeiroVinculado.contasReceber",
    ].sort(),
  );
});

test.each([
  ["recebimentos[].cartaoRepassadoAoFornecedor", "booleano"],
  ["pagamentos[].ehsinal", "booleano"],
  ["detalheItem[].vlrCambio", "cambio"],
  ["detalheItem[].vlrCambioTxServico", "cambio"],
  ["detalheItem[].perTaxas", "percentual"],
  ["detalheItem[].percComisRecebida", "percentual"],
  ["detalheItem[].vlrTarifa", "dinheiro"],
  ["totalCliente", "dinheiro"],
  ["recebimentos[].valorLiquido", "dinheiro"],
  ["margemLucroBruta", "dinheiro"],
  ["detalheItem[].comisSobreTxEmb", "dinheiro"],
  ["taxasAdministrativasRepassadas", "dinheiro"],
  ["detalheItem[].horaDevolucao", "hora"],
  ["dtcriacao", "dataHora"],
  ["dtalteracaovinculado", "dataHora"],
  ["trechos[].dtPartida", "dataHora"],
  ["dtemissao", "data"],
  ["detalheItem[].datadeconfirmacao", "data"],
  ["financeiroVinculado.contasReceber[].dtemissao", "data"],
  ["detalheItem[].qtdeDiarias", "inteiro"],
  ["idreserva", "inteiro"],
  ["recebimentos[].forma", "inteiro"],
  ["trechos[].segmento", "inteiro"],
  ["reserva", "inteiro"],
  ["pagamentos[].qtParcelasCartao", "inteiro"],
  ["recebimentos[].uniqueid", "inteiro"],
  ["camposGerenciais", "lista"],
  ["nomecliente", "texto"],
  ["trechos[].origem.sigla", "texto"],
])("o formato de %s é %s", (caminho, formato) => {
  expect(campo(caminho).formato).toBe(formato);
});

test("todo caminho existe no contrato", () => {
  const esquemas = openapi.components.schemas as unknown as Record<
    string,
    { properties?: Record<string, Esquema> }
  >;
  type Esquema = { $ref?: string; anyOf?: Esquema[]; items?: Esquema; allOf?: Esquema[] };
  const referencia = (e: Esquema | undefined): string | null => {
    if (e === undefined) return null;
    if (e.$ref) return e.$ref.split("/").at(-1) ?? null;
    for (const alt of [...(e.anyOf ?? []), ...(e.allOf ?? [])]) {
      const r = referencia(alt.items ?? alt);
      if (r !== null) return r;
    }
    return e.items ? referencia(e.items) : null;
  };
  const existe = (caminho: string) => {
    let esquema: string | null = "VendaAgi";
    const partes = caminho.split(".");
    for (const [i, parte] of partes.entries()) {
      const propriedade: Esquema | undefined =
        esquema === null ? undefined : esquemas[esquema]?.properties?.[parte.replace("[]", "")];
      if (propriedade === undefined) return false;
      if (i < partes.length - 1) esquema = referencia(propriedade);
    }
    return true;
  };
  expect(CAMPOS_ANEXO_B.filter((c) => !existe(c.caminho)).map((c) => c.caminho)).toEqual([]);
});
