import { act } from "@testing-library/react";
import { useMemo, useSyncExternalStore } from "react";
import { vi } from "vitest";

// Mock reativo de next/navigation: o endereço vive aqui e quem o lê (usePathname,
// useSearchParams, useParams) é avisado quando ele muda, como no Next. Assim um
// replace/push feito pela tela muda o que ela mesma lê.
let endereco = "/";
const inscritos = new Set<() => void>();

export function definirEndereco(novo: string): void {
  endereco = novo;
  if (inscritos.size === 0) return;
  act(() => {
    for (const avisar of inscritos) avisar();
  });
}

export const roteador = {
  push: vi.fn((destino: string) => definirEndereco(destino)),
  replace: vi.fn((destino: string) => definirEndereco(destino)),
  back: vi.fn(),
};

/** Depois de cada teste: zera as chamadas e volta ao "/" sem avisar (o cleanup já desmontou tudo). */
export function zerarNavegacao(): void {
  roteador.push.mockClear();
  roteador.replace.mockClear();
  roteador.back.mockClear();
  endereco = "/";
}

function inscrever(avisar: () => void): () => void {
  inscritos.add(avisar);
  return () => {
    inscritos.delete(avisar);
  };
}

const lerEndereco = () => endereco;

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

export function useParams(): { numero?: string; idreserva?: string } {
  const texto = useEndereco();
  return useMemo(() => {
    const { caminho } = partes(texto);
    const venda = /^\/reservas\/([^/]+)\/vendas\/([^/]+)\/?$/.exec(caminho);
    if (venda) return { numero: venda[1], idreserva: venda[2] };
    const reserva = /^\/reservas\/([^/]+)\/?$/.exec(caminho);
    return reserva ? { numero: reserva[1] } : {};
  }, [texto]);
}

export function useRouter() {
  return roteador;
}
