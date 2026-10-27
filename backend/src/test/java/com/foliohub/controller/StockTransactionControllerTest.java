package com.foliohub.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foliohub.domain.dto.StockTransactionCreateDto;
import com.foliohub.domain.model.StockTransaction;
import com.foliohub.domain.model.User;
import com.foliohub.domain.model.enums.TransactionType;
import com.foliohub.exception.GlobalExceptionHandler;
import com.foliohub.repository.StockTransactionRepository;
import com.foliohub.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(StockTransactionController.class)
@Import(GlobalExceptionHandler.class)
class StockTransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private StockTransactionRepository stockTransactionRepository;

    @MockBean
    private UserRepository userRepository;

    @Test
    @DisplayName("Deve registrar transação de compra com sucesso retornando HTTP 201")
    void shouldCreateBuyTransactionSuccessfully() throws Exception {
        UUID userId = UUID.randomUUID();
        User mockUser = new User(userId, "Caio", "caio@foliohub.com", "hash");

        StockTransactionCreateDto request = new StockTransactionCreateDto(
                userId,
                "PETR4",
                TransactionType.COMPRA,
                new BigDecimal("100"),
                new BigDecimal("38.50"),
                LocalDate.now(),
                new BigDecimal("4.90")
        );

        StockTransaction entity = new StockTransaction(
                mockUser,
                "PETR4",
                TransactionType.COMPRA,
                new BigDecimal("100"),
                new BigDecimal("38.50"),
                LocalDate.now()
        );
        entity.setId(UUID.randomUUID());

        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(stockTransactionRepository.save(any(StockTransaction.class))).thenReturn(entity);

        mockMvc.perform(post("/api/portfolio/stocks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ticker").value("PETR4"))
                .andExpect(jsonPath("$.type").value("COMPRA"));
    }

    @Test
    @DisplayName("Deve rejeitar transação com ticker fora do padrão B3 retornando RFC 7807 (400 Bad Request)")
    void shouldRejectInvalidB3Ticker() throws Exception {
        UUID userId = UUID.randomUUID();

        StockTransactionCreateDto request = new StockTransactionCreateDto(
                userId,
                "INVALID_TICKER",
                TransactionType.COMPRA,
                new BigDecimal("100"),
                new BigDecimal("38.50"),
                LocalDate.now(),
                BigDecimal.ZERO
        );

        mockMvc.perform(post("/api/portfolio/stocks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("https://foliohub.com/errors/invalid-parameters"))
                .andExpect(jsonPath("$.title").value("Parâmetros de requisição inválidos"))
                .andExpect(jsonPath("$.invalidParameters").isArray());
    }

    @Test
    @DisplayName("Deve rejeitar venda quando o investidor não possui saldo em custódia retornando 422")
    void shouldRejectSaleWhenCustodyBalanceIsInsufficient() throws Exception {
        UUID userId = UUID.randomUUID();
        User mockUser = new User(userId, "Caio", "caio@foliohub.com", "hash");

        StockTransactionCreateDto request = new StockTransactionCreateDto(
                userId,
                "VALE3",
                TransactionType.VENDA,
                new BigDecimal("100"),
                new BigDecimal("62.00"),
                LocalDate.now(),
                BigDecimal.ZERO
        );

        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(stockTransactionRepository.findByUserIdAndTickerOrderByOperationDateAsc(userId, "VALE3"))
                .thenReturn(List.of());

        mockMvc.perform(post("/api/portfolio/stocks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.type").value("https://foliohub.com/errors/business-rule-violation"))
                .andExpect(jsonPath("$.detail").value("Saldo em custódia insuficiente para venda de 100.0000 cotas do ativo VALE3. Saldo disponível: 0.0000."));
    }
}
