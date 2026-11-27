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
export type VendaAgi = Esquemas["VendaAgi"];
export type ServicoAgi = Esquemas["ServicoAgi"];
export type TrechoAgi = Esquemas["TrechoAgi"];
export type RecebimentoAgi = Esquemas["RecebimentoAgi"];
export type PagamentoAgi = Esquemas["PagamentoAgi"];
export type VendaConsultada = Esquemas["VendaConsultada"];
export type CalculosVenda = Esquemas["CalculosVenda"];
export type ContaServico = Esquemas["ContaServico"];
export type ContaLado = Esquemas["ContaLado"];
export type TermoConta = Esquemas["TermoConta"];
export type LancamentoCalculado = Esquemas["LancamentoCalculado"];
export type Documento = Esquemas["Documento"];
export type Itinerario = Esquemas["Itinerario"];
export type EstadoServico = Esquemas["EstadoServico"];
export type ResumoServico = Esquemas["ResumoServico"];
export type Vinculos = Esquemas["Vinculos"];
/** `Aviso` do contrato; o nome evita colidir com o componente `Aviso`. */
export type AvisoApi = Esquemas["Aviso"];

export type QueryVendas = NonNullable<operations["consultar_vendas"]["parameters"]["query"]>;
