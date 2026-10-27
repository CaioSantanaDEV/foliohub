package com.foliohub.service;

import com.foliohub.domain.constants.FinancialConstants;
import com.foliohub.domain.dto.PortfolioConsolidationDto;
import com.foliohub.domain.dto.StockPositionDetailDto;
import com.foliohub.domain.dto.StockQuoteDto;
import com.foliohub.domain.model.StockTransaction;
import com.foliohub.domain.model.enums.TransactionType;
import com.foliohub.repository.StockTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PortfolioService {

    private final StockTransactionRepository stockTransactionRepository;
    private final MarketDataService marketDataService;
    private final com.foliohub.repository.FixedIncomePositionRepository fixedIncomePositionRepository;

    public PortfolioService(StockTransactionRepository stockTransactionRepository,
                            MarketDataService marketDataService,
                            com.foliohub.repository.FixedIncomePositionRepository fixedIncomePositionRepository) {
        this.stockTransactionRepository = stockTransactionRepository;
        this.marketDataService = marketDataService;
        this.fixedIncomePositionRepository = fixedIncomePositionRepository;
    }

    /**
     * O Preço Médio ponderado incorpora taxas de corretagem no custo de aquisição.
     * Vendas parciais reduzem proporcionalmente a quantidade sem alterar o PM unitário restante.
     * Quando a posição é totalmente liquidada, o custo acumulado é zerado.
     */
    public BigDecimal calculateWeightedAveragePrice(List<StockTransaction> transactions) {
        if (transactions == null || transactions.isEmpty()) {
            return BigDecimal.ZERO.setScale(FinancialConstants.UNIT_PRICE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }

        List<StockTransaction> chronological = transactions.stream()
                .sorted(Comparator.comparing(StockTransaction::getOperationDate))
                .toList();

        BigDecimal runningQuantity = BigDecimal.ZERO.setScale(FinancialConstants.QUANTITY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        BigDecimal runningCost = BigDecimal.ZERO.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        BigDecimal averagePrice = BigDecimal.ZERO.setScale(FinancialConstants.UNIT_PRICE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        for (StockTransaction tx : chronological) {
            BigDecimal qty = tx.getQuantity();

            if (tx.getType() == TransactionType.COMPRA) {
                BigDecimal txCost = tx.getUnitPrice()
                        .multiply(qty)
                        .add(tx.getBrokerageFees() != null ? tx.getBrokerageFees() : BigDecimal.ZERO)
                        .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

                runningQuantity = runningQuantity.add(qty);
                runningCost = runningCost.add(txCost);

                if (runningQuantity.compareTo(BigDecimal.ZERO) > 0) {
                    averagePrice = runningCost.divide(
                            runningQuantity,
                            FinancialConstants.UNIT_PRICE_SCALE,
                            FinancialConstants.FINANCIAL_ROUNDING_MODE
                    );
                }
            } else if (tx.getType() == TransactionType.VENDA) {
                runningQuantity = runningQuantity.subtract(qty);

                if (runningQuantity.compareTo(BigDecimal.ZERO) <= 0) {
                    runningQuantity = BigDecimal.ZERO.setScale(FinancialConstants.QUANTITY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
                    runningCost = BigDecimal.ZERO.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
                    averagePrice = BigDecimal.ZERO.setScale(FinancialConstants.UNIT_PRICE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
                } else {
                    runningCost = runningQuantity.multiply(averagePrice)
                            .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
                }
            }
        }

        return averagePrice;
    }

    public StockPositionDetailDto calculatePositionForTicker(String ticker,
                                                             List<StockTransaction> transactions,
                                                             BigDecimal currentMarketPrice,
                                                             String companyName) {
        String normalizedTicker = ticker.trim().toUpperCase();

        List<StockTransaction> chronological = transactions.stream()
                .filter(t -> t.getTicker().equalsIgnoreCase(normalizedTicker))
                .sorted(Comparator.comparing(StockTransaction::getOperationDate))
                .toList();

        BigDecimal runningQuantity = BigDecimal.ZERO.setScale(FinancialConstants.QUANTITY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        BigDecimal runningCost = BigDecimal.ZERO.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        BigDecimal averagePrice = BigDecimal.ZERO.setScale(FinancialConstants.UNIT_PRICE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        for (StockTransaction tx : chronological) {
            BigDecimal qty = tx.getQuantity();

            if (tx.getType() == TransactionType.COMPRA) {
                BigDecimal txCost = tx.getUnitPrice()
                        .multiply(qty)
                        .add(tx.getBrokerageFees() != null ? tx.getBrokerageFees() : BigDecimal.ZERO)
                        .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

                runningQuantity = runningQuantity.add(qty);
                runningCost = runningCost.add(txCost);

                if (runningQuantity.compareTo(BigDecimal.ZERO) > 0) {
                    averagePrice = runningCost.divide(
                            runningQuantity,
                            FinancialConstants.UNIT_PRICE_SCALE,
                            FinancialConstants.FINANCIAL_ROUNDING_MODE
                    );
                }
            } else if (tx.getType() == TransactionType.VENDA) {
                runningQuantity = runningQuantity.subtract(qty);

                if (runningQuantity.compareTo(BigDecimal.ZERO) <= 0) {
                    runningQuantity = BigDecimal.ZERO.setScale(FinancialConstants.QUANTITY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
                    runningCost = BigDecimal.ZERO.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
                    averagePrice = BigDecimal.ZERO.setScale(FinancialConstants.UNIT_PRICE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
                } else {
                    runningCost = runningQuantity.multiply(averagePrice)
                            .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
                }
            }
        }

        BigDecimal currentPrice = currentMarketPrice != null
                ? currentMarketPrice.setScale(FinancialConstants.UNIT_PRICE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                : averagePrice;

        BigDecimal currentMarketValue = runningQuantity.multiply(currentPrice)
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal profitLossAmount = currentMarketValue.subtract(runningCost)
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal profitLossPercentage = runningCost.compareTo(BigDecimal.ZERO) > 0
                ? profitLossAmount.divide(runningCost, FinancialConstants.INTERMEDIATE_CALCULATION_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                        .multiply(new BigDecimal("100"))
                        .setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                : BigDecimal.ZERO.setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        return new StockPositionDetailDto(
                normalizedTicker,
                companyName != null ? companyName : normalizedTicker,
                runningQuantity,
                averagePrice,
                currentPrice,
                runningCost,
                currentMarketValue,
                profitLossAmount,
                profitLossPercentage,
                BigDecimal.ZERO
        );
    }

    @Transactional(readOnly = true)
    public PortfolioConsolidationDto consolidatePortfolio(UUID userId) {
        List<StockTransaction> allTransactions = stockTransactionRepository.findByUserIdOrderByOperationDateDesc(userId);

        Map<String, List<StockTransaction>> byTicker = allTransactions.stream()
                .collect(Collectors.groupingBy(t -> t.getTicker().toUpperCase().trim()));

        List<StockPositionDetailDto> activePositions = new ArrayList<>();
        BigDecimal totalInvested = BigDecimal.ZERO.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        BigDecimal totalMarketValue = BigDecimal.ZERO.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        for (Map.Entry<String, List<StockTransaction>> entry : byTicker.entrySet()) {
            String ticker = entry.getKey();
            List<StockTransaction> tickerTxs = entry.getValue();

            BigDecimal currentPrice;
            String companyName;

            try {
                StockQuoteDto quote = marketDataService.getStockQuote(ticker);
                currentPrice = quote.currentPrice();
                companyName = quote.companyName();
            } catch (Exception ex) {
                BigDecimal fallbackPM = calculateWeightedAveragePrice(tickerTxs);
                currentPrice = fallbackPM;
                companyName = ticker;
            }

            StockPositionDetailDto position = calculatePositionForTicker(ticker, tickerTxs, currentPrice, companyName);

            if (position.quantity().compareTo(BigDecimal.ZERO) > 0) {
                activePositions.add(position);
                totalInvested = totalInvested.add(position.totalInvested());
                totalMarketValue = totalMarketValue.add(position.currentMarketValue());
            }
        }

        BigDecimal finalTotalMarketValue = totalMarketValue;
        List<StockPositionDetailDto> positionsWithWeight = activePositions.stream()
                .map(pos -> {
                    BigDecimal weight = finalTotalMarketValue.compareTo(BigDecimal.ZERO) > 0
                            ? pos.currentMarketValue()
                                    .divide(finalTotalMarketValue, FinancialConstants.INTERMEDIATE_CALCULATION_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                                    .multiply(new BigDecimal("100"))
                                    .setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                            : BigDecimal.ZERO.setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE);

                    return new StockPositionDetailDto(
                            pos.ticker(),
                            pos.companyName(),
                            pos.quantity(),
                            pos.averagePrice(),
                            pos.currentPrice(),
                            pos.totalInvested(),
                            pos.currentMarketValue(),
                            pos.profitLossAmount(),
                            pos.profitLossPercentage(),
                            weight
                    );
                })
                .sorted(Comparator.comparing(StockPositionDetailDto::currentMarketValue).reversed())
                .toList();

        BigDecimal totalProfitLossAmount = totalMarketValue.subtract(totalInvested)
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal totalProfitLossPercentage = totalInvested.compareTo(BigDecimal.ZERO) > 0
                ? totalProfitLossAmount.divide(totalInvested, FinancialConstants.INTERMEDIATE_CALCULATION_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                        .multiply(new BigDecimal("100"))
                        .setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                : BigDecimal.ZERO.setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        return new PortfolioConsolidationDto(
                userId,
                totalInvested,
                totalMarketValue,
                totalProfitLossAmount,
                totalProfitLossPercentage,
                positionsWithWeight,
                Instant.now()
        );
    }

    @Transactional(readOnly = true)
    public com.foliohub.domain.dto.PortfolioSummaryDto getPortfolioSummary(UUID userId) {
        PortfolioConsolidationDto stockConsolidation = consolidatePortfolio(userId);

        List<com.foliohub.domain.model.FixedIncomePosition> fixedIncomePositions =
                fixedIncomePositionRepository.findByUserIdAndActiveTrueOrderByDueDateAsc(userId);

        BigDecimal fixedIncomeInvested = fixedIncomePositions.stream()
                .map(com.foliohub.domain.model.FixedIncomePosition::getInvestedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal fixedIncomeEquity = fixedIncomePositions.stream()
                .map(com.foliohub.domain.model.FixedIncomePosition::getCurrentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal stockEquity = stockConsolidation.TotalCurrentValue();
        BigDecimal stockInvested = stockConsolidation.totalInvested();

        BigDecimal totalEquity = stockEquity.add(fixedIncomeEquity)
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal totalInvested = stockInvested.add(fixedIncomeInvested)
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal totalProfitLoss = totalEquity.subtract(totalInvested)
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal totalProfitLossPercentage = totalInvested.compareTo(BigDecimal.ZERO) > 0
                ? totalProfitLoss.divide(totalInvested, FinancialConstants.INTERMEDIATE_CALCULATION_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                        .multiply(new BigDecimal("100"))
                        .setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                : BigDecimal.ZERO.setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal stockPercentage = totalEquity.compareTo(BigDecimal.ZERO) > 0
                ? stockEquity.divide(totalEquity, FinancialConstants.INTERMEDIATE_CALCULATION_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                        .multiply(new BigDecimal("100"))
                        .setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                : BigDecimal.ZERO.setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        BigDecimal fixedIncomePercentage = totalEquity.compareTo(BigDecimal.ZERO) > 0
                ? fixedIncomeEquity.divide(totalEquity, FinancialConstants.INTERMEDIATE_CALCULATION_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                        .multiply(new BigDecimal("100"))
                        .setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE)
                : BigDecimal.ZERO.setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        return new com.foliohub.domain.dto.PortfolioSummaryDto(
                userId,
                totalEquity,
                totalInvested,
                totalProfitLoss,
                totalProfitLossPercentage,
                stockEquity,
                stockPercentage,
                fixedIncomeEquity,
                fixedIncomePercentage,
                stockConsolidation.positions().size(),
                fixedIncomePositions.size(),
                Instant.now()
        );
    }
}
