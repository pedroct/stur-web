import { Check, CircleX, Clock, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { type Situacao, situacaoDe } from "@/lib/consulta/consulta";
import { cn } from "@/lib/utils";

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
}: {
  tom: TomDoSelo;
  icone: LucideIcon;
  borda?: boolean;
  children: ReactNode;
}) {
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

const SELOS: Record<Situacao, DadosDoSelo> = {
  fechada: { tom: "sucesso", icone: Check, borda: false, texto: "Fechada" },
  confirmada: { tom: "info", icone: Info, borda: false, texto: "Confirmada" },
  reservada: { tom: "neutro", icone: Clock, borda: false, texto: "Reservada" },
  cancelada: { tom: "neutro", icone: CircleX, borda: true, texto: "Cancelada" },
};

/** Situação que o Stur mandou, ainda como texto; uma situação desconhecida mostra a palavra dele. */
export function seloDaSituacao(situacao: string | null): DadosDoSelo | null {
  if (situacao === null) return null;
  const conhecida = situacaoDe(situacao);
  if (conhecida !== null) return SELOS[conhecida];
  const palavra = situacao.trim().toLowerCase();
  return {
    tom: "neutro",
    icone: Info,
    borda: false,
    texto: palavra.charAt(0).toUpperCase() + palavra.slice(1),
  };
}
