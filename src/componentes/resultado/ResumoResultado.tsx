import { Info } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Pilula } from "@/componentes/comum/Pilula";
import { Selo } from "@/componentes/comum/Selo";
import type { LinhaResultado, ResumoResultado as Resumo } from "@/contrato/tipos";
import { situacaoDe } from "@/lib/consulta/consulta";
import { formatarMoeda, formatarPercentual } from "@/lib/formatacao";

function Par({
  rotulo,
  id,
  children,
}: Readonly<{ rotulo: string; id?: string; children: ReactNode }>) {
  return (
    <div>
      <span id={id} className="text-xs font-semibold tracking-[0.02em] text-texto-auxiliar">
        {rotulo}
      </span>{" "}
      {children}
    </div>
  );
}

const VALOR = "text-xl font-semibold";

/**
 * O fornecedor dos incentivos, quando todos os não cancelados (os mesmos que o backend soma) têm
 * o mesmo: o fornecedor 2 quando diferente do 1, senão o 1.
 */
function fornecedorDosIncentivos(vendas: LinhaResultado[]): string | null {
  const nomes = new Set(
    vendas
      .filter((v) => v.tipo === "incentivo" && situacaoDe(v.situacao) !== "cancelada")
      .map((v) =>
        v.fornecedor2 !== null && v.fornecedor2 !== v.fornecedor ? v.fornecedor2 : v.fornecedor,
      ),
  );
  const [unico] = nomes;
  return nomes.size === 1 && unico !== null && unico !== undefined ? unico : null;
}

function Incentivos({ resumo, vendas }: Readonly<{ resumo: Resumo; vendas: LinhaResultado[] }>) {
  const { quantidade, valor } = resumo.incentivos;
  const fornecedor = fornecedorDosIncentivos(vendas);
  return (
    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-medio border border-borda px-6 py-2.5 text-sm tabular-nums">
      <Selo tom="info" icone={Info}>
        Incentivos de fornecedores
      </Selo>{" "}
      <span>
        <b>{formatarMoeda(valor)}</b> em {quantidade} {quantidade === 1 ? "venda" : "vendas"}
        {fornecedor !== null && `, fornecedor ${fornecedor}`}
      </span>{" "}
      <span className="text-texto-auxiliar">fora da margem e do % das vendas a cliente</span>
    </div>
  );
}

function notaDosTotais(resumo: Resumo, comPeriodo: boolean): string {
  const { quantidade, margemComIncentivos, percentualComIncentivos } = resumo.incentivos;
  const percentual = formatarPercentual(percentualComIncentivos);
  const incentivos = quantidade > 1 ? "incentivos" : "incentivo";
  const comPercentual = percentual === null ? "" : ` (${percentual})`;
  return [
    "Totais sem as canceladas.",
    ...(quantidade > 0
      ? [
          `Com ${quantidade > 1 ? "os incentivos juntos" : "o incentivo junto"}, a margem seria ${formatarMoeda(margemComIncentivos)}${comPercentual}.`,
          `As contagens dos filtros incluem ${quantidade > 1 ? "os " : "o "}${incentivos}.`,
        ]
      : []),
    ...(comPeriodo
      ? ["Uma reserva pode ter vendas fora deste período: abra a reserva para ver todas."]
      : []),
  ].join(" ");
}

/** Os números vêm do backend (nada é somado aqui); a nota diz o que os totais deixam de fora. */
export function ResumoResultado({
  resumo,
  vendas,
  comPeriodo,
  soNaoFecham,
  aoAlternarNaoFecham,
}: Readonly<{
  resumo: Resumo;
  vendas: LinhaResultado[];
  comPeriodo: boolean;
  soNaoFecham: boolean;
  aoAlternarNaoFecham: () => void;
}>) {
  const percentual = formatarPercentual(resumo.percentualLucro);
  // O nome do botão é o número, como no canvas; o rótulo ao lado o descreve.
  const idNaoFecham = useId();
  return (
    <>
      <section
        aria-label="Resumo do resultado"
        className="mt-4 flex flex-wrap items-baseline gap-x-10 gap-y-2 rounded-medio bg-superficie-sutil px-6 py-4 tabular-nums"
      >
        <Par rotulo="Vendas a cliente">
          <span className={VALOR}>{resumo.quantidade}</span>
        </Par>
        <Par rotulo="Total cliente">
          <span className={VALOR}>{formatarMoeda(resumo.totalCliente)}</span>
        </Par>
        <Par rotulo="Margem">
          <span className={VALOR}>{formatarMoeda(resumo.margem)}</span>
          {percentual !== null && (
            <>
              {" "}
              <span className="text-sm text-texto-auxiliar">{percentual}</span>
            </>
          )}
        </Par>
        <Par rotulo="Contas que não fecham" id={idNaoFecham}>
          {resumo.naoFecham > 0 ? (
            <Pilula
              aria-describedby={idNaoFecham}
              pressionada={soNaoFecham}
              onClick={aoAlternarNaoFecham}
              className="align-middle text-xl font-semibold"
            >
              {resumo.naoFecham}
            </Pilula>
          ) : (
            <>
              <span className={VALOR}>0</span>{" "}
              <span className="text-sm text-estado-sucesso">todas fecham</span>
            </>
          )}
        </Par>
      </section>
      {resumo.incentivos.quantidade > 0 && <Incentivos resumo={resumo} vendas={vendas} />}
      <p className="mt-1.5 text-[13px] leading-5 text-texto-auxiliar">
        {notaDosTotais(resumo, comPeriodo)}
      </p>
    </>
  );
}
