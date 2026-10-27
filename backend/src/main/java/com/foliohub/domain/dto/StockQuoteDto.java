package com.foliohub.domain.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record StockQuoteDto(
        String ticker,
        String companyName,
        BigDecimal currentPrice,
        BigDecimal priceEarnings,
        BigDecimal priceToBook,
        BigDecimal returnOnEquity,
        BigDecimal dividendYield,
        Instant updatedAt
) {
}
