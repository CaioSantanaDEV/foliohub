package com.foliohub.service;

import com.foliohub.domain.dto.StockPositionDetailDto;
import com.foliohub.domain.model.StockTransaction;
import com.foliohub.domain.model.User;
import com.foliohub.domain.model.enums.TransactionType;
import com.foliohub.repository.StockTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceTest {

    @Mock
    private StockTransactionRepository stockTransactionRepository;

    @Mock
    private StockService stockService;

    @Mock
    private com.foliohub.repository.FixedIncomePositionRepository fixedIncomePositionRepository;

    @InjectMocks
    private PortfolioService portfolioService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = new User(UUID.randomUUID(), "Investidor Teste", "teste@foliohub.com", "hash");
    }

    @Test
    @DisplayName("Deve calcular o Preço Médio ponderado com compras sucessivas sem taxas")
    void shouldCalculateWeightedAveragePriceForMultiplePurchases() {
        StockTransaction tx1 = new StockTransaction(
                sampleUser, "PETR4", TransactionType.COMPRA,
                new BigDecimal("100"), new BigDecimal("30.00"),
                LocalDate.of(2024, 1, 10)
        );

        StockTransaction tx2 = new StockTransaction(
                sampleUser, "PETR4", TransactionType.COMPRA,
                new BigDecimal("100"), new BigDecimal("40.00"),
                LocalDate.of(2024, 2, 10)
        );

        BigDecimal averagePrice = portfolioService.calculateWeightedAveragePrice(List.of(tx1, tx2));

        assertThat(averagePrice).isEqualByComparingTo(new BigDecimal("35.0000"));
    }

    @Test
    @DisplayName("Deve incorporar taxas de corretagem no custo total de aquisição do Preço Médio")
    void shouldIncludeBrokerageFeesInWeightedAveragePrice() {
        StockTransaction tx = new StockTransaction(
                sampleUser, "VALE3", TransactionType.COMPRA,
                new BigDecimal("100"), new BigDecimal("50.00"),
                LocalDate.of(2024, 1, 15)
        );
        tx.setBrokerageFees(new BigDecimal("10.00")); // Custo total: 5000 + 10 = 5010 / 100 = 50.1000

        BigDecimal averagePrice = portfolioService.calculateWeightedAveragePrice(List.of(tx));

        assertThat(averagePrice).isEqualByComparingTo(new BigDecimal("50.1000"));
    }

    @Test
    @DisplayName("Venda parcial não deve alterar o Preço Médio unitário das cotas restantes")
    void partialSaleShouldNotChangeAveragePriceOfRemainingShares() {
        StockTransaction buy1 = new StockTransaction(
                sampleUser, "WEGE3", TransactionType.COMPRA,
                new BigDecimal("200"), new BigDecimal("20.00"),
                LocalDate.of(2024, 1, 5)
        );

        StockTransaction sell = new StockTransaction(
                sampleUser, "WEGE3", TransactionType.VENDA,
                new BigDecimal("50"), new BigDecimal("35.00"),
                LocalDate.of(2024, 3, 10)
        );

        BigDecimal averagePrice = portfolioService.calculateWeightedAveragePrice(List.of(buy1, sell));

        assertThat(averagePrice).isEqualByComparingTo(new BigDecimal("20.0000"));
    }

    @Test
    @DisplayName("Zeragem total da posição deve reiniciar o Preço Médio para nova compra posterior")
    void completeLiquidationShouldResetAveragePrice() {
        StockTransaction buy1 = new StockTransaction(
                sampleUser, "ITUB4", TransactionType.COMPRA,
                new BigDecimal("100"), new BigDecimal("25.00"),
                LocalDate.of(2024, 1, 1)
        );

        StockTransaction sellAll = new StockTransaction(
                sampleUser, "ITUB4", TransactionType.VENDA,
                new BigDecimal("100"), new BigDecimal("32.00"),
                LocalDate.of(2024, 2, 1)
        );

        StockTransaction buyNew = new StockTransaction(
                sampleUser, "ITUB4", TransactionType.COMPRA,
                new BigDecimal("50"), new BigDecimal("30.00"),
                LocalDate.of(2024, 3, 1)
        );

        BigDecimal averagePrice = portfolioService.calculateWeightedAveragePrice(List.of(buy1, sellAll, buyNew));

        assertThat(averagePrice).isEqualByComparingTo(new BigDecimal("30.0000"));
    }

    @Test
    @DisplayName("Deve calcular saldo de mercado, lucro em R$ e rentabilidade percentual corretamente")
    void shouldCalculatePositionDetailsAndProfitLoss() {
        StockTransaction buy = new StockTransaction(
                sampleUser, "BBAS3", TransactionType.COMPRA,
                new BigDecimal("100"), new BigDecimal("25.00"),
                LocalDate.of(2024, 1, 10)
        );

        BigDecimal currentMarketPrice = new BigDecimal("30.00");

        StockPositionDetailDto position = portfolioService.calculatePositionForTicker(
                "BBAS3",
                List.of(buy),
                currentMarketPrice,
                "Banco do Brasil ON"
        );

        assertThat(position.quantity()).isEqualByComparingTo(new BigDecimal("100.0000"));
        assertThat(position.averagePrice()).isEqualByComparingTo(new BigDecimal("25.0000"));
        assertThat(position.totalInvested()).isEqualByComparingTo(new BigDecimal("2500.00"));
        assertThat(position.currentMarketValue()).isEqualByComparingTo(new BigDecimal("3000.00"));
        assertThat(position.profitLossAmount()).isEqualByComparingTo(new BigDecimal("500.00"));
        assertThat(position.profitLossPercentage()).isEqualByComparingTo(new BigDecimal("20.00"));
    }
}
