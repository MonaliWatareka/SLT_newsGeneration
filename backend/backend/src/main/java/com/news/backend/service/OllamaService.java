package com.news.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

@Service
public class OllamaService {

    @Value("${ollama.base-url}")
    private String ollamaBaseUrl;

    @Value("${ollama.model}")
    private String model;                   // llama3.2

    @Value("${ollama.vision-model}")
    private String visionModel;             // llava

    private final WebClient webClient;
    private final ObjectMapper mapper = new ObjectMapper();

    public OllamaService(WebClient.Builder builder) {
        this.webClient = builder.build();
    }

    // ── Called for PDFs (text model) ──
    public String summarizeText(String text) {
        String prompt = """
            Summarize the following document in 3-5 concise paragraphs.
            Focus on key findings, main topics, and important details.
            Document:
            ---
            %s
            ---
            Summary:
            """.formatted(truncate(text, 3000));
        return callOllama(prompt, model);
    }

    // ── Called for images (vision model - llava) ──
    public String describeImage(String base64Image) {
        try {
            Map<String, Object> requestBody = Map.of(
                "model", visionModel,
                "prompt", "Describe this image in detail. Extract any visible text, data, charts, or key information.",
                "images", new String[]{ base64Image },
                "stream", false
            );
            String response = webClient.post()
                .uri(ollamaBaseUrl + "/api/generate")
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();
            JsonNode node = mapper.readTree(response);
            return node.get("response").asText();
        } catch (Exception e) {
            throw new RuntimeException("Ollama vision call failed: " + e.getMessage(), e);
        }
    }

    // ── Newsletter body generation (text model) ──
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
        return callOllama(prompt, model);
    }

    // ── Extract structured stories from combined document summaries ──
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
            """.formatted(truncate(summary, 3500));
        return callOllama(prompt, model);
    }

    // ── Suggest 3 relevant LinkedIn search URLs for a given topic title ──
    // Returns JSON: { links: [ {label, url}, ... ] }
    public String suggestLinks(String topicTitle) {
        String prompt = """
            You are a research assistant. Given the topic title below, generate 3 relevant
            LinkedIn search URLs that a reader could visit to find related articles and posts.

            Use this LinkedIn search URL format:
            https://www.linkedin.com/search/results/content/?keywords=SEARCH+TERMS&origin=GLOBAL_SEARCH_HEADER

            Rules:
            - Replace SEARCH+TERMS with relevant keywords from the topic (URL-encoded, spaces as +)
            - Make each search query different — vary the angle (e.g. one broad, one technical, one trend-focused)
            - Return ONLY valid JSON, no markdown, no code fences, no explanation
            - Use this exact format:
            {
              "links": [
                { "label": "Short descriptive label", "url": "https://www.linkedin.com/search/results/content/?keywords=..." },
                { "label": "Short descriptive label", "url": "https://www.linkedin.com/search/results/content/?keywords=..." },
                { "label": "Short descriptive label", "url": "https://www.linkedin.com/search/results/content/?keywords=..." }
              ]
            }

            Topic: %s
            """.formatted(topicTitle);
        return callOllama(prompt, model);
    }

    private String callOllama(String prompt, String modelName) {
        try {
            Map<String, Object> requestBody = Map.of(
                "model", modelName,
                "prompt", prompt,
                "stream", false
            );
            String response = webClient.post()
                .uri(ollamaBaseUrl + "/api/generate")
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();
            JsonNode node = mapper.readTree(response);
            return node.get("response").asText();
        } catch (Exception e) {
            throw new RuntimeException("Ollama call failed: " + e.getMessage(), e);
        }
    }

    private String truncate(String text, int maxChars) {
        return text.length() > maxChars ? text.substring(0, maxChars) + "..." : text;
    }
}