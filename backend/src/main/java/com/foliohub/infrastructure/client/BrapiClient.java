package com.foliohub.infrastructure.client;

import com.foliohub.exception.MarketDataUnavailableException;
import com.foliohub.exception.ResourceNotFoundException;
import com.foliohub.infrastructure.client.dto.BrapiResponseDto;
import com.foliohub.infrastructure.client.dto.BrapiStockResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
public class BrapiClient {

    private static final Logger log = LoggerFactory.getLogger(BrapiClient.class);

    private final RestClient restClient;

    @Value("${foliohub.integration.brapi.token:}")
    private String apiToken;

    public BrapiClient(@Qualifier("brapiRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    /**
     * Realiza a chamada HTTP real para o endpoint da Brapi priorizando os módulos
     * fundamentalistas completos (defaultKeyStatistics, financialData).
     * Caso o plano da chave de API não suporte módulos avançados para o ticker solicitado (HTTP 400/401/403),
     * executa fallback transparente para a consulta fundamentalista padrão.
     */
    public BrapiStockResultDto fetchStockQuote(String ticker) {
        String normalizedTicker = ticker.trim().toUpperCase();

        try {
            return executeBrapiRequest(normalizedTicker, true);
        } catch (MarketDataUnavailableException | RestClientResponseException ex) {
            log.debug("Fallback para consulta padrão da Brapi sem módulos extras para {}: {}", normalizedTicker, ex.getMessage());
            return executeBrapiRequest(normalizedTicker, false);
        }
    }

    private BrapiStockResultDto executeBrapiRequest(String normalizedTicker, boolean includeExtendedModules) {
        try {
            StringBuilder uriBuilder = new StringBuilder("/quote/")
                    .append(normalizedTicker)
                    .append("?range=1d&interval=1d&fundamental=true");

            if (includeExtendedModules) {
                uriBuilder.append("&modules=defaultKeyStatistics,financialData");
            }

            if (apiToken != null && !apiToken.isBlank()) {
                uriBuilder.append("&token=").append(apiToken.trim());
            }

            String uri = uriBuilder.toString();
            log.info("Executando consulta real de cotação na Brapi: /quote/{} (extended={})", normalizedTicker, includeExtendedModules);

            BrapiResponseDto response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        if (res.getStatusCode().value() == 404) {
                            throw new ResourceNotFoundException("Ativo '" + normalizedTicker + "' não foi localizado na B3.");
                        }
                        throw new MarketDataUnavailableException("A API da Brapi retornou erro de cliente: " + res.getStatusCode().value());
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw new MarketDataUnavailableException("A API da Brapi reportou instabilidade no servidor (HTTP " + res.getStatusCode().value() + ").");
                    })
                    .body(BrapiResponseDto.class);

            if (response == null || Boolean.TRUE.equals(response.error()) || response.results() == null || response.results().isEmpty()) {
                String detail = response != null && response.message() != null ? response.message() : "Nenhum resultado retornado para o ticker informado.";
                throw new ResourceNotFoundException("Ativo '" + normalizedTicker + "' não foi localizado na B3: " + detail);
            }

            return response.results().getFirst();

        } catch (ResourceNotFoundException ex) {
            log.warn("Ticker '{}' não localizado na Brapi: {}", normalizedTicker, ex.getMessage());
            throw ex;
        } catch (HttpClientErrorException.NotFound ex) {
            log.warn("Ticker '{}' retornou 404 da Brapi", normalizedTicker);
            throw new ResourceNotFoundException("Ativo '" + normalizedTicker + "' não foi localizado no catálogo da B3.");
        } catch (RestClientResponseException ex) {
            log.error("Erro HTTP de comunicação externa com a Brapi para '{}': status={}, body={}",
                    normalizedTicker, ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new MarketDataUnavailableException("Falha na comunicação com o provedor de cotações Brapi (Status " + ex.getStatusCode() + ").", ex);
        } catch (RestClientException ex) {
            log.error("Falha de rede ou timeout na consulta à Brapi para o ativo '{}': {}", normalizedTicker, ex.getMessage());
            throw new MarketDataUnavailableException("Serviço de cotações externas (Brapi) temporariamente indisponível ou com tempo limite excedido.", ex);
        }
    }
}
