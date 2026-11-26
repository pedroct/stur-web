import { Suspense } from "react";
import { PaginaReservaDaRota } from "@/componentes/reserva/PaginaReserva";

export default function Reserva() {
  return (
    <Suspense>
      <PaginaReservaDaRota />
    </Suspense>
  );
}
