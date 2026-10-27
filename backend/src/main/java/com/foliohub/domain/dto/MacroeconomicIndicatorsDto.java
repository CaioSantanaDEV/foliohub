package com.foliohub.domain.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MacroeconomicIndicatorsDto(
        BigDecimal cdiRate,
        BigDecimal selicRate,
        BigDecimal ipcaRate12m,
        LocalDate referenceDate
) {
}
