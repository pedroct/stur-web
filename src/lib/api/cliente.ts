import type { QueryVendas, ReservaConsultada, ResultadoConsulta } from "@/contrato/tipos";
import type { Consulta } from "@/lib/consulta/consulta";
import { textosDoErro } from "./textos-erro";

export type TipoErro =
  | "sem_resposta"
  | "acesso_recusado"
  | "formato"
  | "aplicacao"
  | "invalida"
  | "nao_encontrada"
  | "cancelada";

export const TEMPO_LIMITE_NAVEGADOR_MS = 180_000;

const TEMPO_LIMITE_PADRAO_S = 30;

type Opcoes = { sinal?: AbortSignal };

function mensagemPadrao(tipo: TipoErro): string {
  if (tipo === "cancelada") return "Consulta cancelada.";
  return textosDoErro(tipo).mensagem(TEMPO_LIMITE_PADRAO_S);
}

export class ErroDaConsulta extends Error {
  readonly tipo: TipoErro;
  readonly mensagem: string;
  readonly campo: string | null;
  readonly codigo: string | null;
  readonly detalhe: unknown;

  constructor(
    tipo: TipoErro,
    partes: {
      mensagem?: string;
      campo?: string | null;
      codigo?: string | null;
      detalhe?: unknown;
      causa?: unknown;
    } = {},
  ) {
    const mensagem = partes.mensagem ?? mensagemPadrao(tipo);
    super(mensagem, partes.causa === undefined ? undefined : { cause: partes.causa });
    this.name = "ErroDaConsulta";
    this.tipo = tipo;
    this.mensagem = mensagem;
    this.campo = partes.campo ?? null;
    this.codigo = partes.codigo ?? null;
    this.detalhe = partes.detalhe ?? null;
  }
}

type Envelope = {
  codigo: string;
  mensagem?: string;
  campo?: string | null;
  detalhe?: unknown;
};

function lerEnvelope(texto: string): Envelope | null {
  try {
    const json: unknown = JSON.parse(texto);
    if (typeof json !== "object" || json === null) return null;
    const { codigo, mensagem, campo, detalhe } = json as Record<string, unknown>;
    if (typeof codigo !== "string") return null;
    return {
      codigo,
      mensagem: typeof mensagem === "string" ? mensagem : undefined,
      campo: typeof campo === "string" ? campo : null,
      detalhe,
    };
  } catch {
    return null;
  }
}

const TIPO_PELO_CODIGO: Record<string, TipoErro> = {
  api_stur_sem_resposta: "sem_resposta",
  api_stur_acesso_recusado: "acesso_recusado",
  api_stur_resposta_invalida: "formato",
  venda_nao_encontrada: "nao_encontrada",
};

function traduzirResposta(status: number, texto: string): ErroDaConsulta {
  const envelope = lerEnvelope(texto);
  const partes = envelope && {
    mensagem: envelope.mensagem,
    campo: envelope.campo,
    codigo: envelope.codigo,
    detalhe: envelope.detalhe,
  };
  if (status === 504) return new ErroDaConsulta("sem_resposta", partes ?? {});
  if (!envelope) return new ErroDaConsulta("aplicacao");
  const tipo = TIPO_PELO_CODIGO[envelope.codigo];
  if (tipo && tipo !== "nao_encontrada") return new ErroDaConsulta(tipo, partes ?? {});
  if (status === 422) return new ErroDaConsulta("invalida", partes ?? {});
  return new ErroDaConsulta(tipo ?? "aplicacao", partes ?? {});
}

export async function buscarJson<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { sinal } = opcoes;
  const limite = new AbortController();
  // AbortSignal.timeout não obedece aos relógios falsos dos testes.
  const relogio = setTimeout(() => limite.abort(), TEMPO_LIMITE_NAVEGADOR_MS);
  try {
    const resposta = await fetch(new URL(caminho, location.origin), {
      signal: sinal ? AbortSignal.any([sinal, limite.signal]) : limite.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const texto = await resposta.text();
    if (!resposta.ok) throw traduzirResposta(resposta.status, texto);
    try {
      return JSON.parse(texto) as T;
    } catch (error) {
      throw new ErroDaConsulta("aplicacao", { causa: error });
    }
  } catch (error) {
    if (error instanceof ErroDaConsulta) throw error;
    if (sinal?.aborted) throw new ErroDaConsulta("cancelada", { causa: error });
    if (limite.signal.aborted) throw new ErroDaConsulta("sem_resposta", { causa: error });
    throw new ErroDaConsulta("aplicacao", { causa: error });
  } finally {
    clearTimeout(relogio);
  }
}

export function consultarReserva(numero: number, opcoes?: Opcoes): Promise<ReservaConsultada> {
  return buscarJson<ReservaConsultada>(`/api/v1/reservas/${numero}`, opcoes);
}

type OpcoesVendas = { atualizar?: boolean; sinal?: AbortSignal };

export function consultarVendas(
  c: Consulta,
  { atualizar, sinal }: OpcoesVendas = {},
): Promise<ResultadoConsulta> {
  // Tipado pelo schema gerado: um parâmetro renomeado no backend quebra o typecheck.
  const query: QueryVendas = {
    reserva: c.reserva,
    tipoData: c.tipoData,
    de: c.de,
    ate: c.ate,
    situacao: c.situacao,
    classificacao: c.classificacao,
    fornecedor: c.fornecedor,
    cliente: c.cliente,
    emissor: c.emissor,
    atualizar: atualizar ? true : undefined,
  };
  const params = new URLSearchParams();
  for (const [nome, valor] of Object.entries(query)) {
    if (valor === null || valor === undefined) continue;
    for (const item of Array.isArray(valor) ? valor : [valor]) params.append(nome, String(item));
  }
  return buscarJson<ResultadoConsulta>(`/api/v1/vendas?${params}`, { sinal });
}
