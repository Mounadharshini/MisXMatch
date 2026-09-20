package com.misxmatch.casesvc.repository;

import com.misxmatch.casesvc.entity.CctvCamera;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface CctvCameraRepository extends JpaRepository<CctvCamera, Long>, JpaSpecificationExecutor<CctvCamera> {
    Optional<CctvCamera> findByCameraCode(String cameraCode);
    List<CctvCamera> findByStatus(String status);
    List<CctvCamera> findByCity(String city);
}
