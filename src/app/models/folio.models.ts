export type TransactionType = 'COMPRA' | 'VENDA';

export type FixedIncomeType = 'CDB' | 'LCI' | 'LCA' | 'TESOURO' | 'CRI' | 'CRA' | 'DEBENTURE';

export type IndexerType = 'CDI' | 'PREFIXADO' | 'IPCA' | 'SELIC' | 'IGPM';

export interface UserDto {
  id: string;
  name: string;
  email: string;
}

export interface StockTransactionDto {
  id: string;
  ticker: string;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  brokerageFees: number;
  operationDate: string;
}

export interface StockPositionSummaryDto {
  ticker: string;
  companyName: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalInvested: number;
  currentTotal: number;
  profitLoss: number;
  profitLossPercent: number;
  portfolioWeight: number;
}

export interface FixedIncomePositionDto {
  id: string;
  assetName: string;
  issuer: string;
  type: FixedIncomeType;
  indexer: IndexerType;
  contractedRate: number; // e.g. 118 (% do CDI) or 12.5 (% a.a.) or 6.45 (IPCA +)
  investedAmount: number;
  currentAmount: number;
  investmentDate: string;
  dueDate: string;
  active: boolean;
}

export interface BackendCodeFile {
  id: string;
  name: string;
  category: 'Entity' | 'Repository' | 'Migration' | 'Config' | 'Enum' | 'Service' | 'Client' | 'DTO';
  path: string;
  language: string;
  description: string;
  code: string;
}
