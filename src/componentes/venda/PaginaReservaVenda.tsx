"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { EstadoErro } from "@/componentes/estados/EstadoErro";
import { LinhaStatus } from "@/componentes/estados/LinhaStatus";
import { NenhumaVenda } from "@/componentes/estados/NenhumaVenda";
import { Caminho } from "@/componentes/moldura/Caminho";
import { TelaReserva } from "@/componentes/reserva/TelaReserva";
import { useParametros } from "@/lib/api/parametros";
import { CONSULTA_VAZIA, numeroDaReserva } from "@/lib/consulta/consulta";
import {
  rodapeErro,
  textoCarregando,
  textoDadosAteSemVendas,
  textoSemVendas,
  textoSemVendasNumero,
} from "@/lib/consulta/descricao";
import { formatarHora } from "@/lib/tempo";
import { enderecoDaReserva, lerResto } from "@/lib/venda/rota";
import { EsqueletoVenda } from "./EsqueletoVenda";
import { PainelContexto, useValorDoPainel } from "./painel-contexto";
import { useReservaVenda } from "./useReservaVenda";
import { Venda } from "./Venda";

type Nivel = { rotulo: string; href?: string };

/** Decisão 21: a venda do endereço não é deste número. */
function VendaDeFora({
  numero,
  caminho,
  alterarHref,
}: Readonly<{ numero: number; caminho: Nivel[]; alterarHref: string }>) {
  const roteador = useRouter();
  return (
    <NenhumaVenda
      caminho={caminho}
      mensagem={`A reserva ${numero} não tem essa venda. Abra a reserva para ver as vendas dela.`}
      complemento={null}
      alterarHref={alterarHref}
      acaoExtra={{
        rotulo: `Ver a reserva ${numero}`,
        aoClicar: () => roteador.push(enderecoDaReserva(numero)),
      }}
    />
  );
}

/**
 * `/reservas/{número}/[[...resto]]`: a reserva e as vendas dela numa rota só (decisão 16). A
 * página escolhe a tela pela fase: o esqueleto (11), o erro (12), a tela 13, a venda sozinha
 * (reserva de uma venda) ou a reserva (duas ou mais, com ou sem venda aberta).
 */
export function PaginaReservaVenda({
  numeroTexto,
  resto,
}: Readonly<{ numeroTexto: string; resto: string[] | undefined }>) {
  const { tempoLimiteSegundos } = useParametros();
  // O `resto` pode chegar como outro array a cada render: a rota só muda com o texto dele.
  const chaveDoResto = JSON.stringify(resto ?? []);
  const rota = useMemo(() => lerResto(JSON.parse(chaveDoResto) as string[]), [chaveDoResto]);
  const pagina = useReservaVenda(numeroTexto, rota);
  const numero = numeroDaReserva(numeroTexto);
  const painel = useValorDoPainel(numero, rota);

  const alterarHref = `/?reserva=${numero ?? encodeURIComponent(numeroTexto)}`;
  const reservaNoCaminho: Nivel = { rotulo: `Reserva ${numeroTexto}` };
  const consulta = { ...CONSULTA_VAZIA, reserva: numero };
  const consultaDaVenda = {
    atualizando: pagina.atualizando,
    aoAtualizar: pagina.atualizar,
    falha: pagina.falhaAtualizar,
  };

  function conteudo() {
    if (numero === null || pagina.fase === "invalido") {
      return (
        <NenhumaVenda
          caminho={[reservaNoCaminho]}
          mensagem={textoSemVendasNumero(numeroTexto)}
          complemento={null}
          alterarHref={alterarHref}
        />
      );
    }
    const deFora = (
      <VendaDeFora numero={numero} caminho={[reservaNoCaminho]} alterarHref={alterarHref} />
    );

    switch (pagina.fase) {
      case "carregando":
        return (
          <>
            <Caminho niveis={[reservaNoCaminho]} />
            <div className="mt-4">
              <LinhaStatus
                texto={textoCarregando(consulta, tempoLimiteSegundos)}
                aoCancelar={pagina.cancelar}
              />
            </div>
            <EsqueletoVenda />
          </>
        );
      case "erro":
        if (pagina.erro?.tipo === "nao_encontrada") return deFora;
        return pagina.erro ? (
          <>
            <Caminho niveis={[reservaNoCaminho]} />
            <EstadoErro
              erro={pagina.erro}
              rodape={rodapeErro(
                consulta,
                formatarHora(pagina.tentadoAs ?? new Date().toISOString()),
              )}
              aoTentar={pagina.tentarDeNovo}
              alterarHref={alterarHref}
            />
          </>
        ) : null;
      case "sem-vendas":
        return pagina.reserva ? (
          <NenhumaVenda
            caminho={[reservaNoCaminho]}
            mensagem={textoSemVendas(consulta)}
            complemento={textoDadosAteSemVendas(consulta, pagina.reserva.dadosDoSturAte)}
            alterarHref={alterarHref}
            consultadoAs={formatarHora(pagina.reserva.consultadoEm)}
          />
        ) : null;
    }

    const { reserva } = pagina;
    if (reserva === null || rota === null) return null;
    const lista = reserva.reserva.vendas;
    const id = rota.tipo === "venda" ? rota.idreserva : null;
    const daRota = id === null ? undefined : lista.find((v) => v.resumo.idreserva === id);
    const estado = id === null ? undefined : pagina.vendas.get(id);
    if (id !== null && (!daRota || estado?.erro?.tipo === "nao_encontrada")) return deFora;

    if (lista.length === 1) {
      return estado?.dados ? (
        <>
          <Caminho niveis={[reservaNoCaminho]} />
          <Venda dados={estado.dados} naReserva={false} nivelBase={1} consulta={consultaDaVenda} />
        </>
      ) : null;
    }

    const niveis: Nivel[] = daRota
      ? [
          { ...reservaNoCaminho, href: enderecoDaReserva(numero) },
          { rotulo: `Venda ${daRota.posicao} de ${lista.length}` },
        ]
      : [reservaNoCaminho];
    return (
      <>
        <Caminho niveis={niveis} />
        <TelaReserva
          dados={reserva}
          vendaAberta={
            daRota
              ? {
                  idreserva: daRota.resumo.idreserva,
                  estado: estado ?? { estado: "carregando" },
                  aoTentar: pagina.tentarDeNovo,
                }
              : null
          }
          consulta={consultaDaVenda}
        />
      </>
    );
  }

  return <PainelContexto value={painel}>{conteudo()}</PainelContexto>;
}
