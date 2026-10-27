package com.foliohub.repository;

import com.foliohub.domain.model.StockTransaction;
import com.foliohub.domain.model.enums.TransactionType;
import com.foliohub.repository.projection.StockPositionSummary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface StockTransactionRepository extends JpaRepository<StockTransaction, UUID> {

    List<StockTransaction> findByUserIdOrderByOperationDateDesc(UUID userId);

    Page<StockTransaction> findByUserId(UUID userId, Pageable pageable);

    List<StockTransaction> findByUserIdAndTickerOrderByOperationDateAsc(UUID userId, String ticker);

    List<StockTransaction> findByUserIdAndOperationDateBetweenOrderByOperationDateDesc(
            UUID userId,
            LocalDate startDate,
            LocalDate endDate
    );

    @Query("SELECT DISTINCT t.ticker FROM StockTransaction t WHERE t.user.id = :userId ORDER BY t.ticker ASC")
    List<String> findDistinctTickersByUserId(@Param("userId") UUID userId);

    @Query("""
        SELECT COALESCE(SUM(t.totalValue), 0.00)
        FROM StockTransaction t
        WHERE t.user.id = :userId AND t.type = :type
    """)
    BigDecimal sumTotalValueByUserIdAndType(
            @Param("userId") UUID userId,
            @Param("type") TransactionType type
    );

    /**
     * Consolida a posição líquida remanescente por ativo para conferência de custódia B3.
     */
    @Query("""
        SELECT new com.foliohub.repository.projection.StockPositionSummary(
            t.ticker,
            SUM(CASE WHEN t.type = com.foliohub.domain.model.enums.TransactionType.COMPRA THEN t.quantity ELSE -t.quantity END),
            SUM(CASE WHEN t.type = com.foliohub.domain.model.enums.TransactionType.COMPRA THEN t.totalValue ELSE -t.totalValue END)
        )
        FROM StockTransaction t
        WHERE t.user.id = :userId
        GROUP BY t.ticker
        HAVING SUM(CASE WHEN t.type = com.foliohub.domain.model.enums.TransactionType.COMPRA THEN t.quantity ELSE -t.quantity END) > 0
        ORDER BY t.ticker ASC
    """)
    List<StockPositionSummary> summarizeOpenPositionsByUserId(@Param("userId") UUID userId);
}
