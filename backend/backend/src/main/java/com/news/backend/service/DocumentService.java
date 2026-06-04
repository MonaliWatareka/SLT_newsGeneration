package com.news.backend.service;

import com.news.backend.model.NewsDocument;
import com.news.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;                    // ✅ NEW import for PDFBox 3.x
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final OllamaService ollamaService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public NewsDocument uploadAndProcess(MultipartFile file) throws IOException {
        // Save file to disk
        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);
        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        String fileType = detectType(file);
        String summary;

        if ("pdf".equals(fileType)) {
            // Extract text and summarize with llama3.2
            String extractedText = extractPdfText(filePath.toFile());
            summary = ollamaService.summarizeText(extractedText);
        } else {
            // Send image to llava for description
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            summary = ollamaService.describeImage(base64);
        }

        NewsDocument doc = new NewsDocument();
        doc.setOriginalFileName(file.getOriginalFilename());
        doc.setFileType(fileType);
        doc.setStoragePath(filePath.toString());
        doc.setSummary(summary);
        doc.setUploadedAt(LocalDateTime.now());
        doc.setStatus("summarized");
        return documentRepository.save(doc);
    }

    private String detectType(MultipartFile file) {
        String ct = file.getContentType();
        if (ct != null && ct.startsWith("image/")) return "image";
        if (ct != null && ct.equals("application/pdf")) return "pdf";
        return "unknown";
    }

    private String extractPdfText(File file) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(file)) {  // ✅ FIXED: PDFBox 3.x API
            return new PDFTextStripper().getText(pdf);
        }
    }

    public List<NewsDocument> getAllDocuments() {
        return documentRepository.findByOrderByUploadedAtDesc();
    }

    public NewsDocument getById(String id) {
        return documentRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Document not found: " + id));
    }

    public void deleteById(String id) {
        documentRepository.deleteById(id);
    }
}