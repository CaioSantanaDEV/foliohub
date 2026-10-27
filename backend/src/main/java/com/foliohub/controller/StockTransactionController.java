package com.foliohub.controller;

import com.foliohub.domain.constants.FinancialConstants;
import com.foliohub.domain.dto.StockTransactionCreateDto;
import com.foliohub.domain.dto.StockTransactionResponseDto;
import com.foliohub.domain.model.StockTransaction;
import com.foliohub.domain.model.User;
import com.foliohub.domain.model.enums.TransactionType;
import com.foliohub.exception.BusinessRuleException;
import com.foliohub.exception.ResourceNotFoundException;
import com.foliohub.repository.StockTransactionRepository;
import com.foliohub.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/portfolio/stocks")
public class StockTransactionController {

    private final StockTransactionRepository stockTransactionRepository;
    private final UserRepository userRepository;

    public StockTransactionController(StockTransactionRepository stockTransactionRepository,
                                    UserRepository userRepository) {
        this.stockTransactionRepository = stockTransactionRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<StockTransactionResponseDto>> getTransactionsByUser(@RequestParam UUID userId) {
        List<StockTransactionResponseDto> transactions = stockTransactionRepository
                .findByUserIdOrderByOperationDateDesc(userId)
                .stream()
                .map(StockTransactionResponseDto::fromEntity)
                .toList();

        return ResponseEntity.ok(transactions);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<StockTransactionResponseDto> createTransaction(
            @Valid @RequestBody StockTransactionCreateDto dto
    ) {
        User user = userRepository.findById(dto.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", dto.userId()));

        if (dto.type() == TransactionType.VENDA) {
            validateCustodyBalanceForSale(dto);
        }

        StockTransaction transaction = new StockTransaction(
                user,
                dto.ticker(),
                dto.type(),
                dto.quantity(),
                dto.unitPrice(),
                dto.operationDate()
        );

        if (dto.brokerageFees() != null) {
            transaction.setBrokerageFees(dto.brokerageFees());
        }

        StockTransaction saved = stockTransactionRepository.save(transaction);
        return ResponseEntity.status(HttpStatus.CREATED).body(StockTransactionResponseDto.fromEntity(saved));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteTransaction(@PathVariable UUID id) {
        if (!stockTransactionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Transação de ações", id);
        }
        stockTransactionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Vendas a descoberto no mercado à vista da B3 sem custódia prévia são rejeitadas.
     * O saldo de cotas acumulado até a data da operação deve suprir a quantidade da ordem de venda.
     */
    private void validateCustodyBalanceForSale(StockTransactionCreateDto dto) {
        List<StockTransaction> existingTxs = stockTransactionRepository
                .findByUserIdAndTickerOrderByOperationDateAsc(dto.userId(), dto.ticker());

        BigDecimal currentBalance = BigDecimal.ZERO;
        for (StockTransaction tx : existingTxs) {
            if (tx.getType() == TransactionType.COMPRA) {
                currentBalance = currentBalance.add(tx.getQuantity());
            } else if (tx.getType() == TransactionType.VENDA) {
                currentBalance = currentBalance.subtract(tx.getQuantity());
            }
        }

        if (currentBalance.compareTo(dto.quantity()) < 0) {
            throw new BusinessRuleException(String.format(
                    "Saldo em custódia insuficiente para venda de %s cotas do ativo %s. Saldo disponível: %s.",
                    dto.quantity().setScale(FinancialConstants.QUANTITY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE),
                    dto.ticker(),
                    currentBalance.setScale(FinancialConstants.QUANTITY_SCALE, FinancialConstants.FINANCIAL_ROUNDING_MODE)
            ));
        }
    }
}
