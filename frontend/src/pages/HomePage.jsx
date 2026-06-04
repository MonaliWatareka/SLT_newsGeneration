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
    const [documents, setDocuments] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [newsletter, setNewsletter] = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setReady(true);
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
        { label: 'Upload', done: documents.length > 0, active: documents.length === 0 },
        { label: 'Select', done: selectedIds.length > 0, active: documents.length > 0 && selectedIds.length === 0 },
        { label: 'Generate', done: !!newsletter, active: selectedIds.length > 0 && !newsletter },
        { label: 'Send', done: false, active: !!newsletter },
    ];

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#0d1628', color: '#f0f4ff',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: '13px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    },
                    success: { iconTheme: { primary: '#68d391', secondary: '#0d1628' } },
                    error:   { iconTheme: { primary: '#fc8181', secondary: '#0d1628' } },
                }}
            />

            {/* Background canvas */}
            <div className="bg-canvas">
                <div className="bg-grid" />
                <div className="bg-orb orb-1" />
                <div className="bg-orb orb-2" />
                <div className="bg-orb orb-3" />
            </div>

            {/* ── HEADER ── */}
            <header className="site-header">
                <div className="header-top">
                    <div className="brand">
                        <div className="brand-mark">
                            <div className="brand-glow" />
                            <div className="brand-mark-inner">
                                <img
                                    src={sltLogo}
                                    alt="SLT Logo"
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        objectFit: 'contain',
                                        display: 'block',
                                    }}
                                />
                            </div>
                        </div>
                        <div className="brand-text">
                            <div className="brand-name">SLT News Generator</div>
                            <div className="brand-tag">AI-powered document summarization & newsletter creation</div>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="model-pill">
                            <div className="model-dot" />
                            llama3.2 + llava
                        </div>
                        <div className="status-pill">
                            <div className="status-dot" />
                            Ollama Active
                        </div>
                    </div>
                </div>

                <div className="steps-strip">
                    {steps.map((s, i) => (
                        <div className="step-seg" key={i}>
                            <div className={`step-node ${s.done ? 's-done' : s.active ? 's-active' : 's-idle'}`}>
                                <div className="step-n">
                                    {s.done
                                        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                        : i + 1
                                    }
                                </div>
                                {s.label}
                            </div>
                            {i < steps.length - 1 && <span className="step-arrow">›</span>}
                        </div>
                    ))}
                </div>
            </header>

            {/* ── MAIN ── */}
            <main className="page-body" style={{ flex: 1 }}>
                {/* LEFT */}
                <div className="col">
                    {/* Upload card */}
                    <div className={`card card-glow anim-in d1`}>
                        <div className="card-head">
                            <span className="card-step-badge badge-blue">01</span>
                            <div>
                                <div className="card-title">Upload Document</div>
                                <div className="card-sub">PDF files → llama3.2 &nbsp;·&nbsp; Images → llava vision model</div>
                            </div>
                        </div>
                        <div className="card-body">
                            <FileUpload onDocumentUploaded={doc => setDocuments(p => [doc, ...p])} />
                        </div>
                    </div>

                    {/* Select card */}
                    <div className={`card anim-in d2`}>
                        <div className="card-head">
                            <span className="card-step-badge badge-purple">02</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div className="card-title">Select Documents</div>
                                    {selectedIds.length > 0 &&
                                        <span className="sel-count-badge">{selectedIds.length} selected</span>
                                    }
                                </div>
                                <div className="card-sub">Click to select which documents to include in your newsletter</div>
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

                {/* RIGHT */}
                <div className="col">
                    {/* Generate card */}
                    <div className={`card anim-in d3`}>
                        <div className="card-head">
                            <span className="card-step-badge badge-cyan">03</span>
                            <div>
                                <div className="card-title">Generate Newsletter</div>
                                <div className="card-sub">llama3.2 writes a professional newsletter from your selected documents</div>
                            </div>
                        </div>
                        <div className="card-body">
                            <NewsletterEditor
                                selectedDocIds={selectedIds}
                                newsletter={newsletter}
                                onNewsletterGenerated={setNewsletter}
                            />
                        </div>
                    </div>

                    {/* Send card — appears when newsletter is ready */}
                    {newsletter && (
                        <div className={`card card-success anim-in`}>
                            <div className="card-head">
                                <span className="card-step-badge badge-green">04</span>
                                <div>
                                    <div className="card-title">Send or Download</div>
                                    <div className="card-sub">Deliver your newsletter via Gmail or save as an HTML file</div>
                                </div>
                            </div>
                            <div className="card-body">
                                <EmailSender newsletter={newsletter} />
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ── FOOTER ── */}
            <footer className="site-footer">
                <div className="footer-left">
                    <span>© 2026 SLT News Generator</span>
                </div>
                <div className="footer-stack">
                    <span className="stack-tag">Spring Boot</span>
                    <span className="stack-tag">React + Vite</span>
                    <span className="stack-tag">MongoDB Atlas</span>
                    <span className="stack-tag">Ollama AI</span>
                </div>
            </footer>
        </div>
    );
}