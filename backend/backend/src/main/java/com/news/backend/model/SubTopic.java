package com.news.backend.model;

import lombok.Data;

@Data
public class SubTopic {
    private String title;
    private String content;
    private String link;   // "Learn more" link — manually entered by user
}