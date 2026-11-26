import { Esqueleto } from "@/componentes/comum/Esqueleto";

/** Larguras do rótulo, do valor e da frase de cada cartão do Financeiro, como no canvas. */
const CARTOES = [
  { rotulo: 60, valor: 140, frase: "90%" },
  { rotulo: 80, valor: 140, frase: "80%" },
  { rotulo: 60, valor: 120, frase: "70%" },
];

/** Tela 11: o cabeçalho, os três cartões e duas seções em formas cinzas, à espera da venda. */
export function EsqueletoVenda() {
  return (
    <div aria-hidden="true" data-esqueleto-venda>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-[1_1_35rem] flex-col gap-3">
          <div className="flex gap-2">
            <Esqueleto largura={140} altura={24} />
            <Esqueleto largura={120} altura={24} />
            <Esqueleto largura={160} altura={24} />
          </div>
          <Esqueleto largura={360} altura={40} />
          <Esqueleto largura={520} altura={20} />
        </div>
        <div className="flex flex-col items-end gap-2.5">
          <Esqueleto largura={200} altura={44} />
          <Esqueleto largura={260} altura={16} />
          <Esqueleto largura={220} altura={16} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 rounded-medio border border-borda px-5 py-4 md:grid-cols-3">
        {CARTOES.map(({ rotulo, valor, frase }) => (
          <div key={`${rotulo}-${valor}-${frase}`} className="flex flex-col gap-2">
            <Esqueleto largura={rotulo} altura={14} />
            <Esqueleto largura={valor} altura={28} />
            <Esqueleto largura={frase} altura={16} />
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Esqueleto largura={160} altura={28} />
        <div className="mt-3">
          <Esqueleto largura={420} altura={20} />
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-medio border border-borda p-4">
          <Esqueleto largura="100%" altura={16} />
          <Esqueleto largura="100%" altura={40} />
          <Esqueleto largura="100%" altura={40} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 rounded-medio border border-borda px-5 py-4 md:grid-cols-2">
        {[60, 80].map((rotulo) => (
          <div key={rotulo} className="flex flex-col gap-2.5">
            <Esqueleto largura={rotulo} altura={14} />
            <Esqueleto largura="100%" altura={18} />
            <Esqueleto largura="100%" altura={18} />
          </div>
        ))}
      </div>
    </div>
  );
}
