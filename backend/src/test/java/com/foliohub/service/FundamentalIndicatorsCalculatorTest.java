package com.foliohub.service;

import com.foliohub.infrastructure.client.FundamentalDataClient;
import com.foliohub.infrastructure.client.dto.FundamentalBalanceDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class FundamentalIndicatorsCalculatorTest {

    private FundamentalIndicatorsCalculator calculator;
    private FundamentalDataClient fundamentalDataClient;

    @BeforeEach
    void setUp() {
        calculator = new FundamentalIndicatorsCalculator();
        fundamentalDataClient = new FundamentalDataClient();
    }

    @Test
    @DisplayName("Deve calcular LPA = Lucro Líquido (12M) / Total de Ações e VPA = Patrimônio Líquido / Total de Ações")
    void shouldCalculateLpaAndVpaFromBalanceSheet() {
        BigDecimal netIncome12m = new BigDecimal("6275000000");
        BigDecimal equity = new BigDecimal("19937000000");
        BigDecimal totalShares = new BigDecimal("4197317998");

        BigDecimal lpa = calculator.calculateLpa(netIncome12m, totalShares, null);
        BigDecimal vpa = calculator.calculateVpa(equity, totalShares, null);

        assertThat(lpa).isEqualByComparingTo(new BigDecimal("1.4950"));
        assertThat(vpa).isEqualByComparingTo(new BigDecimal("4.7499"));
    }

    @Test
    @DisplayName("Deve calcular P/L = Cotação / LPA e P/VP = Cotação / VPA com 2 casas decimais")
    void shouldCalculatePeAndPvpUsingLiveQuote() {
        BigDecimal currentPrice = new BigDecimal("38.50");
        BigDecimal lpa = new BigDecimal("7.1000");
        BigDecimal vpa = new BigDecimal("32.4500");

        BigDecimal pe = calculator.calculatePriceEarnings(currentPrice, lpa, null);
        BigDecimal pvp = calculator.calculatePriceToBook(currentPrice, vpa, null);

        // 38.50 / 7.10 = 5.4225... -> 5.42
        assertThat(pe).isEqualByComparingTo(new BigDecimal("5.42"));
        // 38.50 / 32.45 = 1.1864... -> 1.19
        assertThat(pvp).isEqualByComparingTo(new BigDecimal("1.19"));
    }

    @Test
    @DisplayName("Deve calcular ROE = (Lucro Líquido / Patrimônio Líquido) * 100 e equivalência (LPA / VPA) * 100")
    void shouldCalculateRoeFromEquityOrPerShareIdentity() {
        BigDecimal netIncome = new BigDecimal("41470000000");
        BigDecimal equity = new BigDecimal("184612000000");

        BigDecimal roeFromTotals = calculator.calculateRoe(netIncome, equity, null, null, null);
        assertThat(roeFromTotals).isEqualByComparingTo(new BigDecimal("22.46"));

        BigDecimal lpa = new BigDecimal("4.23");
        BigDecimal vpa = new BigDecimal("18.83");
        BigDecimal roeFromPerShare = calculator.calculateRoe(null, null, lpa, vpa, null);
        assertThat(roeFromPerShare).isEqualByComparingTo(new BigDecimal("22.46"));
    }

    @Test
    @DisplayName("Deve calcular Dividend Yield (12M) = (Proventos 12M por Ação / Cotação Atual) * 100")
    void shouldCalculateDividendYieldDynamicallyAgainstPrice() {
        BigDecimal dividends12mPerShare = new BigDecimal("4.9500");
        BigDecimal currentPrice = new BigDecimal("36.10");

        BigDecimal dy = calculator.calculateDividendYield(dividends12mPerShare, currentPrice, null);

        // (4.95 / 36.10) * 100 = 13.71%
        assertThat(dy).isEqualByComparingTo(new BigDecimal("13.71"));
    }

    @Test
    @DisplayName("Deve calcular Margem Líquida = (Lucro Líquido / Receita Líquida) * 100 e Margem EBIT = (EBIT / Receita Líquida) * 100")
    void shouldCalculateNetMarginAndEbitMarginCorrectly() {
        BigDecimal netIncome = new BigDecimal("6275000000");
        BigDecimal ebit = new BigDecimal("7650000000");
        BigDecimal netRevenue = new BigDecimal("38250000000");

        BigDecimal netMargin = calculator.calculateNetMargin(netIncome, netRevenue, null);
        BigDecimal ebitMargin = calculator.calculateEbitMargin(ebit, netRevenue, null);

        // (6275 / 38250) * 100 = 16.41%
        assertThat(netMargin).isEqualByComparingTo(new BigDecimal("16.41"));
        // (7650 / 38250) * 100 = 20.00%
        assertThat(ebitMargin).isEqualByComparingTo(new BigDecimal("20.00"));
    }

    @Test
    @DisplayName("Deve calcular Dívida Líquida / EBIT = (Dívida Bruta - Disponibilidades) / EBIT")
    void shouldCalculateNetDebtToEbitCorrectly() {
        BigDecimal grossDebt = new BigDecimal("85200000000");
        BigDecimal cash = new BigDecimal("25800000000");
        BigDecimal ebit = new BigDecimal("68400000000");

        BigDecimal ratio = calculator.calculateNetDebtToEbit(grossDebt, cash, null, ebit, null);

        // (85.2B - 25.8B) / 68.4B = 59.4B / 68.4B = 0.87
        assertThat(ratio).isEqualByComparingTo(new BigDecimal("0.87"));
    }

    @Test
    @DisplayName("Deve calcular Preço Justo de Graham = sqrt(22.5 * LPA * VPA)")
    void shouldCalculateGrahamFairPrice() {
        BigDecimal lpa = new BigDecimal("8.50");
        BigDecimal vpa = new BigDecimal("30.69");

        BigDecimal graham = calculator.calculateGrahamFairPrice(lpa, vpa);

        // sqrt(22.5 * 8.50 * 30.69) = sqrt(5869.4625) = 76.6124... -> 76.61
        assertThat(graham).isEqualByComparingTo(new BigDecimal("76.61"));
    }

    @Test
    @DisplayName("Deve fazer parse correto do HTML estruturado do Fundamentus extraindo EBIT 12M, Margem EBIT e Dívida Líq./EBIT")
    void shouldParseFundamentusHtmlCorrectly() {
        String sampleHtml = """
                <table>
                  <tr>
                    <td class="label"><span class="txt">Papel</span></td>
                    <td class="data"><span class="txt">WEGE3</span></td>
                    <td class="label"><span class="txt">Cotação</span></td>
                    <td class="data"><span class="txt">52,80</span></td>
                  </tr>
                  <tr>
                    <td class="label"><span class="txt">Empresa</span></td>
                    <td class="data"><span class="txt">WEG SA ON</span></td>
                    <td class="label"><span class="txt">Nro. Ações</span></td>
                    <td class="data"><span class="txt">4.197.317.998</span></td>
                  </tr>
                  <tr>
                    <td class="label"><span class="txt">Valor de mercado</span></td>
                    <td class="data"><span class="txt">221.618.000.000</span></td>
                    <td class="label"><span class="txt">Valor da firma</span></td>
                    <td class="data"><span class="txt">216.818.000.000</span></td>
                  </tr>
                  <tr>
                    <td class="label"><span class="txt">P/L</span></td>
                    <td class="data"><span class="txt">35,44</span></td>
                    <td class="label"><span class="txt">LPA</span></td>
                    <td class="data"><span class="txt">1,49</span></td>
                  </tr>
                  <tr>
                    <td class="label"><span class="txt">P/VP</span></td>
                    <td class="data"><span class="txt">11,12</span></td>
                    <td class="label"><span class="txt">VPA</span></td>
                    <td class="data"><span class="txt">4,75</span></td>
                  </tr>
                  <tr>
                    <td class="label"><span class="help tips" title="Dividendo pago<br>por ação">?</span><span class="txt">Div. Yield</span></td>
                    <td class="data"><span class="txt">1,5%</span></td>
                    <td class="label"><span class="help tips" title="Retorno sobre<br>PL">?</span><span class="txt">ROE</span></td>
                    <td class="data"><span class="txt">31,4%</span></td>
                  </tr>
                  <tr>
                    <td class="label"><span class="txt">Marg. Líquida</span></td>
                    <td class="data"><span class="txt">16,4%</span></td>
                    <td class="label"><span class="help tips" title="EBIT dividido pela<br>Receita Líquida">?</span><span class="txt">Marg. EBIT</span></td>
                    <td class="data"><span class="txt">20,0%</span></td>
                  </tr>
                  <tr>
                    <td class="label"><span class="help tips" title="Retorno sobre<br>Capital Investido">?</span><span class="txt">ROIC</span></td>
                    <td class="data"><span class="txt">29,8%</span></td>
                    <td class="label"><span class="help tips" title="Lucro Operacional (<b>EBIT</b>)<br>12 meses">?</span><span class="txt">EBIT</span></td>
                    <td class="data"><span class="txt">7.650.000.000</span></td>
                  </tr>
                  <tr>
                    <td class="label"><span class="txt">Dív. Bruta</span></td>
                    <td class="data"><span class="txt">3.400.000.000</span></td>
                    <td class="label"><span class="txt">Disponibilidades</span></td>
                    <td class="data"><span class="txt">5.755.000.000</span></td>
                  </tr>
                  <tr>
                    <td class="label"><span class="txt">Patrim. Líq</span></td>
                    <td class="data"><span class="txt">19.937.000.000</span></td>
                    <td class="label"><span class="txt">Receita Líquida</span></td>
                    <td class="data"><span class="txt">38.250.000.000</span></td>
                  </tr>
                  <tr>
                    <td class="label"><span class="txt">Lucro Líquido</span></td>
                    <td class="data"><span class="txt">6.275.000.000</span></td>
                    <td class="label"><span class="txt">Lucro Líquido</span></td>
                    <td class="data"><span class="txt">1.580.000.000</span></td>
                  </tr>
                </table>
                """;

        Optional<FundamentalBalanceDto> parsed = fundamentalDataClient.parseFundamentusHtml("WEGE3", sampleHtml);
        assertThat(parsed).isPresent();
        FundamentalBalanceDto dto = parsed.get();

        assertThat(dto.lpa()).isEqualByComparingTo(new BigDecimal("1.49"));
        assertThat(dto.vpa()).isEqualByComparingTo(new BigDecimal("4.75"));
        // Deve ter preservado a 1ª coluna da DRE (12 meses: 6.275B) e não a de 3 meses (1.58B)
        assertThat(dto.netIncome12m()).isEqualByComparingTo(new BigDecimal("6275000000"));
        assertThat(dto.ebit12m()).isEqualByComparingTo(new BigDecimal("7650000000"));
        assertThat(dto.netDebt()).isEqualByComparingTo(new BigDecimal("-2355000000"));
        assertThat(dto.reportedEbitMarginPercent()).isEqualByComparingTo(new BigDecimal("20.0"));
        assertThat(dto.reportedNetDebtToEbit()).isEqualByComparingTo(new BigDecimal("-0.31"));
    }
}
