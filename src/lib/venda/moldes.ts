/**
 * O que cada molde da venda mostra (Global Constraints, Cobertura do Anexo B). Cada task que faz
 * um molde declara aqui os caminhos dele, com o `naTela` que o teste do Anexo B procura; o resto
 * do grupo aparece pelo `GrupoDeCampos`, por `camposSemMolde`.
 */

import { maiuscula } from "@/lib/consulta/descricao";
import { CAMPOS_ANEXO_B, type CampoAnexo } from "./anexo-b";
import { nomeDoProduto } from "./cabecalho";

export type Molde =
  | "cabecalho"
  | "financeiro"
  | "lancamento"
  | "itinerario"
  | "hospedagem"
  | "veiculo"
  | "servicos"
  | "pessoa"
  | "conta"
  | "vinculos"
  | "mais-detalhes"
  | "codigos"
  | "incentivo";

/** `valor`: o valor formatado pela regra do `GrupoDeCampos`, passado por `transformar`. */
export type NaTela =
  | { tipo: "rotulo" | "coluna"; texto: string }
  | { tipo: "valor"; transformar?: (formatado: string) => string };

export type CampoDoMolde = { caminho: string; naTela: NaTela };

function valor(caminho: string, transformar?: (formatado: string) => string): CampoDoMolde {
  return { caminho, naTela: { tipo: "valor", transformar } };
}

const reais = (formatado: string) => `R$ ${formatado}`;

export const MOLDES: Record<Molde, CampoDoMolde[]> = {
  // O cabeçalho junta vários campos em frases (o subtítulo, o selo da situação): cada um aparece
  // dentro do texto que o contém.
  cabecalho: [
    valor("reserva", (f) => `Reserva ${f}`),
    valor("status", (f) => `${maiuscula(f.trim().toLowerCase())} no Stur`),
    valor("nomeproduto", (f) => nomeDoProduto(f, null)),
    valor("classificacaoproduto", (f) => `(${f})`),
    valor("categoriaproduto", (f) => f.toLowerCase()),
    valor("nomecliente"),
    valor("dtemissao", (f) => `emitida em ${f}`),
    valor("nomefornec"),
    valor("dtalteracaovinculado", (f) => `Dados do Stur até ${f.replace(/\/\d{4} · /, ", ")}`),
  ],
  // Os cartões: o total, o saldo de cada lado e a margem, em reais.
  financeiro: [
    valor("totalCliente", reais),
    valor("totalFornecedor", reais),
    valor("margemLucroBruta", reais),
    valor("totalAReceberCliente", reais),
    valor("totalRecebidoCliente", reais),
    valor("totalAPagarFornec", reais),
    valor("totalPagoFornec", reais),
    valor("totalAReceberFornecedor", reais),
    valor("totalRecebidoFornec", reais),
    valor("taxasAdministrativas", reais),
  ],
  // O que a linha do cartão mostra: a forma em minúsculas e o valor. O vencimento só entra no selo
  // dos em aberto, e os documentos e o cartão saem de outros campos: eles ficam nos detalhes.
  lancamento: [
    valor("recebimentos[].descricaoForma", (f) => f.toLowerCase()),
    valor("recebimentos[].valor", reais),
    valor("pagamentos[].descricaoForma", (f) => f.toLowerCase()),
    valor("pagamentos[].valor", reais),
  ],
  itinerario: [],
  hospedagem: [],
  veiculo: [],
  servicos: [],
  pessoa: [],
  conta: [],
  vinculos: [],
  "mais-detalhes": [],
  codigos: [],
  incentivo: [],
};

/** Os campos do grupo que nenhum dos moldes declarou, na ordem do Anexo B, sem os contêineres. */
export function camposSemMolde(grupo: string, moldes: Molde[]): CampoAnexo[] {
  const declarados = new Set(moldes.flatMap((m) => MOLDES[m].map((c) => c.caminho)));
  return CAMPOS_ANEXO_B.filter(
    (c) => c.grupo === grupo && !c.conteiner && !declarados.has(c.caminho),
  );
}
