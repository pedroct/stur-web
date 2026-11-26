"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId } from "react";
import { CLASSE_DO_CONTROLE } from "@/componentes/comum/controle";
import { Button } from "@/componentes/ui/button";
import type { Pagina } from "@/lib/resultado/paginar";
import { cn } from "@/lib/utils";

const SETA = "w-alvo px-0";

/** Por página, a faixa mostrada e as setas, embaixo e à direita da tabela. */
export function Paginacao({
  pagina,
  por,
  opcoes,
  aoMudarPor,
  aoIrPara,
}: Readonly<{
  pagina: Pagina<unknown>;
  por: number;
  opcoes: number[];
  aoMudarPor: (por: number) => void;
  aoIrPara: (pagina: number) => void;
}>) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm text-texto-auxiliar tabular-nums">
      <div className="flex items-center gap-2">
        <label htmlFor={id}>Por página</label>
        <select
          id={id}
          value={por}
          onChange={(evento) => aoMudarPor(Number(evento.target.value))}
          className={cn(CLASSE_DO_CONTROLE, "px-3 text-sm font-medium")}
        >
          {opcoes.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <span aria-live="polite">
          {pagina.primeira}–{pagina.ultima} de {pagina.total}
        </span>
        <Button
          variant="secundaria"
          className={SETA}
          aria-label="Página anterior"
          disabled={pagina.pagina <= 1}
          onClick={() => aoIrPara(pagina.pagina - 1)}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button
          variant="secundaria"
          className={SETA}
          aria-label="Próxima página"
          disabled={pagina.pagina >= pagina.paginas}
          onClick={() => aoIrPara(pagina.pagina + 1)}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
