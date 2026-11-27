import { test as base, expect, type Page } from "@playwright/test";
import { erroApi, parametros } from "../tests/fabrica";

/**
 * `corpo` vai como JSON; `texto` vai como está, para o que o backend manda sem reformatar (o dado
 * cru da venda). Quem programa informa um dos dois.
 */
export type Resposta = {
  status?: number;
  /** Espera, em milissegundos, antes de responder. */
  atraso?: number;
} & ({ corpo: unknown; texto?: never } | { texto: string; corpo?: never });

export interface Api {
  /** Cada chamada ao caminho usa a próxima resposta; a última se repete. */
  responder(caminho: string, ...respostas: Resposta[]): void;
  /** Quantas chamadas o caminho já recebeu (do navegador, de qualquer carga da página). */
  chamadas(caminho: string): number;
  /**
   * Espera a API simulada ficar ociosa: nenhuma chamada em andamento e nenhuma nova por
   * `quietoMs`, contados a partir do pedido. Contar depois disso pega também a chamada que
   * viria atrasada.
   */
  ociosa(quietoMs?: number): Promise<void>;
}

const RAIZ = "/api/v1/";

/**
 * A API do backend, simulada no navegador: responde com o que o teste programou, conta as
 * chamadas por caminho e recusa (500) a que ninguém programou, para o teste falhar à vista.
 */
export async function simularApi(page: Page): Promise<Api> {
  const programadas = new Map<string, Resposta[]>();
  const contagem = new Map<string, number>();
  let emAndamento = 0;
  let ultimaEm = Date.now();
  programadas.set("/api/v1/parametros", [{ corpo: parametros() }]);

  await page.route(`**${RAIZ}**`, async (rota) => {
    const caminho = new URL(rota.request().url()).pathname;
    const vez = contagem.get(caminho) ?? 0;
    contagem.set(caminho, vez + 1);
    emAndamento += 1;
    ultimaEm = Date.now();
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
        body: resposta.texto ?? JSON.stringify(resposta.corpo),
      });
    } catch {
      // A página já abortou a chamada (Cancelar consulta) ou fechou: nada a responder.
    } finally {
      emAndamento -= 1;
      ultimaEm = Date.now();
    }
  });

  return {
    responder(caminho, ...respostas) {
      programadas.set(caminho, respostas);
    },
    chamadas(caminho) {
      return contagem.get(caminho) ?? 0;
    },
    async ociosa(quietoMs = 750) {
      // A janela quieta conta a partir do pedido: a chamada que ainda vai sair também entra.
      const pedidaEm = Date.now();
      while (emAndamento > 0 || Date.now() - Math.max(ultimaEm, pedidaEm) < quietoMs) {
        await new Promise((resolver) => setTimeout(resolver, 50));
      }
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
