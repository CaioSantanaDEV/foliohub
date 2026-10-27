import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { FixedIncomeCalculatorService } from '../../services/fixed-income-calculator.service';
import { roundHalfEven } from '../../services/portfolio-state.service';
import {
  FixedIncomeSimulationRequestDto,
  FixedIncomeSimulationResponseDto,
  FixedIncomeType,
  IndexerType,
} from '../../models/folio.models';

interface RegressiveTaxStep {
  label: string;
  days: string;
  rate: string;
  active: boolean;
}

@Component({
  selector: 'app-fixed-income-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho Informativo -->
      <div class="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
            <mat-icon class="text-base text-blue-600">calculate</mat-icon>
            Simulador de Renda Fixa & Tabela Regressiva
          </h2>
          <p class="text-xs text-slate-500">
            Projeção patrimonial com aportes mensais, tributação regressiva de IR e comparação com Poupança
          </p>
        </div>

        <!-- Presets Rápidos -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">Cenários:</span>
          <button
            type="button"
            (click)="applyPreset('cdb_liquidez')"
            class="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors cursor-pointer"
          >
            CDB 100% CDI (12m)
          </button>
          <button
            type="button"
            (click)="applyPreset('lci_isenta')"
            class="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors cursor-pointer"
          >
            LCI Isenta (24m)
          </button>
          <button
            type="button"
            (click)="applyPreset('tesouro_longo')"
            class="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors cursor-pointer"
          >
            Tesouro 36m (15% IR)
          </button>
        </div>
      </div>

      <!-- Layout em Duas Colunas: Formulário de Parâmetros & Painel de Resultados -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Coluna da Esquerda: Formulário de Simulação (5 colunas) -->
        <div class="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
          <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Parâmetros do Investimento
            </h3>
            <span class="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Taxa Selic/CDI Ref: 10,65%
            </span>
          </div>

          <form [formGroup]="calcForm" (ngSubmit)="onCalculate()" class="space-y-4">
            <!-- Aporte Inicial -->
            <div>
              <label for="calc-initial-amount" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Aporte Inicial (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3 top-2 text-xs font-semibold text-slate-400">R$</span>
                <input
                  id="calc-initial-amount"
                  type="number"
                  formControlName="initialAmount"
                  min="0"
                  step="100"
                  class="w-full pl-9 pr-3 py-2 text-xs text-right font-medium bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            <!-- Aporte Mensal -->
            <div>
              <label for="calc-monthly-deposit" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Aporte Mensal Recorrente (R$)
              </label>
              <div class="relative">
                <span class="absolute left-3 top-2 text-xs font-semibold text-slate-400">R$</span>
                <input
                  id="calc-monthly-deposit"
                  type="number"
                  formControlName="monthlyDeposit"
                  min="0"
                  step="50"
                  class="w-full pl-9 pr-3 py-2 text-xs text-right font-medium bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            <!-- Prazo em Meses & Tipo de Ativo -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="calc-period-months" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Prazo (Meses)
                </label>
                <input
                  id="calc-period-months"
                  type="number"
                  formControlName="periodMonths"
                  min="1"
                  max="360"
                  step="1"
                  class="w-full px-3 py-2 text-xs text-right font-medium bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
                <span class="text-[10px] text-slate-400 mt-0.5 block text-right">
                  ~{{ (calcForm.controls.periodMonths.value || 0) * 30 }} dias corridos
                </span>
              </div>

              <div>
                <label for="calc-asset-type" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tipo de Título
                </label>
                <select
                  id="calc-asset-type"
                  formControlName="assetType"
                  class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                >
                  <option value="CDB">CDB (Banco)</option>
                  <option value="LCI">LCI (Isento IR)</option>
                  <option value="LCA">LCA (Isento IR)</option>
                  <option value="TESOURO">Tesouro Direto</option>
                  <option value="CRI">CRI (Isento IR)</option>
                  <option value="CRA">CRA (Isento IR)</option>
                  <option value="DEBENTURE">Debênture</option>
                </select>
              </div>
            </div>

            <!-- Indexador & Rentabilidade Contratada -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="calc-indexer" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Indexador
                </label>
                <select
                  id="calc-indexer"
                  formControlName="indexer"
                  class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                >
                  <option value="CDI">% do CDI</option>
                  <option value="PREFIXADO">Prefixado (% a.a.)</option>
                  <option value="IPCA">IPCA + Cupom (% a.a.)</option>
                  <option value="SELIC">100% Taxa Selic</option>
                </select>
              </div>

              <div>
                <label for="calc-rate-percent" class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Taxa Contratada (%)
                </label>
                <input
                  id="calc-rate-percent"
                  type="number"
                  formControlName="ratePercent"
                  min="0.1"
                  step="0.1"
                  class="w-full px-3 py-2 text-xs text-right font-medium bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
                <span class="text-[10px] text-slate-400 mt-0.5 block text-right">
                  @if (calcForm.controls.indexer.value === 'CDI') {
                    Ex: 100% do CDI
                  } @else {
                    Taxa anual contratada
                  }
                </span>
              </div>
            </div>

            <button
              type="submit"
              [disabled]="calcForm.invalid || isCalculating()"
              class="w-full h-10 mt-2 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-md transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              @if (isCalculating()) {
                <mat-icon class="text-sm animate-spin">refresh</mat-icon>
                <span>Calculando Projeção...</span>
              } @else {
                <mat-icon class="text-sm">trending_up</mat-icon>
                <span>Simular Rentabilidade</span>
              }
            </button>
          </form>

          <!-- Tabela Visual da Regra Regressiva do IR -->
          <div class="mt-4 pt-4 border-t border-slate-100">
            <span class="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
              Tabela Regressiva da Receita Federal
            </span>
            <div class="grid grid-cols-4 gap-1.5 text-center text-[11px]">
              @for (step of taxSteps(); track step.days) {
                <div
                  [class.bg-blue-50]="step.active"
                  [class.border-blue-300]="step.active"
                  [class.text-blue-800]="step.active"
                  [class.bg-slate-50]="!step.active"
                  [class.border-slate-200]="!step.active"
                  [class.text-slate-600]="!step.active"
                  class="p-2 rounded border"
                >
                  <span class="font-bold block tabular-nums">{{ step.rate }}</span>
                  <span class="text-[10px] text-slate-500 block">{{ step.days }}</span>
                </div>
              }
            </div>
            @if (isExemptAsset()) {
              <div class="mt-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded flex items-center gap-1.5">
                <mat-icon class="text-sm">verified</mat-icon>
                <span>Título Isento de IR para Pessoa Física (Art. 3º Lei 11.033/2004).</span>
              </div>
            }
          </div>
        </div>

        <!-- Coluna da Direita: Painel de Resultados Detalhado (7 colunas) -->
        <div class="lg:col-span-7 space-y-4">
          @if (simulationResult(); as res) {
            <!-- Card Principal com o Valor Líquido Final -->
            <div class="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Valor Líquido Final em Conta
                  </span>
                  <div class="flex items-baseline gap-2 mt-1">
                    <span class="text-3xl font-bold text-slate-900 tabular-nums">
                      {{ res.netBalance | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                    </span>
                    <span class="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums">
                      +{{ res.netProfitPercent | number:'1.2-2':'pt-BR' }}% líquido
                    </span>
                  </div>
                </div>

                <div class="text-right">
                  <span class="text-[11px] text-slate-400 block uppercase font-medium">Prazo Total</span>
                  <span class="text-sm font-bold text-slate-800 font-mono">
                    {{ res.months }} meses ({{ res.days }} dias)
                  </span>
                </div>
              </div>

              <!-- Detalhamento de Composição Financeira -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 text-xs">
                <div class="bg-slate-50 p-2.5 rounded border border-slate-100">
                  <span class="text-slate-500 font-medium block">Total Aportado</span>
                  <span class="text-sm font-bold text-slate-900 tabular-nums text-right block">
                    {{ res.totalInvested | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </span>
                </div>

                <div class="bg-slate-50 p-2.5 rounded border border-slate-100">
                  <span class="text-slate-500 font-medium block">Rendimento Bruto</span>
                  <span class="text-sm font-bold text-emerald-600 tabular-nums text-right block">
                    +{{ res.grossEarnings | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </span>
                </div>

                <div class="bg-slate-50 p-2.5 rounded border border-slate-100">
                  <span class="text-slate-500 font-medium block">Alíquota de IR</span>
                  <span class="text-sm font-bold text-slate-800 tabular-nums text-right block">
                    {{ res.isExempt ? '0% (Isento)' : (res.irTaxRatePercent | number:'1.1-1':'pt-BR') + '%' }}
                  </span>
                </div>

                <div class="bg-slate-50 p-2.5 rounded border border-slate-100">
                  <span class="text-slate-500 font-medium block">IR Retido Fonte</span>
                  <span class="text-sm font-bold text-rose-600 tabular-nums text-right block">
                    -{{ res.taxDeduction | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </span>
                </div>
              </div>

              <!-- Barra de Distribuição Visual do Capital -->
              <div class="mt-2">
                <div class="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
                  <span>Composição do Montante Acumulado:</span>
                  <span>100%</span>
                </div>
                <div class="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden border border-slate-200">
                  <div
                    [style.width.%]="investedPercent()"
                    class="bg-blue-600 h-full"
                    title="Aporte Principal"
                  ></div>
                  <div
                    [style.width.%]="profitPercent()"
                    class="bg-emerald-500 h-full"
                    title="Lucro Líquido"
                  ></div>
                  <div
                    [style.width.%]="taxPercent()"
                    class="bg-rose-400 h-full"
                    title="Imposto de Renda"
                  ></div>
                </div>
                <div class="flex items-center gap-4 text-[11px] mt-2 justify-center">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block"></span>
                    <span class="text-slate-600">Investido ({{ investedPercent() | number:'1.0-0':'pt-BR' }}%)</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                    <span class="text-slate-600">Lucro Líquido ({{ profitPercent() | number:'1.0-0':'pt-BR' }}%)</span>
                  </div>
                  @if (taxPercent() > 0) {
                    <div class="flex items-center gap-1.5">
                      <span class="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block"></span>
                      <span class="text-slate-600">IR Retido ({{ taxPercent() | number:'1.0-0':'pt-BR' }}%)</span>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Card de Comparativo com a Caderneta de Poupança -->
            <div class="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
              <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <mat-icon class="text-sm text-blue-600">compare_arrows</mat-icon>
                Comparativo de Eficiência vs Poupança
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div class="p-3 bg-slate-50 rounded border border-slate-200">
                  <span class="text-slate-500 block mb-1">Resultado na Poupança (TR + 0,5% a.m.)</span>
                  <span class="text-lg font-bold text-slate-700 tabular-nums">
                    {{ res.balancePoupanca | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </span>
                  <span class="text-[11px] text-slate-400 block mt-1">
                    Rendimento histórico tradicional
                  </span>
                </div>

                <div class="p-3 bg-emerald-50/70 rounded border border-emerald-200">
                  <span class="text-emerald-800 font-semibold block mb-1">Ganho Excedente Líquido</span>
                  <span class="text-lg font-bold text-emerald-700 tabular-nums">
                    +{{ res.diffPoupanca | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </span>
                  <span class="text-[11px] text-emerald-800 font-medium block mt-1">
                    A mais no seu patrimônio em {{ res.months }} meses
                  </span>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class FixedIncomeCalculator implements OnInit {
  private readonly calcService = inject(FixedIncomeCalculatorService);

  readonly isCalculating = signal<boolean>(false);
  readonly simulationResult = signal<FixedIncomeSimulationResponseDto | null>(null);

  readonly calcForm = new FormGroup({
    initialAmount: new FormControl<number>(10000, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    monthlyDeposit: new FormControl<number>(1000, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    periodMonths: new FormControl<number>(24, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(360)],
    }),
    ratePercent: new FormControl<number>(100, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    assetType: new FormControl<FixedIncomeType>('CDB', { nonNullable: true }),
    indexer: new FormControl<IndexerType>('CDI', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.onCalculate();
  }

  readonly isExemptAsset = computed<boolean>(() => {
    const type = this.calcForm.controls.assetType.value;
    return ['LCI', 'LCA', 'CRI', 'CRA'].includes(type);
  });

  readonly taxSteps = computed<RegressiveTaxStep[]>(() => {
    const months = this.calcForm.controls.periodMonths.value || 0;
    const days = months * 30;
    const isExempt = this.isExemptAsset();

    return [
      {
        label: 'Até 180 dias',
        days: '<= 6m',
        rate: isExempt ? '0%' : '22,5%',
        active: !isExempt && days <= 180,
      },
      {
        label: '181 a 360 dias',
        days: '6m a 12m',
        rate: isExempt ? '0%' : '20,0%',
        active: !isExempt && days > 180 && days <= 360,
      },
      {
        label: '361 a 720 dias',
        days: '12m a 24m',
        rate: isExempt ? '0%' : '17,5%',
        active: !isExempt && days > 360 && days <= 720,
      },
      {
        label: 'Acima de 720 dias',
        days: '> 24m',
        rate: isExempt ? '0%' : '15,0%',
        active: !isExempt && days > 720,
      },
    ];
  });

  readonly investedPercent = computed<number>(() => {
    const res = this.simulationResult();
    if (!res || res.grossBalance === 0) return 100;
    return (res.totalInvested / res.grossBalance) * 100;
  });

  readonly profitPercent = computed<number>(() => {
    const res = this.simulationResult();
    if (!res || res.grossBalance === 0) return 0;
    return (res.netProfit / res.grossBalance) * 100;
  });

  readonly taxPercent = computed<number>(() => {
    const res = this.simulationResult();
    if (!res || res.grossBalance === 0) return 0;
    return (res.taxDeduction / res.grossBalance) * 100;
  });

  applyPreset(preset: 'cdb_liquidez' | 'lci_isenta' | 'tesouro_longo'): void {
    if (preset === 'cdb_liquidez') {
      this.calcForm.patchValue({
        initialAmount: 5000,
        monthlyDeposit: 500,
        periodMonths: 12,
        ratePercent: 100,
        assetType: 'CDB',
        indexer: 'CDI',
      });
    } else if (preset === 'lci_isenta') {
      this.calcForm.patchValue({
        initialAmount: 20000,
        monthlyDeposit: 1000,
        periodMonths: 24,
        ratePercent: 92,
        assetType: 'LCI',
        indexer: 'CDI',
      });
    } else if (preset === 'tesouro_longo') {
      this.calcForm.patchValue({
        initialAmount: 15000,
        monthlyDeposit: 1500,
        periodMonths: 36,
        ratePercent: 12.5,
        assetType: 'TESOURO',
        indexer: 'PREFIXADO',
      });
    }
    this.onCalculate();
  }

  onCalculate(): void {
    if (this.calcForm.invalid) return;

    this.isCalculating.set(true);
    const formVal = this.calcForm.getRawValue();

    const request: FixedIncomeSimulationRequestDto = {
      initialAmount: Number(formVal.initialAmount),
      monthlyDeposit: Number(formVal.monthlyDeposit),
      periodMonths: Number(formVal.periodMonths),
      ratePercent: Number(formVal.ratePercent),
      assetType: formVal.assetType,
      indexer: formVal.indexer,
    };

    this.calcService.simulate(request).subscribe({
      next: (result) => {
        this.simulationResult.set(result);
        this.isCalculating.set(false);
      },
      error: () => {
        // Fallback contábil idêntico ao serviço Java caso o backend esteja offline
        const local = this.computeLocalSimulation(request);
        this.simulationResult.set(local);
        this.isCalculating.set(false);
      },
    });
  }

  /**
   * Cálculo contábil no client-side seguindo estritamente as regras financeiras:
   * Capitalização mensal composta, tabela regressiva de IR e isenção legal de LCI/LCA.
   */
  private computeLocalSimulation(
    req: FixedIncomeSimulationRequestDto
  ): FixedIncomeSimulationResponseDto {
    const days = req.periodMonths * 30;
    const months = req.periodMonths;
    const isExempt = ['LCI', 'LCA', 'CRI', 'CRA'].includes(req.assetType);

    // Determina a alíquota regressiva com base nos dias corridos
    let irTaxRatePercent = 0;
    if (!isExempt) {
      if (days <= 180) irTaxRatePercent = 22.5;
      else if (days <= 360) irTaxRatePercent = 20.0;
      else if (days <= 720) irTaxRatePercent = 17.5;
      else irTaxRatePercent = 15.0;
    }

    // Taxa de juros mensal efetiva
    const cdiRefAnual = 0.1065;
    let annualRate = 0.1065;

    if (req.indexer === 'CDI') {
      annualRate = (req.ratePercent / 100) * cdiRefAnual;
    } else {
      annualRate = req.ratePercent / 100;
    }

    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    const poupancaMonthlyRate = 0.0055;

    let grossBalance = req.initialAmount;
    let balancePoupanca = req.initialAmount;

    for (let m = 0; m < months; m++) {
      grossBalance = (grossBalance + (m > 0 ? req.monthlyDeposit : 0)) * (1 + monthlyRate);
      balancePoupanca = (balancePoupanca + (m > 0 ? req.monthlyDeposit : 0)) * (1 + poupancaMonthlyRate);
    }

    const totalInvested = req.initialAmount + req.monthlyDeposit * Math.max(0, months - 1);
    const grossEarnings = Math.max(0, grossBalance - totalInvested);
    const taxDeduction = isExempt ? 0 : grossEarnings * (irTaxRatePercent / 100);
    const netBalance = grossBalance - taxDeduction;
    const netProfit = netBalance - totalInvested;
    const netProfitPercent = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
    const diffPoupanca = netBalance - balancePoupanca;

    return {
      days,
      months,
      totalInvested: roundHalfEven(totalInvested, 2),
      grossBalance: roundHalfEven(grossBalance, 2),
      grossEarnings: roundHalfEven(grossEarnings, 2),
      irTaxRatePercent,
      isExempt,
      taxDeduction: roundHalfEven(taxDeduction, 2),
      netBalance: roundHalfEven(netBalance, 2),
      netProfit: roundHalfEven(netProfit, 2),
      netProfitPercent: roundHalfEven(netProfitPercent, 2),
      balancePoupanca: roundHalfEven(balancePoupanca, 2),
      diffPoupanca: roundHalfEven(diffPoupanca, 2),
    };
  }
}

export { FixedIncomeCalculator as FixedIncomeCalculatorComponent };
