import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { StockMarketService } from '../../services/stock-market.service';
import { StockQuoteDto } from '../../models/folio.models';

export interface IndicatorHealth {
  status: 'healthy' | 'moderate' | 'warning';
  badgeLabel: string;
  badgeClass: string;
  valueClass: string;
}

@Component({
  selector: 'app-stock-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-5">
      <!-- Barra Superior: Pesquisa de Ativo & Tickers Rápidos -->
      <div class="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <form [formGroup]="searchForm" (ngSubmit)="onSearchSubmit()" class="flex items-center gap-2 flex-1 max-w-md">
            <div class="relative flex-1">
              <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-lg">search</mat-icon>
              <input
                id="stock-search-input"
                type="text"
                formControlName="ticker"
                placeholder="Buscar código B3 (ex: PETR4, VALE3, WEGE3)..."
                class="w-full pl-9 pr-3 py-2 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder:normal-case placeholder:font-sans placeholder:text-slate-400"
                maxlength="8"
              />
            </div>
            <button
              type="submit"
              [disabled]="searchForm.invalid || isLoading()"
              class="h-9 px-4 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-md transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              @if (isLoading()) {
                <mat-icon class="text-sm animate-spin">refresh</mat-icon>
                <span>Buscando...</span>
              } @else {
                <mat-icon class="text-sm">analytics</mat-icon>
                <span>Analisar</span>
              }
            </button>
          </form>

          <!-- Tickers mais negociados / Acesso rápido -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Populares:</span>
            @for (t of quickTickers; track t) {
              <button
                type="button"
                (click)="selectQuickTicker(t)"
                [class.bg-blue-50]="selectedTicker() === t"
                [class.text-blue-700]="selectedTicker() === t"
                [class.border-blue-300]="selectedTicker() === t"
                class="px-2 py-1 text-xs font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors cursor-pointer"
              >
                {{ t }}
              </button>
            }
          </div>
        </div>

        @if (errorMessage()) {
          <div class="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <mat-icon class="text-rose-600 text-sm">error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>
            <button
              type="button"
              (click)="errorMessage.set(null)"
              class="text-rose-600 hover:text-rose-800 text-xs font-semibold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        }
      </div>

      <!-- Hero do Ativo Selecionado -->
      @if (currentStock(); as stock) {
        <div class="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <!-- Identificação do Ticker & Empresa -->
            <div class="flex items-start gap-3.5">
              <div class="w-12 h-12 rounded-lg bg-slate-900 text-white font-mono font-bold text-sm flex items-center justify-center shrink-0 shadow-sm border border-slate-800">
                {{ stock.ticker.slice(0, 4) }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h1 class="text-2xl font-bold font-mono tracking-tight text-slate-900">{{ stock.ticker }}</h1>
                  <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    B3 (Brasil)
                  </span>
                  @if (stock.cachedAt) {
                    <span class="text-[11px] text-slate-500 flex items-center gap-1" title="Cache Caffeine: 15 min">
                      <mat-icon class="text-xs text-emerald-600">bolt</mat-icon>
                      Atualizado
                    </span>
                  }
                </div>
                <p class="text-sm text-slate-600 font-medium">{{ stock.companyName }}</p>
              </div>
            </div>

            <!-- Cotação & Variação do Dia -->
            <div class="flex items-center gap-4 sm:gap-6 self-start lg:self-auto">
              <div class="text-right">
                <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Cotação Atual</span>
                <div class="flex items-baseline justify-end gap-2">
                  <span class="text-3xl font-bold text-slate-900 tabular-nums">
                    {{ stock.regularMarketPrice | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </span>
                  <span
                    [class.bg-emerald-50]="stock.regularMarketChangePercent >= 0"
                    [class.text-emerald-700]="stock.regularMarketChangePercent >= 0"
                    [class.border-emerald-200]="stock.regularMarketChangePercent >= 0"
                    [class.bg-rose-50]="stock.regularMarketChangePercent < 0"
                    [class.text-rose-700]="stock.regularMarketChangePercent < 0"
                    [class.border-rose-200]="stock.regularMarketChangePercent < 0"
                    class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold tabular-nums border"
                  >
                    @if (stock.regularMarketChangePercent >= 0) {
                      <mat-icon class="text-xs">arrow_drop_up</mat-icon>
                      +{{ stock.regularMarketChangePercent | number:'1.2-2':'pt-BR' }}%
                    } @else {
                      <mat-icon class="text-xs">arrow_drop_down</mat-icon>
                      {{ stock.regularMarketChangePercent | number:'1.2-2':'pt-BR' }}%
                    }
                  </span>
                </div>
              </div>

              <!-- Ação de Adicionar na Carteira -->
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="onAddStockOrder(stock.ticker)"
                  class="h-9 px-3.5 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors shadow-sm cursor-pointer"
                >
                  <mat-icon class="text-sm">add_shopping_cart</mat-icon>
                  <span>Adicionar à Carteira</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Régua de Extremos do Dia & Liquidez -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
            <div class="bg-slate-50 p-2.5 rounded border border-slate-100">
              <span class="text-slate-500 font-medium block">Mínima do Dia</span>
              <span class="text-sm font-bold text-slate-900 tabular-nums text-right block">
                {{ stock.regularMarketDayLow | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
              </span>
            </div>
            <div class="bg-slate-50 p-2.5 rounded border border-slate-100">
              <span class="text-slate-500 font-medium block">Máxima do Dia</span>
              <span class="text-sm font-bold text-slate-900 tabular-nums text-right block">
                {{ stock.regularMarketDayHigh | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
              </span>
            </div>
            <div class="bg-slate-50 p-2.5 rounded border border-slate-100">
              <span class="text-slate-500 font-medium block">Volume Financeiro</span>
              <span class="text-sm font-bold text-slate-900 tabular-nums text-right block">
                {{ stock.volume24h || 'N/A' }}
              </span>
            </div>
            <div class="bg-slate-50 p-2.5 rounded border border-slate-100">
              <span class="text-slate-500 font-medium block">Valor de Mercado</span>
              <span class="text-sm font-bold text-slate-900 tabular-nums text-right block">
                {{ stock.marketCap || 'N/A' }}
              </span>
            </div>
          </div>

          <!-- Controles de Período Temporal -->
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-1">
              <span class="text-xs font-medium text-slate-500 mr-1.5">Intervalo de Análise:</span>
              <div class="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                @for (range of timeRanges; track range) {
                  <button
                    type="button"
                    (click)="selectedTimeRange.set(range)"
                    [class.bg-white]="selectedTimeRange() === range"
                    [class.text-blue-700]="selectedTimeRange() === range"
                    [class.shadow-sm]="selectedTimeRange() === range"
                    [class.font-bold]="selectedTimeRange() === range"
                    class="h-6 px-2.5 text-[11px] font-semibold text-slate-600 rounded transition-colors cursor-pointer"
                  >
                    {{ range }}
                  </button>
                }
              </div>
            </div>

            <span class="text-[11px] text-slate-500">
              Dados atualizados conforme preceitos da CVM / B3
            </span>
          </div>
        </div>

        <!-- Grade de Indicadores Fundamentalistas (Status Invest / Investidor 10) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <mat-icon class="text-base text-blue-600">bar_chart</mat-icon>
                Indicadores de Valuation & Eficiência
              </h2>
              <p class="text-xs text-slate-500">Métricas financeiras calculadas com base nos demonstrativos oficiais</p>
            </div>
            
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <!-- P/L -->
            <div class="bg-white rounded-lg border border-slate-200 p-3.5 shadow-sm flex flex-col justify-between">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-1">
                    <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">P/L</span>
                    <span class="text-[11px] text-slate-400" title="Preço sobre Lucro líquido por ação">(?)</span>
                  </div>
                  <span class="text-[11px] text-slate-500">Preço / Lucro</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200">Múltiplo</span>
              </div>

              <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl font-bold text-slate-900 tabular-nums">
                  {{ stock.priceEarnings !== null && stock.priceEarnings !== undefined ? (stock.priceEarnings | number:'1.2-2':'pt-BR') : '-' }}
                </span>
                <span class="text-[11px] text-slate-500 text-right">
                  Recuperação em ~{{ stock.priceEarnings ? (stock.priceEarnings | number:'1.0-0':'pt-BR') : '0' }} anos
                </span>
              </div>
            </div>

            <!-- P/VP -->
            <div class="bg-white rounded-lg border border-slate-200 p-3.5 shadow-sm flex flex-col justify-between">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-1">
                    <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">P/VP</span>
                    <span class="text-[11px] text-slate-400" title="Preço sobre Valor Patrimonial por Ação">(?)</span>
                  </div>
                  <span class="text-[11px] text-slate-500">Preço / Valor Patrimonial</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200">Patrimonial</span>
              </div>

              <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl font-bold text-slate-900 tabular-nums">
                  {{ stock.priceToBook !== null && stock.priceToBook !== undefined ? (stock.priceToBook | number:'1.2-2':'pt-BR') : '-' }}
                </span>
                <span class="text-[11px] text-slate-500 text-right">
                  @if ((stock.priceToBook || 0) < 1.0) {
                    Desconto s/ VPA
                  } @else {
                    Ágio patrimonial
                  }
                </span>
              </div>
            </div>

            <!-- DY (Dividend Yield) -->
            <div class="bg-white rounded-lg border border-slate-200 p-3.5 shadow-sm flex flex-col justify-between">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-1">
                    <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">DY (12M)</span>
                    <span class="text-[11px] text-slate-400" title="Proventos pagos nos últimos 12 meses divididos pela cotação">(?)</span>
                  </div>
                  <span class="text-[11px] text-slate-500">Dividend Yield</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200">Proventos</span>
              </div>

              <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl font-bold text-slate-900 tabular-nums">
                  {{ stock.dividendYield !== null && stock.dividendYield !== undefined ? (stock.dividendYield | number:'1.2-2':'pt-BR') + '%' : '-' }}
                </span>
                <span class="text-[11px] text-slate-500 text-right">
                  Proventos Anuais
                </span>
              </div>
            </div>

            <!-- ROE (Return on Equity) -->
            <div class="bg-white rounded-lg border border-slate-200 p-3.5 shadow-sm flex flex-col justify-between">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center gap-1">
                    <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">ROE</span>
                    <span class="text-[11px] text-slate-400" title="Retorno Líquido sobre o Patrimônio Líquido">(?)</span>
                  </div>
                  <span class="text-[11px] text-slate-500">Retorno s/ Patrimônio</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200">Rentabilidade</span>
              </div>

              <div class="mt-3 flex items-baseline justify-between">
                <span class="text-2xl font-bold text-slate-900 tabular-nums">
                  {{ stock.returnOnEquity !== null && stock.returnOnEquity !== undefined ? (stock.returnOnEquity | number:'1.2-2':'pt-BR') + '%' : '-' }}
                </span>
                <span class="text-[11px] text-slate-500 text-right">
                  Eficiência do PL
                </span>
              </div>
            </div>
          </div>

          <!-- Métricas Complementares: Margem Líquida & Dívida Líq./EBIT -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div class="bg-white rounded-lg border border-slate-200 p-3.5 shadow-sm flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Margem Líquida & ROIC</span>
                  <span class="text-xs text-slate-500">Lucro Líquido (12M) ÷ Receita Líquida (12M)</span>
                </div>
                <span class="text-lg font-bold text-slate-900 tabular-nums">
                  {{ stock.netMargin !== null && stock.netMargin !== undefined ? (stock.netMargin | number:'1.2-2':'pt-BR') + '%' : 'N/A' }}
                </span>
              </div>
              <div class="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>ROIC / Margem EBIT:</span>
                <strong class="font-mono text-slate-700">
                  {{ stock.roic !== null && stock.roic !== undefined ? (stock.roic | number:'1.2-2':'pt-BR') + '%' : 'Não se aplica' }}
                </strong>
              </div>
            </div>

            <div class="bg-white rounded-lg border border-slate-200 p-3.5 shadow-sm flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dívida Líquida / EBIT</span>
                  <span class="text-xs text-slate-500 block">(Dívida Bruta − Caixa) ÷ EBIT (12M)</span>
                </div>
                <span class="text-lg font-bold text-slate-900 tabular-nums">
                  {{ stock.netDebtToEbit !== null && stock.netDebtToEbit !== undefined ? (stock.netDebtToEbit | number:'1.2-2':'pt-BR') : 'Não se aplica' }}
                </span>
              </div>
              <div class="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>EBIT (12M):</span>
                <strong class="font-mono text-slate-700">{{ stock.ebitFormatted || 'Não se aplica' }}</strong>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class StockDetail implements OnInit {
  private readonly marketService = inject(StockMarketService);

  readonly initialTicker = input<string>('PETR4');
  readonly addStockRequested = output<string>();

  readonly quickTickers = ['PETR4', 'VALE3', 'WEGE3', 'ITUB4', 'BBAS3', 'MXRF11'];
  readonly timeRanges = ['1D', '5D', '1M', '6M', 'YTD', '1A', '5A', 'MÁX'];
  readonly selectedTimeRange = signal<string>('YTD');

  readonly selectedTicker = signal<string>('PETR4');
  readonly currentStock = signal<StockQuoteDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly searchForm = new FormGroup({
    ticker: new FormControl<string>('PETR4', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9]{4,6}$/)],
    }),
  });

  ngOnInit(): void {
    const init = this.initialTicker() || 'PETR4';
    this.selectedTicker.set(init);
    this.searchForm.controls.ticker.setValue(init);
    this.fetchQuote(init);
  }

  onSearchSubmit(): void {
    if (this.searchForm.invalid) return;
    const ticker = this.searchForm.controls.ticker.value.trim().toUpperCase();
    this.selectedTicker.set(ticker);
    this.fetchQuote(ticker);
  }

  selectQuickTicker(ticker: string): void {
    this.selectedTicker.set(ticker);
    this.searchForm.controls.ticker.setValue(ticker);
    this.fetchQuote(ticker);
  }

  onAddStockOrder(ticker: string): void {
    this.addStockRequested.emit(ticker);
  }

  private fetchQuote(ticker: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.marketService.getStockQuote(ticker).subscribe({
      next: (quote) => {
        this.currentStock.set(quote);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set(`Não foi possível carregar os dados para ${ticker}. Verifique o código da B3.`);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Avaliação de saúde do P/L com base em padrões de análise fundamentalista:
   * 0 < P/L <= 15: Saudável / Descontado
   * 15 < P/L <= 25: Moderado / Equilibrado
   * P/L > 25 ou P/L <= 0: Atenção
   */
  readonly plHealth = computed<IndicatorHealth>(() => {
    const stock = this.currentStock();
    const pl = stock?.priceEarnings;
    if (pl == null) return this.neutralHealth('Sem dados');

    if (pl > 0 && pl <= 15) {
      return {
        status: 'healthy',
        badgeLabel: 'Atrativo',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        valueClass: 'text-emerald-600',
      };
    }
    if (pl > 15 && pl <= 25) {
      return {
        status: 'moderate',
        badgeLabel: 'Neutro',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        valueClass: 'text-slate-800',
      };
    }
    return {
      status: 'warning',
      badgeLabel: pl <= 0 ? 'Prejuízo' : 'Múltiplo Alto',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      valueClass: 'text-rose-600',
    };
  });

  /**
   * Avaliação de saúde do P/VP:
   * 0 < P/VP <= 1.5: Saudável
   * 1.5 < P/VP <= 2.5: Moderado
   * > 2.5: Atenção (elevado prêmio de valor)
   */
  readonly pvpHealth = computed<IndicatorHealth>(() => {
    const stock = this.currentStock();
    const pvp = stock?.priceToBook;
    if (pvp == null) return this.neutralHealth('Sem dados');

    if (pvp > 0 && pvp <= 1.5) {
      return {
        status: 'healthy',
        badgeLabel: pvp < 1 ? 'Subavaliado' : 'Equilibrado',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        valueClass: 'text-emerald-600',
      };
    }
    if (pvp > 1.5 && pvp <= 2.5) {
      return {
        status: 'moderate',
        badgeLabel: 'Ágio Moderado',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        valueClass: 'text-slate-800',
      };
    }
    return {
      status: 'warning',
      badgeLabel: 'Ágio Elevado',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      valueClass: 'text-rose-600',
    };
  });

  /**
   * Avaliação do Dividend Yield (12M):
   * >= 6.0%: Excelente pagador (supera inflação histórica e benchmark de proventos)
   * 3.0% a 6.0%: Moderado
   * < 3.0%: Baixo provento
   */
  readonly dyHealth = computed<IndicatorHealth>(() => {
    const stock = this.currentStock();
    const dy = stock?.dividendYield;
    if (dy == null) return this.neutralHealth('Sem dados');

    if (dy >= 6.0) {
      return {
        status: 'healthy',
        badgeLabel: 'Alto Rendimento',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        valueClass: 'text-emerald-600',
      };
    }
    if (dy >= 3.0) {
      return {
        status: 'moderate',
        badgeLabel: 'Rendimento Médio',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        valueClass: 'text-slate-800',
      };
    }
    return {
      status: 'warning',
      badgeLabel: 'Baixo Yield',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      valueClass: 'text-rose-600',
    };
  });

  /**
   * Avaliação do ROE (Retorno sobre Patrimônio Líquido):
   * >= 15.0%: Alta eficiência de capital
   * 8.0% a 15.0%: Mediana de mercado
   * < 8.0%: Baixa eficiência
   */
  readonly roeHealth = computed<IndicatorHealth>(() => {
    const stock = this.currentStock();
    const roe = stock?.returnOnEquity;
    if (roe == null) return this.neutralHealth('Sem dados');

    if (roe >= 15.0) {
      return {
        status: 'healthy',
        badgeLabel: 'Excelente ROE',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        valueClass: 'text-emerald-600',
      };
    }
    if (roe >= 8.0) {
      return {
        status: 'moderate',
        badgeLabel: 'Médio',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        valueClass: 'text-slate-800',
      };
    }
    return {
      status: 'warning',
      badgeLabel: 'Baixo Retorno',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      valueClass: 'text-rose-600',
    };
  });

  private neutralHealth(label: string): IndicatorHealth {
    return {
      status: 'moderate',
      badgeLabel: label,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      valueClass: 'text-slate-800',
    };
  }
}

export { StockDetail as StockDetailComponent };
