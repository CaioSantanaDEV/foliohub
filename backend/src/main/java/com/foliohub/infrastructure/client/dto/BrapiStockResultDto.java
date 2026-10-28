package com.foliohub.infrastructure.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BrapiStockResultDto(
        String symbol,
        String shortName,
        String longName,
        String currency,
        BigDecimal regularMarketPrice,
        BigDecimal regularMarketChange,
        BigDecimal regularMarketChangePercent,
        String regularMarketTime,
        BigDecimal regularMarketDayLow,
        BigDecimal regularMarketDayHigh,
        @JsonProperty("priceEarnings") BigDecimal priceEarnings,
        @JsonProperty("priceToBook") BigDecimal priceToBook,
        @JsonProperty("returnOnEquity") BigDecimal returnOnEquity,
        @JsonProperty("dividendYield") BigDecimal dividendYield
) {
}
