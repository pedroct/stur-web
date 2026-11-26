import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Filtros } from "@/componentes/filtros/Filtros";
import { contarOpcoes, REFINAMENTOS_VAZIOS } from "@/lib/resultado/refinar";
import { linha } from "../../fabrica";

const tres = [
  linha({
    numero: 90000001,
    idreserva: 1001,
    situacao: "reservada",
    classificacao: "Hotelaria",
    cliente: "ALFA EXEMPLO",
    fornecedor: "OPERADORA EXEMPLO",
    fornecedor2: "HOTEL EXEMPLO",
    emissor: "EMISSOR EXEMPLO",
  }),
  linha({
    numero: 90000002,
    idreserva: 1002,
    situacao: "cancelada",
    classificacao: "Aéreo",
    cliente: "BETA EXEMPLO",
    fornecedor: "CIA EXEMPLO",
    emissor: "EMISSOR EXEMPLO",
    contaFecha: false,
  }),
  linha({
    numero: 90000003,
    idreserva: 1003,
    situacao: "fechada",
    classificacao: "Hotelaria",
    cliente: "ALFA EXEMPLO",
    fornecedor: "CIA EXEMPLO",
    emissor: "OUTRO EMISSOR EXEMPLO",
  }),
];

function montar(valor = REFINAMENTOS_VAZIOS, vendas = tres, aoMudar = vi.fn()) {
  render(
    <Filtros modo="resultado" valor={valor} opcoes={contarOpcoes(vendas)} aoMudar={aoMudar} />,
  );
  return aoMudar;
}

test("modo resultado: contagens, listas com Todos e frase da API", () => {
  montar();
  const quadro = screen.getByText(/^Refinar resultado/).closest("details");
  expect(quadro).not.toHaveAttribute("open");
  expect(quadro).toHaveTextContent(
    "Refinar resultado · situação, produto, cliente, fornecedor e emissor · nenhum marcado",
  );
  expect(screen.getByRole("button", { name: "Reservada 1" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancelada 1" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Hotelaria 2" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Confirmada/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Pacote/ })).not.toBeInTheDocument();

  const cliente = screen.getByLabelText("Cliente");
  expect(
    within(cliente)
      .getAllByRole("option")
      .map((o) => o.textContent),
  ).toEqual(["Todos os clientes · 3", "ALFA EXEMPLO · 2", "BETA EXEMPLO · 1"]);
  expect(
    within(screen.getByLabelText("Fornecedor"))
      .getAllByRole("option")
      .map((o) => o.textContent),
  ).toEqual([
    "Todos os fornecedores · 3",
    "CIA EXEMPLO · 2",
    "HOTEL EXEMPLO · 1",
    "OPERADORA EXEMPLO · 1",
  ]);
  expect(
    within(screen.getByLabelText("Emissor"))
      .getAllByRole("option")
      .map((o) => o.textContent),
  ).toEqual(["Todos os emissores · 3", "EMISSOR EXEMPLO · 2", "OUTRO EMISSOR EXEMPLO · 1"]);

  expect(
    screen.getByText(
      "Sem marcar nada, valem todas as vendas do resultado. Fornecedor acha a operadora e também a companhia, o hotel ou a empresa de ônibus.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Estes filtros refinam o resultado sem consultar a API do Stur de novo. Para trazer outro conjunto de vendas, use Alterar consulta.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Buscar no resultado")).not.toBeInTheDocument();
});

test("modo resultado: pílulas e listas devolvem o refinamento novo", async () => {
  const aoMudar = montar();
  await userEvent.click(screen.getByRole("button", { name: "Hotelaria 2" }));
  expect(aoMudar).toHaveBeenLastCalledWith({ ...REFINAMENTOS_VAZIOS, produto: ["hotelaria"] });
  await userEvent.click(screen.getByRole("button", { name: "Reservada 1" }));
  expect(aoMudar).toHaveBeenLastCalledWith({ ...REFINAMENTOS_VAZIOS, situacao: ["reservada"] });
  await userEvent.selectOptions(screen.getByLabelText("Cliente"), "BETA EXEMPLO · 1");
  expect(aoMudar).toHaveBeenLastCalledWith({ ...REFINAMENTOS_VAZIOS, cliente: "BETA EXEMPLO" });
  await userEvent.selectOptions(screen.getByLabelText("Fornecedor"), "HOTEL EXEMPLO · 1");
  expect(aoMudar).toHaveBeenLastCalledWith({ ...REFINAMENTOS_VAZIOS, fornecedor: "HOTEL EXEMPLO" });
  await userEvent.selectOptions(screen.getByLabelText("Emissor"), "EMISSOR EXEMPLO · 2");
  expect(aoMudar).toHaveBeenLastCalledWith({ ...REFINAMENTOS_VAZIOS, emissor: "EMISSOR EXEMPLO" });
});

test("modo resultado: com valor marcado abre, resume, e Todos limpa a lista", async () => {
  const valor = {
    ...REFINAMENTOS_VAZIOS,
    produto: ["hotelaria" as const],
    cliente: "ALFA EXEMPLO",
  };
  const aoMudar = montar(valor);
  const quadro = screen.getByText(/^Refinar resultado/).closest("details");
  expect(quadro).toHaveAttribute("open");
  expect(quadro).toHaveTextContent("· 2 marcados: Hotelaria, cliente ALFA EXEMPLO");
  expect(screen.getByRole("button", { name: "Hotelaria 2" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByLabelText("Cliente")).toHaveValue("ALFA EXEMPLO");
  await userEvent.selectOptions(screen.getByLabelText("Cliente"), "Todos os clientes · 3");
  expect(aoMudar).toHaveBeenLastCalledWith({ ...valor, cliente: null });
});

test("modo resultado: Só as que não fecham aparece com naoFecham e liga e desliga", async () => {
  const aoMudar = montar();
  const chave = screen.getByRole("button", { name: "Só as que não fecham" });
  expect(chave).toHaveAttribute("aria-pressed", "false");
  await userEvent.click(chave);
  expect(aoMudar).toHaveBeenLastCalledWith({ ...REFINAMENTOS_VAZIOS, soNaoFecham: true });
});

test("modo resultado: Só as que não fecham ligada fica pressionada", () => {
  montar({ ...REFINAMENTOS_VAZIOS, soNaoFecham: true });
  expect(screen.getByRole("button", { name: "Só as que não fecham" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("modo resultado: sem vendas que não fecham não há a chave", () => {
  montar(
    REFINAMENTOS_VAZIOS,
    tres.filter((v) => v.contaFecha),
  );
  expect(screen.queryByRole("button", { name: "Só as que não fecham" })).not.toBeInTheDocument();
});

test("modo resultado: o resumo do quadro não conta a busca e o quadro abre e fecha pelo summary", async () => {
  montar({ ...REFINAMENTOS_VAZIOS, q: "alfa" });
  const resumo = screen.getByText(/^Refinar resultado/);
  const quadro = resumo.closest("details");
  expect(quadro).toHaveTextContent("· nenhum marcado");
  expect(quadro).not.toHaveAttribute("open");
  await userEvent.click(resumo);
  await waitFor(() => expect(quadro).toHaveAttribute("open"));
  await userEvent.click(resumo);
  await waitFor(() => expect(quadro).not.toHaveAttribute("open"));
});
