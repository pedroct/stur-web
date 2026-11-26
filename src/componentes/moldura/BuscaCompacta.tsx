"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/componentes/ui/button";
import { numeroDaReserva } from "@/lib/consulta/consulta";
import { useConsultando } from "./consultando";

/** Busca do topo: começa com o número da rota (/reservas/…) e leva a /reservas/{n}. */
export function BuscaCompacta() {
  const router = useRouter();
  const rota = usePathname();
  const { numero } = useParams<{ numero?: string }>();
  const { ativo: consultando } = useConsultando();
  const doEndereco = rota.startsWith("/reservas/") ? (numero ?? "") : "";

  const [valor, setValor] = useState(doEndereco);
  const [anterior, setAnterior] = useState(doEndereco);
  const [invalido, setInvalido] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  // A moldura continua montada entre as páginas: a busca acompanha o número do endereço.
  if (anterior !== doEndereco) {
    setAnterior(doEndereco);
    setValor(doEndereco);
    setInvalido(false);
  }

  function buscar(e: FormEvent) {
    e.preventDefault();
    const n = numeroDaReserva(valor);
    if (n === null) {
      setInvalido(true);
      campo.current?.focus();
      return;
    }
    router.push(`/reservas/${n}`);
  }

  return (
    <form role="search" onSubmit={buscar} className="flex gap-2">
      <label htmlFor="busca-numero" className="sr-only">
        Número da reserva
      </label>
      <input
        ref={campo}
        id="busca-numero"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-keyshortcuts="/"
        aria-invalid={invalido || undefined}
        data-atalho-numero
        placeholder="Número da reserva"
        value={valor}
        disabled={consultando}
        onChange={(e) => {
          setValor(e.target.value.replace(/\D/g, ""));
          setInvalido(false);
        }}
        className="h-alvo w-50 rounded-pilula border border-borda-controle bg-superficie px-4 text-sm text-texto-principal outline-0 placeholder:text-texto-auxiliar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:border-borda disabled:text-texto-auxiliar aria-invalid:border-estado-erro"
      />
      <Button
        type="submit"
        variant="secundaria"
        disabled={consultando}
        className="px-4 text-sm font-medium"
      >
        {consultando ? "Buscando…" : "Buscar"}
      </Button>
    </form>
  );
}
