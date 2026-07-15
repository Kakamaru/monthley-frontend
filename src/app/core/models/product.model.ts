/** Padan dengan ProductDto backend (/api/v1/products). */
export type ChargeFrequency =
  | 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEAR' | 'YEAR' | 'PER_USE';

export interface Product {
  id: number;
  code: string;
  subscriptionCode?: string;
  categoryId?: number;
  name: string;
  rate: number;
  chargeFrequency: ChargeFrequency;
  anchorMonth?: number;
  prorated: boolean;
  latePenalty: boolean;
  mandatory: boolean;
  active: boolean;
}

/** Balasan berhalaman — padan PageResponse<T> backend. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
