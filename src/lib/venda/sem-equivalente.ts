/**
 * Campos que o Stur mostra e a API não traz, por bloco (IA 11; PRD RF-09). Fica aqui, num arquivo
 * só, para ser atualizado se a AGI passar a enviar algum deles.
 */

import { unir } from "@/lib/consulta/descricao";

export type BlocoSemEquivalente =
  | "identificacao"
  | "servicos"
  | "pessoa"
  | "tarifas"
  | "recebimentos"
  | "pagamentos";

export const SEM_EQUIVALENTE: Record<BlocoSemEquivalente, string[]> = {
  identificacao: ["Forma de Pagamento (para cálculo de comissão)"],
  servicos: ["ISSQN"],
  pessoa: [
    "Data Nascimento",
    "Complemento",
    "Complemento Hóspede",
    "Outros Passageiros",
    "Requisição Governamental",
    "Sucursal",
    "Conta Contábil",
    "Observação Voucher",
  ],
  tarifas: ["Tipo de Pagamento", "Tarifa Balcão"],
  recebimentos: ["Condição de Recebimento", "Observação", "valor do Repassado ao Fornecedor"],
  pagamentos: ["Observação", "Nota Fiscal", "Responsável pelo Crédito"],
};

/** "O Stur também mostra {lista}, que a API não traz."; sem campo, texto vazio. */
export function fraseSemEquivalente(blocos: BlocoSemEquivalente[]): string {
  const campos = [...new Set(blocos.flatMap((b) => SEM_EQUIVALENTE[b]))];
  return campos.length === 0 ? "" : `O Stur também mostra ${unir(campos)}, que a API não traz.`;
}
