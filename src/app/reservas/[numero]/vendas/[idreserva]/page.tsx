import { Suspense } from "react";
import { VendaProvisoria } from "@/componentes/reserva/ReservaProvisoria";

export default function Venda() {
  return (
    <Suspense>
      <VendaProvisoria />
    </Suspense>
  );
}
