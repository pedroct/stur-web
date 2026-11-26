/**
 * O que cada molde da venda mostra (Global Constraints, Cobertura do Anexo B). Cada task que faz
 * um molde declara aqui os caminhos dele, com o `naTela` que o teste do Anexo B procura; o resto
 * do grupo aparece pelo `GrupoDeCampos`, por `camposSemMolde`.
 */

import { CAMPOS_ANEXO_B, type CampoAnexo } from "./anexo-b";

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

export const MOLDES: Record<Molde, CampoDoMolde[]> = {
  cabecalho: [],
  financeiro: [],
  lancamento: [],
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

/** Os campos do grupo que nenhum dos moldes declarou, na ordem do Anexo B. */
export function camposSemMolde(grupo: string, moldes: Molde[]): CampoAnexo[] {
  const declarados = new Set(moldes.flatMap((m) => MOLDES[m].map((c) => c.caminho)));
  return CAMPOS_ANEXO_B.filter((c) => c.grupo === grupo && !declarados.has(c.caminho));
}
