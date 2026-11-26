"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { PaginaReservaVenda } from "@/componentes/venda/PaginaReservaVenda";
import { numeroDaRota } from "@/lib/venda/rota";

/**
 * O layout de `[numero]` guarda a reserva e as vendas enquanto o endereço troca de venda, serviço
 * ou dado cru: a página `[[...resto]]` não mostra nada, e o `useParams` daqui já traz o `resto`
 * (decisão 16). Outro número é outro segmento: o Next monta o layout de novo, e a `key` faz o
 * mesmo onde o layout continua montado.
 */
export default function LayoutDaReserva() {
  const { numero, resto } = useParams<{ numero: string; resto?: string[] }>();
  const numeroTexto = numeroDaRota(numero);
  return (
    // O `?q=` do dado cru é lido por `useSearchParams`.
    <Suspense>
      <PaginaReservaVenda key={numeroTexto} numeroTexto={numeroTexto} resto={resto} />
    </Suspense>
  );
}
