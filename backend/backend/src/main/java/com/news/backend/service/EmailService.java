package com.news.backend.service;

import com.news.backend.model.Newsletter;
import com.news.backend.model.SubTopic;
import jakarta.activation.DataSource;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendNewsletter(Newsletter newsletter, String recipientEmail) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            // MULTIPART_MODE_RELATED is required for CID inline image attachments
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_RELATED, "UTF-8");

            helper.setTo(recipientEmail);
            helper.setSubject("Newsletter: " + newsletter.getTitle());

            List<String> images = newsletter.getImageBase64List();
            int imageCount = (images != null) ? images.size() : 0;

            // Set HTML body first — references images by cid:pageN
            helper.setText(buildInlineHtml(newsletter, imageCount), true);

            // Attach each image as an inline CID part so Gmail can display it
            if (images != null) {
                for (int i = 0; i < images.size(); i++) {
                    byte[] imageBytes = Base64.getDecoder().decode(images.get(i));
                    DataSource ds = new ByteArrayDataSource(imageBytes, "image/jpeg");
                    helper.addInline("page" + (i + 1), ds);
                }
            }

            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Email sending failed: " + e.getMessage(), e);
        }
    }

    // ── Builds Gmail-safe fully inline-styled HTML; images referenced by cid: ──
    private String buildInlineHtml(Newsletter nl, int imageCount) {
        StringBuilder sb = new StringBuilder();

        sb.append("<!DOCTYPE html><html><head>")
          .append("<meta charset=\"UTF-8\">")
          .append("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\">")
          .append("<title>").append(safe(nl.getTitle())).append("</title>")
          .append("</head>")
          .append("<body style=\"margin:0;padding:20px;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;\">")
          .append("<div style=\"max-width:700px;margin:0 auto;background:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #ddd;\">");

        // ── HEADER ──
        sb.append("<div style=\"background:#0a1628;padding:28px 32px;text-align:center;border-bottom:3px solid #1a56a0;\">")
          .append("<div style=\"font-size:11px;font-weight:bold;letter-spacing:3px;color:#5a9fd4;text-transform:uppercase;margin-bottom:8px;\">SLTMobitel | InfiniAI</div>")
          .append("<h1 style=\"font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;line-height:1.3;margin:0;\">")
          .append(safe(nl.getTitle())).append("</h1>")
          .append("</div>");

        // ── IMAGES via CID (Gmail-safe, no base64 data: URIs) ──
        for (int i = 0; i < imageCount; i++) {
            sb.append("<div style=\"width:100%;border-bottom:3px solid #1a56a0;\">")
              .append("<div style=\"background:#0a1628;padding:6px 16px;font-size:11px;color:#5a9fd4;letter-spacing:1px;text-transform:uppercase;\">")
              .append("Page ").append(i + 1).append("</div>")
              // cid:pageN matches the Content-ID set in helper.addInline("pageN", ...)
              .append("<img src=\"cid:page").append(i + 1).append("\"")
              .append(" alt=\"Page ").append(i + 1).append("\"")
              .append(" style=\"width:100%;height:auto;display:block;\" />")
              .append("</div>");
        }

        // ── TODAY'S TOP STORY ──
        String mainTitle   = nl.getMainTopicTitle();
        String mainContent = nl.getMainTopicContent();
        String mainLink    = nl.getMainTopicLink();

        if (mainTitle != null && !mainTitle.isBlank()) {
            sb.append("<div style=\"padding:28px 32px;border-bottom:1px solid #e0e0e0;\">")
              .append("<div style=\"font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#1a56a0;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e8edf5;\">Today's Top Story</div>")
              .append("<div style=\"font-size:18px;font-weight:bold;color:#111827;margin-bottom:12px;line-height:1.4;\">")
              .append(safe(mainTitle)).append("</div>");

            if (mainContent != null && !mainContent.isBlank()) {
                sb.append("<div style=\"font-size:14px;color:#374151;line-height:1.85;margin-bottom:16px;\">")
                  .append(mainContent).append("</div>");
            }

            if (mainLink != null && !mainLink.isBlank()) {
                sb.append("<a href=\"").append(mainLink).append("\"")
                  .append(" style=\"display:inline-block;font-size:13px;font-weight:bold;color:#1a56a0;text-decoration:none;border-bottom:1px solid #1a56a0;padding-bottom:1px;\">")
                  .append("Read the full article</a>");
            }
            sb.append("</div>");
        }

        // ── MORE STORIES THIS WEEK ──
        List<SubTopic> subs = nl.getSubTopics();
        if (subs != null && !subs.isEmpty()) {
            sb.append("<div style=\"padding:28px 32px;border-bottom:1px solid #e0e0e0;\">")
              .append("<div style=\"font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#1a56a0;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e8edf5;\">More Stories This Week</div>");

            for (int i = 0; i < subs.size(); i++) {
                SubTopic sub = subs.get(i);
                boolean isLast = (i == subs.size() - 1);
                String divStyle = isLast
                    ? "margin-bottom:0;padding-bottom:0;"
                    : "margin-bottom:22px;padding-bottom:22px;border-bottom:1px solid #f0f0f0;";

                sb.append("<div style=\"").append(divStyle).append("\">")
                  .append("<div style=\"font-size:15px;font-weight:bold;color:#111827;margin-bottom:7px;\">")
                  .append(safe(sub.getTitle())).append("</div>");

                if (sub.getContent() != null && !sub.getContent().isBlank()) {
                    sb.append("<div style=\"font-size:13px;color:#4b5563;line-height:1.75;margin-bottom:9px;\">")
                      .append(sub.getContent()).append("</div>");
                }

                if (sub.getLink() != null && !sub.getLink().isBlank()) {
                    sb.append("<a href=\"").append(sub.getLink()).append("\"")
                      .append(" style=\"font-size:13px;font-weight:bold;color:#1a56a0;text-decoration:none;\">")
                      .append("Learn more</a>");
                }
                sb.append("</div>");
            }
            sb.append("</div>");
        }

        // ── FALLBACK: raw content if no structured topics ──
        if ((mainTitle == null || mainTitle.isBlank()) && nl.getNewsletterContent() != null) {
            sb.append("<div style=\"padding:28px 32px;border-bottom:1px solid #e0e0e0;\">")
              .append("<div style=\"font-size:14px;color:#374151;line-height:1.85;\">")
              .append(nl.getNewsletterContent())
              .append("</div></div>");
        }

        // ── WHATSAPP SECTION ──
        sb.append("<div style=\"padding:24px 32px;background:#f8f9fc;border-bottom:1px solid #e0e0e0;\">")
          .append("<div style=\"font-size:13px;font-weight:bold;color:#111827;margin-bottom:10px;\">More AI insights from InfiniAI WhatsApp Channel</div>")
          .append("<p style=\"font-size:13px;color:#374151;line-height:1.7;\">")
          .append("<span style=\"font-size:15px;margin-right:5px;\">👉</span>")
          .append("Stay ahead - Join the ")
          .append("<a href=\"https://whatsapp.com/channel/0029Vb5sSYT2Jl8HfPhnAE1D\" style=\"color:#25d366;font-weight:bold;text-decoration:none;\">InfiniAI WhatsApp Channel</a>")
          .append(" for daily updates.</p>")
          .append("</div>");

        // ── FOOTER ──
        sb.append("<div style=\"background:#0a1628;padding:18px 32px;text-align:center;\">")
          .append("<p style=\"font-size:12px;color:#7a9bbf;line-height:1.6;\">")
          .append("<strong style=\"color:#a8c4e0;\">© 2026 SLTMobitel | InfiniAI — AI &amp; Data Office</strong>")
          .append("</p>")
          .append("<p style=\"font-size:11px;color:#4a6a8a;margin-top:6px;\">Auto-generated by SLT News Generator using Ollama AI</p>")
          .append("</div>");

        sb.append("</div></body></html>");
        return sb.toString();
    }

    // ── Escape HTML special chars for safe text node insertion ──
    private String safe(String text) {
        if (text == null) return "";
        return text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }
}