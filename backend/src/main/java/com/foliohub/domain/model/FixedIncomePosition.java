package com.foliohub.domain.model;

import com.foliohub.domain.constants.FinancialConstants;
import com.foliohub.domain.model.enums.FixedIncomeType;
import com.foliohub.domain.model.enums.IndexerType;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
    name = "tb_fixed_income_positions",
    indexes = {
        @Index(name = "idx_fip_user_id", columnList = "user_id"),
        @Index(name = "idx_fip_type", columnList = "type"),
        @Index(name = "idx_fip_indexer", columnList = "indexer"),
        @Index(name = "idx_fip_due_date", columnList = "due_date"),
        @Index(name = "idx_fip_user_active", columnList = "user_id, active")
    }
)
public class FixedIncomePosition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotNull(message = "O investidor titular da posição é obrigatório.")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "user_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_fixed_income_user")
    )
    private User user;

    @NotBlank(message = "A descrição/nome do ativo é obrigatória.")
    @Size(max = 120, message = "O nome do ativo não pode exceder 120 caracteres.")
    @Column(name = "asset_name", nullable = false, length = 120)
    private String assetName;

    @Size(max = 100, message = "O nome da instituição emissora não pode exceder 100 caracteres.")
    @Column(name = "issuer", length = 100)
    private String issuer;

    @NotNull(message = "O tipo do título de Renda Fixa é obrigatório.")
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private FixedIncomeType type;

    @NotNull(message = "O indexador da taxa é obrigatório.")
    @Enumerated(EnumType.STRING)
    @Column(name = "indexer", nullable = false, length = 20)
    private IndexerType indexer;

    @NotNull(message = "A taxa/percentual contratado é obrigatória.")
    @DecimalMin(value = "0.0001", message = "A taxa contratada deve ser positiva.")
    @Column(name = "contracted_rate", nullable = false, precision = 10, scale = 4)
    private BigDecimal contractedRate;

    @NotNull(message = "O valor investido (aporte inicial) é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor investido deve ser maior que zero.")
    @Column(name = "invested_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal investedAmount;

    @NotNull(message = "O saldo atual/líquido estimado é obrigatório.")
    @DecimalMin(value = "0.00", message = "O saldo atual não pode ser negativo.")
    @Column(name = "current_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal currentAmount;

    @NotNull(message = "A data do aporte é obrigatória.")
    @Column(name = "investment_date", nullable = false)
    private LocalDate investmentDate;

    @NotNull(message = "A data de vencimento é obrigatória.")
    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public FixedIncomePosition() {
    }

    public FixedIncomePosition(User user,
                               String assetName,
                               String issuer,
                               FixedIncomeType type,
                               IndexerType indexer,
                               BigDecimal contractedRate,
                               BigDecimal investedAmount,
                               BigDecimal currentAmount,
                               LocalDate investmentDate,
                               LocalDate dueDate) {
        this.user = user;
        this.assetName = assetName;
        this.issuer = issuer;
        this.type = type;
        this.indexer = indexer;
        this.contractedRate = (contractedRate != null) ? contractedRate.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE) : null;
        this.investedAmount = (investedAmount != null) ? investedAmount.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE) : null;
        this.currentAmount = (currentAmount != null) ? currentAmount.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE) : this.investedAmount;
        this.investmentDate = investmentDate;
        this.dueDate = dueDate;
        this.active = true;
    }

    @PrePersist
    @PreUpdate
    public void ensureFinancialScaling() {
        if (this.contractedRate != null) {
            this.contractedRate = this.contractedRate.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        if (this.investedAmount != null) {
            this.investedAmount = this.investedAmount.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        if (this.currentAmount != null) {
            this.currentAmount = this.currentAmount.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        } else if (this.investedAmount != null) {
            this.currentAmount = this.investedAmount;
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

    public String getAssetName() {
        return assetName;
    }

    public void setAssetName(String assetName) {
        this.assetName = assetName;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public FixedIncomeType getType() {
        return type;
    }

    public void setType(FixedIncomeType type) {
        this.type = type;
    }

    public IndexerType getIndexer() {
        return indexer;
    }

    public void setIndexer(IndexerType indexer) {
        this.indexer = indexer;
    }

    public BigDecimal getContractedRate() {
        return contractedRate;
    }

    public void setContractedRate(BigDecimal contractedRate) {
        this.contractedRate = contractedRate;
    }

    public BigDecimal getInvestedAmount() {
        return investedAmount;
    }

    public void setInvestedAmount(BigDecimal investedAmount) {
        this.investedAmount = investedAmount;
    }

    public BigDecimal getCurrentAmount() {
        return currentAmount;
    }

    public void setCurrentAmount(BigDecimal currentAmount) {
        this.currentAmount = currentAmount;
    }

    public LocalDate getInvestmentDate() {
        return investmentDate;
    }

    public void setInvestmentDate(LocalDate investmentDate) {
        this.investmentDate = investmentDate;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FixedIncomePosition that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "FixedIncomePosition{" +
                "id=" + id +
                ", assetName='" + assetName + '\'' +
                ", type=" + type +
                ", indexer=" + indexer +
                ", contractedRate=" + contractedRate +
                ", investedAmount=" + investedAmount +
                ", investmentDate=" + investmentDate +
                ", dueDate=" + dueDate +
                '}';
    }
}
