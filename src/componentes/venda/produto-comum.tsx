import type { ReactNode } from "react";
import type { CalculosVenda, ServicoAgi, VendaAgi } from "@/contrato/tipos";
import type { CampoAnexo } from "@/lib/venda/anexo-b";
import { preenchido } from "@/lib/venda/campos";
import { linhaDaPessoa } from "@/lib/venda/pessoas";
import { GrupoDeCampos, type NivelDeTitulo } from "./GrupoDeCampos";

/** O texto do campo sem espaços nas pontas, ou nulo pela regra do vazio (`caminho` nos de data e hora). */
export function texto(valor: string | null | undefined, caminho?: string): string | null {
  if (!preenchido(valor, caminho) || valor === null || valor === undefined) return null;
  return valor.trim() === "" ? null : valor.trim();
}

/** A raiz de uma seção do conteúdo do produto (Anexo B, seção 3), com o título no nível da seção. */
export function SecaoDoProduto({
  titulo,
  nivelBase,
  children,
}: Readonly<{ titulo: string; nivelBase: 1 | 2; children: ReactNode }>) {
  const Titulo = nivelBase === 1 ? "h2" : "h3";
  return (
    <section data-anexo-secao="3" className="mt-10">
      <Titulo className="text-xl leading-7 font-semibold">{titulo}</Titulo>
      {children}
    </section>
  );
}

/** `secao` 4: a pessoa que o cartão mostra, que o teste do Anexo B procura na seção dela. */
export type ParDoCartao = { rotulo: string; valor: ReactNode; secao?: 4 };

export function ParesDoCartao({ pares }: Readonly<{ pares: ParDoCartao[] }>) {
  if (pares.length === 0) return null;
  return (
    <dl className="mt-3 grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm leading-5">
      {pares.map((par) => (
        <div key={par.rotulo} className="contents" data-anexo-secao={par.secao}>
          <dt className="text-texto-auxiliar">{par.rotulo}</dt>
          <dd className="tabular-nums break-words">{par.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "Hóspede" ou "Condutor" com o nome e o nome da reserva, como `linhaDaPessoa` os escreve. */
export function parDaPessoa(venda: VendaAgi, servico: ServicoAgi): ParDoCartao | null {
  const linha = linhaDaPessoa(
    servico,
    venda.classificacaoproduto ?? null,
    null,
    venda.nomeproduto ?? null,
  );
  if (linha === null) return null;
  const corte = linha.indexOf(" ");
  return { rotulo: linha.slice(0, corte), valor: linha.slice(corte + 1), secao: 4 };
}

/** O nome do grupo no Anexo B sem a anotação entre parênteses: "Itinerário (aéreo e rodoviário)" vira "Itinerário". */
export function nomeDoGrupo(grupo: string): string {
  return grupo.replace(/\s*\(.*\)\s*$/, "");
}

/**
 * O que o molde não mostra de um grupo do Anexo B, logo depois dele (cobertura do Anexo B): os
 * campos visíveis como pares, sem título novo (o da seção já é o do grupo), e os recolhidos num
 * `details` com o nome do grupo.
 */
export function RestoDoGrupo({
  grupo,
  campos,
  venda,
  calculos,
  indices,
  nivel,
}: Readonly<{
  grupo: string;
  campos: CampoAnexo[];
  venda: VendaAgi;
  calculos: CalculosVenda;
  indices: number[];
  nivel: NivelDeTitulo;
}>) {
  const comuns = { titulo: nomeDoGrupo(grupo), venda, calculos, indices, nivel };
  return (
    <>
      <GrupoDeCampos
        campos={campos.filter((c) => c.aparece !== "recolhido")}
        semTitulo
        className="mt-6"
        {...comuns}
      />
      <GrupoDeCampos
        campos={campos.filter((c) => c.aparece === "recolhido")}
        recolhido
        className="mt-2"
        {...comuns}
      />
    </>
  );
}
