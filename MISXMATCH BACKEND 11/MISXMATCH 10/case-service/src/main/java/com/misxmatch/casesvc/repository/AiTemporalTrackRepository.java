package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.AiTemporalTrack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiTemporalTrackRepository extends JpaRepository<AiTemporalTrack, Long> {
    Optional<AiTemporalTrack> findByTrackId(String trackId);
    List<AiTemporalTrack> findByCaseId(String caseId);
    List<AiTemporalTrack> findByCameraId(String cameraId);
}
