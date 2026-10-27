package com.foliohub.domain.dto;

import java.math.BigDecimal;

public record StockPositionDetailDto(
        String ticker,
        String companyName,
        BigDecimal quantity,
        BigDecimal averagePrice,
        BigDecimal currentPrice,
        BigDecimal totalInvested,
        BigDecimal currentMarketValue,
        BigDecimal profitLossAmount,
        BigDecimal profitLossPercentage,
        BigDecimal portfolioAllocationPercentage
) {
}
