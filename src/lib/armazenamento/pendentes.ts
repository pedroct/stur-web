/**
 * Pedidos explícitos de consulta e chamadas em andamento, na memória do módulo (decisão 2 do
 * plano 2): a página consulta só se há pedido pendente ou chamada em andamento para a chave.
 */

interface Chamada {
  promessa: Promise<unknown>;
  controlador: AbortController;
}

const pendentes = new Set<string>();
const chamadas = new Map<string, Chamada>();

export function marcarPendente(chave: string): void {
  pendentes.add(chave);
}

export function temPendente(chave: string): boolean {
  return pendentes.has(chave);
}

export function emAndamento(chave: string): boolean {
  return chamadas.has(chave);
}

/**
 * Devolve a mesma promessa enquanto a chamada da chave não termina (a segunda montagem do React
 * em modo estrito reusa a primeira). Quem grava o resultado é `iniciar`; uma chamada abortada
 * não grava nada. Ao terminar, com sucesso ou erro, apaga a chamada e o pedido da chave, a menos
 * que a entrada já seja de uma chamada nova (feita depois de um cancelamento).
 */
export function consultaEmAndamento<T>(
  chave: string,
  iniciar: (sinal: AbortSignal) => Promise<T>,
): Promise<T> {
  const existente = chamadas.get(chave);
  if (existente) return existente.promessa as Promise<T>;

  const controlador = new AbortController();
  // A função async chama `iniciar` na hora; um erro síncrono dele vira promessa rejeitada,
  // e a limpeza abaixo roda.
  const inicio = (async () => iniciar(controlador.signal))();
  const promessa = inicio.finally(() => {
    if (chamadas.get(chave) === chamada) {
      chamadas.delete(chave);
      pendentes.delete(chave);
    }
  });
  const chamada: Chamada = { promessa, controlador };
  chamadas.set(chave, chamada);
  return promessa;
}

/** "Cancelar consulta": aborta a chamada e apaga a promessa e o pedido. */
export function cancelarEmAndamento(chave: string): void {
  chamadas.get(chave)?.controlador.abort();
  chamadas.delete(chave);
  pendentes.delete(chave);
}

/** Só para os testes: aborta e apaga tudo. */
export function zerarPendentes(): void {
  for (const { controlador } of chamadas.values()) controlador.abort();
  chamadas.clear();
  pendentes.clear();
}
