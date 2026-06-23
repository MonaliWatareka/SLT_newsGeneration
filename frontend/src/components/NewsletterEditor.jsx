import { useState, useEffect } from 'react';
import { updateNewsletter } from '../api/api';
import toast from 'react-hot-toast';

const emptySub = () => ({ title: '', content: '', link: '' });
const NEWSLETTER_TITLE = 'InfiniAI Pulse - Top Stories in AI & Telecom';

// ── Reusable link suggester row ──
function LinkSuggester({ topicTitle, value, onChange, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting,  setSuggesting]  = useState(false);

  const handleSuggest = async () => {
    if (!topicTitle?.trim()) { toast.error('Enter a topic title first'); return; }
    setSuggesting(true);
    setSuggestions([]);
    try {
      const res = await fetch('/api/newsletters/suggest-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicTitle }),
      });
      const data = await res.json();
      if (data.links?.length) {
        setSuggestions(data.links);
      } else {
        toast.error('No links returned — try again');
      }
    } catch {
      toast.error('Link suggestion failed');
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="finp"
          type="url"
          placeholder="https://…"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{ flex: 1, marginBottom: 0 }}
        />
        <button
          className="btn-suggest"
          onClick={handleSuggest}
          disabled={disabled || suggesting}
          title="Suggest LinkedIn links via Ollama"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 11px', fontSize: 12, fontWeight: 600,
            background: '#0a66c2', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer',
            opacity: (disabled || suggesting) ? 0.6 : 1,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {suggesting ? (
            <><div className="b-spin" style={{ width: 11, height: 11 }} /> Searching…</>
          ) : (
            <>
              {/* LinkedIn icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
              </svg>
              Suggest
            </>
          )}
        </button>
      </div>

      {/* Suggestion dropdown */}
      {suggestions.length > 0 && (
        <div style={{
          marginTop: 6, background: '#0d1626',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, overflow: 'hidden',
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => { onChange(s.url); setSuggestions([]); }}
              style={{
                padding: '9px 12px', cursor: 'pointer', fontSize: 12,
                borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(10,102,194,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#0a66c2">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
              </svg>
              <div>
                <div style={{ color: '#eef2ff', fontWeight: 600 }}>{s.label}</div>
                <div style={{ color: '#5a9fd4', fontSize: 11, marginTop: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 380 }}>
                  {s.url}
                </div>
              </div>
            </div>
          ))}
          <div
            onClick={() => setSuggestions([])}
            style={{ padding: '7px 12px', fontSize: 11, color: '#7a9bbf',
              cursor: 'pointer', textAlign: 'center' }}
          >
            Dismiss
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main editor ──
export default function NewsletterEditor({ selectedDocIds, selectedDocuments, newsletter, onNewsletterGenerated }) {
  const [mainTitle,  setMainTitle]  = useState(newsletter?.mainTopicTitle || '');
  const [mainDesc,   setMainDesc]   = useState(newsletter?.mainTopicContent || '');
  const [mainLink,   setMainLink]   = useState(newsletter?.mainTopicLink || '');
  const [subs,       setSubs]       = useState([emptySub(), emptySub()]);
  const [images,     setImages]     = useState([]);
  const [content,    setContent]    = useState(newsletter?.newsletterContent || '');
  const [loading,    setLoading]    = useState(false);
  const [extracting, setExtracting] = useState(false);

  // ── Auto-extract stories + page images on document select ──
  useEffect(() => {
    if (!selectedDocIds?.length) return;

    setExtracting(true);
    fetch('/api/newsletters/extract-stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentIds: selectedDocIds }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { toast.error('Story extraction failed — check Ollama'); return; }

        if (data.mainStory) {
          setMainTitle(data.mainStory.title || '');
          // support both 'content' (new) and 'description' (old Ollama responses)
          setMainDesc(data.mainStory.content || data.mainStory.description || '');
        }

        if (data.subStories?.length) {
          const autoSubs = data.subStories.map(s => ({
            title:   s.title || '',
            // support both 'content' (new) and 'description' (old Ollama responses)
            content: s.content || s.description || '',
            link:    '',
          }));
          while (autoSubs.length < 2) autoSubs.push(emptySub());
          setSubs(autoSubs);
        }

        if (data.pageImages?.length) {
          setImages(data.pageImages.slice(0, 3));
        }
      })
      .catch(() => toast.error('Could not reach /extract-stories endpoint'))
      .finally(() => setExtracting(false));

  }, [selectedDocIds?.join(',')]);

  const updateSub = (i, f, v) => setSubs(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  const addSub    = ()         => setSubs(p => [...p, emptySub()]);
  const removeSub = i          => setSubs(p => p.filter((_, idx) => idx !== i));

  const handleGenerate = async () => {
    if (!selectedDocIds.length) { toast.error('Select at least one document'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/newsletters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds:     selectedDocIds,
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
    } catch { toast.error('Generation failed — is Ollama running?'); }
    finally  { setLoading(false); }
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

      {/* ── Extraction notice ── */}
      {extracting && (
        <div className="gen-notice">
          <div className="ndot" />
          Analysing PDF with Ollama — extracting stories & rendering pages…
        </div>
      )}

      {/* ── Auto-extracted page previews ── */}
      {images.length > 0 && (
        <div>
          <label className="flbl">
            PDF Pages ({images.length} page{images.length > 1 ? 's' : ''} — auto-extracted)
          </label>
          <div className="img-previews">
            {images.map((b, i) => (
              <img key={i} src={`data:image/jpeg;base64,${b}`} className="img-prev" alt={`Page ${i + 1}`} />
            ))}
          </div>
        </div>
      )}

      {/* ── Main Topic ── */}
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
          <input
            className="finp"
            type="text"
            placeholder={extracting ? 'Extracting from PDF…' : 'e.g. The Ontology Pipeline Revolution'}
            value={mainTitle}
            onChange={e => setMainTitle(e.target.value)}
            disabled={isDisabled}
          />
        </div>

        <div>
          <label className="flbl">Description (auto-filled · editable)</label>
          <textarea
            className="finp"
            rows={3}
            placeholder={extracting ? 'Extracting from PDF…' : 'Brief description of the main topic…'}
            value={mainDesc}
            onChange={e => setMainDesc(e.target.value)}
            disabled={isDisabled}
            style={{ minHeight: 70 }}
          />
        </div>

        <div>
          <label className="flbl">Article Link (optional · manual or suggested)</label>
          <LinkSuggester
            topicTitle={mainTitle}
            value={mainLink}
            onChange={setMainLink}
            disabled={isDisabled}
          />
        </div>
      </div>

      {/* ── Sub Topics ── */}
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
                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            <div>
              <label className="flbl">Title</label>
              <input
                className="finp"
                type="text"
                placeholder={extracting ? 'Extracting from PDF…' : 'Story title…'}
                value={s.title}
                onChange={e => updateSub(i, 'title', e.target.value)}
                disabled={isDisabled}
              />
            </div>

            <div>
              <label className="flbl">Description (auto-filled · editable)</label>
              <textarea
                className="finp"
                rows={2}
                placeholder={extracting ? 'Extracting from PDF…' : 'Brief description…'}
                value={s.content}
                onChange={e => updateSub(i, 'content', e.target.value)}
                disabled={isDisabled}
                style={{ minHeight: 60 }}
              />
            </div>

            <div>
              <label className="flbl">Learn More Link (optional · manual or suggested)</label>
              <LinkSuggester
                topicTitle={s.title}
                value={s.link}
                onChange={v => updateSub(i, 'link', v)}
                disabled={isDisabled}
              />
            </div>
          </div>
        ))}

        <button className="add-sub" onClick={addSub} disabled={isDisabled}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Add story
        </button>
      </div>

      {/* ── Generate Button ── */}
      <button
        className={`btn-gen ${loading ? 'btn-gen-busy' : ''}`}
        onClick={handleGenerate}
        disabled={isDisabled}
      >
        {loading ? (
          <><div className="b-spin" /> Generating with llama3.2…</>
        ) : extracting ? (
          <><div className="b-spin" /> Extracting from PDF…</>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Generate Newsletter
          </>
        )}
      </button>

      {loading && (
        <div className="gen-notice">
          <div className="ndot" />
          CPU mode: this takes 30–60 seconds — please wait…
        </div>
      )}

      {/* ── Editable generated output ── */}
      {content && (
        <div>
          <div className="ta-bar">
            <label className="flbl" style={{ marginBottom: 0 }}>Generated Content (editable)</label>
            <span className="ta-chars">{content.length} chars</span>
          </div>
          <textarea
            className="fta"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={10}
          />
          <button className="btn-save" onClick={handleSave}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}