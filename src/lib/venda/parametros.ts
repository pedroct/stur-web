/**
 * Parâmetros do frontend para os textos da venda, com padrão (memória "parâmetros não se
 * perguntam"). São constantes, e não campos de `GET /api/v1/parametros`.
 */

/** Em Diversos, o início do produto troca o substantivo do selo de estado (decisão 1). */
export const SUBSTANTIVO_POR_PRODUTO: {
  prefixo: string;
  substantivo: string;
  genero: "o" | "a";
}[] = [
  { prefixo: "SEGURO", substantivo: "Seguro", genero: "o" },
  { prefixo: "EVENTO", substantivo: "Evento", genero: "o" },
];

/** Palavras do nome do produto que saem ou viram outra (decisão 24); vazio tira a palavra. */
export const ABREVIACOES_DE_PRODUTO: Record<string, string> = {
  NAC: "",
  INT: "",
  TER: "terrestre",
};

/** Palavras do nome do produto que ganham acento (decisão 24). */
export const ACENTOS_DE_PRODUTO: Record<string, string> = {
  RODOVIARIO: "rodoviário",
  AEREO: "aéreo",
  ONIBUS: "ônibus",
  AEREA: "aérea",
};
