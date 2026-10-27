package com.foliohub.infrastructure.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BrapiStockResultDto(
        String symbol,
        String shortName,
        String longName,
        BigDecimal regularMarketPrice,
        @JsonProperty("priceEarnings") BigDecimal priceEarnings,
        @JsonProperty("priceToBook") BigDecimal priceToBook,
        @JsonProperty("returnOnEquity") BigDecimal returnOnEquity,
        @JsonProperty("dividendYield") BigDecimal dividendYield
) {
}
