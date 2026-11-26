import { Button } from "@/componentes/ui/button";
import { formatarDadosAte } from "@/lib/formatacao";
import { formatarHora } from "@/lib/tempo";

/** "Consultado às {hh}h{mm} · Atualizar · Dados do Stur até …". A tecla `u` liga na Task 12. */
export function LinhaConsulta({
  consultadoEm,
  dadosDoSturAte,
  atualizando,
  aoAtualizar,
}: Readonly<{
  consultadoEm: string;
  dadosDoSturAte: string | null;
  atualizando: boolean;
  aoAtualizar: () => void;
}>) {
  return (
    <p className="text-[13px] leading-5 text-texto-auxiliar tabular-nums">
      Consultado às {formatarHora(consultadoEm)} ·{" "}
      <Button
        variant="texto"
        size="compacto"
        title="Atualizar (u)"
        aria-keyshortcuts="u"
        disabled={atualizando}
        onClick={aoAtualizar}
        className="h-auto min-h-alvo px-0 align-middle text-[13px] font-normal text-texto-principal disabled:bg-transparent"
      >
        Atualizar
      </Button>
      {dadosDoSturAte !== null && <> · Dados do Stur até {formatarDadosAte(dadosDoSturAte)}</>}
    </p>
  );
}
