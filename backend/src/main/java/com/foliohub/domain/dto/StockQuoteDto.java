package com.foliohub.domain.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StockQuoteDto(
        @JsonProperty("symbol") String symbol,
        @JsonProperty("ticker") String ticker,
        @JsonProperty("shortName") String shortName,
        @JsonProperty("companyName") String companyName,
        @JsonProperty("regularMarketPrice") BigDecimal regularMarketPrice,
        @JsonProperty("currentPrice") BigDecimal currentPrice,
        @JsonProperty("regularMarketChangePercent") BigDecimal regularMarketChangePercent,
        @JsonProperty("regularMarketTime") String regularMarketTime,
        @JsonProperty("regularMarketDayLow") BigDecimal regularMarketDayLow,
        @JsonProperty("regularMarketDayHigh") BigDecimal regularMarketDayHigh,
        @JsonProperty("priceEarnings") BigDecimal priceEarnings,
        @JsonProperty("priceToBook") BigDecimal priceToBook,
        @JsonProperty("returnOnEquity") BigDecimal returnOnEquity,
        @JsonProperty("dividendYield") BigDecimal dividendYield,
        @JsonProperty("cachedAt") Instant cachedAt
) {

    public static StockQuoteDto fromBrapi(
            String symbol,
            String shortName,
            BigDecimal regularMarketPrice,
            BigDecimal regularMarketChangePercent,
            String regularMarketTime,
            BigDecimal regularMarketDayLow,
            BigDecimal regularMarketDayHigh,
            BigDecimal priceEarnings,
            BigDecimal priceToBook,
            BigDecimal returnOnEquity,
            BigDecimal dividendYield
    ) {
        String cleanSymbol = symbol != null ? symbol.trim().toUpperCase() : "";
        String cleanName = shortName != null ? shortName.trim() : cleanSymbol;

        return new StockQuoteDto(
                cleanSymbol,
                cleanSymbol,
                cleanName,
                cleanName,
                regularMarketPrice,
                regularMarketPrice,
                regularMarketChangePercent,
                regularMarketTime != null ? regularMarketTime : Instant.now().toString(),
                regularMarketDayLow,
                regularMarketDayHigh,
                priceEarnings,
                priceToBook,
                returnOnEquity,
                dividendYield,
                Instant.now()
        );
    }
}
