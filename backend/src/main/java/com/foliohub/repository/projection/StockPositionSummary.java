package com.foliohub.repository.projection;

import java.math.BigDecimal;

public record StockPositionSummary(
    String ticker,
    BigDecimal totalQuantity,
    BigDecimal netFinancialInvested
) {
}
