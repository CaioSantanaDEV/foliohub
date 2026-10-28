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
        BigDecimal regularMarketVolume,
        BigDecimal marketCap,
        @JsonProperty("priceEarnings") BigDecimal priceEarnings,
        @JsonProperty("earningsPerShare") BigDecimal earningsPerShare,
        @JsonProperty("priceToBook") BigDecimal priceToBook,
        @JsonProperty("returnOnEquity") BigDecimal returnOnEquity,
        @JsonProperty("dividendYield") BigDecimal dividendYield,
        @JsonProperty("defaultKeyStatistics") DefaultKeyStatisticsDto defaultKeyStatistics,
        @JsonProperty("financialData") FinancialDataDto financialData
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DefaultKeyStatisticsDto(
            BigDecimal enterpriseValue,
            BigDecimal forwardPE,
            BigDecimal trailingPE,
            BigDecimal profitMargins,
            BigDecimal sharesOutstanding,
            BigDecimal bookValue,
            BigDecimal priceToBook,
            BigDecimal netIncomeToCommon,
            BigDecimal trailingEps,
            BigDecimal enterpriseToEbitda,
            BigDecimal dividendYield
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FinancialDataDto(
            BigDecimal currentPrice,
            BigDecimal totalCash,
            BigDecimal ebitda,
            BigDecimal totalDebt,
            BigDecimal totalRevenue,
            BigDecimal returnOnAssets,
            BigDecimal returnOnEquity,
            BigDecimal profitMargins,
            BigDecimal grossMargins,
            BigDecimal ebitdaMargins
    ) {
    }
}
