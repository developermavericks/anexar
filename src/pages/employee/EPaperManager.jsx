import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebaseClient';
import { collection, getDocs, setDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { UploadCloud, Trash2, Calendar, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const NEWSPAPERS = [
  "The Hindu",
  "The Indian Express",
  "The Times of India",
  "Hindustan Times",
  "Dainik Bhaskar",
  "Dainik Jagran",
  "Amar Ujala",
  "Hindustan",
  "Jansatta",
  "Navbharat Times",
  "Dainik Navajyoti",
  "Punjab Kesari",
  "Rashtriya Sahara",
  "Prabhat Khabar",
  "Business Line",
  "Livemint",
  "The Economic Times",
  "Financial Express",
  "Business Standard",
  "The Telegraph",
  "Deccan Herald",
  "The Pioneer",
  "The Statesman",
  "Free Press Journal",
  "The Tribune",
  "Rajasthan Patrika",
  "Hari Bhoomi",
  "Deshbandhu",
  "Lokmat Samachar",
  "Navbharat",
  "The Asian Age",
  "Deccan Chronicle",
  "Millennium Post",
  "Tribune English",
  "Tribune Hindi"
];

const DISPLAY_NAMES = {
  "The Hindu": "The Hindu",
  "The H. Edition": "The Hindu",
  "The Indian Express": "The Indian Express",
  "Indian E. Paper": "The Indian Express",
  "The Times of India": "The Times of India",
  "T.O.I Daily": "The Times of India",
  "Hindustan Times": "Hindustan Times",
  "H.T. Daily": "Hindustan Times",
  "Hindustan T. Edition": "Hindustan Times",
  "Dainik Bhaskar": "Dainik Bhaskar",
  "D.B. Daily": "Dainik Bhaskar",
  "Dainik B. Edition": "Dainik Bhaskar",
  "Dainik Jagran": "Dainik Jagran",
  "Dainik J. Daily": "Dainik Jagran",
  "Dainik J. Edition": "Dainik Jagran",
  "Amar Ujala": "Amar Ujala",
  "Amar U. Daily": "Amar Ujala",
  "Amar U. Edition": "Amar Ujala",
  "Hindustan": "Hindustan",
  "Hindustan Daily": "Hindustan",
  "Hindustan Edition": "Hindustan",
  "Jansatta": "Jansatta",
  "Jansatta Daily": "Jansatta",
  "Jansatta Edition": "Jansatta",
  "Navbharat Times": "Navbharat Times",
  "Navbharat T. Daily": "Navbharat Times",
  "Navbharat T. Edition": "Navbharat Times",
  "Dainik Navajyoti": "Dainik Navajyoti",
  "Dainik Navajyoti Daily": "Dainik Navajyoti",
  "Punjab Kesari": "Punjab Kesari",
  "Punjab Kesari Daily": "Punjab Kesari",
  "Rashtriya Sahara": "Rashtriya Sahara",
  "Rashtriya Sahara Daily": "Rashtriya Sahara",
  "Prabhat Khabar": "Prabhat Khabar",
  "Prabhat Khabar Daily": "Prabhat Khabar",
  "Business Line": "Business Line",
  "Business L. Edition": "Business Line",
  "Livemint": "Livemint",
  "Live M. Paper": "Livemint",
  "The Economic Times": "The Economic Times",
  "Economic T. Daily": "The Economic Times",
  "Financial Express": "Financial Express",
  "Financial E. Paper": "Financial Express",
  "Business Standard": "Business Standard",
  "Business S. Edition": "Business Standard"
};

const getDisplayName = (name) => {
  return DISPLAY_NAMES[name] || name;
};

export default function EPaperManager() {
  const { user } = useAuth();
  const hasAccess = user?.email && user.email.toLowerCase().startsWith('satyam.singh@');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [newspaper, setNewspaper] = useState(NEWSPAPERS[0]);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [epapersList, setEpapersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasAccess) {
      fetchEpapers();
    } else {
      setLoading(false);
    }
  }, [hasAccess]);

  const fetchEpapers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "epapers"), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEpapersList(list);
    } catch (err) {
      console.error("Error fetching ePapers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Retention cleanup: delete any papers older than 10 days
  const runAutoCleanup = async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 10);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    try {
      const q = query(collection(db, "epapers"), where("date", "<", cutoffStr));
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        console.log(`Auto-deleting expired ePaper: ${data.name} on ${data.date}`);
        // 1. Delete Storage PDF
        try {
          const storagePath = `epapers/${data.date}_${data.name.replace(/\s+/g, '_')}.pdf`;
          const fileRef = ref(storage, storagePath);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn("Storage delete failed or file not found:", storageErr.message);
        }
        // 2. Delete Firestore Document
        await deleteDoc(doc(db, "epapers", docSnap.id));
      }
    } catch (err) {
      console.warn("Retention auto-cleanup error:", err.message);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a PDF file first!' });
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage(null);

    const safeName = newspaper.replace(/\s+/g, '_');
    const storagePath = `epapers/${date}_${safeName}.pdf`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setProgress(percent);
      }, 
      (error) => {
        console.error("Upload error:", error);
        setMessage({ type: 'error', text: `Upload failed: ${error.message}` });
        setUploading(false);
      }, 
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          const docId = `${date}_${safeName.toLowerCase()}`;
          
          await setDoc(doc(db, "epapers", docId), {
            name: newspaper,
            date: date,
            pdfUrl: downloadUrl,
            uploadedBy: user?.name || 'Admin',
            createdAt: new Date().toISOString()
          });

          setMessage({ type: 'success', text: `Successfully uploaded ${newspaper} for ${date}!` });
          setFile(null);
          // Reset file input element
          e.target.reset();

          // Refresh list & run auto cleanup
          await fetchEpapers();
          await runAutoCleanup();
          await fetchEpapers();
        } catch (dbErr) {
          console.error("Firestore save error:", dbErr);
          setMessage({ type: 'error', text: `Failed to save metadata: ${dbErr.message}` });
        } finally {
          setUploading(false);
        }
      }
    );
  };

  const handleDelete = async (epaper) => {
    if (!window.confirm(`Are you sure you want to delete ${epaper.name} for ${epaper.date}?`)) {
      return;
    }

    try {
      // 1. Delete from storage
      const safeName = epaper.name.replace(/\s+/g, '_');
      const storagePath = `epapers/${epaper.date}_${safeName}.pdf`;
      const fileRef = ref(storage, storagePath);
      try {
        await deleteObject(fileRef);
      } catch (storageErr) {
        console.warn("PDF file not found in storage or already deleted.");
      }

      // 2. Delete from Firestore
      await deleteDoc(doc(db, "epapers", epaper.id));
      setMessage({ type: 'success', text: `Successfully deleted ${epaper.name} for ${epaper.date}.` });
      fetchEpapers();
    } catch (err) {
      console.error("Delete failed:", err);
      setMessage({ type: 'error', text: `Delete failed: ${err.message}` });
    }
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] dark:bg-[#0B0F19] text-center p-6">
        <div className="bg-white dark:bg-[#1E293B] border border-[#EAE8E4] dark:border-slate-800 rounded-2xl p-8 max-w-md shadow-sm">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You do not have permission to publish or manage ePapers. Only Satyam Singh has access to this portal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">ePaper Publisher Console</h1>
        <p className="text-slate-500 dark:text-slate-400">Upload daily e-newspaper PDFs for clients and team members.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1E293B] border border-[#EAE8E4] dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <UploadCloud size={20} className="text-blue-500" />
            Upload Today's PDF
          </h2>

          <form onSubmit={handleUpload} className="space-y-4">
            {message && (
              <div className={`p-3 rounded-lg border flex items-start gap-2 text-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900' 
                  : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900'
              }`}>
                {message.type === 'success' ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                <span>{message.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Newspaper / Publication</label>
              <select 
                value={newspaper} 
                onChange={(e) => setNewspaper(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none text-slate-800 dark:text-white"
              >
                {NEWSPAPERS.map(paper => (
                  <option key={paper} value={paper}>{paper}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Date</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl px-3 py-2 pl-10 text-sm outline-none text-slate-800 dark:text-white"
                  required
                />
                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Select PDF File</label>
              <input 
                type="file" 
                accept="application/pdf"
                onChange={handleFileChange}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-slate-200"
                required
              />
            </div>

            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-500">
                  <span>Uploading to Firebase Storage...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                uploading 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10'
              }`}
            >
              <UploadCloud size={16} />
              {uploading ? 'Publishing...' : 'Publish ePaper'}
            </button>
          </form>
        </div>

        {/* Uploaded List */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] border border-[#EAE8E4] dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Published Library</h2>
          
          {loading ? (
            <div className="py-20 text-center text-slate-400">Loading published papers...</div>
          ) : epapersList.length === 0 ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
              <FileText size={48} className="text-slate-300" />
              <span>No newspapers published yet. Upload one on the left!</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#EAE8E4] dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-xs">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Publication</th>
                    <th className="py-3 px-4">Uploaded By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE8E4] dark:divide-slate-800">
                  {epapersList.map(epaper => (
                    <tr key={epaper.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-3.5 px-4 font-medium">{epaper.date}</td>
                      <td className="py-3.5 px-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        {getDisplayName(epaper.name)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">{epaper.uploadedBy}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button 
                          onClick={() => handleDelete(epaper)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                          title="Delete PDF"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
