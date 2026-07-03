import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import FileUpload from '../components/FileUpload';
import NewsletterEditor from '../components/NewsletterEditor';
import EmailSender from '../components/EmailSender';
import { getDocuments, deleteDocument } from '../api/api';
import toast from 'react-hot-toast';
import sltLogo from '../assets/slt_logo_new.be681e06.png';

export default function HomePage() {
  const [documents,   setDocuments]   = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [newsletter,  setNewsletter]  = useState(null);

  // Load existing documents on mount and auto-select the latest one
  useEffect(() => {
    getDocuments()
      .then(r => {
        const docs = r.data;
        setDocuments(docs);
        // Auto-select the most recent document if any exist
        if (docs.length > 0) {
          setSelectedIds([docs[0].id]);
        }
      })
      .catch(() => {});
  }, []);

  // When a new document is uploaded → auto-select it immediately
  const handleDocumentUploaded = (doc) => {
    setDocuments(p => [doc, ...p]);
    setSelectedIds([doc.id]);   // ← auto-select, skips Step 2 entirely
    setNewsletter(null);        // reset any previous newsletter
  };

  // 3-step progress (Upload, Generate, Send — Step 2 hidden)
  const steps = [
    { label: 'Upload',   done: documents.length > 0,  active: documents.length === 0 },
    { label: 'Generate', done: !!newsletter,           active: selectedIds.length > 0 && !newsletter },
    { label: 'Send',     done: false,                  active: !!newsletter },
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

        {/* 3-step progress bar (Step 2 removed) */}
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
                {i < steps.length - 1 && <span className="sarr">›</span>}
              </div>
            );
          })}
        </div>
      </header>

      {/* Main two-column grid */}
      <div className="main" style={{ flex: 1 }}>

        {/* LEFT column — Upload only (Select card removed) */}
        <div className="page-col" style={{ minWidth: 0 }}>

          <div className="card card-blue">
            <div className="card-head">
              <span className="cbadge cb-blue">01</span>
              <div>
                <div className="ctitle">Upload Document</div>
                <div className="csub">
                  PDF files &amp; Images → gemini-2.5-flash · Vertex AI
                  {selectedIds.length > 0 && (
                    <span style={{
                      marginLeft: 10, fontSize: 11, fontWeight: 600,
                      color: '#4ade80', background: 'rgba(74,222,128,0.1)',
                      padding: '2px 8px', borderRadius: 10,
                      border: '1px solid rgba(74,222,128,0.25)',
                    }}>
                      ✓ Document ready
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body">
              <FileUpload onDocumentUploaded={handleDocumentUploaded} />
            </div>
          </div>

          {/* Recently uploaded documents — compact list, no selection needed */}
          {documents.length > 0 && (
            <div className="card" style={{ padding: '16px 20px' }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '1.5px',
                textTransform: 'uppercase', color: '#5a9fd4', marginBottom: 10,
              }}>
                Uploaded Documents
              </div>
              {documents.slice(0, 5).map(doc => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedIds([doc.id]);
                    setNewsletter(null);
                    toast.success(`Switched to: ${doc.originalFileName}`);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    marginBottom: 4,
                    background: selectedIds.includes(doc.id)
                      ? 'rgba(74,222,128,0.08)' : 'transparent',
                    border: selectedIds.includes(doc.id)
                      ? '1px solid rgba(74,222,128,0.2)' : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!selectedIds.includes(doc.id))
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={e => {
                    if (!selectedIds.includes(doc.id))
                      e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* File icon */}
                  <div style={{
                    width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                    background: selectedIds.includes(doc.id)
                      ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedIds.includes(doc.id) ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <polyline points="20 6 9 17 4 12" stroke="#4ade80"
                                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                              stroke="#5a9fd4" strokeWidth="1.6"
                              strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14 2 14 8 20 8" stroke="#5a9fd4"
                                  strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>

                  {/* File name + status */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600,
                      color: selectedIds.includes(doc.id) ? '#4ade80' : '#eef2ff',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {doc.originalFileName}
                    </div>
                    <div style={{ fontSize: 10, color: '#5a7a9f', marginTop: 1 }}>
                      {doc.fileType?.toUpperCase()} ·{' '}
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                      {selectedIds.includes(doc.id) && (
                        <span style={{ color: '#4ade80', marginLeft: 6 }}>● Active</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT column — Generate + Send */}
        <div className="page-col" style={{ minWidth: 0 }}>

          <div className="card">
            <div className="card-head">
              <span className="cbadge cb-teal">02</span>
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
                <span className="cbadge cb-green">03</span>
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