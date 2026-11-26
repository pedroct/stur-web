import { test as base, expect, type Page } from "@playwright/test";
import { erroApi, parametros } from "../tests/fabrica";

export interface Resposta {
  status?: number;
  corpo: unknown;
  /** Espera, em milissegundos, antes de responder. */
  atraso?: number;
}

export interface Api {
  /** Cada chamada ao caminho usa a próxima resposta; a última se repete. */
  responder(caminho: string, ...respostas: Resposta[]): void;
  /** Quantas chamadas o caminho já recebeu (do navegador, de qualquer carga da página). */
  chamadas(caminho: string): number;
}

const RAIZ = "/api/v1/";

/**
 * A API do backend, simulada no navegador: responde com o que o teste programou, conta as
 * chamadas por caminho e recusa (500) a que ninguém programou, para o teste falhar à vista.
 */
export async function simularApi(page: Page): Promise<Api> {
  const programadas = new Map<string, Resposta[]>();
  const contagem = new Map<string, number>();
  programadas.set("/api/v1/parametros", [{ corpo: parametros() }]);

  await page.route(`**${RAIZ}**`, async (rota) => {
    const caminho = new URL(rota.request().url()).pathname;
    const vez = contagem.get(caminho) ?? 0;
    contagem.set(caminho, vez + 1);
    const respostas = programadas.get(caminho);
    const resposta = respostas?.[Math.min(vez, respostas.length - 1)] ?? {
      status: 500,
      corpo: erroApi("rota_nao_simulada", `Sem resposta programada para ${caminho}.`),
    };
    try {
      if (resposta.atraso) await new Promise((resolver) => setTimeout(resolver, resposta.atraso));
      await rota.fulfill({
        status: resposta.status ?? 200,
        contentType: "application/json",
        body: JSON.stringify(resposta.corpo),
      });
    } catch {
      // A página já abortou a chamada (Cancelar consulta) ou fechou: nada a responder.
    }
  });

  return {
    responder(caminho, ...respostas) {
      programadas.set(caminho, respostas);
    },
    chamadas(caminho) {
      return contagem.get(caminho) ?? 0;
    },
  };
}

export const test = base.extend<{ api: Api }>({
  // `auto`: liga em todo teste, mesmo no que não a pede (a Moldura chama /parametros a cada carga).
  api: [
    async ({ page }, use) => {
      await use(await simularApi(page));
    },
    { auto: true },
  ],
});

export { expect };
