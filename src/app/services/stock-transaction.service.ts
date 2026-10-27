import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  StockTransactionCreateDto,
  StockTransactionResponseDto,
} from '../models/folio.models';

@Injectable({
  providedIn: 'root',
})
export class StockTransactionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/portfolio/stocks';

  getTransactions(userId: string): Observable<StockTransactionResponseDto[]> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<StockTransactionResponseDto[]>(this.baseUrl, { params });
  }

  createTransaction(dto: StockTransactionCreateDto): Observable<StockTransactionResponseDto> {
    return this.http.post<StockTransactionResponseDto>(this.baseUrl, dto);
  }

  deleteTransaction(transactionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${transactionId}`);
  }
}
