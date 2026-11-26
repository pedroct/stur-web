import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { useBuscaDoTopo, useConsultando } from "@/componentes/moldura/consultando";
import { Moldura } from "@/componentes/moldura/Moldura";
import { definirEndereco, roteador } from "../../navegacao";

const BUSCA = { name: "Número da reserva" } as const;

function OcultaABusca() {
  const { ocultar } = useBuscaDoTopo();
  useEffect(() => {
    ocultar(true);
    return () => ocultar(false);
  }, [ocultar]);
  return <p>formulário</p>;
}

test("durante a consulta a busca fica desativada e diz Buscando…", () => {
  definirEndereco("/consulta?de=2026-11-17&ate=2026-11-24");
  const { container } = render(
    <Moldura consultandoInicial parametrosIniciais={{}}>
      <p>x</p>
    </Moldura>,
  );
  expect(screen.getByRole("textbox", BUSCA)).toBeDisabled();
  expect(screen.getByRole("button", { name: "Buscando…" })).toBeDisabled();
  const faixa = container.querySelector("[data-faixa]");
  expect(faixa).toHaveAttribute("aria-hidden", "true");
});

test("fora da consulta não há faixa e a busca funciona", () => {
  definirEndereco("/consulta?de=2026-11-17&ate=2026-11-24");
  const { container } = render(
    <Moldura parametrosIniciais={{}}>
      <p>x</p>
    </Moldura>,
  );
  expect(container.querySelector("[data-faixa]")).toBeNull();
  expect(screen.getByRole("textbox", BUSCA)).toBeEnabled();
  expect(screen.getByRole("button", { name: "Buscar" })).toBeEnabled();
});

test("a faixa liga e desliga quando a página chama definir", () => {
  function Liga() {
    const { definir } = useConsultando();
    return (
      <>
        <button type="button" onClick={() => definir(true)}>
          liga
        </button>
        <button type="button" onClick={() => definir(false)}>
          desliga
        </button>
      </>
    );
  }
  definirEndereco("/consulta?de=2026-11-17");
  const { container } = render(
    <Moldura parametrosIniciais={{}}>
      <Liga />
    </Moldura>,
  );
  act(() => screen.getByRole("button", { name: "liga" }).click());
  expect(container.querySelector("[data-faixa]")).not.toBeNull();
  expect(screen.getByRole("textbox", BUSCA)).toBeDisabled();
  act(() => screen.getByRole("button", { name: "desliga" }).click());
  expect(container.querySelector("[data-faixa]")).toBeNull();
  expect(screen.getByRole("textbox", BUSCA)).toBeEnabled();
});

test("moldura: sem busca na tela inicial, com busca nas outras", () => {
  definirEndereco("/");
  render(
    <Moldura parametrosIniciais={{}}>
      <p>x</p>
    </Moldura>,
  );
  expect(screen.queryByRole("textbox", BUSCA)).toBeNull();
  definirEndereco("/consulta?de=2026-11-17");
  expect(screen.getByRole("textbox", BUSCA)).toBeInTheDocument();
});

test("a página pode esconder a busca do topo e a busca volta quando ela sai", () => {
  definirEndereco("/consulta?de=2026-11-17");
  const { rerender } = render(
    <Moldura parametrosIniciais={{}}>
      <OcultaABusca />
    </Moldura>,
  );
  expect(screen.queryByRole("textbox", BUSCA)).toBeNull();
  rerender(
    <Moldura parametrosIniciais={{}}>
      <p>sem o formulário</p>
    </Moldura>,
  );
  expect(screen.getByRole("textbox", BUSCA)).toBeInTheDocument();
});

test("a moldura mostra o conteúdo, o botão de tema e a logo", () => {
  render(
    <Moldura parametrosIniciais={{}}>
      <p>conteúdo da página</p>
    </Moldura>,
  );
  expect(screen.getByRole("main")).toHaveTextContent("conteúdo da página");
  expect(screen.getByRole("button", { name: /Trocar o tema/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Consulta de reserva/ })).toHaveAttribute("href", "/");
});

test("a tecla / foca a busca do topo fora da tela inicial", async () => {
  definirEndereco("/reservas/90000001");
  render(
    <Moldura parametrosIniciais={{}}>
      <p>x</p>
    </Moldura>,
  );
  await userEvent.keyboard("/");
  const campo = screen.getByRole("textbox", BUSCA);
  expect(campo).toHaveFocus();
  expect(campo).toHaveValue("90000001");
});

test("a tecla / foca o campo da página na tela inicial, sem a barra entrar no campo", async () => {
  definirEndereco("/");
  render(
    <Moldura parametrosIniciais={{}}>
      <input aria-label="Reserva" data-atalho-numero />
    </Moldura>,
  );
  await userEvent.keyboard("/");
  const campo = screen.getByRole("textbox", { name: "Reserva" });
  expect(campo).toHaveFocus();
  expect(campo).toHaveValue("");
  expect(roteador.push).not.toHaveBeenCalled();
});
