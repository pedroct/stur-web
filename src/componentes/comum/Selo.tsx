import { Calendar, Check, CircleX, Clock, CreditCard, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SeloTexto } from "@/lib/venda/lancamentos";
import { seloTextoDaSituacao } from "@/lib/venda/situacao";

export type TomDoSelo = "sucesso" | "info" | "atencao" | "neutro" | "erro";

const TONS: Record<TomDoSelo, string> = {
  sucesso: "bg-estado-sucesso-fundo text-estado-sucesso",
  info: "bg-estado-info-fundo text-estado-info",
  atencao: "bg-estado-atencao-fundo text-estado-atencao",
  erro: "bg-estado-erro-fundo text-estado-erro",
  neutro: "bg-superficie-sutil text-texto-principal",
};

/** Selo com ícone e palavra: a cor sozinha nunca diz a situação. */
export function Selo({
  tom,
  icone: Icone,
  borda = false,
  children,
}: Readonly<{
  tom: TomDoSelo;
  icone: LucideIcon;
  borda?: boolean;
  children: ReactNode;
}>) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-pilula border px-3 py-1 text-xs leading-4 font-semibold whitespace-nowrap",
        TONS[tom],
        borda ? "border-borda-controle" : "border-transparent",
      )}
    >
      <Icone className="size-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

export interface DadosDoSelo {
  tom: TomDoSelo;
  icone: LucideIcon;
  borda: boolean;
  texto: string;
}

const ICONES: Record<SeloTexto["icone"], LucideIcon> = {
  check: Check,
  info: Info,
  relogio: Clock,
  calendario: Calendar,
  x: CircleX,
  cartao: CreditCard,
};

/** O selo em texto (`lib`) com o ícone de verdade; `neutro-borda` é o neutro com borda. */
export function dadosDoSeloTexto(s: SeloTexto): DadosDoSelo {
  return {
    tom: s.tom === "neutro-borda" ? "neutro" : s.tom,
    icone: ICONES[s.icone],
    borda: s.tom === "neutro-borda",
    texto: s.rotulo,
  };
}

/** Situação que o Stur mandou, ainda como texto; uma situação desconhecida mostra a palavra dele. */
export function seloDaSituacao(situacao: string | null): DadosDoSelo | null {
  const selo = seloTextoDaSituacao(situacao);
  return selo === null ? null : dadosDoSeloTexto(selo);
}
