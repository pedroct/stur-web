import type { components, operations } from "./schema";

type Esquemas = components["schemas"];

export type ResultadoConsulta = Esquemas["ResultadoConsulta"];
export type LinhaResultado = Esquemas["LinhaResultado"];
export type ResumoResultado = Esquemas["ResumoResultado"];
export type ResumoIncentivos = Esquemas["ResumoIncentivos"];
export type ConsultaEcoada = Esquemas["ConsultaEcoada"];
export type Parametros = Esquemas["Parametros"];
export type ReservaConsultada = Esquemas["ReservaConsultada"];
export type Reserva = Esquemas["Reserva"];
export type VendaDaReserva = Esquemas["VendaDaReserva"];
export type TotaisReserva = Esquemas["TotaisReserva"];
export type ResumoVenda = Esquemas["ResumoVenda"];
export type ErroApi = Esquemas["ErroApi"];
export type ErroConsulta = Esquemas["ErroConsulta"];

export type QueryVendas = NonNullable<operations["consultar_vendas"]["parameters"]["query"]>;
