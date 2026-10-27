package com.foliohub.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final URI URI_VALIDATION_ERROR = URI.create("https://foliohub.com/errors/invalid-parameters");
    private static final URI URI_BUSINESS_RULE = URI.create("https://foliohub.com/errors/business-rule-violation");
    private static final URI URI_NOT_FOUND = URI.create("https://foliohub.com/errors/resource-not-found");
    private static final URI URI_MARKET_DATA = URI.create("https://foliohub.com/errors/market-data-unavailable");
    private static final URI URI_INTERNAL_ERROR = URI.create("https://foliohub.com/errors/internal-server-error");

    public record InvalidParameterDetail(String field, String message, Object rejectedValue) {}

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidationException(MethodArgumentNotValidException ex,
                                                                   HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setType(URI_VALIDATION_ERROR);
        problem.setTitle("Parâmetros de requisição inválidos");
        problem.setDetail("Um ou mais campos submetidos não atendem aos critérios de validação.");
        problem.setInstance(URI.create(request.getRequestURI()));

        List<InvalidParameterDetail> invalidParams = ex.getBindingResult().getFieldErrors().stream()
                .map(this::mapFieldError)
                .toList();

        problem.setProperty("invalidParameters", invalidParams);
        problem.setProperty("timestamp", Instant.now());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleConstraintViolation(ConstraintViolationException ex,
                                                                   HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setType(URI_VALIDATION_ERROR);
        problem.setTitle("Restrição de parâmetro violada");
        problem.setDetail(ex.getMessage());
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("timestamp", Instant.now());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ProblemDetail> handleBusinessRuleException(BusinessRuleException ex,
                                                                     HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.UNPROCESSABLE_ENTITY);
        problem.setType(URI_BUSINESS_RULE);
        problem.setTitle("Regra de negócio violada");
        problem.setDetail(ex.getMessage());
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("timestamp", Instant.now());

        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleResourceNotFoundException(ResourceNotFoundException ex,
                                                                         HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setType(URI_NOT_FOUND);
        problem.setTitle("Recurso não encontrado");
        problem.setDetail(ex.getMessage());
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("timestamp", Instant.now());

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(MarketDataUnavailableException.class)
    public ResponseEntity<ProblemDetail> handleMarketDataUnavailable(MarketDataUnavailableException ex,
                                                                     HttpServletRequest request) {
        log.warn("Serviço de cotações externas indisponível: {}", ex.getMessage());

        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.SERVICE_UNAVAILABLE);
        problem.setType(URI_MARKET_DATA);
        problem.setTitle("Serviço de mercado financeiro indisponível");
        problem.setDetail(ex.getMessage());
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("timestamp", Instant.now());

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(problem);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleMalformedJson(HttpMessageNotReadableException ex,
                                                             HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setType(URI_VALIDATION_ERROR);
        problem.setTitle("Corpo da requisição ilegível");
        problem.setDetail("O payload JSON está malformatado ou contém tipos incompatíveis (ex: enum ou valor numérico inválido).");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("timestamp", Instant.now());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGenericException(Exception ex,
                                                                HttpServletRequest request) {
        log.error("Exceção não tratada capturada pelo RestControllerAdvice", ex);

        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        problem.setType(URI_INTERNAL_ERROR);
        problem.setTitle("Erro interno no servidor");
        problem.setDetail("Ocorreu uma falha inesperada durante o processamento da solicitação.");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("timestamp", Instant.now());

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }

    private InvalidParameterDetail mapFieldError(FieldError fieldError) {
        return new InvalidParameterDetail(
                fieldError.getField(),
                fieldError.getDefaultMessage(),
                fieldError.getRejectedValue()
        );
    }
}
