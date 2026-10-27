package com.foliohub.domain.model;

import com.foliohub.domain.constants.FinancialConstants;
import com.foliohub.domain.model.enums.TransactionType;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
    name = "tb_stock_transactions",
    indexes = {
        @Index(name = "idx_st_user_id", columnList = "user_id"),
        @Index(name = "idx_st_ticker", columnList = "ticker"),
        @Index(name = "idx_st_user_ticker", columnList = "user_id, ticker"),
        @Index(name = "idx_st_date", columnList = "operation_date")
    }
)
public class StockTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotNull(message = "O investidor titular da transação é obrigatório.")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "user_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_stock_transaction_user")
    )
    private User user;

    @NotBlank(message = "O ticker do ativo B3 é obrigatório.")
    @Pattern(
        regexp = "^[A-Z0-9]{4,6}$",
        message = "O ticker deve seguir o padrão B3 (ex: PETR4, VALE3, WEGE3, MXRF11)."
    )
    @Column(name = "ticker", nullable = false, length = 10)
    private String ticker;

    @NotNull(message = "O tipo da transação (COMPRA ou VENDA) é obrigatório.")
    @Enumerated(EnumType.STRING)
    @Column(name = "operation_type", nullable = false, length = 10)
    private TransactionType type;

    @NotNull(message = "A quantidade de cotas/ações é obrigatória.")
    @DecimalMin(value = "0.0001", message = "A quantidade transacionada deve ser maior que zero.")
    @Column(name = "quantity", nullable = false, precision = 19, scale = 4)
    private BigDecimal quantity;

    @NotNull(message = "O preço unitário é obrigatório.")
    @DecimalMin(value = "0.0001", message = "O preço unitário deve ser maior que zero.")
    @Column(name = "unit_price", nullable = false, precision = 19, scale = 4)
    private BigDecimal unitPrice;

    @NotNull(message = "O valor total financeiro da operação é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor total da operação deve ser maior que zero.")
    @Column(name = "total_value", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalValue;

    @Column(name = "brokerage_fees", nullable = false, precision = 19, scale = 2)
    private BigDecimal brokerageFees = BigDecimal.ZERO.setScale(
        FinancialConstants.MONETARY_SCALE,
        FinancialConstants.FINANCIAL_ROUNDING_MODE
    );

    @NotNull(message = "A data da operação na B3 é obrigatória.")
    @Column(name = "operation_date", nullable = false)
    private LocalDate operationDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public StockTransaction() {
    }

    public StockTransaction(User user,
                            String ticker,
                            TransactionType type,
                            BigDecimal quantity,
                            BigDecimal unitPrice,
                            LocalDate operationDate) {
        this.user = user;
        this.ticker = (ticker != null) ? ticker.trim().toUpperCase() : null;
        this.type = type;
        this.quantity = (quantity != null) ? quantity.setScale(FinancialConstants.QUANTITY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE) : null;
        this.unitPrice = (unitPrice != null) ? unitPrice.setScale(FinancialConstants.UNIT_PRICE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE) : null;
        this.operationDate = operationDate;
        this.brokerageFees = BigDecimal.ZERO.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        this.totalValue = calculateTotalValue();
    }

    public BigDecimal calculateTotalValue() {
        if (this.unitPrice == null || this.quantity == null) {
            return BigDecimal.ZERO.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        return this.unitPrice
                .multiply(this.quantity)
                .setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
    }

    @PrePersist
    @PreUpdate
    public void ensureFinancialScaling() {
        if (this.ticker != null) {
            this.ticker = this.ticker.trim().toUpperCase();
        }
        if (this.quantity != null) {
            this.quantity = this.quantity.setScale(FinancialConstants.QUANTITY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        if (this.unitPrice != null) {
            this.unitPrice = this.unitPrice.setScale(FinancialConstants.UNIT_PRICE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        if (this.brokerageFees != null) {
            this.brokerageFees = this.brokerageFees.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        if (this.totalValue == null && this.unitPrice != null && this.quantity != null) {
            this.totalValue = calculateTotalValue();
        } else if (this.totalValue != null) {
            this.totalValue = this.totalValue.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = (ticker != null) ? ticker.trim().toUpperCase() : null;
    }

    public TransactionType getType() {
        return type;
    }

    public void setType(TransactionType type) {
        this.type = type;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getTotalValue() {
        return totalValue;
    }

    public void setTotalValue(BigDecimal totalValue) {
        this.totalValue = totalValue;
    }

    public BigDecimal getBrokerageFees() {
        return brokerageFees;
    }

    public void setBrokerageFees(BigDecimal brokerageFees) {
        this.brokerageFees = brokerageFees;
    }

    public LocalDate getOperationDate() {
        return operationDate;
    }

    public void setOperationDate(LocalDate operationDate) {
        this.operationDate = operationDate;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StockTransaction that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "StockTransaction{" +
                "id=" + id +
                ", ticker='" + ticker + '\'' +
                ", type=" + type +
                ", quantity=" + quantity +
                ", unitPrice=" + unitPrice +
                ", totalValue=" + totalValue +
                ", operationDate=" + operationDate +
                '}';
    }
}
