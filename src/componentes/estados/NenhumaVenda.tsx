import { Pencil, SearchX } from "lucide-react";
import Link from "next/link";
import { Caminho } from "@/componentes/moldura/Caminho";
import { Button, buttonVariants } from "@/componentes/ui/button";

/** Telas 13 e 13b: a consulta deu certo e não trouxe venda. Tom neutro, não é erro. */
export function NenhumaVenda({
  caminho,
  mensagem,
  complemento,
  alterarHref,
  acaoExtra,
  consultadoAs,
}: {
  caminho: { rotulo: string; href?: string }[];
  mensagem: string;
  complemento: string | null;
  alterarHref: string;
  acaoExtra?: { rotulo: string; aoClicar(): void };
  consultadoAs?: string;
}) {
  return (
    <>
      <Caminho niveis={caminho} />
      <div
        role="status"
        className="mt-6 flex max-w-[760px] items-start gap-4 rounded-medio border border-borda bg-superficie-sutil p-6 text-texto-principal"
      >
        <SearchX className="size-7 shrink-0 text-texto-auxiliar" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl leading-8 font-bold">Nenhuma venda encontrada</h1>
          <p className="mt-2 text-base leading-6 tabular-nums">{mensagem}</p>
          {complemento && (
            <p className="mt-2 text-sm leading-5 text-texto-auxiliar tabular-nums">{complemento}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={alterarHref} className={buttonVariants({ variant: "primaria" })}>
              <Pencil className="size-[18px]" aria-hidden="true" />
              Alterar consulta
            </Link>
            {acaoExtra && (
              <Button variant="secundaria" onClick={acaoExtra.aoClicar}>
                {acaoExtra.rotulo}
              </Button>
            )}
          </div>
        </div>
      </div>
      {consultadoAs && (
        <p className="mt-4 text-[13px] leading-5 text-texto-auxiliar">
          Consultado às {consultadoAs}.
        </p>
      )}
    </>
  );
}
