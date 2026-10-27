package com.foliohub.domain.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PortfolioSummaryDto(
        UUID userId,
        BigDecimal totalEquity,
        BigDecimal totalInvested,
        BigDecimal totalProfitLoss,
        BigDecimal totalProfitLossPercentage,
        BigDecimal stockEquity,
        BigDecimal stockPercentage,
        BigDecimal fixedIncomeEquity,
        BigDecimal fixedIncomePercentage,
        int activeStockPositionsCount,
        int activeFixedIncomeCount,
        Instant calculatedAt
) {
}
