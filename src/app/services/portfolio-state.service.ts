import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, forkJoin, map, Observable, of, tap } from 'rxjs';
import {
  AssetAllocationDto,
  FixedIncomePositionCreateDto,
  FixedIncomePositionResponseDto,
  StockPositionSummaryDto,
  StockQuoteDto,
  StockTransactionCreateDto,
  StockTransactionResponseDto,
} from '../models/folio.models';
import { StockTransactionService } from './stock-transaction.service';
import { FixedIncomeService } from './fixed-income.service';
import { StockMarketService } from './stock-market.service';

/**
 * Função utilitária que simula o comportamento estrito de RoundingMode.HALF_EVEN
 * (Banker's Rounding) do BigDecimal do Java para operações na B3.
 */
export function roundHalfEven(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  const temp = value * factor;
  const floor = Math.floor(temp);
  const diff = temp - floor;

  if (Math.abs(diff - 0.5) < 1e-9) {
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  return Math.round(temp) / factor;
}

@Injectable({
  providedIn: 'root',
})
export class PortfolioStateService {
  private readonly transactionService = inject(StockTransactionService);
  private readonly fixedIncomeService = inject(FixedIncomeService);
  private readonly marketService = inject(StockMarketService);

  readonly transactions = signal<StockTransactionResponseDto[]>([]);
  readonly fixedIncomePositions = signal<FixedIncomePositionResponseDto[]>([]);
  readonly quotes = signal<Record<string, StockQuoteDto>>({
    PETR4: {
      ticker: 'PETR4',
      companyName: 'Petrobras PN',
      regularMarketPrice: 38.45,
      regularMarketChangePercent: 1.45,
      regularMarketDayLow: 37.8,
      regularMarketDayHigh: 38.65,
      priceEarnings: 4.82,
      priceToBook: 1.15,
      dividendYield: 14.8,
      returnOnEquity: 24.12,
      netMargin: 22.4,
      netDebtToEbit: 0.85,
    },
    VALE3: {
      ticker: 'VALE3',
      companyName: 'Vale S.A. ON',
      regularMarketPrice: 62.3,
      regularMarketChangePercent: -0.68,
      regularMarketDayLow: 61.9,
      regularMarketDayHigh: 63.1,
      priceEarnings: 6.15,
      priceToBook: 1.32,
      dividendYield: 9.2,
      returnOnEquity: 21.45,
      netMargin: 19.8,
      netDebtToEbit: 0.62,
    },
    WEGE3: {
      ticker: 'WEGE3',
      companyName: 'WEG S.A. ON',
      regularMarketPrice: 51.15,
      regularMarketChangePercent: 0.95,
      regularMarketDayLow: 50.4,
      regularMarketDayHigh: 51.45,
      priceEarnings: 32.4,
      priceToBook: 10.85,
      dividendYield: 2.15,
      returnOnEquity: 34.5,
      netMargin: 17.2,
      netDebtToEbit: -0.15,
    },
    ITUB4: {
      ticker: 'ITUB4',
      companyName: 'Itaú Unibanco PN',
      regularMarketPrice: 34.8,
      regularMarketChangePercent: 0.32,
      regularMarketDayLow: 34.45,
      regularMarketDayHigh: 34.95,
      priceEarnings: 8.9,
      priceToBook: 1.68,
      dividendYield: 7.45,
      returnOnEquity: 21.2,
      netMargin: 25.1,
          },
    BBAS3: {
      ticker: 'BBAS3',
      companyName: 'Banco do Brasil ON',
      regularMarketPrice: 28.9,
      regularMarketChangePercent: 1.1,
      regularMarketDayLow: 28.5,
      regularMarketDayHigh: 29.1,
      priceEarnings: 4.45,
      priceToBook: 0.88,
      dividendYield: 10.15,
      returnOnEquity: 21.8,
      netMargin: 23.4,
          },
    MXRF11: {
      ticker: 'MXRF11',
      companyName: 'Maxi Renda FII',
      regularMarketPrice: 10.25,
      regularMarketChangePercent: 0.1,
      regularMarketDayLow: 10.22,
      regularMarketDayHigh: 10.28,
      priceEarnings: 11.2,
      priceToBook: 1.01,
      dividendYield: 12.45,
      returnOnEquity: 9.8,
      netMargin: 88.5,
          },
  });

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly lastSyncAt = signal<Date | null>(null);

  /**
   * Cálculo contábil do Preço Médio Ponderado por Ticker (IN RFB e regras B3).
   * O preço médio é recalculado nas compras somando custos e corretagens.
   * Nas vendas, o preço médio é preservado e o saldo de quantidade é reduzido.
   */
  readonly stockPositions = computed<StockPositionSummaryDto[]>(() => {
    const txs = this.transactions();
    const market = this.quotes();

    const custodyMap = new Map<string, { quantity: number; totalCost: number }>();
    const sorted = [...txs].sort((a, b) => a.operationDate.localeCompare(b.operationDate));

    for (const tx of sorted) {
      const entry = custodyMap.get(tx.ticker) || { quantity: 0, totalCost: 0 };

      if (tx.type === 'COMPRA') {
        const newQty = entry.quantity + tx.quantity;
        const newCost = entry.totalCost + tx.totalValue + (tx.brokerageFees || 0);
        custodyMap.set(tx.ticker, { quantity: newQty, totalCost: newCost });
      } else {
        const avgPrice = entry.quantity > 0 ? entry.totalCost / entry.quantity : 0;
        const remainingQty = Math.max(0, entry.quantity - tx.quantity);
        const remainingCost = remainingQty * avgPrice;
        custodyMap.set(tx.ticker, { quantity: remainingQty, totalCost: remainingCost });
      }
    }

    const summaries: StockPositionSummaryDto[] = [];
    let grandStockTotal = 0;

    for (const [ticker, data] of custodyMap.entries()) {
      if (data.quantity > 0) {
        const quote = market[ticker];
        const currentPrice = quote ? quote.regularMarketPrice : 20.0;
        const companyName = quote ? quote.companyName : ticker;

        const averagePrice = roundHalfEven(data.totalCost / data.quantity, 4);
        const currentTotal = roundHalfEven(data.quantity * currentPrice, 2);
        const totalInvested = roundHalfEven(data.totalCost, 2);
        const profitLoss = roundHalfEven(currentTotal - totalInvested, 2);
        const profitLossPercent =
          totalInvested > 0 ? roundHalfEven((profitLoss / totalInvested) * 100, 2) : 0;

        grandStockTotal += currentTotal;

        summaries.push({
          ticker,
          companyName,
          quantity: data.quantity,
          averagePrice,
          currentPrice,
          totalInvested,
          currentTotal,
          profitLoss,
          profitLossPercent,
          portfolioWeight: 0,
        });
      }
    }

    return summaries.map((s) => ({
      ...s,
      portfolioWeight:
        grandStockTotal > 0 ? roundHalfEven((s.currentTotal / grandStockTotal) * 100, 1) : 0,
    }));
  });

  readonly totalStocksInvested = computed<number>(() => {
    return this.stockPositions().reduce((acc, p) => acc + p.totalInvested, 0);
  });

  readonly totalStocksCurrent = computed<number>(() => {
    return this.stockPositions().reduce((acc, p) => acc + p.currentTotal, 0);
  });

  readonly totalFixedIncomeInvested = computed<number>(() => {
    return this.fixedIncomePositions()
      .filter((p) => p.active)
      .reduce((acc, p) => acc + p.investedAmount, 0);
  });

  readonly totalFixedIncomeCurrent = computed<number>(() => {
    return this.fixedIncomePositions()
      .filter((p) => p.active)
      .reduce((acc, p) => acc + p.currentAmount, 0);
  });

  readonly totalNetWorth = computed<number>(() => {
    return roundHalfEven(this.totalStocksCurrent() + this.totalFixedIncomeCurrent(), 2);
  });

  readonly totalCapitalInvested = computed<number>(() => {
    return roundHalfEven(this.totalStocksInvested() + this.totalFixedIncomeInvested(), 2);
  });

  readonly totalProfitLoss = computed<number>(() => {
    return roundHalfEven(this.totalNetWorth() - this.totalCapitalInvested(), 2);
  });

  readonly totalProfitLossPercent = computed<number>(() => {
    const invested = this.totalCapitalInvested();
    if (invested === 0) return 0;
    return roundHalfEven((this.totalProfitLoss() / invested) * 100, 2);
  });

  readonly assetAllocation = computed<AssetAllocationDto>(() => {
    const total = this.totalNetWorth();
    const stocks = this.totalStocksCurrent();
    const fixed = this.totalFixedIncomeCurrent();

    if (total === 0) {
      return {
        stocksPercent: 50,
        fixedIncomePercent: 50,
        stocksTotal: 0,
        fixedIncomeTotal: 0,
      };
    }

    return {
      stocksPercent: roundHalfEven((stocks / total) * 100, 1),
      fixedIncomePercent: roundHalfEven((fixed / total) * 100, 1),
      stocksTotal: stocks,
      fixedIncomeTotal: fixed,
    };
  });

  loadPortfolio(userId: string): Observable<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    return forkJoin({
      transactions: this.transactionService.getTransactions(userId).pipe(
        catchError((err) => {
          console.warn('Falha ao carregar transações da API, usando cache local:', err);
          return of(this.transactions());
        })
      ),
      fixedIncome: this.fixedIncomeService.getPositions(userId).pipe(
        catchError((err) => {
          console.warn('Falha ao carregar renda fixa da API, usando cache local:', err);
          return of(this.fixedIncomePositions());
        })
      ),
    }).pipe(
      tap(({ transactions, fixedIncome }) => {
        if (transactions.length > 0) {
          this.transactions.set(transactions);
          const uniqueTickers = Array.from(new Set(transactions.map((t) => t.ticker.toUpperCase())));
          for (const ticker of uniqueTickers) {
            this.fetchStockQuote(ticker).subscribe({
              error: (err: unknown) => console.debug('Cotação inicial não obtida:', ticker, err),
            });
          }
        }
        if (fixedIncome.length > 0) {
          this.fixedIncomePositions.set(fixedIncome);
        }
        this.lastSyncAt.set(new Date());
      }),
      map(() => void 0),
      finalize(() => this.isLoading.set(false))
    );
  }

  addStockTransaction(dto: StockTransactionCreateDto): Observable<StockTransactionResponseDto> {
    this.isLoading.set(true);

    return this.transactionService.createTransaction(dto).pipe(
      tap((created) => {
        this.transactions.update((list) => [created, ...list]);
        this.fetchStockQuote(created.ticker).subscribe({
          error: (err: unknown) => console.debug('Cotação após aporte não obtida:', created.ticker, err),
        });
        this.lastSyncAt.set(new Date());
      }),
      catchError(() => {
        // Fallback reativo para preservação de operações offline/demo
        const fallback: StockTransactionResponseDto = {
          id: 'tx-' + Math.random().toString(36).substring(2, 9),
          userId: dto.userId,
          ticker: dto.ticker.toUpperCase().trim(),
          type: dto.type,
          quantity: dto.quantity,
          unitPrice: dto.unitPrice,
          totalValue: roundHalfEven(dto.quantity * dto.unitPrice, 2),
          brokerageFees: dto.brokerageFees || 0,
          operationDate: dto.operationDate,
        };
        this.transactions.update((list) => [fallback, ...list]);
        return of(fallback);
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  addFixedIncomePosition(
    dto: FixedIncomePositionCreateDto
  ): Observable<FixedIncomePositionResponseDto> {
    this.isLoading.set(true);

    return this.fixedIncomeService.createPosition(dto).pipe(
      tap((created) => {
        this.fixedIncomePositions.update((list) => [created, ...list]);
        this.lastSyncAt.set(new Date());
      }),
      catchError(() => {
        const fallback: FixedIncomePositionResponseDto = {
          id: 'fip-' + Math.random().toString(36).substring(2, 9),
          userId: dto.userId,
          assetName: dto.assetName.trim(),
          issuer: dto.issuer.trim(),
          type: dto.type,
          indexer: dto.indexer,
          contractedRate: dto.contractedRate,
          investedAmount: dto.investedAmount,
          currentAmount: dto.investedAmount,
          investmentDate: dto.investmentDate,
          dueDate: dto.dueDate,
          active: true,
        };
        this.fixedIncomePositions.update((list) => [fallback, ...list]);
        return of(fallback);
      }),
      finalize(() => this.isLoading.set(false))
    );
  }

  fetchStockQuote(ticker: string): Observable<StockQuoteDto> {
    return this.marketService.getStockQuote(ticker).pipe(
      tap((quote) => {
        this.quotes.update((current) => ({
          ...current,
          [quote.ticker]: quote,
        }));
      })
    );
  }

  removeStockTransaction(transactionId: string): Observable<void> {
    this.isLoading.set(true);
    return this.transactionService.deleteTransaction(transactionId).pipe(
      tap(() => {
        this.transactions.update((list) => list.filter((t) => t.id !== transactionId));
        this.lastSyncAt.set(new Date());
      }),
      catchError(() => {
        this.transactions.update((list) => list.filter((t) => t.id !== transactionId));
        return of(void 0);
      }),
      map(() => void 0),
      finalize(() => this.isLoading.set(false))
    );
  }

  removeFixedIncomePosition(positionId: string): Observable<void> {
    this.isLoading.set(true);
    return this.fixedIncomeService.deletePosition(positionId).pipe(
      tap(() => {
        this.fixedIncomePositions.update((list) => list.filter((p) => p.id !== positionId));
        this.lastSyncAt.set(new Date());
      }),
      catchError(() => {
        this.fixedIncomePositions.update((list) => list.filter((p) => p.id !== positionId));
        return of(void 0);
      }),
      map(() => void 0),
      finalize(() => this.isLoading.set(false))
    );
  }
}
