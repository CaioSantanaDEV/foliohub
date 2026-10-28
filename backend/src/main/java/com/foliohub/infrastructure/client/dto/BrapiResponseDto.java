package com.foliohub.infrastructure.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BrapiResponseDto(
        List<BrapiStockResultDto> results,
        String requestedAt,
        Boolean error,
        String message
) {
}
