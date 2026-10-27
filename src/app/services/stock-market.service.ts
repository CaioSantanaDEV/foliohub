import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MacroIndicatorsDto, StockQuoteDto } from '../models/folio.models';

@Injectable({
  providedIn: 'root',
})
export class StockMarketService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getStockQuote(ticker: string): Observable<StockQuoteDto> {
    const cleanTicker = ticker.trim().toUpperCase();
    return this.http.get<StockQuoteDto>(`${this.baseUrl}/stocks/${cleanTicker}`);
  }

  getMacroIndicators(): Observable<MacroIndicatorsDto> {
    return this.http.get<MacroIndicatorsDto>(`${this.baseUrl}/macro-indicators`);
  }
}
