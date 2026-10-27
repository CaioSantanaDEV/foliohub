package com.foliohub.service;

import com.foliohub.config.CacheConfig;
import com.foliohub.domain.constants.FinancialConstants;
import com.foliohub.domain.dto.MacroeconomicIndicatorsDto;
import com.foliohub.domain.dto.StockQuoteDto;
import com.foliohub.exception.MarketDataUnavailableException;
import com.foliohub.infrastructure.client.BacenSgsClient;
import com.foliohub.infrastructure.client.BrapiClient;
import com.foliohub.infrastructure.client.dto.BrapiStockResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Service
public class MarketDataService {

    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);

    private static final BigDecimal DEFAULT_CDI = new BigDecimal("10.5000");
    private static final BigDecimal DEFAULT_SELIC = new BigDecimal("10.5000");
    private static final BigDecimal DEFAULT_IPCA_12M = new BigDecimal("4.1200");

    private final BrapiClient brapiClient;
    private final BacenSgsClient bacenSgsClient;

    public MarketDataService(BrapiClient brapiClient, BacenSgsClient bacenSgsClient) {
        this.brapiClient = brapiClient;
        this.bacenSgsClient = bacenSgsClient;
    }

    @Cacheable(value = CacheConfig.STOCK_QUOTES_CACHE, key = "#ticker.trim().toUpperCase()")
    public StockQuoteDto getStockQuote(String ticker) {
        String normalizedTicker = ticker.trim().toUpperCase();

        BrapiStockResultDto result = brapiClient.fetchStockQuote(normalizedTicker)
                .orElseThrow(() -> new MarketDataUnavailableException(
                        "Cotação e indicadores indisponíveis para o ativo: " + normalizedTicker
                ));

        return new StockQuoteDto(
                result.symbol(),
                result.shortName() != null ? result.shortName() : normalizedTicker,
                scalePrice(result.regularMarketPrice()),
                scaleRatio(result.priceEarnings()),
                scaleRatio(result.priceToBook()),
                scaleRatio(result.returnOnEquity()),
                scaleRatio(result.dividendYield()),
                Instant.now()
        );
    }

    @Cacheable(value = CacheConfig.MACRO_INDICATORS_CACHE, key = "'macro-latest'")
    public MacroeconomicIndicatorsDto getMacroeconomicIndicators() {
        BigDecimal cdi = bacenSgsClient.fetchLatestSerieValue(BacenSgsClient.SERIE_CDI_ANUAL)
                .orElseGet(() -> {
                    log.warn("SGS/BACEN indisponível para CDI. Utilizando taxa de contingência.");
                    return DEFAULT_CDI;
                });

        BigDecimal selic = bacenSgsClient.fetchLatestSerieValue(BacenSgsClient.SERIE_SELIC_META)
                .orElseGet(() -> {
                    log.warn("SGS/BACEN indisponível para Selic. Utilizando taxa de contingência.");
                    return DEFAULT_SELIC;
                });

        BigDecimal ipca = bacenSgsClient.fetchLatestSerieValue(BacenSgsClient.SERIE_IPCA_12M)
                .orElseGet(() -> {
                    log.warn("SGS/BACEN indisponível para IPCA. Utilizando taxa de contingência.");
                    return DEFAULT_IPCA_12M;
                });

        return new MacroeconomicIndicatorsDto(
                cdi.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE),
                selic.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE),
                ipca.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE),
                LocalDate.now()
        );
    }

    private BigDecimal scalePrice(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        return value.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
    }

    private BigDecimal scaleRatio(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        return value.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
    }
}
