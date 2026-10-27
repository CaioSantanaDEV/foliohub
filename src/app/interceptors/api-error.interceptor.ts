import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ProblemDetail } from '../models/folio.models';

export interface FormattedApiError {
  status: number;
  title: string;
  detail: string;
  invalidParams?: { field: string; message: string }[];
  timestamp: string;
}

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const startedAt = Date.now();

  return next(req).pipe(
    catchError((error: unknown) => {
      const elapsed = Date.now() - startedAt;

      if (error instanceof HttpErrorResponse) {
        let formattedError: FormattedApiError;

        if (error.error && typeof error.error === 'object' && 'title' in error.error) {
          const problem = error.error as ProblemDetail;
          formattedError = {
            status: problem.status || error.status,
            title: problem.title || 'Erro na requisição',
            detail: problem.detail || error.message,
            invalidParams: problem.invalidParams,
            timestamp: problem.timestamp || new Date().toISOString(),
          };
        } else {
          formattedError = {
            status: error.status,
            title: resolveDefaultTitle(error.status),
            detail: typeof error.error === 'string' ? error.error : error.message,
            timestamp: new Date().toISOString(),
          };
        }

        console.error(
          `[HTTP ${req.method}] ${req.urlWithParams} falhou com status ${formattedError.status} (${elapsed}ms):`,
          formattedError
        );

        return throwError(() => formattedError);
      }

      const unexpectedError: FormattedApiError = {
        status: 0,
        title: 'Erro Inesperado de Rede',
        detail: error instanceof Error ? error.message : 'Falha na comunicação com o servidor.',
        timestamp: new Date().toISOString(),
      };

      console.error(`[HTTP] Erro inesperado em ${req.url}:`, error);
      return throwError(() => unexpectedError);
    })
  );
};

function resolveDefaultTitle(status: number): string {
  switch (status) {
    case 400:
      return 'Requisição Inválida';
    case 401:
      return 'Não Autorizado';
    case 403:
      return 'Acesso Proibido';
    case 404:
      return 'Recurso Não Encontrado';
    case 409:
      return 'Conflito de Regra de Negócio';
    case 422:
      return 'Erro de Validação Contábil';
    case 500:
      return 'Erro Interno do Servidor';
    case 503:
      return 'Serviço de Mercado Indisponível';
    default:
      return `Falha HTTP ${status}`;
  }
}
