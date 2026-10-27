package com.foliohub.domain.model;

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

    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", email='" + email + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }
}
