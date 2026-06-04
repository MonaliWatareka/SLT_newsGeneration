package com.news.backend.service;

import com.news.backend.model.Newsletter;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendNewsletter(Newsletter newsletter, String recipientEmail) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(recipientEmail);
            helper.setSubject("Newsletter: " + newsletter.getTitle());
            helper.setText(newsletter.getTemplateHtml(), true); // true = send as HTML
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Email sending failed: " + e.getMessage(), e);
        }
    }
}
