import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { FolioService, roundHalfEven } from './services/folio.service';
import {
  BackendCodeFile,
  FixedIncomeType,
  IndexerType,
  TransactionType,
} from './models/folio.models';

type ActiveTab = 'backend' | 'dashboard' | 'precision';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly folioService = inject(FolioService);

  // Navegação
  readonly activeTab = signal<ActiveTab>('dashboard');
  
  // Filtro de arquivos do backend
  readonly selectedCategory = signal<string>('TODOS');
  readonly selectedFileId = signal<string>('entity-stock-tx');
  readonly copiedStatus = signal<boolean>(false);

  // Modais de Transação / Renda Fixa
  readonly isAddStockModalOpen = signal<boolean>(false);
  readonly isAddFixedIncomeModalOpen = signal<boolean>(false);
  readonly selectedTickerForHistory = signal<string | null>(null);

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

  // Arquivos filtrados
  readonly filteredBackendFiles = computed(() => {
    const cat = this.selectedCategory();
    const files = this.folioService.backendFiles;
    if (cat === 'TODOS') return files;
    return files.filter((f) => f.category === cat);
  });

  // Arquivo atualmente selecionado
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
      // Fallback
      this.copiedStatus.set(true);
      setTimeout(() => this.copiedStatus.set(false), 2500);
    }
  }

  openAddStockModal() {
    this.isAddStockModalOpen.set(true);
  }

  closeAddStockModal() {
    this.isAddStockModalOpen.set(false);
  }

  submitStockTransaction() {
    if (this.stockForm.invalid) return;

    const raw = this.stockForm.getRawValue();
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
}
