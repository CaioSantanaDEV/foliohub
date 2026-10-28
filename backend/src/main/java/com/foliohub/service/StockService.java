package com.foliohub.service;

import com.foliohub.config.CacheConfig;
import com.foliohub.domain.constants.FinancialConstants;
import com.foliohub.domain.dto.StockQuoteDto;
import com.foliohub.exception.MarketDataUnavailableException;
import com.foliohub.exception.ResourceNotFoundException;
import com.foliohub.infrastructure.client.BrapiClient;
import com.foliohub.infrastructure.client.FundamentalDataClient;
import com.foliohub.infrastructure.client.dto.BrapiStockResultDto;
import com.foliohub.infrastructure.client.dto.FundamentalBalanceDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

@Service
public class StockService {

    private static final Logger log = LoggerFactory.getLogger(StockService.class);

    private final BrapiClient brapiClient;
    private final FundamentalDataClient fundamentalDataClient;
    private final FundamentalIndicatorsCalculator calculator;

    public StockService(
            BrapiClient brapiClient,
            FundamentalDataClient fundamentalDataClient,
            FundamentalIndicatorsCalculator calculator
    ) {
        this.brapiClient = brapiClient;
        this.fundamentalDataClient = fundamentalDataClient;
        this.calculator = calculator;
    }

    /**
     * Consulta cotação em tempo real (Brapi) combinada com os demonstrativos contábeis
     * acumulados de 12 meses (Balanço Patrimonial / DRE CVM) e recalcula todos os múltiplos
     * fundamentalistas utilizando as equações padronizadas do mercado.
     */
    @Cacheable(value = CacheConfig.STOCK_QUOTES_CACHE, key = "#ticker.trim().toUpperCase()")
    public StockQuoteDto getStockQuote(String ticker) {
        String normalizedTicker = ticker.trim().toUpperCase();
        log.debug("Cache miss para o ativo {}. Consultando cotação e fundamentos contábeis...", normalizedTicker);

        Optional<FundamentalBalanceDto> balanceOpt = fundamentalDataClient.fetchFundamentalBalance(normalizedTicker);

        BrapiStockResultDto brapiResult = null;
        RuntimeException brapiError = null;
        try {
            brapiResult = brapiClient.fetchStockQuote(normalizedTicker);
        } catch (ResourceNotFoundException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            brapiError = ex;
            log.warn("Cotação live na Brapi falhou para {}: {}. Verificando contingência contábil...",
                    normalizedTicker, ex.getMessage());
        }

        if (brapiResult == null && balanceOpt.isEmpty()) {
            if (brapiError != null) {
                throw brapiError;
            }
            throw new MarketDataUnavailableException("Não foi possível obter dados de mercado para o ativo " + normalizedTicker);
        }

        return buildAccurateFundamentalQuote(normalizedTicker, brapiResult, balanceOpt.orElse(null));
    }

    private StockQuoteDto buildAccurateFundamentalQuote(
            String normalizedTicker,
            BrapiStockResultDto brapi,
            FundamentalBalanceDto balance
    ) {
        BrapiStockResultDto.DefaultKeyStatisticsDto stats = brapi != null ? brapi.defaultKeyStatistics() : null;
        BrapiStockResultDto.FinancialDataDto financials = brapi != null ? brapi.financialData() : null;

        BigDecimal rawPrice = firstNonNull(
                brapi != null ? brapi.regularMarketPrice() : null,
                balance != null ? balance.referenceQuote() : null
        );
        BigDecimal currentPrice = scalePrice(rawPrice);

        String cleanSymbol = (brapi != null && brapi.symbol() != null && !brapi.symbol().isBlank())
                ? brapi.symbol().trim().toUpperCase()
                : normalizedTicker;
        String rawName = (balance != null && balance.companyName() != null && !balance.companyName().isBlank())
                ? balance.companyName()
                : ((brapi != null && brapi.longName() != null) ? brapi.longName()
                : ((brapi != null && brapi.shortName() != null) ? brapi.shortName() : cleanSymbol));
        String sector = balance != null ? balance.sector() : null;

        // 1. Fundamentos por Ação: LPA e VPA (Prioridade para Balanço CVM)
        BigDecimal totalShares = firstNonNull(
                balance != null ? balance.totalShares() : null,
                stats != null ? stats.sharesOutstanding() : null
        );
        BigDecimal netIncome12m = firstNonNull(
                balance != null ? balance.netIncome12m() : null,
                stats != null ? stats.netIncomeToCommon() : null
        );
        BigDecimal bookEquity = balance != null ? balance.shareholdersEquity() : null;

        BigDecimal fallbackLpa = firstNonNull(
                balance != null ? balance.lpa() : null,
                stats != null ? stats.trailingEps() : null,
                brapi != null ? brapi.earningsPerShare() : null
        );
        BigDecimal lpa = calculator.calculateLpa(netIncome12m, totalShares, fallbackLpa);

        BigDecimal fallbackVpa = firstNonNull(
                balance != null ? balance.vpa() : null,
                stats != null ? stats.bookValue() : null
        );
        BigDecimal vpa = calculator.calculateVpa(bookEquity, totalShares, fallbackVpa);

        // 2. P/L = Cotação Atual (P) / LPA
        BigDecimal fallbackPe = firstNonNull(
                balance != null ? balance.reportedPe() : null,
                stats != null ? stats.trailingPE() : null,
                brapi != null ? brapi.priceEarnings() : null
        );
        BigDecimal priceEarnings = calculator.calculatePriceEarnings(currentPrice, lpa, fallbackPe);

        // 3. P/VP = Cotação Atual (P) / VPA
        BigDecimal fallbackPvp = firstNonNull(
                balance != null ? balance.reportedPvp() : null,
                stats != null ? stats.priceToBook() : null,
                brapi != null ? brapi.priceToBook() : null
        );
        BigDecimal priceToBook = calculator.calculatePriceToBook(currentPrice, vpa, fallbackPvp);

        // 4. Dividend Yield (12M) = (Proventos 12M por ação / Cotação Atual P) * 100
        BigDecimal dividendsPerShare12m = balance != null ? balance.dividendsPerShare12m() : null;
        BigDecimal fallbackDy = firstNonNull(
                balance != null ? balance.reportedDyPercent() : null,
                stats != null ? calculator.normalizeBrapiDecimalRateToPercent(stats.dividendYield()) : null,
                brapi != null ? calculator.normalizeBrapiDecimalRateToPercent(brapi.dividendYield()) : null
        );
        BigDecimal dividendYield = calculator.calculateDividendYield(dividendsPerShare12m, currentPrice, fallbackDy);

        // 5. ROE = (Lucro Líquido 12M / Patrimônio Líquido) * 100  [ou (LPA / VPA) * 100]
        BigDecimal fallbackRoe = firstNonNull(
                balance != null ? balance.reportedRoePercent() : null,
                financials != null ? calculator.normalizeBrapiDecimalRateToPercent(financials.returnOnEquity()) : null,
                brapi != null ? calculator.normalizeBrapiDecimalRateToPercent(brapi.returnOnEquity()) : null
        );
        BigDecimal returnOnEquity = calculator.calculateRoe(netIncome12m, bookEquity, lpa, vpa, fallbackRoe);

        // 6. Margem Líquida = (Lucro Líquido 12M / Receita Líquida 12M) * 100
        BigDecimal netRevenue12m = firstNonNull(
                balance != null ? balance.netRevenue12m() : null,
                financials != null ? financials.totalRevenue() : null
        );
        BigDecimal fallbackNetMargin = firstNonNull(
                balance != null && balance.reportedNetMarginPercent() != null
                        && balance.reportedNetMarginPercent().compareTo(BigDecimal.ZERO) != 0
                        ? balance.reportedNetMarginPercent() : null,
                financials != null ? calculator.normalizeBrapiDecimalRateToPercent(financials.profitMargins()) : null,
                stats != null ? calculator.normalizeBrapiDecimalRateToPercent(stats.profitMargins()) : null
        );
        BigDecimal netMargin = calculator.calculateNetMargin(netIncome12m, netRevenue12m, fallbackNetMargin);

        // 7. EBIT (12M), Margem EBIT e Dívida Líquida / EBIT (Opção 1 Recomendada)
        boolean isFinancialOrFii = (balance != null && balance.isFii())
                || (sector != null && sector.toLowerCase().contains("bancos"));

        BigDecimal ebit12m = isFinancialOrFii ? null : (balance != null ? balance.ebit12m() : null);

        BigDecimal fallbackEbitMargin = balance != null ? balance.reportedEbitMarginPercent() : null;
        BigDecimal ebitMargin = isFinancialOrFii ? null : calculator.calculateEbitMargin(
                ebit12m, netRevenue12m, fallbackEbitMargin
        );

        BigDecimal grossDebt = isFinancialOrFii ? null : firstNonNull(
                balance != null ? balance.grossDebt() : null,
                financials != null ? financials.totalDebt() : null
        );
        BigDecimal cash = isFinancialOrFii ? null : firstNonNull(
                balance != null ? balance.cashAndEquivalents() : null,
                financials != null ? financials.totalCash() : null
        );
        BigDecimal netDebt = isFinancialOrFii ? null : (balance != null ? balance.netDebt() : null);

        BigDecimal fallbackNetDebtToEbit = balance != null ? balance.reportedNetDebtToEbit() : null;
        BigDecimal netDebtToEbit = isFinancialOrFii ? null : calculator.calculateNetDebtToEbit(
                grossDebt, cash, netDebt, ebit12m, fallbackNetDebtToEbit
        );
        String ebitFormatted = calculator.formatCompactCurrency(ebit12m);

        // 8. ROIC e Preço Justo de Graham
        BigDecimal roic = isFinancialOrFii ? null : (balance != null ? scalePrice(balance.reportedRoicPercent()) : null);
        BigDecimal grahamFairPrice = isFinancialOrFii ? null : calculator.calculateGrahamFairPrice(lpa, vpa);

        // 9. Valor de Mercado congruente com a Cotação Atual (Cotação * Total de Ações)
        BigDecimal marketCapRaw = firstNonNull(
                currentPrice != null && totalShares != null && totalShares.compareTo(BigDecimal.ZERO) > 0
                        ? currentPrice.multiply(totalShares).setScale(0, FinancialConstants.FINANCIAL_ROUNDING_MODE) : null,
                balance != null ? balance.marketCap() : null,
                brapi != null ? brapi.marketCap() : null
        );

        // 10. Volume Financeiro em Reais (Quantidade de ações negociadas * Cotação Atual, ou Vol $ méd CVM)
        BigDecimal brapiSharesVolume = brapi != null ? brapi.regularMarketVolume() : null;
        BigDecimal volumeRaw;
        if (brapiSharesVolume != null && brapiSharesVolume.compareTo(BigDecimal.ZERO) > 0 && currentPrice != null) {
            volumeRaw = brapiSharesVolume.multiply(currentPrice)
                    .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        } else {
            volumeRaw = balance != null ? balance.volume24hRaw() : null;
        }

        String volumeFormatted = calculator.formatCompactCurrency(volumeRaw);
        String marketCapFormatted = calculator.formatCompactCurrency(marketCapRaw);

        BigDecimal dayLow = scalePrice(firstNonNull(brapi != null ? brapi.regularMarketDayLow() : null, currentPrice));
        BigDecimal dayHigh = scalePrice(firstNonNull(brapi != null ? brapi.regularMarketDayHigh() : null, currentPrice));
        BigDecimal changePercent = scalePrice(firstNonNull(
                brapi != null ? brapi.regularMarketChangePercent() : null,
                balance != null ? balance.dayChangePercent() : null,
                BigDecimal.ZERO
        ));
        String marketTime = (brapi != null && brapi.regularMarketTime() != null)
                ? brapi.regularMarketTime()
                : Instant.now().toString();

        return new StockQuoteDto(
                cleanSymbol,
                cleanSymbol,
                rawName.trim(),
                rawName.trim(),
                sector,
                currentPrice,
                currentPrice,
                changePercent,
                marketTime,
                dayLow,
                dayHigh,
                priceEarnings,
                priceToBook,
                returnOnEquity,
                dividendYield,
                netMargin,
                ebitMargin,
                netDebtToEbit,
                lpa,
                vpa,
                roic,
                grahamFairPrice,
                ebit12m,
                ebitFormatted,
                volumeRaw,
                marketCapRaw,
                volumeFormatted,
                marketCapFormatted,
                Instant.now()
        );
    }

    @SafeVarargs
    private <T> T firstNonNull(T... values) {
        if (values == null) {
            return null;
        }
        for (T val : values) {
            if (val != null) {
                return val;
            }
        }
        return null;
    }

    private BigDecimal scalePrice(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
    }
}
