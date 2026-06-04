package com.news.backend.controller;


import com.news.backend.model.NewsDocument;
import com.news.backend.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping("/upload")
    public ResponseEntity<NewsDocument> upload(@RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(documentService.uploadAndProcess(file));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping
    public ResponseEntity<List<NewsDocument>> getAll() {
        return ResponseEntity.ok(documentService.getAllDocuments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NewsDocument> getOne(@PathVariable String id) {
        return ResponseEntity.ok(documentService.getById(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        documentService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
