import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./views/market-hub/market-hub').then((m) => m.MarketHub),
  },
  {
    path: 'portfolio',
    loadComponent: () =>
      import('./views/portfolio-view/portfolio-view').then((m) => m.PortfolioView),
  },
  {
    path: 'stocks/:ticker',
    loadComponent: () =>
      import('./views/stock-detail-view/stock-detail-view').then((m) => m.StockDetailView),
  },
  {
    path: 'stocks',
    pathMatch: 'full',
    redirectTo: 'stocks/PETR4',
  },
  {
    path: 'calculator',
    loadComponent: () =>
      import('./views/calculator-view/calculator-view').then((m) => m.CalculatorView),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
