import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import FileUpload from '../components/FileUpload';
import SummaryPanel from '../components/SummaryPanel';
import NewsletterEditor from '../components/NewsletterEditor';
import EmailSender from '../components/EmailSender';
import { getDocuments, deleteDocument } from '../api/api';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [documents,   setDocuments]   = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [newsletter,  setNewsletter]  = useState(null);

  useEffect(() => {
    getDocuments().then(r => setDocuments(r.data)).catch(() => {});
  }, []);

  const toggleSelect = id =>
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleDelete = async id => {
    await deleteDocument(id);
    setDocuments(p => p.filter(d => d.id !== id));
    setSelectedIds(p => p.filter(x => x !== id));
    toast.success('Document removed');
  };

  const steps = [
    { label: 'Upload',   done: documents.length > 0,   active: documents.length === 0 },
    { label: 'Select',   done: selectedIds.length > 0, active: documents.length > 0 && selectedIds.length === 0 },
    { label: 'Generate', done: !!newsletter,            active: selectedIds.length > 0 && !newsletter },
    { label: 'Send',     done: false,                   active: !!newsletter },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#060b18', color: '#eef2ff', fontFamily: "'Inter', sans-serif" }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#0d1626', color: '#eef2ff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontFamily: "'Inter',sans-serif", fontSize: 13 },
        success: { iconTheme: { primary: '#4ade80', secondary: '#0d1626' } },
        error:   { iconTheme: { primary: '#f87171', secondary: '#0d1626' } },
      }} />

      {/* Background */}
      <div className="canvas">
        <div className="grid-bg" />
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>

      {/* Header */}
      <header className="hdr">
        <div className="hdr-top">
          <div className="brand">
            <div className="brand-icon">
              <div className="brand-icon-bg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#4f9eff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="14 2 14 8 20 8" stroke="#4f9eff" strokeWidth="1.7" strokeLinecap="round"/>
                  <line x1="16" y1="13" x2="8" y2="13" stroke="#4f9eff" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="16" y1="17" x2="8" y2="17" stroke="#4f9eff" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="brand-glow" />
            </div>
            <div>
              <div className="brand-name">SLT News Generator</div>
              <div className="brand-sub">AI-powered document summarization & newsletter creation</div>
            </div>
          </div>
          <div className="hdr-right">
            <div className="pill pill-model"><div className="pdot" />llama3.2 + llava</div>
            <div className="pill pill-live"><div className="pdot" />Ollama Active</div>
          </div>
        </div>

        {/* Steps */}
        <div className="steps">
          {steps.map((s, i) => {
            const cls = s.done ? 's-done' : s.active ? 's-active' : 's-idle';
            return (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
                <div className={`step ${cls}`}>
                  <div className="sn">
                    {s.done
                      ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : i + 1}
                  </div>
                  {s.label}
                </div>
                {i < 3 && <span className="sarr">›</span>}
              </div>
            );
          })}
        </div>
      </header>

      {/* Main two-column grid */}
      <div className="main" style={{ flex: 1 }}>

        {/* LEFT column — minWidth:0 prevents grid blowout */}
        <div className="page-col" style={{ minWidth: 0 }}>

          {/* Upload */}
          <div className="card card-blue">
            <div className="card-head">
              <span className="cbadge cb-blue">01</span>
              <div>
                <div className="ctitle">Upload Document</div>
                <div className="csub">PDF files → llama3.2 · Images → llava vision model</div>
              </div>
            </div>
            <div className="card-body">
              <FileUpload onDocumentUploaded={doc => setDocuments(p => [doc, ...p])} />
            </div>
          </div>

          {/* Select */}
          <div className="card">
            <div className="card-head">
              <span className="cbadge cb-violet">02</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="ctitle">Select Documents</div>
                  {selectedIds.length > 0 && (
                    <span className="sel-pill">{selectedIds.length} selected</span>
                  )}
                </div>
                <div className="csub">Click to select documents to include in your newsletter</div>
              </div>
            </div>
            <div className="card-body">
              <SummaryPanel
                documents={documents}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onDelete={handleDelete}
              />
            </div>
          </div>
        </div>

        {/* RIGHT column — minWidth:0 prevents grid blowout */}
        <div className="page-col" style={{ minWidth: 0 }}>

          {/* Generate */}
          <div className="card">
            <div className="card-head">
              <span className="cbadge cb-teal">03</span>
              <div>
                <div className="ctitle">Generate Newsletter</div>
                <div className="csub">llama3.2 writes content · Add topics, links & images</div>
              </div>
            </div>
            <div className="card-body">
              <NewsletterEditor
                selectedDocIds={selectedIds}
                selectedDocuments={documents.filter(d => selectedIds.includes(d.id))}
                newsletter={newsletter}
                onNewsletterGenerated={setNewsletter}
              />
            </div>
          </div>

          {/* Send — only after generation */}
          {newsletter && (
            <div className="card card-green">
              <div className="card-head">
                <span className="cbadge cb-green">04</span>
                <div>
                  <div className="ctitle">Send or Download</div>
                  <div className="csub">Deliver via Gmail or save as HTML file</div>
                </div>
              </div>
              <div className="card-body">
                <EmailSender newsletter={newsletter} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="ftr">
        <span className="ftr-l">© 2026 SLTMobitel | InfiniAI — AI & Data Office</span>
        <div className="ftr-tags">
          {['Spring Boot', 'React + Vite', 'MongoDB Atlas', 'Ollama AI'].map(t => (
            <span key={t} className="ftr-tag">{t}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}