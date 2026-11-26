import { render, screen } from "@testing-library/react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { definirEndereco, roteador } from "./navegacao";

function Leitor() {
  const params = useSearchParams();
  const rota = useParams();
  return (
    <p>
      {usePathname()}|{params.get("q") ?? "sem q"}|{rota.numero ?? "-"}|{rota.idreserva ?? "-"}
    </p>
  );
}

test("replace muda o que a tela lê, como no Next", () => {
  render(<Leitor />);
  expect(screen.getByText("/|sem q|-|-")).toBeInTheDocument();
  roteador.replace("/consulta?q=x");
  expect(screen.getByText("/consulta|x|-|-")).toBeInTheDocument();
  expect(roteador.replace).toHaveBeenCalledWith("/consulta?q=x");
});

test("useParams casa a rota da reserva e a da venda", () => {
  render(<Leitor />);
  definirEndereco("/reservas/90000001");
  expect(screen.getByText("/reservas/90000001|sem q|90000001|-")).toBeInTheDocument();
  roteador.push("/reservas/90000001/vendas/1001");
  expect(
    screen.getByText("/reservas/90000001/vendas/1001|sem q|90000001|1001"),
  ).toBeInTheDocument();
});

// Roda depois dos dois testes acima, que mexeram no endereço e chamaram o roteador.
test("o endereço volta para / e as chamadas somem entre os testes", () => {
  render(<Leitor />);
  expect(screen.getByText("/|sem q|-|-")).toBeInTheDocument();
  expect(roteador.push).not.toHaveBeenCalled();
  expect(roteador.replace).not.toHaveBeenCalled();
});
