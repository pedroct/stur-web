import { Fragment } from "react";
import { Cabeca, CELULA } from "@/componentes/comum/tabela";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHeader,
  TableRow,
} from "@/componentes/ui/table";
import type { Itinerario, TrechoAgi, VendaConsultada } from "@/contrato/tipos";
import type { Classificacao } from "@/lib/consulta/consulta";
import { cn } from "@/lib/utils";
import { CAMPOS_ANEXO_B } from "@/lib/venda/anexo-b";
import { fornecedoresDe, preenchido } from "@/lib/venda/campos";
import { dataSolta } from "@/lib/venda/datas";
import {
  caminhosEmTela,
  esperaEmTexto,
  estadiaEmTexto,
  fraseDoItinerario,
  momentoDoTrecho,
  rotaDoTrajeto,
} from "@/lib/venda/itinerario";
import type { NivelDeTitulo } from "./GrupoDeCampos";
import { RestoDoGrupo, SecaoDoProduto, texto } from "./produto-comum";

type Trajeto = Itinerario["trajetos"][number];
type Local = NonNullable<TrechoAgi["origem"]>;

const GRUPO = "Itinerário (aéreo e rodoviário)";
const DATA_PARTIDA = "trechos[].dtPartida";
const LINHA_DE_NOTA = cn(CELULA, "bg-superficie-sutil text-[13px] leading-5 text-texto-auxiliar");
const NOTA = "mt-2 text-[13px] leading-5 text-texto-auxiliar";

function sigla(local: Local | null | undefined): string {
  return texto(local?.sigla) ?? texto(local?.cidade) ?? "—";
}

/** Os aeroportos no lugar das cidades, no aéreo; no rodoviário, as cidades e os terminais como vêm do Stur. */
function subtitulo(t: TrechoAgi, rodoviario: boolean): string | null {
  const cidades = [texto(t.origem?.cidade), texto(t.destino?.cidade)];
  const terminais = [texto(t.origem?.aeroporto), texto(t.destino?.aeroporto)];
  if (!rodoviario) {
    const de = terminais[0] ?? cidades[0];
    const para = terminais[1] ?? cidades[1];
    return de === null || para === null ? null : `${de} → ${para}`;
  }
  const rota = cidades[0] === null || cidades[1] === null ? null : `${cidades[0]} → ${cidades[1]}`;
  const [saida, chegada] = terminais;
  let onde: string | null = null;
  if (saida !== null && chegada !== null) onde = `terminais ${saida} e ${chegada}`;
  else if (saida !== null || chegada !== null) onde = `terminal ${saida ?? chegada}`;
  return [rota, onde].filter((parte) => parte !== null).join(" · ") || null;
}

function Linhas({
  trajeto,
  posicao,
  itinerario,
  trechos,
  hoje,
  rodoviario,
  colunas,
}: Readonly<{
  trajeto: Trajeto;
  posicao: number;
  itinerario: Itinerario;
  trechos: TrechoAgi[];
  hoje: string;
  rodoviario: boolean;
  colunas: number;
}>) {
  const estadia = itinerario.estadias.find((e) => e.aposTrajeto === posicao);
  return (
    <>
      {trajeto.trechos.map((indice) => {
        const t = trechos[indice];
        if (t === undefined) return null;
        const espera = trajeto.esperas.find((e) => e.aposTrecho === indice);
        const detalhe = subtitulo(t, rodoviario);
        const voo = [texto(t.cia), texto(t.voo)].filter((p) => p !== null).join(" ");
        const classe = [texto(t.classe), texto(t.farebase)].filter((p) => p !== null).join(" · ");
        return (
          <Fragment key={indice}>
            <TableRow className="border-borda hover:bg-transparent">
              <TableCell className={CELULA}>
                <span className="font-semibold">
                  {sigla(t.origem)} → {sigla(t.destino)}
                </span>
                {detalhe !== null && (
                  <div className="text-[13px] leading-5 text-texto-auxiliar">{detalhe}</div>
                )}
              </TableCell>
              {!rodoviario && <TableCell className={CELULA}>{voo || "—"}</TableCell>}
              <TableCell className={CELULA}>
                {momentoDoTrecho(t.dtPartida, DATA_PARTIDA, hoje) ?? "—"}
              </TableCell>
              <TableCell className={CELULA}>
                {momentoDoTrecho(t.dtChegada, "trechos[].dtChegada", hoje) ?? "—"}
              </TableCell>
              {!rodoviario && <TableCell className={CELULA}>{classe || "—"}</TableCell>}
              <TableCell className={CELULA}>{texto(t.localizador) ?? "—"}</TableCell>
            </TableRow>
            {espera !== undefined && (
              <TableRow className="border-borda hover:bg-transparent">
                <TableCell colSpan={colunas} className={LINHA_DE_NOTA}>
                  {esperaEmTexto(espera, trechos)}
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        );
      })}
      {estadia !== undefined && (
        <TableRow className="border-borda hover:bg-transparent">
          <TableCell colSpan={colunas} className={LINHA_DE_NOTA}>
            {estadiaEmTexto(estadia)}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function TabelaDosTrechos({
  itinerario,
  trechos,
  hoje,
  rodoviario,
}: Readonly<{
  itinerario: Itinerario;
  trechos: TrechoAgi[];
  hoje: string;
  rodoviario: boolean;
}>) {
  const colunas = rodoviario
    ? ["Trecho", "Partida", "Chegada", "Localizador"]
    : ["Trecho", "Voo", "Partida", "Chegada", "Classe e base tarifária", "Localizador"];
  return (
    <div className="mt-4 rounded-medio border border-borda">
      <Table className="min-w-[720px]">
        <TableCaption className="sr-only">
          {rodoviario ? "Trechos da passagem de ônibus" : "Trechos do voo"}
        </TableCaption>
        <TableHeader>
          <TableRow className="border-borda hover:bg-transparent">
            {colunas.map((c) => (
              <Cabeca key={c}>{c}</Cabeca>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="tabular-nums">
          {itinerario.trajetos.map((trajeto, posicao) => (
            <Linhas
              // biome-ignore lint/suspicious/noArrayIndexKey: a posição do trajeto é a identidade dele
              key={posicao}
              trajeto={trajeto}
              posicao={posicao}
              itinerario={itinerario}
              trechos={trechos}
              hoje={hoje}
              rodoviario={rodoviario}
              colunas={colunas.length}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ListaDeDatas({
  itinerario,
  trechos,
  hoje,
}: Readonly<{ itinerario: Itinerario; trechos: TrechoAgi[]; hoje: string }>) {
  return (
    <ul className="mt-4 flex flex-col gap-1 text-base leading-6 tabular-nums">
      {itinerario.trajetos.map((trajeto, posicao) => {
        const partida = trechos[trajeto.trechos[0] ?? -1]?.dtPartida;
        const estadia = itinerario.estadias.find((e) => e.aposTrajeto === posicao);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a posição do trajeto é a identidade dele
          <Fragment key={posicao}>
            <li>
              {partida !== null && partida !== undefined && preenchido(partida, DATA_PARTIDA) && (
                <>
                  <b>{dataSolta(partida, hoje)}</b>
                  {" · "}
                </>
              )}
              {rotaDoTrajeto(trajeto, trechos)}
            </li>
            {estadia !== undefined && (
              <li className="text-texto-auxiliar">{estadiaEmTexto(estadia)}</li>
            )}
          </Fragment>
        );
      })}
    </ul>
  );
}

/**
 * O itinerário (IA 6.10; telas 2 e 8), em três formas: sem dados, só as datas e com horário. O que
 * a forma não mostra de cada trecho vai para o grupo do Anexo B, no fim da seção. A empresa de
 * ônibus é a do fornecedor 2.
 */
export function SecaoItinerario({
  dados,
  classificacao,
  hoje,
  nivelBase,
}: Readonly<{
  dados: VendaConsultada;
  classificacao: Classificacao;
  hoje: string;
  nivelBase: 1 | 2;
}>) {
  const { venda, calculos } = dados;
  const itinerario = calculos.itinerario;
  const trechos = venda.trechos ?? [];
  if (itinerario === null || itinerario === undefined || trechos.length === 0) return null;

  const rodoviario = classificacao === "rodoviario";
  const fornecedor2 = texto(venda.nomefornec2);
  const empresa =
    rodoviario && fornecedor2 !== null
      ? fornecedoresDe(texto(venda.nomefornec), fornecedor2).principal
      : null;
  const mostrados = caminhosEmTela(itinerario.forma, rodoviario);
  const restantes = CAMPOS_ANEXO_B.filter(
    (c) => c.grupo === GRUPO && !c.conteiner && !mostrados.has(c.caminho),
  );

  return (
    <SecaoDoProduto titulo="Itinerário" nivelBase={nivelBase}>
      <p className="mt-1 text-base leading-6">{fraseDoItinerario(itinerario, trechos, empresa)}</p>
      {itinerario.forma === "com_horario" && (
        <>
          <TabelaDosTrechos
            itinerario={itinerario}
            trechos={trechos}
            hoje={hoje}
            rodoviario={rodoviario}
          />
          <p className={NOTA}>
            {rodoviario
              ? "Horários locais; o Stur não informa o fuso."
              : "A aplicação calcula a espera pelos horários no mesmo aeroporto. Horários locais; o Stur não informa o fuso."}
          </p>
        </>
      )}
      {itinerario.forma === "so_datas" && (
        <>
          <ListaDeDatas itinerario={itinerario} trechos={trechos} hoje={hoje} />
          <p className={NOTA}>
            O Stur informa só as datas: sem voo, classe, horário nem localizador.
          </p>
        </>
      )}
      {itinerario.forma === "sem_dados" && (
        <p className={NOTA}>O Stur não informa data, voo, classe nem localizador neste bilhete.</p>
      )}
      <RestoDoGrupo
        campos={restantes}
        titulo="Outros dados do itinerário"
        tituloRecolhido="Conexão e fuso horário"
        venda={venda}
        calculos={calculos}
        indices={[]}
        nivel={(nivelBase + 2) as NivelDeTitulo}
      />
    </SecaoDoProduto>
  );
}
