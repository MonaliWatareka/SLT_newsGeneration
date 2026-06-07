export default function SummaryPanel({ documents, selectedIds, onToggleSelect, onDelete }) {
  if (!documents.length) return (
    <div className="doc-empty">
      <div className="de-ico">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="13 2 13 9 20 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <p>No documents yet</p>
      <span>Upload a PDF or image above to get started</span>
    </div>
  );
  return (
    <div className="doc-list">
      {documents.map((doc, i) => {
        const sel = selectedIds.includes(doc.id);
        return (
          <div key={doc.id} className={`doc-row ${sel ? 'doc-sel' : ''}`}
               onClick={() => onToggleSelect(doc.id)}
               style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`doc-thumb ${doc.fileType === 'pdf' ? 'dt-pdf' : 'dt-img'}`}>
              {doc.fileType === 'pdf' ? 'PDF' : 'IMG'}
            </div>
            <div className="doc-inf">
              <div className="doc-name">{doc.originalFileName}</div>
              {doc.summary && <div className="doc-snip">{doc.summary}</div>}
              <span className={`doc-badge ${doc.status === 'summarized' ? 'db-ok' : 'db-wait'}`}>
                {doc.status === 'summarized' ? '✓ Summarized' : '⏳ Processing'}
              </span>
            </div>
            <div className="doc-acts">
              {sel && <div className="doc-chk"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
              <button className="doc-del" onClick={e => { e.stopPropagation(); onDelete(doc.id); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}