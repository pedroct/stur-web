/** O selo da situação no Stur, em `lib` (IA 7.4); o `Selo` traduz o ícone. */

import { type Situacao, situacaoDe } from "@/lib/consulta/consulta";
import { maiuscula } from "@/lib/consulta/descricao";
import type { SeloTexto } from "./lancamentos";

const SELOS: Record<Situacao, SeloTexto> = {
  fechada: { tom: "sucesso", icone: "check", rotulo: "Fechada" },
  confirmada: { tom: "info", icone: "info", rotulo: "Confirmada" },
  reservada: { tom: "neutro", icone: "relogio", rotulo: "Reservada" },
  cancelada: { tom: "neutro-borda", icone: "x", rotulo: "Cancelada" },
};

/** Situação desconhecida: selo neutro com a palavra da API; só a nula fica sem selo. */
export function seloTextoDaSituacao(situacao: string | null): SeloTexto | null {
  if (situacao === null) return null;
  const conhecida = situacaoDe(situacao);
  if (conhecida !== null) return SELOS[conhecida];
  return { tom: "neutro", icone: "info", rotulo: maiuscula(situacao.trim().toLowerCase()) };
}
