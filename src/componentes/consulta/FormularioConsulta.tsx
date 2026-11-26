"use client";

import { CircleAlert, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Aviso } from "@/componentes/comum/Aviso";
import { CampoNumero } from "@/componentes/comum/CampoNumero";
import { Pilula } from "@/componentes/comum/Pilula";
import { Filtros } from "@/componentes/filtros/Filtros";
import { useBuscaDoTopo } from "@/componentes/moldura/consultando";
import { Button } from "@/componentes/ui/button";
import { useParametros } from "@/lib/api/parametros";
import { marcarPendente } from "@/lib/armazenamento/pendentes";
import { type AtalhoPeriodo, periodoDoAtalho } from "@/lib/consulta/atalhos-periodo";
import {
  type Consulta,
  chaveConsulta,
  lerConsulta,
  numeroDaReserva,
  soNumero,
  type TipoData,
  validarConsulta,
} from "@/lib/consulta/consulta";
import { rotuloDaData } from "@/lib/consulta/descricao";
import { formatarDadosAte } from "@/lib/formatacao";
import { hojeEmFortaleza } from "@/lib/tempo";
import { cn } from "@/lib/utils";

type ControleDoFormulario = "reserva" | "tipoData" | "de" | "ate" | "situacao" | "produto";

/** O controle a que o `campo` de um 422 se refere; `null` vale para a mensagem geral. */
export function campoDoFormulario(campo: string | null): ControleDoFormulario | null {
  switch (campo) {
    case "reserva":
    case "tipoData":
    case "de":
    case "ate":
    case "situacao":
      return campo;
    case "classificacao":
      return "produto";
    default:
      return null;
  }
}

const TIPOS_DE_DATA: TipoData[] = ["emissao", "confirmacao", "alteracao"];

const ATALHOS: { atalho: AtalhoPeriodo; rotulo: string }[] = [
  { atalho: "hoje", rotulo: "Hoje" },
  { atalho: "ultimos7", rotulo: "Últimos 7 dias" },
  { atalho: "esteMes", rotulo: "Este mês" },
  { atalho: "mesPassado", rotulo: "Mês passado" },
];

const CLASSES_DO_CONTROLE =
  "rounded-pequeno text-base aria-invalid:border-2 aria-invalid:px-[15px]";

const CLASSES_DA_DATA =
  "h-alvo w-[180px] rounded-pequeno border border-borda-controle bg-superficie px-4 text-base text-texto-principal outline-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco aria-invalid:border-2 aria-invalid:border-estado-erro aria-invalid:px-[15px]";

function aparar(texto: string | null): string | null {
  const aparado = texto?.trim() ?? "";
  return aparado === "" ? null : aparado;
}

function MensagemDeErro({
  id,
  alerta = false,
  className,
  children,
}: {
  id?: string;
  alerta?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role={alerta ? "alert" : undefined}
      // Recebe o foco quando o erro de um 422 não tem campo que o receba.
      tabIndex={-1}
      className={cn(
        "flex items-start gap-2 text-sm leading-5 text-estado-erro outline-0",
        className,
      )}
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

export interface PropsDoFormulario {
  inicial: Consulta;
  avisoLink?: boolean;
  erroInicial?: { campo: string | null; mensagem: string };
  aoConsultar?: (consulta: Consulta) => void;
}

/**
 * Formulário da consulta (tela 1, 1c, Alterar consulta e volta de um 422). Só número vai à
 * reserva; com `aoConsultar` e a consulta já aberta, chama a função (o Next não monta a página
 * de novo num `push` ao mesmo endereço); senão marca o pedido e navega para o resultado.
 */
export function FormularioConsulta({
  inicial,
  avisoLink = false,
  erroInicial,
  aoConsultar,
}: PropsDoFormulario) {
  const router = useRouter();
  const caminho = usePathname();
  const enderecoAberto = useSearchParams();
  const { periodoMaximoDias, dadosDoSturAte } = useParametros();
  const { ocultar } = useBuscaDoTopo();
  const prefixo = useId();

  const [consulta, setConsulta] = useState<Consulta>(inicial);
  const [numero, setNumero] = useState(inicial.reserva === null ? "" : String(inicial.reserva));
  const [erro, setErro] = useState(erroInicial ?? null);

  const campoNumero = useRef<HTMLInputElement>(null);
  const campoDe = useRef<HTMLInputElement>(null);
  const campoAte = useRef<HTMLInputElement>(null);
  const grupoDoTipo = useRef<HTMLDivElement>(null);

  // O formulário já tem o campo de número: a busca do topo sai (e volta ao sair da página).
  useEffect(() => {
    ocultar(true);
    return () => ocultar(false);
  }, [ocultar]);

  // Volta de um 422: o foco vai ao controle do erro ou, sem controle que o receba, à mensagem.
  const errouAoMontar = useRef(erroInicial !== undefined);
  useEffect(() => {
    if (!errouAoMontar.current) return;
    errouAoMontar.current = false;
    const controle = campoDoFormulario(erroInicial?.campo ?? null);
    if (controle === "reserva" || controle === "de" || controle === "ate") {
      levarFoco(controle);
    } else if (controle === "tipoData") {
      grupoDoTipo.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    } else {
      document.getElementById(idDoErro)?.focus();
    }
  });

  const controleComErro = erro ? campoDoFormulario(erro.campo) : null;
  const idDoErro = `${prefixo}-erro`;
  const descritoPor = (controle: ControleDoFormulario) =>
    controleComErro === controle ? idDoErro : undefined;
  const invalido = (controle: ControleDoFormulario) => controleComErro === controle || undefined;

  function mudar(parcial: Partial<Consulta>) {
    setConsulta((atual) => ({ ...atual, ...parcial }));
    setErro(null);
  }

  function escolherTipo(tipo: TipoData) {
    mudar({ tipoData: tipo });
  }

  function trocarTipoComSetas(evento: KeyboardEvent<HTMLDivElement>) {
    const passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[evento.key];
    if (passo === undefined) return;
    evento.preventDefault();
    const atual = TIPOS_DE_DATA.indexOf(consulta.tipoData);
    const proximo = (atual + passo + TIPOS_DE_DATA.length) % TIPOS_DE_DATA.length;
    escolherTipo(TIPOS_DE_DATA[proximo] ?? consulta.tipoData);
    grupoDoTipo.current?.querySelectorAll<HTMLElement>('[role="radio"]')[proximo]?.focus();
  }

  function levarFoco(controle: "reserva" | "de" | "ate") {
    const campo = { reserva: campoNumero, de: campoDe, ate: campoAte }[controle];
    campo.current?.focus();
  }

  function consultar(evento: FormEvent) {
    evento.preventDefault();
    // Quem recebe a consulta não apara: textos aparados e vazios como null saem daqui.
    const pedida: Consulta = {
      ...consulta,
      reserva: numeroDaReserva(numero),
      fornecedor: aparar(consulta.fornecedor),
      cliente: aparar(consulta.cliente),
      emissor: aparar(consulta.emissor),
    };

    const falha = validarConsulta(pedida, periodoMaximoDias);
    if (falha) {
      setErro(falha);
      levarFoco(falha.campo);
      return;
    }
    if (soNumero(pedida)) {
      router.push(`/reservas/${pedida.reserva}`);
      return;
    }
    const chave = chaveConsulta(pedida);
    const jaAberta =
      caminho === "/consulta" && chaveConsulta(lerConsulta(enderecoAberto)) === chave;
    if (aoConsultar && jaAberta) {
      aoConsultar(pedida);
      return;
    }
    marcarPendente(chave);
    router.push(chave);
  }

  const mensagem = erro?.mensagem;
  const mensagemDoFiltro =
    mensagem && (controleComErro === "situacao" || controleComErro === "produto");

  return (
    <div className="mx-auto w-full max-w-[var(--largura-leitura)] pt-8">
      <h1 className="text-4xl leading-11 font-bold tracking-[-0.01em]">Consultar vendas</h1>
      <p className="mt-2 text-base leading-6 text-texto-auxiliar">
        Pelo número da reserva, por um período ou pelos dois.
      </p>
      {avisoLink && (
        <Aviso tom="info" className="mt-6">
          <b className="font-semibold">
            Este link trouxe uma consulta pronta, que ainda não foi feita.
          </b>{" "}
          Verifique o período e os filtros abaixo e clique em Consultar.
        </Aviso>
      )}
      <form onSubmit={consultar} className="mt-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${prefixo}-numero`} className="text-sm font-semibold">
            Número da reserva
          </label>
          <CampoNumero
            ref={campoNumero}
            id={`${prefixo}-numero`}
            value={numero}
            aria-invalid={invalido("reserva")}
            aria-describedby={descritoPor("reserva")}
            aoMudar={(digitos) => {
              setNumero(digitos);
              setErro(null);
            }}
            className={cn("w-full max-w-[280px]", CLASSES_DO_CONTROLE)}
          />
          {mensagem && controleComErro === "reserva" && (
            <MensagemDeErro id={idDoErro}>{mensagem}</MensagemDeErro>
          )}
        </div>

        <fieldset className="flex min-w-0 flex-col gap-4 rounded-medio border border-borda px-6 pt-5 pb-6">
          <legend className="px-2 text-sm font-semibold">Período (opcional com número)</legend>
          <div className="flex flex-col gap-2">
            <div
              ref={grupoDoTipo}
              role="radiogroup"
              aria-label="Tipo de data"
              aria-describedby={descritoPor("tipoData")}
              onKeyDown={trocarTipoComSetas}
              className="flex flex-wrap gap-2"
            >
              {TIPOS_DE_DATA.map((tipo) => (
                <Pilula
                  key={tipo}
                  papel="radio"
                  pressionada={consulta.tipoData === tipo}
                  tabIndex={consulta.tipoData === tipo ? 0 : -1}
                  onClick={() => escolherTipo(tipo)}
                >
                  {rotuloDaData(tipo)}
                </Pilula>
              ))}
            </div>
            {mensagem && controleComErro === "tipoData" && (
              <MensagemDeErro id={idDoErro}>{mensagem}</MensagemDeErro>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor={`${prefixo}-de`} className="text-sm font-semibold">
                  De
                </label>
                <input
                  ref={campoDe}
                  id={`${prefixo}-de`}
                  type="date"
                  value={consulta.de ?? ""}
                  aria-invalid={invalido("de")}
                  aria-describedby={descritoPor("de")}
                  onChange={(e) => mudar({ de: e.target.value === "" ? null : e.target.value })}
                  className={CLASSES_DA_DATA}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor={`${prefixo}-ate`} className="text-sm font-semibold">
                  Até
                </label>
                <input
                  ref={campoAte}
                  id={`${prefixo}-ate`}
                  type="date"
                  value={consulta.ate ?? ""}
                  aria-invalid={invalido("ate")}
                  aria-describedby={descritoPor("ate")}
                  onChange={(e) => mudar({ ate: e.target.value === "" ? null : e.target.value })}
                  className={CLASSES_DA_DATA}
                />
              </div>
            </div>
            {mensagem && (controleComErro === "de" || controleComErro === "ate") && (
              <MensagemDeErro id={idDoErro}>{mensagem}</MensagemDeErro>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {ATALHOS.map(({ atalho, rotulo }) => (
              <Button
                key={atalho}
                type="button"
                variant="secundaria"
                size="compacto"
                onClick={() => mudar(periodoDoAtalho(atalho, hojeEmFortaleza(new Date())))}
              >
                {rotulo}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm leading-5 text-texto-auxiliar">
              Sem número de reserva, o período vai até {periodoMaximoDias} dias. Para achar um
              passageiro, consulte um período e use a busca do resultado.
            </p>
            {dadosDoSturAte && (
              <p className="text-[13px] leading-5 text-estado-info">
                Dados do Stur até {formatarDadosAte(dadosDoSturAte)}. Períodos depois dessa data
                voltam vazios.
              </p>
            )}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <Filtros modo="consulta" valor={consulta} aoMudar={(c) => mudar(c)} />
          {mensagemDoFiltro && <MensagemDeErro id={idDoErro}>{mensagem}</MensagemDeErro>}
        </div>

        <div className="flex flex-col items-start gap-3">
          {mensagem && controleComErro === null && (
            <MensagemDeErro id={idDoErro} alerta>
              {mensagem}
            </MensagemDeErro>
          )}
          <Button type="submit">
            <Search aria-hidden="true" />
            Consultar
          </Button>
        </div>
      </form>
    </div>
  );
}
