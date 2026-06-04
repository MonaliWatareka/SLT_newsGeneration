package com.news.backend.controller;

import com.news.backend.model.Newsletter;
import com.news.backend.service.EmailService;
import com.news.backend.service.NewsletterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/newsletters")
@RequiredArgsConstructor
public class NewsletterController {

    private final NewsletterService newsletterService;
    private final EmailService emailService;

    @PostMapping("/generate")
    public ResponseEntity<Newsletter> generate(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")  // ✅ FIXED: suppress unchecked cast warning
        List<String> docIds = (List<String>) body.get("documentIds");
        String title = (String) body.get("title");
        return ResponseEntity.ok(newsletterService.generateFromDocuments(docIds, title));
    }

    @GetMapping
    public ResponseEntity<List<Newsletter>> getAll() {
        return ResponseEntity.ok(newsletterService.getAllNewsletters());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Newsletter> getOne(@PathVariable String id) {
        return ResponseEntity.ok(newsletterService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Newsletter> update(
        @PathVariable String id,
        @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(
            newsletterService.updateContent(id, body.get("content"), body.get("title"))
        );
    }

    @PostMapping("/{id}/send-email")
    public ResponseEntity<Map<String, String>> sendEmail(
        @PathVariable String id,
        @RequestBody Map<String, String> body
    ) {
        Newsletter nl = newsletterService.getById(id);
        emailService.sendNewsletter(nl, body.get("recipientEmail"));
        return ResponseEntity.ok(Map.of("status", "Email sent successfully"));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<String> download(@PathVariable String id) {
        Newsletter nl = newsletterService.getById(id);
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=newsletter.html")
            .header("Content-Type", "text/html")
            .body(nl.getTemplateHtml());
    }
}