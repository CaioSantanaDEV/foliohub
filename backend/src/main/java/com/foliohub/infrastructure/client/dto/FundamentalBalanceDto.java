package com.foliohub.infrastructure.client.dto;

import java.math.BigDecimal;

/**
 * Representa os dados contábeis estruturados do Balanço Patrimonial (ITR),
 * Demonstração do Resultado do Exercício (DRE acumulada 12 meses - LTM) e
 * múltiplos base extraídos dos demonstrativos oficiais da CVM/B3, Fundamentus e Status Invest.
 */
public record FundamentalBalanceDto(
        String ticker,
        String companyName,
        String sector,
        boolean isFii,
        BigDecimal referenceQuote,
        BigDecimal dayChangePercent,
        BigDecimal volume24hRaw,
        BigDecimal totalShares,
        BigDecimal marketCap,
        BigDecimal enterpriseValue,
        BigDecimal netRevenue12m,
        BigDecimal ebit12m,
        BigDecimal netIncome12m,
        BigDecimal grossDebt,
        BigDecimal cashAndEquivalents,
        BigDecimal netDebt,
        BigDecimal shareholdersEquity,
        BigDecimal lpa,
        BigDecimal vpa,
        BigDecimal dividendsPerShare12m,
        BigDecimal reportedPe,
        BigDecimal reportedPvp,
        BigDecimal reportedDyPercent,
        BigDecimal reportedRoePercent,
        BigDecimal reportedRoicPercent,
        BigDecimal reportedNetMarginPercent,
        BigDecimal reportedEbitMarginPercent,
        BigDecimal reportedNetDebtToEbit
) {
}
