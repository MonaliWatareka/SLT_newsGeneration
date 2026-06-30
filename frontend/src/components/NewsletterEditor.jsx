import { useState, useEffect } from 'react';
import { updateNewsletter } from '../api/api';
import toast from 'react-hot-toast';

const emptySub = () => ({ title: '', content: '', link: '' });
const NEWSLETTER_TITLE = 'InfiniAI Pulse - Top Stories in AI & Telecom';

// ── Checks one URL via the backend HEAD-check proxy ──────────────────────────
async function isLinkAlive(url) {
  try {
    const res  = await fetch(`/api/newsletters/check-link?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    return data.alive === true;
  } catch {
    return true;
  }
}

// ── Google Search link suggester (manual re-search, still available) ────────
function LinkSuggester({ topicTitle, value, onChange, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting,  setSuggesting]  = useState(false);
  const [validating,  setValidating]  = useState(false);

  const handleSuggest = async () => {
    if (!topicTitle?.trim()) { toast.error('Enter a topic title first'); return; }

    setSuggesting(true);
    setSuggestions([]);

    try {
      const res  = await fetch('/api/newsletters/suggest-links', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ topicTitle }),
      });
      const data = await res.json();

      if (!data.links?.length) {
        toast.error('No links returned — try again');
        return;
      }

      setSuggesting(false);
      setValidating(true);

      const checks = await Promise.all(
        data.links.map(async link => {
          const alive = await isLinkAlive(link.url);
          return alive ? link : null;
        })
      );

      const alive = checks.filter(Boolean).slice(0, 3);

      if (alive.length) {
        setSuggestions(alive);
      } else {
        toast.error('All suggested links are currently unavailable — try again');
      }

    } catch {
      toast.error('Link suggestion failed');
    } finally {
      setSuggesting(false);
      setValidating(false);
    }
  };

  const isBusy = suggesting || validating;
  const buttonLabel = () => {
    if (suggesting) return 'Searching…';
    if (validating) return 'Checking…';
    return value ? 'Re-search' : 'Search';
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="finp"
          type="url"
          placeholder="Link will be found automatically…"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{ flex: 1, marginBottom: 0 }}
        />
        <button
          onClick={handleSuggest}
          disabled={disabled || isBusy}
          title="Find a different working link via Gemini + Google Search"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 11px', fontSize: 12, fontWeight: 600,
            background: '#4285F4', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer',
            opacity: (disabled || isBusy) ? 0.6 : 1,
            whiteSpace: 'nowrap', flexShrink: 0,
            minWidth: 100, justifyContent: 'center',
          }}
        >
          {isBusy ? (
            <><div className="b-spin" style={{ width: 11, height: 11 }} /> {buttonLabel()}</>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
              </svg>
              {buttonLabel()}
            </>
          )}
        </button>
      </div>

      {validating && (
        <div style={{ fontSize: 11, color: '#5a9fd4', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
          <div className="b-spin" style={{ width: 9, height: 9 }} />
          Verifying links are live…
        </div>
      )}

      {/* Auto-found confirmation badge */}
      {!isBusy && value && suggestions.length === 0 && (
        <div style={{
          fontSize: 11, color: '#4ade80', marginTop: 5,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <polyline points="20 6 9 17 4 12" stroke="#4ade80" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Link auto-verified — click Re-search for a different one
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{
          marginTop: 6, background: '#0d1626',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, overflow: 'hidden',
        }}>
          <div style={{
            padding: '6px 12px', fontSize: 10, color: '#4ade80',
            background: 'rgba(74,222,128,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
              <polyline points="20 6 9 17 4 12" stroke="#4ade80" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {suggestions.length} working link{suggestions.length > 1 ? 's' : ''} verified
          </div>

          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => { onChange(s.url); setSuggestions([]); }}
              style={{
                padding: '9px 12px', cursor: 'pointer', fontSize: 12,
                borderBottom: i < suggestions.length - 1
                  ? '1px solid rgba(255,255,255,0.06)' : 'none',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(66,133,244,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#eef2ff', fontWeight: 600 }}>{s.label}</div>
                <div style={{
                  color: '#5a9fd4', fontSize: 11, marginTop: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', maxWidth: 360,
                }}>
                  {s.url}
                </div>
              </div>
            </div>
          ))}

          <div
            onClick={() => setSuggestions([])}
            style={{
              padding: '7px 12px', fontSize: 11, color: '#7a9bbf',
              cursor: 'pointer', textAlign: 'center',
              borderTop: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            Dismiss
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main editor ──────────────────────────────────────────────────────────────
export default function NewsletterEditor({
  selectedDocIds,
  selectedDocuments,
  newsletter,
  onNewsletterGenerated,
}) {
  const docIds = Array.isArray(selectedDocIds) ? selectedDocIds : [];

  const [mainTitle,  setMainTitle]  = useState(newsletter?.mainTopicTitle   || '');
  const [mainDesc,   setMainDesc]   = useState(newsletter?.mainTopicContent || '');
  const [mainLink,   setMainLink]   = useState(newsletter?.mainTopicLink    || '');
  const [subs,       setSubs]       = useState([emptySub(), emptySub()]);
  const [images,     setImages]     = useState([]);
  const [content,    setContent]    = useState(newsletter?.newsletterContent || '');
  const [loading,    setLoading]    = useState(false);
  const [extracting, setExtracting] = useState(false);

  // ── Auto-extract stories + page images + WORKING LINKS — fully automatic ──
  useEffect(() => {
    if (!docIds.length) return;

    setExtracting(true);
    fetch('/api/newsletters/extract-stories', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ documentIds: docIds }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          toast.error('Story extraction failed — check Vertex AI config');
          return;
        }

        if (data.mainStory) {
          setMainTitle(data.mainStory.title   || '');
          setMainDesc(data.mainStory.content  || data.mainStory.description || '');
          setMainLink(data.mainStory.link     || '');   // ← auto-filled link
        }

        if (data.subStories?.length) {
          const autoSubs = data.subStories.map(s => ({
            title:   s.title   || '',
            content: s.content || s.description || '',
            link:    s.link    || '',                    // ← auto-filled link
          }));
          while (autoSubs.length < 2) autoSubs.push(emptySub());
          setSubs(autoSubs);
        }

        if (data.pageImages?.length) setImages(data.pageImages.slice(0, 3));

        const mainHasLink = !!data.mainStory?.link;
        const subsWithLinks = (data.subStories || []).filter(s => s.link).length;
        if (mainHasLink || subsWithLinks > 0) {
          toast.success(`Auto-found ${ (mainHasLink ? 1 : 0) + subsWithLinks } working link(s)!`);
        }
      })
      .catch(() => toast.error('Could not reach /extract-stories endpoint'))
      .finally(() => setExtracting(false));

  }, [docIds.join(',')]);

  const updateSub = (i, f, v) =>
    setSubs(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  const addSub    = ()  => setSubs(p => [...p, emptySub()]);
  const removeSub = i   => setSubs(p => p.filter((_, idx) => idx !== i));

  const handleGenerate = async () => {
    if (!docIds.length) { toast.error('Select at least one document'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/newsletters/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds:     docIds,
          title:           NEWSLETTER_TITLE,
          mainTopicTitle:  mainTitle,
          mainTopicLink:   mainLink,
          subTopics:       subs.filter(s => s.title.trim()),
          imageBase64List: images,
        }),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setContent(data.newsletterContent);
      toast.success('Newsletter generated!');
      onNewsletterGenerated(data);
    } catch {
      toast.error('Generation failed — check Vertex AI credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newsletter?.id) return;
    try {
      const { data } = await updateNewsletter(newsletter.id, NEWSLETTER_TITLE, content);
      onNewsletterGenerated(data);
      toast.success('Saved!');
    } catch { toast.error('Save failed'); }
  };

  const isDisabled = loading || extracting;

  return (
    <div className="editor">

      {extracting && (
        <div className="gen-notice">
          <div className="ndot" />
          Analysing PDF with gemini-2.5-flash — extracting stories, links &amp; rendering pages…
        </div>
      )}

      {images.length > 0 && (
        <div>
          <label className="flbl">
            PDF Pages ({images.length} page{images.length > 1 ? 's' : ''} — auto-extracted)
          </label>
          <div className="img-previews">
            {images.map((b, i) => (
              <img key={i} src={`data:image/jpeg;base64,${b}`}
                   className="img-prev" alt={`Page ${i + 1}`} />
            ))}
          </div>
        </div>
      )}

      {/* Main Topic */}
      <div className="sect-block">
        <div className="sect-head">
          <span className="sect-badge sb-main">Main Topic</span>
          <span className="sect-hint">
            Today's Top Story
            {extracting && <span style={{ marginLeft: 6, opacity: 0.6 }}>(extracting…)</span>}
          </span>
        </div>

        <div>
          <label className="flbl">Topic Title</label>
          <input className="finp" type="text"
            placeholder={extracting ? 'Extracting from PDF…' : 'e.g. The Ontology Pipeline Revolution'}
            value={mainTitle} onChange={e => setMainTitle(e.target.value)} disabled={isDisabled} />
        </div>

        <div>
          <label className="flbl">Description (auto-filled · editable)</label>
          <textarea className="finp" rows={3}
            placeholder={extracting ? 'Extracting from PDF…' : 'Brief description of the main topic…'}
            value={mainDesc} onChange={e => setMainDesc(e.target.value)}
            disabled={isDisabled} style={{ minHeight: 70 }} />
        </div>

        <div>
          <label className="flbl">Article Link (auto-found &amp; verified)</label>
          <LinkSuggester topicTitle={mainTitle} value={mainLink}
            onChange={setMainLink} disabled={isDisabled} />
        </div>
      </div>

      {/* Sub Topics */}
      <div className="sect-block">
        <div className="sect-head">
          <span className="sect-badge sb-sub">Sub Topics</span>
          <span className="sect-hint">
            More Stories This Week · auto-filled from PDF
            {extracting && <span style={{ marginLeft: 6, opacity: 0.6 }}>(extracting…)</span>}
          </span>
        </div>

        {subs.map((s, i) => (
          <div key={i} className="sub-card">
            <div className="sub-card-top">
              <span className="sub-label">Story {i + 1}</span>
              {subs.length > 1 && (
                <button className="sub-rm" onClick={() => removeSub(i)} title="Remove">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <line x1="18" y1="6"  x2="6"  y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="6"  y1="6"  x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            <div>
              <label className="flbl">Title</label>
              <input className="finp" type="text"
                placeholder={extracting ? 'Extracting from PDF…' : 'Story title…'}
                value={s.title} onChange={e => updateSub(i, 'title', e.target.value)}
                disabled={isDisabled} />
            </div>

            <div>
              <label className="flbl">Description (auto-filled · editable)</label>
              <textarea className="finp" rows={2}
                placeholder={extracting ? 'Extracting from PDF…' : 'Brief description…'}
                value={s.content} onChange={e => updateSub(i, 'content', e.target.value)}
                disabled={isDisabled} style={{ minHeight: 60 }} />
            </div>

            <div>
              <label className="flbl">Learn More Link (auto-found &amp; verified)</label>
              <LinkSuggester topicTitle={s.title} value={s.link}
                onChange={v => updateSub(i, 'link', v)} disabled={isDisabled} />
            </div>
          </div>
        ))}

        <button className="add-sub" onClick={addSub} disabled={isDisabled}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="5"  x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="5"  y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Add story
        </button>
      </div>

      {/* Generate button */}
      <button className={`btn-gen ${loading ? 'btn-gen-busy' : ''}`}
              onClick={handleGenerate} disabled={isDisabled}>
        {loading ? (
          <><div className="b-spin" /> Generating with gemini-2.5-flash…</>
        ) : extracting ? (
          <><div className="b-spin" /> Extracting from PDF…</>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Generate Newsletter
          </>
        )}
      </button>

      {loading && (
        <div className="gen-notice">
          <div className="ndot" />
          Gemini is generating your newsletter via Vertex AI (global)…
        </div>
      )}

      {content && (
        <div>
          <div className="ta-bar">
            <label className="flbl" style={{ marginBottom: 0 }}>Generated Content (editable)</label>
            <span className="ta-chars">{content.length} chars</span>
          </div>
          <textarea className="fta" value={content}
            onChange={e => setContent(e.target.value)} rows={10} />
          <button className="btn-save" onClick={handleSave}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor"
                        strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}