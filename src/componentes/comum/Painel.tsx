"use client";

import { X } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import { buttonVariants } from "@/componentes/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/componentes/ui/sheet";
import { cn } from "@/lib/utils";

const LARGURA = { 640: "w-[640px]", 800: "w-[800px]" } as const;

/** O elemento com o foco agora, fora o `body` (quem abriu o painel, se houver). */
function focadoAgora(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const ativo = document.activeElement;
  return ativo instanceof HTMLElement && ativo !== document.body ? ativo : null;
}

/**
 * Os painéis da venda (serviço e dado cru; Global Constraints, Painéis), sobre o `sheet`: modal, à
 * direita, com a venda e a moldura à vista atrás. A Base UI trata o Esc, prende o Tab e marca o
 * resto da página com `aria-hidden`; o `aria-modal` vem daqui. Fechar, Esc e o clique fora chamam
 * `aoFechar`, e quem usa decide o histórico (decisão 20). `aoTeclar` vai no `onKeyDown` do popup,
 * porque a Base UI para a propagação das setas. Ao fechar, o foco volta a quem o tinha quando o
 * painel montou; sem ninguém (link direto), vai para `focoSemAbridor`.
 */
export function Painel({
  titulo,
  subtitulo,
  topo,
  aberto,
  aoFechar,
  largura,
  aoTeclar,
  focoSemAbridor,
  children,
}: Readonly<{
  titulo: ReactNode;
  subtitulo?: ReactNode;
  /** O que vai na barra de cima, antes do Fechar (as setas e a posição, no serviço). */
  topo?: ReactNode;
  aberto: boolean;
  aoFechar(): void;
  largura: 640 | 800;
  aoTeclar?: (e: KeyboardEvent) => void;
  focoSemAbridor?: () => HTMLElement | null;
  children: ReactNode;
}>) {
  // Lido uma vez, na montagem: o painel monta aberto, logo depois do clique que o abriu.
  const [abridor] = useState(focadoAgora);

  return (
    <Sheet
      open={aberto}
      onOpenChange={(abrir) => {
        if (!abrir) aoFechar();
      }}
    >
      <SheetContent
        aria-modal="true"
        onKeyDown={aoTeclar}
        finalFocus={() => (abridor?.isConnected ? abridor : (focoSemAbridor?.() ?? true))}
        className={cn(LARGURA[largura], "px-8 pt-6 pb-12")}
      >
        <div className="flex items-center gap-2">
          {topo}
          <SheetClose
            title="Fechar (Esc)"
            aria-keyshortcuts="Escape"
            className={cn(
              buttonVariants({ variant: "secundaria", size: "compacto" }),
              "ml-auto border-transparent",
            )}
          >
            <X aria-hidden="true" />
            Fechar
          </SheetClose>
        </div>
        <SheetTitle className="mt-6 text-[28px] leading-9 font-bold">{titulo}</SheetTitle>
        {subtitulo && (
          <SheetDescription className="mt-1 text-base leading-6">{subtitulo}</SheetDescription>
        )}
        {children}
      </SheetContent>
    </Sheet>
  );
}
