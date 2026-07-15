/** Padan dengan AccountDto backend (/api/v1/accounts). */
export interface Account {
  id: number;
  no: string;
  name: string;
  billTo?: string;
  balance: number;
  linked: boolean;
  categoryId?: number;
  chargeFrequency?: string;
  active: boolean;
}
