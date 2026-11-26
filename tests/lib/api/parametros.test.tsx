import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { StrictMode } from "react";
import { expect, test } from "vitest";
import { lerParametros, ParametrosProvider, useParametros } from "@/lib/api/parametros";
import { parametros } from "../../fabrica";
import { requisicoesPara, servidor } from "../../servidor";

function Mostrar() {
  const p = useParametros();
  return (
    <p data-testid="p">
      {p.periodoMaximoDias}|{p.linhasPorPagina}|{p.opcoesPorPagina.join(",")}|
      {p.tempoLimiteSegundos}|{p.dadosDoSturAte ?? "nulo"}
    </p>
  );
}

test("sem resposta do backend, valem os padrões e não há data da cópia", async () => {
  servidor.use(http.get("*/api/v1/parametros", () => HttpResponse.error()));
  render(
    <ParametrosProvider>
      <Mostrar />
    </ParametrosProvider>,
  );
  await waitFor(() => expect(requisicoesPara("/api/v1/parametros")).toBe(1));
  await expect(lerParametros()).rejects.toMatchObject({ tipo: "aplicacao" });
  expect(screen.getByTestId("p")).toHaveTextContent("31|20|20,50,100|30|nulo");
});

test("com resposta do backend, valem os parâmetros dele", async () => {
  servidor.use(
    http.get("*/api/v1/parametros", () =>
      HttpResponse.json(
        parametros({
          periodoMaximoDias: 45,
          linhasPorPagina: 50,
          opcoesPorPagina: [50, 100],
          tempoLimiteSegundos: 60,
        }),
      ),
    ),
  );
  render(
    <ParametrosProvider>
      <Mostrar />
    </ParametrosProvider>,
  );
  expect(screen.getByTestId("p")).toHaveTextContent("31|20|20,50,100|30|nulo");
  await waitFor(() =>
    expect(screen.getByTestId("p")).toHaveTextContent("45|50|50,100|60|2026-11-18T09:30:00"),
  );
});

test("no modo estrito a API é chamada uma vez só", async () => {
  render(
    <StrictMode>
      <ParametrosProvider>
        <Mostrar />
      </ParametrosProvider>
    </StrictMode>,
  );
  await lerParametros();
  await waitFor(() => expect(screen.getByTestId("p")).toHaveTextContent("2026-11-18T09:30:00"));
  expect(requisicoesPara("/api/v1/parametros")).toBe(1);
});

test("com `inicial`, não chama a API e completa com os padrões", () => {
  render(
    <ParametrosProvider inicial={{ periodoMaximoDias: 10 }}>
      <Mostrar />
    </ParametrosProvider>,
  );
  expect(screen.getByTestId("p")).toHaveTextContent("10|20|20,50,100|30|nulo");
  expect(requisicoesPara("/api/v1/parametros")).toBe(0);
});

test("sem provedor, valem os padrões", () => {
  render(<Mostrar />);
  expect(screen.getByTestId("p")).toHaveTextContent("31|20|20,50,100|30|nulo");
});
