import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { StockMarketService } from '../../services/stock-market.service';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import { MacroIndicatorsDto } from '../../models/folio.models';

interface MarketFeaturedStock {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  pl: number;
  pvp?: number;
  dy: number;
  volume: string;
}

@Component({
  selector: 'app-market-hub',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- ===================================================================== -->
      <!-- 1. BARRA DE BUSCA GLOBAL DE ATIVOS B3                                 -->
      <!-- ===================================================================== -->
      <section class="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div class="max-w-3xl mx-auto text-center space-y-4">
          <div>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <mat-icon class="text-xs">bolt</mat-icon>
              Mercado em Tempo Real & Cotações B3
            </span>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2">
              Análise e Inteligência Patrimonial B3
            </h1>
            <p class="text-sm text-slate-500 mt-1">
              Consulte cotações dinâmicas da Brapi, indicadores fundamentalistas de valuation e consolide sua carteira.
            </p>
          </div>

          <!-- Input de Busca Global -->
          <form [formGroup]="searchForm" (ngSubmit)="onSearchSubmit()" class="relative flex items-center gap-2 max-w-xl mx-auto">
            <div class="relative flex-1">
              <mat-icon class="absolute left-3.5 top-3 text-slate-400 text-lg">search</mat-icon>
              <input
                id="global-search-input"
                type="text"
                formControlName="ticker"
                placeholder="Digite o código B3 (ex: PETR4, VALE3, WEGE3, MXRF11) e tecle Enter..."
                class="w-full pl-10 pr-4 py-2.5 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 transition-all shadow-inner"
                maxlength="8"
              />
            </div>
            <button
              type="submit"
              [disabled]="searchForm.invalid"
              class="h-10 px-5 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <mat-icon class="text-sm">arrow_forward</mat-icon>
              <span>Consultar</span>
            </button>
          </form>

          <!-- Tickers Rápidos Populares -->
          <div class="flex items-center justify-center gap-2 flex-wrap text-xs pt-1">
            <span class="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Destaques da B3:</span>
            @for (ticker of popularTickers; track ticker) {
              <button
                type="button"
                (click)="navigateToStock(ticker)"
                class="px-2.5 py-1 text-xs font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
              >
                {{ ticker }}
              </button>
            }
          </div>
        </div>
      </section>

      <!-- ===================================================================== -->
      <!-- 2. RESUMO DE MERCADO & BENCHMARKS MACROECONÔMICOS                     -->
      <!-- ===================================================================== -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Indicadores Macroeconômicos & Benchmarks
            </h2>
          </div>
          <span class="text-xs text-slate-500">
            Fonte: Banco Central do Brasil & B3
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <!-- Ibovespa -->
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-slate-500">
              <span class="text-[11px] font-semibold uppercase tracking-wider">IBOVESPA</span>
              <mat-icon class="text-slate-400 text-base">show_chart</mat-icon>
            </div>
            <div class="mt-2">
              <span class="text-xl font-bold text-slate-900 tabular-nums">128.450</span>
              <div class="flex items-center gap-1 mt-0.5 text-xs font-semibold text-emerald-600 tabular-nums">
                <mat-icon class="text-xs">arrow_drop_up</mat-icon>
                <span>+0,48% hoje</span>
              </div>
            </div>
          </div>

          <!-- CDI -->
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-slate-500">
              <span class="text-[11px] font-semibold uppercase tracking-wider">CDI</span>
              <mat-icon class="text-slate-400 text-base">account_balance</mat-icon>
            </div>
            <div class="mt-2">
              <span class="text-xl font-bold text-slate-900 tabular-nums">
                {{ macroData()?.cdi ? (macroData()!.cdi | number:'1.2-2':'pt-BR') : '10,50' }}%
              </span>
              <div class="text-xs text-slate-500 mt-0.5">Taxa DI anual</div>
            </div>
          </div>

          <!-- Selic -->
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-slate-500">
              <span class="text-[11px] font-semibold uppercase tracking-wider">SELIC META</span>
              <mat-icon class="text-slate-400 text-base">percent</mat-icon>
            </div>
            <div class="mt-2">
              <span class="text-xl font-bold text-slate-900 tabular-nums">
                {{ macroData()?.selic ? (macroData()!.selic | number:'1.2-2':'pt-BR') : '10,75' }}%
              </span>
              <div class="text-xs text-slate-500 mt-0.5">Copom vigente</div>
            </div>
          </div>

          <!-- IPCA 12M -->
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-slate-500">
              <span class="text-[11px] font-semibold uppercase tracking-wider">IPCA 12M</span>
              <mat-icon class="text-slate-400 text-base">price_change</mat-icon>
            </div>
            <div class="mt-2">
              <span class="text-xl font-bold text-slate-900 tabular-nums">
                {{ macroData()?.ipca12m ? (macroData()!.ipca12m | number:'1.2-2':'pt-BR') : '4,12' }}%
              </span>
              <div class="text-xs text-slate-500 mt-0.5">Inflação acumulada</div>
            </div>
          </div>

          <!-- Dólar PTAX -->
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
            <div class="flex items-center justify-between text-slate-500">
              <span class="text-[11px] font-semibold uppercase tracking-wider">DÓLAR COMERCIAL</span>
              <mat-icon class="text-slate-400 text-base">attach_money</mat-icon>
            </div>
            <div class="mt-2">
              <span class="text-xl font-bold text-slate-900 tabular-nums">
                R$ {{ macroData()?.dolar ? (macroData()!.dolar | number:'1.2-2':'pt-BR') : '5,48' }}
              </span>
              <div class="flex items-center gap-1 mt-0.5 text-xs font-semibold text-rose-600 tabular-nums">
                <mat-icon class="text-xs">arrow_drop_down</mat-icon>
                <span>-0,22%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===================================================================== -->
      <!-- 3. ATALHOS RÁPIDOS PRINCIPAIS DO SISTEMA                              -->
      <!-- ===================================================================== -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Atalho 1: Carteira Consolidada -->
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1 text-xs font-semibold text-blue-300 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded">
                <mat-icon class="text-xs">account_balance_wallet</mat-icon>
                Custódia Pessoal
              </span>
              <span class="text-xs text-slate-400">Patrimônio Consolidado</span>
            </div>
            <h3 class="text-lg font-bold tracking-tight">Minha Carteira de Investimentos</h3>
            <p class="text-xs text-slate-300">
              Acompanhe suas ações e posições em renda fixa, com cálculo de Preço Médio Ponderado contábil e cotações da Brapi.
            </p>
          </div>

          <div class="mt-5 pt-4 border-t border-slate-700/60 flex items-center justify-between">
            <div>
              <span class="text-[11px] text-slate-400 block">Patrimônio Atual</span>
              <span class="text-xl font-bold text-white tabular-nums">
                {{ portfolioState.totalNetWorth() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
              </span>
            </div>
            <a
              routerLink="/portfolio"
              class="h-9 px-4 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <span>Acessar Carteira</span>
              <mat-icon class="text-sm">chevron_right</mat-icon>
            </a>
          </div>
        </div>

        <!-- Atalho 2: Simulador de Renda Fixa -->
        <div class="bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                <mat-icon class="text-xs">calculate</mat-icon>
                Simulação Financeira
              </span>
              <span class="text-xs text-blue-200">Tabela Regressiva</span>
            </div>
            <h3 class="text-lg font-bold tracking-tight">Simulador de Renda Fixa</h3>
            <p class="text-xs text-blue-100">
              Calcule projeções patrimoniais com aportes mensais, alíquotas de IR (22,5% a 15,0%) e isenção tributária para LCI/LCA.
            </p>
          </div>

          <div class="mt-5 pt-4 border-t border-blue-800/60 flex items-center justify-between">
            <div class="text-xs text-blue-200">
              <span>Benchmark: </span>
              <strong class="text-white">CDI 10,50% + Tabela RFB</strong>
            </div>
            <a
              routerLink="/calculator"
              class="h-9 px-4 inline-flex items-center gap-1.5 bg-white hover:bg-blue-50 text-blue-900 text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <span>Abrir Simulador</span>
              <mat-icon class="text-sm">chevron_right</mat-icon>
            </a>
          </div>
        </div>
      </section>

      <!-- ===================================================================== -->
      <!-- 4. COTAÇÕES EM DESTAQUE NA B3 (BRAZILIAN EQUITIES)                     -->
      <!-- ===================================================================== -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <mat-icon class="text-base text-blue-600">trending_up</mat-icon>
              Cotações em Destaque na B3
            </h2>
            <p class="text-xs text-slate-500">
              Clique em qualquer ação para abrir a página detalhada com múltiplos fundamentalistas
            </p>
          </div>
          <span class="text-xs text-slate-400 font-medium hidden sm:inline">
            Clique no card para analisar
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          @for (stock of featuredStocks(); track stock.ticker) {
            <a
              [routerLink]="['/stocks', stock.ticker]"
              class="bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {{ stock.ticker.slice(0, 4) }}
                    </div>
                    <div>
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold font-mono text-slate-900 group-hover:text-blue-600 transition-colors">
                          {{ stock.ticker }}
                        </span>
                        <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          B3
                        </span>
                      </div>
                      <span class="text-xs text-slate-500 truncate max-w-[160px] block font-medium">
                        {{ stock.name }}
                      </span>
                    </div>
                  </div>

                  <!-- Variação do Dia -->
                  <span
                    [class.bg-emerald-50]="stock.change >= 0"
                    [class.text-emerald-700]="stock.change >= 0"
                    [class.border-emerald-200]="stock.change >= 0"
                    [class.bg-rose-50]="stock.change < 0"
                    [class.text-rose-700]="stock.change < 0"
                    [class.border-rose-200]="stock.change < 0"
                    class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold tabular-nums border"
                  >
                    @if (stock.change >= 0) {
                      <mat-icon class="text-xs">arrow_drop_up</mat-icon>
                      +{{ stock.change | number:'1.2-2':'pt-BR' }}%
                    } @else {
                      <mat-icon class="text-xs">arrow_drop_down</mat-icon>
                      {{ stock.change | number:'1.2-2':'pt-BR' }}%
                    }
                  </span>
                </div>

                <div class="mt-3 flex items-baseline justify-between">
                  <span class="text-2xl font-bold text-slate-900 tabular-nums">
                    {{ stock.price | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </span>
                  <span class="text-[11px] text-slate-400 font-medium">
                    Vol: {{ stock.volume }}
                  </span>
                </div>
              </div>

              <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <div class="flex items-center gap-3">
                  <div>
                    <span class="text-[10px] text-slate-400 block font-semibold">P/L</span>
                    <span class="font-bold tabular-nums text-slate-800">{{ stock.pl | number:'1.2-2':'pt-BR' }}</span>
                  </div>
                  @if (stock.pvp !== undefined) {
                    <div>
                      <span class="text-[10px] text-slate-400 block font-semibold">P/VP</span>
                      <span class="font-bold tabular-nums text-slate-800">{{ stock.pvp | number:'1.2-2':'pt-BR' }}</span>
                    </div>
                  }
                  <div>
                    <span class="text-[10px] text-slate-400 block font-semibold">DY (12M)</span>
                    <span class="font-bold tabular-nums text-slate-800">{{ stock.dy | number:'1.2-2':'pt-BR' }}%</span>
                  </div>
                </div>

                <span class="text-blue-600 text-xs font-semibold inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Ver múltiplos
                  <mat-icon class="text-xs">arrow_forward</mat-icon>
                </span>
              </div>
            </a>
          }
        </div>
      </section>

    </div>
  `,
})
export class MarketHub implements OnInit {
  private readonly router = inject(Router);
  private readonly marketService = inject(StockMarketService);
  readonly portfolioState = inject(PortfolioStateService);

  readonly macroData = signal<MacroIndicatorsDto | null>(null);

  readonly popularTickers = ['PETR4', 'VALE3', 'WEGE3', 'ITUB4', 'BBAS3', 'MXRF11', 'B3SA3', 'RENT3'];

  readonly featuredStocks = signal<MarketFeaturedStock[]>([
    {
      ticker: 'PETR4',
      name: 'Petrobras PN',
      sector: 'Petróleo & Gás',
      price: 36.10,
      change: 0.85,
      pl: 4.25,
      pvp: 1.18,
      dy: 13.71,
      volume: 'R$ 1,4 Bi',
    },
    {
      ticker: 'VALE3',
      name: 'Vale S.A. ON',
      sector: 'Mineração',
      price: 54.80,
      change: -0.45,
      pl: 6.51,
      pvp: 1.24,
      dy: 8.72,
      volume: 'R$ 980,0 Mi',
    },
    {
      ticker: 'WEGE3',
      name: 'WEG S.A. ON',
      sector: 'Bens de Capital',
      price: 52.80,
      change: 0.95,
      pl: 35.44,
      pvp: 11.12,
      dy: 1.55,
      volume: 'R$ 410,0 Mi',
    },
    {
      ticker: 'ITUB4',
      name: 'Itaú Unibanco PN',
      sector: 'Financeiro',
      price: 34.50,
      change: 0.32,
      pl: 8.16,
      pvp: 1.83,
      dy: 7.59,
      volume: 'R$ 680,0 Mi',
    },
    {
      ticker: 'BBAS3',
      name: 'Banco do Brasil ON',
      sector: 'Financeiro',
      price: 27.50,
      change: 0.65,
      pl: 4.45,
      pvp: 0.87,
      dy: 9.49,
      volume: 'R$ 520,0 Mi',
    },
    {
      ticker: 'MXRF11',
      name: 'Maxi Renda FII',
      sector: 'Fundos Imobiliários',
      price: 9.85,
      change: 0.10,
      pl: 10.59,
      pvp: 1.05,
      dy: 11.98,
      volume: 'R$ 14,5 Mi',
    },
  ]);

  readonly searchForm = new FormGroup({
    ticker: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9]{4,6}$/)],
    }),
  });

  ngOnInit(): void {
    this.marketService.getMacroIndicators().subscribe({
      next: (data) => this.macroData.set(data),
      error: (err: unknown) => console.debug('Macro indicators offline, using defaults:', err),
    });

    for (const item of this.featuredStocks()) {
      this.marketService.getStockQuote(item.ticker).subscribe({
        next: (quote) => {
          this.featuredStocks.update((list) =>
            list.map((s) =>
              s.ticker === item.ticker
                ? {
                    ...s,
                    name: quote.companyName || s.name,
                    sector: quote.sector || s.sector,
                    price: quote.regularMarketPrice ?? s.price,
                    change: quote.regularMarketChangePercent ?? s.change,
                    pl: quote.priceEarnings ?? s.pl,
                    pvp: quote.priceToBook ?? s.pvp,
                    dy: quote.dividendYield ?? s.dy,
                    volume: quote.volume24h || s.volume,
                  }
                : s
            )
          );
        },
        error: (err: unknown) => console.debug(`Featured quote fallback for ${item.ticker}:`, err),
      });
    }
  }

  onSearchSubmit(): void {
    if (this.searchForm.invalid) return;
    const ticker = this.searchForm.controls.ticker.value.trim().toUpperCase();
    this.navigateToStock(ticker);
  }

  navigateToStock(ticker: string): void {
    this.router.navigate(['/stocks', ticker.trim().toUpperCase()]);
  }
}
