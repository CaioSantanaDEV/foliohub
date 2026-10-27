import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  FixedIncomePositionCreateDto,
  FixedIncomePositionResponseDto,
} from '../models/folio.models';

@Injectable({
  providedIn: 'root',
})
export class FixedIncomeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/portfolio/fixed-income';

  getPositions(userId: string): Observable<FixedIncomePositionResponseDto[]> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<FixedIncomePositionResponseDto[]>(this.baseUrl, { params });
  }

  createPosition(dto: FixedIncomePositionCreateDto): Observable<FixedIncomePositionResponseDto> {
    return this.http.post<FixedIncomePositionResponseDto>(this.baseUrl, dto);
  }

  deletePosition(positionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${positionId}`);
  }
}
