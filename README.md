# InfiniAI Pulse

**AI-powered weekly newsletter generation system — SLT-Mobitel AI & Data Office**

InfiniAI Pulse is a full-stack application that automates the creation of the "InfiniAI Pulse" newsletter: a picture-led, magazine-style AI & Data news digest. It ships in two working modes:

1. **Automated pipeline (n8n)** — every Wednesday at midnight it reads 18 AI/data news sources, picks the most important stories, designs the page, and drops a finished PDF into a folder — with no human input.
2. **Web application (Spring Boot + React)** — a 3-step tool (Upload → Generate → Send) where a user uploads a PDF or images, and the app extracts stories, finds real web links, writes the newsletter copy, and emails or downloads it as a PDF.

A human still reviews every issue before it's circulated.

---

## Table of Contents
- [Overview](#overview)
- [What It Replaces](#what-it-replaces)
- [Architecture](#architecture)
  - [Automated Pipeline (n8n)](#1-automated-pipeline-n8n)
  - [Web Application (Spring Boot + React)](#2-web-application-spring-boot--react)
- [Tech Stack](#tech-stack)
- [AI Models & Capabilities](#ai-models--capabilities)
- [Application Flow](#application-flow)
- [Key Features](#key-features)
- [Backend Components](#backend-components)
- [Frontend Components](#frontend-components)
- [Deployment](#deployment)
- [Credentials & Security](#credentials--security)
- [Development Timeline](#development-timeline)
- [Challenges & Solutions](#challenges--solutions)
- [Honest Limitations](#honest-limitations)
- [Future Improvements](#future-improvements)

---

## Overview

The **SLT-Mobitel InfiniAI News Generation App** automates production of the InfiniAI Pulse newsletter using Google's Gemini AI model. It extracts key topics from source content, generates structured newsletter copy, finds verified web links via Google Search Grounding, and delivers the final newsletter by email or PDF — all with minimal manual input.

**Key objectives:**
- Automate newsletter generation from PDF documents / news feeds using AI
- Extract main topics and sub-topics automatically from content
- Generate verified, working web links per topic via Google Search
- Deliver newsletters via Gmail SMTP and downloadable PDF
- Provide a clean, minimal user interface
- Deploy on a production Linux VM using Docker

## What It Replaces

Previously, each issue was assembled by hand — reading the week's news, choosing stories, sourcing graphics, and laying out pages — taking several hours a week. The system now handles reading, selection, writing, and layout automatically; a person only reviews the result before circulation.

---

## Architecture

The project has two complementary implementations:

### 1. Automated Pipeline (n8n)

A scheduled, no-touch pipeline that produces the newsletter as a static PDF file on a shared drive.

| # | Step | What Happens |
|---|------|---------------|
| 1 | Every Wednesday 00:00 | Scheduled trigger starts the sequence automatically |
| 2 | Run manually (test) | Manual trigger for on-demand issues |
| 3 | Feed List | Holds the list of 18 news sources |
| 4 | RSS Read | Downloads recent articles from all sources (~2,500 items) |
| 5 | Normalise & Dedupe | Strips formatting, keeps last 7 days, removes duplicates, caps 6 items/publisher, prioritizes photographed articles (~70 survive) |
| 6 | Build Prompt | Writes the editorial brief for the AI |
| 7 | Gemini — Write the Issue | Reads all 70 articles, picks the most consequential, writes headlines/summaries, designs every tile |
| 8 | Parse Issue JSON | Validates the AI's output; stops with a clear message on failure |
| 9 | Attach Photos | Matches stories back to source articles and attaches credited photos |
| 10 | Build HTML | Renders masthead, brand colours, story tiles, charts, diagrams, timelines |
| 11 | Gotenberg → PDF | Converts the page to an A4 PDF with header/footer on every page |
| 12 | Save PDF locally | Saves the finished file, named by date, to `E:\InfiniAI\newsletters` |

**Tools used (n8n pipeline) — total running cost: $0**

| Tool | Purpose | Cost |
|------|---------|------|
| n8n | Automation engine, runs the sequence on schedule | Free, self-hosted |
| Docker Desktop | Runs n8n and the PDF service | Free |
| Google Gemini API | Reads articles, selects stories, writes copy, designs layout | Free tier |
| Gotenberg | Converts the designed page to a print-quality PDF | Free, self-hosted |
| QuickChart | Renders pie and bar charts as images | Free, no account |
| RSS feeds (18) | News source: TechCrunch, VentureBeat, The Verge, MIT Technology Review, Wired, Google News, etc. | Free, no account |

**Visuals** come from three sources, all free: publisher article photographs (credited), charts drawn from figures in the articles, and self-drawn diagrams (pipelines, timelines, maturity staircases, 2×2 matrices, ranked lists, comparison grids) — all sourced only from what the articles actually say.

### 2. Web Application (Spring Boot + React)

A user-driven application for generating newsletters from uploaded PDFs or images.

| Layer | Component | Technology |
|-------|-----------|------------|
| Presentation | React SPA | React 18, Vite, Axios |
| Web Server | Nginx | Reverse proxy, port 8083 |
| API | REST Controllers | Spring Boot, port 8080 |
| Service | Business Logic | Java Services |
| AI Layer | Vertex AI Service | Gemini 2.5 Flash API |
| Data | MongoDB Atlas | Cloud NoSQL, Atlas cluster |
| Storage | File System | Docker volume `/app/uploads` |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | UI framework and build tool |
| Styling | CSS + Inline Styles | Custom dark theme UI |
| HTTP Client | Axios | API calls from frontend to backend |
| Backend | Spring Boot 4.0.6 | REST API server |
| Language | Java 21 | Backend programming language |
| AI Provider | Google Vertex AI | Cloud AI platform |
| AI Model (Text) | Gemini 2.5 Flash | Text summarization & generation |
| AI Model (Vision) | Gemini 2.5 Flash | Image description (multimodal) |
| Link Search | Google Search Grounding | Real web link discovery |
| Database | MongoDB Atlas | Cloud NoSQL database |
| PDF Processing | Apache PDFBox 3.0.1 | PDF text extraction & rendering |
| PDF Generation | Flying Saucer + OpenPDF | HTML to PDF conversion |
| Email | Spring Mail + Gmail SMTP | Newsletter email delivery |
| Template Engine | Thymeleaf | HTML newsletter template rendering |
| Containerization | Docker + Docker Compose | Application packaging & deployment |
| Web Server | Nginx | Reverse proxy for frontend |
| Version Control | Git + GitHub | Source code management |
| Auth (AI) | Google Service Account | Vertex AI authentication via JSON key |
| Automation (pipeline mode) | n8n | Scheduling and orchestration |
| PDF rendering (pipeline mode) | Gotenberg | HTML → print-quality PDF |
| Charts (pipeline mode) | QuickChart | Pie/bar chart image rendering |

---

## AI Models & Capabilities

### Primary Model — Google Gemini 2.5 Flash
Accessed via the Vertex AI API (global endpoint). Gemini 2.5 Flash is a multimodal LLM handling both text and images in a single model, replacing the project's earlier separate Ollama models (`llama3.2` for text, `llava` for vision).

| Capability | Model Call | Description |
|------------|-----------|--------------|
| Text Summarization | `callGemini()` | Summarizes extracted PDF text into 3–5 paragraphs |
| Image Description | `callGeminiWithImage()` | Describes uploaded images using multimodal vision |
| Story Extraction | `callGemini()` | Extracts main story + sub-stories as structured JSON |
| Newsletter Writing | `callGemini()` | Writes a 3–4 sentence professional newsletter body |
| Web Link Discovery | `callGeminiWithGrounding()` | Finds real web URLs via Google Search Grounding |

### Google Search Grounding
A Vertex AI capability letting Gemini perform real-time web searches and return actual result URLs. Used to discover and verify working links for each newsletter topic — the system fetches up to 5 candidate URLs per topic, then performs HTTP HEAD checks to validate a 2xx/3xx response before showing them to the user.

### Previous Model — Ollama (initial phase)
The initial build used locally-run Ollama (`llama3.2` for text, `llava` for images), later migrated to Vertex AI/Gemini for cloud-based processing, better accuracy, a much larger context window (~1M vs ~4K tokens), and real web search capability.

---

## Application Flow

### PDF Upload Flow

| # | Step | Description |
|---|------|-------------|
| 1 | Upload | User drags a PDF into the upload zone |
| 2 | Save | Backend saves the file to `/uploads` |
| 3 | Extract Text | Apache PDFBox extracts all text |
| 4 | Summarize | Gemini 2.5 Flash summarizes into 3–5 paragraphs |
| 5 | Render Pages | PDFBox renders each page as base64 JPEG (max 7 pages) |
| 6 | Save to DB | `NewsDocument` saved to MongoDB Atlas |
| 7 | Auto-Select | Frontend auto-selects the document |
| 8 | Extract Stories | Gemini extracts main story + sub-stories as JSON |
| 9 | Find Links | Google Search Grounding finds verified URLs per topic |
| 10 | Fill Editor | Editor auto-filled with titles, descriptions, links |
| 11 | Generate | User clicks Generate — Gemini writes the newsletter body |
| 12 | Render HTML | Thymeleaf renders the full newsletter template |
| 13 | Send/Download | User sends via Gmail or downloads as PDF |

### Image Upload Flow

When users upload multiple images instead of a PDF: images are stitched into a single PDF (one image per page) via Apache PDFBox → each page is described with Gemini Vision → descriptions are combined and summarized → the generated PDF is saved with a download button → the flow continues through the same newsletter generation pipeline as a regular PDF.

---

## Key Features

- **PDF Upload & Processing** — drag-and-drop PDF upload with text extraction and page rendering
- **Image Upload → Auto PDF** — multiple images stitched into a PDF, processed with Gemini Vision
- **AI Summarization** — structured newsletter content from uploaded material
- **Auto Story Extraction** — one main story + multiple sub-stories, extracted as structured JSON
- **Real Web Link Discovery** — Google Search Grounding finds real, verified working URLs per topic
- **URL Validation** — HTTP HEAD checks confirm each link returns 2xx/3xx before display
- **Branded Newsletter Template** — dark navy header, page images, stories, InfiniAI Pulse styling
- **Email Delivery** — Gmail SMTP with embedded images as CID attachments
- **PDF Download** — HTML-to-PDF via Flying Saucer + OpenPDF
- **Regenerate Button** — re-run AI extraction if the first pass is unsatisfactory
- **Simplified 3-step UI** — Upload → Generate → Send
- **Docker Deployment** — frontend and backend containerized with Docker Compose

---

## Backend Components

**Controllers**
- `DocumentController` — `/api/documents` (upload, list, delete, download PDF)
- `NewsletterController` — `/api/newsletters` (generate, extract-stories, suggest-links, send-email, download)

**Services**
- `DocumentService` — file storage, PDF text extraction, page rendering, image stitching
- `NewsletterService` — newsletter generation, Thymeleaf rendering, MongoDB save
- `VertexAiService` — Gemini API calls (text, vision, grounding)
- `EmailService` — Gmail SMTP, inline image embedding, HTML composition

**Repositories**
- `DocumentRepository` — MongoDB, custom `@Query` projection (excludes base64 fields from list views)
- `NewsletterRepository` — MongoDB, sorted by `createdAt` DESC with index

**Configuration**
- `MongoDBConfig` — MongoDB client, `@PostConstruct` index creation
- `CorsConfig` — cross-origin resource sharing for the frontend
- `WebClientConfig` — WebClient builder for Vertex AI HTTP calls

**Models**
- `NewsDocument` — id, fileName, fileType, storagePath, summary, pageImagesBase64, uploadedAt
- `Newsletter` — id, title, content, templateHtml, subTopics, imageBase64List, createdAt
- `SubTopic` — title, content, link

---

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `HomePage.jsx` | Main layout — 3-step progress bar, column grid, document auto-selection |
| `FileUpload.jsx` | Single PDF/image drag-and-drop upload zone with progress bar |
| `ImageUpload.jsx` | Multiple image upload — auto-stitches to PDF, shows download button |
| `NewsletterEditor.jsx` | Main editor — auto-extracts stories, link suggester, regenerate/generate buttons |
| `EmailSender.jsx` | Send email (pre-filled address) + Download as PDF |
| `LinkSuggester` | Inline component — Google Search button, URL validation, suggestion dropdown |
| `api/api.js` | All Axios HTTP calls using relative `/api` base URL for Docker compatibility |
| `vite.config.js` | Vite proxy config — routes `/api` to `localhost:8080` during local dev |

---

## Deployment

### Docker Architecture

| Service | Container | Internal Port | External Port | Technology |
|---------|-----------|---------------|----------------|------------|
| Backend | `slt-backend` | 8080 | 8085 | Spring Boot JAR |
| Frontend | `slt-frontend` | 80 | 8083 | React + Nginx |

### Production Environment

- **VM:** EKB-Agent-Store (`152.42.230.223`)
- **OS:** Ubuntu Linux
- **Live URL:** `http://152.42.230.223:8083`
- **Backend API:** `http://152.42.230.223:8085`
- Nginx proxies `/api/` → `http://backend:8080/api/` inside the Docker network
- Uploaded files stored in Docker volume: `uploads_data`
- Credentials managed via `.env` file on the VM (never committed to GitHub)
- Google service account JSON key copied to the VM via SCP

---

## Credentials & Security

**n8n pipeline:** one credential — `GEMINI_API_KEY` (free Google AI Studio key), stored in a local `.env` file, never written into the workflow itself, so the workflow can be shared/backed up without exposing it. Free allowance is 20 requests/day; one issue uses one request (~1/20th of a day's allowance per week).

**Web application:**
- `application.properties` excluded from GitHub via `.gitignore`
- Google service account JSON key excluded from GitHub
- Credentials stored in `.env` on the VM only (not in source code)
- GitHub repository set to private
- MongoDB Atlas IP whitelist configured
- Docker network isolation between frontend and backend containers

---

## Development Timeline

| Phase | Milestone | Details |
|-------|-----------|---------|
| 1 | Initial Setup | GitHub repo created, Spring Boot backend + React/Vite frontend initialized, MongoDB Atlas connected |
| 2 | Core Features | PDF upload (PDFBox), summarization via Ollama (llama3.2 + llava), newsletter generation, Thymeleaf template, Gmail SMTP, drag-and-drop UI |
| 3 | Vertex AI Migration (23–28 Jun 2026) | Replaced Ollama with Google Vertex AI (Gemini 1.5 Pro → 2.5 Flash); added Google Auth library, service account key, updated config |
| 4 | UX Improvements (02 Jul 2026) | Hid document selection step (auto-select on upload); simplified to 3-step UI; compact document list |
| 5 | Image Upload (06 Jul 2026) | Multiple image upload → stitched into PDF via PDFBox → described by Gemini Vision → downloadable |
| 6 | Template & Links (08 Jul 2026) | InfiniAI Pulse branded template; auto link extraction via Google Search Grounding + HTTP validation |
| 7 | Deployment (09–21 Jul 2026) | Dockerfiles for both services, `docker-compose.yml` with Nginx reverse proxy, resolved VM port conflicts, deployed to `152.42.230.223:8083` |

---

## Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Link generation returned 404s | Restricted prompts to stable major domains; added HTTP HEAD validation to filter dead links |
| MongoDB sort memory limit (Atlas error 292) | Excluded heavy base64 fields from list queries via `@Query` projection; added `uploadedAt` index |
| Duplicate DOCTYPE error in Flying Saucer | Strip existing DOCTYPE declarations via regex before prepending a clean XHTML DOCTYPE |
| Docker port conflicts on VM | Mapped frontend to 8083, backend to 8085 (VM already used ports 80/8080) |
| Frontend called `localhost:8080` in production | Switched all Axios calls to relative `/api` URLs, handled by Nginx proxy |
| MongoDB DNS timeout on VM deployment | Flushed DNS cache; verified outbound connectivity from container to Atlas cluster |
| `gemini-2.5-flash` only available on global endpoint | Hardcoded `/locations/global` in the endpoint URL instead of using the location variable |

---

## Honest Limitations

- Article images are news photographs, not published infographics — reproducing Gartner-style charts used in earlier hand-made issues would require a paid image-search subscription.
- The AI performs the editorial judgement. It's good, but not a substitute for human review, particularly on sensitive or commercially significant content.
- If Google's free service is temporarily busy, the pipeline retries 5 times over 2.5 minutes; if it still fails, that week's issue doesn't generate automatically and must be run manually.

---

## Future Improvements

- Add HTTPS/SSL certificate (Let's Encrypt) for secure production access
- Implement user authentication and role-based access control
- Support scheduled, automatic weekly newsletter generation (merging in the n8n pipeline's automation)
- Add newsletter history view with search and filter capabilities
- Support multiple, user-selectable newsletter templates
- Integrate WhatsApp Business API for direct channel publishing
- Add OCR support for scanned PDFs using Apache Tika
- Implement real-time generation progress via WebSocket streaming
- Add multi-language newsletter generation support
- Create an admin dashboard for managing documents and newsletters

---

*Auto-generated newsletters produced using Vertex AI (`gemini-2.5-flash`) | AI & Data Office, SLT-Mobitel | 2026*
