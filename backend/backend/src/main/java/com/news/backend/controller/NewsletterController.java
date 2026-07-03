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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/newsletters")
@RequiredArgsConstructor
@SuppressWarnings("unchecked")
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

    // ── Auto-extract stories + page images + working links ────────────────
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

            // Auto-fetch verified link for main story
            Map<String, Object> mainStory = (Map<String, Object>) parsed.get("mainStory");
            if (mainStory != null) {
                String mainTitle = (String) mainStory.get("title");
                if (mainTitle != null && !mainTitle.isBlank())
                    mainStory.put("link", fetchFirstWorkingLink(mainTitle));
            }

            // Auto-fetch verified link for each sub-story
            List<Map<String, Object>> subStories =
                (List<Map<String, Object>>) parsed.get("subStories");
            if (subStories != null) {
                for (Map<String, Object> sub : subStories) {
                    String subTitle = (String) sub.get("title");
                    if (subTitle != null && !subTitle.isBlank())
                        sub.put("link", fetchFirstWorkingLink(subTitle));
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

    // ── Suggest real web links (manual re-search) ─────────────────────────
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

    // ── HEAD-check a URL ──────────────────────────────────────────────────
    @GetMapping("/check-link")
    public ResponseEntity<Map<String, Object>> checkLink(@RequestParam String url) {
        boolean alive = isUrlAlive(url);
        return ResponseEntity.ok(Map.of("alive", alive, "url", url));
    }

    // ── Download newsletter as PDF ────────────────────────────────────────
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable String id) {
        Newsletter nl = newsletterService.getById(id);

        try {
            String html = nl.getTemplateHtml();

            // ── 1. Strip any existing XML declaration and DOCTYPE ──────────
            //    Flying Saucer fails with "Already seen doctype" if there are two
            html = html
                .replaceAll("(?i)<\\?xml[^>]*\\?>\\s*", "")
                .replaceAll("(?i)<!DOCTYPE[^>]*>\\s*", "")
                .trim();

            // ── 2. Fix common HTML entities Flying Saucer can't parse ──────
            html = html
                .replace("&nbsp;",   "&#160;")
                .replace("&copy;",   "&#169;")
                .replace("&trade;",  "&#8482;")
                .replace("&mdash;",  "&#8212;")
                .replace("&ndash;",  "&#8211;")
                .replace("&laquo;",  "&#171;")
                .replace("&raquo;",  "&#187;")
                .replace("&hellip;", "&#8230;");

            // ── 3. Self-close void elements (meta, br, img, link, hr, input, ─
            //      area, base, col, embed, source, track, wbr).
            //    HTML allows these unclosed (e.g. <meta charset="UTF-8">),
            //    but Flying Saucer parses as strict XML, which requires
            //    either a matching end tag or a self-closing "/>".
            //    This regex normalizes both closed and unclosed forms into
            //    a single self-closed tag, so it's safe to run even if some
            //    of them are already written as <br /> etc.
            html = html.replaceAll(
                "(?is)<(meta|br|img|link|hr|input|area|base|col|embed|source|track|wbr)"
                    + "((?:\\s+[a-zA-Z-:]+(?:=(?:\"[^\"]*\"|'[^']*'|[^\\s>]+))?)*)"
                    + "\\s*/?>",
                "<$1$2 />"
            );

            // ── 4. Ensure the <html> tag has exactly one XHTML namespace ───
            //    NOTE: these two cases are mutually exclusive (if/else).
            //    Previously both replace() calls ran back-to-back, so the
            //    output of the first ("<html>" -> "<html xmlns=...">")
            //    was then re-matched by the second ("<html " -> ...),
            //    producing a duplicate xmlns attribute and a SAXParseException.
            if (!html.contains("xmlns=")) {
                if (html.contains("<html>")) {
                    html = html.replace("<html>",
                        "<html xmlns=\"http://www.w3.org/1999/xhtml\">");
                } else {
                    html = html.replaceFirst("<html\\s",
                        "<html xmlns=\"http://www.w3.org/1999/xhtml\" ");
                }
            }

            // ── 5. Prepend a single clean XHTML DOCTYPE ────────────────────
            String xhtml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                + "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\"\n"
                + "  \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n"
                + html;

            // ── 6. Render XHTML → PDF with Flying Saucer + OpenPDF ─────────
            ITextRenderer renderer = new ITextRenderer();
            renderer.setDocumentFromString(xhtml);
            renderer.layout();

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            renderer.createPDF(out);
            byte[] pdfBytes = out.toByteArray();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "newsletter.pdf");
            headers.setContentLength(pdfBytes.length);

            return ResponseEntity.ok().headers(headers).body(pdfBytes);

        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
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

    // ── Private helpers ───────────────────────────────────────────────────

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
            List<Map<String, String>> links =
                (List<Map<String, String>>) parsed.get("links");
            if (links == null) return "";

            for (Map<String, String> link : links) {
                String url = link.get("url");
                if (url != null && !url.isBlank() && isUrlAlive(url))
                    return url;
            }
        } catch (Exception ignored) {}
        return "";
    }

    private boolean isUrlAlive(String url) {
        try {
            HttpURLConnection con =
                (HttpURLConnection) new URI(url).toURL().openConnection();
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
}