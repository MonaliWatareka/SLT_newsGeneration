import { useState } from 'react';
import { generateNewsletter, updateNewsletter } from '../api/api';
import toast from 'react-hot-toast';

export default function NewsletterEditor({ selectedDocIds, newsletter, onNewsletterGenerated }) {
    const [title,   setTitle]   = useState(newsletter?.title || '');
    const [content, setContent] = useState(newsletter?.newsletterContent || '');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!selectedDocIds.length) { toast.error('Select at least one document first'); return; }
        if (!title.trim())          { toast.error('Enter a newsletter title'); return; }
        setLoading(true);
        try {
            const { data } = await generateNewsletter(selectedDocIds, title);
            setContent(data.newsletterContent);
            toast.success('Newsletter generated!');
            onNewsletterGenerated(data);
        } catch (e) {
            toast.error('Generation failed — is Ollama running?');
        } finally { setLoading(false); }
    };

    const handleSave = async () => {
        if (!newsletter?.id) return;
        try {
            const { data } = await updateNewsletter(newsletter.id, title, content);
            onNewsletterGenerated(data);
            toast.success('Saved!');
        } catch (e) { toast.error('Save failed'); }
    };

    return (
        <div className="editor">
            <div className="field-wrap">
                <label className="field-label">Newsletter Title</label>
                <input type="text" className="field-input"
                       placeholder="e.g. SLT Monthly Digest — June 2026"
                       value={title} onChange={e => setTitle(e.target.value)}
                       disabled={loading} />
            </div>

            <button className={`btn-gen ${loading ? 'btn-gen-loading' : ''}`}
                    onClick={handleGenerate} disabled={loading}>
                {loading ? (
                    <>
                        <div className="btn-spin" />
                        Generating with llama3.2…
                    </>
                ) : (
                    <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Generate Newsletter
                    </>
                )}
            </button>

            {loading && (
                <div className="gen-wait">
                    <div className="wait-dot" />
                    CPU mode: this takes 30–60 seconds — please wait…
                </div>
            )}

            {content && (
                <div className="ta-wrap">
                    <div className="ta-bar">
                        <label className="field-label">Generated Content</label>
                        <span className="ta-chars">{content.length} chars</span>
                    </div>
                    <textarea className="field-textarea" value={content}
                              onChange={e => setContent(e.target.value)}
                              rows={14} placeholder="Your newsletter will appear here…" />
                    <button className="btn-mini" onClick={handleSave}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                        Save Changes
                    </button>
                </div>
            )}
        </div>
    );
}