import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import FileUpload from '../components/FileUpload';
import SummaryPanel from '../components/SummaryPanel';
import NewsletterEditor from '../components/NewsletterEditor';
import EmailSender from '../components/EmailSender';
import { getDocuments, deleteDocument } from '../api/api';
import toast from 'react-hot-toast';
import sltLogo from '../assets/slt_logo_new.be681e06.png';

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
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: '#060b18', color: '#eef2ff',
      fontFamily: "'Inter', sans-serif",
    }}>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#0d1626', color: '#eef2ff',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, fontFamily: "'Inter',sans-serif", fontSize: 13,
        },
        success: { iconTheme: { primary: '#4ade80', secondary: '#0d1626' } },
        error:   { iconTheme: { primary: '#f87171', secondary: '#0d1626' } },
      }} />

      {/* Background blobs */}
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
            <img
              src={sltLogo}
              alt="SLTMobitel"
              style={{ height: 38, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
            />
            <div>
              <div className="brand-name">SLT-Mobitel News Generator</div>
              <div className="brand-sub">AI-powered document summarization &amp; newsletter creation</div>
            </div>
          </div>
          <div className="hdr-right">
            <div className="pill pill-model"><div className="pdot" />gemini-2.5-flash</div>
            <div className="pill pill-live"><div className="pdot" />Vertex AI Active</div>
          </div>
        </div>

        {/* Step progress */}
        <div className="steps">
          {steps.map((s, i) => {
            const cls = s.done ? 's-done' : s.active ? 's-active' : 's-idle';
            return (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
                <div className={`step ${cls}`}>
                  <div className="sn">
                    {s.done
                      ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                          <polyline points="20 6 9 17 4 12" stroke="currentColor"
                                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
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

        {/* LEFT column */}
        <div className="page-col" style={{ minWidth: 0 }}>

          <div className="card card-blue">
            <div className="card-head">
              <span className="cbadge cb-blue">01</span>
              <div>
                <div className="ctitle">Upload Document</div>
                <div className="csub">PDF files &amp; Images → gemini-2.5-flash · Vertex AI</div>
              </div>
            </div>
            <div className="card-body">
              <FileUpload onDocumentUploaded={doc => setDocuments(p => [doc, ...p])} />
            </div>
          </div>

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

        {/* RIGHT column */}
        <div className="page-col" style={{ minWidth: 0 }}>

          <div className="card">
            <div className="card-head">
              <span className="cbadge cb-teal">03</span>
              <div>
                <div className="ctitle">Generate Newsletter</div>
                <div className="csub">Gemini writes content · Real web links via Google Search</div>
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
        <span className="ftr-l">© 2026 SLTMobitel | InfiniAI — AI &amp; Data Office</span>
        <div className="ftr-tags">
          {['Spring Boot', 'React + Vite', 'MongoDB Atlas', 'Vertex AI · gemini-2.5-flash'].map(t => (
            <span key={t} className="ftr-tag">{t}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}