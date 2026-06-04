package com.news.backend.service;

import com.news.backend.model.NewsDocument;
import com.news.backend.model.Newsletter;
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

    public Newsletter generateFromDocuments(List<String> documentIds, String title) {
        StringBuilder combinedSummary = new StringBuilder();
        for (String docId : documentIds) {
            NewsDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new RuntimeException("Doc not found: " + docId));
            combinedSummary.append(doc.getSummary()).append("\n\n");
        }

        String newsletterContent = ollamaService.generateNewsletter(
            combinedSummary.toString(), title
        );

        String templateHtml = renderTemplate(title, newsletterContent);

        Newsletter newsletter = new Newsletter();
        newsletter.setTitle(title);
        newsletter.setSummary(combinedSummary.toString());
        newsletter.setNewsletterContent(newsletterContent);
        newsletter.setTemplateHtml(templateHtml);
        newsletter.setDocumentIds(documentIds);
        newsletter.setCreatedAt(LocalDateTime.now());
        newsletter.setEmailSent(false);

        return newsletterRepository.save(newsletter);
    }

    public Newsletter updateContent(String id, String newContent, String title) {
        Newsletter nl = getById(id);
        nl.setNewsletterContent(newContent);
        nl.setTitle(title);
        nl.setTemplateHtml(renderTemplate(title, newContent));
        return newsletterRepository.save(nl);
    }

    private String renderTemplate(String title, String content) {
        String htmlContent = content
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\r\n", "<br/>")  // Windows line endings first
            .replace("\n", "<br/>");   // then Unix

        Context ctx = new Context();
        ctx.setVariable("title", title);
        ctx.setVariable("content", htmlContent);
        ctx.setVariable("generatedDate", LocalDateTime.now().toString());

        return templateEngine.process("newsletter-template", ctx);
    }

    public List<Newsletter> getAllNewsletters() {
        return newsletterRepository.findByOrderByCreatedAtDesc();
    }

    public Newsletter getById(String id) {
        return newsletterRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Newsletter not found: " + id));
    }
}