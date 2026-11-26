import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** O twMerge passa a conhecer as escalas do DS (tokens.css), para resolver conflitos com elas. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["pequeno", "medio", "grande", "pilula"],
      spacing: ["alvo"],
      shadow: ["flutuante"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
