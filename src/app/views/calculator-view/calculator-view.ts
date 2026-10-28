import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FixedIncomeCalculator } from '../../components/fixed-income-calculator/fixed-income-calculator';

@Component({
  selector: 'app-calculator-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatIconModule, FixedIncomeCalculator],
  template: `
    <div class="space-y-6">
      <!-- Breadcrumb / Navegação -->
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <a routerLink="/dashboard" class="hover:text-blue-600 transition-colors flex items-center gap-1">
          <mat-icon class="text-sm">dashboard</mat-icon>
          <span>Início</span>
        </a>
        <span>/</span>
        <span class="text-slate-800 font-semibold">Simulador de Renda Fixa</span>
      </div>

      <app-fixed-income-calculator></app-fixed-income-calculator>
    </div>
  `,
})
export class CalculatorView {}
