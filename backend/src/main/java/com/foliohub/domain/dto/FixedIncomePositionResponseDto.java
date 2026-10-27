package com.foliohub.domain.dto;

import com.foliohub.domain.model.FixedIncomePosition;
import com.foliohub.domain.model.enums.FixedIncomeType;
import com.foliohub.domain.model.enums.IndexerType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record FixedIncomePositionResponseDto(
        UUID id,
        UUID userId,
        String assetName,
        String issuer,
        FixedIncomeType type,
        IndexerType indexer,
        BigDecimal contractedRate,
        BigDecimal investedAmount,
        BigDecimal currentAmount,
        LocalDate investmentDate,
        LocalDate dueDate,
        boolean taxExempt,
        boolean active,
        OffsetDateTime createdAt
) {
    public static FixedIncomePositionResponseDto fromEntity(FixedIncomePosition pos) {
        boolean isTaxExempt = pos.getType() == FixedIncomeType.LCI || pos.getType() == FixedIncomeType.LCA;
        return new FixedIncomePositionResponseDto(
                pos.getId(),
                pos.getUser() != null ? pos.getUser().getId() : null,
                pos.getAssetName(),
                pos.getIssuer(),
                pos.getType(),
                pos.getIndexer(),
                pos.getContractedRate(),
                pos.getInvestedAmount(),
                pos.getCurrentAmount(),
                pos.getInvestmentDate(),
                pos.getDueDate(),
                isTaxExempt,
                pos.isActive(),
                pos.getCreatedAt()
        );
    }
}
