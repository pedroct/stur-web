import { Button } from "@/componentes/ui/button";
import { useAtalho } from "@/lib/atalhos";
import { formatarDadosAte } from "@/lib/formatacao";
import { formatarHora } from "@/lib/tempo";
import { usePainel } from "./painel-contexto";

/** "Consultado às {hh}h{mm} · Atualizar · Dados do Stur até …". A tecla `u` faz o mesmo que o botão: desligada enquanto atualiza e com um painel aberto. */
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
  const { painelAberto } = usePainel();
  useAtalho("u", aoAtualizar, !atualizando && !painelAberto);
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
