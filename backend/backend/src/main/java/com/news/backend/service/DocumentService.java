package com.news.backend.service;

import com.news.backend.model.NewsDocument;
import com.news.backend.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final VertexAiService vertexAiService;   // ← was OllamaService

    @Value("${file.upload-dir}")
    private String uploadDir;

    public NewsDocument uploadAndProcess(MultipartFile file) throws IOException {
        // Save file to disk
        Path uploadPath = Paths.get(uploadDir);
        Files.createDirectories(uploadPath);
        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath   = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        String fileType = detectType(file);
        String summary;
        List<String> pageImages = new ArrayList<>();

        if ("pdf".equals(fileType)) {
            // Extract text → summarize with gemini-2.5-flash
            String extractedText = extractPdfText(filePath.toFile());
            summary    = vertexAiService.summarizeText(extractedText);

            // Render each PDF page as a base64 JPEG (max 7 pages)
            pageImages = renderPdfPages(filePath.toFile());

        } else {
            // Image file → describe with gemini-2.5-flash (multimodal)
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            summary = vertexAiService.describeImage(base64);

            // Store the image itself as the single "page"
            pageImages.add(base64);
        }

        NewsDocument doc = new NewsDocument();
        doc.setOriginalFileName(file.getOriginalFilename());
        doc.setFileType(fileType);
        doc.setStoragePath(filePath.toString());
        doc.setSummary(summary);
        doc.setPageImagesBase64(pageImages);
        doc.setUploadedAt(LocalDateTime.now());
        doc.setStatus("summarized");
        return documentRepository.save(doc);
    }

    // ── Render each PDF page as a base64 JPEG (150 DPI, max 7 pages) ────────
    private List<String> renderPdfPages(File file) throws IOException {
        List<String> pages = new ArrayList<>();
        try (PDDocument pdf = Loader.loadPDF(file)) {
            PDFRenderer renderer  = new PDFRenderer(pdf);
            int         pageCount = Math.min(pdf.getNumberOfPages(), 7);
            for (int i = 0; i < pageCount; i++) {
                BufferedImage         image = renderer.renderImageWithDPI(i, 150);
                ByteArrayOutputStream baos  = new ByteArrayOutputStream();
                ImageIO.write(image, "JPEG", baos);
                pages.add(Base64.getEncoder().encodeToString(baos.toByteArray()));
            }
        }
        return pages;
    }

    private String detectType(MultipartFile file) {
        String ct = file.getContentType();
        if (ct != null && ct.startsWith("image/"))      return "image";
        if (ct != null && ct.equals("application/pdf")) return "pdf";
        return "unknown";
    }

    private String extractPdfText(File file) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(file)) {
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