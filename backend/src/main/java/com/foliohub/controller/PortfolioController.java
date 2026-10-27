package com.foliohub.controller;

import com.foliohub.domain.dto.PortfolioConsolidationDto;
import com.foliohub.domain.dto.PortfolioSummaryDto;
import com.foliohub.service.PortfolioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/portfolio")
public class PortfolioController {

    private final PortfolioService portfolioService;

    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @GetMapping("/summary")
    public ResponseEntity<PortfolioSummaryDto> getPortfolioSummary(@RequestParam UUID userId) {
        PortfolioSummaryDto summary = portfolioService.getPortfolioSummary(userId);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/consolidation")
    public ResponseEntity<PortfolioConsolidationDto> getConsolidation(@RequestParam UUID userId) {
        PortfolioConsolidationDto consolidation = portfolioService.consolidatePortfolio(userId);
        return ResponseEntity.ok(consolidation);
    }
}
