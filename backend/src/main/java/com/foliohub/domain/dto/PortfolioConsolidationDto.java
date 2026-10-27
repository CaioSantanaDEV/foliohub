package com.foliohub.domain.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PortfolioConsolidationDto(
        UUID userId,
        BigDecimal totalInvested,
        BigDecimal totalMarketValue,
        BigDecimal totalProfitLossAmount,
        BigDecimal totalProfitLossPercentage,
        List<StockPositionDetailDto> positions,
        Instant consolidatedAt
) {
    public BigDecimal TotalCurrentValue() {
        return this.totalMarketValue;
    }
}
