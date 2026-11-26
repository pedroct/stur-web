import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { VendaConsultada } from "@/contrato/tipos";
import { cn } from "@/lib/utils";
import { CAMPOS_ANEXO_B } from "@/lib/venda/anexo-b";
import { GRUPOS_MAIS_DETALHES, preenchido, valorDoCampo } from "@/lib/venda/campos";
import { camposSemMolde } from "@/lib/venda/moldes";
import { type BlocoSemEquivalente, fraseSemEquivalente } from "@/lib/venda/sem-equivalente";
import { paresComItem } from "./GrupoDeCampos";

export type ParDaTela = { rotulo: string; valor: string };

/** Os pares de rótulo e valor de Mais detalhes e de Códigos do Stur, como no canvas. */
export function ListaDePares({
  pares,
  mono = false,
}: Readonly<{ pares: ParDaTela[]; mono?: boolean }>) {
  if (pares.length === 0) return null;
  return (
    <dl className="mt-3 grid grid-cols-[minmax(0,13.75rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm leading-5">
      {pares.map((par) => (
        <div key={par.rotulo} className="contents">
          <dt className="text-texto-auxiliar">{par.rotulo}</dt>
          <dd className={cn("break-words tabular-nums", mono && "font-mono text-[13px]")}>
            {par.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A seção recolhida do fim da página, com o título no `summary`. */
export function SecaoRecolhida({
  secao,
  nivelBase,
  titulo,
  children,
}: Readonly<{ secao: 8 | 9; nivelBase: 1 | 2; titulo: ReactNode; children: ReactNode }>) {
  const Titulo = nivelBase === 1 ? "h2" : "h3";
  return (
    <details
      data-anexo-secao={secao}
      className={cn("group border-t border-borda pt-2", secao === 8 ? "mt-10" : "mt-4")}
    >
      <summary className="flex min-h-alvo cursor-pointer items-center gap-2">
        <ChevronRight
          className="size-4 shrink-0 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        <Titulo className="text-base leading-6 font-semibold">{titulo}</Titulo>
      </summary>
      <div className="pb-2 pl-6">{children}</div>
    </details>
  );
}

/** Os blocos da IA 11 que têm seção na página: a nota RF-09 fala só deles. */
function blocosNaPagina(dados: VendaConsultada): BlocoSemEquivalente[] {
  const { venda, calculos } = dados;
  const servicos = venda.detalheItem ?? [];
  const comPessoa = CAMPOS_ANEXO_B.some(
    (c) =>
      c.secao === 4 &&
      !c.conteiner &&
      servicos.some((_, i) => preenchido(valorDoCampo(venda, c.caminho, [i]), c.caminho)),
  );
  const blocos: [BlocoSemEquivalente, boolean][] = [
    ["identificacao", true],
    ["servicos", servicos.length > 0],
    ["pessoa", comPessoa],
    ["tarifas", servicos.length > 0 && calculos.tipo !== "incentivo"],
    ["recebimentos", (venda.recebimentos ?? []).length > 0],
    ["pagamentos", (venda.pagamentos ?? []).length > 0],
  ];
  return blocos.filter(([, tem]) => tem).map(([bloco]) => bloco);
}

/** Os grupos da seção 8, na ordem do Anexo B. */
const GRUPOS_DA_SECAO = [
  ...new Set(CAMPOS_ANEXO_B.filter((c) => c.secao === 8).map((c) => c.grupo)),
];

/**
 * "Mais detalhes da venda" (IA 6.9; Anexo B, seção 8), recolhido: os cinco grupos em títulos de
 * grupo, com os pares do canvas e, com o rótulo do Anexo B, os campos que esses pares não usam. No
 * fim, a nota dos campos que o Stur mostra e a API não traz (RF-09).
 */
export function MaisDetalhes({
  dados,
  nivelBase,
}: Readonly<{ dados: VendaConsultada; nivelBase: 1 | 2 }>) {
  const { venda } = dados;
  const TituloDoGrupo = nivelBase === 1 ? "h3" : "h4";
  const grupos = GRUPOS_DA_SECAO.map((grupo) => {
    const doCanvas = GRUPOS_MAIS_DETALHES.find((g) => g.grupo === grupo)?.pares ?? [];
    const pares = doCanvas.flatMap((p) => {
      const valor = p.valor(venda);
      return valor === null ? [] : [{ rotulo: p.rotulo(venda), valor }];
    });
    return {
      grupo,
      pares: [...pares, ...paresComItem(camposSemMolde(grupo, ["mais-detalhes"]), venda)],
    };
  }).filter((g) => g.pares.length > 0);
  const nota = fraseSemEquivalente(blocosNaPagina(dados));

  return (
    <SecaoRecolhida secao={8} nivelBase={nivelBase} titulo="Mais detalhes da venda">
      {grupos.map(({ grupo, pares }) => (
        <section key={grupo} className="mt-4">
          <TituloDoGrupo className="text-sm leading-5 font-semibold">{grupo}</TituloDoGrupo>
          <ListaDePares pares={pares} />
        </section>
      ))}
      {nota !== "" && <p className="mt-5 text-[13px] leading-5 text-texto-auxiliar">{nota}</p>}
    </SecaoRecolhida>
  );
}
