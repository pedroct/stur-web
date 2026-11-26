"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { type SubmitEvent, useRef, useState } from "react";
import { CampoNumero } from "@/componentes/comum/CampoNumero";
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

  function buscar(e: SubmitEvent<HTMLFormElement>) {
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
      <CampoNumero
        ref={campo}
        id="busca-numero"
        aria-invalid={invalido || undefined}
        placeholder="Número da reserva"
        value={valor}
        disabled={consultando}
        aoMudar={(digitos) => {
          setValor(digitos);
          setInvalido(false);
        }}
        className="w-50 rounded-pilula text-sm"
      />
      <Button type="submit" variant="secundaria" disabled={consultando} size="compacto">
        {consultando ? "Buscando…" : "Buscar"}
      </Button>
    </form>
  );
}
