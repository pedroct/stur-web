import { render, screen } from "@testing-library/react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { definirEndereco, roteador } from "./navegacao";

function Leitor() {
  const params = useSearchParams();
  const rota = useParams<{ numero?: string; resto?: string[] }>();
  return (
    <p>
      {usePathname()}|{params.get("q") ?? "sem q"}|{rota.numero ?? "-"}|
      {rota.resto?.join(",") ?? "-"}
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

test("useParams devolve o número e o resto de todo caminho da reserva", () => {
  render(<Leitor />);
  definirEndereco("/reservas/90000001");
  expect(screen.getByText("/reservas/90000001|sem q|90000001|-")).toBeInTheDocument();
  roteador.push("/reservas/90000001/vendas/1001");
  expect(
    screen.getByText("/reservas/90000001/vendas/1001|sem q|90000001|vendas,1001"),
  ).toBeInTheDocument();
  roteador.push("/reservas/90000001/vendas/1001/servicos/2");
  expect(
    screen.getByText(
      "/reservas/90000001/vendas/1001/servicos/2|sem q|90000001|vendas,1001,servicos,2",
    ),
  ).toBeInTheDocument();
  roteador.replace("/reservas/90000001/vendas/1001/dado-cru?q=vlr");
  expect(
    screen.getByText("/reservas/90000001/vendas/1001/dado-cru|vlr|90000001|vendas,1001,dado-cru"),
  ).toBeInTheDocument();
});

test("push aceita as opções do Next", () => {
  render(<Leitor />);
  roteador.push("/reservas/90000001", { scroll: false });
  expect(screen.getByText("/reservas/90000001|sem q|90000001|-")).toBeInTheDocument();
  expect(roteador.push).toHaveBeenCalledWith("/reservas/90000001", { scroll: false });
});

test("back desempilha o histórico; replace troca o topo", () => {
  render(<Leitor />);
  definirEndereco("/reservas/90000001/vendas/1001");
  roteador.push("/reservas/90000001/vendas/1001/servicos/1");
  roteador.replace("/reservas/90000001/vendas/1001/servicos/2");
  roteador.back();
  expect(
    screen.getByText("/reservas/90000001/vendas/1001|sem q|90000001|vendas,1001"),
  ).toBeInTheDocument();
  // Sem mais entradas, como no navegador: fica onde está.
  roteador.back();
  expect(
    screen.getByText("/reservas/90000001/vendas/1001|sem q|90000001|vendas,1001"),
  ).toBeInTheDocument();
});

// Roda depois dos testes acima, que mexeram no endereço e chamaram o roteador.
test("o endereço volta para / e as chamadas somem entre os testes", () => {
  render(<Leitor />);
  expect(screen.getByText("/|sem q|-|-")).toBeInTheDocument();
  expect(roteador.push).not.toHaveBeenCalled();
  expect(roteador.replace).not.toHaveBeenCalled();
  expect(roteador.back).not.toHaveBeenCalled();
  roteador.back();
  expect(screen.getByText("/|sem q|-|-")).toBeInTheDocument();
});
