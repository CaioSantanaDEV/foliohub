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

const b3MarketData: Record<string, { price: number; change: number; company: string; pl: number; pvp: number; dy: number; roe: number }> = {
  PETR4: { price: 38.45, change: 1.45, company: 'Petrobras PN', pl: 4.82, pvp: 1.15, dy: 14.8, roe: 24.12 },
  VALE3: { price: 62.3, change: -0.68, company: 'Vale S.A. ON', pl: 6.15, pvp: 1.32, dy: 9.2, roe: 21.45 },
  WEGE3: { price: 51.15, change: 0.95, company: 'WEG S.A. ON', pl: 32.4, pvp: 10.85, dy: 2.15, roe: 34.5 },
  ITUB4: { price: 34.8, change: 0.32, company: 'Itaú Unibanco PN', pl: 8.9, pvp: 1.68, dy: 7.45, roe: 21.2 },
  BBAS3: { price: 28.9, change: 1.1, company: 'Banco do Brasil ON', pl: 4.45, pvp: 0.88, dy: 10.15, roe: 21.8 },
  MXRF11: { price: 10.25, change: 0.1, company: 'Maxi Renda FII', pl: 11.2, pvp: 1.01, dy: 12.45, roe: 9.8 },
};

// 1. GET /api/stocks/:ticker
app.get('/api/stocks/:ticker', (req, res): void => {
  const tickerParam = req.params['ticker'];
  const ticker = tickerParam ? tickerParam.toUpperCase() : '';
  const stock = b3MarketData[ticker];

  if (!stock) {
    res.status(404).json({
      type: 'https://api.foliohub.com/errors/not-found',
      title: 'Ativo Não Encontrado',
      status: 404,
      detail: `O ticker '${ticker}' não foi localizado no catálogo da B3.`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    ticker,
    companyName: stock.company,
    regularMarketPrice: stock.price,
    regularMarketChangePercent: stock.change,
    regularMarketDayLow: Number((stock.price * 0.985).toFixed(2)),
    regularMarketDayHigh: Number((stock.price * 1.015).toFixed(2)),
    priceEarnings: stock.pl,
    priceToBook: stock.pvp,
    dividendYield: stock.dy,
    returnOnEquity: stock.roe,
    cachedAt: new Date().toISOString(),
  });
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

// 7. GET /api/portfolio/summary
app.get('/api/portfolio/summary', (req, res): void => {
  const userId = (req.query['userId'] as string | undefined) || defaultUserId;
  const userTxs = inMemoryStockTxs.filter((t) => t.userId === userId);
  const userFi = inMemoryFixedIncome.filter((f) => f.userId === userId && f.active);

  const totalFiCurrent = userFi.reduce((acc, f) => acc + f.currentAmount, 0);
  const totalFiInvested = userFi.reduce((acc, f) => acc + f.investedAmount, 0);

  let totalStocksCurrent = 0;
  let totalStocksInvested = 0;

  const stockMap = new Map<string, number>();
  for (const tx of userTxs) {
    const cur = stockMap.get(tx.ticker) || 0;
    stockMap.set(tx.ticker, tx.type === 'COMPRA' ? cur + tx.quantity : Math.max(0, cur - tx.quantity));
    if (tx.type === 'COMPRA') totalStocksInvested += tx.totalValue;
  }

  for (const [ticker, qty] of stockMap.entries()) {
    const price = b3MarketData[ticker]?.price || 20.0;
    totalStocksCurrent += qty * price;
  }

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
    stocksCount: stockMap.size,
    fixedIncomeCount: userFi.length,
  });
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
