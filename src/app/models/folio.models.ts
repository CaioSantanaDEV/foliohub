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

export interface StockTransactionCreateDto {
  userId: string;
  ticker: string;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  brokerageFees?: number;
  operationDate: string;
}

export interface StockTransactionResponseDto {
  id: string;
  userId: string;
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
  contractedRate: number;
  investedAmount: number;
  currentAmount: number;
  investmentDate: string;
  dueDate: string;
  active: boolean;
}

export interface FixedIncomePositionCreateDto {
  userId: string;
  assetName: string;
  issuer: string;
  type: FixedIncomeType;
  indexer: IndexerType;
  contractedRate: number;
  investedAmount: number;
  investmentDate: string;
  dueDate: string;
}

export interface FixedIncomePositionResponseDto {
  id: string;
  userId: string;
  assetName: string;
  issuer: string;
  type: FixedIncomeType;
  indexer: IndexerType;
  contractedRate: number;
  investedAmount: number;
  currentAmount: number;
  investmentDate: string;
  dueDate: string;
  active: boolean;
}

export interface StockQuoteDto {
  symbol?: string;
  ticker: string;
  shortName?: string;
  companyName: string;
  sector?: string;
  regularMarketPrice: number;
  currentPrice?: number;
  regularMarketChangePercent: number;
  regularMarketTime?: string;
  regularMarketDayLow: number;
  regularMarketDayHigh: number;
  priceEarnings?: number;
  priceToBook?: number;
  dividendYield?: number;
  returnOnEquity?: number;
  netMargin?: number;
  ebitMargin?: number;
  netDebtToEbit?: number;
  earningsPerShare?: number;
  bookValuePerShare?: number;
  roic?: number;
  ebit12m?: number;
  ebitFormatted?: string;
  grahamFairPrice?: number;
  regularMarketVolume?: number;
  rawMarketCap?: number;
  volume24h?: string;
  marketCap?: string;
  cachedAt?: string;
}

export interface MacroIndicatorsDto {
  selic: number;
  cdi: number;
  ipca12m: number;
  dolar: number;
  updatedAt: string;
}

export interface AssetAllocationDto {
  stocksPercent: number;
  fixedIncomePercent: number;
  stocksTotal: number;
  fixedIncomeTotal: number;
}

export interface PortfolioSummaryDto {
  userId: string;
  totalNetWorth: number;
  totalInvested: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  allocation: AssetAllocationDto;
  stocksCount: number;
  fixedIncomeCount: number;
}

export interface FixedIncomeSimulationRequestDto {
  initialAmount: number;
  monthlyDeposit: number;
  periodMonths: number;
  ratePercent: number;
  assetType: FixedIncomeType;
  indexer: IndexerType;
}

export interface FixedIncomeSimulationResponseDto {
  days: number;
  months: number;
  totalInvested: number;
  grossBalance: number;
  grossEarnings: number;
  irTaxRatePercent: number;
  isExempt: boolean;
  taxDeduction: number;
  netBalance: number;
  netProfit: number;
  netProfitPercent: number;
  balancePoupanca: number;
  diffPoupanca: number;
}

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  timestamp?: string;
  invalidParams?: { field: string; message: string }[];
}

export interface BackendCodeFile {
  id: string;
  name: string;
  category: 'Entity' | 'Repository' | 'Migration' | 'Config' | 'Enum' | 'Service' | 'Client' | 'DTO' | 'Test' | 'Controller' | 'Exception';
  path: string;
  language: string;
  description: string;
  code: string;
}
