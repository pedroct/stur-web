import { contem } from "@/lib/textos";

/** Uma linha do JSON já indentado; juntar as partes na ordem refaz a linha original. */
export type LinhaJson = {
  /** O número da linha, a partir de 1. */
  n: number;
  recuo: string;
  chave: string;
  separador: string;
  valor: string;
  tipo: "texto" | "numero" | "literal" | "outro";
  /** A vírgula do fim, quando há. */
  fim: string;
};

/** Recuo, texto entre aspas (a chave, ou um item solto), `": "`, o resto e a vírgula do fim. */
const LINHA = /^(\s*)("(?:[^"\\]|\\.)*")?(: )?(.*?)(,?)$/;

/** Quantos links "linha n" a tela mostra; `achadas` guarda todas. */
export const ACHADOS_MOSTRADOS = 20;

function tipoDoValor(valor: string): LinhaJson["tipo"] {
  if (valor.startsWith('"')) return "texto";
  if (/^-?\d/.test(valor)) return "numero";
  if (/^(null|true|false)$/.test(valor)) return "literal";
  return "outro";
}

/**
 * Separa o texto do dado cru em linhas e classifica cada uma. O texto já vem indentado do
 * backend, com as chaves na ordem da AGI: nada é reformatado, e os números ficam como texto.
 */
export function linhasDoJson(texto: string): LinhaJson[] {
  const linhas = texto.split("\n");
  if (linhas.at(-1) === "") linhas.pop();
  return linhas.map((linha, i) => {
    const [, recuo = "", entreAspas = "", separador = "", resto = "", fim = ""] =
      LINHA.exec(linha) ?? [];
    // Texto entre aspas sem os dois-pontos é um item solto de lista, e não uma chave.
    const solto = entreAspas !== "" && separador === "";
    const chave = solto ? "" : entreAspas;
    const valor = solto ? entreAspas + resto : resto;
    return { n: i + 1, recuo, chave, separador, valor, tipo: tipoDoValor(valor), fim };
  });
}

/**
 * As linhas que têm `q`, sem diferença de maiúsculas e acentos, e a frase que diz quantas são.
 * A busca vazia não acha nada. A tela mostra só os 20 primeiros links, mas `achadas` guarda todas.
 */
export function buscarNoJson(
  linhas: LinhaJson[],
  q: string,
): { achadas: number[]; resumo: string } {
  if (q.trim() === "") return { achadas: [], resumo: "" };
  const achadas = linhas
    .filter((l) => contem(l.recuo + l.chave + l.separador + l.valor + l.fim, q))
    .map((l) => l.n);
  if (achadas.length === 0) return { achadas, resumo: "Nenhuma linha com esse texto." };
  if (achadas.length === 1) return { achadas, resumo: "1 linha:" };
  const resumo =
    achadas.length > ACHADOS_MOSTRADOS
      ? `${achadas.length} linhas; as ${ACHADOS_MOSTRADOS} primeiras:`
      : `${achadas.length} linhas:`;
  return { achadas, resumo };
}

const UMA_CASA = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Os bytes do texto em UTF-8 por 1.024, com uma casa: "6,7 KB". */
export function tamanhoEmKb(texto: string): string {
  return `${UMA_CASA.format(new TextEncoder().encode(texto).length / 1024)} KB`;
}
