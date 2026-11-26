/**
 * Critério 8 (RF-04): todo campo preenchido do Anexo B tem lugar na tela, na seção dele. Monta o
 * `layout.tsx` com a venda cheia de cada classificação e procura cada item de cada campo dentro da
 * marca `data-anexo-secao` da seção dele: o `naTela` de valor de um molde que o declarou, no texto
 * da seção, ou o rótulo do Anexo B num par (`dt`) cujo valor (`dd`) é o do item. Os valores da
 * `vendaCheia` são distintos por campo e por item. O teste do teste, no fim, tira cada campo da
 * venda e confere que ele passa a faltar. Um campo que falta é defeito do molde dono dele.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import LayoutDaReserva from "@/app/reservas/[numero]/layout";
import { formatarCampo } from "@/componentes/venda/GrupoDeCampos";
import { Venda } from "@/componentes/venda/Venda";
import type { VendaAgi, VendaConsultada } from "@/contrato/tipos";
import type { Classificacao } from "@/lib/consulta/consulta";
import { compararDecimais, ehDecimal } from "@/lib/decimal";
import { CAMPOS_ANEXO_B, type CampoAnexo } from "@/lib/venda/anexo-b";
import { preenchido, valorDoCampo } from "@/lib/venda/campos";
import { fraseZerados } from "@/lib/venda/conta";
import { MOLDES } from "@/lib/venda/moldes";
import { reserva, resumoVenda, vendaAgi, vendaCheia, vendaConsultada } from "../../fabrica";
import { definirEndereco } from "../../navegacao";
import { servidor } from "../../servidor";

const VENDA = "/reservas/90000001/vendas/1001";

const CLASSIFICACOES: Classificacao[] = [
  "aereo",
  "hotelaria",
  "rodoviario",
  "diversos",
  "locacao",
  "pacote",
];

function programar(dados: VendaConsultada) {
  servidor.use(
    http.get("*/api/v1/reservas/90000001/vendas/:id", () => HttpResponse.json(dados)),
    http.get("*/api/v1/reservas/90000001", () =>
      HttpResponse.json({
        numero: 90000001,
        consultadoEm: dados.consultadoEm,
        dadosDoSturAte: dados.dadosDoSturAte,
        reserva: dados.reserva,
      }),
    ),
  );
}

function abrirDetalhes(raiz: ParentNode) {
  for (const d of raiz.querySelectorAll("details")) d.open = true;
}

async function abrirVenda(dados: VendaConsultada) {
  programar(dados);
  definirEndereco(VENDA);
  render(<LayoutDaReserva />);
  await waitFor(() => expect(document.querySelector('[data-anexo-secao="9"]')).not.toBeNull());
  abrirDetalhes(document);
}

// --- o texto das seções ---

/**
 * O texto do nó com uma quebra em volta de cada elemento: o fim de um `dt` não cola no começo do
 * `dd`, nem a data da linha da tarifa no valor da coluna ao lado. Um espaço do texto procurado casa
 * com qualquer espaço ou quebra (`ocorrencias`).
 */
function textoDe(no: Node): string {
  if (no.nodeType === Node.TEXT_NODE) return no.textContent ?? "";
  if (!(no instanceof Element)) return "";
  return `\n${[...no.childNodes].map(textoDe).join("")}\n`;
}

/**
 * As raízes com a marca da seção, sem contar duas vezes uma marca dentro de outra. Uma marca de
 * outro número dentro de uma raiz (a linha da tarifa na conta) conta para as duas seções.
 */
function raizesDaSecao(escopo: ParentNode, secao: number): Element[] {
  const seletor = `[data-anexo-secao="${secao}"]`;
  return [...escopo.querySelectorAll(seletor)].filter((e) => !e.parentElement?.closest(seletor));
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function padrao(alvo: string): RegExp {
  const corpo = escapar(alvo.trim()).replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\d])${corpo}(?![\\p{L}\\d])`, "giu");
}

/** Ocorrências sem caixa, que não começam nem terminam no meio de uma palavra ou de um número. */
function ocorrencias(texto: string, alvo: string): number {
  return [...texto.matchAll(padrao(alvo))].length;
}

const normal = (texto: string | null | undefined) => (texto ?? "").replace(/\s+/g, " ").trim();

/** Um par de rótulo e valor da seção: o texto do `dt` e o do `dd` logo depois dele. */
type ParNaTela = { rotulo: string; valor: string };

function paresDaSecao(raizes: Element[]): ParNaTela[] {
  return raizes.flatMap((raiz) =>
    [...raiz.querySelectorAll("dt")].map((dt) => ({
      rotulo: normal(dt.textContent),
      valor: dt.nextElementSibling?.tagName === "DD" ? textoDe(dt.nextElementSibling) : "",
    })),
  );
}

/** O rótulo do par é o do campo, ou o do campo com o item ("Código da forma, recebimento 2"). */
function mesmoRotulo(naTela: string, rotulo: string): boolean {
  return naTela === rotulo || new RegExp(`^${escapar(rotulo)}(, \\p{L}+ \\d+)+$`, "u").test(naTela);
}

// --- os campos preenchidos ---

/** Os índices de cada item das listas do caminho. */
function itensDoCaminho(venda: VendaAgi, caminho: string): number[][] {
  let todas: number[][] = [[]];
  let prefixo = "";
  for (const parte of caminho.split(".")) {
    prefixo = prefixo === "" ? parte : `${prefixo}.${parte}`;
    if (!parte.endsWith("[]")) continue;
    const lista = prefixo.slice(0, -2);
    todas = todas.flatMap((c) => {
      const itens = valorDoCampo(venda, lista, c);
      return Array.isArray(itens) ? itens.map((_, k) => [...c, k]) : [];
    });
  }
  return todas;
}

/** A regra da moeda estrangeira (Global Constraints): no serviço, a conversão do lado; no lançamento, a sigla e o câmbio. */
function valeAMoeda(c: CampoAnexo, dados: VendaConsultada, indices: number[]): boolean {
  if (c.aparece !== "moeda") return true;
  if (c.caminho.startsWith("detalheItem[].")) {
    const lado = c.rotulo.startsWith("Fornecedor:") ? "fornecedor" : "cliente";
    const conta = dados.calculos.servicos.find((s) => s.indice === indices[0]);
    return conta?.[lado].conversao !== null && conta !== undefined;
  }
  const base = c.caminho.slice(0, c.caminho.lastIndexOf(".") + 1);
  const sigla = valorDoCampo(dados.venda, `${base}moedaOriginal`, indices);
  const cambio = valorDoCampo(dados.venda, `${base}vlrCambio`, indices);
  if (typeof sigla !== "string" || ["R$", "BRL"].includes(sigla.replace(/\s/g, "").toUpperCase())) {
    return false;
  }
  return !(typeof cambio === "string" && ehDecimal(cambio) && compararDecimais(cambio, "1") === 0);
}

type Campo = { campo: CampoAnexo; itens: number[][] };

function camposPreenchidos(dados: VendaConsultada): Campo[] {
  return CAMPOS_ANEXO_B.filter((c) => !c.conteiner).flatMap((campo) => {
    const itens = itensDoCaminho(dados.venda, campo.caminho).filter(
      (indices) =>
        preenchido(valorDoCampo(dados.venda, campo.caminho, indices), campo.caminho) &&
        valeAMoeda(campo, dados, indices),
    );
    return itens.length === 0 ? [] : [{ campo, itens }];
  });
}

/**
 * Como achar um item do campo:
 * - `valores`: o `naTela` de valor de cada molde que o declara, procurado no texto da seção. Os
 *   valores da `vendaCheia` são distintos por campo e por item, e nenhum cabe dentro de outro; o
 *   booleano ("Sim") não tem valor que o distinga e fica de fora;
 * - `rotulos`: o `naTela` de rótulo de um molde (o `dt` com esse texto, um por item);
 * - `par`: o rótulo do Anexo B, num `dt` cujo `dd` tem o valor formatado do item (o
 *   `GrupoDeCampos`, Mais detalhes, Códigos do Stur).
 */
type Forma = { valores: string[]; rotulos: string[]; par: { rotulo: string; valor: string } };

function formasDeAchar(c: CampoAnexo, venda: VendaAgi, indices: number[]): Forma {
  const formatado = formatarCampo(c, valorDoCampo(venda, c.caminho, indices));
  const forma: Forma = { valores: [], rotulos: [], par: { rotulo: c.rotulo, valor: formatado } };
  for (const declarados of Object.values(MOLDES)) {
    for (const d of declarados) {
      if (d.caminho !== c.caminho) continue;
      if (d.naTela.tipo === "rotulo") forma.rotulos.push(d.naTela.texto);
      else if (c.formato !== "booleano") {
        const texto = d.naTela.transformar ? d.naTela.transformar(formatado) : formatado;
        forma.valores.push(texto.toLowerCase());
      }
    }
  }
  forma.valores = [...new Set(forma.valores)];
  return forma;
}

/**
 * O termo zerado da conta não vira par: entra na frase "Zerados: …" (decisão 5), que a conta
 * monta com os `zerados` do lado.
 */
function peloZerado(c: CampoAnexo, indices: number[], dados: VendaConsultada, texto: string) {
  const [indice] = indices;
  if (!c.caminho.startsWith("detalheItem[].") || indice === undefined) return false;
  const conta = dados.calculos.servicos.find((s) => s.indice === indice);
  const nome = c.caminho.slice("detalheItem[].".length);
  if (
    conta === undefined ||
    ![...conta.cliente.zerados, ...conta.fornecedor.zerados].includes(nome)
  ) {
    return false;
  }
  return (["Zerados", "Zerados neste serviço"] as const).some((prefixo) => {
    const frase = fraseZerados(conta, prefixo);
    return frase !== null && ocorrencias(texto, frase) > 0;
  });
}

/**
 * Os campos (de `campos`) que não estão na seção deles dentro de `escopo`. Cada item precisa da
 * sua ocorrência: um texto procurado por vários itens (a mesma sigla em dois lançamentos) precisa
 * aparecer uma vez por item, e um rótulo de molde, uma vez por item que depende dele.
 */
function faltando(escopo: ParentNode, dados: VendaConsultada, campos: Campo[]): string[] {
  type Item = { campo: CampoAnexo; forma: Forma; indices: number[] };
  const porSecao = new Map<number, Item[]>();
  for (const { campo, itens } of campos) {
    const lista = porSecao.get(campo.secao) ?? [];
    for (const indices of itens)
      lista.push({ campo, indices, forma: formasDeAchar(campo, dados.venda, indices) });
    porSecao.set(campo.secao, lista);
  }
  const faltam = new Set<string>();
  for (const [secao, itens] of porSecao) {
    const raizes = raizesDaSecao(escopo, secao);
    const texto = raizes.map(textoDe).join("\n");
    const pares = paresDaSecao(raizes);
    const procura = new Map<string, number>();
    const chave = (par: Forma["par"]) => `${par.rotulo}\u0000${par.valor.toLowerCase()}`;
    for (const { forma } of itens) {
      for (const v of forma.valores) procura.set(v, (procura.get(v) ?? 0) + 1);
      procura.set(chave(forma.par), (procura.get(chave(forma.par)) ?? 0) + 1);
    }
    const pendentes: Item[] = [];
    for (const item of itens) {
      const { valores, par } = item.forma;
      const peloValor = valores.some((v) => ocorrencias(texto, v) >= (procura.get(v) ?? 1));
      const peloPar =
        pares.filter(
          (p) => mesmoRotulo(p.rotulo, par.rotulo) && ocorrencias(p.valor, par.valor) > 0,
        ).length >= (procura.get(chave(par)) ?? 1);
      if (!peloValor && !peloPar && !peloZerado(item.campo, item.indices, dados, texto))
        pendentes.push(item);
    }
    // O rótulo de um molde ("Venda de fee vinculada") não traz o valor: um `dt` por item.
    const demanda = new Map<string, number>();
    for (const { forma } of pendentes)
      for (const r of forma.rotulos) demanda.set(r, (demanda.get(r) ?? 0) + 1);
    for (const { campo, forma } of pendentes) {
      const peloRotulo = forma.rotulos.some(
        (r) =>
          pares.filter((p) => p.rotulo === r && normal(p.valor) !== "").length >=
          (demanda.get(r) ?? 1),
      );
      if (!peloRotulo) faltam.add(campo.caminho);
    }
  }
  return campos
    .filter(({ campo }) => faltam.has(campo.caminho))
    .map(({ campo, itens }) => `${campo.caminho} (seção ${campo.secao}, ${itens.length} itens)`);
}

/**
 * Uma venda de incentivo cheia. O produto tem nome próprio: "INCENTIVO" sozinho casaria com o selo
 * "Incentivo de fornecedor", e a tela reconhece o incentivo pelo `calculos.tipo`.
 */
function incentivo(): VendaConsultada {
  const base = vendaCheia("diversos");
  return {
    ...base,
    venda: { ...base.venda, nomeproduto: "INCENTIVO EXEMPLO" },
    calculos: { ...base.calculos, tipo: "incentivo" },
  };
}

const DO_PAINEL = new Set([3, 4, 5]);

function doServico({ campo }: Campo): boolean {
  return DO_PAINEL.has(campo.secao) && campo.caminho.startsWith("detalheItem[].");
}

async function abrirServico(k: number): Promise<HTMLElement> {
  // O botão de cada linha da tabela dos serviços (a descrição ou a pessoa), na ordem.
  const tabela = screen.getByRole("table", { name: "Serviços da venda, valores em reais" });
  const alvo = within(tabela).getAllByRole("button")[k - 1];
  if (alvo === undefined) throw new Error(`sem o botão do serviço ${k}`);
  await userEvent.click(alvo);
  const painel = await screen.findByRole("dialog");
  await within(painel).findByText(new RegExp(`^Serviço ${k} de`));
  abrirDetalhes(painel);
  return painel;
}

async function fecharPainel(painel: HTMLElement) {
  await userEvent.click(within(painel).getByRole("button", { name: "Fechar" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

describe("critério 8: todo campo preenchido tem lugar na seção dele", () => {
  test.each(CLASSIFICACOES)("%s, com um serviço", async (classificacao) => {
    const dados = vendaCheia(classificacao);
    await abrirVenda(dados);
    expect(faltando(document, dados, camposPreenchidos(dados))).toEqual([]);
  });

  test.each(
    CLASSIFICACOES,
  )("%s, com dois serviços (os do serviço no painel dele)", async (classificacao) => {
    const dados = vendaCheia(classificacao, 2);
    await abrirVenda(dados);
    const campos = camposPreenchidos(dados);
    expect(
      faltando(
        document,
        dados,
        campos.filter((c) => !doServico(c)),
      ),
    ).toEqual([]);
    for (const k of [1, 2]) {
      const painel = await abrirServico(k);
      const doK = campos
        .filter(doServico)
        .map((c) => ({ ...c, itens: c.itens.filter(([s]) => s === k - 1) }))
        .filter((c) => c.itens.length > 0);
      expect(faltando(painel, dados, doK)).toEqual([]);
      await fecharPainel(painel);
    }
  });

  test("venda de incentivo", async () => {
    const dados = incentivo();
    await abrirVenda(dados);
    expect(faltando(document, dados, camposPreenchidos(dados))).toEqual([]);
  });

  test("Diversos com os campos que nunca vieram preenchidos e dois trechos, pelo grupo", async () => {
    const dados = vendaCheia("diversos", 1, { nuncaPreenchidos: true });
    expect(dados.venda.trechos).toHaveLength(2);
    await abrirVenda(dados);
    const nunca = new Set(
      CAMPOS_ANEXO_B.filter((c) => c.classes.length === 0).map((c) => c.caminho),
    );
    const campos = camposPreenchidos(dados);
    expect(campos.filter((c) => nunca.has(c.campo.caminho)).length).toBeGreaterThan(20);
    expect(faltando(document, dados, campos)).toEqual([]);
  });

  test("a venda aberta dentro da reserva: a seção 1 no cabeçalho da venda", async () => {
    const r = reserva(90000001, [
      resumoVenda({ idreserva: 1001 }),
      resumoVenda({ idreserva: 1002, produto: "TAXA FEE", classificacao: "Diversos" }),
    ]);
    const dados: VendaConsultada = { ...vendaCheia("hotelaria"), reserva: r.reserva, posicao: 1 };
    await abrirVenda(dados);
    // A reserva tem o h1; a venda, o h2.
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    const cabecalho = document.querySelector('[data-anexo-secao="1"]');
    expect(cabecalho?.querySelector("h2")).not.toBeNull();
    const campos = camposPreenchidos(dados).filter((c) => c.campo.secao === 1);
    expect(campos.length).toBe(9);
    expect(faltando(document, dados, campos)).toEqual([]);
  });
});

describe("venda mínima", () => {
  test("nenhuma seção vazia e nenhum rótulo sem valor", async () => {
    const dados = vendaConsultada({ venda: vendaAgi() });
    await abrirVenda(dados);
    for (const raiz of document.querySelectorAll<HTMLElement>("[data-anexo-secao]")) {
      // Vazia, a raiz com `empty:hidden` some pelo CSS (o jsdom não aplica as classes).
      if (raiz.classList.contains("empty:hidden") && raiz.childNodes.length === 0) continue;
      expect(raiz.textContent?.trim(), raiz.outerHTML.slice(0, 120)).not.toBe("");
    }
    for (const dt of document.querySelectorAll("dt")) {
      const dd = dt.nextElementSibling;
      expect(dd?.tagName, dt.textContent ?? "").toBe("DD");
      expect(dd?.textContent?.trim(), dt.textContent ?? "").not.toBe("");
    }
    for (const d of document.querySelectorAll("details")) {
      expect(d.textContent?.trim()).not.toBe(d.querySelector("summary")?.textContent?.trim());
    }
    // Sem vínculo, a seção não existe.
    expect(document.querySelector('[data-anexo-secao="7"]')).toBeNull();
    // E o que veio preenchido aparece.
    expect(faltando(document, dados, camposPreenchidos(dados))).toEqual([]);
  });
});

// --- o teste do teste ---

const CONSULTA = { atualizando: false, aoAtualizar: () => {}, falha: null };

/**
 * Os campos que a tela também mostra a partir de `calculos`, `vinculos` ou `reserva`: tirados da
 * venda, continuam na tela, e com razão.
 */
const DE_OUTRA_FONTE = new Set([
  "reserva", // o número da `reserva`
  "dtalteracaovinculado", // o `dadosDoSturAte`
  // A conversão de cada lado (`calculos.servicos[].{cliente,fornecedor}.conversao`): a sigla, o
  // câmbio, a data e a tarifa de origem da linha da tarifa, e a sigla da moeda original.
  "detalheItem[].siglaMoedaTarifa",
  "detalheItem[].siglaMoedaTarifap",
  "detalheItem[].vlrCambio",
  "detalheItem[].vlrCambiop",
  "detalheItem[].dtCambio",
  "detalheItem[].dtCambiop",
  "detalheItem[].vlrTarifaTotal",
  "detalheItem[].vlrTarifaTotalp",
  // A linha do recebimento no cartão (`calculos.recebimentos[]`: a forma e o valor exibido).
  "recebimentos[].descricaoForma",
  "recebimentos[].valor",
  // Os pedidos de reembolso (`vinculos.reembolsos`).
  "reembolsoVinculado[].numeroSR",
  "reembolsoVinculado[].nomePax",
]);

/** Casos de uma classificação: o aéreo já tem a categoria no nome do produto (decisão 24). */
const DE_OUTRA_FONTE_NO_CASO: Record<string, string[]> = {
  aereo: ["categoriaproduto"],
};

/** Grava `valor` no caminho, em todo item das listas. */
function gravarNoCaminho(alvo: unknown, partes: string[], valor: unknown): void {
  const [parte, ...resto] = partes;
  if (parte === undefined || alvo === null || typeof alvo !== "object") return;
  const objeto = alvo as Record<string, unknown>;
  if (parte.endsWith("[]")) {
    const itens = objeto[parte.slice(0, -2)];
    if (Array.isArray(itens)) for (const item of itens) gravarNoCaminho(item, resto, valor);
    return;
  }
  if (resto.length === 0) objeto[parte] = valor;
  else gravarNoCaminho(objeto[parte], resto, valor);
}

const CASOS: [string, () => VendaConsultada][] = [
  ...CLASSIFICACOES.map((c): [string, () => VendaConsultada] => [c, () => vendaCheia(c)]),
  ["incentivo", incentivo],
];

describe("o critério 8 acusa o campo que some da venda", () => {
  // Uma montagem da venda por campo preenchido: cerca de 1,5 s por caso sozinho.
  test.each(CASOS)(
    "%s: sem o campo na venda, ele falta",
    { timeout: 30_000 },
    (caso, montarDados) => {
      const dados = montarDados();
      const deOutraFonte = new Set([...DE_OUTRA_FONTE, ...(DE_OUTRA_FONTE_NO_CASO[caso] ?? [])]);
      const sobram: string[] = [];
      for (const campo of camposPreenchidos(dados)) {
        const sem = structuredClone(dados);
        gravarNoCaminho(sem.venda, campo.campo.caminho.split("."), null);
        const { container, unmount } = render(
          <Venda dados={sem} naReserva={false} nivelBase={1} consulta={CONSULTA} />,
        );
        abrirDetalhes(container);
        const acusado = faltando(container, dados, [campo]).length > 0;
        unmount();
        if (!acusado && !deOutraFonte.has(campo.campo.caminho)) sobram.push(campo.campo.caminho);
      }
      expect(sobram).toEqual([]);
    },
  );
});

// --- zero e vazio ---

/**
 * A hotelaria cheia com o dinheiro em zero (um a cada três campos), em texto vazio ou nulo (os
 * outros dois). O desconto do cliente e o acordo do fornecedor ficam zerados também na conta,
 * como o backend os manda (`zerados`).
 */
function comZerosEVazios() {
  const dados = vendaCheia("hotelaria");
  const zerados: string[] = [];
  const vazios: string[] = [];
  camposPreenchidos(dados)
    .filter((c) => c.campo.formato === "dinheiro" && !DE_OUTRA_FONTE.has(c.campo.caminho))
    .forEach(({ campo }, n) => {
      const valor = [`0.00`, "", null][n % 3];
      gravarNoCaminho(dados.venda, campo.caminho.split("."), valor);
      (n % 3 === 0 ? zerados : vazios).push(campo.caminho);
    });
  for (const termo of ["detalheItem[].vlrDesconto", "detalheItem[].vlrDescontoAcordo"]) {
    gravarNoCaminho(dados.venda, termo.split("."), "0.00");
    if (!zerados.includes(termo)) zerados.push(termo);
  }
  const [conta] = dados.calculos.servicos;
  if (conta === undefined) throw new Error("sem conta");
  conta.cliente.zerados = ["vlrDesconto"];
  conta.fornecedor.zerados = ["vlrDescontoAcordo"];
  return { dados, zerados, vazios: vazios.filter((v) => !zerados.includes(v)) };
}

describe("zero e vazio", () => {
  test("o zero aparece (0,00 ou a frase dos zerados) e o vazio não deixa rótulo", async () => {
    const { dados, zerados, vazios } = comZerosEVazios();
    expect(zerados.length).toBeGreaterThan(10);
    expect(vazios.length).toBeGreaterThan(10);
    await abrirVenda(dados);
    const campos = camposPreenchidos(dados);
    // Zero é valor (RF-04): o campo continua preenchido e precisa estar na tela.
    expect(zerados.filter((z) => !campos.some((c) => c.campo.caminho === z))).toEqual([]);
    expect(faltando(document, dados, campos)).toEqual([]);
    expect(document.body).toHaveTextContent("Zerados: desconto e acordo.");
    // O vazio some: nenhum rótulo sem valor e nenhum par com o rótulo próprio do campo.
    for (const dt of document.querySelectorAll("dt")) {
      expect(normal(dt.nextElementSibling?.textContent), normal(dt.textContent)).not.toBe("");
    }
    for (const caminho of vazios) {
      const campo = CAMPOS_ANEXO_B.find((c) => c.caminho === caminho);
      if (campo === undefined) throw new Error(caminho);
      const mesmo = CAMPOS_ANEXO_B.filter(
        (c) => c.secao === campo.secao && c.rotulo === campo.rotulo,
      );
      if (mesmo.length > 1) continue;
      const pares = paresDaSecao(raizesDaSecao(document, campo.secao));
      expect(
        pares.filter((p) => mesmoRotulo(p.rotulo, campo.rotulo)).map((p) => p.rotulo),
        caminho,
      ).toEqual([]);
    }
  });
});
