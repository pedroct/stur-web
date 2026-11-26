import { type RenderResult, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { ConsultandoProvider } from "@/componentes/moldura/consultando";
import type { Parametros } from "@/contrato/tipos";
import { ParametrosProvider } from "@/lib/api/parametros";

type Opcoes = { parametros?: Partial<Parametros>; consultando?: boolean };

/** Monta o componente com os parâmetros dados (sem chamar a API) e o estado da consulta. */
export function renderizar(
  ui: ReactElement,
  { parametros = {}, consultando = false }: Opcoes = {},
): RenderResult {
  return render(
    <ParametrosProvider inicial={parametros}>
      <ConsultandoProvider inicial={consultando}>{ui}</ConsultandoProvider>
    </ParametrosProvider>,
  );
}
