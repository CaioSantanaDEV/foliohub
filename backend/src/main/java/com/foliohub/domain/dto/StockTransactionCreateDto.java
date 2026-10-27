package com.foliohub.domain.dto;

import com.foliohub.domain.model.enums.TransactionType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record StockTransactionCreateDto(
        @NotNull(message = "O ID do investidor titular é obrigatório.")
        UUID userId,

        @NotBlank(message = "O ticker do ativo B3 é obrigatório.")
        @Pattern(
                regexp = "^[A-Z]{4}(3|4|11|34)$",
                message = "Ticker B3 inválido. Padrão esperado: 4 letras seguidas de 3, 4, 11 ou 34 (ex: PETR4, VALE3, WEGE3, MXRF11, AAPL34)."
        )
        String ticker,

        @NotNull(message = "O tipo da operação (COMPRA ou VENDA) é obrigatório.")
        TransactionType type,

        @NotNull(message = "A quantidade de cotas/ações é obrigatória.")
        @DecimalMin(value = "0.0001", message = "A quantidade deve ser estritamente positiva.")
        BigDecimal quantity,

        @NotNull(message = "O preço unitário é obrigatório.")
        @DecimalMin(value = "0.0001", message = "O preço unitário de execução deve ser estritamente positivo.")
        BigDecimal unitPrice,

        @NotNull(message = "A data de liquidação/operação da ordem é obrigatória.")
        @PastOrPresent(message = "A data da operação não pode ser uma data futura.")
        LocalDate operationDate,

        @DecimalMin(value = "0.00", message = "A taxa de corretagem ou emolumentos não pode ser negativa.")
        BigDecimal brokerageFees
) {
        public StockTransactionCreateDto {
                if (ticker != null) {
                        ticker = ticker.trim().toUpperCase();
                }
                if (brokerageFees == null) {
                        brokerageFees = BigDecimal.ZERO;
                }
        }
}
