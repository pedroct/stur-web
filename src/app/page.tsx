import { Suspense } from "react";
import { PaginaInicial } from "@/componentes/consulta/PaginaInicial";

export default function Home() {
  return (
    <Suspense>
      <PaginaInicial />
    </Suspense>
  );
}
