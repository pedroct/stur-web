import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { parametros } from "./fabrica";

export const rotasPadrao = [http.get("*/api/v1/parametros", () => HttpResponse.json(parametros()))];

export const servidor = setupServer(...rotasPadrao);

let contagem = new Map<string, number>();

servidor.events.on("request:start", ({ request }) => {
  const caminho = new URL(request.url).pathname;
  contagem.set(caminho, (contagem.get(caminho) ?? 0) + 1);
});

export function requisicoesPara(caminho: string): number {
  return contagem.get(caminho) ?? 0;
}

export function zerarContagem(): void {
  contagem = new Map();
}

/**
 * Prende a resposta até o teste chamar `soltar`: o carregando segue à vista enquanto o teste o
 * confere, sem depender de quanto tempo o clique leva.
 */
export function segurarResposta(): { solta: Promise<void>; soltar: () => void } {
  let soltar: () => void = () => {};
  const solta = new Promise<void>((resolver) => {
    soltar = resolver;
  });
  return { solta, soltar };
}

/**
 * Vigia uma chamada ao servidor: `iniciou` resolve quando o handler começa e `abortada` vira
 * true no aborto, mesmo que ele venha antes do ouvinte (o handler confere o sinal e só depois
 * liga o ouvinte). `acompanhar` vai no handler e resolve no aborto.
 */
export function vigiarChamada() {
  let comecar: () => void = () => {};
  const iniciou = new Promise<void>((resolver) => {
    comecar = resolver;
  });
  const vigia = {
    iniciou,
    abortada: false,
    acompanhar(request: Request): Promise<void> {
      comecar();
      return new Promise<void>((resolver) => {
        const abortar = () => {
          vigia.abortada = true;
          resolver();
        };
        if (request.signal.aborted) abortar();
        else request.signal.addEventListener("abort", abortar, { once: true });
      });
    },
  };
  return vigia;
}
