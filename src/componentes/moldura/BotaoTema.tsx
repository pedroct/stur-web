"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { ehTema, gravarTema, lerTema, type Tema } from "@/lib/tema";

const NOMES: Record<Tema, string> = {
  claro: "claro",
  escuro: "escuro",
  sistema: "igual ao computador",
};

const ICONES = { claro: Sun, escuro: Moon, sistema: Monitor } as const;

const OPCOES: { valor: Tema; rotulo: string }[] = [
  { valor: "claro", rotulo: "Claro" },
  { valor: "escuro", rotulo: "Escuro" },
  { valor: "sistema", rotulo: "Igual ao computador" },
];

const ATALHOS: { teclas: string[]; descricao: string }[] = [
  { teclas: ["/"], descricao: "número da reserva" },
  { teclas: ["[", "]"], descricao: "venda anterior e próxima" },
  { teclas: [",", "."], descricao: "anterior e próxima do resultado" },
  { teclas: ["Esc"], descricao: "fecha o painel" },
  { teclas: ["u"], descricao: "Atualizar" },
];

export function BotaoTema() {
  // O tema só é lido depois da montagem: antes disso o botão mostra "sistema",
  // igual ao HTML do servidor, e não há diferença de hidratação.
  const [tema, setTema] = useState<Tema>("sistema");

  useEffect(() => {
    setTema(lerTema());
  }, []);

  const Icone = ICONES[tema];

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Tema ${NOMES[tema]}. Trocar o tema`}
        title="Trocar o tema"
        className="inline-flex size-alvo items-center justify-center rounded-pilula border border-borda-controle bg-superficie text-texto-principal outline-0 transition-colors duration-150 hover:bg-superficie-sutil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        <Icone className="size-5" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8}>
          <Menu.Popup
            aria-label="Tema"
            className="w-62 rounded-medio border border-borda bg-superficie p-2 text-texto-principal shadow-flutuante outline-none"
          >
            <Menu.RadioGroup
              value={tema}
              onValueChange={(valor) => {
                if (!ehTema(valor)) return;
                gravarTema(valor);
                setTema(valor);
              }}
            >
              {OPCOES.map(({ valor, rotulo }) => {
                const IconeOpcao = ICONES[valor];
                return (
                  <Menu.RadioItem
                    key={valor}
                    value={valor}
                    closeOnClick
                    className="flex min-h-alvo cursor-pointer items-center gap-3 rounded-pequeno px-3 text-sm font-medium outline-0 outline-foco data-[highlighted]:bg-superficie-sutil data-[highlighted]:outline-2 data-[highlighted]:-outline-offset-2 data-[checked]:bg-superficie-sutil"
                  >
                    <IconeOpcao className="size-5" aria-hidden="true" />
                    <span className="flex-1">{rotulo}</span>
                    <Menu.RadioItemIndicator>
                      <Check className="size-[18px] text-acao-primaria" aria-hidden="true" />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                );
              })}
            </Menu.RadioGroup>
            <p className="mx-3 mt-1 mb-2 text-xs leading-[18px] text-texto-auxiliar">
              A escolha fica salva neste navegador. Igual ao computador segue o tema do sistema
              operacional.
            </p>
            <div className="mx-1 mt-1 border-t border-borda px-2 pt-2.5 pb-1">
              <p className="text-xs font-semibold text-texto-auxiliar">Atalhos de teclado</p>
              <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 text-xs leading-[18px] text-texto-auxiliar">
                {ATALHOS.map(({ teclas, descricao }) => (
                  <div key={descricao} className="contents">
                    <dt className="space-x-1">
                      {teclas.map((tecla) => (
                        <kbd
                          key={tecla}
                          className="font-mono text-xs font-semibold text-texto-principal"
                        >
                          {tecla}
                        </kbd>
                      ))}
                    </dt>
                    <dd>{descricao}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
