package com.news.backend.repository;

import com.news.backend.model.NewsDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface DocumentRepository extends MongoRepository<NewsDocument, String> {
    List<NewsDocument> findByOrderByUploadedAtDesc();
    List<NewsDocument> findByStatus(String status);
}