import { getConfig } from "@testing-library/react";

test("findBy e waitFor esperam 5 s: a venda inteira demora a montar sob carga", () => {
  expect(getConfig().asyncUtilTimeout).toBe(5000);
});
