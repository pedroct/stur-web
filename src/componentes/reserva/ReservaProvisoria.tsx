"use client";

import { useParams } from "next/navigation";
import { Caminho } from "@/componentes/moldura/Caminho";

/** O segmento da rota chega codificado; texto que não decodifica fica como veio. */
export function numeroDaRota(segmento: string | undefined): string {
  try {
    return decodeURIComponent(segmento ?? "");
  } catch {
    return segmento ?? "";
  }
}

/** Provisória: o plano 3 a troca pela reserva com várias vendas (tela 7b) e pela venda (tela 11). */
export function ReservaProvisoria({ numero }: { numero: string }) {
  return (
    <>
      <Caminho niveis={[{ rotulo: `Reserva ${numero}` }]} />
      <h1 className="mt-4 text-4xl leading-11 font-bold tracking-[-0.01em]">Reserva {numero}</h1>
    </>
  );
}

/** `/reservas/{número}/vendas/{idreserva}`: por ora, a mesma página provisória da reserva. */
export function VendaProvisoria() {
  const { numero } = useParams<{ numero: string }>();
  return <ReservaProvisoria numero={numeroDaRota(numero)} />;
}
