package com.news.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "documents")
public class NewsDocument {

    @Id
    private String id;
    private String originalFileName;
    private String fileType;            // "pdf" or "image"
    private String storagePath;
    private String extractedText;
    private String summary;
    private LocalDateTime uploadedAt;
    private String status;              // "uploaded" | "summarized"

    // ── Each PDF page rendered as a base64 JPEG (auto-generated on upload) ──
    private List<String> pageImagesBase64;
}