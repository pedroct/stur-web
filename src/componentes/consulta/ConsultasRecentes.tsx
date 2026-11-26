"use client";

import { useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";
import { marcarPendente } from "@/lib/armazenamento/pendentes";
import { descreverQuando, lerRecentes, type Recente } from "@/lib/armazenamento/recentes";

/** "Reserva 90000001": o número em destaque, como no canvas. */
function Descricao({ texto }: { texto: string }) {
  const reserva = /^(Reserva )(\d+)$/.exec(texto);
  if (!reserva) return texto;
  return (
    <>
      {reserva[1]}
      <span className="font-semibold tabular-nums">{reserva[2]}</span>
    </>
  );
}

/** Consultas recentes, lidas do navegador depois da montagem. Sem nenhuma, não aparece. */
export function ConsultasRecentes() {
  const router = useRouter();
  const [lista, setLista] = useState<{ recentes: Recente[]; agora: Date } | null>(null);

  useEffect(() => {
    setLista({ recentes: lerRecentes(), agora: new Date() });
  }, []);

  if (!lista || lista.recentes.length === 0) return null;

  function abrir(evento: MouseEvent<HTMLAnchorElement>, endereco: string) {
    // Com tecla ou botão do meio, o navegador abre onde a pessoa pediu.
    if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey)
      return;
    evento.preventDefault();
    if (endereco.startsWith("/consulta?")) marcarPendente(endereco);
    router.push(endereco);
  }

  return (
    <section
      aria-labelledby="consultas-recentes"
      className="mx-auto mt-12 w-full max-w-[var(--largura-leitura)]"
    >
      <h2 id="consultas-recentes" className="mb-3 text-xl leading-7 font-semibold">
        Consultas recentes
      </h2>
      <ul className="border-t border-borda">
        {lista.recentes.map(({ endereco, descricao, detalhe, quando }) => (
          <li
            key={endereco}
            className="relative flex justify-between gap-4 border-b border-borda py-3.5"
          >
            <a
              href={endereco}
              onClick={(evento) => abrir(evento, endereco)}
              className="text-texto-principal outline-0 after:absolute after:inset-0 hover:text-acao-primaria focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
            >
              <Descricao texto={descricao} /> · {detalhe}
            </a>
            <span className="shrink-0 text-sm text-texto-auxiliar">
              {descreverQuando(quando, lista.agora)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-texto-auxiliar">
        Ficam só neste navegador, sem dado da venda.
      </p>
    </section>
  );
}
