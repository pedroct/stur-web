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
