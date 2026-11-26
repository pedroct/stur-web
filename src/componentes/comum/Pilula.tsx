import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Pílula de 44 px. `alternar` liga e desliga (`aria-pressed`); `radio` escolhe uma entre
 * várias (`role="radio"` com `aria-checked`). Marcada: borda de 2 px e fundo da ação; o
 * preenchimento lateral diminui 1 px para a pílula não mudar de largura.
 */
export function Pilula({
  pressionada = false,
  papel = "alternar",
  className,
  type = "button",
  ...props
}: Omit<ComponentProps<"button">, "role" | "aria-pressed" | "aria-checked"> & {
  pressionada?: boolean;
  papel?: "alternar" | "radio";
}) {
  const estado =
    papel === "radio"
      ? { role: "radio", "aria-checked": pressionada }
      : { "aria-pressed": pressionada };
  return (
    <button
      type={type}
      {...estado}
      className={cn(
        "inline-flex h-alvo min-w-alvo cursor-pointer items-center justify-center rounded-pilula border text-sm font-medium whitespace-nowrap text-texto-principal outline-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco",
        pressionada
          ? "border-2 border-acao-primaria bg-acao-fundo px-[15px]"
          : "border-borda bg-superficie px-4 hover:bg-superficie-sutil",
        className,
      )}
      {...props}
    />
  );
}
