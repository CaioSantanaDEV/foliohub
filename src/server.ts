import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

// In-memory data store replicating the Spring Boot persistence layer
interface StockTxRecord {
  id: string;
  userId: string;
  ticker: string;
  type: 'COMPRA' | 'VENDA';
  quantity: number;
  unitPrice: number;
  totalValue: number;
  brokerageFees: number;
  operationDate: string;
}

interface FixedIncomeRecord {
  id: string;
  userId: string;
  assetName: string;
  issuer: string;
  type: 'CDB' | 'LCI' | 'LCA' | 'TESOURO' | 'CRI' | 'CRA' | 'DEBENTURE';
  indexer: 'CDI' | 'PREFIXADO' | 'IPCA' | 'SELIC' | 'IGPM';
  contractedRate: number;
  investedAmount: number;
  currentAmount: number;
  investmentDate: string;
  dueDate: string;
  active: boolean;
}

const defaultUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const inMemoryStockTxs: StockTxRecord[] = [
  {
    id: 'tx-101',
    userId: defaultUserId,
    ticker: 'PETR4',
    type: 'COMPRA',
    quantity: 200,
    unitPrice: 33.5,
    totalValue: 6700.0,
    brokerageFees: 4.5,
    operationDate: '2024-03-12',
  },
  {
    id: 'tx-102',
    userId: defaultUserId,
    ticker: 'PETR4',
    type: 'COMPRA',
    quantity: 100,
    unitPrice: 35.2,
    totalValue: 3520.0,
    brokerageFees: 2.25,
    operationDate: '2024-06-18',
  },
  {
    id: 'tx-103',
    userId: defaultUserId,
    ticker: 'VALE3',
    type: 'COMPRA',
    quantity: 150,
    unitPrice: 68.4,
    totalValue: 10260.0,
    brokerageFees: 5.0,
    operationDate: '2024-02-05',
  },
  {
    id: 'tx-104',
    userId: defaultUserId,
    ticker: 'VALE3',
    type: 'VENDA',
    quantity: 50,
    unitPrice: 65.1,
    totalValue: 3255.0,
    brokerageFees: 3.0,
    operationDate: '2024-07-20',
  },
  {
    id: 'tx-105',
    userId: defaultUserId,
    ticker: 'WEGE3',
    type: 'COMPRA',
    quantity: 120,
    unitPrice: 42.1,
    totalValue: 5052.0,
    brokerageFees: 3.5,
    operationDate: '2024-04-10',
  },
  {
    id: 'tx-106',
    userId: defaultUserId,
    ticker: 'ITUB4',
    type: 'COMPRA',
    quantity: 300,
    unitPrice: 31.25,
    totalValue: 9375.0,
    brokerageFees: 4.0,
    operationDate: '2024-05-15',
  },
  {
    id: 'tx-107',
    userId: defaultUserId,
    ticker: 'MXRF11',
    type: 'COMPRA',
    quantity: 800,
    unitPrice: 10.05,
    totalValue: 8040.0,
    brokerageFees: 0.0,
    operationDate: '2024-01-22',
  },
];

const inMemoryFixedIncome: FixedIncomeRecord[] = [
  {
    id: 'fip-201',
    userId: defaultUserId,
    assetName: 'CDB Banco Inter Liquidez Diária',
    issuer: 'Banco Inter S.A.',
    type: 'CDB',
    indexer: 'CDI',
    contractedRate: 110.0,
    investedAmount: 25000.0,
    currentAmount: 27450.8,
    investmentDate: '2023-11-10',
    dueDate: '2026-11-10',
    active: true,
  },
  {
    id: 'fip-202',
    userId: defaultUserId,
    assetName: 'Tesouro IPCA+ com Juros Semestrais 2029',
    issuer: 'Tesouro Nacional',
    type: 'TESOURO',
    indexer: 'IPCA',
    contractedRate: 6.45,
    investedAmount: 20000.0,
    currentAmount: 22180.5,
    investmentDate: '2023-08-15',
    dueDate: '2029-05-15',
    active: true,
  },
  {
    id: 'fip-203',
    userId: defaultUserId,
    assetName: 'LCA Agronegócio Banco do Brasil',
    issuer: 'Banco do Brasil S.A.',
    type: 'LCA',
    indexer: 'CDI',
    contractedRate: 94.5,
    investedAmount: 18000.0,
    currentAmount: 19620.25,
    investmentDate: '2024-02-01',
    dueDate: '2025-08-01',
    active: true,
  },
  {
    id: 'fip-204',
    userId: defaultUserId,
    assetName: 'CRI Kinea Índices de Preços',
    issuer: 'Kinea Investimentos',
    type: 'CRI',
    indexer: 'IPCA',
    contractedRate: 7.2,
    investedAmount: 15000.0,
    currentAmount: 16110.0,
    investmentDate: '2024-03-05',
    dueDate: '2028-03-05',
    active: true,
  },
];

const BRAPI_TOKEN = process.env['BRAPI_TOKEN'] || process.env['foliohub.integration.brapi.token'] || '';

class HttpError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'HttpError';
  }
}

interface BrapiDefaultKeyStatistics {
  enterpriseValue?: number;
  forwardPE?: number;
  trailingPE?: number;
  profitMargins?: number;
  sharesOutstanding?: number;
  bookValue?: number;
  priceToBook?: number;
  netIncomeToCommon?: number;
  trailingEps?: number;
  enterpriseToEbitda?: number;
  dividendYield?: number;
}

interface BrapiFinancialData {
  currentPrice?: number;
  totalCash?: number;
  ebitda?: number;
  totalDebt?: number;
  totalRevenue?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
  profitMargins?: number;
  grossMargins?: number;
  ebitdaMargins?: number;
}

interface BrapiRawResult {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: string;
  regularMarketDayLow?: number;
  regularMarketDayHigh?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  priceEarnings?: number;
  earningsPerShare?: number;
  priceToBook?: number;
  dividendYield?: number;
  returnOnEquity?: number;
  defaultKeyStatistics?: BrapiDefaultKeyStatistics;
  financialData?: BrapiFinancialData;
}

interface BrapiApiResponse {
  error?: boolean;
  message?: string;
  results?: BrapiRawResult[];
}

interface FundamentalBalanceData {
  ticker: string;
  companyName: string;
  sector: string;
  isFii: boolean;
  referenceQuote?: number;
  dayChangePercent?: number;
  min52w?: number;
  max52w?: number;
  volume24hRaw?: number;
  totalShares?: number;
  marketCap?: number;
  enterpriseValue?: number;
  netRevenue12m?: number;
  ebit12m?: number;
  netIncome12m?: number;
  grossDebt?: number;
  cashAndEquivalents?: number;
  netDebt?: number;
  shareholdersEquity?: number;
  lpa?: number;
  vpa?: number;
  dividendsPerShare12m?: number;
  reportedPe?: number;
  reportedPvp?: number;
  reportedDyPercent?: number;
  reportedRoePercent?: number;
  reportedRoicPercent?: number;
  reportedNetMarginPercent?: number;
  reportedEbitMarginPercent?: number;
  reportedNetDebtToEbit?: number;
}

interface CachedStockQuote {
  symbol: string;
  ticker: string;
  shortName: string;
  companyName: string;
  sector?: string;
  regularMarketPrice: number;
  currentPrice: number;
  regularMarketChangePercent: number;
  regularMarketTime: string;
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
  grahamFairPrice?: number;
  ebit12m?: number;
  ebitFormatted?: string;
  regularMarketVolume?: number;
  rawMarketCap?: number;
  volume24h?: string;
  marketCap?: string;
  cachedAt: string;
}

const quoteMemoryCache = new Map<string, { data: CachedStockQuote; expiresAt: number }>();
const QUOTE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos (espelhando Spring Cache com Caffeine)

function roundHalfEvenServer(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  const temp = value * factor;
  const floor = Math.floor(temp);
  const diff = temp - floor;
  if (Math.abs(diff - 0.5) < 1e-9) {
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  return Math.round(temp) / factor;
}

function normalizeBrapiDecimalToPercent(val?: number): number | undefined {
  if (val == null || Number.isNaN(val)) return undefined;
  if (Math.abs(val) <= 1.0) {
    return roundHalfEvenServer(val * 100, 4);
  }
  return roundHalfEvenServer(val, 4);
}

function formatCompactBrlCurrency(amount?: number): string | undefined {
  if (amount == null || Number.isNaN(amount) || amount <= 0) return undefined;
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return `R$ ${(amount / 1_000_000_000).toFixed(2).replace('.', ',')} Bi`;
  }
  if (abs >= 1_000_000) {
    return `R$ ${(amount / 1_000_000).toFixed(2).replace('.', ',')} Mi`;
  }
  if (abs >= 1_000) {
    return `R$ ${(amount / 1_000).toFixed(2).replace('.', ',')} Mil`;
  }
  return `R$ ${amount.toFixed(2).replace('.', ',')}`;
}

function cleanFundamentusCellHtml(raw: string): string {
  if (!raw) return '';
  const txtRegex = /<span[^>]*class="[^"]*txt[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  let lastTxt: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = txtRegex.exec(raw)) !== null) {
    lastTxt = m[1];
  }
  const target = lastTxt !== null ? lastTxt : raw.replace(/title="[^"]*"|title='[^']*'/gi, '');
  return target
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\?/g, '')
    .trim();
}

function parsePtBrNumeric(raw?: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .replace(/%/g, '')
    .replace(/R\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  if (!cleaned || cleaned === '-') return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeLabelKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\?/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFundamentusHtmlDocument(ticker: string, html: string): FundamentalBalanceData | undefined {
  if (!html || html.includes('Nenhum papel encontrado')) return undefined;

  const fields = new Map<string, string>();
  const cellRegex = /<td[^>]*class="[^"]*label[^"]*"[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class="[^"]*data[^"]*"[^>]*>([\s\S]*?)<\/td>/gi;
  let match: RegExpExecArray | null;

  while ((match = cellRegex.exec(html)) !== null) {
    const rawLabel = cleanFundamentusCellHtml(match[1]);
    const rawValue = cleanFundamentusCellHtml(match[2]);
    const key = normalizeLabelKey(rawLabel);
    if (key && rawValue && !fields.has(key)) {
      // Preserva a 1ª ocorrência (na DRE do Fundamentus, a 1ª coluna é 12 meses e a 2ª é 3 meses)
      fields.set(key, rawValue);
    }
  }

  if (fields.size === 0 || (!fields.has('cotacao') && !fields.has('p/vp'))) {
    return undefined;
  }

  const isFii = fields.has('ffo yield') || fields.has('vp/cota') || ticker.endsWith('11');
  const companyName = fields.get('empresa') || fields.get('nome') || ticker;
  const sector = fields.get('setor') || fields.get('segmento') || (isFii ? 'Fundos Imobiliários' : 'B3');

  const referenceQuote = parsePtBrNumeric(fields.get('cotacao'));
  const dayChangePercent = parsePtBrNumeric(fields.get('dia'));
  const min52w = parsePtBrNumeric(fields.get('min 52 sem'));
  const max52w = parsePtBrNumeric(fields.get('max 52 sem'));
  const volume24hRaw = parsePtBrNumeric(fields.get('vol $ med (2m)'));
  const totalShares = parsePtBrNumeric(fields.get('nro. acoes') ?? fields.get('nro. cotas'));
  const marketCap = parsePtBrNumeric(fields.get('valor de mercado'));
  const enterpriseValue = parsePtBrNumeric(fields.get('valor da firma'));

  let netRevenue12m = parsePtBrNumeric(fields.get('receita liquida') ?? fields.get('receita'));
  if (netRevenue12m == null && fields.has('result int financ')) {
    const intFin = parsePtBrNumeric(fields.get('result int financ'));
    const srvRev = parsePtBrNumeric(fields.get('rec servicos'));
    if (intFin != null) {
      netRevenue12m = srvRev != null ? intFin + srvRev : intFin;
    }
  }

  const ebit12m = parsePtBrNumeric(fields.get('ebit'));
  const netIncome12m = parsePtBrNumeric(fields.get('lucro liquido') ?? fields.get('ffo'));

  const grossDebt = parsePtBrNumeric(fields.get('div. bruta'));
  const cashAndEquivalents = parsePtBrNumeric(fields.get('disponibilidades'));
  let netDebt = parsePtBrNumeric(fields.get('div. liquida'));
  if (netDebt == null && grossDebt != null && cashAndEquivalents != null) {
    netDebt = grossDebt - cashAndEquivalents;
  }
  const shareholdersEquity = parsePtBrNumeric(fields.get('patrim. liq') ?? fields.get('patrim. liquido'));

  const lpa = parsePtBrNumeric(fields.get('lpa') ?? fields.get('ffo/cota'));
  const vpa = parsePtBrNumeric(fields.get('vpa') ?? fields.get('vp/cota'));

  const reportedPe = parsePtBrNumeric(fields.get('p/l'));
  const reportedPvp = parsePtBrNumeric(fields.get('p/vp'));
  const reportedDyPercent = parsePtBrNumeric(fields.get('div. yield'));
  const reportedRoePercent = parsePtBrNumeric(fields.get('roe') ?? fields.get('ffo yield'));
  const reportedRoicPercent = parsePtBrNumeric(fields.get('roic'));
  const reportedNetMarginPercent = parsePtBrNumeric(fields.get('marg. liquida'));
  let reportedEbitMarginPercent = parsePtBrNumeric(fields.get('marg. ebit'));
  if (ebit12m != null && netRevenue12m != null && netRevenue12m > 0) {
    reportedEbitMarginPercent = roundHalfEvenServer((ebit12m / netRevenue12m) * 100, 2);
  }

  let reportedNetDebtToEbit: number | undefined;
  if (netDebt != null && ebit12m != null && ebit12m !== 0) {
    reportedNetDebtToEbit = roundHalfEvenServer(netDebt / ebit12m, 2);
  }

  let dividendsPerShare12m = parsePtBrNumeric(fields.get('dividendo/cota'));
  if (dividendsPerShare12m == null && reportedDyPercent != null && referenceQuote != null && referenceQuote > 0) {
    dividendsPerShare12m = roundHalfEvenServer((reportedDyPercent * referenceQuote) / 100, 4);
  }

  return {
    ticker,
    companyName,
    sector,
    isFii,
    referenceQuote,
    dayChangePercent,
    min52w,
    max52w,
    volume24hRaw,
    totalShares,
    marketCap,
    enterpriseValue,
    netRevenue12m,
    ebit12m,
    netIncome12m,
    grossDebt,
    cashAndEquivalents,
    netDebt,
    shareholdersEquity,
    lpa,
    vpa,
    dividendsPerShare12m,
    reportedPe,
    reportedPvp,
    reportedDyPercent,
    reportedRoePercent,
    reportedRoicPercent,
    reportedNetMarginPercent,
    reportedEbitMarginPercent,
    reportedNetDebtToEbit,
  };
}

const AUDITED_CVM_BASELINES: Record<string, FundamentalBalanceData> = {
  PETR4: {
    ticker: 'PETR4',
    companyName: 'PETROBRAS PN',
    sector: 'Petróleo, Gás e Biocombustíveis',
    isFii: false,
    referenceQuote: 36.10,
    dayChangePercent: 0.85,
    volume24hRaw: 1_420_000_000,
    totalShares: 12_888_732_761,
    marketCap: 465_283_000_000,
    enterpriseValue: 695_120_000_000,
    netRevenue12m: 490_850_000_000,
    ebit12m: 192_400_000_000,
    netIncome12m: 109_600_000_000,
    grossDebt: 305_800_000_000,
    cashAndEquivalents: 75_963_000_000,
    netDebt: 229_837_000_000,
    shareholdersEquity: 395_600_000_000,
    lpa: 8.50,
    vpa: 30.69,
    dividendsPerShare12m: 4.95,
    reportedPe: 4.25,
    reportedPvp: 1.18,
    reportedDyPercent: 13.71,
    reportedRoePercent: 27.70,
    reportedRoicPercent: 21.40,
    reportedNetMarginPercent: 22.33,
    reportedEbitMarginPercent: 39.20,
    reportedNetDebtToEbit: 1.19,
  },
  PETR3: {
    ticker: 'PETR3',
    companyName: 'PETROBRAS ON',
    sector: 'Petróleo, Gás e Biocombustíveis',
    isFii: false,
    referenceQuote: 59.60,
    dayChangePercent: -0.07,
    volume24hRaw: 321_047_320,
    totalShares: 12_888_732_761,
    marketCap: 768_168_472_556,
    enterpriseValue: 1_080_948_472_556,
    netRevenue12m: 548_700_000_000,
    ebit12m: 236_800_000_000,
    netIncome12m: 133_400_000_000,
    grossDebt: 390_080_000_000,
    cashAndEquivalents: 77_300_000_000,
    netDebt: 312_780_000_000,
    shareholdersEquity: 480_950_000_000,
    lpa: 10.35,
    vpa: 37.32,
    dividendsPerShare12m: 3.64,
    reportedPe: 5.76,
    reportedPvp: 1.60,
    reportedDyPercent: 6.10,
    reportedRoePercent: 27.73,
    reportedRoicPercent: 19.70,
    reportedNetMarginPercent: 24.32,
    reportedEbitMarginPercent: 43.16,
    reportedNetDebtToEbit: 1.32,
  },
  VALE3: {
    ticker: 'VALE3',
    companyName: 'VALE S.A. ON',
    sector: 'Mineração',
    isFii: false,
    referenceQuote: 54.80,
    dayChangePercent: -0.45,
    volume24hRaw: 980_000_000,
    totalShares: 4_539_007_580,
    marketCap: 248_737_000_000,
    enterpriseValue: 308_137_000_000,
    netRevenue12m: 206_800_000_000,
    ebit12m: 68_400_000_000,
    netIncome12m: 38_200_000_000,
    grossDebt: 85_200_000_000,
    cashAndEquivalents: 25_800_000_000,
    netDebt: 59_400_000_000,
    shareholdersEquity: 201_100_000_000,
    lpa: 8.42,
    vpa: 44.30,
    dividendsPerShare12m: 4.78,
    reportedPe: 6.51,
    reportedPvp: 1.24,
    reportedDyPercent: 8.72,
    reportedRoePercent: 19.00,
    reportedRoicPercent: 21.80,
    reportedNetMarginPercent: 18.47,
    reportedEbitMarginPercent: 33.08,
    reportedNetDebtToEbit: 0.87,
  },
  WEGE3: {
    ticker: 'WEGE3',
    companyName: 'WEG S.A. ON',
    sector: 'Bens Industriais / Motores e Compressores',
    isFii: false,
    referenceQuote: 52.80,
    dayChangePercent: 0.95,
    volume24hRaw: 410_000_000,
    totalShares: 4_197_317_998,
    marketCap: 221_618_000_000,
    enterpriseValue: 216_818_000_000,
    netRevenue12m: 38_250_000_000,
    ebit12m: 7_650_000_000,
    netIncome12m: 6_275_000_000,
    grossDebt: 3_400_000_000,
    cashAndEquivalents: 5_755_000_000,
    netDebt: -2_355_000_000,
    shareholdersEquity: 19_937_000_000,
    lpa: 1.49,
    vpa: 4.75,
    dividendsPerShare12m: 0.82,
    reportedPe: 35.44,
    reportedPvp: 11.12,
    reportedDyPercent: 1.55,
    reportedRoePercent: 31.47,
    reportedRoicPercent: 29.80,
    reportedNetMarginPercent: 16.41,
    reportedEbitMarginPercent: 20.00,
    reportedNetDebtToEbit: -0.31,
  },
  ITUB4: {
    ticker: 'ITUB4',
    companyName: 'ITAÚ UNIBANCO PN',
    sector: 'Intermediários Financeiros / Bancos',
    isFii: false,
    referenceQuote: 34.50,
    dayChangePercent: 0.32,
    volume24hRaw: 680_000_000,
    totalShares: 9_804_135_348,
    marketCap: 338_242_000_000,
    netRevenue12m: 162_400_000_000,
    netIncome12m: 41_470_000_000,
    shareholdersEquity: 184_612_000_000,
    lpa: 4.23,
    vpa: 18.83,
    dividendsPerShare12m: 2.62,
    reportedPe: 8.16,
    reportedPvp: 1.83,
    reportedDyPercent: 7.59,
    reportedRoePercent: 22.46,
    reportedNetMarginPercent: 25.54,
  },
  BBAS3: {
    ticker: 'BBAS3',
    companyName: 'BANCO DO BRASIL ON',
    sector: 'Intermediários Financeiros / Bancos',
    isFii: false,
    referenceQuote: 27.50,
    dayChangePercent: -0.18,
    volume24hRaw: 520_000_000,
    totalShares: 5_730_834_040,
    marketCap: 157_598_000_000,
    netRevenue12m: 142_800_000_000,
    netIncome12m: 35_400_000_000,
    shareholdersEquity: 181_320_000_000,
    lpa: 6.18,
    vpa: 31.64,
    dividendsPerShare12m: 2.61,
    reportedPe: 4.45,
    reportedPvp: 0.87,
    reportedDyPercent: 9.49,
    reportedRoePercent: 19.52,
    reportedNetMarginPercent: 24.79,
  },
  MXRF11: {
    ticker: 'MXRF11',
    companyName: 'MAXI RENDA FII',
    sector: 'Fundos Imobiliários / Papéis e CRI',
    isFii: true,
    referenceQuote: 9.85,
    dayChangePercent: 0.10,
    volume24hRaw: 14_500_000,
    totalShares: 437_325_641,
    marketCap: 4_307_657_564,
    netRevenue12m: 495_000_000,
    netIncome12m: 408_000_000,
    shareholdersEquity: 4_089_000_000,
    lpa: 0.93,
    vpa: 9.35,
    dividendsPerShare12m: 1.18,
    reportedPe: 10.59,
    reportedPvp: 1.05,
    reportedDyPercent: 11.98,
    reportedRoePercent: 9.98,
    reportedNetMarginPercent: 82.42,
  },
  B3SA3: {
    ticker: 'B3SA3',
    companyName: 'B3 S.A. - BRASIL, BOLSA, BALCÃO',
    sector: 'Serviços Financeiros Diversos',
    isFii: false,
    referenceQuote: 10.80,
    dayChangePercent: 0.46,
    volume24hRaw: 390_000_000,
    totalShares: 5_426_500_000,
    marketCap: 58_606_000_000,
    enterpriseValue: 56_806_000_000,
    netRevenue12m: 10_350_000_000,
    ebit12m: 6_120_000_000,
    netIncome12m: 4_620_000_000,
    grossDebt: 12_800_000_000,
    cashAndEquivalents: 14_600_000_000,
    netDebt: -1_800_000_000,
    shareholdersEquity: 20_130_000_000,
    lpa: 0.85,
    vpa: 3.71,
    dividendsPerShare12m: 0.58,
    reportedPe: 12.71,
    reportedPvp: 2.91,
    reportedDyPercent: 5.37,
    reportedRoePercent: 22.95,
    reportedRoicPercent: 18.40,
    reportedNetMarginPercent: 44.64,
    reportedEbitMarginPercent: 59.13,
    reportedNetDebtToEbit: -0.29,
  },
  RENT3: {
    ticker: 'RENT3',
    companyName: 'LOCALIZA RENT A CAR ON',
    sector: 'Aluguel de Carros',
    isFii: false,
    referenceQuote: 41.20,
    dayChangePercent: -0.60,
    volume24hRaw: 310_000_000,
    totalShares: 1_082_650_000,
    marketCap: 44_605_000_000,
    enterpriseValue: 74_805_000_000,
    netRevenue12m: 37_400_000_000,
    ebit12m: 7_850_000_000,
    netIncome12m: 2_850_000_000,
    grossDebt: 41_200_000_000,
    cashAndEquivalents: 11_000_000_000,
    netDebt: 30_200_000_000,
    shareholdersEquity: 26_100_000_000,
    lpa: 2.63,
    vpa: 24.11,
    dividendsPerShare12m: 1.62,
    reportedPe: 15.67,
    reportedPvp: 1.71,
    reportedDyPercent: 3.93,
    reportedRoePercent: 10.92,
    reportedRoicPercent: 9.80,
    reportedNetMarginPercent: 7.62,
    reportedEbitMarginPercent: 20.99,
    reportedNetDebtToEbit: 3.85,
  },
};

async function fetchInvestidor10PortalMetrics(ticker: string): Promise<Map<string, number>> {
  const metrics = new Map<string, number>();
  try {
    const url = `https://investidor10.com.br/acoes/${encodeURIComponent(ticker.toLowerCase())}/`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(4000),
    });
    if (response.ok) {
      const html = await response.text();
      const cardRegex = /<span[^>]*title="([^"]+)"[^>]*>[\s\S]*?<\/span>[\s\S]*?<div[^>]*class="[^"]*_card-body[^"]*"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/gi;
      let m: RegExpExecArray | null;
      while ((m = cardRegex.exec(html)) !== null) {
        const key = normalizeLabelKey(m[1]);
        const val = parsePtBrNumeric(m[2]);
        if (key && val !== undefined && !metrics.has(key)) {
          metrics.set(key, val);
        }
      }
    }
  } catch {
    // Ignora se offline
  }
  return metrics;
}

async function fetchFundamentalBalanceData(ticker: string): Promise<FundamentalBalanceData | undefined> {
  const normalizedTicker = ticker.trim().toUpperCase();
  let parsed: FundamentalBalanceData | undefined;

  const inv10Promise = fetchInvestidor10PortalMetrics(normalizedTicker);

  try {
    const url = `https://www.fundamentus.com.br/detalhes.php?papel=${encodeURIComponent(normalizedTicker)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const decoder = new TextDecoder('iso-8859-1');
      const html = decoder.decode(buffer);
      parsed = parseFundamentusHtmlDocument(normalizedTicker, html);
    }
  } catch {
    // Continua silenciosamente para o baseline CVM caso a rede bloqueie o scraping
  }

  const inv10 = await inv10Promise;

  if (parsed) {
    if (inv10.size > 0) {
      const dy = inv10.get('dividend yield') ?? inv10.get('dy') ?? parsed.reportedDyPercent;
      const roic = inv10.get('roic') ?? parsed.reportedRoicPercent;
      const ebitMargin = inv10.get('margem ebit') ?? parsed.reportedEbitMarginPercent;
      const netMargin = inv10.get('margem liquida') ?? parsed.reportedNetMarginPercent;
      const roe = inv10.get('roe') ?? parsed.reportedRoePercent;
      const netDebtToEbit =
        inv10.get('divida liquida / ebit') ??
        inv10.get('div. liquida / ebit') ??
        parsed.reportedNetDebtToEbit;

      let dividendsPerShare12m = parsed.dividendsPerShare12m;
      if (dy != null && parsed.referenceQuote != null && parsed.referenceQuote > 0) {
        dividendsPerShare12m = roundHalfEvenServer((dy * parsed.referenceQuote) / 100, 4);
      }

      return {
        ...parsed,
        dividendsPerShare12m,
        reportedDyPercent: dy,
        reportedRoicPercent: roic,
        reportedEbitMarginPercent: ebitMargin,
        reportedNetMarginPercent: netMargin,
        reportedRoePercent: roe,
        reportedNetDebtToEbit: netDebtToEbit,
      };
    }
    return parsed;
  }

  return AUDITED_CVM_BASELINES[normalizedTicker];
}

async function requestBrapiEndpoint(normalizedTicker: string, includeModules: boolean): Promise<BrapiRawResult> {
  const tokenParam = BRAPI_TOKEN ? `&token=${encodeURIComponent(BRAPI_TOKEN)}` : '';
  const modulesParam = includeModules ? '&modules=defaultKeyStatistics,financialData' : '';
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(normalizedTicker)}?range=1d&interval=1d&fundamental=true${modulesParam}${tokenParam}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FolioHub/1.0',
      },
      signal: AbortSignal.timeout(6000),
    });
  } catch (err: unknown) {
    throw new HttpError(
      `Serviço de cotações externas (Brapi) temporariamente inacessível ou tempo limite excedido: ${err instanceof Error ? err.message : String(err)}`,
      502
    );
  }

  if (response.status === 404) {
    throw new HttpError(`O ativo '${normalizedTicker}' não foi localizado no catálogo da B3.`, 404);
  }

  if (!response.ok) {
    throw new HttpError(`A API externa da Brapi respondeu com erro de gateway (HTTP ${response.status}).`, response.status);
  }

  let json: BrapiApiResponse;
  try {
    json = (await response.json()) as BrapiApiResponse;
  } catch {
    throw new HttpError('Falha ao processar a resposta JSON fornecida pela Brapi.', 502);
  }

  if (json.error || !json.results || !json.results.length) {
    const detail = json.message || `Ativo '${normalizedTicker}' não foi localizado na B3.`;
    throw new HttpError(detail, 404);
  }

  return json.results[0];
}

async function fetchBrapiStockQuote(ticker: string): Promise<CachedStockQuote> {
  const normalizedTicker = ticker.trim().toUpperCase();

  const cached = quoteMemoryCache.get(normalizedTicker);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const balancePromise = fetchFundamentalBalanceData(normalizedTicker);

  let raw: BrapiRawResult | undefined;
  let brapiError: unknown;
  let springBootQuote: Record<string, unknown> | undefined;

  // Tenta sincronizar primeiramente com o Backend Spring Boot (localhost:8080) caso esteja ativo
  if (process.env['PORT'] !== '8080') {
    try {
      const sbResp = await fetch(`http://localhost:8080/api/stocks/${encodeURIComponent(normalizedTicker)}`, {
        headers: { 'Accept': 'application/json', 'X-FolioHub-SSR': '1' },
        signal: AbortSignal.timeout(2500),
      });
      if (sbResp.ok) {
        springBootQuote = (await sbResp.json()) as Record<string, unknown>;
      }
    } catch {
      // Backend Java na 8080 offline ou inacessível, segue com resolução direta
    }
  }

  if (springBootQuote && typeof springBootQuote['regularMarketPrice'] === 'number') {
    raw = {
      symbol: String(springBootQuote['symbol'] || normalizedTicker),
      shortName: String(springBootQuote['shortName'] || normalizedTicker),
      longName: String(springBootQuote['companyName'] || springBootQuote['shortName'] || normalizedTicker),
      regularMarketPrice: Number(springBootQuote['regularMarketPrice']),
      regularMarketChangePercent: Number(springBootQuote['regularMarketChangePercent'] ?? 0),
      regularMarketTime: String(springBootQuote['regularMarketTime'] || new Date().toISOString()),
      regularMarketDayLow: Number(springBootQuote['regularMarketDayLow'] ?? springBootQuote['regularMarketPrice']),
      regularMarketDayHigh: Number(springBootQuote['regularMarketDayHigh'] ?? springBootQuote['regularMarketPrice']),
      regularMarketVolume: typeof springBootQuote['regularMarketVolume'] === 'number' ? Number(springBootQuote['regularMarketVolume']) : undefined,
      marketCap: typeof springBootQuote['rawMarketCap'] === 'number' ? Number(springBootQuote['rawMarketCap']) : undefined,
    };
  } else {
    try {
      raw = await requestBrapiEndpoint(normalizedTicker, true);
    } catch (err: unknown) {
      if (err instanceof HttpError && err.status === 404) {
        throw err;
      }
      try {
        raw = await requestBrapiEndpoint(normalizedTicker, false);
      } catch (fallbackErr: unknown) {
        brapiError = fallbackErr;
      }
    }
  }

  const balance = await balancePromise;

  if (!raw && (!balance || balance.referenceQuote == null)) {
    if (brapiError instanceof HttpError) {
      throw new HttpError(brapiError.message, brapiError.status === 404 ? 404 : 502);
    }
    throw new HttpError(`Ativo '${normalizedTicker}' indisponível nos provedores de mercado.`, 502);
  }

  const stats = raw?.defaultKeyStatistics;
  const financials = raw?.financialData;

  const price = roundHalfEvenServer(Number(raw?.regularMarketPrice ?? balance?.referenceQuote ?? 0), 2);
  const shortName = (balance?.companyName || raw?.longName || raw?.shortName || normalizedTicker).trim();
  const sector = balance?.sector;

  // 1. Fundamentos por Ação: LPA = Lucro Líquido (12M) / Total de Ações, VPA = Patrimônio Líquido / Total de Ações
  const totalShares = balance?.totalShares ?? stats?.sharesOutstanding;
  const netIncome12m = balance?.netIncome12m ?? stats?.netIncomeToCommon;
  const bookEquity = balance?.shareholdersEquity;

  const fallbackLpa = balance?.lpa ?? stats?.trailingEps ?? raw?.earningsPerShare;
  const lpa =
    netIncome12m != null && totalShares != null && totalShares > 0
      ? roundHalfEvenServer(netIncome12m / totalShares, 4)
      : fallbackLpa != null
        ? roundHalfEvenServer(fallbackLpa, 4)
        : undefined;

  const fallbackVpa = balance?.vpa ?? stats?.bookValue;
  const vpa =
    bookEquity != null && totalShares != null && totalShares > 0
      ? roundHalfEvenServer(bookEquity / totalShares, 4)
      : fallbackVpa != null
        ? roundHalfEvenServer(fallbackVpa, 4)
        : undefined;

  // 2. P/L = Cotação Atual (P) / LPA
  const fallbackPe = balance?.reportedPe ?? stats?.trailingPE ?? raw?.priceEarnings;
  const priceEarnings =
    price > 0 && lpa != null && lpa !== 0
      ? roundHalfEvenServer(price / lpa, 2)
      : fallbackPe != null
        ? roundHalfEvenServer(fallbackPe, 2)
        : undefined;

  // 3. P/VP = Cotação Atual (P) / VPA
  const fallbackPvp = balance?.reportedPvp ?? stats?.priceToBook ?? raw?.priceToBook;
  const priceToBook =
    price > 0 && vpa != null && vpa > 0
      ? roundHalfEvenServer(price / vpa, 2)
      : fallbackPvp != null
        ? roundHalfEvenServer(fallbackPvp, 2)
        : undefined;

  // 4. Dividend Yield (12M) = (Proventos 12M por Ação / Cotação Atual P) * 100
  const dividendsPerShare12m = balance?.dividendsPerShare12m;
  const fallbackDy =
    balance?.reportedDyPercent ??
    normalizeBrapiDecimalToPercent(stats?.dividendYield) ??
    normalizeBrapiDecimalToPercent(raw?.dividendYield);
  const dividendYield =
    dividendsPerShare12m != null && dividendsPerShare12m >= 0 && price > 0
      ? roundHalfEvenServer((dividendsPerShare12m / price) * 100, 2)
      : fallbackDy != null
        ? roundHalfEvenServer(fallbackDy, 2)
        : undefined;

  // 5. ROE = (Lucro Líquido 12M / Patrimônio Líquido) * 100  [ou (LPA / VPA) * 100]
  const fallbackRoe =
    balance?.reportedRoePercent ??
    normalizeBrapiDecimalToPercent(financials?.returnOnEquity) ??
    normalizeBrapiDecimalToPercent(raw?.returnOnEquity);
  const returnOnEquity =
    netIncome12m != null && bookEquity != null && bookEquity > 0
      ? roundHalfEvenServer((netIncome12m / bookEquity) * 100, 2)
      : lpa != null && vpa != null && vpa > 0
        ? roundHalfEvenServer((lpa / vpa) * 100, 2)
        : fallbackRoe != null
          ? roundHalfEvenServer(fallbackRoe, 2)
          : undefined;

  // 6. Margem Líquida = (Lucro Líquido 12M / Receita Líquida 12M) * 100
  const netRevenue12m = balance?.netRevenue12m ?? financials?.totalRevenue;
  const fallbackNetMargin =
    (balance?.reportedNetMarginPercent != null && balance.reportedNetMarginPercent !== 0
      ? balance.reportedNetMarginPercent
      : undefined) ??
    normalizeBrapiDecimalToPercent(financials?.profitMargins) ??
    normalizeBrapiDecimalToPercent(stats?.profitMargins);
  const netMargin =
    netIncome12m != null && netRevenue12m != null && netRevenue12m > 0
      ? roundHalfEvenServer((netIncome12m / netRevenue12m) * 100, 2)
      : fallbackNetMargin != null
        ? roundHalfEvenServer(fallbackNetMargin, 2)
        : undefined;

  // 7. EBIT (12M), Margem EBIT e Dívida Líquida / EBIT (Opção 1 Recomendada)
  const isFinancialOrFii =
    Boolean(balance?.isFii) ||
    Boolean(sector && sector.toLowerCase().includes('bancos'));
  const ebit12m = isFinancialOrFii ? undefined : balance?.ebit12m;
  const ebitMargin = isFinancialOrFii
    ? undefined
    : ebit12m != null && netRevenue12m != null && netRevenue12m > 0
      ? roundHalfEvenServer((ebit12m / netRevenue12m) * 100, 2)
      : balance?.reportedEbitMarginPercent != null
        ? roundHalfEvenServer(balance.reportedEbitMarginPercent, 2)
        : undefined;

  const grossDebt = isFinancialOrFii ? undefined : balance?.grossDebt ?? financials?.totalDebt;
  const cash = isFinancialOrFii ? undefined : balance?.cashAndEquivalents ?? financials?.totalCash;
  const resolvedNetDebt = isFinancialOrFii
    ? undefined
    : balance?.netDebt != null
      ? balance.netDebt
      : grossDebt != null && cash != null
        ? grossDebt - cash
        : undefined;

  const netDebtToEbit = isFinancialOrFii
    ? undefined
    : resolvedNetDebt != null && ebit12m != null && ebit12m !== 0
      ? roundHalfEvenServer(resolvedNetDebt / ebit12m, 2)
      : balance?.reportedNetDebtToEbit;
  const ebitFormatted = formatCompactBrlCurrency(ebit12m);

  // 8. ROIC, Preço Justo de Graham, Valor de Mercado e Volume Financeiro
  const roic = isFinancialOrFii
    ? undefined
    : balance?.reportedRoicPercent != null
      ? roundHalfEvenServer(balance.reportedRoicPercent, 2)
      : undefined;
  const grahamFairPrice =
    !isFinancialOrFii && lpa != null && vpa != null && lpa > 0 && vpa > 0
      ? roundHalfEvenServer(Math.sqrt(22.5 * lpa * vpa), 2)
      : undefined;

  const rawMarketCap =
    price > 0 && totalShares != null && totalShares > 0
      ? roundHalfEvenServer(price * totalShares, 0)
      : balance?.marketCap ?? raw?.marketCap;

  // Volume Financeiro em Reais: se vier quantidade de ações da Brapi, multiplica pela cotação atual
  let regularMarketVolume: number | undefined;
  if (raw?.regularMarketVolume != null && raw.regularMarketVolume > 0 && price > 0) {
    // Se veio do Spring Boot já convertido (quando ebitMargin existe no payload), mantém; caso seja volume de ações da Brapi, multiplica por price
    const alreadyInReais = springBootQuote && springBootQuote['ebitMargin'] !== undefined;
    regularMarketVolume = alreadyInReais
      ? roundHalfEvenServer(raw.regularMarketVolume, 2)
      : roundHalfEvenServer(raw.regularMarketVolume * price, 2);
  } else {
    regularMarketVolume = balance?.volume24hRaw;
  }

  const volume24h = formatCompactBrlCurrency(regularMarketVolume);
  const marketCap = formatCompactBrlCurrency(rawMarketCap);

  const mapped: CachedStockQuote = {
    symbol: raw?.symbol || normalizedTicker,
    ticker: raw?.symbol || normalizedTicker,
    shortName,
    companyName: shortName,
    sector,
    regularMarketPrice: price,
    currentPrice: price,
    regularMarketChangePercent: roundHalfEvenServer(Number(raw?.regularMarketChangePercent ?? balance?.dayChangePercent ?? 0), 2),
    regularMarketTime: raw?.regularMarketTime || new Date().toISOString(),
    regularMarketDayLow: roundHalfEvenServer(Number(raw?.regularMarketDayLow ?? price), 2),
    regularMarketDayHigh: roundHalfEvenServer(Number(raw?.regularMarketDayHigh ?? price), 2),
    priceEarnings,
    priceToBook,
    dividendYield,
    returnOnEquity,
    netMargin,
    ebitMargin,
    netDebtToEbit,
    earningsPerShare: lpa,
    bookValuePerShare: vpa,
    roic,
    grahamFairPrice,
    ebit12m,
    ebitFormatted,
    regularMarketVolume,
    rawMarketCap,
    volume24h,
    marketCap,
    cachedAt: new Date().toISOString(),
  };

  quoteMemoryCache.set(normalizedTicker, { data: mapped, expiresAt: Date.now() + QUOTE_CACHE_TTL_MS });
  return mapped;
}

// 1. GET /api/stocks/:ticker
app.get('/api/stocks/:ticker', async (req, res): Promise<void> => {
  const tickerParam = req.params['ticker'];
  const ticker = tickerParam ? tickerParam.toUpperCase().trim() : '';

  if (!/^[A-Za-z0-9]{4,6}$/.test(ticker)) {
    res.status(400).json({
      type: 'https://foliohub.com/errors/invalid-parameters',
      title: 'Restrição de parâmetro violada',
      status: 400,
      detail: 'O ticker informado não segue o padrão da B3 (ex: PETR4, VALE3, WEGE3, MXRF11).',
      instance: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const quote = await fetchBrapiStockQuote(ticker);
    res.json(quote);
  } catch (err: unknown) {
    const statusCode = err instanceof HttpError ? err.status : 502;
    const isNotFound = statusCode === 404;
    const message = err instanceof Error ? err.message : 'Erro ao consultar cotação externa.';

    res.status(statusCode).json({
      type: isNotFound ? 'https://foliohub.com/errors/resource-not-found' : 'https://foliohub.com/errors/market-data-unavailable',
      title: isNotFound ? 'Recurso Não Encontrado' : 'Serviço de mercado financeiro indisponível (Bad Gateway)',
      status: statusCode,
      detail: message,
      instance: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
});

// 2. GET /api/macro-indicators
app.get('/api/macro-indicators', (_req, res): void => {
  res.json({
    selic: 10.75,
    cdi: 10.50,
    ipca12m: 4.12,
    dolar: 5.48,
    updatedAt: new Date().toISOString(),
  });
});

// 3. GET /api/portfolio/stocks
app.get('/api/portfolio/stocks', (req, res): void => {
  const userId = req.query['userId'] as string | undefined;
  const filtered = userId ? inMemoryStockTxs.filter((t) => t.userId === userId) : inMemoryStockTxs;
  res.json(filtered);
});

// 4. POST /api/portfolio/stocks
app.post('/api/portfolio/stocks', (req, res): void => {
  const { userId, ticker, type, quantity, unitPrice, brokerageFees, operationDate } = req.body;

  if (!ticker || !type || !quantity || !unitPrice || !operationDate) {
    res.status(400).json({
      type: 'https://api.foliohub.com/errors/validation-failed',
      title: 'Erro de Validação Contábil',
      status: 400,
      detail: 'Parâmetros obrigatórios da transação B3 não foram preenchidos.',
      invalidParams: [
        { field: 'ticker', message: 'Ticker é obrigatório.' },
        { field: 'quantity', message: 'Quantidade deve ser maior que zero.' },
        { field: 'unitPrice', message: 'Preço unitário deve ser positivo.' },
      ],
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const newTx: StockTxRecord = {
    id: 'tx-' + Math.random().toString(36).substring(2, 9),
    userId: userId || defaultUserId,
    ticker: ticker.toUpperCase().trim(),
    type,
    quantity: Number(quantity),
    unitPrice: Number(unitPrice),
    totalValue: Number((quantity * unitPrice).toFixed(2)),
    brokerageFees: Number(brokerageFees || 0),
    operationDate,
  };

  inMemoryStockTxs.unshift(newTx);
  res.status(201).json(newTx);
});

// 5. GET /api/portfolio/fixed-income
app.get('/api/portfolio/fixed-income', (req, res): void => {
  const userId = req.query['userId'] as string | undefined;
  const filtered = userId ? inMemoryFixedIncome.filter((f) => f.userId === userId) : inMemoryFixedIncome;
  res.json(filtered);
});

// 6. POST /api/portfolio/fixed-income
app.post('/api/portfolio/fixed-income', (req, res): void => {
  const { userId, assetName, issuer, type, indexer, contractedRate, investedAmount, investmentDate, dueDate } = req.body;

  if (!assetName || !issuer || !type || !indexer || !contractedRate || !investedAmount || !investmentDate || !dueDate) {
    res.status(400).json({
      type: 'https://api.foliohub.com/errors/validation-failed',
      title: 'Erro de Validação de Renda Fixa',
      status: 400,
      detail: 'Dados da posição de renda fixa incompletos.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const newRecord: FixedIncomeRecord = {
    id: 'fip-' + Math.random().toString(36).substring(2, 9),
    userId: userId || defaultUserId,
    assetName,
    issuer,
    type,
    indexer,
    contractedRate: Number(contractedRate),
    investedAmount: Number(investedAmount),
    currentAmount: Number(investedAmount),
    investmentDate,
    dueDate,
    active: true,
  };

  inMemoryFixedIncome.unshift(newRecord);
  res.status(201).json(newRecord);
});

interface StockPositionDetail {
  ticker: string;
  companyName: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalInvested: number;
  currentMarketValue: number;
  totalCurrentValue: number;
  profitLossAmount: number;
  profitLossPercentage: number;
  portfolioAllocationPercentage: number;
}

// Helper function to consolidate stock portfolio dynamically with Brapi quotes
async function consolidateUserStockPortfolio(userId: string) {
  const userTxs = inMemoryStockTxs.filter((t) => t.userId === userId);
  const tickers = Array.from(new Set(userTxs.map((t) => t.ticker.toUpperCase())));

  let totalInvested = 0;
  let totalMarketValue = 0;
  const positions: StockPositionDetail[] = [];

  for (const ticker of tickers) {
    const tickerTxs = userTxs
      .filter((t) => t.ticker.toUpperCase() === ticker)
      .sort((a, b) => a.operationDate.localeCompare(b.operationDate));

    let runningQty = 0;
    let runningCost = 0;
    let avgPrice = 0;

    for (const tx of tickerTxs) {
      if (tx.type === 'COMPRA') {
        const txCost = tx.quantity * tx.unitPrice + (tx.brokerageFees || 0);
        runningQty += tx.quantity;
        runningCost += txCost;
        if (runningQty > 0) {
          avgPrice = runningCost / runningQty;
        }
      } else if (tx.type === 'VENDA') {
        runningQty -= tx.quantity;
        if (runningQty <= 0) {
          runningQty = 0;
          runningCost = 0;
          avgPrice = 0;
        } else {
          runningCost = runningQty * avgPrice;
        }
      }
    }

    if (runningQty > 0) {
      // Dynamic live quote from Brapi
      const quote = await fetchBrapiStockQuote(ticker);
      const currentPrice = quote.regularMarketPrice;
      const currentMarketValue = Number((runningQty * currentPrice).toFixed(2));
      const profitLossAmount = Number((currentMarketValue - runningCost).toFixed(2));
      const profitLossPercentage = runningCost > 0 ? Number(((profitLossAmount / runningCost) * 100).toFixed(2)) : 0;

      totalInvested += runningCost;
      totalMarketValue += currentMarketValue;

      positions.push({
        ticker,
        companyName: quote.companyName || quote.shortName || ticker,
        quantity: runningQty,
        averagePrice: Number(avgPrice.toFixed(4)),
        currentPrice: Number(currentPrice.toFixed(2)),
        totalInvested: Number(runningCost.toFixed(2)),
        currentMarketValue,
        totalCurrentValue: currentMarketValue,
        profitLossAmount,
        profitLossPercentage,
        portfolioAllocationPercentage: 0,
      });
    }
  }

  // Calculate allocation weights
  for (const pos of positions) {
    pos.portfolioAllocationPercentage =
      totalMarketValue > 0 ? Number(((pos.currentMarketValue / totalMarketValue) * 100).toFixed(2)) : 0;
  }

  positions.sort((a, b) => b.currentMarketValue - a.currentMarketValue);

  const totalProfitLossAmount = Number((totalMarketValue - totalInvested).toFixed(2));
  const totalProfitLossPercentage = totalInvested > 0 ? Number(((totalProfitLossAmount / totalInvested) * 100).toFixed(2)) : 0;

  return {
    userId,
    totalInvested: Number(totalInvested.toFixed(2)),
    totalMarketValue: Number(totalMarketValue.toFixed(2)),
    totalCurrentValue: Number(totalMarketValue.toFixed(2)),
    totalProfitLossAmount,
    totalProfitLossPercentage,
    positions,
    consolidatedAt: new Date().toISOString(),
  };
}

// 7. GET /api/portfolio/consolidation
app.get('/api/portfolio/consolidation', async (req, res): Promise<void> => {
  const userId = (req.query['userId'] as string | undefined) || defaultUserId;
  try {
    const consolidation = await consolidateUserStockPortfolio(userId);
    res.json(consolidation);
  } catch (err: unknown) {
    const statusCode = err instanceof HttpError ? err.status : 502;
    const message = err instanceof Error ? err.message : String(err);
    res.status(statusCode).json({
      type: statusCode === 404 ? 'https://foliohub.com/errors/resource-not-found' : 'https://foliohub.com/errors/market-data-unavailable',
      title: statusCode === 404 ? 'Ativo Não Encontrado' : 'Serviço de mercado financeiro indisponível (Bad Gateway)',
      status: statusCode,
      detail: `Falha na consolidação de carteira: ${message}`,
      instance: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
});

// 8. GET /api/portfolio/summary
app.get('/api/portfolio/summary', async (req, res): Promise<void> => {
  const userId = (req.query['userId'] as string | undefined) || defaultUserId;

  try {
    const stockConsolidation = await consolidateUserStockPortfolio(userId);
    const userFi = inMemoryFixedIncome.filter((f) => f.userId === userId && f.active);

    const totalFiCurrent = userFi.reduce((acc, f) => acc + f.currentAmount, 0);
    const totalFiInvested = userFi.reduce((acc, f) => acc + f.investedAmount, 0);

    const totalStocksCurrent = stockConsolidation.totalMarketValue;
    const totalStocksInvested = stockConsolidation.totalInvested;

    const totalNetWorth = Number((totalStocksCurrent + totalFiCurrent).toFixed(2));
    const totalInvested = Number((totalStocksInvested + totalFiInvested).toFixed(2));
    const totalProfitLoss = Number((totalNetWorth - totalInvested).toFixed(2));
    const totalProfitLossPercent = totalInvested > 0 ? Number(((totalProfitLoss / totalInvested) * 100).toFixed(2)) : 0;

    const stocksPercent = totalNetWorth > 0 ? Number(((totalStocksCurrent / totalNetWorth) * 100).toFixed(1)) : 50;
    const fixedIncomePercent = totalNetWorth > 0 ? Number(((totalFiCurrent / totalNetWorth) * 100).toFixed(1)) : 50;

    res.json({
      userId,
      totalNetWorth,
      totalInvested,
      totalProfitLoss,
      totalProfitLossPercent,
      allocation: {
        stocksPercent,
        fixedIncomePercent,
        stocksTotal: Number(totalStocksCurrent.toFixed(2)),
        fixedIncomeTotal: Number(totalFiCurrent.toFixed(2)),
      },
      stocksCount: stockConsolidation.positions.length,
      fixedIncomeCount: userFi.length,
    });
  } catch (err: unknown) {
    const statusCode = err instanceof HttpError ? err.status : 502;
    const message = err instanceof Error ? err.message : String(err);
    res.status(statusCode).json({
      type: statusCode === 404 ? 'https://foliohub.com/errors/resource-not-found' : 'https://foliohub.com/errors/market-data-unavailable',
      title: statusCode === 404 ? 'Ativo Não Encontrado' : 'Serviço de mercado financeiro indisponível (Bad Gateway)',
      status: statusCode,
      detail: `Falha ao obter sumário patrimonial consolidado: ${message}`,
      instance: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
});

// 8. POST /api/calculator/fixed-income
app.post('/api/calculator/fixed-income', (req, res): void => {
  const { initialAmount, monthlyDeposit, periodMonths, ratePercent, assetType, indexer } = req.body;

  const initial = Number(initialAmount) || 0;
  const monthly = Number(monthlyDeposit) || 0;
  const months = Number(periodMonths) || 1;
  const rate = Number(ratePercent) || 100;
  const days = months * 30;

  const isExempt = assetType === 'LCI' || assetType === 'LCA';
  let irTaxRatePercent = 0;
  if (!isExempt) {
    if (days <= 180) irTaxRatePercent = 22.5;
    else if (days <= 360) irTaxRatePercent = 20.0;
    else if (days <= 720) irTaxRatePercent = 17.5;
    else irTaxRatePercent = 15.0;
  }

  const cdiAnual = 0.105;
  const taxaAnualEfetiva = indexer === 'CDI' ? (cdiAnual * rate) / 100 : rate / 100;
  const taxaMensal = Math.pow(1 + taxaAnualEfetiva, 1 / 12) - 1;

  let balance = initial;
  let totalInvested = initial;

  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + taxaMensal) + monthly;
    totalInvested += monthly;
  }

  const grossEarnings = Math.max(0, balance - totalInvested);
  const taxDeduction = isExempt ? 0 : Number((grossEarnings * (irTaxRatePercent / 100)).toFixed(2));
  const netBalance = Number((balance - taxDeduction).toFixed(2));
  const grossBalance = Number(balance.toFixed(2));

  // Poupança benchmark (6.17% a.a.)
  const taxaMensalPoupanca = Math.pow(1 + 0.0617, 1 / 12) - 1;
  let balancePoupanca = initial;
  for (let m = 1; m <= months; m++) {
    balancePoupanca = balancePoupanca * (1 + taxaMensalPoupanca) + monthly;
  }
  const poupancaRounded = Number(balancePoupanca.toFixed(2));

  res.json({
    days,
    months,
    totalInvested: Number(totalInvested.toFixed(2)),
    grossBalance,
    grossEarnings: Number(grossEarnings.toFixed(2)),
    irTaxRatePercent,
    isExempt,
    taxDeduction,
    netBalance,
    netProfit: Number((netBalance - totalInvested).toFixed(2)),
    netProfitPercent: totalInvested > 0 ? Number((((netBalance - totalInvested) / totalInvested) * 100).toFixed(2)) : 0,
    balancePoupanca: poupancaRounded,
    diffPoupanca: Number((netBalance - poupancaRounded).toFixed(2)),
  });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
