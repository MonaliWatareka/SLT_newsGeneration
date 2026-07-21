import axios from "axios";
const api = axios.create({ baseURL: '/api' });


export const uploadDocument = (file, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  return axios.post(`${BASE}/documents/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onProgress(Math.round((e.loaded * 100) / e.total)),
  });
};

export const getDocuments = () => axios.get(`${BASE}/documents`);
export const deleteDocument = (id) => axios.delete(`${BASE}/documents/${id}`);

export const generateNewsletter = (documentIds, title) =>
  axios.post(`${BASE}/newsletters/generate`, { documentIds, title });

export const getNewsletters = () => axios.get(`${BASE}/newsletters`);

export const updateNewsletter = (id, title, content) =>
  axios.put(`${BASE}/newsletters/${id}`, { title, content });

export const sendEmail = (id, recipientEmail) =>
  axios.post(`${BASE}/newsletters/${id}/send-email`, { recipientEmail });

export const downloadNewsletter = (id) =>
  axios.get(`${BASE}/newsletters/${id}/download`, { responseType: "blob" });
