package com.news.backend.service;

import com.news.backend.model.NewsDocument;
import com.news.backend.model.Newsletter;
import com.news.backend.model.SubTopic;
import com.news.backend.repository.DocumentRepository;
import com.news.backend.repository.NewsletterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NewsletterService {

    private final NewsletterRepository newsletterRepository;
    private final DocumentRepository documentRepository;
    private final OllamaService ollamaService;
    private final TemplateEngine templateEngine;

    // ── Called when user clicks "Generate Newsletter" ──
    public Newsletter generateFromDocuments(
            List<String> documentIds,
            String title,
            String mainTopicTitle,
            String mainTopicLink,
            List<SubTopic> subTopics,
            List<String> imageBase64List
    ) {
        StringBuilder combinedSummary = new StringBuilder();
        for (String docId : documentIds) {
            NewsDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new RuntimeException("Doc not found: " + docId));
            combinedSummary.append(doc.getSummary()).append("\n\n");
        }

        // Let Ollama generate the main body content
        String newsletterContent = ollamaService.generateNewsletter(
            combinedSummary.toString(), title
        );

        // Render HTML template with all fields
        String templateHtml = renderTemplate(
            title, newsletterContent,
            mainTopicTitle, mainTopicLink,
            subTopics, imageBase64List
        );

        Newsletter newsletter = new Newsletter();
        newsletter.setTitle(title);
        newsletter.setSummary(combinedSummary.toString());
        newsletter.setNewsletterContent(newsletterContent);
        newsletter.setTemplateHtml(templateHtml);
        newsletter.setDocumentIds(documentIds);
        newsletter.setCreatedAt(LocalDateTime.now());
        newsletter.setEmailSent(false);

        // Save structured fields
        newsletter.setMainTopicTitle(mainTopicTitle);
        newsletter.setMainTopicContent(formatHtml(newsletterContent)); // Ollama output is main content
        newsletter.setMainTopicLink(mainTopicLink);
        newsletter.setSubTopics(subTopics);
        newsletter.setImageBase64List(imageBase64List);

        return newsletterRepository.save(newsletter);
    }

    // ── Called when user edits and saves ──
    public Newsletter updateContent(String id, String newContent, String title) {
        Newsletter nl = getById(id);
        nl.setNewsletterContent(newContent);
        nl.setTitle(title);
        nl.setMainTopicContent(formatHtml(newContent));

        nl.setTemplateHtml(renderTemplate(
            title, newContent,
            nl.getMainTopicTitle(), nl.getMainTopicLink(),
            nl.getSubTopics(), nl.getImageBase64List()
        ));
        return newsletterRepository.save(nl);
    }

    // ── Core template renderer ──
    private String renderTemplate(
            String title,
            String content,
            String mainTopicTitle,
            String mainTopicLink,
            List<SubTopic> subTopics,
            List<String> imageBase64List
    ) {
        Context ctx = new Context();
        ctx.setVariable("title", title);
        ctx.setVariable("content", formatHtml(content));
        ctx.setVariable("generatedDate", LocalDateTime.now().toString());
        ctx.setVariable("mainTopicTitle", mainTopicTitle != null ? mainTopicTitle : "");
        ctx.setVariable("mainTopicContent", formatHtml(content));  // Ollama content = main body
        ctx.setVariable("mainTopicLink", mainTopicLink != null ? mainTopicLink : "");
        ctx.setVariable("subTopics", subTopics != null ? subTopics : List.of());
        ctx.setVariable("imageBase64List", imageBase64List != null ? imageBase64List : List.of());

        return templateEngine.process("newsletter-template", ctx);
    }

    // ── Convert plain text to HTML line breaks ──
    private String formatHtml(String text) {
        if (text == null) return "";
        return text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\r\n", "<br/>")
            .replace("\n", "<br/>");
    }

    public List<Newsletter> getAllNewsletters() {
        return newsletterRepository.findByOrderByCreatedAtDesc();
    }

    public Newsletter getById(String id) {
        return newsletterRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Newsletter not found: " + id));
    }
}