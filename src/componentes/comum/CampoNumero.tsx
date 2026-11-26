import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Campo do número da reserva, o mesmo na busca do topo e no formulário: só algarismos (o que
 * se digita ou cola, com letras e pontos, vira dígitos), e é o campo que o atalho `/` procura.
 */
export function CampoNumero({
  aoMudar,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type" | "onChange"> & { aoMudar: (digitos: string) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-keyshortcuts="/"
      data-atalho-numero
      onChange={(e) => aoMudar(e.target.value.replace(/\D/g, ""))}
      className={cn(
        "h-alvo border border-borda-controle bg-superficie px-4 text-texto-principal outline-0 placeholder:text-texto-auxiliar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:border-borda disabled:text-texto-auxiliar aria-invalid:border-estado-erro",
        className,
      )}
      {...props}
    />
  );
}
