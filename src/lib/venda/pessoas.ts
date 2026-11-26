/** A linha da pessoa do serviço: passageiro, hóspede, condutor ou segurado (IA 6.5). */

import type { ServicoAgi } from "@/contrato/tipos";
import { type Classificacao, classificacaoDe } from "@/lib/consulta/consulta";
import { normalizar } from "@/lib/textos";
import { preenchido } from "./campos";

const PAPEIS: Record<Classificacao, string> = {
  aereo: "Passageiro",
  rodoviario: "Passageiro",
  pacote: "Passageiro",
  hotelaria: "Hóspede",
  locacao: "Condutor",
  diversos: "Passageiro",
};

const ROTULOS_DO_NOME: Partial<Record<Classificacao, string>> = {
  aereo: "no bilhete",
  rodoviario: "na passagem",
};

function texto(valor: string | null | undefined): string | null {
  return preenchido(valor) && valor ? valor.trim() : null;
}

/** Sem caixa, espaços e a barra do nome do bilhete ("FULANO/TESTE"). */
function chave(nome: string): string {
  return normalizar(nome).replace(/[\s/]/g, "");
}

/**
 * "{Papel} {nomePaxCompleto}{, tipo} · {rótulo}: {nomePax} · bilhete {bilhete} · localizador {x}",
 * sem as partes vazias; `null` sem nome nenhum. `produto` dá "Segurado" ao produto `SEGURO`.
 */
export function linhaDaPessoa(
  s: ServicoAgi,
  classificacao: string | null,
  localizador: string | null,
  produto: string | null,
): string | null {
  const completo = texto(s.nomePaxCompleto);
  const doLancamento = texto(s.nomePax);
  const nome = completo ?? doLancamento;
  if (nome === null) return null;
  const c = classificacaoDe(classificacao) ?? "diversos";
  const seguro = produto !== null && normalizar(produto).startsWith("SEGURO");
  const papel = seguro ? "Segurado" : PAPEIS[c];
  const tipo = texto(s.descricaoSiglaTipoPax)?.toLowerCase() ?? null;
  const repete =
    completo !== null && doLancamento !== null && chave(completo) !== chave(doLancamento);
  const bilhete = texto(s.bilhete);
  const codigo = texto(localizador);
  return [
    `${papel} ${nome}${tipo === null ? "" : `, ${tipo}`}`,
    repete ? `${ROTULOS_DO_NOME[c] ?? "na reserva"}: ${doLancamento}` : null,
    bilhete === null ? null : `bilhete ${bilhete}`,
    codigo === null ? null : `localizador ${codigo}`,
  ]
    .filter((p) => p !== null)
    .join(" · ");
}
