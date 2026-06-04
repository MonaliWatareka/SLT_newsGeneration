package com.news.backend.repository;

import com.news.backend.model.Newsletter;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface NewsletterRepository extends MongoRepository<Newsletter, String> {
    List<Newsletter> findByOrderByCreatedAtDesc();
}