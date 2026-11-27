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

/** O cartão com borda da hospedagem, do veículo e da conta (telas 2, 3 e 9). */
export const CARTAO = "mt-4 rounded-grande border border-borda p-5";

/**
 * A raiz de uma seção do conteúdo do produto (Anexo B, seção 3), com o título no nível da seção.
 * `cartao`: o conteúdo num cartão com borda, embaixo do título (a hospedagem e o veículo).
 */
export function SecaoDoProduto({
  titulo,
  nivelBase,
  cartao = false,
  children,
}: Readonly<{ titulo: string; nivelBase: 1 | 2; cartao?: boolean; children: ReactNode }>) {
  const Titulo = nivelBase === 1 ? "h2" : "h3";
  return (
    <section data-anexo-secao="3" className="mt-10">
      <Titulo className="text-xl leading-7 font-semibold">{titulo}</Titulo>
      {cartao ? <div className={CARTAO}>{children}</div> : children}
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

/** Os grupos da seção 3 que são de cada serviço (o itinerário é da venda). */
export const GRUPOS_DO_SERVICO_DA_SECAO_3 = [
  "Hospedagem (hotelaria)",
  "Veículo (locação)",
  "Itens (diversos e pacote)",
  "Confirmação do fornecedor",
];

/** O nome do grupo no Anexo B sem a anotação entre parênteses: "Itinerário (aéreo e rodoviário)" vira "Itinerário". */
export function nomeDoGrupo(grupo: string): string {
  const abre = grupo.indexOf("(");
  const fecha = grupo.trimEnd().length - 1;
  if (abre === -1 || fecha <= abre || grupo[fecha] !== ")") return grupo;
  return grupo.slice(0, abre).trimEnd();
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
