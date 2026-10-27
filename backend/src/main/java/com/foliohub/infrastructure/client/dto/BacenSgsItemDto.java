package com.foliohub.infrastructure.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.math.RoundingMode;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BacenSgsItemDto(
        String data,
        String valor
) {
    public BigDecimal toBigDecimal() {
        if (valor == null || valor.isBlank()) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_EVEN);
        }
        return new BigDecimal(valor.trim().replace(",", "."))
                .setScale(4, RoundingMode.HALF_EVEN);
    }
}
