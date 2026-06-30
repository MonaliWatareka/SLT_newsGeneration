package com.news.backend.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.news.backend.model.NewsDocument;
import com.news.backend.model.Newsletter;
import com.news.backend.model.SubTopic;
import com.news.backend.repository.DocumentRepository;
import com.news.backend.service.EmailService;
import com.news.backend.service.NewsletterService;
import com.news.backend.service.VertexAiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.HttpURLConnection;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/newsletters")
@RequiredArgsConstructor
public class NewsletterController {

    private final NewsletterService  newsletterService;
    private final EmailService       emailService;
    private final DocumentRepository documentRepository;
    private final VertexAiService    vertexAiService;
    private final ObjectMapper       objectMapper = new ObjectMapper();

    // ── Generate full newsletter ─────────────────────────────────────────
    @PostMapping("/generate")
    public ResponseEntity<Newsletter> generate(@RequestBody Map<String, Object> body) {
        List<String> docIds         = (List<String>) body.get("documentIds");
        String       title          = (String)       body.get("title");
        String       mainTopicTitle = (String)       body.get("mainTopicTitle");
        String       mainTopicLink  = (String)       body.get("mainTopicLink");

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

    // ── Auto-extract stories + page images + WORKING LINKS (all automatic) ──
    @PostMapping("/extract-stories")
    public ResponseEntity<Map<String, Object>> extractStories(@RequestBody Map<String, Object> body) {
        List<String> docIds = (List<String>) body.get("documentIds");

        StringBuilder combined      = new StringBuilder();
        List<String>  allPageImages = new ArrayList<>();

        for (String docId : docIds) {
            NewsDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new RuntimeException("Document not found: " + docId));

            if (doc.getSummary() != null)
                combined.append(doc.getSummary()).append("\n\n");

            if (doc.getPageImagesBase64() != null && allPageImages.size() < 3) {
                for (String img : doc.getPageImagesBase64()) {
                    if (allPageImages.size() >= 3) break;
                    allPageImages.add(img);
                }
            }
        }

        String rawJson = vertexAiService.extractStories(combined.toString());

        try {
            String clean = rawJson
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("```", "")
                .trim();
            Map<String, Object> parsed = objectMapper.readValue(
                clean, new TypeReference<Map<String, Object>>() {}
            );
            parsed.put("pageImages", allPageImages);

            // ── AUTO-FETCH a verified working link for the main story ──────
            Map<String, Object> mainStory = (Map<String, Object>) parsed.get("mainStory");
            if (mainStory != null) {
                String mainTitle = (String) mainStory.get("title");
                if (mainTitle != null && !mainTitle.isBlank()) {
                    String link = fetchFirstWorkingLink(mainTitle);
                    mainStory.put("link", link); // may be "" if nothing verified
                }
            }

            // ── AUTO-FETCH a verified working link for every sub-story ─────
            List<Map<String, Object>> subStories = (List<Map<String, Object>>) parsed.get("subStories");
            if (subStories != null) {
                for (Map<String, Object> sub : subStories) {
                    String subTitle = (String) sub.get("title");
                    if (subTitle != null && !subTitle.isBlank()) {
                        String link = fetchFirstWorkingLink(subTitle);
                        sub.put("link", link);
                    }
                }
            }

            return ResponseEntity.ok(parsed);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "error",      "Could not parse Vertex AI response",
                "raw",        rawJson,
                "pageImages", allPageImages
            ));
        }
    }

    /**
     * Asks Gemini for up to 5 candidate links on a topic, HEAD-checks each one,
     * and returns the FIRST one that is actually alive. Returns "" if none work.
     */
    private String fetchFirstWorkingLink(String topicTitle) {
        try {
            String rawJson = vertexAiService.suggestLinks(topicTitle);
            String clean = rawJson
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("```", "")
                .trim();
            Map<String, Object> parsed = objectMapper.readValue(
                clean, new TypeReference<Map<String, Object>>() {}
            );
            List<Map<String, String>> links = (List<Map<String, String>>) parsed.get("links");
            if (links == null) return "";

            for (Map<String, String> link : links) {
                String url = link.get("url");
                if (url != null && !url.isBlank() && isUrlAlive(url)) {
                    return url; // first verified working link wins
                }
            }
        } catch (Exception ignored) {
            // fall through to empty string — frontend will show "no link found"
        }
        return "";
    }

    /** HEAD-checks a single URL and returns true if it responds with 2xx/3xx. */
    private boolean isUrlAlive(String url) {
        try {
            HttpURLConnection con = (HttpURLConnection) new URI(url).toURL().openConnection();
            con.setRequestMethod("HEAD");
            con.setConnectTimeout(4000);
            con.setReadTimeout(4000);
            con.setInstanceFollowRedirects(true);
            con.setRequestProperty("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            int code = con.getResponseCode();
            con.disconnect();
            return code >= 200 && code < 400;
        } catch (Exception e) {
            return false;
        }
    }

    // ── Suggest real web links (still available for manual re-search) ─────
    @PostMapping("/suggest-links")
    public ResponseEntity<Map<String, Object>> suggestLinks(@RequestBody Map<String, String> body) {
        String topicTitle = body.getOrDefault("topicTitle", "");
        if (topicTitle.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "topicTitle is required"));

        String rawJson = vertexAiService.suggestLinks(topicTitle);

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

    // ── HEAD-check a URL — used by frontend's manual re-search flow ───────
    @GetMapping("/check-link")
    public ResponseEntity<Map<String, Object>> checkLink(@RequestParam String url) {
        boolean alive = isUrlAlive(url);
        return ResponseEntity.ok(Map.of("alive", alive, "url", url));
    }

    // ── Get all newsletters ───────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<Newsletter>> getAll() {
        return ResponseEntity.ok(newsletterService.getAllNewsletters());
    }

    // ── Get one newsletter ────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<Newsletter> getOne(@PathVariable String id) {
        return ResponseEntity.ok(newsletterService.getById(id));
    }

    // ── Update newsletter content ─────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<Newsletter> update(
            @PathVariable String id,
            @RequestBody  Map<String, String> body) {
        return ResponseEntity.ok(
            newsletterService.updateContent(id, body.get("content"), body.get("title"))
        );
    }

    // ── Send newsletter by email ──────────────────────────────────────────
    @PostMapping("/{id}/send-email")
    public ResponseEntity<Map<String, String>> sendEmail(
            @PathVariable String id,
            @RequestBody  Map<String, String> body) {
        Newsletter nl = newsletterService.getById(id);
        emailService.sendNewsletter(nl, body.get("recipientEmail"));
        return ResponseEntity.ok(Map.of("status", "Email sent successfully"));
    }

    // ── Download newsletter HTML ──────────────────────────────────────────
    @GetMapping("/{id}/download")
    public ResponseEntity<String> download(@PathVariable String id) {
        Newsletter nl = newsletterService.getById(id);
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=newsletter.html")
            .header("Content-Type", "text/html")
            .body(nl.getTemplateHtml());
    }
}