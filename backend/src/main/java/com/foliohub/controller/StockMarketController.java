package com.foliohub.controller;

import com.foliohub.domain.dto.StockQuoteDto;
import com.foliohub.service.StockService;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stocks")
@Validated
public class StockMarketController {

    private final StockService stockService;

    public StockMarketController(StockService stockService) {
        this.stockService = stockService;
    }

    @GetMapping("/{ticker}")
    public ResponseEntity<StockQuoteDto> getStockQuote(
            @PathVariable
            @Pattern(
                    regexp = "^[A-Za-z0-9]{4,6}$",
                    message = "O ticker informado não segue o padrão da B3 (ex: PETR4, VALE3, WEGE3, MXRF11)."
            )
            String ticker
    ) {
        StockQuoteDto quote = stockService.getStockQuote(ticker.trim().toUpperCase());
        return ResponseEntity.ok(quote);
    }
}
