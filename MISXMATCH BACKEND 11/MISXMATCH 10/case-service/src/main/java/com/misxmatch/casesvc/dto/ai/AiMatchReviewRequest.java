package com.misxmatch.casesvc.dto.ai;

import com.misxmatch.casesvc.entity.ReviewStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiMatchReviewRequest {

    @NotNull(message = "Review status is required")
    private ReviewStatus status;

    private String comment;
}
