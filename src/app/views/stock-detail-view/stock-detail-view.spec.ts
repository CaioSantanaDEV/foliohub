import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { of } from 'rxjs';
import { StockDetailView } from './stock-detail-view';
import { StockMarketService } from '../../services/stock-market.service';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { StockQuoteDto } from '../../models/folio.models';

describe('StockDetailView - Fundamental Analysis Equations & Precision', () => {
  const sampleWegeQuote: StockQuoteDto = {
    ticker: 'WEGE3',
    companyName: 'WEG S.A. ON',
    sector: 'Bens Industriais / Motores e Compressores',
    regularMarketPrice: 52.80,
    regularMarketChangePercent: 0.95,
    regularMarketDayLow: 52.10,
    regularMarketDayHigh: 53.20,
    earningsPerShare: 1.495,
    bookValuePerShare: 4.7499,
    // P/L = 52.80 / 1.495 = 35.32
    priceEarnings: 35.32,
    // P/VP = 52.80 / 4.7499 = 11.12
    priceToBook: 11.12,
    // DY = (0.82 / 52.80) * 100 = 1.55%
    dividendYield: 1.55,
    // ROE = (6.275B / 19.937B) * 100 = 31.47%
    returnOnEquity: 31.47,
    // Margem Líquida = (6.275B / 38.250B) * 100 = 16.41%
    netMargin: 16.41,
    // Margem EBIT = (7.650B / 38.250B) * 100 = 20.00%
    ebitMargin: 20.00,
    // Dívida Líq. / EBIT = -2.355B / 7.650B = -0.31 (Caixa Líquido)
    netDebtToEbit: -0.31,
    ebit12m: 7650000000,
    ebitFormatted: 'R$ 7,65 Bi',
    roic: 29.80,
    // Graham = sqrt(22.5 * 1.495 * 4.7499) = 12.64
    grahamFairPrice: 12.64,
    volume24h: 'R$ 410,00 Mi',
    marketCap: 'R$ 221,62 Bi',
    cachedAt: '2026-10-28T12:00:00Z',
  };

  beforeEach(async () => {
    registerLocaleData(localePt, 'pt-BR');

    const marketServiceStub = {
      getStockQuote: () => of(sampleWegeQuote),
      getMacroIndicators: () =>
        of({ selic: 10.75, cdi: 10.5, ipca12m: 4.12, dolar: 5.48, updatedAt: '2026-10-28' }),
    };

    const portfolioStateStub = {
      stockPositions: () => [],
      addStockTransaction: () => of({}),
    };

    await TestBed.configureTestingModule({
      imports: [StockDetailView],
      providers: [
        provideRouter([]),
        { provide: StockMarketService, useValue: marketServiceStub },
        { provide: PortfolioStateService, useValue: portfolioStateStub },
      ],
    }).compileComponents();
  });

  it('should render real calculated fundamental indicators with neutral styling, ROIC, EBIT Margin and Net Debt / EBIT', () => {
    const fixture = TestBed.createComponent(StockDetailView);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const stock = component.currentStock();

    expect(stock).toBeTruthy();
    expect(stock?.ticker).toBe('WEGE3');
    expect(stock?.priceEarnings).toBe(35.32);
    expect(stock?.priceToBook).toBe(11.12);
    expect(stock?.returnOnEquity).toBe(31.47);
    expect(stock?.netMargin).toBe(16.41);
    expect(stock?.ebitMargin).toBe(20.00);
    expect(stock?.netDebtToEbit).toBe(-0.31);
    expect(stock?.ebitFormatted).toBe('R$ 7,65 Bi');
    expect(stock?.roic).toBe(29.80);
    expect(stock?.grahamFairPrice).toBe(12.64);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('35,32');
    expect(compiled.textContent).toContain('11,12');
    expect(compiled.textContent).toContain('31,47%');
    expect(compiled.textContent).toContain('16,41%');
    expect(compiled.textContent).toContain('20,00%');
    expect(compiled.textContent).toContain('-0,31');
    expect(compiled.textContent).toContain('R$ 7,65 Bi');
    expect(compiled.textContent).toContain('29,80%');
    expect(compiled.textContent).toContain('Caixa Líquido');

    // Asserts that subjective opinion badges and 3-dot legend are NOT rendered
    expect(compiled.textContent).not.toContain('Favorável');
    expect(compiled.textContent).not.toContain('Atenção');
    expect(compiled.textContent).not.toContain('Atrativo');
    expect(compiled.textContent).not.toContain('Ágio Elevado');
    expect(compiled.textContent).not.toContain('EBITDA');
  });
});
