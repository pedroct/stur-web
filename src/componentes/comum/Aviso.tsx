import { Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONS = {
  info: {
    classes: "bg-estado-info-fundo",
    cor: "text-estado-info",
    icone: Info,
    papel: "note",
  },
  neutro: {
    classes: "bg-superficie-sutil",
    cor: "text-texto-auxiliar",
    icone: Info,
    papel: "note",
  },
  atencao: {
    classes: "bg-estado-atencao-fundo",
    cor: "text-estado-atencao",
    icone: TriangleAlert,
    papel: "alert",
  },
} as const;

/** Aviso na página: informação e neutro são notas; atenção é um alerta que o leitor de tela anuncia. */
export function Aviso({
  tom,
  className,
  children,
}: Readonly<{
  tom: "info" | "neutro" | "atencao";
  className?: string;
  children: ReactNode;
}>) {
  const { classes, cor, icone: Icone, papel } = TONS[tom];
  return (
    <div
      role={papel}
      className={cn(
        "flex items-start gap-3 rounded-medio px-4 py-3 text-sm leading-[22px] text-texto-principal",
        classes,
        className,
      )}
    >
      <Icone className={cn("mt-0.5 size-[18px] shrink-0", cor)} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
