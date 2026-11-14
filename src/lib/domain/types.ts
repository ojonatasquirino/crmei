/** Datas financeiras são sempre "YYYY-MM-DD" (sem hora, sem fuso). Valores sempre em centavos inteiros. */
export type ISODate = string;

export type AccountKind = "operacional" | "reserva";
export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  initialCents: number;
  goalCents?: number | null;
}

export type TxType = "entrada" | "saida" | "transferencia";
export type TxStatus = "previsto" | "realizado" | "cancelado";

export interface Transaction {
  id: string;
  type: TxType;
  status: TxStatus;
  amountCents: number;
  /** Quanto já foi pago/recebido. Igual a amountCents quando realizado. */
  paidCents: number;
  /** Vencimento (ou data em que aconteceu). */
  date: ISODate;
  /** Data da última baixa. */
  paidAt?: ISODate | null;
  accountId: string;
  toAccountId?: string | null;
  category: string;
  description: string;
  /** "recId:YYYY-MM" quando nasceu de uma fixa mensal. */
  occurrenceKey?: string | null;
  deleted?: boolean;
}

export interface Recurrence {
  id: string;
  type: "entrada" | "saida";
  amountCents: number;
  dayOfMonth: number;
  startMonth: string; // YYYY-MM
  endMonth?: string | null;
  accountId: string;
  category: string;
  description: string;
  active: boolean;
}

export const RETIRADA = "Retirada pessoal";
