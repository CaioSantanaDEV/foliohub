import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  FixedIncomeSimulationRequestDto,
  FixedIncomeSimulationResponseDto,
} from '../models/folio.models';

@Injectable({
  providedIn: 'root',
})
export class FixedIncomeCalculatorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/calculator/fixed-income';

  simulate(request: FixedIncomeSimulationRequestDto): Observable<FixedIncomeSimulationResponseDto> {
    return this.http.post<FixedIncomeSimulationResponseDto>(this.baseUrl, request);
  }
}
