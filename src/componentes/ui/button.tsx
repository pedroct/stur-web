import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-alvo shrink-0 items-center justify-center gap-2 rounded-pilula border border-transparent px-6 text-base font-semibold whitespace-nowrap transition-colors duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:pointer-events-none disabled:border-transparent disabled:bg-superficie-sutil disabled:text-texto-auxiliar [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        primaria:
          "bg-acao-primaria text-texto-sobre-acao hover:bg-acao-primaria-pressionada active:bg-acao-primaria-pressionada",
        secundaria:
          "border-borda bg-superficie text-texto-principal hover:bg-superficie-sutil active:bg-superficie-sutil",
        texto:
          "bg-transparent text-acao-primaria underline underline-offset-4 hover:text-acao-primaria-pressionada active:text-acao-primaria-pressionada",
      },
    },
    defaultVariants: {
      variant: "primaria",
    },
  },
);

function Button({
  className,
  variant = "primaria",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
