package com.news.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "newsletters")
public class Newsletter {
    @Id
    private String id;
    private String title;
    private String summary;
    private String newsletterContent;
    private String templateHtml;        // final rendered HTML
    private List<String> documentIds;   // source document IDs
    private LocalDateTime createdAt;
    private String recipientEmail;
    private boolean emailSent;
}