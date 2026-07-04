import { useState } from 'react';
import toast from 'react-hot-toast';

const DEFAULT_EMAIL = 'monaachethiii@gmail.com';

export default function EmailSender({ newsletter }) {
  const [email,       setEmail]       = useState(DEFAULT_EMAIL);
  const [sending,     setSending]     = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isDefault = email.trim() === DEFAULT_EMAIL;

  const handleSend = async () => {
    if (!email.trim()) { toast.error('Enter a recipient email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Enter a valid email address'); return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}/send-email`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recipientEmail: email.trim() }),
      });
      if (!res.ok) throw new Error('Send failed');
      toast.success(`Newsletter sent to ${email.trim()}`);
    } catch {
      toast.error('Failed to send email — check SMTP settings');
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/newsletters/${newsletter.id}/download`);
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'newsletter.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Newsletter downloaded as PDF!');
    } catch {
      toast.error('PDF download failed — check backend logs');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Email input row */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 6,
        }}>
          <label className="flbl" style={{ marginBottom: 0 }}>Recipient Email</label>

          {/* Reset link — only shown when user changed the default */}
          {!isDefault && (
            <button
              onClick={() => setEmail(DEFAULT_EMAIL)}
              style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: 11, color: '#5a9fd4', cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset to default
            </button>
          )}
        </div>

        {/* Default badge shown when using default address */}
        {isDefault && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: '#4ade80', marginBottom: 6,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <polyline points="20 6 9 17 4 12" stroke="#4ade80"
                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Default recipient pre-filled — edit to change
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="finp"
            type="email"
            placeholder="recipient@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={sending}
            style={{
              flex: 1, marginBottom: 0,
              borderColor: isDefault
                ? 'rgba(74,222,128,0.3)'
                : 'rgba(255,255,255,0.12)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', fontSize: 13, fontWeight: 600,
              background: sending ? 'rgba(99,102,241,0.4)' : '#6366f1',
              color: '#fff', border: 'none', borderRadius: 8,
              cursor: sending ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
              opacity: (!email.trim() && !sending) ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            {sending ? (
              <><div className="b-spin" style={{ width: 12, height: 12 }} /> Sending…</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <line x1="22" y1="2" x2="11" y2="13"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"
                           stroke="currentColor" strokeWidth="1.8"
                           strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Send Email
              </>
            )}
          </button>
        </div>

        {/* Hint showing who will receive it */}
        <div style={{ fontSize: 11, color: '#5a7a9f', marginTop: 5 }}>
          Will be sent to:{' '}
          <span style={{ color: isDefault ? '#4ade80' : '#eef2ff', fontWeight: 600 }}>
            {email.trim() || '—'}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        color: '#3a5a7a', fontSize: 11,
      }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        or
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Download PDF button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px 20px', fontSize: 13, fontWeight: 600,
          background: downloading
            ? 'rgba(239,68,68,0.3)'
            : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          color: '#fff', border: 'none', borderRadius: 8,
          cursor: downloading ? 'not-allowed' : 'pointer',
          width: '100%',
          boxShadow: downloading ? 'none' : '0 2px 12px rgba(220,38,38,0.3)',
          transition: 'all 0.15s',
        }}
      >
        {downloading ? (
          <><div className="b-spin" style={{ width: 13, height: 13 }} /> Generating PDF…</>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8"
                        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="12" y1="18" x2="12" y2="12"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <polyline points="9 15 12 18 15 15"
                        stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Download as PDF
          </>
        )}
      </button>
    </div>
  );
}