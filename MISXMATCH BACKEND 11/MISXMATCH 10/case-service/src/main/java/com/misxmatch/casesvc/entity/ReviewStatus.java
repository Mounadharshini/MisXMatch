package com.misxmatch.casesvc.entity;

/**
 * ReviewStatus
 * ============
 * Official human verification statuses for AI candidate matches.
 * Keeps human verification decision separate from AI model similarity classification.
 */
public enum ReviewStatus {
    PENDING_REVIEW,
    UNDER_REVIEW,
    CONFIRMED_MATCH,
    REJECTED_MATCH,
    NEEDS_MORE_INFORMATION
}
