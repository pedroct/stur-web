import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Filtros } from "@/componentes/filtros/Filtros";
import { CONSULTA_VAZIA } from "@/lib/consulta/consulta";

test("filtros da consulta: recolhido e com o resumo quando vazio", () => {
  render(<Filtros modo="consulta" valor={CONSULTA_VAZIA} aoMudar={vi.fn()} />);
  const quadro = screen
    .getByText(/Filtros \(opcionais, com número ou período\)/)
    .closest("details");
  expect(quadro).not.toBeNull();
  expect(quadro).not.toHaveAttribute("open");
  expect(quadro).toHaveTextContent("· nenhum marcado");
  expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
});

test("filtros da consulta: aberto quando chega com filtro, pílulas ligam e desligam", async () => {
  const aoMudar = vi.fn();
  render(
    <Filtros
      modo="consulta"
      valor={{ ...CONSULTA_VAZIA, situacao: ["reservada"], fornecedor: "AEREA EXEMPLO" }}
      aoMudar={aoMudar}
    />,
  );
  expect(
    screen.getByText(/· 2 marcados: Reservada, fornecedor AEREA EXEMPLO/).closest("details"),
  ).toHaveAttribute("open");
  expect(screen.getByRole("button", { name: "Reservada" })).toHaveAttribute("aria-pressed", "true");
  await userEvent.click(screen.getByRole("button", { name: "Fechada" }));
  expect(aoMudar).toHaveBeenLastCalledWith(
    expect.objectContaining({ situacao: ["reservada", "fechada"] }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Reservada" }));
  expect(aoMudar).toHaveBeenLastCalledWith(expect.objectContaining({ situacao: [] }));
  expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeVisible();
});

test("filtros da consulta: produto em grupo próprio, sem pílula Todas", async () => {
  const aoMudar = vi.fn();
  render(<Filtros modo="consulta" valor={CONSULTA_VAZIA} aoMudar={aoMudar} />);
  const situacao = screen.getByRole("group", { name: "Situação no Stur" });
  const produto = screen.getByRole("group", { name: "Produto" });
  expect(situacao.querySelectorAll("button")).toHaveLength(4);
  expect(produto.querySelectorAll("button")).toHaveLength(6);
  expect(screen.queryByRole("button", { name: "Todas" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Hotelaria" }));
  expect(aoMudar).toHaveBeenLastCalledWith(
    expect.objectContaining({ classificacao: ["hotelaria"] }),
  );
});

test("filtros da consulta: campos de texto, um por linha, com apoio e limpar", async () => {
  const aoMudar = vi.fn();
  const valor = { ...CONSULTA_VAZIA, cliente: "CLIENTE EXEMPLO LTDA", emissor: "EMISSOR EXEMPLO" };
  render(<Filtros modo="consulta" valor={valor} aoMudar={aoMudar} />);
  for (const nome of ["Cliente", "Fornecedor", "Emissor"]) {
    const campo = screen.getByLabelText(nome);
    expect(campo).toHaveAttribute("placeholder", "Nome ou parte do nome");
    expect(campo).toHaveAttribute("autocomplete", "off");
  }
  expect(screen.getByLabelText("Cliente")).toHaveValue("CLIENTE EXEMPLO LTDA");
  await userEvent.type(screen.getByLabelText("Fornecedor"), "F");
  expect(aoMudar).toHaveBeenLastCalledWith({ ...valor, fornecedor: "F" });
  await userEvent.clear(screen.getByLabelText("Cliente"));
  expect(aoMudar).toHaveBeenLastCalledWith({ ...valor, cliente: null });
  await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(aoMudar).toHaveBeenLastCalledWith({
    ...CONSULTA_VAZIA,
    tipoData: valor.tipoData,
  });
});

test("filtros da consulta: textos de apoio exatos", () => {
  render(<Filtros modo="consulta" valor={CONSULTA_VAZIA} aoMudar={vi.fn()} />);
  expect(
    screen.getByText(
      "Sem marcar nada, vêm todas as vendas. Os campos aceitam parte do nome, e Fornecedor procura a operadora e também a companhia, o hotel ou a empresa de ônibus.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "A consulta só vai à API do Stur quando você clica em Consultar. Depois, dá para refinar o resultado sem consultar de novo.",
    ),
  ).toBeInTheDocument();
});
