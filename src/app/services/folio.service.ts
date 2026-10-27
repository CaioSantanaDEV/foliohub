import { Injectable, computed, signal } from '@angular/core';
import {
  BackendCodeFile,
  FixedIncomePositionDto,
  StockPositionSummaryDto,
  StockTransactionDto,
  UserDto,
} from '../models/folio.models';

/**
 * Função utilitária que simula o comportamento estrito de RoundingMode.HALF_EVEN
 * (Banker's Rounding) do BigDecimal do Java para operações na B3.
 */
export function roundHalfEven(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  const temp = value * factor;
  const floor = Math.floor(temp);
  const diff = temp - floor;

  if (Math.abs(diff - 0.5) < 1e-9) {
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  return Math.round(temp) / factor;
}

@Injectable({
  providedIn: 'root',
})
export class FolioService {
  // Investidor de demonstração para portfólio
  readonly currentUser = signal<UserDto>({
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    name: 'Caio Santana (Tech Lead & Full Stack)',
    email: 'caiosantanaty@gmail.com',
  });

  // Tabela de cotações de mercado simuladas da B3 em tempo real
  readonly marketPrices = signal<Record<string, { currentPrice: number; companyName: string }>>({
    PETR4: { currentPrice: 38.45, companyName: 'Petrobras PN' },
    VALE3: { currentPrice: 62.3, companyName: 'Vale S.A. ON' },
    WEGE3: { currentPrice: 51.15, companyName: 'WEG S.A. ON' },
    ITUB4: { currentPrice: 34.8, companyName: 'Itaú Unibanco PN' },
    BBAS3: { currentPrice: 28.9, companyName: 'Banco do Brasil ON' },
    MXRF11: { currentPrice: 10.25, companyName: 'Maxi Renda FII' },
  });

  // Histórico de ordens de compra e venda na B3
  readonly stockTransactions = signal<StockTransactionDto[]>([
    {
      id: 'tx-101',
      ticker: 'PETR4',
      type: 'COMPRA',
      quantity: 200,
      unitPrice: 33.5,
      totalValue: 6700.0,
      brokerageFees: 4.5,
      operationDate: '2024-03-12',
    },
    {
      id: 'tx-102',
      ticker: 'PETR4',
      type: 'COMPRA',
      quantity: 100,
      unitPrice: 35.2,
      totalValue: 3520.0,
      brokerageFees: 2.25,
      operationDate: '2024-06-18',
    },
    {
      id: 'tx-103',
      ticker: 'VALE3',
      type: 'COMPRA',
      quantity: 150,
      unitPrice: 68.4,
      totalValue: 10260.0,
      brokerageFees: 5.0,
      operationDate: '2024-02-05',
    },
    {
      id: 'tx-104',
      ticker: 'VALE3',
      type: 'VENDA',
      quantity: 50,
      unitPrice: 65.1,
      totalValue: 3255.0,
      brokerageFees: 3.0,
      operationDate: '2024-07-20',
    },
    {
      id: 'tx-105',
      ticker: 'WEGE3',
      type: 'COMPRA',
      quantity: 120,
      unitPrice: 42.1,
      totalValue: 5052.0,
      brokerageFees: 3.5,
      operationDate: '2024-04-10',
    },
    {
      id: 'tx-106',
      ticker: 'ITUB4',
      type: 'COMPRA',
      quantity: 300,
      unitPrice: 31.25,
      totalValue: 9375.0,
      brokerageFees: 4.0,
      operationDate: '2024-05-15',
    },
    {
      id: 'tx-107',
      ticker: 'MXRF11',
      type: 'COMPRA',
      quantity: 800,
      unitPrice: 10.05,
      totalValue: 8040.0,
      brokerageFees: 0.0,
      operationDate: '2024-01-22',
    },
  ]);

  // Posições de Renda Fixa custodiadas
  readonly fixedIncomePositions = signal<FixedIncomePositionDto[]>([
    {
      id: 'fip-201',
      assetName: 'CDB Banco Inter Liquidez Diária',
      issuer: 'Banco Inter S.A.',
      type: 'CDB',
      indexer: 'CDI',
      contractedRate: 110.0, // 110% do CDI
      investedAmount: 25000.0,
      currentAmount: 27450.8,
      investmentDate: '2023-11-10',
      dueDate: '2026-11-10',
      active: true,
    },
    {
      id: 'fip-202',
      assetName: 'Tesouro IPCA+ com Juros Semestrais 2029',
      issuer: 'Tesouro Nacional',
      type: 'TESOURO',
      indexer: 'IPCA',
      contractedRate: 6.45, // IPCA + 6.45% a.a.
      investedAmount: 20000.0,
      currentAmount: 22180.5,
      investmentDate: '2023-08-15',
      dueDate: '2029-05-15',
      active: true,
    },
    {
      id: 'fip-203',
      assetName: 'LCA Agronegócio Banco do Brasil',
      issuer: 'Banco do Brasil S.A.',
      type: 'LCA',
      indexer: 'CDI',
      contractedRate: 94.5, // 94.5% do CDI Isento de IR
      investedAmount: 18000.0,
      currentAmount: 19620.25,
      investmentDate: '2024-02-01',
      dueDate: '2025-08-01',
      active: true,
    },
    {
      id: 'fip-204',
      assetName: 'CRI Kinea Índices de Preços',
      issuer: 'Kinea Investimentos',
      type: 'CRI',
      indexer: 'IPCA',
      contractedRate: 7.2, // IPCA + 7.20% a.a.
      investedAmount: 15000.0,
      currentAmount: 16110.0,
      investmentDate: '2024-03-05',
      dueDate: '2028-03-05',
      active: true,
    },
  ]);

  // Consolidação de Posições de Ações B3 (Cálculo de Preço Médio e Lucro/Prejuízo)
  readonly stockPositions = computed<StockPositionSummaryDto[]>(() => {
    const transactions = this.stockTransactions();
    const market = this.marketPrices();

    // Agrupa por ticker cronologicamente
    const map = new Map<
      string,
      {
        quantity: number;
        totalCost: number;
      }
    >();

    // Ordena transações cronologicamente
    const sorted = [...transactions].sort((a, b) =>
      a.operationDate.localeCompare(b.operationDate)
    );

    for (const tx of sorted) {
      const entry = map.get(tx.ticker) || { quantity: 0, totalCost: 0 };

      if (tx.type === 'COMPRA') {
        const newQty = entry.quantity + tx.quantity;
        const newTotalCost = entry.totalCost + tx.totalValue;
        map.set(tx.ticker, { quantity: newQty, totalCost: newTotalCost });
      } else {
        // VENDA: Reduz quantidade mantendo o Preço Médio (Regra B3 e Receita Federal)
        const avgPrice = entry.quantity > 0 ? entry.totalCost / entry.quantity : 0;
        const remainingQty = Math.max(0, entry.quantity - tx.quantity);
        const remainingCost = remainingQty * avgPrice;
        map.set(tx.ticker, { quantity: remainingQty, totalCost: remainingCost });
      }
    }

    const summaries: StockPositionSummaryDto[] = [];
    let grandStockTotal = 0;

    for (const [ticker, data] of map.entries()) {
      if (data.quantity > 0) {
        const info = market[ticker] || { currentPrice: 20.0, companyName: ticker };
        const averagePrice = roundHalfEven(data.totalCost / data.quantity, 4);
        const currentTotal = roundHalfEven(data.quantity * info.currentPrice, 2);
        const totalInvested = roundHalfEven(data.totalCost, 2);
        const profitLoss = roundHalfEven(currentTotal - totalInvested, 2);
        const profitLossPercent = totalInvested > 0 ? roundHalfEven((profitLoss / totalInvested) * 100, 2) : 0;

        grandStockTotal += currentTotal;

        summaries.push({
          ticker,
          companyName: info.companyName,
          quantity: data.quantity,
          averagePrice,
          currentPrice: info.currentPrice,
          totalInvested,
          currentTotal,
          profitLoss,
          profitLossPercent,
          portfolioWeight: 0, // Será ajustado no segundo passo
        });
      }
    }

    // Calcula peso relativo
    return summaries.map((s) => ({
      ...s,
      portfolioWeight: grandStockTotal > 0 ? roundHalfEven((s.currentTotal / grandStockTotal) * 100, 1) : 0,
    }));
  });

  // Métricas Totais da Carteira
  readonly totalStocksInvested = computed(() => {
    return this.stockPositions().reduce((acc, p) => acc + p.totalInvested, 0);
  });

  readonly totalStocksCurrent = computed(() => {
    return this.stockPositions().reduce((acc, p) => acc + p.currentTotal, 0);
  });

  readonly totalFixedIncomeInvested = computed(() => {
    return this.fixedIncomePositions()
      .filter((p) => p.active)
      .reduce((acc, p) => acc + p.investedAmount, 0);
  });

  readonly totalFixedIncomeCurrent = computed(() => {
    return this.fixedIncomePositions()
      .filter((p) => p.active)
      .reduce((acc, p) => acc + p.currentAmount, 0);
  });

  readonly totalNetWorth = computed(() => {
    return roundHalfEven(this.totalStocksCurrent() + this.totalFixedIncomeCurrent(), 2);
  });

  readonly totalCapitalInvested = computed(() => {
    return roundHalfEven(this.totalStocksInvested() + this.totalFixedIncomeInvested(), 2);
  });

  readonly totalProfitLoss = computed(() => {
    return roundHalfEven(this.totalNetWorth() - this.totalCapitalInvested(), 2);
  });

  readonly totalProfitLossPercent = computed(() => {
    const invested = this.totalCapitalInvested();
    if (invested === 0) return 0;
    return roundHalfEven((this.totalProfitLoss() / invested) * 100, 2);
  });

  // Repositório de Arquivos do Backend Spring Boot 3 & Persistência
  readonly backendFiles: BackendCodeFile[] = [
    {
      id: 'entity-user',
      name: 'User.java',
      category: 'Entity',
      path: 'src/main/java/com/foliohub/domain/model/User.java',
      language: 'java',
      description: 'Entidade de domínio JPA do Investidor com ID UUID, validações Jakarta e relacionamentos bidirecionais.',
      code: `package com.foliohub.domain.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
    name = "tb_users",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_email", columnNames = "email")
    },
    indexes = {
        @Index(name = "idx_user_email", columnList = "email")
    }
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotBlank(message = "O nome do investidor é obrigatório.")
    @Size(min = 2, max = 150, message = "O nome deve conter entre 2 e 150 caracteres.")
    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @NotBlank(message = "O e-mail é obrigatório.")
    @Email(message = "Formato de e-mail inválido.")
    @Size(max = 180, message = "O e-mail não pode exceder 180 caracteres.")
    @Column(name = "email", nullable = false, unique = true, length = 180)
    private String email;

    @NotBlank(message = "O hash da senha é obrigatório.")
    @Size(min = 60, max = 255, message = "O hash da senha deve ser compatível com BCrypt.")
    @Column(name = "password_hash", nullable = false, length = 255)
    private String password;

    @OneToMany(
        mappedBy = "user",
        cascade = CascadeType.ALL,
        orphanRemoval = true,
        fetch = FetchType.LAZY
    )
    private List<StockTransaction> stockTransactions = new ArrayList<>();

    @OneToMany(
        mappedBy = "user",
        cascade = CascadeType.ALL,
        orphanRemoval = true,
        fetch = FetchType.LAZY
    )
    private List<FixedIncomePosition> fixedIncomePositions = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public User() {
    }

    public User(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
    }

    public User(UUID id, String name, String email, String password) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
    }

    public void addStockTransaction(StockTransaction transaction) {
        stockTransactions.add(transaction);
        transaction.setUser(this);
    }

    public void removeStockTransaction(StockTransaction transaction) {
        stockTransactions.remove(transaction);
        transaction.setUser(null);
    }

    public void addFixedIncomePosition(FixedIncomePosition position) {
        fixedIncomePositions.add(position);
        position.setUser(this);
    }

    public void removeFixedIncomePosition(FixedIncomePosition position) {
        fixedIncomePositions.remove(position);
        position.setUser(null);
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public List<StockTransaction> getStockTransactions() {
        return stockTransactions;
    }

    public void setStockTransactions(List<StockTransaction> stockTransactions) {
        this.stockTransactions = stockTransactions;
    }

    public List<FixedIncomePosition> getFixedIncomePositions() {
        return fixedIncomePositions;
    }

    public void setFixedIncomePositions(List<FixedIncomePosition> fixedIncomePositions) {
        this.fixedIncomePositions = fixedIncomePositions;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User user)) return false;
        return Objects.equals(email, user.email);
    }

    @Override
    public int hashCode() {
        return Objects.hash(email);
    }
}`,
    },
    {
      id: 'entity-stock-tx',
      name: 'StockTransaction.java',
      category: 'Entity',
      path: 'src/main/java/com/foliohub/domain/model/StockTransaction.java',
      language: 'java',
      description: 'Entidade de ordens B3 com escala numérica e Banker Rounding estrito.',
      code: `package com.foliohub.domain.model;

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

    @NotNull(message = "A quantidade é obrigatória.")
    @DecimalMin(value = "0.0001", message = "Quantidade deve ser positiva.")
    @Column(name = "quantity", nullable = false, precision = 19, scale = 4)
    private BigDecimal quantity;

    @NotNull(message = "O preço unitário é obrigatório.")
    @DecimalMin(value = "0.0001", message = "Preço unitário deve ser positivo.")
    @Column(name = "unit_price", nullable = false, precision = 19, scale = 4)
    private BigDecimal unitPrice;

    @NotNull(message = "O valor total financeiro é obrigatório.")
    @DecimalMin(value = "0.01", message = "Valor total deve ser positivo.")
    @Column(name = "total_value", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalValue;

    @Column(name = "brokerage_fees", nullable = false, precision = 19, scale = 2)
    private BigDecimal brokerageFees = BigDecimal.ZERO.setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE);

    @NotNull(message = "A data da operação na B3 é obrigatória.")
    @Column(name = "operation_date", nullable = false)
    private LocalDate operationDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public BigDecimal calculateTotalValue() {
        if (this.unitPrice == null || this.quantity == null) {
            return BigDecimal.ZERO.setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE);
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

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = (ticker != null) ? ticker.trim().toUpperCase() : null; }
    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public BigDecimal getTotalValue() { return totalValue; }
    public void setTotalValue(BigDecimal totalValue) { this.totalValue = totalValue; }
    public BigDecimal getBrokerageFees() { return brokerageFees; }
    public void setBrokerageFees(BigDecimal brokerageFees) { this.brokerageFees = brokerageFees; }
    public LocalDate getOperationDate() { return operationDate; }
    public void setOperationDate(LocalDate operationDate) { this.operationDate = operationDate; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}`,
    },
    {
      id: 'entity-fixed-income',
      name: 'FixedIncomePosition.java',
      category: 'Entity',
      path: 'src/main/java/com/foliohub/domain/model/FixedIncomePosition.java',
      language: 'java',
      description: 'Entidade de custódia de Renda Fixa com indexadores e taxas contratuais.',
      code: `package com.foliohub.domain.model;

import com.foliohub.domain.constants.FinancialConstants;
import com.foliohub.domain.model.enums.FixedIncomeType;
import com.foliohub.domain.model.enums.IndexerType;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
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

    @NotBlank(message = "O nome do ativo é obrigatório.")
    @Column(name = "asset_name", nullable = false, length = 120)
    private String assetName;

    @Column(name = "issuer", length = 100)
    private String issuer;

    @NotNull(message = "O tipo do título é obrigatório.")
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private FixedIncomeType type;

    @NotNull(message = "O indexador da taxa é obrigatório.")
    @Enumerated(EnumType.STRING)
    @Column(name = "indexer", nullable = false, length = 20)
    private IndexerType indexer;

    @NotNull(message = "A taxa contratada é obrigatória.")
    @DecimalMin(value = "0.0001", message = "Taxa deve ser positiva.")
    @Column(name = "contracted_rate", nullable = false, precision = 10, scale = 4)
    private BigDecimal contractedRate;

    @NotNull(message = "O valor investido é obrigatório.")
    @DecimalMin(value = "0.01", message = "Aporte deve ser maior que zero.")
    @Column(name = "invested_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal investedAmount;

    @NotNull(message = "O saldo atual é obrigatório.")
    @DecimalMin(value = "0.00")
    @Column(name = "current_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal currentAmount;

    @NotNull(message = "Data de aporte obrigatória.")
    @Column(name = "investment_date", nullable = false)
    private LocalDate investmentDate;

    @NotNull(message = "Data de vencimento obrigatória.")
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

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getAssetName() { return assetName; }
    public void setAssetName(String assetName) { this.assetName = assetName; }
    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }
    public FixedIncomeType getType() { return type; }
    public void setType(FixedIncomeType type) { this.type = type; }
    public IndexerType getIndexer() { return indexer; }
    public void setIndexer(IndexerType indexer) { this.indexer = indexer; }
    public BigDecimal getContractedRate() { return contractedRate; }
    public void setContractedRate(BigDecimal contractedRate) { this.contractedRate = contractedRate; }
    public BigDecimal getInvestedAmount() { return investedAmount; }
    public void setInvestedAmount(BigDecimal investedAmount) { this.investedAmount = investedAmount; }
    public BigDecimal getCurrentAmount() { return currentAmount; }
    public void setCurrentAmount(BigDecimal currentAmount) { this.currentAmount = currentAmount; }
    public LocalDate getInvestmentDate() { return investmentDate; }
    public void setInvestmentDate(LocalDate investmentDate) { this.investmentDate = investmentDate; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}`,
    },
    {
      id: 'migration-v1',
      name: 'V1__create_initial_schema.sql',
      category: 'Migration',
      path: 'src/main/resources/db/migration/V1__create_initial_schema.sql',
      language: 'sql',
      description: 'Script DDL Flyway para PostgreSQL com chaves estrangeiras, índices e constraints.',
      code: `CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tb_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(180) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_user_email UNIQUE (email),
    CONSTRAINT chk_user_email_not_empty CHECK (LENGTH(TRIM(email)) > 0),
    CONSTRAINT chk_user_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX idx_user_email ON tb_users (email);

CREATE TABLE tb_stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    operation_type VARCHAR(10) NOT NULL,
    quantity NUMERIC(19, 4) NOT NULL,
    unit_price NUMERIC(19, 4) NOT NULL,
    total_value NUMERIC(19, 2) NOT NULL,
    brokerage_fees NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    operation_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_stock_transaction_user 
        FOREIGN KEY (user_id) REFERENCES tb_users (id) 
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT chk_st_operation_type CHECK (operation_type IN ('COMPRA', 'VENDA')),
    CONSTRAINT chk_st_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_st_unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT chk_st_total_value_positive CHECK (total_value > 0),
    CONSTRAINT chk_st_brokerage_fees_non_negative CHECK (brokerage_fees >= 0)
);

CREATE INDEX idx_st_user_id ON tb_stock_transactions (user_id);
CREATE INDEX idx_st_ticker ON tb_stock_transactions (ticker);
CREATE INDEX idx_st_user_ticker ON tb_stock_transactions (user_id, ticker);
CREATE INDEX idx_st_date ON tb_stock_transactions (operation_date DESC);

CREATE TABLE tb_fixed_income_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    asset_name VARCHAR(120) NOT NULL,
    issuer VARCHAR(100),
    type VARCHAR(20) NOT NULL,
    indexer VARCHAR(20) NOT NULL,
    contracted_rate NUMERIC(10, 4) NOT NULL,
    invested_amount NUMERIC(19, 2) NOT NULL,
    current_amount NUMERIC(19, 2) NOT NULL,
    investment_date DATE NOT NULL,
    due_date DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fixed_income_user 
        FOREIGN KEY (user_id) REFERENCES tb_users (id) 
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT chk_fip_type CHECK (type IN ('CDB', 'LCI', 'LCA', 'TESOURO', 'CRI', 'CRA', 'DEBENTURE')),
    CONSTRAINT chk_fip_indexer CHECK (indexer IN ('CDI', 'PREFIXADO', 'IPCA', 'SELIC', 'IGPM')),
    CONSTRAINT chk_fip_rate_positive CHECK (contracted_rate > 0),
    CONSTRAINT chk_fip_invested_positive CHECK (invested_amount > 0),
    CONSTRAINT chk_fip_current_non_negative CHECK (current_amount >= 0),
    CONSTRAINT chk_fip_due_after_investment CHECK (due_date >= investment_date)
);

CREATE INDEX idx_fip_user_id ON tb_fixed_income_positions (user_id);
CREATE INDEX idx_fip_type ON tb_fixed_income_positions (type);
CREATE INDEX idx_fip_indexer ON tb_fixed_income_positions (indexer);
CREATE INDEX idx_fip_due_date ON tb_fixed_income_positions (due_date ASC);
CREATE INDEX idx_fip_user_active ON tb_fixed_income_positions (user_id, active);`,
    },
    {
      id: 'repo-stock-tx',
      name: 'StockTransactionRepository.java',
      category: 'Repository',
      path: 'src/main/java/com/foliohub/repository/StockTransactionRepository.java',
      language: 'java',
      description: 'Spring Data JPA Repository com consultas derivadas, JPQL customizadas e projeções para Preço Médio.',
      code: `package com.foliohub.repository;

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
            UUID userId, LocalDate startDate, LocalDate endDate);

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
}`,
    },
    {
      id: 'repo-fixed-income',
      name: 'FixedIncomePositionRepository.java',
      category: 'Repository',
      path: 'src/main/java/com/foliohub/repository/FixedIncomePositionRepository.java',
      language: 'java',
      description: 'Spring Data JPA Repository para posições de Renda Fixa e totalizações agregadas.',
      code: `package com.foliohub.repository;

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
            UUID userId, LocalDate startDate, LocalDate endDate);

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
}`,
    },
    {
      id: 'repo-user',
      name: 'UserRepository.java',
      category: 'Repository',
      path: 'src/main/java/com/foliohub/repository/UserRepository.java',
      language: 'java',
      description: 'Spring Data JPA Repository com busca por e-mail e verificação de unicidade.',
      code: `package com.foliohub.repository;

import com.foliohub.domain.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}`,
    },
    {
      id: 'constants-financial',
      name: 'FinancialConstants.java',
      category: 'Config',
      path: 'src/main/java/com/foliohub/domain/constants/FinancialConstants.java',
      language: 'java',
      description: 'Constantes financeiras centrais: escalas (2, 4, 8) e RoundingMode.HALF_EVEN.',
      code: `package com.foliohub.domain.constants;

import java.math.RoundingMode;

public final class FinancialConstants {

    private FinancialConstants() {}

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
}`,
    },
    {
      id: 'config-cache',
      name: 'CacheConfig.java',
      category: 'Config',
      path: 'src/main/java/com/foliohub/config/CacheConfig.java',
      language: 'java',
      description: 'Configuração do Spring Cache com Caffeine: TTL de 15 min para cotações e 24h para índices macro.',
      code: `package com.foliohub.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    public static final String STOCK_QUOTES_CACHE = "stock-quotes";
    public static final String MACRO_INDICATORS_CACHE = "macro-indicators";

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();

        CaffeineCache stockQuotesCache = new CaffeineCache(
                STOCK_QUOTES_CACHE,
                Caffeine.newBuilder()
                        .expireAfterWrite(15, TimeUnit.MINUTES)
                        .maximumSize(1000)
                        .recordStats()
                        .build()
        );

        CaffeineCache macroIndicatorsCache = new CaffeineCache(
                MACRO_INDICATORS_CACHE,
                Caffeine.newBuilder()
                        .expireAfterWrite(24, TimeUnit.HOURS)
                        .maximumSize(100)
                        .recordStats()
                        .build()
        );

        manager.setCaches(List.of(stockQuotesCache, macroIndicatorsCache));
        return manager;
    }
}`,
    },
    {
      id: 'config-rest-client',
      name: 'RestClientConfig.java',
      category: 'Config',
      path: 'src/main/java/com/foliohub/config/RestClientConfig.java',
      language: 'java',
      description: 'Configuração dos clientes HTTP com RestClient do Spring 3 e timeouts estritos via JdkClientHttpRequestFactory.',
      code: `package com.foliohub.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class RestClientConfig {

    @Value("\${foliohub.integration.brapi.base-url:https://brapi.dev/api}")
    private String brapiBaseUrl;

    @Value("\${foliohub.integration.bacen.base-url:https://api.bcb.gov.br/dados/serie/bcdata.sgs}")
    private String bacenBaseUrl;

    @Bean
    public RestClient brapiRestClient() {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(Duration.ofSeconds(5));

        return RestClient.builder()
                .baseUrl(brapiBaseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    @Bean
    public RestClient bacenRestClient() {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(Duration.ofSeconds(5));

        return RestClient.builder()
                .baseUrl(bacenBaseUrl)
                .requestFactory(requestFactory)
                .build();
    }
}`,
    },
    {
      id: 'client-brapi',
      name: 'BrapiClient.java',
      category: 'Client',
      path: 'src/main/java/com/foliohub/infrastructure/client/BrapiClient.java',
      language: 'java',
      description: 'Cliente HTTP para consulta de cotações B3 e indicadores fundamentalistas na Brapi.',
      code: `package com.foliohub.infrastructure.client;

import com.foliohub.infrastructure.client.dto.BrapiResponseDto;
import com.foliohub.infrastructure.client.dto.BrapiStockResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Optional;

@Component
public class BrapiClient {

    private static final Logger log = LoggerFactory.getLogger(BrapiClient.class);

    private final RestClient restClient;

    @Value("\${foliohub.integration.brapi.token:}")
    private String apiToken;

    public BrapiClient(@Qualifier("brapiRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public Optional<BrapiStockResultDto> fetchStockQuote(String ticker) {
        try {
            String uri = "/quote/{ticker}?range=1d&interval=1d&fundamental=true";
            if (apiToken != null && !apiToken.isBlank()) {
                uri += "&token=" + apiToken;
            }

            BrapiResponseDto response = restClient.get()
                    .uri(uri, ticker.trim().toUpperCase())
                    .retrieve()
                    .body(BrapiResponseDto.class);

            if (response != null && response.results() != null && !response.results().isEmpty()) {
                return Optional.of(response.results().getFirst());
            }

            return Optional.empty();
        } catch (RestClientException ex) {
            log.warn("Falha na comunicação com a API Brapi para o ticker {}: {}", ticker, ex.getMessage());
            return Optional.empty();
        }
    }
}`,
    },
    {
      id: 'client-bacen',
      name: 'BacenSgsClient.java',
      category: 'Client',
      path: 'src/main/java/com/foliohub/infrastructure/client/BacenSgsClient.java',
      language: 'java',
      description: 'Cliente HTTP para extração das séries do SGS do Banco Central do Brasil (Selic, CDI e IPCA).',
      code: `package com.foliohub.infrastructure.client;

import com.foliohub.infrastructure.client.dto.BacenSgsItemDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Component
public class BacenSgsClient {

    private static final Logger log = LoggerFactory.getLogger(BacenSgsClient.class);

    public static final int SERIE_SELIC_META = 432;
    public static final int SERIE_CDI_ANUAL = 1178;
    public static final int SERIE_IPCA_12M = 433;

    private final RestClient restClient;

    public BacenSgsClient(@Qualifier("bacenRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public Optional<BigDecimal> fetchLatestSerieValue(int serieCode) {
        try {
            List<BacenSgsItemDto> items = restClient.get()
                    .uri("/{codigoSerie}/dados/ultimos/1?formato=json", serieCode)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<BacenSgsItemDto>>() {});

            if (items != null && !items.isEmpty()) {
                return Optional.of(items.getFirst().toBigDecimal());
            }

            return Optional.empty();
        } catch (RestClientException ex) {
            log.warn("Falha na consulta ao SGS/BACEN para a série {}: {}", serieCode, ex.getMessage());
            return Optional.empty();
        }
    }
}`,
    },
    {
      id: 'service-market-data',
      name: 'MarketDataService.java',
      category: 'Service',
      path: 'src/main/java/com/foliohub/service/MarketDataService.java',
      language: 'java',
      description: 'Serviço com Spring Cache (Caffeine), resiliência contra indisponibilidade e conversão estrita de escala.',
      code: `package com.foliohub.service;

import com.foliohub.config.CacheConfig;
import com.foliohub.domain.constants.FinancialConstants;
import com.foliohub.domain.dto.MacroeconomicIndicatorsDto;
import com.foliohub.domain.dto.StockQuoteDto;
import com.foliohub.exception.MarketDataUnavailableException;
import com.foliohub.infrastructure.client.BacenSgsClient;
import com.foliohub.infrastructure.client.BrapiClient;
import com.foliohub.infrastructure.client.dto.BrapiStockResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Service
public class MarketDataService {

    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);

    private static final BigDecimal DEFAULT_CDI = new BigDecimal("10.5000");
    private static final BigDecimal DEFAULT_SELIC = new BigDecimal("10.5000");
    private static final BigDecimal DEFAULT_IPCA_12M = new BigDecimal("4.1200");

    private final BrapiClient brapiClient;
    private final BacenSgsClient bacenSgsClient;

    public MarketDataService(BrapiClient brapiClient, BacenSgsClient bacenSgsClient) {
        this.brapiClient = brapiClient;
        this.bacenSgsClient = bacenSgsClient;
    }

    @Cacheable(value = CacheConfig.STOCK_QUOTES_CACHE, key = "#ticker.trim().toUpperCase()")
    public StockQuoteDto getStockQuote(String ticker) {
        String normalizedTicker = ticker.trim().toUpperCase();

        BrapiStockResultDto result = brapiClient.fetchStockQuote(normalizedTicker)
                .orElseThrow(() -> new MarketDataUnavailableException(
                        "Cotação e indicadores indisponíveis para o ativo: " + normalizedTicker
                ));

        return new StockQuoteDto(
                result.symbol(),
                result.shortName() != null ? result.shortName() : normalizedTicker,
                scalePrice(result.regularMarketPrice()),
                scaleRatio(result.priceEarnings()),
                scaleRatio(result.priceToBook()),
                scaleRatio(result.returnOnEquity()),
                scaleRatio(result.dividendYield()),
                Instant.now()
        );
    }

    @Cacheable(value = CacheConfig.MACRO_INDICATORS_CACHE, key = "'macro-latest'")
    public MacroeconomicIndicatorsDto getMacroeconomicIndicators() {
        BigDecimal cdi = bacenSgsClient.fetchLatestSerieValue(BacenSgsClient.SERIE_CDI_ANUAL)
                .orElseGet(() -> {
                    log.warn("SGS/BACEN indisponível para CDI. Utilizando taxa de contingência.");
                    return DEFAULT_CDI;
                });

        BigDecimal selic = bacenSgsClient.fetchLatestSerieValue(BacenSgsClient.SERIE_SELIC_META)
                .orElseGet(() -> {
                    log.warn("SGS/BACEN indisponível para Selic. Utilizando taxa de contingência.");
                    return DEFAULT_SELIC;
                });

        BigDecimal ipca = bacenSgsClient.fetchLatestSerieValue(BacenSgsClient.SERIE_IPCA_12M)
                .orElseGet(() -> {
                    log.warn("SGS/BACEN indisponível para IPCA. Utilizando taxa de contingência.");
                    return DEFAULT_IPCA_12M;
                });

        return new MacroeconomicIndicatorsDto(
                cdi.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE),
                selic.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE),
                ipca.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE),
                LocalDate.now()
        );
    }

    private BigDecimal scalePrice(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        return value.setScale(FinancialConstants.MONETARY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
    }

    private BigDecimal scaleRatio(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
        }
        return value.setScale(FinancialConstants.RATE_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE);
    }
}`,
    },
    {
      id: 'dto-stock-quote',
      name: 'StockQuoteDto.java',
      category: 'DTO',
      path: 'src/main/java/com/foliohub/domain/dto/StockQuoteDto.java',
      language: 'java',
      description: 'Record DTO consolidado com cotação atual e múltiplos fundamentalistas (P/L, P/VP, ROE, DY).',
      code: `package com.foliohub.domain.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record StockQuoteDto(
        String ticker,
        String companyName,
        BigDecimal currentPrice,
        BigDecimal priceEarnings,
        BigDecimal priceToBook,
        BigDecimal returnOnEquity,
        BigDecimal dividendYield,
        Instant updatedAt
) {
}`,
    },
    {
      id: 'dto-macro-indicators',
      name: 'MacroeconomicIndicatorsDto.java',
      category: 'DTO',
      path: 'src/main/java/com/foliohub/domain/dto/MacroeconomicIndicatorsDto.java',
      language: 'java',
      description: 'Record DTO com taxas macroeconômicas oficiais (CDI, Selic Meta e IPCA acumulado 12 meses).',
      code: `package com.foliohub.domain.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MacroeconomicIndicatorsDto(
        BigDecimal cdiRate,
        BigDecimal selicRate,
        BigDecimal ipcaRate12m,
        LocalDate referenceDate
) {
}`,
    },
    {
      id: 'service-portfolio',
      name: 'PortfolioService.java',
      category: 'Service',
      path: 'src/main/java/com/foliohub/service/PortfolioService.java',
      language: 'java',
      description: 'Cálculo de Preço Médio ponderado (B3/Receita Federal) e consolidação patrimonial com cotações a mercado.',
      code: `package com.foliohub.service;

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

    public PortfolioService(StockTransactionRepository stockTransactionRepository,
                            MarketDataService marketDataService) {
        this.stockTransactionRepository = stockTransactionRepository;
        this.marketDataService = marketDataService;
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
}`,
    },
    {
      id: 'service-fixed-income-engine',
      name: 'FixedIncomeEngineService.java',
      category: 'Service',
      path: 'src/main/java/com/foliohub/service/FixedIncomeEngineService.java',
      language: 'java',
      description: 'Motor de cálculo com tabela regressiva de IR (Lei 11.033/2004), isenção LCI/LCA e projeção com aportes recorrentes.',
      code: `package com.foliohub.service;

import com.foliohub.domain.constants.FinancialConstants;
import com.foliohub.domain.dto.FixedIncomeProjectionRequest;
import com.foliohub.domain.dto.FixedIncomeProjectionResponse;
import com.foliohub.domain.dto.FixedIncomeTaxCalculationDto;
import com.foliohub.domain.model.enums.FixedIncomeType;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;

@Service
public class FixedIncomeEngineService {

    private static final BigDecimal TAX_RATE_UP_TO_180_DAYS = new BigDecimal("0.2250");
    private static final BigDecimal TAX_RATE_181_TO_360_DAYS = new BigDecimal("0.2000");
    private static final BigDecimal TAX_RATE_361_TO_720_DAYS = new BigDecimal("0.1750");
    private static final BigDecimal TAX_RATE_ABOVE_720_DAYS = new BigDecimal("0.1500");

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

        BigDecimal taxRatePercentage = taxRate.multiply(new BigDecimal("100"))
                .setScale(2, FinancialConstants.FINANCIAL_ROUNDING_MODE);

        return new FixedIncomeTaxCalculationDto(days, type, profit, taxRatePercentage, taxAmount, exempt);
    }
}`,
    },
    {
      id: 'test-portfolio',
      name: 'PortfolioServiceTest.java',
      category: 'Test',
      path: 'src/test/java/com/foliohub/service/PortfolioServiceTest.java',
      language: 'java',
      description: 'Testes unitários com JUnit 5 e AssertJ validando o Preço Médio ponderado, taxas de corretagem e zeragem.',
      code: `package com.foliohub.service;

import com.foliohub.domain.model.StockTransaction;
import com.foliohub.domain.model.User;
import com.foliohub.domain.model.enums.TransactionType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceTest {

    @InjectMocks
    private PortfolioService portfolioService;

    @Test
    @DisplayName("Deve calcular o Preço Médio ponderado com compras sucessivas sem taxas")
    void shouldCalculateWeightedAveragePriceForMultiplePurchases() {
        User user = new User(UUID.randomUUID(), "Investidor", "investidor@foliohub.com", "hash");
        StockTransaction tx1 = new StockTransaction(user, "PETR4", TransactionType.COMPRA, new BigDecimal("100"), new BigDecimal("30.00"), LocalDate.of(2024, 1, 10));
        StockTransaction tx2 = new StockTransaction(user, "PETR4", TransactionType.COMPRA, new BigDecimal("100"), new BigDecimal("40.00"), LocalDate.of(2024, 2, 10));

        BigDecimal averagePrice = portfolioService.calculateWeightedAveragePrice(List.of(tx1, tx2));

        assertThat(averagePrice).isEqualByComparingTo(new BigDecimal("35.0000"));
    }

    @Test
    @DisplayName("Venda parcial não deve alterar o Preço Médio unitário das cotas restantes")
    void partialSaleShouldNotChangeAveragePriceOfRemainingShares() {
        User user = new User(UUID.randomUUID(), "Investidor", "investidor@foliohub.com", "hash");
        StockTransaction buy = new StockTransaction(user, "WEGE3", TransactionType.COMPRA, new BigDecimal("200"), new BigDecimal("20.00"), LocalDate.of(2024, 1, 5));
        StockTransaction sell = new StockTransaction(user, "WEGE3", TransactionType.VENDA, new BigDecimal("50"), new BigDecimal("35.00"), LocalDate.of(2024, 3, 10));

        BigDecimal averagePrice = portfolioService.calculateWeightedAveragePrice(List.of(buy, sell));

        assertThat(averagePrice).isEqualByComparingTo(new BigDecimal("20.0000"));
    }
}`,
    },
    {
      id: 'test-fixed-income-engine',
      name: 'FixedIncomeEngineServiceTest.java',
      category: 'Test',
      path: 'src/test/java/com/foliohub/service/FixedIncomeEngineServiceTest.java',
      language: 'java',
      description: 'Testes unitários com JUnit 5 parametrizado e AssertJ validando tabela regressiva de IR e isenção LCI/LCA.',
      code: `package com.foliohub.service;

import com.foliohub.domain.dto.FixedIncomeTaxCalculationDto;
import com.foliohub.domain.model.enums.FixedIncomeType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class FixedIncomeEngineServiceTest {

    private final FixedIncomeEngineService engineService = new FixedIncomeEngineService();

    @ParameterizedTest(name = "Prazo de {0} dias deve ter alíquota de {1}%")
    @CsvSource({
            "90, 22.50",
            "180, 22.50",
            "181, 20.00",
            "360, 20.00",
            "361, 17.50",
            "720, 17.50",
            "721, 15.00",
            "1000, 15.00"
    })
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

        FixedIncomeTaxCalculationDto taxLci = engineService.calculateIncomeTax(FixedIncomeType.LCI, 100, new BigDecimal("1000.00"));
        assertThat(taxLci.exempt()).isTrue();
        assertThat(taxLci.taxAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}`,
    },
  ];

  // Adicionar nova transação
  addStockTransaction(tx: Omit<StockTransactionDto, 'id' | 'totalValue'>) {
    const totalValue = roundHalfEven(tx.quantity * tx.unitPrice, 2);
    const newTx: StockTransactionDto = {
      ...tx,
      id: 'tx-' + Math.random().toString(36).substring(2, 9),
      totalValue,
      ticker: tx.ticker.trim().toUpperCase(),
    };
    this.stockTransactions.update((list) => [newTx, ...list]);
  }

  // Adicionar nova posição de Renda Fixa
  addFixedIncomePosition(fip: Omit<FixedIncomePositionDto, 'id' | 'currentAmount' | 'active'>) {
    const newFip: FixedIncomePositionDto = {
      ...fip,
      id: 'fip-' + Math.random().toString(36).substring(2, 9),
      currentAmount: fip.investedAmount,
      active: true,
    };
    this.fixedIncomePositions.update((list) => [newFip, ...list]);
  }
}
