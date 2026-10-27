package com.foliohub.service;

import com.foliohub.domain.constants.FinancialConstants;
import com.foliohub.domain.dto.FixedIncomeProjectionRequest;
import com.foliohub.domain.dto.FixedIncomeProjectionResponse;
import com.foliohub.domain.dto.FixedIncomeTaxCalculationDto;
import com.foliohub.domain.model.enums.FixedIncomeType;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

@Service
public class FixedIncomeEngineService {

    private static final BigDecimal TAX_RATE_UP_TO_180_DAYS = new BigDecimal("0.2250");
    private static final BigDecimal TAX_RATE_181_TO_360_DAYS = new BigDecimal("0.2000");
    private static final BigDecimal TAX_RATE_361_TO_720_DAYS = new BigDecimal("0.1750");
    private static final BigDecimal TAX_RATE_ABOVE_720_DAYS = new BigDecimal("0.1500");

    private static final BigDecimal PERCENT_100 = new BigDecimal("100");

    /**
     * Aplica a tabela regressiva da Lei nº 11.033/2004 sobre investimentos em renda fixa.
     * Títulos como LCI e LCA são isentos de IR para pessoa física.
     */
    public BigDecimal calculateTaxRate(FixedIncomeType type, long days) {
        if (type == FixedIncomeType.LCI || type == FixedIncomeType.LCA) {
            return BigDecimal.ZERO.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }

        if (days <= 180) {
            return TAX_RATE_UP_TO_180_DAYS;
        } else if (days <= 360) {
            return TAX_RATE_181_TO_360_DAYS;
        } else if (days <= 720) {
            return TAX_RATE_361_TO_720_DAYS;
        } else {
            return TAX_RATE_ABOVE_720_DAYS;
        }
    }

    /**
     * O imposto de renda retido na fonte incide estritamente sobre o rendimento nominal positivo.
     */
    public FixedIncomeTaxCalculationDto calculateIncomeTax(FixedIncomeType type, long days, BigDecimal grossProfit) {
        boolean exempt = (type == FixedIncomeType.LCI || type == FixedIncomeType.LCA);
        BigDecimal taxRate = calculateTaxRate(type, days);

        BigDecimal profit = grossProfit != null && grossProfit.compareTo(BigDecimal.ZERO) > 0
                ? grossProfit
                : BigDecimal.ZERO.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal taxAmount = exempt
                ? BigDecimal.ZERO.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                : profit.multiply(taxRate).setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal taxRatePercentage = taxRate.multiply(PERCENT_100)
                .setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        return new FixedIncomeTaxCalculationDto(
                days,
                type,
                profit,
                taxRatePercentage,
                taxAmount,
                exempt
        );
    }

    /**
     * Projeta o saldo acumulado composto aplicando taxa mensal equivalente.
     * Os aportes recorrentes são capitalizados a cada virada de mês.
     */
    public FixedIncomeProjectionResponse projectInvestment(FixedIncomeProjectionRequest request) {
        BigDecimal initial = request.initialAmount()
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        BigDecimal monthlyContribution = request.monthlyContribution()
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        int months = request.months();
        long estimatedDays = (long) months * 30;

        // Conversão da taxa anual para mensal equivalente composta: (1 + i_ano)^(1/12) - 1
        BigDecimal annualRateDecimal = request.annualRatePercentage()
                .divide(PERCENT_100, FinancialConstants.INTERMEDIATE_CALCULATION_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        double monthlyRateDouble = Math.pow(1.0 + annualRateDecimal.doubleValue(), 1.0 / 12.0) - 1.0;
        BigDecimal monthlyRate = BigDecimal.valueOf(monthlyRateDouble)
                .setScale(FinancialConstants.INTERMEDIATE_CALCULATION_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal runningBalance = initial;
        BigDecimal totalInvested = initial;

        for (int m = 1; m <= months; m++) {
            BigDecimal interest = runningBalance.multiply(monthlyRate, MathContext.DECIMAL64);
            runningBalance = runningBalance.add(interest).add(monthlyContribution);
            totalInvested = totalInvested.add(monthlyContribution);
        }

        BigDecimal grossAmount = runningBalance.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        BigDecimal totalInvestedFinal = totalInvested.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal grossProfit = grossAmount.subtract(totalInvestedFinal)
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        FixedIncomeTaxCalculationDto taxCalculation = calculateIncomeTax(request.type(), estimatedDays, grossProfit);

        BigDecimal netAmount = grossAmount.subtract(taxCalculation.taxAmount())
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal netProfit = netAmount.subtract(totalInvestedFinal)
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        return new FixedIncomeProjectionResponse(
                totalInvestedFinal,
                grossAmount,
                grossProfit,
                taxCalculation.taxRatePercentage(),
                taxCalculation.taxAmount(),
                netAmount,
                netProfit,
                estimatedDays,
                taxCalculation.exempt()
        );
    }
}
