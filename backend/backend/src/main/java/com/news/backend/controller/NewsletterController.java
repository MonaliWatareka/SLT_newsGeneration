package com.news.backend.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.news.backend.model.NewsDocument;
import com.news.backend.model.Newsletter;
import com.news.backend.model.SubTopic;
import com.news.backend.repository.DocumentRepository;
import com.news.backend.service.EmailService;
import com.news.backend.service.NewsletterService;
import com.news.backend.service.OllamaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/newsletters")
@RequiredArgsConstructor
public class NewsletterController {

    private final NewsletterService newsletterService;
    private final EmailService emailService;
    private final DocumentRepository documentRepository;
    private final OllamaService ollamaService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Generate full newsletter ──
    @PostMapping("/generate")
    public ResponseEntity<Newsletter> generate(@RequestBody Map<String, Object> body) {
        List<String> docIds   = (List<String>) body.get("documentIds");
        String title          = (String)       body.get("title");
        String mainTopicTitle = (String)       body.get("mainTopicTitle");
        String mainTopicLink  = (String)       body.get("mainTopicLink");

        List<Map<String, String>> rawSubs = (List<Map<String, String>>) body.get("subTopics");
        List<SubTopic> subTopics = List.of();
        if (rawSubs != null) {
            subTopics = rawSubs.stream().map(m -> {
                SubTopic st = new SubTopic();
                st.setTitle(m.getOrDefault("title", ""));
                st.setContent(m.getOrDefault("content", ""));
                st.setLink(m.getOrDefault("link", ""));
                return st;
            }).toList();
        }

        List<String> images = (List<String>) body.getOrDefault("imageBase64List", List.of());

        return ResponseEntity.ok(
            newsletterService.generateFromDocuments(
                docIds, title, mainTopicTitle, mainTopicLink, subTopics, images
            )
        );
    }

    // ── Auto-extract stories + page images from document summaries ──
    @PostMapping("/extract-stories")
    public ResponseEntity<Map<String, Object>> extractStories(@RequestBody Map<String, Object> body) {
        List<String> docIds = (List<String>) body.get("documentIds");

        StringBuilder combined = new StringBuilder();
        List<String> allPageImages = new ArrayList<>();

        for (String docId : docIds) {
            NewsDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new RuntimeException("Document not found: " + docId));

            if (doc.getSummary() != null) {
                combined.append(doc.getSummary()).append("\n\n");
            }

            if (doc.getPageImagesBase64() != null && allPageImages.size() < 3) {
                for (String img : doc.getPageImagesBase64()) {
                    if (allPageImages.size() >= 3) break;
                    allPageImages.add(img);
                }
            }
        }

        String rawJson = ollamaService.extractStories(combined.toString());

        try {
            String clean = rawJson
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("```", "")
                .trim();

            Map<String, Object> parsed = objectMapper.readValue(
                clean, new TypeReference<Map<String, Object>>() {}
            );
            parsed.put("pageImages", allPageImages);
            return ResponseEntity.ok(parsed);

        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "error", "Could not parse Ollama response",
                "raw", rawJson,
                "pageImages", allPageImages
            ));
        }
    }

    // ── Suggest LinkedIn search links for a topic via Ollama ──
    @PostMapping("/suggest-links")
    public ResponseEntity<Map<String, Object>> suggestLinks(@RequestBody Map<String, String> body) {
        String topicTitle = body.getOrDefault("topicTitle", "");
        if (topicTitle.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "topicTitle is required"));
        }

        String rawJson = ollamaService.suggestLinks(topicTitle);

        try {
            String clean = rawJson
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("```", "")
                .trim();
            Map<String, Object> parsed = objectMapper.readValue(
                clean, new TypeReference<Map<String, Object>>() {}
            );
            return ResponseEntity.ok(parsed);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("error", "Could not parse response", "raw", rawJson));
        }
    }

    // ── Get all newsletters ──
    @GetMapping
    public ResponseEntity<List<Newsletter>> getAll() {
        return ResponseEntity.ok(newsletterService.getAllNewsletters());
    }

    // ── Get one newsletter ──
    @GetMapping("/{id}")
    public ResponseEntity<Newsletter> getOne(@PathVariable String id) {
        return ResponseEntity.ok(newsletterService.getById(id));
    }

    // ── Update newsletter content ──
    @PutMapping("/{id}")
    public ResponseEntity<Newsletter> update(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            newsletterService.updateContent(id, body.get("content"), body.get("title"))
        );
    }

    // ── Send newsletter by email ──
    @PostMapping("/{id}/send-email")
    public ResponseEntity<Map<String, String>> sendEmail(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        Newsletter nl = newsletterService.getById(id);
        emailService.sendNewsletter(nl, body.get("recipientEmail"));
        return ResponseEntity.ok(Map.of("status", "Email sent successfully"));
    }

    // ── Download newsletter HTML ──
    @GetMapping("/{id}/download")
    public ResponseEntity<String> download(@PathVariable String id) {
        Newsletter nl = newsletterService.getById(id);
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=newsletter.html")
            .header("Content-Type", "text/html")
            .body(nl.getTemplateHtml());
    }
}