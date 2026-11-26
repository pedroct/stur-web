import { Clock } from "lucide-react";
import { Button } from "@/componentes/ui/button";

/** Linha de andamento da consulta; o leitor de tela ouve o texto. Com `aoCancelar`, leva o botão de cancelar. */
export function LinhaStatus({
  texto,
  aoCancelar,
}: Readonly<{ texto: string; aoCancelar?: () => void }>) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <output className="flex items-center gap-2 text-sm text-texto-auxiliar">
        <Clock className="size-4 shrink-0" aria-hidden="true" />
        {texto}
      </output>
      {aoCancelar && (
        <Button variant="secundaria" size="compacto" onClick={aoCancelar}>
          Cancelar consulta
        </Button>
      )}
    </div>
  );
}
