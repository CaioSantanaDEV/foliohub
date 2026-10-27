package com.foliohub.controller;

import com.foliohub.domain.dto.FixedIncomePositionCreateDto;
import com.foliohub.domain.dto.FixedIncomePositionResponseDto;
import com.foliohub.domain.model.FixedIncomePosition;
import com.foliohub.domain.model.User;
import com.foliohub.exception.BusinessRuleException;
import com.foliohub.exception.ResourceNotFoundException;
import com.foliohub.repository.FixedIncomePositionRepository;
import com.foliohub.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/portfolio/fixed-income")
public class FixedIncomePositionController {

    private final FixedIncomePositionRepository fixedIncomePositionRepository;
    private final UserRepository userRepository;

    public FixedIncomePositionController(FixedIncomePositionRepository fixedIncomePositionRepository,
                                         UserRepository userRepository) {
        this.fixedIncomePositionRepository = fixedIncomePositionRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<FixedIncomePositionResponseDto>> getPositionsByUser(@RequestParam UUID userId) {
        List<FixedIncomePositionResponseDto> positions = fixedIncomePositionRepository
                .findByUserIdAndActiveTrueOrderByDueDateAsc(userId)
                .stream()
                .map(FixedIncomePositionResponseDto::fromEntity)
                .toList();

        return ResponseEntity.ok(positions);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<FixedIncomePositionResponseDto> createPosition(
            @Valid @RequestBody FixedIncomePositionCreateDto dto
    ) {
        User user = userRepository.findById(dto.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", dto.userId()));

        if (!dto.dueDate().isAfter(dto.investmentDate())) {
            throw new BusinessRuleException("A data de vencimento do título deve ser estritamente posterior à data de aplicação.");
        }

        FixedIncomePosition position = new FixedIncomePosition(
                user,
                dto.assetName(),
                dto.issuer(),
                dto.type(),
                dto.indexer(),
                dto.contractedRate(),
                dto.investedAmount(),
                dto.investedAmount(),
                dto.investmentDate(),
                dto.dueDate()
        );

        FixedIncomePosition saved = fixedIncomePositionRepository.save(position);
        return ResponseEntity.status(HttpStatus.CREATED).body(FixedIncomePositionResponseDto.fromEntity(saved));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deletePosition(@PathVariable UUID id) {
        FixedIncomePosition position = fixedIncomePositionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Posição de Renda Fixa", id));

        fixedIncomePositionRepository.delete(position);
        return ResponseEntity.noContent().build();
    }
}
