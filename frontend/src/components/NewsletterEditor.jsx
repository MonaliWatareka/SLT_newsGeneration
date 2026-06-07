import { useState, useEffect } from 'react';
import { updateNewsletter } from '../api/api';
import toast from 'react-hot-toast';

const emptySub = () => ({ title: '', content: '', link: '' });

export default function NewsletterEditor({ selectedDocIds, selectedDocuments, newsletter, onNewsletterGenerated }) {
  const [title,      setTitle]      = useState(newsletter?.title || '');
  const [mainTitle,  setMainTitle]  = useState(newsletter?.mainTopicTitle || '');
  const [mainDesc,   setMainDesc]   = useState(newsletter?.mainTopicContent || '');
  const [mainLink,   setMainLink]   = useState(newsletter?.mainTopicLink || '');
  const [subs,       setSubs]       = useState([emptySub(), emptySub()]);
  const [images,     setImages]     = useState([]);
  const [content,    setContent]    = useState(newsletter?.newsletterContent || '');
  const [loading,    setLoading]    = useState(false);
  const [extracting, setExtracting] = useState(false);  // ← NEW: story extraction state

  // ── AUTO-EXTRACT stories from selected documents via Ollama ──
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
        if (data.error) {
          toast.error('Story extraction failed — check Ollama');
          return;
        }

        // Populate main story
        if (data.mainStory) {
          setMainTitle(data.mainStory.title   || '');
          setMainDesc (data.mainStory.description || '');
        }

        // Populate sub-stories (keep links blank — user fills manually)
        if (data.subStories?.length) {
          const autoSubs = data.subStories.map(s => ({
            title:   s.title       || '',
            content: s.description || '',
            link:    '',
          }));
          while (autoSubs.length < 2) autoSubs.push(emptySub());
          setSubs(autoSubs);
        }
      })
      .catch(() => toast.error('Could not reach /extract-stories endpoint'))
      .finally(() => setExtracting(false));

  }, [selectedDocIds?.join(',')]);  // re-runs whenever the doc selection changes

  const updateSub = (i, f, v) => setSubs(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  const addSub    = ()         => setSubs(p => [...p, emptySub()]);
  const removeSub = i          => setSubs(p => p.filter((_, idx) => idx !== i));

  const handleImagePick = e => {
    const files = Array.from(e.target.files).slice(0, 3);
    Promise.all(files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.readAsDataURL(f);
    }))).then(setImages);
  };

  const handleGenerate = async () => {
    if (!selectedDocIds.length) { toast.error('Select at least one document'); return; }
    if (!title.trim())          { toast.error('Enter a newsletter title'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/newsletters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds:     selectedDocIds,
          title,
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
      const { data } = await updateNewsletter(newsletter.id, title, content);
      onNewsletterGenerated(data);
      toast.success('Saved!');
    } catch { toast.error('Save failed'); }
  };

  const isDisabled = loading || extracting;

  return (
    <div className="editor">

      {/* ── Extraction in-progress notice ── */}
      {extracting && (
        <div className="gen-notice">
          <div className="ndot" />
          Analysing PDF with Ollama — extracting stories…
        </div>
      )}

      {/* ── Newsletter Title ── */}
      <div>
        <label className="flbl">Newsletter Title</label>
        <input
          className="finp"
          type="text"
          placeholder="e.g. InfiniAI Pulse — Week 35"
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={isDisabled}
        />
      </div>

      {/* ── Header Images (up to 3) ── */}
      <div>
        <label className="flbl">Header Images (up to 3)</label>
        <label style={{ cursor: 'pointer' }}>
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImagePick} />
          <div className="img-pick">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            {images.length > 0 ? `${images.length} image(s) selected` : 'Click to choose images'}
          </div>
        </label>
        {images.length > 0 && (
          <div className="img-previews">
            {images.map((b, i) => (
              <img key={i} src={`data:image/jpeg;base64,${b}`} className="img-prev" alt="" />
            ))}
          </div>
        )}
      </div>

      {/* ── Main Topic — auto-filled from PDF, fully editable ── */}
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
          <label className="flbl">Article Link (optional · manual)</label>
          <input
            className="finp"
            type="url"
            placeholder="https://…"
            value={mainLink}
            onChange={e => setMainLink(e.target.value)}
            disabled={isDisabled}
          />
        </div>
      </div>

      {/* ── Sub Topics — auto-filled from PDF, links manual ── */}
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
              <label className="flbl">Learn More Link (optional · manual)</label>
              <input
                className="finp"
                type="url"
                placeholder="https://…"
                value={s.link}
                onChange={e => updateSub(i, 'link', e.target.value)}
                disabled={isDisabled}   // links stay editable even while extracting — intentional
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
          <><div className="b-spin" /> Extracting stories…</>
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