import Link from "next/link";
import { Aviso } from "@/componentes/comum/Aviso";
import type { AvisoDaTela } from "@/lib/venda/cabecalho";

/** Os avisos do topo da venda (IA 9.5), um `Aviso` por item, na ordem dada. */
export function Avisos({ lista }: Readonly<{ lista: AvisoDaTela[] }>) {
  if (lista.length === 0) return null;
  return (
    <div className="mt-6 flex flex-col gap-3">
      {lista.map((aviso) => (
        <Aviso key={aviso.texto} tom={aviso.tom}>
          {aviso.texto}
          {aviso.link !== undefined && (
            <>
              {" "}
              <Link href={aviso.link} className="font-medium underline underline-offset-2">
                Abrir essa venda
              </Link>
            </>
          )}
        </Aviso>
      ))}
    </div>
  );
}
