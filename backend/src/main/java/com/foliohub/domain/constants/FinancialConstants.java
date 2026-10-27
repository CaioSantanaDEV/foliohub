package com.foliohub.domain.constants;

import java.math.RoundingMode;

public final class FinancialConstants {

    private FinancialConstants() {
    }

    public static final int MONETARY_SCALE = 2;
    public static final int UNIT_PRICE_SCALE = 4;
    public static final int RATE_SCALE = 4;
    public static final int QUANTITY_SCALE = 4;
    public static final int INTERMEDIATE_CALCULATION_SCALE = 8;

    /**
     * O arredondamento bancário (Banker's Rounding) é obrigatório para evitar
     * viés acumulativo de centavos em sucessivas operações de compra/venda e cálculo de emolumentos.
     */
    public static final RoundingMode FINANCIAL_ROUNDING_MODE = RoundingMode.HALF_EVEN;
}
