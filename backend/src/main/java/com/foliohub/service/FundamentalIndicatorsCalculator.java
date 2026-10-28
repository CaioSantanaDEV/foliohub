package com.foliohub.service;

import com.foliohub.domain.constants.FinancialConstants;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;

/**
 * Motor de cálculo de indicadores fundamentalistas seguindo estritamente as equações
 * padronizadas pelas plataformas de análise de mercado (Status Invest, Fundamentus, Investidor10).
 *
 * Todas as divisões utilizam arredondamento bancário (RoundingMode.HALF_EVEN)
 * com 4 casas decimais para indicadores unitários por ação (LPA, VPA) e 2 casas decimais
 * para múltiplos e percentuais exibidos nos portais fundamentalistas.
 */
@Component
public class FundamentalIndicatorsCalculator {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final BigDecimal GRAHAM_MULTIPLIER = new BigDecimal("22.5");
    private static final BigDecimal ONE_BILLION = new BigDecimal("1000000000");
    private static final BigDecimal ONE_MILLION = new BigDecimal("1000000");
    private static final BigDecimal ONE_THOUSAND = new BigDecimal("1000");

    /**
     * LPA (Lucro Por Ação - 12M):
     * Equação: LPA = Lucro Líquido (12M) / Total de Ações (ex-tesouraria)
     */
    public BigDecimal calculateLpa(BigDecimal netIncome12m, BigDecimal totalShares, BigDecimal fallbackLpa) {
        if (netIncome12m != null && totalShares != null && totalShares.compareTo(BigDecimal.ZERO) > 0) {
            return netIncome12m.divide(
                    totalShares,
                    FinancialConstants.RATE_SCALE,
                    FinancialConstants.FINANCIAL_ROUNDING_MODE
            );
        }
        return scalePerShare(fallbackLpa);
    }

    /**
     * VPA (Valor Patrimonial por Ação):
     * Equação: VPA = Patrimônio Líquido / Total de Ações (ex-tesouraria)
     */
    public BigDecimal calculateVpa(BigDecimal shareholdersEquity, BigDecimal totalShares, BigDecimal fallbackVpa) {
        if (shareholdersEquity != null && totalShares != null && totalShares.compareTo(BigDecimal.ZERO) > 0) {
            return shareholdersEquity.divide(
                    totalShares,
                    FinancialConstants.RATE_SCALE,
                    FinancialConstants.FINANCIAL_ROUNDING_MODE
            );
        }
        return scalePerShare(fallbackVpa);
    }

    /**
     * P/L (Preço / Lucro):
     * Equação: P/L = Cotação Atual (P) / LPA (12M)
     */
    public BigDecimal calculatePriceEarnings(BigDecimal currentPrice, BigDecimal lpa, BigDecimal fallbackPe) {
        if (currentPrice != null && currentPrice.compareTo(BigDecimal.ZERO) > 0
                && lpa != null && lpa.compareTo(BigDecimal.ZERO) != 0) {
            return currentPrice.divide(
                    lpa,
                    FinancialConstants.MONETARY_SCALE,
                    FinancialConstants.FINANCIAL_ROUNDING_MODE
            );
        }
        return scaleIndicator(fallbackPe);
    }

    /**
     * P/VP (Preço / Valor Patrimonial):
     * Equação: P/VP = Cotação Atual (P) / VPA
     */
    public BigDecimal calculatePriceToBook(BigDecimal currentPrice, BigDecimal vpa, BigDecimal fallbackPvp) {
        if (currentPrice != null && currentPrice.compareTo(BigDecimal.ZERO) > 0
                && vpa != null && vpa.compareTo(BigDecimal.ZERO) > 0) {
            return currentPrice.divide(
                    vpa,
                    FinancialConstants.MONETARY_SCALE,
                    FinancialConstants.FINANCIAL_ROUNDING_MODE
            );
        }
        return scaleIndicator(fallbackPvp);
    }

    /**
     * DY (Dividend Yield 12M em %):
     * Equação: DY = (Proventos pagos por ação nos últimos 12M / Cotação Atual P) * 100
     */
    public BigDecimal calculateDividendYield(
            BigDecimal dividendsPerShare12m,
            BigDecimal currentPrice,
            BigDecimal fallbackDyPercent
    ) {
        if (dividendsPerShare12m != null && dividendsPerShare12m.compareTo(BigDecimal.ZERO) >= 0
                && currentPrice != null && currentPrice.compareTo(BigDecimal.ZERO) > 0) {
            return dividendsPerShare12m
                    .multiply(ONE_HUNDRED)
                    .divide(currentPrice, FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        return scaleIndicator(fallbackDyPercent);
    }

    /**
     * ROE (Return on Equity / Retorno sobre o Patrimônio Líquido em %):
     * Equação Primária: ROE = (Lucro Líquido 12M / Patrimônio Líquido) * 100
     * Identidade Equivalente por Ação: ROE = (LPA / VPA) * 100
     */
    public BigDecimal calculateRoe(
            BigDecimal netIncome12m,
            BigDecimal shareholdersEquity,
            BigDecimal lpa,
            BigDecimal vpa,
            BigDecimal fallbackRoePercent
    ) {
        if (netIncome12m != null && shareholdersEquity != null && shareholdersEquity.compareTo(BigDecimal.ZERO) > 0) {
            return netIncome12m
                    .multiply(ONE_HUNDRED)
                    .divide(shareholdersEquity, FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        if (lpa != null && vpa != null && vpa.compareTo(BigDecimal.ZERO) > 0) {
            return lpa
                    .multiply(ONE_HUNDRED)
                    .divide(vpa, FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        return scaleIndicator(fallbackRoePercent);
    }

    /**
     * Margem Líquida (em %):
     * Equação: Margem Líquida = (Lucro Líquido 12M / Receita Líquida 12M) * 100
     */
    public BigDecimal calculateNetMargin(
            BigDecimal netIncome12m,
            BigDecimal netRevenue12m,
            BigDecimal fallbackMarginPercent
    ) {
        if (netIncome12m != null && netRevenue12m != null && netRevenue12m.compareTo(BigDecimal.ZERO) > 0) {
            return netIncome12m
                    .multiply(ONE_HUNDRED)
                    .divide(netRevenue12m, FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        return scaleIndicator(fallbackMarginPercent);
    }

    /**
     * Margem EBIT (em %):
     * Equação: Margem EBIT = (EBIT 12M / Receita Líquida 12M) * 100
     */
    public BigDecimal calculateEbitMargin(
            BigDecimal ebit12m,
            BigDecimal netRevenue12m,
            BigDecimal fallbackEbitMarginPercent
    ) {
        if (ebit12m != null && netRevenue12m != null && netRevenue12m.compareTo(BigDecimal.ZERO) > 0) {
            return ebit12m
                    .multiply(ONE_HUNDRED)
                    .divide(netRevenue12m, FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        return scaleIndicator(fallbackEbitMarginPercent);
    }

    /**
     * Dívida Líquida / EBIT:
     * Equação:
     *   Dívida Líquida = Dívida Bruta - Disponibilidades (Caixa e Equivalentes)
     *   Dívida Líq. / EBIT = Dívida Líquida / EBIT (12M)
     */
    public BigDecimal calculateNetDebtToEbit(
            BigDecimal grossDebt,
            BigDecimal cashAndEquivalents,
            BigDecimal netDebtExplicit,
            BigDecimal ebit12m,
            BigDecimal fallbackRatio
    ) {
        BigDecimal resolvedNetDebt = netDebtExplicit;
        if (resolvedNetDebt == null && grossDebt != null && cashAndEquivalents != null) {
            resolvedNetDebt = grossDebt.subtract(cashAndEquivalents);
        }
        if (resolvedNetDebt != null && ebit12m != null && ebit12m.compareTo(BigDecimal.ZERO) != 0) {
            return resolvedNetDebt.divide(
                    ebit12m,
                    FinancialConstants.MONETARY_SCALE,
                    FinancialConstants.FINANCIAL_ROUNDING_MODE
            );
        }
        return scaleIndicator(fallbackRatio);
    }

    /**
     * Preço Justo de Benjamin Graham (Valor Intrínseco):
     * Equação Clássica: VI = sqrt(22.5 * LPA * VPA)
     * Aplicável somente quando LPA > 0 e VPA > 0.
     */
    public BigDecimal calculateGrahamFairPrice(BigDecimal lpa, BigDecimal vpa) {
        if (lpa == null || vpa == null || lpa.compareTo(BigDecimal.ZERO) <= 0 || vpa.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        BigDecimal product = GRAHAM_MULTIPLIER.multiply(lpa).multiply(vpa);
        BigDecimal sqrt = product.sqrt(MathContext.DECIMAL64);
        return sqrt.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
    }

    /**
     * Converte taxas fornecidas em razão decimal pela Brapi (ex: 0.245 -> 24.50%)
     * caso estejam no intervalo (-1.0, 1.0) estrito das métricas de financialData/defaultKeyStatistics.
     */
    public BigDecimal normalizeBrapiDecimalRateToPercent(BigDecimal rawRate) {
        if (rawRate == null) {
            return null;
        }
        if (rawRate.abs().compareTo(BigDecimal.ONE) <= 0) {
            return rawRate.multiply(ONE_HUNDRED)
                    .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        return rawRate.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
    }

    /**
     * Formata grandezas monetárias (Market Cap, Volume Financeiro, EBIT) no padrão compacto brasileiro:
     * Ex: R$ 501,2 Bi | R$ 840,5 Mi | R$ 450,0 Mil
     */
    public String formatCompactCurrency(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        BigDecimal abs = amount.abs();
        if (abs.compareTo(ONE_BILLION) >= 0) {
            BigDecimal billions = amount.divide(ONE_BILLION, 2, FinancialConstants.FINANCIAL_ROUNDING_MODE);
            return "R$ " + formatPtBrDecimal(billions, 2) + " Bi";
        }
        if (abs.compareTo(ONE_MILLION) >= 0) {
            BigDecimal millions = amount.divide(ONE_MILLION, 2, FinancialConstants.FINANCIAL_ROUNDING_MODE);
            return "R$ " + formatPtBrDecimal(millions, 2) + " Mi";
        }
        if (abs.compareTo(ONE_THOUSAND) >= 0) {
            BigDecimal thousands = amount.divide(ONE_THOUSAND, 2, FinancialConstants.FINANCIAL_ROUNDING_MODE);
            return "R$ " + formatPtBrDecimal(thousands, 2) + " Mil";
        }
        return "R$ " + formatPtBrDecimal(amount, 2);
    }

    private String formatPtBrDecimal(BigDecimal value, int decimals) {
        BigDecimal scaled = value.setScale(decimals, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        return scaled.toPlainString().replace('.', ',');
    }

    private BigDecimal scalePerShare(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
    }

    private BigDecimal scaleIndicator(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
    }
}
