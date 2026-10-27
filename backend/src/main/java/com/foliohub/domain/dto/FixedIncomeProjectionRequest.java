package com.foliohub.domain.dto;

import com.foliohub.domain.model.enums.FixedIncomeType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record FixedIncomeProjectionRequest(
        @NotNull(message = "O aporte inicial é obrigatório.")
        @DecimalMin(value = "0.00", message = "O aporte inicial não pode ser negativo.")
        BigDecimal initialAmount,

        @NotNull(message = "O aporte mensal recorrente é obrigatório.")
        @DecimalMin(value = "0.00", message = "O aporte recorrente não pode ser negativo.")
        BigDecimal monthlyContribution,

        @NotNull(message = "A taxa anual esperada é obrigatória.")
        @DecimalMin(value = "0.01", message = "A taxa anual deve ser maior que zero.")
        BigDecimal annualRatePercentage,

        @Min(value = 1, message = "O prazo em meses deve ser de no mínimo 1 mês.")
        int months,

        @NotNull(message = "O tipo do título é obrigatório.")
        FixedIncomeType type
) {
}
