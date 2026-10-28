import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PortfolioStateService } from './services/portfolio-state.service';
import { StockMarketService } from './services/stock-market.service';
import {
  FixedIncomeType,
  IndexerType,
  MacroIndicatorsDto,
  StockTransactionCreateDto,
  TransactionType,
} from './models/folio.models';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly router = inject(Router);
  readonly portfolioState = inject(PortfolioStateService);
  private readonly marketService = inject(StockMarketService);

  readonly macroData = signal<MacroIndicatorsDto | null>(null);

  readonly isAddStockModalOpen = signal<boolean>(false);
  readonly isAddFixedIncomeModalOpen = signal<boolean>(false);

  readonly globalSearchForm = new FormGroup({
    ticker: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9]{4,6}$/)],
    }),
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

  ngOnInit(): void {
    this.portfolioState.loadPortfolio('usr_folio_demo').subscribe();
    this.marketService.getMacroIndicators().subscribe({
      next: (data) => this.macroData.set(data),
      error: (err: unknown) => console.debug('Macro indicators offline:', err),
    });
  }

  onGlobalSearchSubmit(): void {
    if (this.globalSearchForm.invalid) return;
    const ticker = this.globalSearchForm.controls.ticker.value.trim().toUpperCase();
    this.globalSearchForm.reset();
    this.router.navigate(['/stocks', ticker]);
  }

  openAddStockModal(tickerPrefill?: string): void {
    if (tickerPrefill) {
      this.stockForm.patchValue({ ticker: tickerPrefill });
      const quote = this.portfolioState.quotes()[tickerPrefill.toUpperCase()];
      if (quote) {
        this.stockForm.patchValue({ unitPrice: quote.regularMarketPrice });
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
}
