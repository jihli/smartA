import { type CurrencyCode } from '~/lib/currency';

export interface TransactionAddInputModel {
  date: Date;
  description: string;
  amountStr: string;
  amount: bigint;
  currency: CurrencyCode;
  transactionId?: string;
  expenseId?: string;
}
