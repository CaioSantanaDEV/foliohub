package com.foliohub.service;

import com.foliohub.config.CacheConfig;
import com.foliohub.domain.constants.FinancialConstants;
import com.foliohub.domain.dto.StockQuoteDto;
import com.foliohub.infrastructure.client.BrapiClient;
import com.foliohub.infrastructure.client.dto.BrapiStockResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class StockService {

    private static final Logger log = LoggerFactory.getLogger(StockService.class);

    private final BrapiClient brapiClient;

    public StockService(BrapiClient brapiClient) {
        this.brapiClient = brapiClient;
    }

    /**
     * Consulta dinâmica em tempo real da cotação e dados fundamentalistas na Brapi.
     * Utiliza cache com TTL de 15 minutos configurado no Spring Cache / Caffeine.
     * Sem nenhum mock ou dado fixo: falhas são propagadas para tratamento no GlobalExceptionHandler.
     */
    @Cacheable(value = CacheConfig.STOCK_QUOTES_CACHE, key = "#ticker.trim().toUpperCase()")
    public StockQuoteDto getStockQuote(String ticker) {
        String normalizedTicker = ticker.trim().toUpperCase();
        log.info("Obtendo cotação dinâmica na Brapi para o ativo: {}", normalizedTicker);

        BrapiStockResultDto result = brapiClient.fetchStockQuote(normalizedTicker);

        return StockQuoteDto.fromBrapi(
                result.symbol(),
                result.shortName() != null ? result.shortName() : result.longName(),
                scalePrice(result.regularMarketPrice()),
                scaleRatio(result.regularMarketChangePercent()),
                result.regularMarketTime(),
                scalePrice(result.regularMarketDayLow()),
                scalePrice(result.regularMarketDayHigh()),
                scaleRatio(result.priceEarnings()),
                scaleRatio(result.priceToBook()),
                scaleRatio(result.returnOnEquity()),
                scaleRatio(result.dividendYield())
        );
    }

    private BigDecimal scalePrice(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
    }

    private BigDecimal scaleRatio(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
    }
}
