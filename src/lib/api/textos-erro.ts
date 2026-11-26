import type { TipoErro } from "./cliente";

export type TipoComTexto = Exclude<TipoErro, "cancelada" | "invalida" | "nao_encontrada">;

export const TEXTOS_ERRO: Record<
  TipoComTexto,
  { titulo: string; mensagem: (segundos: number) => string; frase: (segundos: number) => string }
> = {
  sem_resposta: {
    titulo: "A API do Stur não respondeu",
    mensagem: (segundos) =>
      `A API do Stur não respondeu em ${segundos} segundos. Tente de novo em alguns minutos.`,
    frase: (segundos) => `A API do Stur não respondeu em ${segundos} segundos.`,
  },
  acesso_recusado: {
    titulo: "Acesso recusado pela API do Stur",
    mensagem: () =>
      "A API do Stur recusou o acesso desta aplicação. O acesso pode ter sido encerrado. Avise o Pedro.",
    frase: () => "A API do Stur recusou o acesso desta aplicação.",
  },
  formato: {
    titulo: "Resposta que a aplicação não reconhece",
    mensagem: () => "A API do Stur respondeu num formato que esta aplicação não reconhece.",
    frase: () => "A API do Stur respondeu num formato que esta aplicação não reconhece.",
  },
  aplicacao: {
    titulo: "Erro nesta aplicação",
    mensagem: () => "Algo deu errado nesta aplicação, não na API do Stur.",
    frase: () => "Algo deu errado nesta aplicação, não na API do Stur.",
  },
};

/** O tipo que tem texto; os sem texto próprio (cancelada, inválida, não encontrada) valem como erro da aplicação. */
export function tipoComTexto(tipo: TipoErro): TipoComTexto {
  return tipo in TEXTOS_ERRO ? (tipo as TipoComTexto) : "aplicacao";
}

/** Os textos do erro, pelo `tipoComTexto`. */
export function textosDoErro(tipo: TipoErro): (typeof TEXTOS_ERRO)[TipoComTexto] {
  return TEXTOS_ERRO[tipoComTexto(tipo)];
}
