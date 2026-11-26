import { Suspense } from "react";
import { PaginaConsulta } from "@/componentes/resultado/PaginaConsulta";

export default function Consulta() {
  return (
    <Suspense>
      <PaginaConsulta />
    </Suspense>
  );
}
