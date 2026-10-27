package com.foliohub.infrastructure.client;

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
}
