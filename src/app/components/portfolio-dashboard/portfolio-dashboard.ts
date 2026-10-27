import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PortfolioStateService } from '../../services/portfolio-state.service';
import {
  StockPositionSummaryDto,
  StockTransactionCreateDto,
  TransactionType,
} from '../../models/folio.models';

@Component({
  selector: 'app-portfolio-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      <!-- Cards Superiores: Consolidação Patrimonial (Status Invest) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Patrimônio Total -->
        <div class="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold uppercase tracking-wider">Patrimônio Total</span>
            <mat-icon class="text-blue-600 text-lg">account_balance_wallet</mat-icon>
          </div>
          <div class="mt-2">
            <span class="text-2xl font-bold text-slate-900 tabular-nums">
              {{ portfolioState.totalNetWorth() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
            </span>
            <div class="flex items-center justify-between mt-1 text-xs text-slate-500">
              <span>Capital Aplicado:</span>
              <span class="font-medium tabular-nums">
                {{ portfolioState.totalCapitalInvested() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Lucro / Prejuízo Consolidado -->
        <div class="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold uppercase tracking-wider">Resultado Geral</span>
            <mat-icon
              [class.text-emerald-600]="portfolioState.totalProfitLoss() >= 0"
              [class.text-rose-600]="portfolioState.totalProfitLoss() < 0"
              class="text-lg"
            >
              {{ portfolioState.totalProfitLoss() >= 0 ? 'trending_up' : 'trending_down' }}
            </mat-icon>
          </div>
          <div class="mt-2">
            <div class="flex items-baseline justify-between">
              <span
                [class.text-emerald-600]="portfolioState.totalProfitLoss() >= 0"
                [class.text-rose-600]="portfolioState.totalProfitLoss() < 0"
                class="text-2xl font-bold tabular-nums"
              >
                {{ portfolioState.totalProfitLoss() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
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
            <div class="flex items-center justify-between mt-1 text-xs text-slate-500">
              <span>Retorno Líquido:</span>
              <span class="font-medium text-slate-700">Preço Médio vs Mercado</span>
            </div>
          </div>
        </div>

        <!-- Custódia em Ações B3 -->
        <div class="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold uppercase tracking-wider">Ações & FIIs</span>
            <mat-icon class="text-slate-600 text-lg">show_chart</mat-icon>
          </div>
          <div class="mt-2">
            <span class="text-2xl font-bold text-slate-900 tabular-nums">
              {{ portfolioState.totalStocksCurrent() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
            </span>
            <div class="flex items-center justify-between mt-1 text-xs text-slate-500">
              <span>Alocação em Renda Variável:</span>
              <span class="font-semibold text-blue-700 tabular-nums">
                {{ portfolioState.assetAllocation().stocksPercent | number:'1.1-1':'pt-BR' }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Renda Fixa -->
        <div class="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500">
            <span class="text-xs font-semibold uppercase tracking-wider">Renda Fixa</span>
            <mat-icon class="text-slate-600 text-lg">assured_workload</mat-icon>
          </div>
          <div class="mt-2">
            <span class="text-2xl font-bold text-slate-900 tabular-nums">
              {{ portfolioState.totalFixedIncomeCurrent() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
            </span>
            <div class="flex items-center justify-between mt-1 text-xs text-slate-500">
              <span>Alocação em Renda Fixa:</span>
              <span class="font-semibold text-emerald-700 tabular-nums">
                {{ portfolioState.assetAllocation().fixedIncomePercent | number:'1.1-1':'pt-BR' }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de Ações & Filtro de Custódia -->
      <div class="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-1 max-w-sm">
          <div class="relative w-full">
            <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-lg">filter_list</mat-icon>
            <input
              id="filter-ticker-input"
              type="text"
              [value]="filterText()"
              (input)="onFilterChange($event)"
              placeholder="Filtrar por ticker ou empresa..."
              class="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="openAddModal()"
            class="h-9 px-3.5 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors shadow-sm cursor-pointer"
          >
            <mat-icon class="text-sm">add_circle_outline</mat-icon>
            <span>Nova Operação</span>
          </button>
        </div>
      </div>

      <!-- Tabela Responsiva de Custódia de Ações (Estilo Status Invest) -->
      <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <mat-icon class="text-sm text-blue-600">table_rows</mat-icon>
              Posições em Custódia (B3)
            </h3>
            <span class="text-[11px] text-slate-500">
              Preço Médio Ponderado calculado pelo método contábil oficial
            </span>
          </div>
          <span class="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {{ filteredPositions().length }} ativos
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="h-10 bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th class="py-2.5 px-3 cursor-pointer hover:text-slate-800" (click)="setSort('ticker')">
                  <div class="flex items-center gap-1">
                    <span>Ativo</span>
                    @if (sortColumn() === 'ticker') {
                      <mat-icon class="text-xs">{{ sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                    }
                  </div>
                </th>
                <th class="py-2.5 px-3 text-right">Qtd</th>
                <th class="py-2.5 px-3 text-right cursor-pointer hover:text-slate-800" (click)="setSort('averagePrice')">
                  <div class="flex items-center justify-end gap-1">
                    <span>Preço Médio</span>
                    @if (sortColumn() === 'averagePrice') {
                      <mat-icon class="text-xs">{{ sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                    }
                  </div>
                </th>
                <th class="py-2.5 px-3 text-right cursor-pointer hover:text-slate-800" (click)="setSort('currentPrice')">
                  <div class="flex items-center justify-end gap-1">
                    <span>Cotação Atual</span>
                    @if (sortColumn() === 'currentPrice') {
                      <mat-icon class="text-xs">{{ sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                    }
                  </div>
                </th>
                <th class="py-2.5 px-3 text-right cursor-pointer hover:text-slate-800" (click)="setSort('currentTotal')">
                  <div class="flex items-center justify-end gap-1">
                    <span>Saldo Atual</span>
                    @if (sortColumn() === 'currentTotal') {
                      <mat-icon class="text-xs">{{ sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                    }
                  </div>
                </th>
                <th class="py-2.5 px-3 text-right cursor-pointer hover:text-slate-800" (click)="setSort('profitLoss')">
                  <div class="flex items-center justify-end gap-1">
                    <span>Lucro / Prejuízo</span>
                    @if (sortColumn() === 'profitLoss') {
                      <mat-icon class="text-xs">{{ sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                    }
                  </div>
                </th>
                <th class="py-2.5 px-3 text-right cursor-pointer hover:text-slate-800" (click)="setSort('profitLossPercent')">
                  <div class="flex items-center justify-end gap-1">
                    <span>Rentabilidade</span>
                    @if (sortColumn() === 'profitLossPercent') {
                      <mat-icon class="text-xs">{{ sortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                    }
                  </div>
                </th>
                <th class="py-2.5 px-3 text-right">Peso</th>
                <th class="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (item of filteredPositions(); track item.ticker) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <!-- Ativo & Empresa -->
                  <td class="py-3 px-3">
                    <button
                      type="button"
                      (click)="onInspectStock(item.ticker)"
                      class="text-left font-mono font-bold text-slate-900 hover:text-blue-600 block text-xs cursor-pointer"
                    >
                      {{ item.ticker }}
                    </button>
                    <span class="text-[11px] text-slate-500 truncate block max-w-[150px]">
                      {{ item.companyName }}
                    </span>
                  </td>

                  <!-- Quantidade -->
                  <td class="py-3 px-3 text-right font-semibold text-slate-800 tabular-nums">
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

                  <!-- Saldo Atual -->
                  <td class="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                    {{ item.currentTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </td>

                  <!-- Lucro / Prejuízo R$ -->
                  <td class="py-3 px-3 text-right tabular-nums font-semibold"
                    [class.text-emerald-600]="item.profitLoss >= 0"
                    [class.text-rose-600]="item.profitLoss < 0"
                  >
                    {{ item.profitLoss >= 0 ? '+' : '' }}{{ item.profitLoss | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </td>

                  <!-- Rentabilidade % -->
                  <td class="py-3 px-3 text-right tabular-nums">
                    <span
                      [class.bg-emerald-50]="item.profitLossPercent >= 0"
                      [class.text-emerald-700]="item.profitLossPercent >= 0"
                      [class.border-emerald-200]="item.profitLossPercent >= 0"
                      [class.bg-rose-50]="item.profitLossPercent < 0"
                      [class.text-rose-700]="item.profitLossPercent < 0"
                      [class.border-rose-200]="item.profitLossPercent < 0"
                      class="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold border"
                    >
                      {{ item.profitLossPercent >= 0 ? '+' : '' }}{{ item.profitLossPercent | number:'1.2-2':'pt-BR' }}%
                    </span>
                  </td>

                  <!-- Peso da Carteira -->
                  <td class="py-3 px-3 text-right font-medium text-slate-600 tabular-nums">
                    {{ item.portfolioWeight | number:'1.1-1':'pt-BR' }}%
                  </td>

                  <!-- Ações CRUD -->
                  <td class="py-3 px-3 text-center">
                    <div class="inline-flex items-center gap-1">
                      <button
                        type="button"
                        (click)="onInspectStock(item.ticker)"
                        title="Ver Indicadores e Gráficos"
                        class="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                      >
                        <mat-icon class="text-base">query_stats</mat-icon>
                      </button>
                      <button
                        type="button"
                        (click)="openAddModalWithTicker(item.ticker)"
                        title="Adicionar Compra/Venda"
                        class="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                      >
                        <mat-icon class="text-base">add</mat-icon>
                      </button>
                      <button
                        type="button"
                        (click)="onRemovePosition(item.ticker)"
                        title="Remover Registro de Custódia"
                        class="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                      >
                        <mat-icon class="text-base">delete_outline</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="py-8 text-center text-slate-500">
                    <mat-icon class="text-3xl text-slate-400 block mx-auto mb-2">savings</mat-icon>
                    <p class="font-medium text-sm">Nenhuma posição em custódia encontrada.</p>
                    <p class="text-xs text-slate-400 mt-1">Clique em "Nova Operação" para lançar sua primeira compra na B3.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal de Nova Ordem de Ação (Acessível & Reativo) -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div class="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div class="flex items-center gap-2">
                <mat-icon class="text-blue-600">receipt_long</mat-icon>
                <h3 class="font-bold text-sm text-slate-900">Registrar Ordem de Ação</h3>
              </div>
              <button
                type="button"
                (click)="closeModal()"
                class="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <mat-icon class="text-lg">close</mat-icon>
              </button>
            </div>

            <form [formGroup]="transactionForm" (ngSubmit)="onSubmitTransaction()" class="p-5 space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="order-ticker" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Código / Ticker
                  </label>
                  <input
                    id="order-ticker"
                    type="text"
                    formControlName="ticker"
                    placeholder="Ex: PETR4"
                    class="w-full px-3 py-1.5 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                    maxlength="6"
                  />
                </div>

                <div>
                  <label for="order-type" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Operação
                  </label>
                  <select
                    id="order-type"
                    formControlName="type"
                    class="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                  >
                    <option value="COMPRA">COMPRA</option>
                    <option value="VENDA">VENDA</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="order-quantity" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Quantidade
                  </label>
                  <input
                    id="order-quantity"
                    type="number"
                    formControlName="quantity"
                    min="1"
                    step="1"
                    class="w-full px-3 py-1.5 text-xs text-right font-medium bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label for="order-unit-price" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Preço Unitário (R$)
                  </label>
                  <input
                    id="order-unit-price"
                    type="number"
                    formControlName="unitPrice"
                    min="0.01"
                    step="0.01"
                    class="w-full px-3 py-1.5 text-xs text-right font-medium bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="order-brokerage" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Taxas / B3 (R$)
                  </label>
                  <input
                    id="order-brokerage"
                    type="number"
                    formControlName="brokerageFees"
                    min="0"
                    step="0.01"
                    class="w-full px-3 py-1.5 text-xs text-right font-medium bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label for="order-date" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Data do Pregão
                  </label>
                  <input
                    id="order-date"
                    type="date"
                    formControlName="operationDate"
                    class="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <!-- Resumo do Valor Financeiro Estimado -->
              <div class="bg-slate-50 p-3 rounded border border-slate-200 text-xs">
                <div class="flex items-center justify-between text-slate-600">
                  <span>Subtotal da Nota:</span>
                  <span class="font-semibold text-slate-900 tabular-nums">
                    {{ estimatedTotal() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </span>
                </div>
                <div class="text-[11px] text-slate-400 mt-1">
                  O Preço Médio será recalculado automaticamente com base na Instrução Normativa da Receita Federal.
                </div>
              </div>

              <div class="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="transactionForm.invalid || isSubmitting()"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-md transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  {{ isSubmitting() ? 'Gravando...' : 'Confirmar Ordem' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class PortfolioDashboard {
  readonly portfolioState = inject(PortfolioStateService);

  readonly inspectStockRequested = output<string>();

  readonly filterText = signal<string>('');
  readonly sortColumn = signal<keyof StockPositionSummaryDto>('currentTotal');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly isModalOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  readonly transactionForm = new FormGroup({
    ticker: new FormControl<string>('PETR4', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9]{4,6}$/)],
    }),
    type: new FormControl<TransactionType>('COMPRA', { nonNullable: true }),
    quantity: new FormControl<number>(100, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    unitPrice: new FormControl<number>(38.45, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    brokerageFees: new FormControl<number>(2.5, {
      nonNullable: true,
      validators: [Validators.min(0)],
    }),
    operationDate: new FormControl<string>(new Date().toISOString().slice(0, 10), {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly estimatedTotal = computed<number>(() => {
    const qty = this.transactionForm.controls.quantity.value || 0;
    const price = this.transactionForm.controls.unitPrice.value || 0;
    const fees = this.transactionForm.controls.brokerageFees.value || 0;
    return qty * price + fees;
  });

  readonly filteredPositions = computed<StockPositionSummaryDto[]>(() => {
    const term = this.filterText().trim().toLowerCase();
    const positions = this.portfolioState.stockPositions();

    let result = positions;
    if (term) {
      result = positions.filter(
        (p) => p.ticker.toLowerCase().includes(term) || p.companyName.toLowerCase().includes(term)
      );
    }

    const col = this.sortColumn();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;

    return [...result].sort((a, b) => {
      const valA = a[col];
      const valB = b[col];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB) * dir;
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * dir;
      }
      return 0;
    });
  });

  onFilterChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filterText.set(target.value);
  }

  setSort(column: keyof StockPositionSummaryDto): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
  }

  openAddModal(): void {
    this.isModalOpen.set(true);
  }

  openAddModalWithTicker(ticker: string): void {
    this.transactionForm.controls.ticker.setValue(ticker);
    const quote = this.portfolioState.quotes()[ticker];
    if (quote) {
      this.transactionForm.controls.unitPrice.setValue(quote.regularMarketPrice);
    }
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onInspectStock(ticker: string): void {
    this.inspectStockRequested.emit(ticker);
  }

  onRemovePosition(ticker: string): void {
    const userTxs = this.portfolioState.transactions().filter((t) => t.ticker === ticker);
    if (userTxs.length > 0) {
      const lastTx = userTxs[0];
      this.portfolioState.removeStockTransaction(lastTx.id).subscribe();
    }
  }

  onSubmitTransaction(): void {
    if (this.transactionForm.invalid) return;

    this.isSubmitting.set(true);
    const formVal = this.transactionForm.getRawValue();

    const dto: StockTransactionCreateDto = {
      userId: 'usr_folio_demo',
      ticker: formVal.ticker.trim().toUpperCase(),
      type: formVal.type,
      quantity: Number(formVal.quantity),
      unitPrice: Number(formVal.unitPrice),
      brokerageFees: Number(formVal.brokerageFees || 0),
      operationDate: formVal.operationDate,
    };

    this.portfolioState.addStockTransaction(dto).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isModalOpen.set(false);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.isModalOpen.set(false);
      },
    });
  }
}

export { PortfolioDashboard as PortfolioDashboardComponent };
