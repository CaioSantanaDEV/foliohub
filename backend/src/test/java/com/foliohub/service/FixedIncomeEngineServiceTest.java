package com.foliohub.service;

import com.foliohub.domain.dto.FixedIncomeProjectionRequest;
import com.foliohub.domain.dto.FixedIncomeProjectionResponse;
import com.foliohub.domain.dto.FixedIncomeTaxCalculationDto;
import com.foliohub.domain.model.enums.FixedIncomeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class FixedIncomeEngineServiceTest {

    private FixedIncomeEngineService engineService;

    @BeforeEach
    void setUp() {
        engineService = new FixedIncomeEngineService();
    }

    @ParameterizedTest(name = "Prazo de {0} dias deve ter alíquota de {1}%")
    @CsvSource({
            "1, 22.50",
            "90, 22.50",
            "180, 22.50",
            "181, 20.00",
            "250, 20.00",
            "360, 20.00",
            "361, 17.50",
            "500, 17.50",
            "720, 17.50",
            "721, 15.00",
            "1000, 15.00"
    })
    @DisplayName("Deve retornar a alíquota correta da tabela regressiva para CDB")
    void shouldReturnCorrectRegressiveTaxRateForCdb(long days, String expectedRatePercent) {
        BigDecimal rate = engineService.calculateTaxRate(FixedIncomeType.CDB, days);
        BigDecimal expectedDecimal = new BigDecimal(expectedRatePercent).divide(new BigDecimal("100"));

        assertThat(rate).isEqualByComparingTo(expectedDecimal);
    }

    @Test
    @DisplayName("LCI e LCA devem ser rigorosamente isentas de Imposto de Renda")
    void lciAndLcaMustBeTaxExempt() {
        BigDecimal lciRate = engineService.calculateTaxRate(FixedIncomeType.LCI, 90);
        BigDecimal lcaRate = engineService.calculateTaxRate(FixedIncomeType.LCA, 750);

        assertThat(lciRate).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(lcaRate).isEqualByComparingTo(BigDecimal.ZERO);

        FixedIncomeTaxCalculationDto taxLci = engineService.calculateIncomeTax(
                FixedIncomeType.LCI, 100, new BigDecimal("1000.00")
        );
        assertThat(taxLci.exempt()).isTrue();
        assertThat(taxLci.taxAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Deve calcular o valor exato do imposto retido sobre o rendimento bruto")
    void shouldCalculateTaxAmountOnGrossProfit() {
        BigDecimal grossProfit = new BigDecimal("2000.00");

        // CDB com 200 dias de prazo -> alíquota de 20%
        FixedIncomeTaxCalculationDto result = engineService.calculateIncomeTax(
                FixedIncomeType.CDB, 200, grossProfit
        );

        assertThat(result.taxRatePercentage()).isEqualByComparingTo(new BigDecimal("20.00"));
        assertThat(result.taxAmount()).isEqualByComparingTo(new BigDecimal("400.00")); // 20% de 2000
        assertThat(result.exempt()).isFalse();
    }

    @Test
    @DisplayName("Quando o rendimento for zero ou negativo, o imposto retido deve ser zero")
    void shouldNotChargeTaxWhenProfitIsZeroOrNegative() {
        FixedIncomeTaxCalculationDto zeroProfit = engineService.calculateIncomeTax(
                FixedIncomeType.CDB, 100, BigDecimal.ZERO
        );
        assertThat(zeroProfit.taxAmount()).isEqualByComparingTo(BigDecimal.ZERO);

        FixedIncomeTaxCalculationDto negativeProfit = engineService.calculateIncomeTax(
                FixedIncomeType.CDB, 100, new BigDecimal("-150.00")
        );
        assertThat(negativeProfit.taxAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Deve projetar investimento com aportes recorrentes e abater o IR regressivo")
    void shouldProjectInvestmentWithRecurringContributionsAndDeductTax() {
        FixedIncomeProjectionRequest request = new FixedIncomeProjectionRequest(
                new BigDecimal("10000.00"), // Aporte inicial
                new BigDecimal("1000.00"),  // Aporte mensal
                new BigDecimal("12.00"),    // 12% a.a.
                12,                         // 12 meses (aprox 360 dias -> faixa de 20%)
                FixedIncomeType.CDB
        );

        FixedIncomeProjectionResponse projection = engineService.projectInvestment(request);

        // Total investido: 10.000 + 12 * 1.000 = 22.000,00
        assertThat(projection.totalInvested()).isEqualByComparingTo(new BigDecimal("22000.00"));
        assertThat(projection.grossAmount()).isGreaterThan(projection.totalInvested());
        assertThat(projection.grossProfit()).isGreaterThan(BigDecimal.ZERO);
        assertThat(projection.taxRatePercentage()).isEqualByComparingTo(new BigDecimal("20.00"));
        assertThat(projection.taxAmount()).isGreaterThan(BigDecimal.ZERO);
        assertThat(projection.netAmount()).isEqualTo(projection.grossAmount().subtract(projection.taxAmount()));
        assertThat(projection.netProfit()).isEqualTo(projection.netAmount().subtract(projection.totalInvested()));
    }
}
