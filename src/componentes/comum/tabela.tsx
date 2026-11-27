import type { ReactNode } from "react";
import { TableHead } from "@/componentes/ui/table";
import { cn } from "@/lib/utils";

/** As classes das tabelas da aplicação: cabeçalho, célula e o anel de foco dos links e botões. */
export const CABECALHO = "h-auto px-4 py-2.5 text-xs font-semibold text-texto-auxiliar";
export const CELULA = "px-4 py-3 align-top text-sm leading-5 whitespace-normal";
export const FOCO =
  "rounded-pequeno outline-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

export function Cabeca({
  children,
  className,
  ...props
}: Readonly<{
  children: ReactNode;
  className?: string;
  "aria-sort"?: "descending";
}>) {
  return (
    <TableHead scope="col" className={cn(CABECALHO, className)} {...props}>
      {children}
    </TableHead>
  );
}
