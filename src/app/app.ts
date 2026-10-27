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
import { FolioService, roundHalfEven } from './services/folio.service';
import { PortfolioStateService } from './services/portfolio-state.service';
import {
  BackendCodeFile,
  FixedIncomeType,
  IndexerType,
  StockPositionSummaryDto,
  TransactionType,
} from './models/folio.models';
import { StockDetail } from './components/stock-detail/stock-detail';
import { PortfolioDashboard } from './components/portfolio-dashboard/portfolio-dashboard';
import { FixedIncomeCalculator } from './components/fixed-income-calculator/fixed-income-calculator';

export type ActiveTab = 'overview' | 'stocks' | 'fixed_income' | 'calculator' | 'precision' | 'backend';

interface FundamentalIndicator {
  ticker: string;
  companyName: string;
  sector: string;
  currentPrice: number;
  dailyChange: number;
  dayLow: number;
  dayHigh: number;
  pl: number;
  pvp: number;
  dy: number;
  roe: number;
  netMargin: number;
  netDebtEbitda: number;
  volume24h: string;
  marketCap: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    StockDetail,
    PortfolioDashboard,
    FixedIncomeCalculator,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly folioService = inject(FolioService);
  readonly portfolioState = inject(PortfolioStateService);

  ngOnInit(): void {
    this.portfolioState.loadPortfolio(this.folioService.currentUser().id).subscribe();
  }

  // Navegação principal estilo Status Invest
  readonly activeTab = signal<ActiveTab>('overview');

  // Filtros de tempo para cotações
  readonly timeFilters: string[] = ['1D', '5D', '1M', '6M', 'YTD', '1A', '5A', 'MÁX'];
  readonly selectedTimeRange = signal<string>('YTD');

  // Ativo em foco no Hero do módulo de ações
  readonly selectedStockTicker = signal<string>('PETR4');

  // Ordenação da tabela de ações
  readonly stockSortColumn = signal<keyof StockPositionSummaryDto>('currentTotal');
  readonly stockSortDirection = signal<'asc' | 'desc'>('desc');

  // Filtro de arquivos do backend
  readonly selectedCategory = signal<string>('TODOS');
  readonly selectedFileId = signal<string>('ctrl-stock-tx');
  readonly copiedStatus = signal<boolean>(false);

  // Modais de Transação / Renda Fixa / Extrato
  readonly isAddStockModalOpen = signal<boolean>(false);
  readonly isAddFixedIncomeModalOpen = signal<boolean>(false);
  readonly selectedTickerForHistory = signal<string | null>(null);

  // Base fundamentalista de ativos B3
  readonly stockFundamentals: Record<string, FundamentalIndicator> = {
    PETR4: {
      ticker: 'PETR4',
      companyName: 'Petróleo Brasileiro S.A. Petrobras',
      sector: 'Petróleo, Gás e Biocombustíveis',
      currentPrice: 38.45,
      dailyChange: 1.45,
      dayLow: 37.80,
      dayHigh: 38.65,
      pl: 4.82,
      pvp: 1.15,
      dy: 14.80,
      roe: 24.12,
      netMargin: 22.40,
      netDebtEbitda: 0.85,
      volume24h: 'R$ 1,42 Bi',
      marketCap: 'R$ 502,4 Bi',
    },
    VALE3: {
      ticker: 'VALE3',
      companyName: 'Vale S.A.',
      sector: 'Mineração e Materiais Básicos',
      currentPrice: 62.30,
      dailyChange: -0.68,
      dayLow: 61.90,
      dayHigh: 63.10,
      pl: 6.15,
      pvp: 1.32,
      dy: 9.20,
      roe: 21.45,
      netMargin: 19.80,
      netDebtEbitda: 0.62,
      volume24h: 'R$ 980 Mi',
      marketCap: 'R$ 281,6 Bi',
    },
    WEGE3: {
      ticker: 'WEGE3',
      companyName: 'WEG S.A.',
      sector: 'Bens Industriais / Máquinas',
      currentPrice: 51.15,
      dailyChange: 0.95,
      dayLow: 50.40,
      dayHigh: 51.45,
      pl: 32.40,
      pvp: 10.85,
      dy: 2.15,
      roe: 34.50,
      netMargin: 17.20,
      netDebtEbitda: -0.15,
      volume24h: 'R$ 410 Mi',
      marketCap: 'R$ 214,8 Bi',
    },
    ITUB4: {
      ticker: 'ITUB4',
      companyName: 'Itaú Unibanco Holding S.A.',
      sector: 'Financeiro / Bancos',
      currentPrice: 34.80,
      dailyChange: 0.32,
      dayLow: 34.45,
      dayHigh: 34.95,
      pl: 8.90,
      pvp: 1.68,
      dy: 7.45,
      roe: 21.20,
      netMargin: 25.10,
      netDebtEbitda: 0.00,
      volume24h: 'R$ 680 Mi',
      marketCap: 'R$ 342,1 Bi',
    },
    BBAS3: {
      ticker: 'BBAS3',
      companyName: 'Banco do Brasil S.A.',
      sector: 'Financeiro / Bancos',
      currentPrice: 28.90,
      dailyChange: 1.10,
      dayLow: 28.50,
      dayHigh: 29.10,
      pl: 4.45,
      pvp: 0.88,
      dy: 10.15,
      roe: 21.80,
      netMargin: 23.40,
      netDebtEbitda: 0.00,
      volume24h: 'R$ 520 Mi',
      marketCap: 'R$ 165,3 Bi',
    },
    MXRF11: {
      ticker: 'MXRF11',
      companyName: 'Maxi Renda Fundo de Investimento Imobiliário',
      sector: 'Fundos Imobiliários / Papel (CRI)',
      currentPrice: 10.25,
      dailyChange: 0.10,
      dayLow: 10.22,
      dayHigh: 10.28,
      pl: 11.20,
      pvp: 1.01,
      dy: 12.45,
      roe: 9.80,
      netMargin: 88.50,
      netDebtEbitda: 0.00,
      volume24h: 'R$ 18 Mi',
      marketCap: 'R$ 3,2 Bi',
    },
  };

  // Form reativo para registro de transação B3
  readonly stockForm = new FormGroup({
    ticker: new FormControl<string>('PETR4', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Z0-9]{4,6}$/i)],
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

  // Form reativo para cadastro de Renda Fixa
  readonly fixedIncomeForm = new FormGroup({
    assetName: new FormControl<string>('CDB Banco Inter 115% CDI', {
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
    contractedRate: new FormControl<number>(115.0, {
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
    dueDate: new FormControl<string>('2027-12-31', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  // Form reativo para a Calculadora / Simulador de Renda Fixa com tabela regressiva
  readonly calculatorForm = new FormGroup({
    initialAmount: new FormControl<number>(15000, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(100)],
    }),
    monthlyDeposit: new FormControl<number>(1000, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    periodMonths: new FormControl<number>(24, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(360)],
    }),
    ratePercent: new FormControl<number>(115.0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    assetType: new FormControl<FixedIncomeType>('CDB', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    indexer: new FormControl<IndexerType>('CDI', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  // Simulação reativa calculada no padrão estrito de Renda Fixa Brasileira
  readonly simulationResult = computed(() => {
    const raw = this.calculatorForm.getRawValue();
    const initial = Number(raw.initialAmount) || 0;
    const monthly = Number(raw.monthlyDeposit) || 0;
    const months = Number(raw.periodMonths) || 1;
    const rate = Number(raw.ratePercent) || 100;
    const type = raw.assetType;

    const days = months * 30;

    // Alíquota regressiva do Imposto de Renda
    let irTaxRatePercent = 0;
    const isExempt = type === 'LCI' || type === 'LCA';

    if (isExempt) {
      irTaxRatePercent = 0.0;
    } else if (days <= 180) {
      irTaxRatePercent = 22.5;
    } else if (days <= 360) {
      irTaxRatePercent = 20.0;
    } else if (days <= 720) {
      irTaxRatePercent = 17.5;
    } else {
      irTaxRatePercent = 15.0;
    }

    // CDI base anual estimado em 10.50%
    const cdiAnual = 0.1050;
    const taxaAnualEfetiva = raw.indexer === 'CDI' ? (cdiAnual * rate) / 100 : rate / 100;
    const taxaMensal = Math.pow(1 + taxaAnualEfetiva, 1 / 12) - 1;

    let balance = initial;
    let totalInvested = initial;

    for (let m = 1; m <= months; m++) {
      balance = balance * (1 + taxaMensal) + monthly;
      totalInvested += monthly;
    }

    const grossEarnings = Math.max(0, balance - totalInvested);
    const taxDeduction = isExempt ? 0 : roundHalfEven(grossEarnings * (irTaxRatePercent / 100), 2);
    const netBalance = roundHalfEven(balance - taxDeduction, 2);
    const grossBalance = roundHalfEven(balance, 2);

    // Comparativos com Poupança (estimada em 6.17% a.a.) e CDI 100% Líquido
    const taxaMensalPoupanca = Math.pow(1 + 0.0617, 1 / 12) - 1;
    let balancePoupanca = initial;
    for (let m = 1; m <= months; m++) {
      balancePoupanca = balancePoupanca * (1 + taxaMensalPoupanca) + monthly;
    }

    return {
      days,
      months,
      totalInvested: roundHalfEven(totalInvested, 2),
      grossBalance,
      grossEarnings: roundHalfEven(grossEarnings, 2),
      irTaxRatePercent,
      isExempt,
      taxDeduction,
      netBalance,
      netProfit: roundHalfEven(netBalance - totalInvested, 2),
      netProfitPercent: totalInvested > 0 ? roundHalfEven(((netBalance - totalInvested) / totalInvested) * 100, 2) : 0,
      balancePoupanca: roundHalfEven(balancePoupanca, 2),
      diffPoupanca: roundHalfEven(netBalance - balancePoupanca, 2),
    };
  });

  // Simulação interativa de laboratório de precisão (BigDecimal vs Double)
  readonly precisionTestCount = signal<number>(10000);
  readonly precisionUnitPrice = signal<number>(19.99);
  readonly precisionTaxRate = signal<number>(0.0865); // 8.65% tributos e emolumentos

  readonly precisionComparison = computed(() => {
    const count = this.precisionTestCount();
    const price = this.precisionUnitPrice();
    const rate = this.precisionTaxRate();

    // 1. Simulação usando Float/Double padrão (IEEE 754 com acumulação de erros binários)
    let floatAccumulated = 0;
    for (let i = 0; i < count; i++) {
      floatAccumulated += price * rate;
    }

    // 2. Simulação com BigDecimal (Escala monetária de 2 casas e RoundingMode.HALF_EVEN)
    const singleRoundedFee = roundHalfEven(price * rate, 2);
    const bigDecimalAccumulated = roundHalfEven(singleRoundedFee * count, 2);

    const difference = Math.abs(floatAccumulated - bigDecimalAccumulated);

    return {
      count,
      singleFeeDouble: price * rate,
      singleFeeBigDecimal: singleRoundedFee,
      floatAccumulated: floatAccumulated,
      bigDecimalAccumulated: bigDecimalAccumulated,
      difference: difference,
      differenceInCents: roundHalfEven(difference * 100, 2),
    };
  });

  // Ativo atualmente selecionado para o Hero fundamentalista
  readonly activeStockDetail = computed<FundamentalIndicator>(() => {
    const ticker = this.selectedStockTicker();
    return this.stockFundamentals[ticker] || this.stockFundamentals['PETR4'];
  });

  // Posições de ações ordenadas com tipagem estrita
  readonly sortedStockPositions = computed<StockPositionSummaryDto[]>(() => {
    const positions = [...this.folioService.stockPositions()];
    const col = this.stockSortColumn();
    const dir = this.stockSortDirection();

    return positions.sort((a, b) => {
      const valA = a[col];
      const valB = b[col];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return dir === 'asc' ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
    });
  });

  // Arquivos filtrados do Backend
  readonly filteredBackendFiles = computed(() => {
    const cat = this.selectedCategory();
    const files = this.folioService.backendFiles;
    if (cat === 'TODOS') return files;
    return files.filter((f) => f.category === cat);
  });

  readonly activeBackendFile = computed<BackendCodeFile>(() => {
    const id = this.selectedFileId();
    const found = this.folioService.backendFiles.find((f) => f.id === id);
    return found || this.folioService.backendFiles[0];
  });

  // Transações filtradas para histórico de modal
  readonly tickerTransactions = computed(() => {
    const ticker = this.selectedTickerForHistory();
    if (!ticker) return [];
    return this.folioService
      .stockTransactions()
      .filter((t) => t.ticker === ticker)
      .sort((a, b) => b.operationDate.localeCompare(a.operationDate));
  });

  // Percentual de Renda Variável vs Renda Fixa
  readonly allocationBreakdown = computed(() => {
    const total = this.folioService.totalNetWorth();
    if (total === 0) return { stocksPercent: 50, fixedIncomePercent: 50 };
    const stocks = (this.folioService.totalStocksCurrent() / total) * 100;
    const fixed = (this.folioService.totalFixedIncomeCurrent() / total) * 100;
    return {
      stocksPercent: roundHalfEven(stocks, 1),
      fixedIncomePercent: roundHalfEven(fixed, 1),
    };
  });

  selectTab(tab: ActiveTab) {
    this.activeTab.set(tab);
  }

  selectStockTicker(ticker: string) {
    this.selectedStockTicker.set(ticker);
  }

  selectTimeRange(range: string) {
    this.selectedTimeRange.set(range);
  }

  toggleStockSort(col: keyof StockPositionSummaryDto) {
    if (this.stockSortColumn() === col) {
      this.stockSortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.stockSortColumn.set(col);
      this.stockSortDirection.set('desc');
    }
  }

  selectFile(fileId: string) {
    this.selectedFileId.set(fileId);
  }

  filterCategory(cat: string) {
    this.selectedCategory.set(cat);
  }

  async copyCurrentCode() {
    const code = this.activeBackendFile().code;
    try {
      await navigator.clipboard.writeText(code);
      this.copiedStatus.set(true);
      setTimeout(() => {
        this.copiedStatus.set(false);
      }, 2500);
    } catch {
      this.copiedStatus.set(true);
      setTimeout(() => this.copiedStatus.set(false), 2500);
    }
  }

  onInspectStock(ticker: string): void {
    this.selectedStockTicker.set(ticker);
    this.selectTab('stocks');
  }

  onAddStockRequested(ticker: string): void {
    this.openAddStockModal(ticker);
  }

  openAddStockModal(tickerPrefill?: string) {
    if (tickerPrefill) {
      this.stockForm.patchValue({ ticker: tickerPrefill });
    }
    this.isAddStockModalOpen.set(true);
  }

  closeAddStockModal() {
    this.isAddStockModalOpen.set(false);
  }

  submitStockTransaction() {
    if (this.stockForm.invalid) return;

    const raw = this.stockForm.getRawValue();
    const userId = this.folioService.currentUser().id;

    this.portfolioState
      .addStockTransaction({
        userId,
        ticker: raw.ticker.toUpperCase().trim(),
        type: raw.type,
        quantity: Number(raw.quantity),
        unitPrice: Number(raw.unitPrice),
        brokerageFees: Number(raw.brokerageFees),
        operationDate: raw.operationDate,
      })
      .subscribe();

    this.folioService.addStockTransaction({
      ticker: raw.ticker.toUpperCase().trim(),
      type: raw.type,
      quantity: Number(raw.quantity),
      unitPrice: Number(raw.unitPrice),
      brokerageFees: Number(raw.brokerageFees),
      operationDate: raw.operationDate,
    });

    this.closeAddStockModal();
  }

  openAddFixedIncomeModal() {
    this.isAddFixedIncomeModalOpen.set(true);
  }

  closeAddFixedIncomeModal() {
    this.isAddFixedIncomeModalOpen.set(false);
  }

  submitFixedIncome() {
    if (this.fixedIncomeForm.invalid) return;

    const raw = this.fixedIncomeForm.getRawValue();
    const userId = this.folioService.currentUser().id;

    this.portfolioState
      .addFixedIncomePosition({
        userId,
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

    this.folioService.addFixedIncomePosition({
      assetName: raw.assetName.trim(),
      issuer: raw.issuer.trim(),
      type: raw.type,
      indexer: raw.indexer,
      contractedRate: Number(raw.contractedRate),
      investedAmount: Number(raw.investedAmount),
      investmentDate: raw.investmentDate,
      dueDate: raw.dueDate,
    });

    this.closeAddFixedIncomeModal();
  }

  openHistoryModal(ticker: string) {
    this.selectedTickerForHistory.set(ticker);
  }

  closeHistoryModal() {
    this.selectedTickerForHistory.set(null);
  }

  setPrecisionCount(count: number) {
    this.precisionTestCount.set(count);
  }

  calculateFixedIncomeTaxRate(type: FixedIncomeType, days: number): number {
    if (type === 'LCI' || type === 'LCA') return 0;
    if (days <= 180) return 22.5;
    if (days <= 360) return 20.0;
    if (days <= 720) return 17.5;
    return 15.0;
  }

  calculateElapsedDays(investmentDate: string): number {
    const start = new Date(investmentDate).getTime();
    const now = new Date().getTime();
    return Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
  }
}
