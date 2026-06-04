import { useState } from 'react';
import { sendEmail, downloadNewsletter } from '../api/api';
import toast from 'react-hot-toast';

export default function EmailSender({ newsletter }) {
    const [email,   setEmail]   = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!email)           { toast.error('Enter a recipient email'); return; }
        if (!newsletter?.id)  { toast.error('Generate a newsletter first'); return; }
        setSending(true);
        try {
            await sendEmail(newsletter.id, email);
            toast.success(`Sent to ${email}!`);
            setEmail('');
        } catch (e) {
            toast.error('Email failed — check your Gmail App Password in .env');
        } finally { setSending(false); }
    };

    const handleDownload = async () => {
        if (!newsletter?.id) { toast.error('Generate a newsletter first'); return; }
        try {
            const { data } = await downloadNewsletter(newsletter.id);
            const url = window.URL.createObjectURL(new Blob([data], { type: 'text/html' }));
            const a = document.createElement('a');
            a.href = url; a.download = `${newsletter.title || 'newsletter'}.html`;
            a.click(); window.URL.revokeObjectURL(url);
            toast.success('Downloaded!');
        } catch (e) { toast.error('Download failed'); }
    };

    return (
        <div className="sender">
            {newsletter?.title && (
                <div className="ready-tag">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ready-icon">
                        <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Ready: <strong>{newsletter.title}</strong></span>
                </div>
            )}

            <div className="send-row">
                <div className="field-wrap" style={{ flex: 1 }}>
                    <label className="field-label">Recipient Email</label>
                    <input type="email" className="field-input"
                           placeholder="recipient@example.com"
                           value={email} onChange={e => setEmail(e.target.value)}
                           disabled={sending} />
                </div>
                <button className="btn-send" onClick={handleSend} disabled={sending}
                        style={{ marginTop: 22 }}>
                    {sending
                        ? <div className="btn-spin" />
                        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                    }
                    {sending ? 'Sending…' : 'Send'}
                </button>
            </div>

            <div className="or-sep"><span>or</span></div>

            <button className="btn-dl" onClick={handleDownload}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                Download as HTML File
            </button>
        </div>
    );
}