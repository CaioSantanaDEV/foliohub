package com.foliohub.domain.dto;

import java.math.BigDecimal;

public record FixedIncomeProjectionResponse(
        BigDecimal totalInvested,
        BigDecimal grossAmount,
        BigDecimal grossProfit,
        BigDecimal taxRatePercentage,
        BigDecimal taxAmount,
        BigDecimal netAmount,
        BigDecimal netProfit,
        long totalDays,
        boolean exempt
) {
}
