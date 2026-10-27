package com.foliohub.domain.dto;

import com.foliohub.domain.model.enums.FixedIncomeType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record FixedIncomeSimulationRequestDto(
        @NotNull(message = "O tipo do ativo de renda fixa é obrigatório (CDB, LCI, LCA, TESOURO).")
        FixedIncomeType type,

        @NotNull(message = "O valor do aporte inicial é obrigatório.")
        @DecimalMin(value = "0.01", message = "O aporte inicial deve ser maior que zero.")
        BigDecimal initialAmount,

        @DecimalMin(value = "0.00", message = "O aporte mensal não pode ser negativo.")
        BigDecimal monthlyContribution,

        @NotNull(message = "A taxa anual contratada/esperada é obrigatória.")
        @DecimalMin(value = "0.01", message = "A taxa anual deve ser maior que zero.")
        BigDecimal annualRatePercentage,

        @NotNull(message = "O prazo em meses é obrigatório.")
        @Min(value = 1, message = "O prazo mínimo para simulação é de 1 mês.")
        @Max(value = 360, message = "O prazo máximo suportado para simulação é de 360 meses.")
        Integer months,

        @DecimalMin(value = "0.00", message = "A taxa de referência CDI anual para comparação não pode ser negativa.")
        BigDecimal benchmarkAnnualRatePercentage
) {
        public FixedIncomeSimulationRequestDto {
                if (monthlyContribution == null) {
                        monthlyContribution = BigDecimal.ZERO;
                }
                if (benchmarkAnnualRatePercentage == null) {
                        benchmarkAnnualRatePercentage = new BigDecimal("10.75");
                }
        }
}
