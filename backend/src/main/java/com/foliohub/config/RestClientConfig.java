package com.foliohub.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class RestClientConfig {

    @Value("${foliohub.integration.brapi.base-url:https://brapi.dev/api}")
    private String brapiBaseUrl;

    @Value("${foliohub.integration.bacen.base-url:https://api.bcb.gov.br/dados/serie/bcdata.sgs}")
    private String bacenBaseUrl;

    @Bean
    public RestClient brapiRestClient() {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(Duration.ofSeconds(5));

        return RestClient.builder()
                .baseUrl(brapiBaseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    @Bean
    public RestClient bacenRestClient() {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory();
        requestFactory.setReadTimeout(Duration.ofSeconds(5));

        return RestClient.builder()
                .baseUrl(bacenBaseUrl)
                .requestFactory(requestFactory)
                .build();
    }
}
