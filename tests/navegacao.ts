import { act } from "@testing-library/react";
import { useMemo, useSyncExternalStore } from "react";
import { vi } from "vitest";

// Mock reativo de next/navigation: o endereço vive aqui e quem o lê (usePathname,
// useSearchParams, useParams) é avisado quando ele muda, como no Next. Assim um
// replace/push feito pela tela muda o que ela mesma lê. O histórico é uma pilha:
// `push` empilha, `replace` troca o topo e `back` desempilha, como o do navegador.
let historico = ["/"];
const inscritos = new Set<() => void>();

function topo(): string {
  return historico[historico.length - 1] ?? "/";
}

/**
 * Avisa quem lê o endereço. Do corpo do teste, dentro de `act`. Fora do ambiente de `act` (o
 * `waitFor` e o `findBy*` o desligam enquanto esperam), quem navega é a própria tela, num efeito
 * ou numa resposta da API: um `act` aberto no meio do commit perderia a atualização, então o
 * aviso vai direto, e o React a agenda como no Next.
 */
function avisar(): void {
  if (inscritos.size === 0) return;
  const notificar = () => {
    for (const ouvinte of inscritos) ouvinte();
  };
  const ambiente = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  if (ambiente.IS_REACT_ACT_ENVIRONMENT) act(notificar);
  else notificar();
}

/** Troca o endereço atual (o topo do histórico), como digitar na barra ou abrir por link. */
export function definirEndereco(novo: string): void {
  historico = [...historico.slice(0, -1), novo];
  avisar();
}

type OpcoesDoRoteador = { scroll?: boolean };

export const roteador = {
  push: vi.fn((destino: string, _opcoes?: OpcoesDoRoteador) => {
    historico = [...historico, destino];
    avisar();
  }),
  replace: vi.fn((destino: string, _opcoes?: OpcoesDoRoteador) => definirEndereco(destino)),
  back: vi.fn(() => {
    if (historico.length < 2) return;
    historico = historico.slice(0, -1);
    avisar();
  }),
};

/** Depois de cada teste: zera as chamadas e volta ao "/" sem avisar (o cleanup já desmontou tudo). */
export function zerarNavegacao(): void {
  roteador.push.mockClear();
  roteador.replace.mockClear();
  roteador.back.mockClear();
  historico = ["/"];
}

function inscrever(avisar: () => void): () => void {
  inscritos.add(avisar);
  return () => {
    inscritos.delete(avisar);
  };
}

const lerEndereco = () => topo();

function useEndereco(): string {
  return useSyncExternalStore(inscrever, lerEndereco, lerEndereco);
}

function partes(texto: string): { caminho: string; consulta: string } {
  const fim = texto.search(/[?#]/);
  const caminho = fim === -1 ? texto : texto.slice(0, fim);
  const resto = fim === -1 ? "" : texto.slice(fim);
  const inicioConsulta = resto.startsWith("?") ? 1 : resto.length;
  const fimConsulta = resto.indexOf("#");
  return {
    caminho,
    consulta: resto.slice(inicioConsulta, fimConsulta === -1 ? undefined : fimConsulta),
  };
}

export function usePathname(): string {
  return partes(useEndereco()).caminho;
}

export function useSearchParams(): URLSearchParams {
  const texto = useEndereco();
  return useMemo(() => new URLSearchParams(partes(texto).consulta), [texto]);
}

/** Como o do Next no layout de `[numero]`: o número e, abaixo dele, o `[[...resto]]`. */
export function useParams(): { numero?: string; resto?: string[] } {
  const texto = useEndereco();
  return useMemo(() => {
    const { caminho } = partes(texto);
    const reserva = /^\/reservas\/([^/]+)((?:\/[^/]+)*)\/?$/.exec(caminho);
    if (!reserva) return {};
    const [, numero, depois = ""] = reserva;
    const resto = depois.split("/").filter(Boolean);
    return resto.length > 0 ? { numero, resto } : { numero };
  }, [texto]);
}

export function useRouter() {
  return roteador;
}
