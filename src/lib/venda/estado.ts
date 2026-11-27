/**
 * O selo do estado do serviço e a frase da origem dele (decisões 1 e 2). Contar dias é uma das
 * contas de data do frontend, exceção registrada na decisão 1.
 */

import type { EstadoServico } from "@/contrato/tipos";
import { contarDias } from "@/lib/consulta/atalhos-periodo";
import { type Classificacao, classificacaoDe } from "@/lib/consulta/consulta";
import { normalizar } from "@/lib/textos";
import { dataSolta, periodoCurto } from "./datas";
import { SUBSTANTIVO_POR_PRODUTO } from "./parametros";

type Substantivo = { s: string; genero: "o" | "a" };

/** O substantivo antes do serviço ("a acontecer") e durante ou depois dele, por classificação. */
const SUBSTANTIVOS: Record<Classificacao, { antes: Substantivo; depois: Substantivo }> = {
  aereo: { antes: { s: "Voo", genero: "o" }, depois: { s: "Viagem", genero: "a" } },
  rodoviario: { antes: { s: "Viagem", genero: "a" }, depois: { s: "Viagem", genero: "a" } },
  hotelaria: { antes: { s: "Hospedagem", genero: "a" }, depois: { s: "Hospedagem", genero: "a" } },
  locacao: { antes: { s: "Locação", genero: "a" }, depois: { s: "Locação", genero: "a" } },
  pacote: { antes: { s: "Pacote", genero: "o" }, depois: { s: "Pacote", genero: "o" } },
  diversos: { antes: { s: "Serviço", genero: "o" }, depois: { s: "Serviço", genero: "o" } },
};

const DIAS_PARA_CONTAR = 7;

function substantivo(
  classificacao: string | null,
  produto: string | null,
  momento: "antes" | "depois",
): Substantivo {
  const c = classificacaoDe(classificacao) ?? "diversos";
  if (c === "diversos" && produto !== null) {
    const nome = normalizar(produto);
    const troca = SUBSTANTIVO_POR_PRODUTO.find((p) => nome.startsWith(normalizar(p.prefixo)));
    if (troca !== undefined) return { s: troca.substantivo, genero: troca.genero };
  }
  return SUBSTANTIVOS[c][momento];
}

export function textoDoEstado(
  e: EstadoServico,
  classificacao: string | null,
  produto: string | null,
  hoje: string,
): string {
  switch (e.estado) {
    case "a_acontecer": {
      const { s } = substantivo(classificacao, produto, "antes");
      const n = contarDias(hoje, e.inicio) - 1;
      if (n > DIAS_PARA_CONTAR) return `${s} a acontecer, de ${periodoCurto(e.inicio, e.fim)}`;
      const data = dataSolta(e.inicio, hoje);
      return n === 1 ? `${s} amanhã, ${data}` : `${s} em ${n} dias, ${data}`;
    }
    case "em_andamento": {
      const { s } = substantivo(classificacao, produto, "depois");
      return `${s} em andamento, até ${dataSolta(e.fim, hoje)}`;
    }
    case "concluido": {
      const { s, genero } = substantivo(classificacao, produto, "depois");
      return `${s} concluíd${genero} em ${dataSolta(e.fim, hoje)}`;
    }
  }
}

export function fraseDoEstado(
  e: EstadoServico,
  classificacao: string | null,
  produto: string | null,
): string {
  switch (e.base) {
    case "trechos":
      return "A situação da viagem vem das datas dos trechos.";
    case "entrada_saida":
      return "A situação da hospedagem vem das datas de entrada e saída.";
    case "retirada_devolucao":
      return "A situação da locação vem das datas de retirada e devolução.";
    case "inicio_termino": {
      const { s, genero } = substantivo(classificacao, produto, "depois");
      return `A situação d${genero} ${s.toLowerCase()} vem das datas de início e término dos serviços.`;
    }
  }
}
