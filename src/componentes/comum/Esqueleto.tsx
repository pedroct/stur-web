/** Forma do que ainda vai chegar; o leitor de tela ouve o texto de carregando, não isto. */
export function Esqueleto({
  largura,
  altura,
}: Readonly<{
  largura: number | string;
  altura: number | string;
}>) {
  return (
    <div
      aria-hidden="true"
      className="max-w-full rounded-pequeno bg-superficie-sutil motion-safe:animate-pulse"
      style={{ width: largura, height: altura }}
    />
  );
}
