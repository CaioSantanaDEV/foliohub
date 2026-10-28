package com.foliohub.domain.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public record StockPositionDetailDto(
        @JsonProperty("ticker") String ticker,
        @JsonProperty("companyName") String companyName,
        @JsonProperty("quantity") BigDecimal quantity,
        @JsonProperty("averagePrice") BigDecimal averagePrice,
        @JsonProperty("currentPrice") BigDecimal currentPrice,
        @JsonProperty("totalInvested") BigDecimal totalInvested,
        @JsonProperty("currentMarketValue") BigDecimal currentMarketValue,
        @JsonProperty("totalCurrentValue") BigDecimal totalCurrentValue,
        @JsonProperty("profitLossAmount") BigDecimal profitLossAmount,
        @JsonProperty("profitLossPercentage") BigDecimal profitLossPercentage,
        @JsonProperty("portfolioAllocationPercentage") BigDecimal portfolioAllocationPercentage
) {
    public StockPositionDetailDto(
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
        this(
                ticker,
                companyName,
                quantity,
                averagePrice,
                currentPrice,
                totalInvested,
                currentMarketValue,
                currentMarketValue,
                profitLossAmount,
                profitLossPercentage,
                portfolioAllocationPercentage
        );
    }
}
