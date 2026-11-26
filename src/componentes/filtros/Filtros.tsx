"use client";

import { useId, useState } from "react";
import { Pilula } from "@/componentes/comum/Pilula";
import { CLASSIFICACOES, type Consulta, SITUACOES, temFiltro } from "@/lib/consulta/consulta";
import { resumoMarcados } from "@/lib/consulta/descricao";
import { cn } from "@/lib/utils";

const CAMPOS_DE_TEXTO = [
  { campo: "cliente", rotulo: "Cliente", limite: false },
  { campo: "fornecedor", rotulo: "Fornecedor", limite: false },
  { campo: "emissor", rotulo: "Emissor", limite: true },
] as const;

function alternar<T>(lista: readonly T[], item: T): T[] {
  return lista.includes(item) ? lista.filter((i) => i !== item) : [...lista, item];
}

function GrupoDePilulas<T extends string>({
  titulo,
  opcoes,
  marcadas,
  aoAlternar,
}: {
  titulo: string;
  opcoes: { valor: T; rotulo: string }[];
  marcadas: readonly T[];
  aoAlternar: (valor: T) => void;
}) {
  const idDoTitulo = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={idDoTitulo} className="text-sm font-semibold">
        {titulo}
      </span>
      <div role="group" aria-labelledby={idDoTitulo} className="flex flex-wrap gap-2">
        {opcoes.map(({ valor, rotulo }) => (
          <Pilula
            key={valor}
            pressionada={marcadas.includes(valor)}
            onClick={() => aoAlternar(valor)}
          >
            {rotulo}
          </Pilula>
        ))}
      </div>
    </div>
  );
}

export type PropsDosFiltros = {
  modo: "consulta";
  valor: Consulta;
  aoMudar: (consulta: Consulta) => void;
};

/**
 * Filtros opcionais da consulta. Recolhido quando chega sem filtro, aberto quando chega com
 * algum; nada marcado vale todas as vendas, então não há pílula "Todas".
 */
export function Filtros({ valor, aoMudar }: PropsDosFiltros) {
  const [aberto, setAberto] = useState(() => temFiltro(valor));
  const prefixo = useId();

  return (
    <details
      open={aberto}
      onToggle={(evento) => setAberto(evento.currentTarget.open)}
      className="rounded-medio border border-borda px-6"
    >
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-semibold">
        Filtros (opcionais, com número ou período){" "}
        <span className="font-normal text-texto-auxiliar">· {resumoMarcados(valor)}</span>
      </summary>
      <div className="flex flex-col gap-4 pt-1 pb-6">
        <GrupoDePilulas
          titulo="Situação no Stur"
          opcoes={SITUACOES}
          marcadas={valor.situacao}
          aoAlternar={(s) => aoMudar({ ...valor, situacao: alternar(valor.situacao, s) })}
        />
        <GrupoDePilulas
          titulo="Produto"
          opcoes={CLASSIFICACOES}
          marcadas={valor.classificacao}
          aoAlternar={(c) => aoMudar({ ...valor, classificacao: alternar(valor.classificacao, c) })}
        />
        <div className="flex flex-col gap-4">
          {CAMPOS_DE_TEXTO.map(({ campo, rotulo, limite }) => {
            const id = `${prefixo}-${campo}`;
            return (
              <div key={campo} className="flex min-w-0 flex-col gap-2">
                <label htmlFor={id} className="text-sm font-semibold">
                  {rotulo}
                </label>
                <input
                  id={id}
                  autoComplete="off"
                  placeholder="Nome ou parte do nome"
                  value={valor[campo] ?? ""}
                  onChange={(evento) =>
                    aoMudar({
                      ...valor,
                      [campo]: evento.target.value === "" ? null : evento.target.value,
                    })
                  }
                  className={cn(
                    "h-alvo w-full rounded-pequeno border border-borda-controle bg-superficie px-4 text-base text-texto-principal placeholder:text-texto-auxiliar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco",
                    limite && "max-w-[300px]",
                  )}
                />
              </div>
            );
          })}
        </div>
        <p className="text-sm leading-5 text-texto-auxiliar">
          Sem marcar nada, vêm todas as vendas. Os campos aceitam parte do nome, e Fornecedor
          procura a operadora e também a companhia, o hotel ou a empresa de ônibus.
        </p>
        <p className="text-[13px] leading-5 text-estado-info">
          A consulta só vai à API do Stur quando você clica em Consultar. Depois, dá para refinar o
          resultado sem consultar de novo.
        </p>
        {temFiltro(valor) && (
          <button
            type="button"
            onClick={() =>
              aoMudar({
                ...valor,
                situacao: [],
                classificacao: [],
                fornecedor: null,
                cliente: null,
                emissor: null,
              })
            }
            className="h-alvo self-start cursor-pointer rounded-pilula border border-borda bg-transparent px-4 text-sm font-medium text-texto-principal outline-0 transition-colors duration-150 hover:bg-superficie-sutil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </details>
  );
}
