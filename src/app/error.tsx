"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EstadoErro } from "@/componentes/estados/EstadoErro";
import { Caminho } from "@/componentes/moldura/Caminho";
import { ErroDaConsulta } from "@/lib/api/cliente";
import { apagarResultado } from "@/lib/armazenamento/resultados";
import { chaveConsulta, escreverConsulta, lerConsulta } from "@/lib/consulta/consulta";
import { rodapeErro, tituloCurto } from "@/lib/consulta/descricao";
import { formatarHora } from "@/lib/tempo";

/**
 * Erro que escapou de uma tela (por exemplo, um resultado guardado num formato que a tela não
 * formata): a tela 12 do erro da aplicação. Na consulta por período, apaga o resultado guardado
 * da chave do endereço, senão ele derrubaria a tela de novo a cada recarga; "Tentar de novo"
 * monta a tela outra vez (`reset`), já sem o guardado.
 */
export default function ErroDaAplicacao({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
  retry?: () => void;
}) {
  const caminho = usePathname();
  const parametros = useSearchParams();
  const consulta = caminho === "/consulta" ? lerConsulta(parametros) : null;
  const chave = consulta === null ? null : chaveConsulta(consulta);
  const [erro] = useState(() => new ErroDaConsulta("aplicacao", { causa: error }));
  const [hora] = useState(() => formatarHora(new Date().toISOString()));

  useEffect(() => {
    if (chave !== null) apagarResultado(chave);
  }, [chave]);

  return (
    <>
      {consulta && <Caminho niveis={[{ rotulo: tituloCurto(consulta) }]} />}
      <EstadoErro
        erro={erro}
        rodape={consulta === null ? undefined : rodapeErro(consulta, hora)}
        aoTentar={reset}
        alterarHref={consulta === null ? "/" : `/?${escreverConsulta(consulta)}`}
      />
    </>
  );
}
