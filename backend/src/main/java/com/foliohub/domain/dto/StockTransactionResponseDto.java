package com.foliohub.domain.dto;

import com.foliohub.domain.model.StockTransaction;
import com.foliohub.domain.model.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record StockTransactionResponseDto(
        UUID id,
        UUID userId,
        String ticker,
        TransactionType type,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal totalValue,
        BigDecimal brokerageFees,
        LocalDate operationDate,
        OffsetDateTime createdAt
) {
    public static StockTransactionResponseDto fromEntity(StockTransaction tx) {
        return new StockTransactionResponseDto(
                tx.getId(),
                tx.getUser() != null ? tx.getUser().getId() : null,
                tx.getTicker(),
                tx.getType(),
                tx.getQuantity(),
                tx.getUnitPrice(),
                tx.getTotalValue(),
                tx.getBrokerageFees(),
                tx.getOperationDate(),
                tx.getCreatedAt()
        );
    }
}
