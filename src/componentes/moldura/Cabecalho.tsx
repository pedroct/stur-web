import Image from "next/image";
import Link from "next/link";
import { BotaoTema } from "./BotaoTema";
import { BuscaCompacta } from "./BuscaCompacta";

export function Cabecalho({ comBusca }: { comBusca: boolean }) {
  return (
    <header className="border-b border-borda">
      <div className="mx-auto flex min-h-[var(--altura-cabecalho)] max-w-[var(--largura-maxima)] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-2">
        <Link
          href="/"
          title="Nova consulta"
          className="flex items-center gap-3 rounded-pequeno text-texto-principal no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {/* Logo clara no tema claro, negativa no escuro (a variante dark: segue o data-theme). */}
          <Image
            src="/marca/a3-logo-recortada.svg"
            alt="A3 Turismo"
            width={49}
            height={40}
            className="h-10 w-auto dark:hidden"
          />
          <Image
            src="/marca/a3-logo-negativa.svg"
            alt="A3 Turismo"
            width={49}
            height={40}
            className="hidden h-10 w-auto dark:block"
          />
          <span className="text-lg font-semibold">Consulta de reserva</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          {comBusca && <BuscaCompacta />}
          <BotaoTema />
        </div>
      </div>
    </header>
  );
}
