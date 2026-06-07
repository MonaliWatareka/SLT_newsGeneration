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
    private String templateHtml;
    private List<String> documentIds;
    private LocalDateTime createdAt;
    private String recipientEmail;
    private boolean emailSent;

    // NEW FIELDS
    private String mainTopicTitle;
    private String mainTopicContent;
    private String mainTopicLink;       // "Read the full article" link

    private List<SubTopic> subTopics;   // "More Stories This Week"
    private List<String> imageBase64List; // up to 3 images from uploaded PDF
}