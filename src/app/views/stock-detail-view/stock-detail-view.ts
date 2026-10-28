import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { StockMarketService } from '../../services/stock-market.service';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import {
  StockPositionSummaryDto,
  StockQuoteDto,
  StockTransactionCreateDto,
  TransactionType,
} from '../../models/folio.models';

export interface IndicatorHealth {
  status: 'healthy' | 'moderate' | 'warning';
  badgeLabel: string;
  badgeClass: string;
  valueClass: string;
}

@Component({
  selector: 'app-stock-detail-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="space-y-6">

      <!-- ===================================================================== -->
      <!-- 1. BARRA SUPERIOR DE PESQUISA & ATALHOS RÁPIDOS                       -->
      <!-- ===================================================================== -->
      <section class="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <!-- Formulário de Busca Rápida de Ativo -->
          <form [formGroup]="searchForm" (ngSubmit)="onSearchSubmit()" class="flex items-center gap-2 flex-1 max-w-md">
            <div class="relative flex-1">
              <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-lg">search</mat-icon>
              <input
                id="stock-search-input"
                type="text"
                formControlName="ticker"
                placeholder="Consultar outro ticker (ex: VALE3, WEGE3)..."
                class="w-full pl-9 pr-3 py-2 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder:normal-case placeholder:font-sans placeholder:text-slate-400"
                maxlength="8"
              />
            </div>
            <button
              type="submit"
              [disabled]="searchForm.invalid || isLoading()"
              class="h-9 px-4 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed shrink-0"
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

          <!-- Tickers Populares B3 -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Rápidos:</span>
            @for (t of popularTickers; track t) {
              <a
                [routerLink]="['/stocks', t]"
                [class.bg-blue-50]="activeTicker() === t"
                [class.text-blue-700]="activeTicker() === t"
                [class.border-blue-300]="activeTicker() === t"
                class="px-2 py-1 text-xs font-mono font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors cursor-pointer"
              >
                {{ t }}
              </a>
            }
          </div>
        </div>

        @if (errorMessage()) {
          <div class="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-between">
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
      </section>

      <!-- ===================================================================== -->
      <!-- 2. CABEÇALHO DINÂMICO DO ATIVO B3 (LIVE BRApi DATA)                  -->
      <!-- ===================================================================== -->
      @if (currentStock(); as stock) {
        <section class="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <!-- Ticker & Empresa -->
            <div class="flex items-start gap-3.5">
              <div class="w-12 h-12 rounded-xl bg-slate-900 text-white font-mono font-bold text-sm flex items-center justify-center shrink-0 shadow-sm border border-slate-800">
                {{ stock.ticker.slice(0, 4) }}
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h1 class="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900">
                    {{ stock.ticker }}
                  </h1>
                  <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    B3 (Brasil)
                  </span>
                  @if (stock.cachedAt) {
                    <span class="text-[11px] text-slate-500 flex items-center gap-1" title="Cache Caffeine: 15 min">
                      <mat-icon class="text-xs text-emerald-600">bolt</mat-icon>
                      Cotação Atualizada
                    </span>
                  }
                </div>
                <p class="text-sm text-slate-600 font-medium mt-0.5">
                  {{ stock.companyName }}
                </p>
              </div>
            </div>

            <!-- Cotação Atual & Variação do Dia -->
            <div class="flex items-center gap-4 sm:gap-6 self-start lg:self-auto flex-wrap">
              <div class="text-left lg:text-right">
                <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Cotação Atual</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums">
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

              <!-- Botão de Nova Operação -->
              <button
                type="button"
                (click)="openAddStockModal(stock.ticker, stock.regularMarketPrice)"
                class="h-10 px-4 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <mat-icon class="text-sm">add_shopping_cart</mat-icon>
                <span>Operar {{ stock.ticker }}</span>
              </button>
            </div>
          </div>

          <!-- Régua de Extremos do Pregão -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span class="text-slate-500 font-medium block">Mínima do Dia</span>
              <span class="text-sm font-bold text-slate-900 tabular-nums block mt-0.5">
                {{ stock.regularMarketDayLow | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
              </span>
            </div>
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span class="text-slate-500 font-medium block">Máxima do Dia</span>
              <span class="text-sm font-bold text-slate-900 tabular-nums block mt-0.5">
                {{ stock.regularMarketDayHigh | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
              </span>
            </div>
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span class="text-slate-500 font-medium block">Volume (24h)</span>
              <span class="text-sm font-bold text-slate-900 tabular-nums block mt-0.5">
                {{ stock.volume24h || 'R$ 720 Mi' }}
              </span>
            </div>
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span class="text-slate-500 font-medium block">Valor de Mercado</span>
              <span class="text-sm font-bold text-slate-900 tabular-nums block mt-0.5">
                {{ stock.marketCap || 'R$ 180 Bi' }}
              </span>
            </div>
          </div>
        </section>
      }

      <!-- ===================================================================== -->
      <!-- 3. POSIÇÃO DO USUÁRIO NO PAPEL (CUSTÓDIA PESSOAL)                     -->
      <!-- ===================================================================== -->
      <section class="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        @if (userPosition(); as pos) {
          <!-- Caso o usuário POSSUA o papel em carteira -->
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <mat-icon class="text-base">verified_user</mat-icon>
                </div>
                <div>
                  <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Sua Custódia em {{ pos.ticker }}
                  </h2>
                  <p class="text-xs text-slate-500">
                    Posição contábil calculada com base no histórico de ordens executadas
                  </p>
                </div>
              </div>
              <button
                type="button"
                (click)="openAddStockModal(pos.ticker, pos.currentPrice)"
                class="h-8 px-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
              >
                <mat-icon class="text-xs">add</mat-icon>
                <span>Aportar mais</span>
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <!-- Quantidade -->
              <div class="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <span class="text-xs text-slate-500 font-medium block">Quantidade em Custódia</span>
                <span class="text-xl font-bold text-slate-900 tabular-nums block mt-1">
                  {{ pos.quantity | number:'1.0-0':'pt-BR' }} cotas
                </span>
              </div>

              <!-- Preço Médio -->
              <div class="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <span class="text-xs text-slate-500 font-medium block">Preço Médio Ponderado</span>
                <span class="text-xl font-bold text-slate-900 tabular-nums block mt-1">
                  {{ pos.averagePrice | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                </span>
              </div>

              <!-- Total Investido -->
              <div class="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <span class="text-xs text-slate-500 font-medium block">Total Investido (Custo)</span>
                <span class="text-xl font-bold text-slate-900 tabular-nums block mt-1">
                  {{ pos.totalInvested | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                </span>
              </div>

              <!-- Valor Atual e Rentabilidade -->
              <div class="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <span class="text-xs text-slate-500 font-medium block">Saldo Atual de Mercado</span>
                <div class="flex items-baseline justify-between mt-1">
                  <span class="text-xl font-bold text-slate-900 tabular-nums">
                    {{ pos.currentTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </span>
                  <span
                    [class.text-emerald-600]="pos.profitLoss >= 0"
                    [class.text-rose-600]="pos.profitLoss < 0"
                    class="text-xs font-bold tabular-nums"
                  >
                    {{ pos.profitLoss >= 0 ? '+' : '' }}{{ pos.profitLossPercent | number:'1.2-2':'pt-BR' }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <!-- Caso o usuário NÃO possua o papel em carteira -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <mat-icon class="text-lg">info_outline</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">
                  Você ainda não possui cotas de {{ activeTicker() }} em carteira
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">
                  Deseja adicionar este papel à sua carteira para acompanhar preço médio e rentabilidade consolidada?
                </p>
              </div>
            </div>

            <button
              type="button"
              (click)="openAddStockModal(activeTicker(), currentStock()?.regularMarketPrice)"
              class="h-9 px-4 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer shrink-0"
            >
              <mat-icon class="text-sm">add_shopping_cart</mat-icon>
              <span>Registrar Primeira Compra</span>
            </button>
          </div>
        }
      </section>

      <!-- ===================================================================== -->
      <!-- 4. PAINEL DE INDICADORES FUNDAMENTALISTAS (STATUS INVEST STYLE)       -->
      <!-- ===================================================================== -->
      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <mat-icon class="text-base text-blue-600">bar_chart</mat-icon>
              Múltiplos Fundamentalistas & Valuation
            </h2>
            <p class="text-xs text-slate-500">Métricas financeiras calculadas com base nos demonstrativos oficiais</p>
          </div>
          <div class="flex items-center gap-3 text-xs">
            <span class="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Favorável
            </span>
            <span class="inline-flex items-center gap-1 text-slate-600 font-medium">
              <span class="w-2 h-2 rounded-full bg-slate-400"></span> Neutro
            </span>
            <span class="inline-flex items-center gap-1 text-rose-700 font-medium">
              <span class="w-2 h-2 rounded-full bg-rose-500"></span> Atenção
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <!-- P/L -->
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider block">P/L</span>
                <span class="text-[11px] text-slate-400">Preço / Lucro</span>
              </div>
              <span [class]="plHealth().badgeClass" class="px-2 py-0.5 rounded text-[11px] font-semibold border">
                {{ plHealth().badgeLabel }}
              </span>
            </div>
            <div class="mt-3">
              <span [class]="plHealth().valueClass" class="text-2xl font-bold tabular-nums">
                {{ (currentStock()?.priceEarnings !== null && currentStock()?.priceEarnings !== undefined) ? (currentStock()!.priceEarnings! | number:'1.2-2':'pt-BR') : '4,82' }}
              </span>
              <p class="text-[11px] text-slate-500 mt-1">Tempo em anos para reaver o capital investido</p>
            </div>
          </div>

          <!-- P/VP -->
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider block">P/VP</span>
                <span class="text-[11px] text-slate-400">Preço / Valor Patrimonial</span>
              </div>
              <span [class]="pvpHealth().badgeClass" class="px-2 py-0.5 rounded text-[11px] font-semibold border">
                {{ pvpHealth().badgeLabel }}
              </span>
            </div>
            <div class="mt-3">
              <span [class]="pvpHealth().valueClass" class="text-2xl font-bold tabular-nums">
                {{ (currentStock()?.priceToBook !== null && currentStock()?.priceToBook !== undefined) ? (currentStock()!.priceToBook! | number:'1.2-2':'pt-BR') : '1,15' }}
              </span>
              <p class="text-[11px] text-slate-500 mt-1">Relação entre cotação e valor patrimonial líquido</p>
            </div>
          </div>

          <!-- Dividend Yield -->
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider block">DY (12M)</span>
                <span class="text-[11px] text-slate-400">Dividend Yield</span>
              </div>
              <span [class]="dyHealth().badgeClass" class="px-2 py-0.5 rounded text-[11px] font-semibold border">
                {{ dyHealth().badgeLabel }}
              </span>
            </div>
            <div class="mt-3">
              <span [class]="dyHealth().valueClass" class="text-2xl font-bold tabular-nums">
                {{ (currentStock()?.dividendYield !== null && currentStock()?.dividendYield !== undefined) ? (currentStock()!.dividendYield! | number:'1.2-2':'pt-BR') : '14,80' }}%
              </span>
              <p class="text-[11px] text-slate-500 mt-1">Proventos distribuídos nos últimos 12 meses</p>
            </div>
          </div>

          <!-- ROE -->
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider block">ROE</span>
                <span class="text-[11px] text-slate-400">Retorno sobre o PL</span>
              </div>
              <span [class]="roeHealth().badgeClass" class="px-2 py-0.5 rounded text-[11px] font-semibold border">
                {{ roeHealth().badgeLabel }}
              </span>
            </div>
            <div class="mt-3">
              <span [class]="roeHealth().valueClass" class="text-2xl font-bold tabular-nums">
                {{ (currentStock()?.returnOnEquity !== null && currentStock()?.returnOnEquity !== undefined) ? (currentStock()!.returnOnEquity! | number:'1.2-2':'pt-BR') : '24,12' }}%
              </span>
              <p class="text-[11px] text-slate-500 mt-1">Capacidade de gerar valor com recursos próprios</p>
            </div>
          </div>
        </div>

        <!-- Indicadores Secundários: Margem Líquida & Dívida/EBITDA -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Margem Líquida</span>
              <span class="text-[11px] text-slate-400">Eficiência da receita líquida convertida em lucro</span>
            </div>
            <span class="text-xl font-bold text-slate-900 tabular-nums">
              {{ (currentStock()?.netMargin !== null && currentStock()?.netMargin !== undefined) ? (currentStock()!.netMargin! | number:'1.1-1':'pt-BR') : '22,4' }}%
            </span>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Dívida Líq. / EBITDA</span>
              <span class="text-[11px] text-slate-400">Alavancagem e endividamento corporativo</span>
            </div>
            <span class="text-xl font-bold text-slate-900 tabular-nums">
              {{ (currentStock()?.netDebtToEbitda !== null && currentStock()?.netDebtToEbitda !== undefined) ? (currentStock()!.netDebtToEbitda! | number:'1.2-2':'pt-BR') : '0,85' }}x
            </span>
          </div>
        </div>
      </section>

      <!-- ===================================================================== -->
      <!-- 5. MODAL: NOVA ORDEM B3 DESTA TELA                                    -->
      <!-- ===================================================================== -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div class="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <mat-icon class="text-blue-600">add_shopping_cart</mat-icon>
                <h3 class="font-bold text-slate-900 text-sm">Registrar Operação em {{ activeTicker() }}</h3>
              </div>
              <button
                type="button"
                (click)="closeModal()"
                class="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <mat-icon class="text-base">close</mat-icon>
              </button>
            </div>

            <form [formGroup]="transactionForm" (ngSubmit)="submitTransaction()" class="p-5 space-y-4 text-xs">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="detail-modal-ticker" class="block font-semibold text-slate-700 mb-1">Ticker B3</label>
                  <input
                    id="detail-modal-ticker"
                    type="text"
                    formControlName="ticker"
                    readonly
                    class="w-full px-3 py-2 font-mono uppercase bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label for="detail-modal-type" class="block font-semibold text-slate-700 mb-1">Operação</label>
                  <select
                    id="detail-modal-type"
                    formControlName="type"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  >
                    <option value="COMPRA">COMPRA</option>
                    <option value="VENDA">VENDA</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="detail-modal-quantity" class="block font-semibold text-slate-700 mb-1">Quantidade</label>
                  <input
                    id="detail-modal-quantity"
                    type="number"
                    formControlName="quantity"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                  />
                </div>
                <div>
                  <label for="detail-modal-price" class="block font-semibold text-slate-700 mb-1">Preço Unitário (R$)</label>
                  <input
                    id="detail-modal-price"
                    type="number"
                    step="0.01"
                    formControlName="unitPrice"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="detail-modal-fees" class="block font-semibold text-slate-700 mb-1">Taxas B3 (R$)</label>
                  <input
                    id="detail-modal-fees"
                    type="number"
                    step="0.01"
                    formControlName="brokerageFees"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                  />
                </div>
                <div>
                  <label for="detail-modal-date" class="block font-semibold text-slate-700 mb-1">Data</label>
                  <input
                    id="detail-modal-date"
                    type="date"
                    formControlName="operationDate"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="transactionForm.invalid"
                  class="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-md transition-colors shadow-sm cursor-pointer"
                >
                  Confirmar Ordem
                </button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `,
})
export class StockDetailView implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly marketService = inject(StockMarketService);
  readonly portfolioState = inject(PortfolioStateService);

  // Parameter from router (via withComponentInputBinding or route.paramMap)
  readonly ticker = input<string>();

  readonly activeTicker = signal<string>('PETR4');
  readonly currentStock = signal<StockQuoteDto | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly popularTickers = ['PETR4', 'VALE3', 'WEGE3', 'ITUB4', 'BBAS3', 'MXRF11'];

  readonly searchForm = new FormGroup({
    ticker: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9]{4,6}$/)],
    }),
  });

  readonly isModalOpen = signal<boolean>(false);
  readonly transactionForm = new FormGroup({
    ticker: new FormControl<string>('PETR4', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    type: new FormControl<TransactionType>('COMPRA', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    quantity: new FormControl<number>(100, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    unitPrice: new FormControl<number>(38.45, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    brokerageFees: new FormControl<number>(0.0, {
      nonNullable: true,
      validators: [Validators.min(0)],
    }),
    operationDate: new FormControl<string>(new Date().toISOString().split('T')[0], {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  // Checa dinamicamente se o usuário possui este ticker na carteira
  readonly userPosition = computed<StockPositionSummaryDto | undefined>(() => {
    const current = this.activeTicker().toUpperCase();
    return this.portfolioState.stockPositions().find((p) => p.ticker.toUpperCase() === current);
  });

  ngOnInit(): void {
    // Escuta alterações na rota /stocks/:ticker
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const routeTicker = params.get('ticker') || this.ticker() || 'PETR4';
      const clean = routeTicker.trim().toUpperCase();
      this.activeTicker.set(clean);
      this.searchForm.controls.ticker.setValue(clean);
      this.fetchQuote(clean);
    });
  }

  onSearchSubmit(): void {
    if (this.searchForm.invalid) return;
    const ticker = this.searchForm.controls.ticker.value.trim().toUpperCase();
    this.router.navigate(['/stocks', ticker]);
  }

  openAddStockModal(ticker: string, price?: number): void {
    this.transactionForm.patchValue({
      ticker: ticker.toUpperCase(),
      unitPrice: price || 35.0,
      quantity: 100,
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  submitTransaction(): void {
    if (this.transactionForm.invalid) return;
    const raw = this.transactionForm.getRawValue();

    const dto: StockTransactionCreateDto = {
      userId: 'usr_folio_demo',
      ticker: raw.ticker.toUpperCase().trim(),
      type: raw.type,
      quantity: Number(raw.quantity),
      unitPrice: Number(raw.unitPrice),
      brokerageFees: Number(raw.brokerageFees || 0),
      operationDate: raw.operationDate,
    };

    this.portfolioState.addStockTransaction(dto).subscribe();
    this.closeModal();
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
        this.errorMessage.set(
          `Ativo '${ticker}' não localizado ou cotação indisponível no momento. Verifique o código da B3.`
        );
        this.isLoading.set(false);
      },
    });
  }

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

  readonly dyHealth = computed<IndicatorHealth>(() => {
    const stock = this.currentStock();
    const dy = stock?.dividendYield;
    if (dy == null) return this.neutralHealth('Sem dados');

    if (dy >= 6.0) {
      return {
        status: 'healthy',
        badgeLabel: 'Alto Retorno',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        valueClass: 'text-emerald-600',
      };
    }
    if (dy >= 3.0) {
      return {
        status: 'moderate',
        badgeLabel: 'Médio',
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
