package com.foliohub.domain.dto;

import com.foliohub.domain.model.enums.FixedIncomeType;

import java.math.BigDecimal;

public record FixedIncomeTaxCalculationDto(
        long days,
        FixedIncomeType type,
        BigDecimal grossProfit,
        BigDecimal taxRatePercentage,
        BigDecimal taxAmount,
        boolean exempt
) {
}
