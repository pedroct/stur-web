import { buttonVariants } from "@/componentes/ui/button";
import { cn } from "@/lib/utils";

function classes(texto: string): string[] {
  return texto.split(/\s+/).filter(Boolean);
}

test("link secundário com cara de botão fica com a borda da variante, sem a transparente da base", () => {
  const lista = classes(buttonVariants({ variant: "secundaria" }));
  expect(lista).toContain("border-borda");
  expect(lista).not.toContain("border-transparent");
});

test("tamanho compacto troca o padding, o corpo e o peso da base", () => {
  const lista = classes(buttonVariants({ variant: "secundaria", size: "compacto" }));
  expect(lista).toEqual(expect.arrayContaining(["px-4", "text-sm", "font-medium"]));
  expect(lista).not.toContain("px-6");
  expect(lista).not.toContain("text-base");
  expect(lista).not.toContain("font-semibold");
});

test("a classe de fora vence a da variante", () => {
  const lista = classes(buttonVariants({ variant: "secundaria", className: "border-estado-erro" }));
  expect(lista).toContain("border-estado-erro");
  expect(lista).not.toContain("border-borda");
});

test("cn conhece os raios, a altura do alvo e a sombra do DS", () => {
  expect(cn("rounded-pilula", "rounded-pequeno")).toBe("rounded-pequeno");
  expect(cn("rounded-medio", "rounded-grande")).toBe("rounded-grande");
  expect(cn("h-alvo", "h-8")).toBe("h-8");
  expect(cn("size-alvo", "size-6")).toBe("size-6");
  expect(cn("shadow-flutuante", "shadow-none")).toBe("shadow-none");
});
