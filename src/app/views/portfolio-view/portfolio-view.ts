import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PortfolioStateService, roundHalfEven } from '../../services/portfolio-state.service';
import {
  FixedIncomePositionResponseDto,
  FixedIncomeType,
  IndexerType,
  StockPositionSummaryDto,
  StockTransactionCreateDto,
  TransactionType,
} from '../../models/folio.models';

@Component({
  selector: 'app-portfolio-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="space-y-6">

      <!-- ===================================================================== -->
      <!-- 1. RESUMO PATRIMONIAL CONSOLIDADO (STATUS INVEST STYLE)               -->
      <!-- ===================================================================== -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Patrimônio Total -->
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold uppercase tracking-wider">Patrimônio Consolidado</span>
            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <mat-icon class="text-base">account_balance_wallet</mat-icon>
            </div>
          </div>
          <div class="mt-3">
            <span class="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              {{ portfolioState.totalNetWorth() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
            </span>
            <div class="flex items-center justify-between mt-1.5 text-xs text-slate-500">
              <span>Capital Aplicado:</span>
              <span class="font-medium text-slate-700 tabular-nums">
                {{ portfolioState.totalCapitalInvested() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Lucro / Prejuízo Consolidado -->
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold uppercase tracking-wider">Resultado Total</span>
            <div
              [class.bg-emerald-50]="portfolioState.totalProfitLoss() >= 0"
              [class.text-emerald-600]="portfolioState.totalProfitLoss() >= 0"
              [class.bg-rose-50]="portfolioState.totalProfitLoss() < 0"
              [class.text-rose-600]="portfolioState.totalProfitLoss() < 0"
              class="w-8 h-8 rounded-lg flex items-center justify-center"
            >
              <mat-icon class="text-base">
                {{ portfolioState.totalProfitLoss() >= 0 ? 'trending_up' : 'trending_down' }}
              </mat-icon>
            </div>
          </div>
          <div class="mt-3">
            <div class="flex items-baseline justify-between gap-2">
              <span
                [class.text-emerald-600]="portfolioState.totalProfitLoss() >= 0"
                [class.text-rose-600]="portfolioState.totalProfitLoss() < 0"
                class="text-2xl sm:text-3xl font-bold tabular-nums"
              >
                {{ portfolioState.totalProfitLoss() >= 0 ? '+' : '' }}{{ portfolioState.totalProfitLoss() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
              </span>
              <span
                [class.bg-emerald-50]="portfolioState.totalProfitLossPercent() >= 0"
                [class.text-emerald-700]="portfolioState.totalProfitLossPercent() >= 0"
                [class.border-emerald-200]="portfolioState.totalProfitLossPercent() >= 0"
                [class.bg-rose-50]="portfolioState.totalProfitLossPercent() < 0"
                [class.text-rose-700]="portfolioState.totalProfitLossPercent() < 0"
                [class.border-rose-200]="portfolioState.totalProfitLossPercent() < 0"
                class="px-2 py-0.5 rounded text-xs font-semibold tabular-nums border"
              >
                {{ portfolioState.totalProfitLossPercent() >= 0 ? '+' : '' }}{{ portfolioState.totalProfitLossPercent() | number:'1.2-2':'pt-BR' }}%
              </span>
            </div>
            <div class="flex items-center justify-between mt-1.5 text-xs text-slate-500">
              <span>Rentabilidade:</span>
              <span class="font-medium text-slate-700">Preço Médio vs. Cotação Atual</span>
            </div>
          </div>
        </div>

        <!-- Custódia em Ações B3 -->
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold uppercase tracking-wider">Ações & FIIs (B3)</span>
            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <mat-icon class="text-base">show_chart</mat-icon>
            </div>
          </div>
          <div class="mt-3">
            <span class="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              {{ portfolioState.totalStocksCurrent() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
            </span>
            <div class="flex items-center justify-between mt-1.5 text-xs text-slate-500">
              <span>Participação:</span>
              <span class="font-semibold text-blue-700 tabular-nums">
                {{ portfolioState.assetAllocation().stocksPercent | number:'1.1-1':'pt-BR' }}% da carteira
              </span>
            </div>
          </div>
        </div>

        <!-- Renda Fixa -->
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold uppercase tracking-wider">Renda Fixa</span>
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <mat-icon class="text-base">assured_workload</mat-icon>
            </div>
          </div>
          <div class="mt-3">
            <span class="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              {{ portfolioState.totalFixedIncomeCurrent() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
            </span>
            <div class="flex items-center justify-between mt-1.5 text-xs text-slate-500">
              <span>Participação:</span>
              <span class="font-semibold text-emerald-700 tabular-nums">
                {{ portfolioState.assetAllocation().fixedIncomePercent | number:'1.1-1':'pt-BR' }}% da carteira
              </span>
            </div>
          </div>
        </div>

      </section>

      <!-- ===================================================================== -->
      <!-- 2. ALOCAÇÃO DE ATIVOS (BARRA PERCENTUAL VISUAL PROPORCIONAL)          -->
      <!-- ===================================================================== -->
      <section class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <mat-icon class="text-base text-blue-600">pie_chart</mat-icon>
              Alocação Estratégica de Ativos
            </h2>
            <p class="text-xs text-slate-500">Divisão percentual consolidada entre Renda Variável e Renda Fixa</p>
          </div>
          <div class="flex items-center gap-4 text-xs font-semibold">
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-blue-600"></span>
              <span class="text-slate-700">Ações ({{ portfolioState.assetAllocation().stocksPercent | number:'1.1-1':'pt-BR' }}%)</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span class="text-slate-700">Renda Fixa ({{ portfolioState.assetAllocation().fixedIncomePercent | number:'1.1-1':'pt-BR' }}%)</span>
            </div>
          </div>
        </div>

        <!-- Barra Visual Proporcional -->
        <div class="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <div
            [style.width.%]="portfolioState.assetAllocation().stocksPercent"
            class="h-full bg-blue-600 transition-all duration-500"
            title="Renda Variável"
          ></div>
          <div
            [style.width.%]="portfolioState.assetAllocation().fixedIncomePercent"
            class="h-full bg-emerald-500 transition-all duration-500"
            title="Renda Fixa"
          ></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
          <div class="flex items-center justify-between p-3 rounded-lg bg-blue-50/60 border border-blue-100">
            <div class="flex items-center gap-2">
              <mat-icon class="text-blue-600 text-sm">show_chart</mat-icon>
              <span class="font-semibold text-slate-800">Total em Renda Variável</span>
            </div>
            <span class="font-bold text-slate-900 tabular-nums">
              {{ portfolioState.totalStocksCurrent() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
            </span>
          </div>
          <div class="flex items-center justify-between p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
            <div class="flex items-center gap-2">
              <mat-icon class="text-emerald-600 text-sm">account_balance</mat-icon>
              <span class="font-semibold text-slate-800">Total em Renda Fixa</span>
            </div>
            <span class="font-bold text-slate-900 tabular-nums">
              {{ portfolioState.totalFixedIncomeCurrent() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
            </span>
          </div>
        </div>
      </section>

      <!-- ===================================================================== -->
      <!-- 3. TABELA DE AÇÕES CUSTODIADAS                                        -->
      <!-- ===================================================================== -->
      <section class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <mat-icon class="text-base text-blue-600">table_chart</mat-icon>
                Posições Custodiadas em Ações B3
              </h2>
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {{ filteredStockPositions().length }} ativos
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              Cálculo contábil de Preço Médio Ponderado, cotações em tempo real da Brapi e rentabilidade real não realizada
            </p>
          </div>

          <div class="flex items-center gap-2.5">
            <!-- Filtro de Texto -->
            <div class="relative max-w-xs">
              <mat-icon class="absolute left-2.5 top-2 text-slate-400 text-base">filter_list</mat-icon>
              <input
                type="text"
                [value]="stockFilterText()"
                (input)="onStockFilterChange($event)"
                placeholder="Filtrar por ticker..."
                class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <!-- Botão Adicionar Transação -->
            <button
              type="button"
              (click)="openAddStockModal()"
              class="h-8 px-3.5 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors shadow-sm cursor-pointer shrink-0"
            >
              <mat-icon class="text-sm">add</mat-icon>
              <span>Nova Ordem</span>
            </button>
          </div>
        </div>

        <!-- Tabela Responsiva de Ações -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th class="py-3 px-4">Ticker & Ativo</th>
                <th class="py-3 px-3 text-right">Qtd</th>
                <th class="py-3 px-3 text-right">Preço Médio</th>
                <th class="py-3 px-3 text-right">Cotação Atual</th>
                <th class="py-3 px-3 text-right">Valor Total Atual</th>
                <th class="py-3 px-3 text-right">Rentabilidade (R$)</th>
                <th class="py-3 px-3 text-right">Rentabilidade (%)</th>
                <th class="py-3 px-3 text-right">Peso</th>
                <th class="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (item of filteredStockPositions(); track item.ticker) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <!-- Ticker & Link -->
                  <td class="py-3 px-4">
                    <a
                      [routerLink]="['/stocks', item.ticker]"
                      class="flex items-center gap-2 group cursor-pointer"
                    >
                      <div class="w-7 h-7 rounded bg-slate-900 text-white font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                        {{ item.ticker.slice(0, 4) }}
                      </div>
                      <div>
                        <span class="font-bold font-mono text-slate-900 group-hover:text-blue-600 transition-colors block">
                          {{ item.ticker }}
                        </span>
                        <span class="text-[10px] text-slate-500 truncate max-w-[140px] block">
                          {{ item.companyName }}
                        </span>
                      </div>
                    </a>
                  </td>

                  <!-- Quantidade -->
                  <td class="py-3 px-3 text-right font-semibold text-slate-900 tabular-nums">
                    {{ item.quantity | number:'1.0-0':'pt-BR' }}
                  </td>

                  <!-- Preço Médio -->
                  <td class="py-3 px-3 text-right font-medium text-slate-700 tabular-nums">
                    {{ item.averagePrice | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </td>

                  <!-- Cotação Atual -->
                  <td class="py-3 px-3 text-right font-semibold text-slate-900 tabular-nums">
                    {{ item.currentPrice | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </td>

                  <!-- Valor Total Atual -->
                  <td class="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                    {{ item.currentTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </td>

                  <!-- Rentabilidade R$ -->
                  <td
                    [class.text-emerald-600]="item.profitLoss >= 0"
                    [class.text-rose-600]="item.profitLoss < 0"
                    class="py-3 px-3 text-right tabular-nums font-semibold"
                  >
                    {{ item.profitLoss >= 0 ? '+' : '' }}{{ item.profitLoss | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </td>

                  <!-- Rentabilidade % -->
                  <td class="py-3 px-3 text-right">
                    <span
                      [class.bg-emerald-50]="item.profitLossPercent >= 0"
                      [class.text-emerald-700]="item.profitLossPercent >= 0"
                      [class.border-emerald-200]="item.profitLossPercent >= 0"
                      [class.bg-rose-50]="item.profitLossPercent < 0"
                      [class.text-rose-700]="item.profitLossPercent < 0"
                      [class.border-rose-200]="item.profitLossPercent < 0"
                      class="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums border"
                    >
                      {{ item.profitLossPercent >= 0 ? '+' : '' }}{{ item.profitLossPercent | number:'1.2-2':'pt-BR' }}%
                    </span>
                  </td>

                  <!-- Peso -->
                  <td class="py-3 px-3 text-right text-slate-600 tabular-nums font-medium">
                    {{ item.portfolioWeight | number:'1.1-1':'pt-BR' }}%
                  </td>

                  <!-- Ações -->
                  <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        (click)="openAddStockModal(item.ticker)"
                        title="Nova ordem para este ativo"
                        class="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                      >
                        <mat-icon class="text-sm">add_shopping_cart</mat-icon>
                      </button>
                      <button
                        type="button"
                        (click)="removeStockPosition(item.ticker)"
                        title="Remover última ordem"
                        class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      >
                        <mat-icon class="text-sm">delete_outline</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="py-10 text-center text-slate-400">
                    <mat-icon class="text-3xl text-slate-300 block mx-auto mb-1">show_chart</mat-icon>
                    Nenhuma ação encontrada na carteira.
                    <button
                      type="button"
                      (click)="openAddStockModal()"
                      class="mt-2 text-xs text-blue-600 hover:underline font-semibold block mx-auto cursor-pointer"
                    >
                      Registrar primeira compra
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===================================================================== -->
      <!-- 4. TABELA DE RENDA FIXA (CDB, LCI, LCA, TESOURO)                      -->
      <!-- ===================================================================== -->
      <section class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <mat-icon class="text-base text-emerald-600">account_balance</mat-icon>
                Posições em Renda Fixa
              </h2>
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {{ portfolioState.fixedIncomePositions().length }} títulos
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              Títulos bancários e de crédito privado com alíquota regressiva do IR e isenção tributária para LCI/LCA
            </p>
          </div>

          <!-- Botão Adicionar Renda Fixa -->
          <button
            type="button"
            (click)="openAddFixedIncomeModal()"
            class="h-8 px-3.5 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <mat-icon class="text-sm">add</mat-icon>
            <span>Novo Aporte RF</span>
          </button>
        </div>

        <!-- Tabela Responsiva de Renda Fixa -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th class="py-3 px-4">Título & Emissor</th>
                <th class="py-3 px-3">Tipo</th>
                <th class="py-3 px-3 text-right">Taxa Contratada</th>
                <th class="py-3 px-3 text-right">Aplicação</th>
                <th class="py-3 px-3 text-right">Vencimento</th>
                <th class="py-3 px-3 text-right">Valor Aplicado</th>
                <th class="py-3 px-3 text-right">Alíquota IR</th>
                <th class="py-3 px-3 text-right">Saldo Líquido Estimado</th>
                <th class="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (fi of portfolioState.fixedIncomePositions(); track fi.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3 px-4">
                    <span class="font-bold text-slate-900 block">{{ fi.assetName }}</span>
                    <span class="text-[10px] text-slate-500 block">{{ fi.issuer }}</span>
                  </td>
                  <td class="py-3 px-3">
                    <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {{ fi.type }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-right font-semibold text-slate-800 tabular-nums">
                    {{ fi.contractedRate | number:'1.2-2':'pt-BR' }}% {{ fi.indexer }}
                  </td>
                  <td class="py-3 px-3 text-right tabular-nums text-slate-600">
                    {{ fi.investmentDate }}
                  </td>
                  <td class="py-3 px-3 text-right tabular-nums text-slate-600">
                    {{ fi.dueDate }}
                  </td>
                  <td class="py-3 px-3 text-right font-medium text-slate-700 tabular-nums">
                    {{ fi.investedAmount | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </td>
                  <td class="py-3 px-3 text-right tabular-nums">
                    @if (fi.type === 'LCI' || fi.type === 'LCA') {
                      <span class="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Isento IR
                      </span>
                    } @else {
                      <span class="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {{ getIrTaxRate(fi) }}%
                      </span>
                    }
                  </td>
                  <td class="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                    {{ calculateEstimatedNet(fi) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </td>
                  <td class="py-3 px-4 text-center">
                    <button
                      type="button"
                      (click)="removeFixedIncome(fi.id)"
                      title="Excluir posição"
                      class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    >
                      <mat-icon class="text-sm">delete_outline</mat-icon>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="py-10 text-center text-slate-400">
                    <mat-icon class="text-3xl text-slate-300 block mx-auto mb-1">account_balance</mat-icon>
                    Nenhum título de renda fixa cadastrado.
                    <button
                      type="button"
                      (click)="openAddFixedIncomeModal()"
                      class="mt-2 text-xs text-emerald-600 hover:underline font-semibold block mx-auto cursor-pointer"
                    >
                      Cadastrar primeiro título
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===================================================================== -->
      <!-- 5. MODAL: NOVA ORDEM B3 (COMPRA / VENDA)                              -->
      <!-- ===================================================================== -->
      @if (isAddStockModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div class="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <mat-icon class="text-blue-600">add_shopping_cart</mat-icon>
                <h3 class="font-bold text-slate-900 text-sm">Registrar Operação B3</h3>
              </div>
              <button
                type="button"
                (click)="closeAddStockModal()"
                class="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <mat-icon class="text-base">close</mat-icon>
              </button>
            </div>

            <form [formGroup]="stockForm" (ngSubmit)="submitStockTransaction()" class="p-5 space-y-4 text-xs">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="modal-stock-ticker" class="block font-semibold text-slate-700 mb-1">Ticker B3</label>
                  <input
                    id="modal-stock-ticker"
                    type="text"
                    formControlName="ticker"
                    placeholder="PETR4"
                    class="w-full px-3 py-2 font-mono uppercase bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label for="modal-stock-type" class="block font-semibold text-slate-700 mb-1">Operação</label>
                  <select
                    id="modal-stock-type"
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
                  <label for="modal-stock-quantity" class="block font-semibold text-slate-700 mb-1">Quantidade</label>
                  <input
                    id="modal-stock-quantity"
                    type="number"
                    formControlName="quantity"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                  />
                </div>
                <div>
                  <label for="modal-stock-price" class="block font-semibold text-slate-700 mb-1">Preço Unitário (R$)</label>
                  <input
                    id="modal-stock-price"
                    type="number"
                    step="0.01"
                    formControlName="unitPrice"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="modal-stock-fees" class="block font-semibold text-slate-700 mb-1">Taxas / Emolumentos</label>
                  <input
                    id="modal-stock-fees"
                    type="number"
                    step="0.01"
                    formControlName="brokerageFees"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                  />
                </div>
                <div>
                  <label for="modal-stock-date" class="block font-semibold text-slate-700 mb-1">Data da Operação</label>
                  <input
                    id="modal-stock-date"
                    type="date"
                    formControlName="operationDate"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  (click)="closeAddStockModal()"
                  class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="stockForm.invalid"
                  class="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-md transition-colors shadow-sm cursor-pointer"
                >
                  Confirmar Ordem
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- ===================================================================== -->
      <!-- 6. MODAL: NOVO APORTE RENDA FIXA                                      -->
      <!-- ===================================================================== -->
      @if (isAddFixedIncomeModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div class="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <mat-icon class="text-emerald-600">account_balance</mat-icon>
                <h3 class="font-bold text-slate-900 text-sm">Novo Título de Renda Fixa</h3>
              </div>
              <button
                type="button"
                (click)="closeAddFixedIncomeModal()"
                class="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <mat-icon class="text-base">close</mat-icon>
              </button>
            </div>

            <form [formGroup]="fixedIncomeForm" (ngSubmit)="submitFixedIncome()" class="p-5 space-y-4 text-xs">
              <div>
                <label for="modal-fi-name" class="block font-semibold text-slate-700 mb-1">Nome do Ativo</label>
                <input
                  id="modal-fi-name"
                  type="text"
                  formControlName="assetName"
                  placeholder="Ex: CDB Banco Inter 110% CDI"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="modal-fi-issuer" class="block font-semibold text-slate-700 mb-1">Emissor</label>
                  <input
                    id="modal-fi-issuer"
                    type="text"
                    formControlName="issuer"
                    placeholder="Banco Inter S.A."
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label for="modal-fi-type" class="block font-semibold text-slate-700 mb-1">Tipo de Título</label>
                  <select
                    id="modal-fi-type"
                    formControlName="type"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  >
                    <option value="CDB">CDB</option>
                    <option value="LCI">LCI (Isento IR)</option>
                    <option value="LCA">LCA (Isento IR)</option>
                    <option value="TESOURO">Tesouro Direto</option>
                    <option value="CRI">CRI</option>
                    <option value="CRA">CRA</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="modal-fi-indexer" class="block font-semibold text-slate-700 mb-1">Indexador</label>
                  <select
                    id="modal-fi-indexer"
                    formControlName="indexer"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  >
                    <option value="CDI">CDI</option>
                    <option value="IPCA">IPCA</option>
                    <option value="PREFIXADO">Prefixado</option>
                    <option value="SELIC">Selic</option>
                  </select>
                </div>
                <div>
                  <label for="modal-fi-rate" class="block font-semibold text-slate-700 mb-1">Taxa (%)</label>
                  <input
                    id="modal-fi-rate"
                    type="number"
                    step="0.1"
                    formControlName="contractedRate"
                    placeholder="110.0"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label for="modal-fi-amount" class="block font-semibold text-slate-700 mb-1">Valor do Aporte (R$)</label>
                <input
                  id="modal-fi-amount"
                  type="number"
                  step="100"
                  formControlName="investedAmount"
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="modal-fi-start" class="block font-semibold text-slate-700 mb-1">Data da Aplicação</label>
                  <input
                    id="modal-fi-start"
                    type="date"
                    formControlName="investmentDate"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label for="modal-fi-due" class="block font-semibold text-slate-700 mb-1">Vencimento</label>
                  <input
                    id="modal-fi-due"
                    type="date"
                    formControlName="dueDate"
                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  (click)="closeAddFixedIncomeModal()"
                  class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="fixedIncomeForm.invalid"
                  class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold rounded-md transition-colors shadow-sm cursor-pointer"
                >
                  Salvar Aplicação
                </button>
              </div>
            </form>
          </div>
        </div>
      }

    </div>
  `,
})
export class PortfolioView {
  readonly portfolioState = inject(PortfolioStateService);

  readonly stockFilterText = signal<string>('');
  readonly isAddStockModalOpen = signal<boolean>(false);
  readonly isAddFixedIncomeModalOpen = signal<boolean>(false);

  readonly filteredStockPositions = computed<StockPositionSummaryDto[]>(() => {
    const list = this.portfolioState.stockPositions();
    const query = this.stockFilterText().trim().toUpperCase();
    if (!query) return list;
    return list.filter(
      (item) =>
        item.ticker.toUpperCase().includes(query) ||
        item.companyName.toUpperCase().includes(query)
    );
  });

  readonly stockForm = new FormGroup({
    ticker: new FormControl<string>('PETR4', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9]{4,6}$/)],
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

  readonly fixedIncomeForm = new FormGroup({
    assetName: new FormControl<string>('CDB Banco Inter 110% CDI', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    issuer: new FormControl<string>('Banco Inter S.A.', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    type: new FormControl<FixedIncomeType>('CDB', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    indexer: new FormControl<IndexerType>('CDI', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    contractedRate: new FormControl<number>(110.0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    investedAmount: new FormControl<number>(10000.0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(10)],
    }),
    investmentDate: new FormControl<string>(new Date().toISOString().split('T')[0], {
      nonNullable: true,
      validators: [Validators.required],
    }),
    dueDate: new FormControl<string>('2026-12-31', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  onStockFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stockFilterText.set(input.value);
  }

  openAddStockModal(tickerPrefill?: string): void {
    if (tickerPrefill) {
      this.stockForm.patchValue({ ticker: tickerPrefill });
      const currentQuote = this.portfolioState.quotes()[tickerPrefill.toUpperCase()];
      if (currentQuote) {
        this.stockForm.patchValue({ unitPrice: currentQuote.regularMarketPrice });
      }
    }
    this.isAddStockModalOpen.set(true);
  }

  closeAddStockModal(): void {
    this.isAddStockModalOpen.set(false);
  }

  submitStockTransaction(): void {
    if (this.stockForm.invalid) return;
    const raw = this.stockForm.getRawValue();

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
    this.closeAddStockModal();
  }

  removeStockPosition(ticker: string): void {
    const userTxs = this.portfolioState.transactions().filter((t) => t.ticker === ticker);
    if (userTxs.length > 0) {
      this.portfolioState.removeStockTransaction(userTxs[0].id).subscribe();
    }
  }

  openAddFixedIncomeModal(): void {
    this.isAddFixedIncomeModalOpen.set(true);
  }

  closeAddFixedIncomeModal(): void {
    this.isAddFixedIncomeModalOpen.set(false);
  }

  submitFixedIncome(): void {
    if (this.fixedIncomeForm.invalid) return;
    const raw = this.fixedIncomeForm.getRawValue();

    this.portfolioState
      .addFixedIncomePosition({
        userId: 'usr_folio_demo',
        assetName: raw.assetName.trim(),
        issuer: raw.issuer.trim(),
        type: raw.type,
        indexer: raw.indexer,
        contractedRate: Number(raw.contractedRate),
        investedAmount: Number(raw.investedAmount),
        investmentDate: raw.investmentDate,
        dueDate: raw.dueDate,
      })
      .subscribe();

    this.closeAddFixedIncomeModal();
  }

  removeFixedIncome(id: string): void {
    this.portfolioState.removeFixedIncomePosition(id).subscribe();
  }

  getIrTaxRate(fi: FixedIncomePositionResponseDto): number {
    if (fi.type === 'LCI' || fi.type === 'LCA') return 0;
    const days = this.calculateDays(fi.investmentDate);
    if (days <= 180) return 22.5;
    if (days <= 360) return 20.0;
    if (days <= 720) return 17.5;
    return 15.0;
  }

  calculateEstimatedNet(fi: FixedIncomePositionResponseDto): number {
    if (fi.currentAmount && fi.currentAmount > fi.investedAmount) {
      const grossEarnings = fi.currentAmount - fi.investedAmount;
      const taxRate = this.getIrTaxRate(fi);
      const tax = grossEarnings * (taxRate / 100);
      return roundHalfEven(fi.currentAmount - tax, 2);
    }
    return fi.investedAmount;
  }

  private calculateDays(dateStr: string): number {
    const start = new Date(dateStr).getTime();
    const now = Date.now();
    return Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  }
}
