import { screen } from "@testing-library/react";
import { useConsultando } from "@/componentes/moldura/consultando";
import { useParametros } from "@/lib/api/parametros";
import { renderizar } from "./renderizar";
import { requisicoesPara } from "./servidor";

function Sonda() {
  const { linhasPorPagina } = useParametros();
  const { ativo } = useConsultando();
  return (
    <p>
      {linhasPorPagina}|{String(ativo)}
    </p>
  );
}

test("renderizar monta os parâmetros dados, sem chamar a API, e o estado da consulta", () => {
  renderizar(<Sonda />, { parametros: { linhasPorPagina: 50 }, consultando: true });
  expect(screen.getByText("50|true")).toBeInTheDocument();
  expect(requisicoesPara("/api/v1/parametros")).toBe(0);
});

test("sem opções, valem os parâmetros padrão e a consulta parada", () => {
  renderizar(<Sonda />);
  expect(screen.getByText("20|false")).toBeInTheDocument();
});
