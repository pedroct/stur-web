"use client";

import { useSearchParams } from "next/navigation";
import { lerConsulta } from "@/lib/consulta/consulta";
import { ConsultasRecentes } from "./ConsultasRecentes";
import { FormularioConsulta } from "./FormularioConsulta";

/**
 * Tela 1. Alterar e Cancelar consulta chegam com a consulta nos parâmetros: o formulário abre
 * preenchido, sem o aviso do link. A `key` refaz o formulário quando o endereço muda (Nova
 * consulta pelo logo, de `/?…` para `/`), porque ele só lê a consulta inicial uma vez.
 */
export function PaginaInicial() {
  const parametros = useSearchParams();
  return (
    <>
      <FormularioConsulta key={parametros.toString()} inicial={lerConsulta(parametros)} />
      <ConsultasRecentes />
    </>
  );
}
