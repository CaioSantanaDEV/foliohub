package com.foliohub.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foliohub.domain.dto.FixedIncomeSimulationRequestDto;
import com.foliohub.domain.dto.FixedIncomeSimulationResultDto;
import com.foliohub.domain.model.enums.FixedIncomeType;
import com.foliohub.exception.GlobalExceptionHandler;
import com.foliohub.service.FixedIncomeEngineService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FixedIncomeCalculatorController.class)
@Import(GlobalExceptionHandler.class)
class FixedIncomeCalculatorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private FixedIncomeEngineService fixedIncomeEngineService;

    @Test
    @DisplayName("Deve simular investimento em renda fixa com cálculo de IR e comparativo com sucesso")
    void shouldSimulateFixedIncomeSuccessfully() throws Exception {
        FixedIncomeSimulationRequestDto request = new FixedIncomeSimulationRequestDto(
                FixedIncomeType.CDB,
                new BigDecimal("10000.00"),
                new BigDecimal("500.00"),
                new BigDecimal("12.00"),
                12,
                new BigDecimal("10.75")
        );

        FixedIncomeSimulationResultDto mockResult = new FixedIncomeSimulationResultDto(
                FixedIncomeType.CDB,
                new BigDecimal("16000.00"),
                new BigDecimal("17050.45"),
                new BigDecimal("1050.45"),
                new BigDecimal("17.50"),
                new BigDecimal("183.83"),
                new BigDecimal("16866.62"),
                new BigDecimal("866.62"),
                360,
                false,
                new BigDecimal("16780.20"),
                new BigDecimal("86.42")
        );

        when(fixedIncomeEngineService.simulateWithBenchmark(any())).thenReturn(mockResult);

        mockMvc.perform(post("/api/calculator/fixed-income")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("CDB"))
                .andExpect(jsonPath("$.grossAmount").value(17050.45))
                .andExpect(jsonPath("$.taxRatePercentage").value(17.50))
                .andExpect(jsonPath("$.netAmount").value(16866.62))
                .andExpect(jsonPath("$.netAdvantageOverBenchmark").value(86.42));
    }

    @Test
    @DisplayName("Deve rejeitar simulação com valores negativos ou prazos nulos retornando RFC 7807")
    void shouldRejectInvalidSimulationParameters() throws Exception {
        String invalidPayload = """
            {
                "type": "CDB",
                "initialAmount": -500.00,
                "monthlyContribution": -100.00,
                "annualRatePercentage": 0.00,
                "months": 0
            }
        """;

        mockMvc.perform(post("/api/calculator/fixed-income")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("https://foliohub.com/errors/invalid-parameters"))
                .andExpect(jsonPath("$.title").value("Parâmetros de requisição inválidos"));
    }
}
