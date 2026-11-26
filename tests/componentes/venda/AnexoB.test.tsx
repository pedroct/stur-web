/**
 * Critério 8 (RF-04): todo campo preenchido do Anexo B tem lugar na tela, na seção dele. Monta o
 * `layout.tsx` com a venda cheia de cada classificação e procura, dentro da marca
 * `data-anexo-secao` da seção do campo, o `naTela` de algum molde que o declarou ou o rótulo do
 * Anexo B (o `GrupoDeCampos`). Um campo que falta é defeito do molde dono dele.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import LayoutDaReserva from "@/app/reservas/[numero]/layout";
import { formatarCampo } from "@/componentes/venda/GrupoDeCampos";
import type { VendaAgi, VendaConsultada } from "@/contrato/tipos";
import type { Classificacao } from "@/lib/consulta/consulta";
import { compararDecimais, ehDecimal } from "@/lib/decimal";
import { CAMPOS_ANEXO_B, type CampoAnexo } from "@/lib/venda/anexo-b";
import { preenchido, valorDoCampo } from "@/lib/venda/campos";
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

/** O texto das raízes com a marca da seção, sem contar duas vezes uma marca dentro de outra. */
function textoDaSecao(escopo: ParentNode, secao: number): string {
  const seletor = `[data-anexo-secao="${secao}"]`;
  return [...escopo.querySelectorAll(seletor)]
    .filter((e) => !e.parentElement?.closest(seletor))
    .map(textoDe)
    .join("\n");
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Ocorrências sem caixa, que não começam nem terminam no meio de uma palavra ou de um número. */
function ocorrencias(texto: string, alvo: string): number {
  const corpo = escapar(alvo.trim()).replace(/\s+/g, "\\s+");
  const padrao = new RegExp(`(?<![\\p{L}\\d])${corpo}(?![\\p{L}\\d])`, "giu");
  return [...texto.matchAll(padrao)].length;
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

/** O que a tela mostra do campo: o `naTela` de cada molde que o declara e o rótulo do Anexo B. */
function esperados(c: CampoAnexo, venda: VendaAgi, indices: number[]) {
  const valor = valorDoCampo(venda, c.caminho, indices);
  const lista: { texto: string; porItem: boolean }[] = [];
  for (const declarados of Object.values(MOLDES)) {
    for (const d of declarados) {
      if (d.caminho !== c.caminho) continue;
      if (d.naTela.tipo === "valor") {
        const formatado = formatarCampo(c, valor);
        const texto = d.naTela.transformar ? d.naTela.transformar(formatado) : formatado;
        lista.push({ texto, porItem: true });
      } else {
        lista.push({ texto: d.naTela.texto, porItem: d.naTela.tipo === "rotulo" });
      }
    }
  }
  lista.push({ texto: rotuloNaTela(c), porItem: true });
  return lista;
}

/** Em Mais detalhes e Códigos do Stur, o par de um item de lista diz de que item é. */
const ITEM_DA_LISTA: Record<string, string> = {
  detalheItem: "serviço",
  recebimentos: "recebimento",
  pagamentos: "pagamento",
  reembolsoVinculado: "reembolso",
  financeiroVinculado: "título",
};

function rotuloNaTela(c: CampoAnexo): string {
  const raiz = c.caminho.split(/[.[]/)[0] ?? "";
  const item = ITEM_DA_LISTA[raiz];
  return c.secao >= 8 && c.caminho.includes("[]") && item ? `${c.rotulo}, ${item}` : c.rotulo;
}

/** O campo está na seção: alguma forma de o achar aparece, uma vez por item preenchido. */
function achado(texto: string, c: CampoAnexo, venda: VendaAgi, itens: number[][]): boolean {
  const [primeiro] = itens;
  if (primeiro === undefined) return true;
  return esperados(c, venda, primeiro).some(
    (e) => ocorrencias(texto, e.texto) >= (e.porItem ? itens.length : 1),
  );
}

function faltando(escopo: ParentNode, dados: VendaConsultada, campos: Campo[]): string[] {
  const textos = new Map<number, string>();
  const texto = (secao: number) => {
    if (!textos.has(secao)) textos.set(secao, textoDaSecao(escopo, secao));
    return textos.get(secao) ?? "";
  };
  return campos
    .filter(({ campo, itens }) => !achado(texto(campo.secao), campo, dados.venda, itens))
    .map(({ campo, itens }) => `${campo.caminho} (seção ${campo.secao}, ${itens.length} itens)`);
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
    const base = vendaCheia("diversos");
    const dados: VendaConsultada = {
      ...base,
      venda: { ...base.venda, nomeproduto: "INCENTIVO" },
      calculos: { ...base.calculos, tipo: "incentivo" },
    };
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
  });
});
