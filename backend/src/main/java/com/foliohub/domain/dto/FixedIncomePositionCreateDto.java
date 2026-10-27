package com.foliohub.domain.dto;

import com.foliohub.domain.model.enums.FixedIncomeType;
import com.foliohub.domain.model.enums.IndexerType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record FixedIncomePositionCreateDto(
        @NotNull(message = "O ID do investidor titular é obrigatório.")
        UUID userId,

        @NotBlank(message = "O nome ou descrição do título é obrigatório.")
        @Size(max = 120, message = "O nome do ativo não pode exceder 120 caracteres.")
        String assetName,

        @Size(max = 100, message = "O nome da instituição emissora não pode exceder 100 caracteres.")
        String issuer,

        @NotNull(message = "O tipo do título (CDB, LCI, LCA, TESOURO) é obrigatório.")
        FixedIncomeType type,

        @NotNull(message = "O indexador de rendimento (CDI, PREFIXADO, IPCA) é obrigatório.")
        IndexerType indexer,

        @NotNull(message = "A taxa ou percentual contratado é obrigatório.")
        @DecimalMin(value = "0.0001", message = "A taxa contratada deve ser estritamente positiva.")
        BigDecimal contractedRate,

        @NotNull(message = "O valor investido (aporte inicial) é obrigatório.")
        @DecimalMin(value = "0.01", message = "O valor investido deve ser maior que zero.")
        BigDecimal investedAmount,

        @NotNull(message = "A data da aplicação é obrigatória.")
        @PastOrPresent(message = "A data da aplicação não pode ser uma data futura.")
        LocalDate investmentDate,

        @NotNull(message = "A data de vencimento do título é obrigatória.")
        @Future(message = "A data de vencimento deve estar no futuro.")
        LocalDate dueDate
) {
        public FixedIncomePositionCreateDto {
                if (assetName != null) {
                        assetName = assetName.trim();
                }
                if (issuer != null) {
                        issuer = issuer.trim();
                }
        }
}
