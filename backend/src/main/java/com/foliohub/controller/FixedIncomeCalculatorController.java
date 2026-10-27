package com.foliohub.controller;

import com.foliohub.domain.dto.FixedIncomeSimulationRequestDto;
import com.foliohub.domain.dto.FixedIncomeSimulationResultDto;
import com.foliohub.service.FixedIncomeEngineService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/calculator/fixed-income")
public class FixedIncomeCalculatorController {

    private final FixedIncomeEngineService fixedIncomeEngineService;

    public FixedIncomeCalculatorController(FixedIncomeEngineService fixedIncomeEngineService) {
        this.fixedIncomeEngineService = fixedIncomeEngineService;
    }

    @PostMapping
    public ResponseEntity<FixedIncomeSimulationResultDto> simulateFixedIncome(
            @Valid @RequestBody FixedIncomeSimulationRequestDto request
    ) {
        FixedIncomeSimulationResultDto result = fixedIncomeEngineService.simulateWithBenchmark(request);
        return ResponseEntity.ok(result);
    }
}
