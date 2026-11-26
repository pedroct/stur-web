import {
  cancelarEmAndamento,
  consultaEmAndamento,
  emAndamento,
  marcarPendente,
  temPendente,
  zerarPendentes,
} from "@/lib/armazenamento/pendentes";

test("marcar pendente não é o mesmo que estar em andamento", () => {
  expect(temPendente("k")).toBe(false);
  marcarPendente("k");
  expect(temPendente("k")).toBe(true);
  expect(emAndamento("k")).toBe(false);
});

test("chamada em andamento é reusada e some ao terminar", async () => {
  marcarPendente("k");
  const iniciar = vi.fn((_sinal: AbortSignal) => Promise.resolve(1));
  const [a, b] = [consultaEmAndamento("k", iniciar), consultaEmAndamento("k", iniciar)];
  expect(a).toBe(b);
  expect(iniciar).toHaveBeenCalledTimes(1);
  expect(emAndamento("k")).toBe(true);
  await a;
  expect(temPendente("k")).toBe(false);
  expect(emAndamento("k")).toBe(false);
});

test("chamada que falha também some ao terminar", async () => {
  marcarPendente("k");
  const promessa = consultaEmAndamento("k", () => Promise.reject(new Error("falhou")));
  await expect(promessa).rejects.toThrow("falhou");
  expect(temPendente("k")).toBe(false);
  expect(emAndamento("k")).toBe(false);
});

test("iniciar que lança na hora vira promessa rejeitada", async () => {
  const promessa = consultaEmAndamento("k", () => {
    throw new Error("falhou");
  });
  await expect(promessa).rejects.toThrow("falhou");
  expect(emAndamento("k")).toBe(false);
});

test("chaves diferentes não se misturam", async () => {
  const iniciar = vi.fn((_sinal: AbortSignal) => Promise.resolve(1));
  await Promise.all([consultaEmAndamento("a", iniciar), consultaEmAndamento("b", iniciar)]);
  expect(iniciar).toHaveBeenCalledTimes(2);
});

test("cancelar aborta o sinal entregue a iniciar", () => {
  let recebido: AbortSignal | undefined;
  marcarPendente("k");
  consultaEmAndamento("k", (sinal) => {
    recebido = sinal;
    return new Promise(() => {});
  });
  cancelarEmAndamento("k");
  expect(recebido?.aborted).toBe(true);
  expect(emAndamento("k")).toBe(false);
  expect(temPendente("k")).toBe(false);
});

test("cancelar e chamar de novo: a antiga, ao terminar, não apaga a nova", async () => {
  let resolver!: (v: number) => void;
  consultaEmAndamento(
    "k",
    () =>
      new Promise<number>((r) => {
        resolver = r;
      }),
  );
  cancelarEmAndamento("k");
  marcarPendente("k");
  consultaEmAndamento("k", () => new Promise(() => {}));
  resolver(1);
  await Promise.resolve();
  await Promise.resolve();
  expect(emAndamento("k")).toBe(true);
  expect(temPendente("k")).toBe(true);
});

test("zerar aborta e apaga tudo", () => {
  const sinais: AbortSignal[] = [];
  marcarPendente("p");
  for (const k of ["a", "b"]) {
    consultaEmAndamento(k, (sinal) => {
      sinais.push(sinal);
      return new Promise(() => {});
    });
  }
  zerarPendentes();
  expect(sinais.every((s) => s.aborted)).toBe(true);
  expect(emAndamento("a")).toBe(false);
  expect(emAndamento("b")).toBe(false);
  expect(temPendente("p")).toBe(false);
});
