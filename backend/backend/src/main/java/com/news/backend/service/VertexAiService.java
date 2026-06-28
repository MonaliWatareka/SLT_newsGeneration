package com.news.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.*;

@Service
public class VertexAiService {

    @Value("${vertex.project-id}")
    private String projectId;

    @Value("${vertex.location}")
    private String location;

    @Value("${vertex.model}")
    private String model;

    @Value("${vertex.credentials-path}")
    private Resource credentialsResource;

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper mapper = new ObjectMapper();
    private GoogleCredentials credentials;

    public VertexAiService(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
    }

    @PostConstruct
    public void init() throws IOException {
        credentials = ServiceAccountCredentials
            .fromStream(credentialsResource.getInputStream())
            .createScoped(List.of("https://www.googleapis.com/auth/cloud-platform"));
    }

    private String getAccessToken() throws IOException {
        credentials.refreshIfExpired();
        return credentials.getAccessToken().getTokenValue();
    }

    /**
     * gemini-2.5-flash is served via the GLOBAL endpoint only:
     *   https://aiplatform.googleapis.com  (no region prefix)
     *   location path segment = "global"
     */
    private String endpointUrl() {
        return "https://aiplatform.googleapis.com/v1/projects/"
            + projectId
            + "/locations/global"
            + "/publishers/google/models/"
            + model + ":generateContent";
    }

    // ══════════════════════════════════════════════════════════════════════
    //  PRIVATE CALLERS
    // ══════════════════════════════════════════════════════════════════════

    private String callGemini(String prompt) {
        try {
            String token = getAccessToken();

            Map<String, Object> part    = Map.of("text", prompt);
            Map<String, Object> content = Map.of("role", "user", "parts", List.of(part));
            Map<String, Object> body    = Map.of("contents", List.of(content));

            String raw = webClientBuilder.build()
                .post()
                .uri(endpointUrl())
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            JsonNode root = mapper.readTree(raw);
            return root.path("candidates").get(0)
                       .path("content").path("parts").get(0)
                       .path("text").asText();

        } catch (Exception e) {
            throw new RuntimeException("Vertex AI text call failed: " + e.getMessage(), e);
        }
    }

    private String callGeminiWithImage(String prompt, String base64Image) {
        try {
            String token = getAccessToken();

            Map<String, Object> textPart  = Map.of("text", prompt);
            Map<String, Object> imagePart = Map.of(
                "inline_data", Map.of(
                    "mime_type", "image/jpeg",
                    "data", base64Image
                )
            );
            Map<String, Object> content = Map.of(
                "role", "user",
                "parts", List.of(textPart, imagePart)
            );
            Map<String, Object> body = Map.of("contents", List.of(content));

            String raw = webClientBuilder.build()
                .post()
                .uri(endpointUrl())
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            JsonNode root = mapper.readTree(raw);
            return root.path("candidates").get(0)
                       .path("content").path("parts").get(0)
                       .path("text").asText();

        } catch (Exception e) {
            throw new RuntimeException("Vertex AI vision call failed: " + e.getMessage(), e);
        }
    }

    private String callGeminiWithGrounding(String prompt) {
        try {
            String token = getAccessToken();

            Map<String, Object> part    = Map.of("text", prompt);
            Map<String, Object> content = Map.of("role", "user", "parts", List.of(part));

            Map<String, Object> dynamicConfig   = Map.of("mode", "MODE_DYNAMIC", "dynamic_threshold", 0.3);
            Map<String, Object> searchRetrieval = Map.of("dynamic_retrieval_config", dynamicConfig);
            Map<String, Object> tool            = Map.of("google_search_retrieval", searchRetrieval);

            Map<String, Object> body = Map.of(
                "contents", List.of(content),
                "tools",    List.of(tool)
            );

            String raw = webClientBuilder.build()
                .post()
                .uri(endpointUrl())
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

            JsonNode root      = mapper.readTree(raw);
            JsonNode candidate = root.path("candidates").get(0);

            // ── Extract real URLs from grounding metadata ──────────────
            JsonNode groundingMeta = candidate.path("groundingMetadata");
            if (!groundingMeta.isMissingNode()) {
                JsonNode chunks = groundingMeta.path("groundingChunks");
                List<Map<String, String>> links = new ArrayList<>();

                if (chunks.isArray()) {
                    for (JsonNode chunk : chunks) {
                        JsonNode web = chunk.path("web");
                        if (!web.isMissingNode()) {
                            String url   = web.path("uri").asText("");
                            String title = web.path("title").asText("Related Article");
                            if (!url.isBlank()) {
                                links.add(Map.of("label", title, "url", url));
                                if (links.size() >= 5) break; // fetch extra so validator has room
                            }
                        }
                    }
                }

                if (!links.isEmpty()) {
                    return mapper.writeValueAsString(Map.of("links", links));
                }
            }

            // ── Fallback: parse JSON from Gemini text response ─────────
            return candidate.path("content").path("parts").get(0)
                            .path("text").asText();

        } catch (Exception e) {
            return callGemini(prompt);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  PUBLIC API
    // ══════════════════════════════════════════════════════════════════════

    public String summarizeText(String text) {
        String prompt = """
            Summarize the following document in 3-5 concise paragraphs.
            Focus on key findings, main topics, and important details.
            Document:
            ---
            %s
            ---
            Summary:
            """.formatted(truncate(text, 30000));
        return callGemini(prompt);
    }

    public String describeImage(String base64Image) {
        return callGeminiWithImage(
            "Describe this image in detail. Extract any visible text, data, charts, or key information.",
            base64Image
        );
    }

    public String generateNewsletter(String summary, String title) {
        String prompt = """
            You are a professional newsletter writer.
            Based on the summary below, write a SHORT and concise main story summary.

            Rules:
            - Maximum 3-4 sentences total
            - No headings, no subheadings, no bullet points
            - No introduction phrases like "In this edition..." or "Welcome to..."
            - Just a clean, direct paragraph summarising the key insight
            - Plain text only, no markdown, no asterisks

            Title: %s
            Summary:
            ---
            %s
            ---
            Short summary:
            """.formatted(title, summary);
        return callGemini(prompt);
    }

    public String extractStories(String summary) {
        String prompt = """
            You are an editorial AI assistant for a corporate newsletter.
            Given the content below extracted from uploaded PDF slides, identify the most important story
            as the main topic, and the remaining topics as sub-stories.

            Return ONLY valid JSON in this exact format with no extra text, no markdown, no code fences:
            {
              "mainStory": {
                "title": "A concise, engaging headline for the main topic",
                "content": "2-3 sentence summary of the main topic suitable for a newsletter"
              },
              "subStories": [
                {
                  "title": "Headline for sub-story 1",
                  "content": "1-2 sentence summary of sub-story 1"
                },
                {
                  "title": "Headline for sub-story 2",
                  "content": "1-2 sentence summary of sub-story 2"
                }
              ]
            }

            Content:
            ---
            %s
            ---
            """.formatted(truncate(summary, 30000));
        return callGemini(prompt);
    }

    /**
     * Suggest web links — restricted to stable major domains so URLs don't go 404.
     * Fetches up to 5 so the backend validator can discard dead ones and still
     * return 3 working links.
     */
    public String suggestLinks(String topicTitle) {
        String prompt = """
            Find 5 relevant, real web pages about this topic: "%s"

            STRICT DOMAIN RULES — only use URLs from these trusted, stable domains:
            bbc.com, reuters.com, techcrunch.com, wired.com, forbes.com,
            mit.edu, ieee.org, mckinsey.com, gartner.com, hbr.org,
            nature.com, sciencedaily.com, theverge.com, zdnet.com,
            technologyreview.com, venturebeat.com, analyticsvidhya.com,
            towardsdatascience.com, medium.com, arxiv.org, acm.org,
            itu.int, gsma.com, telecomtv.com, lightreading.com

            ADDITIONAL RULES:
            - Prefer section/category pages over deep article URLs (they don't go 404)
            - Never use press-release, event, or PDF URLs
            - Each link must cover a different angle of the topic
            - If unsure about a specific article URL, use the site's topic section instead
              e.g. https://www.bbc.com/news/technology instead of a specific article

            Return ONLY valid JSON (no markdown, no code fences):
            {
              "links": [
                { "label": "Short descriptive label", "url": "https://..." },
                { "label": "Short descriptive label", "url": "https://..." },
                { "label": "Short descriptive label", "url": "https://..." },
                { "label": "Short descriptive label", "url": "https://..." },
                { "label": "Short descriptive label", "url": "https://..." }
              ]
            }
            """.formatted(topicTitle);
        return callGeminiWithGrounding(prompt);
    }

    private String truncate(String text, int maxChars) {
        if (text == null) return "";
        return text.length() > maxChars ? text.substring(0, maxChars) + "…" : text;
    }
}