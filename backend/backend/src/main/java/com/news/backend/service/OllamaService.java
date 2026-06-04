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

    // Called for PDFs (text model)
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

    // Called for images (vision model - llava)
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

    // Newsletter generation (text model)
    public String generateNewsletter(String summary, String title) {
        String prompt = """
            You are a professional newsletter writer.
            Based on the summary below, write a polished newsletter article.
            Include:
            - An engaging headline
            - An introduction paragraph
            - 2-3 body sections with subheadings
            - A closing paragraph with key takeaways

            Title: %s
            Summary:
            ---
            %s
            ---
            Newsletter:
            """.formatted(title, summary);
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