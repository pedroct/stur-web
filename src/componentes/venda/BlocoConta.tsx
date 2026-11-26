import type { ReactNode } from "react";
import type {
  CalculosVenda,
  ContaLado,
  ContaServico,
  ServicoAgi,
  VendaAgi,
} from "@/contrato/tipos";
import { classificacaoDe } from "@/lib/consulta/consulta";
import { ehDecimal } from "@/lib/decimal";
import { formatarValor } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { CAMPOS_ANEXO_B, type CampoAnexo } from "@/lib/venda/anexo-b";
import {
  caminhosDaConta,
  efeitoDoTermo,
  ehTarifa,
  fraseComissoes,
  frasesDeReferencia,
  fraseZerados,
  type Lado,
  linhaDasTarifas,
  linhaDaTarifa,
  rotuloDoTermo,
  rotuloDoTermoSomado,
  somarContas,
} from "@/lib/venda/conta";
import { GrupoDeCampos, type NivelDeTitulo, temCampos } from "./GrupoDeCampos";

const NOMES: Record<Lado, { titulo: string; total: string; grupo: string }> = {
  cliente: { titulo: "Cliente", total: "Total do cliente", grupo: "Conta do cliente" },
  fornecedor: { titulo: "Fornecedor", total: "Custo do fornecedor", grupo: "Conta do fornecedor" },
};

const DIARIA: Record<Lado, string> = {
  cliente: "detalheItem[].apartamentos[].vlrDiaria",
  fornecedor: "detalheItem[].apartamentos[].vlrDiariaP",
};

function valor(texto: string): string {
  return ehDecimal(texto) ? formatarValor(texto) : texto;
}

/** Os campos do grupo, na ordem do Anexo B, sem os contêineres. */
function camposDoGrupo(grupo: string): CampoAnexo[] {
  return CAMPOS_ANEXO_B.filter((c) => c.grupo === grupo && !c.conteiner);
}

function tituloDaConta(classificacao: string | null, servicos: number): string {
  if (servicos > 1) return "Conta da venda";
  const classe = classificacaoDe(classificacao);
  if (classe === "hotelaria") return "Conta da hospedagem";
  if (classe === "locacao") return "Conta da locação";
  return "Conta do serviço";
}

function Linha({
  sinal,
  rotulo,
  valor: texto,
  total = false,
}: Readonly<{
  sinal: "+" | "−" | "";
  rotulo: ReactNode;
  valor: string;
  total?: boolean;
}>) {
  const destaque = total && "border-t-2 border-texto-principal pt-2.5 text-lg font-semibold";
  return (
    <>
      <span aria-hidden="true" className="text-center font-semibold text-texto-auxiliar">
        {sinal}
      </span>
      <span className={cn("min-w-0", destaque)}>{rotulo}</span>
      <span className={cn("text-right", destaque)}>{texto}</span>
    </>
  );
}

function LadoDaConta({
  lado,
  conta,
  tarifa,
  rotulo,
  secaoDaTarifa,
  resto,
  nivel,
}: Readonly<{
  lado: Lado;
  conta: ContaLado;
  tarifa: { linhas: string[]; nota: string | null };
  rotulo: (campo: string) => string;
  /** 3 quando a linha mostra a diária dos apartamentos, que é da seção 3 do Anexo B. */
  secaoDaTarifa?: 3;
  resto: ReactNode;
  nivel: NivelDeTitulo;
}>) {
  const Titulo = `h${nivel}` as const;
  const termoDaTarifa = conta.termos.find((t) => ehTarifa(t.campo, lado));
  const outros = conta.termos.filter((t) => !ehTarifa(t.campo, lado));
  return (
    <section className="min-w-0">
      <Titulo className="text-xs leading-4 font-semibold tracking-[0.02em] text-texto-auxiliar">
        {NOMES[lado].titulo}
      </Titulo>
      <div className="mt-3 grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-2.5 text-[15px] leading-[22px] tabular-nums">
        {termoDaTarifa !== undefined && (
          <Linha
            sinal=""
            rotulo={
              <>
                <span className="block" data-anexo-secao={secaoDaTarifa}>
                  {tarifa.linhas.map((l, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: dois apartamentos iguais dão a mesma linha, e a posição desempata
                    <span key={`${i}-${l}`} className="block">
                      {l}
                    </span>
                  ))}
                </span>
                {tarifa.nota !== null && (
                  <span className="block text-[13px] leading-5 text-texto-auxiliar">
                    {tarifa.nota}
                  </span>
                )}
              </>
            }
            valor={valor(termoDaTarifa.valor)}
          />
        )}
        {outros.map((t) => (
          <Linha
            key={t.campo}
            sinal={t.efeito === "soma" ? "+" : "−"}
            rotulo={
              <>
                {rotulo(t.campo)}
                <span className="block text-[13px] leading-5 text-texto-auxiliar">
                  {efeitoDoTermo(t.efeito, lado)}
                </span>
              </>
            }
            valor={valor(t.valor)}
          />
        ))}
        <Linha sinal="" rotulo={NOMES[lado].total} valor={valor(conta.total)} total />
      </div>
      {resto}
    </section>
  );
}

/**
 * A conta do serviço (IA 6.6 e 6.10; decisões 5 a 7 e 23): cliente e fornecedor lado a lado, termo
 * a termo, com "Total do cliente" e "Custo do fornecedor" em destaque, e a frase das comissões,
 * das referências e dos zerados. Com uma conta, os campos dos grupos "Conta do cliente" e "Conta
 * do fornecedor" que ela não mostra vêm embaixo de cada lado; com várias, a soma da decisão 23. No
 * painel (`noPainel`), recebe só a conta do serviço aberto e fica sem o título da seção.
 */
export function BlocoConta({
  contas,
  servicos,
  classificacao,
  situacao,
  venda,
  nivelBase = 1,
  noPainel = false,
}: Readonly<{
  contas: ContaServico[];
  servicos: ServicoAgi[];
  classificacao: string | null;
  situacao: string | null;
  /** A venda, para o `GrupoDeCampos` do que a conta não mostra. */
  venda: VendaAgi;
  nivelBase?: 1 | 2;
  noPainel?: boolean;
}>) {
  const [primeira] = contas;
  const [servico] = servicos;
  if (primeira === undefined) return null;
  const unica: ContaServico = primeira;
  const somada = contas.length > 1;
  const conta = somada ? somarContas(contas) : unica;
  const mostrados =
    !somada && servico !== undefined ? caminhosDaConta(unica, servico, classificacao) : null;
  const nivel = (noPainel ? 3 : nivelBase + 2) as NivelDeTitulo;
  const Titulo = nivelBase === 1 ? "h2" : "h3";

  function lado(l: Lado) {
    const tarifa =
      somada || servico === undefined
        ? linhaDasTarifas(l, contas)
        : linhaDaTarifa(l, unica[l], servico, classificacao);
    const rotulo = (campo: string) =>
      somada || servico === undefined
        ? rotuloDoTermoSomado(campo, l, classificacao, servicos)
        : rotuloDoTermo(campo, l, classificacao, servico);
    const resto =
      mostrados === null ? null : (
        <GrupoDeCampos
          titulo={NOMES[l].grupo}
          campos={camposDoGrupo(NOMES[l].grupo).filter((c) => !mostrados.has(c.caminho))}
          venda={venda}
          indices={[unica.indice]}
          nivel={nivel}
          semTitulo
          className="mt-4"
        />
      );
    return (
      <LadoDaConta
        lado={l}
        conta={conta[l]}
        tarifa={tarifa}
        rotulo={rotulo}
        secaoDaTarifa={mostrados?.has(DIARIA[l]) ? 3 : undefined}
        resto={resto}
        nivel={nivel}
      />
    );
  }

  const referencias = somada || servico === undefined ? [] : frasesDeReferencia(servico);
  const zerados = fraseZerados(
    conta,
    noPainel ? "Zerados neste serviço" : "Zerados",
    classificacao,
  );
  const secaoDoCampo = (caminho: string) =>
    CAMPOS_ANEXO_B.find((c) => c.caminho === caminho)?.secao;
  const frases: { texto: string; secao?: number }[] = [
    { texto: fraseComissoes(contas, servicos, situacao) },
    ...referencias.map((r) => ({ texto: r.texto, secao: secaoDoCampo(r.caminho) })),
    ...(zerados === null ? [] : [{ texto: zerados }]),
    { texto: "Totais calculados pela aplicação." },
  ];

  return (
    <section data-anexo-secao="5" className={noPainel ? "mt-8" : "mt-10"}>
      {!noPainel && (
        <Titulo className="text-xl leading-7 font-semibold">
          {tituloDaConta(classificacao, contas.length)}
          {somada && " "}
          {somada && (
            <span className="font-normal text-texto-auxiliar">
              · soma dos {contas.length} serviços
            </span>
          )}
        </Titulo>
      )}
      <div
        className={cn(
          "grid gap-x-10 gap-y-8",
          noPainel ? "grid-cols-1" : "mt-4 min-[900px]:grid-cols-2",
        )}
      >
        {lado("cliente")}
        {lado("fornecedor")}
      </div>
      <p className="mt-5 text-[13px] leading-5 text-texto-auxiliar tabular-nums">
        {frases.map((f, i) => (
          <span key={f.texto} data-anexo-secao={f.secao === 5 ? undefined : f.secao}>
            {i > 0 && " "}
            {f.texto}
          </span>
        ))}
      </p>
    </section>
  );
}

/**
 * Os grupos da seção 5 do Anexo B que a conta não mostra (decisão 22): Observações e Comissões da
 * equipe visíveis; Tarifas de referência (com a diária de balcão, decisão 6) e Repasses e
 * faturamento recolhidos; "Valores na moeda original" só com moeda estrangeira. `excluir` tira os
 * campos que já estão em outro lugar da mesma tela.
 */
export function GruposDoServico({
  venda,
  calculos,
  indice,
  nivel,
  excluir,
}: Readonly<{
  venda: VendaAgi;
  calculos: CalculosVenda;
  indice: number;
  nivel: NivelDeTitulo;
  excluir: Set<string>;
}>) {
  const comuns = { venda, calculos, indices: [indice], nivel };
  const doGrupo = (grupo: string) => camposDoGrupo(grupo).filter((c) => !excluir.has(c.caminho));
  const balcao = CAMPOS_ANEXO_B.filter(
    (c) => c.caminho === "detalheItem[].apartamentos[].vlrBalcao",
  );
  const referencia = [...camposDoGrupo("Tarifas de referência"), ...balcao];
  const repasses = doGrupo("Repasses e faturamento");
  // Sem nenhum dos dois recolhidos, o invólucro deles não fica vazio na página.
  const recolhidos = [referencia, repasses].some((campos) =>
    temCampos(campos, venda, calculos, [indice]),
  );
  return (
    <div data-anexo-secao="5" className="mt-6 space-y-6 empty:hidden">
      <GrupoDeCampos titulo="Observações" campos={doGrupo("Observações")} {...comuns} />
      <GrupoDeCampos
        titulo="Comissões da equipe"
        campos={doGrupo("Comissões da equipe")}
        {...comuns}
      />
      {recolhidos && (
        <div className="space-y-1">
          <GrupoDeCampos titulo="Tarifas de referência" campos={referencia} recolhido {...comuns} />
          <GrupoDeCampos titulo="Repasses e faturamento" campos={repasses} recolhido {...comuns} />
        </div>
      )}
      <GrupoDeCampos
        titulo="Valores na moeda original"
        campos={doGrupo("Valores na moeda original")}
        {...comuns}
      />
    </div>
  );
}
