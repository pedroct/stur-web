import Link from "next/link";
import { Caminho } from "@/componentes/moldura/Caminho";
import { Button, buttonVariants } from "@/componentes/ui/button";
import type { ResultadoConsulta } from "@/contrato/tipos";
import { type Consulta, escreverConsulta } from "@/lib/consulta/consulta";
import { descreverFiltros, tituloConsulta, tituloCurto } from "@/lib/consulta/descricao";
import { formatarDadosAte } from "@/lib/formatacao";
import { formatarHora } from "@/lib/tempo";

/** Caminho, título, a linha do que foi consultado e as ações. */
export function CabecalhoResultado({
  consulta,
  resultado,
  aoAtualizar,
}: Readonly<{
  consulta: Consulta;
  resultado: ResultadoConsulta;
  aoAtualizar: () => void;
}>) {
  const { consultadoEm, dadosDoSturAte, periodoPassaDaCopia } = resultado;
  const dadosAte = dadosDoSturAte !== null && !periodoPassaDaCopia ? dadosDoSturAte : null;
  const linhaDeBaixo = [
    descreverFiltros(consulta),
    `Consultado às ${formatarHora(consultadoEm)}`,
    ...(dadosAte === null ? [] : [`Dados do Stur até ${formatarDadosAte(dadosAte)}`]),
  ].join(" · ");

  return (
    <>
      <Caminho niveis={[{ rotulo: tituloCurto(consulta) }]} />
      <section className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-[1_1_35rem]">
          <h1 className="text-[30px] leading-[38px] font-bold tracking-[-0.01em]">
            {tituloConsulta(consulta)}
          </h1>
          <p className="mt-1 text-sm leading-5 text-texto-auxiliar">{linhaDeBaixo}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/?${escreverConsulta(consulta)}`}
            className={buttonVariants({ variant: "secundaria", size: "compacto" })}
          >
            Alterar consulta
          </Link>
          <Button
            variant="secundaria"
            size="compacto"
            title="Atualizar (u)"
            aria-keyshortcuts="u"
            onClick={aoAtualizar}
          >
            Atualizar
          </Button>
        </div>
      </section>
    </>
  );
}
