/** Faixa de 3 px abaixo do cabeçalho; quem anuncia a consulta é a linha de status da página. */
export function FaixaCarregando() {
  return (
    <div data-faixa aria-hidden="true" className="h-[3px] overflow-hidden bg-superficie-sutil">
      <div className="h-full w-[40%] animate-corre bg-acao-primaria motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-60" />
    </div>
  );
}
