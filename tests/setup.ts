import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { zerarRolagem } from "@/componentes/reserva/TabelaVendas";
import { zerarParametros } from "@/lib/api/parametros";
import { zerarPendentes } from "@/lib/armazenamento/pendentes";
import { zerarResultadosEmMemoria } from "@/lib/armazenamento/resultados";
import { zerarNavegacao } from "./navegacao";
import { servidor, zerarContagem } from "./servidor";

vi.mock("next/navigation", async () => {
  const mock = await import("./navegacao");
  return {
    usePathname: mock.usePathname,
    useSearchParams: mock.useSearchParams,
    useParams: mock.useParams,
    useRouter: mock.useRouter,
  };
});

// O jsdom não rola a página; a tabela das vendas desce até a venda aberta com `scrollIntoView`.
if (typeof Element !== "undefined") Element.prototype.scrollIntoView = () => {};

// A venda inteira (portão do Anexo B, tabelas, painéis) demora a montar sob carga: `findBy*` e
// `waitFor` esperam 5 s, e não 1 s.
configure({ asyncUtilTimeout: 5000 });

beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  servidor.resetHandlers();
  zerarContagem();
  zerarNavegacao();
  zerarParametros();
  zerarPendentes();
  zerarRolagem();
  zerarResultadosEmMemoria();
  vi.useRealTimers();
  if (typeof window !== "undefined") {
    cleanup();
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
});

afterAll(() => servidor.close());
