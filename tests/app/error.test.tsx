import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Component, type ReactNode } from "react";
import ErroDaAplicacao from "@/app/error";
import { PaginaConsulta } from "@/componentes/resultado/PaginaConsulta";
import { TEXTOS_ERRO } from "@/lib/api/textos-erro";
import { guardarResultado, lerResultado } from "@/lib/armazenamento/resultados";
import { linha, resultado } from "../fabrica";
import { definirEndereco } from "../navegacao";
import { renderizar } from "../renderizar";

const endereco = "/consulta?data=emissao&de=2026-11-17&ate=2026-11-24";

/** O limite de erro que o Next põe em volta da página, com o app/error.tsx como fallback. */
class LimiteDeErro extends Component<{ children: ReactNode }, { erro: unknown }> {
  override state = { erro: null as unknown };
  static getDerivedStateFromError(erro: unknown) {
    return { erro };
  }
  override render() {
    if (this.state.erro === null) return this.props.children;
    return <ErroDaAplicacao error={this.state.erro} reset={() => this.setState({ erro: null })} />;
  }
}

test("erro da página: tela do erro da aplicação, apaga o resultado guardado do endereço e Tentar de novo chama o reset", async () => {
  guardarResultado(endereco, resultado([linha()]));
  guardarResultado("/consulta?data=emissao&de=2026-11-10&ate=2026-11-16", resultado([linha()]));
  definirEndereco(endereco);
  const reset = vi.fn();
  renderizar(<ErroDaAplicacao error={new Error("quebrou")} reset={reset} />);

  const alerta = screen.getByRole("alert");
  expect(within(alerta).getByRole("heading", { level: 1 })).toHaveTextContent(
    TEXTOS_ERRO.aplicacao.titulo,
  );
  expect(alerta).toHaveTextContent(TEXTOS_ERRO.aplicacao.mensagem(30));
  expect(within(alerta).getByRole("link", { name: "Alterar consulta" })).toHaveAttribute(
    "href",
    "/?data=emissao&de=2026-11-17&ate=2026-11-24",
  );
  expect(lerResultado(endereco)).toBeNull();
  expect(lerResultado("/consulta?data=emissao&de=2026-11-10&ate=2026-11-16")).not.toBeNull();

  await userEvent.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
  expect(reset).toHaveBeenCalledOnce();
});

test("resultado guardado em formato inesperado: a tela de erro aparece uma vez e Tentar de novo volta ao formulário", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  guardarResultado(endereco, resultado([linha()], { resumo: { totalCliente: "não é decimal" } }));
  definirEndereco(endereco);
  renderizar(
    <LimiteDeErro>
      <PaginaConsulta />
    </LimiteDeErro>,
  );

  const alerta = await screen.findByRole("alert");
  expect(alerta).toHaveTextContent(TEXTOS_ERRO.aplicacao.titulo);
  expect(lerResultado(endereco)).toBeNull();

  await userEvent.click(within(alerta).getByRole("button", { name: "Tentar de novo" }));
  expect(await screen.findByRole("note")).toHaveTextContent("Este link trouxe uma consulta pronta");
  expect(screen.queryByRole("alert")).toBeNull();
});
