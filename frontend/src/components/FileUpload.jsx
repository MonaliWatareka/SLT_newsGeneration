import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadDocument } from '../api/api';
import toast from 'react-hot-toast';

export default function FileUpload({ onDocumentUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);

  const onDrop = useCallback(async files => {
    if (!files.length) return;
    const file = files[0];
    if (!['application/pdf','image/png','image/jpeg','image/jpg'].includes(file.type)) {
      toast.error('Only PDF and image files are supported'); return;
    }
    setUploading(true);
    try {
      const { data } = await uploadDocument(file, setProgress);
      toast.success('Summarized by Gemini!');
      onDocumentUploaded(data);
    } catch (e) {
      toast.error('Upload failed: ' + (e.response?.data?.message || e.message));
    } finally {
      setUploading(false); setProgress(0);
    }
  }, [onDocumentUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   { 'application/pdf': [], 'image/*': [] },
    multiple: false,
    disabled: uploading,
  });

  return (
    <div {...getRootProps()}
         className={`dz ${isDragActive ? 'dz-on' : ''} ${uploading ? 'dz-busy' : ''}`}>
      <input {...getInputProps()} />

      {uploading ? (
        <div className="dz-up">
          <div className="spin-wrap">
            <div className="spin-ring" />
            <div className="spin-ico">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <polyline points="17 8 12 3 7 8"
                          stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="up-lbl">Gemini is processing your file…</div>
          <div className="prog">
            <div className="prog-fill" style={{ width: `${progress || 20}%` }} />
          </div>
          <div className="up-sub">gemini-2.5-flash · Vertex AI (global) · cloud processing</div>
        </div>
      ) : (
        <div className="dz-idle">
          <div className="dz-icons">
            <div className="dz-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                      stroke="currentColor" strokeWidth="1.6"
                      strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="14 2 14 8 20 8"
                          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="dz-sep">+</span>
            <div className="dz-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2"
                      stroke="currentColor" strokeWidth="1.6"/>
                <circle cx="8.5" cy="8.5" r="1.5"
                        stroke="currentColor" strokeWidth="1.4"/>
                <polyline points="21 15 16 10 5 21"
                          stroke="currentColor" strokeWidth="1.6"
                          strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="dz-h">
            {isDragActive ? 'Release to upload' : 'Drag & drop your file here'}
          </div>
          <div className="dz-s">
            or <span className="dz-a">click to browse</span> · PDF or Image · Max 20MB
          </div>
          <div className="dz-chips">
            <div className="dz-chip"><div className="cd cd-b" />PDF → gemini-2.5-flash</div>
            <div className="dz-chip"><div className="cd cd-t" />Image → Gemini Vision</div>
          </div>
        </div>
      )}
    </div>
  );
}