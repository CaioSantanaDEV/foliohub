package com.foliohub.infrastructure.client;

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

    @Value("${foliohub.integration.brapi.token:}")
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
}
