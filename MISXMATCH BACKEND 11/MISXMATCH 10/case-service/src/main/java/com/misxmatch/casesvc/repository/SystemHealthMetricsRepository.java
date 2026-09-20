package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.SystemHealthMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemHealthMetricsRepository extends JpaRepository<SystemHealthMetrics, Long> {

    List<SystemHealthMetrics> findTop100ByOrderByCreatedAtDesc();

    long countBySuccessTrue();

    long countBySuccessFalse();

    @Query("SELECT AVG(m.durationMs) FROM SystemHealthMetrics m WHERE m.success = true")
    Double findAverageDurationMs();

    @Query("SELECT MAX(m.durationMs) FROM SystemHealthMetrics m")
    Long findMaxDurationMs();

    long countByErrorCategory(String errorCategory);

    long countByOperationType(String operationType);

    long countByOperationTypeAndSuccessTrue(String operationType);

    long countByOperationTypeAndSuccessFalse(String operationType);

    @Query("SELECT AVG(m.durationMs) FROM SystemHealthMetrics m WHERE m.operationType = :operationType AND m.success = true")
    Double findAverageDurationMsByOperationType(String operationType);
}
