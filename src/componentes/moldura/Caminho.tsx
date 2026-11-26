import Link from "next/link";
import type { ReactNode } from "react";

type Nivel = { rotulo: string; href?: string };

const LINK =
  "text-texto-auxiliar underline underline-offset-2 hover:text-texto-principal focus-visible:outline-2 focus-visible:outline-offset-2";

/** O primeiro nível é sempre "Consulta"; o último é a página atual. `direita` leva as setas do resultado. */
export function Caminho({ niveis, direita }: Readonly<{ niveis: Nivel[]; direita?: ReactNode }>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <nav aria-label="Caminho" className="text-sm text-texto-auxiliar">
        <Link href="/" title="Nova consulta" className={LINK}>
          Consulta
        </Link>
        {niveis.map(({ rotulo, href }, i) => {
          const atual = i === niveis.length - 1;
          return (
            <span key={rotulo}>
              <span aria-hidden="true"> › </span>
              {href ? (
                <Link href={href} aria-current={atual ? "page" : undefined} className={LINK}>
                  {rotulo}
                </Link>
              ) : (
                <span aria-current={atual ? "page" : undefined}>{rotulo}</span>
              )}
            </span>
          );
        })}
      </nav>
      {direita}
    </div>
  );
}
