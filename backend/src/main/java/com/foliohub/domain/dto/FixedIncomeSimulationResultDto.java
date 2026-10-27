package com.foliohub.domain.dto;

import com.foliohub.domain.model.enums.FixedIncomeType;

import java.math.BigDecimal;

public record FixedIncomeSimulationResultDto(
        FixedIncomeType type,
        BigDecimal totalInvested,
        BigDecimal grossAmount,
        BigDecimal grossProfit,
        BigDecimal taxRatePercentage,
        BigDecimal taxAmount,
        BigDecimal netAmount,
        BigDecimal netProfit,
        long estimatedDays,
        boolean taxExempt,
        BigDecimal benchmarkNetAmount,
        BigDecimal netAdvantageOverBenchmark
) {
}
