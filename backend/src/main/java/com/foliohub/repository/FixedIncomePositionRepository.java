package com.foliohub.repository;

import com.foliohub.domain.model.FixedIncomePosition;
import com.foliohub.domain.model.enums.FixedIncomeType;
import com.foliohub.domain.model.enums.IndexerType;
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
public interface FixedIncomePositionRepository extends JpaRepository<FixedIncomePosition, UUID> {

    List<FixedIncomePosition> findByUserIdOrderByDueDateAsc(UUID userId);

    List<FixedIncomePosition> findByUserIdAndActiveTrueOrderByDueDateAsc(UUID userId);

    Page<FixedIncomePosition> findByUserId(UUID userId, Pageable pageable);

    List<FixedIncomePosition> findByUserIdAndTypeAndActiveTrue(UUID userId, FixedIncomeType type);

    List<FixedIncomePosition> findByUserIdAndIndexerAndActiveTrue(UUID userId, IndexerType indexer);

    List<FixedIncomePosition> findByUserIdAndActiveTrueAndDueDateBetweenOrderByDueDateAsc(
            UUID userId,
            LocalDate startDate,
            LocalDate endDate
    );

    @Query("""
        SELECT COALESCE(SUM(f.investedAmount), 0.00)
        FROM FixedIncomePosition f
        WHERE f.user.id = :userId AND f.active = true
    """)
    BigDecimal sumTotalInvestedByUserId(@Param("userId") UUID userId);

    @Query("""
        SELECT COALESCE(SUM(f.currentAmount), 0.00)
        FROM FixedIncomePosition f
        WHERE f.user.id = :userId AND f.active = true
    """)
    BigDecimal sumTotalCurrentAmountByUserId(@Param("userId") UUID userId);
}
