import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebaseClient';
import { collection, getDocs, query, where, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { BookOpen, Download, Calendar, ArrowLeft, ZoomIn, FileText, Brain, Plus, Trash2, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NEWSPAPERS_THEMES = {
  "The Hindu": "from-sky-700 to-indigo-900 text-white",
  "The H. Edition": "from-sky-700 to-indigo-900 text-white",
  "The Indian Express": "from-amber-600 to-amber-950 text-white",
  "Indian E. Paper": "from-amber-600 to-amber-950 text-white",
  "The Times of India": "from-red-800 to-red-950 text-white",
  "T.O.I Daily": "from-red-800 to-red-950 text-white",
  "Hindustan Times": "from-blue-650 to-indigo-900 text-white",
  "H.T. Daily": "from-blue-650 to-indigo-900 text-white",
  "Dainik Bhaskar": "from-orange-500 to-red-800 text-white",
  "D.B. Daily": "from-orange-500 to-red-800 text-white",
  "Dainik Jagran": "from-orange-600 to-red-900 text-white",
  "Dainik J. Daily": "from-orange-600 to-red-900 text-white",
  "Amar Ujala": "from-rose-600 to-rose-950 text-white",
  "Amar U. Daily": "from-rose-600 to-rose-950 text-white",
  "Hindustan": "from-amber-500 to-yellow-750 text-white",
  "Hindustan Daily": "from-amber-500 to-yellow-750 text-white",
  "Jansatta": "from-slate-700 to-slate-950 text-white",
  "Jansatta Daily": "from-slate-700 to-slate-950 text-white",
  "Navbharat Times": "from-red-700 to-slate-900 text-white",
  "Navbharat T. Daily": "from-red-700 to-slate-900 text-white",
  "Dainik Navajyoti": "from-blue-600 to-sky-900 text-white",
  "Dainik Navajyoti Daily": "from-blue-600 to-sky-900 text-white",
  "Punjab Kesari": "from-red-650 to-orange-850 text-white",
  "Punjab Kesari Daily": "from-red-650 to-orange-850 text-white",
  "Rashtriya Sahara": "from-yellow-600 to-amber-900 text-white",
  "Rashtriya Sahara Daily": "from-yellow-600 to-amber-900 text-white",
  "Prabhat Khabar": "from-cyan-600 to-teal-850 text-white",
  "Prabhat Khabar Daily": "from-cyan-600 to-teal-850 text-white",
  "Business Line": "from-emerald-700 to-teal-900 text-white",
  "Business L. Edition": "from-emerald-700 to-teal-900 text-white",
  "Livemint": "from-teal-600 to-emerald-800 text-white",
  "Live M. Paper": "from-teal-600 to-emerald-800 text-white",
  "The Economic Times": "from-red-700 to-orange-950 text-white",
  "Economic T. Daily": "from-red-700 to-orange-950 text-white",
  "Financial Express": "from-indigo-800 to-slate-900 text-white",
  "Financial E. Paper": "from-indigo-800 to-slate-900 text-white",
  "Business Standard": "from-stone-600 to-stone-900 text-white",
  "Business S. Edition": "from-stone-600 to-stone-900 text-white",
  "Custom": "from-slate-600 to-slate-800 text-white"
};

const NEWSPAPERS_SHORTCODES = {
  "The Hindu": "TH",
  "The H. Edition": "TH",
  "The Indian Express": "IE",
  "Indian E. Paper": "IE",
  "The Times of India": "TOI",
  "T.O.I Daily": "TOI",
  "Hindustan Times": "HT",
  "H.T. Daily": "HT",
  "Dainik Bhaskar": "DB",
  "D.B. Daily": "DB",
  "Dainik Jagran": "DJ",
  "Dainik J. Daily": "DJ",
  "Amar Ujala": "AU",
  "Amar U. Daily": "AU",
  "Hindustan": "H",
  "Hindustan Daily": "H",
  "Jansatta": "J",
  "Jansatta Daily": "J",
  "Navbharat Times": "NBT",
  "Navbharat T. Daily": "NBT",
  "Dainik Navajyoti": "DN",
  "Dainik Navajyoti Daily": "DN",
  "Punjab Kesari": "PK",
  "Punjab Kesari Daily": "PK",
  "Rashtriya Sahara": "RS",
  "Rashtriya Sahara Daily": "RS",
  "Prabhat Khabar": "PKH",
  "Prabhat Khabar Daily": "PKH",
  "Business Line": "BL",
  "Business L. Edition": "BL",
  "Livemint": "LM",
  "Live M. Paper": "LM",
  "The Economic Times": "ET",
  "Economic T. Daily": "ET",
  "Financial Express": "FE",
  "Financial E. Paper": "FE",
  "Business Standard": "BS",
  "Business S. Edition": "BS"
};

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
  "Dainik Navajyoti Edition": "Dainik Navajyoti",
  "Punjab Kesari": "Punjab Kesari",
  "Punjab Kesari Daily": "Punjab Kesari",
  "Punjab Kesari Edition": "Punjab Kesari",
  "Rashtriya Sahara": "Rashtriya Sahara",
  "Rashtriya Sahara Daily": "Rashtriya Sahara",
  "Rashtriya Sahara Edition": "Rashtriya Sahara",
  "Prabhat Khabar": "Prabhat Khabar",
  "Prabhat Khabar Daily": "Prabhat Khabar",
  "Prabhat Khabar Edition": "Prabhat Khabar",
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

const SECTORS = [
  "Ai",
  "Climate and environment",
  "Creator economy",
  "Education",
  "Gaming",
  "Geopolitics",
  "Healthcare",
  "Lifestyle",
  "Media and entertainment",
  "Money and business",
  "Pop culture",
  "Science and space",
  "Sports",
  "Startups",
  "Tech",
  "World news"
];

const getDisplayName = (name) => {
  return DISPLAY_NAMES[name] || name;
};

const formatReviewedAt = (dateInput) => {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    // Generate simulated microseconds suffix to match exact pattern length
    const micro = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}${micro}`;
  } catch (e) {
    return "";
  }
};

export default function EPaperReader() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [epapers, setEpapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePaperName, setActivePaperName] = useState("");
  const [headline, setHeadline] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedArticles, setSavedArticles] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTab, setCurrentTab] = useState("library"); // "library" or "training"
  const [allTrainingData, setAllTrainingData] = useState([]);
  const [loadingTrainingData, setLoadingTrainingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sector, setSector] = useState("Ai");

  useEffect(() => {
    if (currentTab === "training") {
      fetchAllTrainingData();
    }
  }, [currentTab]);

  const fetchAllTrainingData = async () => {
    setLoadingTrainingData(true);
    try {
      const q = query(
        collection(db, "model_training_data"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllTrainingData(list);
    } catch (err) {
      console.error("Error fetching all training data:", err);
    } finally {
      setLoadingTrainingData(false);
    }
  };

  useEffect(() => {
    fetchEpapersForDate();
  }, [selectedDate]);

  useEffect(() => {
    if (activePdfUrl) {
      fetchSavedArticles();
    }
  }, [activePdfUrl, selectedDate, activePaperName]);

  const fetchSavedArticles = async () => {
    try {
      const paperNameOnly = activePaperName.split(" - ")[0];
      const q = query(
        collection(db, "model_training_data"),
        where("date", "==", selectedDate),
        where("paperName", "==", paperNameOnly)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedArticles(list);
    } catch (err) {
      console.error("Error fetching saved articles:", err);
    }
  };

  const handleSaveArticle = async (e) => {
    e.preventDefault();
    if (!headline.trim()) return;
    setIsSubmitting(true);
    try {
      const paperNameOnly = activePaperName.split(" - ")[0];
      await addDoc(collection(db, "model_training_data"), {
        headline: headline.trim(),
        reason: reason.trim(),
        relevanceScore: 1,
        paperName: paperNameOnly,
        date: selectedDate,
        addedBy: user?.name || user?.email || 'Anonymous',
        sector: sector,
        createdAt: new Date().toISOString()
      });
      setHeadline("");
      setReason("");
      await fetchSavedArticles();
    } catch (err) {
      console.error("Error saving training article:", err);
      alert("Failed to save article. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteArticle = async (id) => {
    if (!window.confirm("Are you sure you want to remove this article from the training data?")) return;
    try {
      await deleteDoc(doc(db, "model_training_data", id));
      await fetchSavedArticles();
    } catch (err) {
      console.error("Error deleting training article:", err);
    }
  };

  const handleExportCSV = async () => {
    try {
      const q = query(
        collection(db, "model_training_data"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        alert("No training data collected yet to export!");
        return;
      }

      const headers = ["id", "article_id", "headline", "human_relevant", "human_age_bracket", "reviewed_at", "batch_id", "reviewer_reason", "reviewer_initials", "sector"];
      const rows = snapshot.docs.map((doc, idx) => {
        const d = doc.data();
        const displayId = `anexar_${snapshot.size - idx}`;
        return [
          `"${displayId}"`,
          `""`,
          `"${(d.headline || '').replace(/"/g, '""')}"`,
          1,
          `"general"`,
          `"${formatReviewedAt(d.createdAt)}"`,
          `"Anexar_batch"`,
          `"${(d.reason || '').replace(/"/g, '""')}"`,
          `"${(d.addedBy || '').replace(/"/g, '""')}"`,
          `"${(d.sector || '').toLowerCase()}"`
        ];
      });

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = window.document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `anexar_model_training_data_${new Date().toISOString().split('T')[0]}.csv`);
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (err) {
      console.error("Error exporting CSV:", err);
      alert("Failed to export training data.");
    }
  };

  const fetchEpapersForDate = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "epapers"), 
        where("date", "==", selectedDate)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEpapers(list);
    } catch (err) {
      console.error("Error fetching daily ePapers:", err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    return NEWSPAPERS_SHORTCODES[name] || name.substring(0, 3).toUpperCase();
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 10);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="space-y-6 w-full relative h-full font-sans">
      {/* Scoped animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes book-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.95; }
          100% { transform: scale(1); opacity: 1; }
        }
        .book-pulse-icon {
          animation: book-pulse 3s infinite ease-in-out;
        }
      `}} />

      {/* Boxed Page Header Banner */}
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-955 shadow-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-500 dark:text-blue-400 book-pulse-icon shrink-0">
            <BookOpen size={26} strokeWidth={2.5} />
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 bg-blue-500/10 border border-blue-400/30 text-blue-500 dark:text-blue-350 text-[9px] font-extrabold uppercase tracking-[1.5px] rounded-md">
              MEDIA RESOURCE LIBRARY
            </span>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white mt-0.5">
              Morning ePaper Library
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-0.5">Read and download daily digital editions of major newspapers.</p>
          </div>
        </div>

        {/* Actions Container */}
        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-blue-50 dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-slate-800 text-blue-600 dark:text-slate-300 border border-blue-100/50 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-black shadow-sm transition-all"
            title="Download full CSV training dataset"
          >
            <Brain size={14} className="text-blue-500" />
            Export Training Data
          </button>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2 shadow-sm">
            <Calendar size={16} className="text-slate-400 dark:text-slate-500" />
            <input 
              type="date" 
              value={selectedDate} 
              min={minDateStr}
              max={todayStr}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-0 outline-none text-xs font-black uppercase text-slate-700 dark:text-slate-350 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setCurrentTab("library")}
          className={`px-4 py-2.5 text-xs font-black tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all ${
            currentTab === "library"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          }`}
        >
          <BookOpen size={14} />
          ePaper Library
        </button>
        <button
          onClick={() => setCurrentTab("training")}
          className={`px-4 py-2.5 text-xs font-black tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all ${
            currentTab === "training"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          }`}
        >
          <Brain size={14} />
          AI Training Database (Excel View)
        </button>
      </div>

      {/* Library Grid View */}
      {currentTab === "library" && (
        <>
          {loading ? (
            <div className="py-32 text-center text-slate-400">Loading daily editions...</div>
          ) : epapers.length === 0 ? (
            <div className="py-32 bg-white dark:bg-[#1E293B] border border-[#EAE8E4] dark:border-slate-800 rounded-2xl text-center text-slate-400 flex flex-col items-center justify-center gap-3 shadow-sm">
              <FileText size={48} className="text-slate-300 dark:text-slate-700" />
              <span className="font-medium text-slate-600 dark:text-slate-300">No ePapers uploaded for {selectedDate}</span>
              <span className="text-xs text-slate-400">Contact your team admin or trainee-tech to upload today's editions.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {epapers.map(paper => {
                const theme = NEWSPAPERS_THEMES[paper.name] || NEWSPAPERS_THEMES.Custom;
                return (
                  <div 
                    key={paper.id} 
                    className="bg-white dark:bg-[#1E293B] border border-[#EAE8E4] dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full"
                  >
                    {/* Visual Cover Header */}
                    <div className={`h-40 bg-gradient-to-br ${theme} flex flex-col items-center justify-center relative select-none p-6 text-center`}>
                      {/* Large Elegant masthead text */}
                      <span className="font-serif text-2xl font-extrabold tracking-tight drop-shadow-md select-none">
                        {getDisplayName(paper.name)}
                      </span>
                      
                      {/* Subtle Shortcode Badge in corner */}
                      <span className="absolute top-3 right-3 text-[10px] font-mono tracking-wider font-extrabold uppercase bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg">
                        {getInitials(paper.name)}
                      </span>
                      
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all" />
                    </div>

                    {/* Details Footer */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white leading-tight group-hover:text-blue-600 transition-colors">
                          {getDisplayName(paper.name)}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">{paper.date}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setActivePdfUrl(paper.pdfUrl);
                            setActivePaperName(`${getDisplayName(paper.name)} - ${paper.date}`);
                          }}
                          className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <ZoomIn size={14} />
                          Read Online
                        </button>
                        <a
                          href={paper.pdfUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 text-blue-600 dark:text-slate-300 dark:hover:text-white p-2 rounded-xl border border-blue-100/50 dark:border-slate-800 transition-all flex items-center justify-center"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Spreadsheet / Table View */}
      {currentTab === "training" && (
        <div className="bg-white dark:bg-[#1E293B] border border-[#EAE8E4] dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">AI Training Dataset</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Spreadsheet view of all relevant articles marked for model training</p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              {/* Search input */}
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm">
                <Search size={14} className="text-slate-400 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dataset..."
                  className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 dark:text-slate-250 w-44"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20"
              >
                <Download size={14} />
                Download CSV
              </button>
            </div>
          </div>

          {loadingTrainingData ? (
            <div className="py-20 text-center text-slate-400 text-xs font-semibold">Loading dataset...</div>
          ) : allTrainingData.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs font-medium flex flex-col items-center justify-center gap-2">
              <Brain size={40} className="text-slate-350 dark:text-slate-700" />
              <span>No training data collected yet.</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4">id</th>
                    <th className="p-4">article_id</th>
                    <th className="p-4">headline</th>
                    <th className="p-4 text-center">human_relevant</th>
                    <th className="p-4 text-center">human_age_bracket</th>
                    <th className="p-4">reviewed_at</th>
                    <th className="p-4">batch_id</th>
                    <th className="p-4">reviewer_reason</th>
                    <th className="p-4">reviewer_initials</th>
                    <th className="p-4">sector</th>
                    <th className="p-4 text-center">actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-slate-700 dark:text-slate-350">
                  {allTrainingData
                    .filter(item => {
                      const query = searchQuery.toLowerCase();
                      return (
                        (item.headline || '').toLowerCase().includes(query) ||
                        (item.addedBy || '').toLowerCase().includes(query) ||
                        (item.reason || '').toLowerCase().includes(query) ||
                        (item.sector || '').toLowerCase().includes(query)
                      );
                    })
                    .map((item, idx) => {
                      const displayId = `anexar_${allTrainingData.length - idx}`;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-500 dark:text-slate-400">
                            {displayId}
                          </td>
                          <td className="p-4 text-slate-400 italic">
                            -
                          </td>
                          <td className="p-4 font-bold text-slate-900 dark:text-slate-100 break-words min-w-[200px]">
                            {item.headline}
                          </td>
                          <td className="p-4 text-center font-bold text-slate-900 dark:text-white">
                            1
                          </td>
                          <td className="p-4 text-center font-semibold text-slate-500">
                            general
                          </td>
                          <td className="p-4 font-mono text-[11px] text-slate-550 dark:text-slate-400 shrink-0">
                            {formatReviewedAt(item.createdAt)}
                          </td>
                          <td className="p-4 font-semibold text-slate-500">
                            Anexar_batch
                          </td>
                          <td className="p-4 italic max-w-[200px] break-words text-slate-550">
                            {item.reason || "-"}
                          </td>
                          <td className="p-4 font-semibold text-slate-800 dark:text-white max-w-[120px] truncate" title={item.addedBy}>
                            {item.addedBy}
                          </td>
                          <td className="p-4 font-bold text-blue-500 dark:text-blue-450 uppercase text-[10px] tracking-wider">
                            {(item.sector || "-").toLowerCase()}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteArticle(item.id).then(() => fetchAllTrainingData());
                              }}
                              className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Delete Row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen High-fidelity PDF Viewer Overlay */}
      {activePdfUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex flex-col animate-fade-in">
          {/* Header Panel */}
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between text-white">
            <button 
              onClick={() => {
                setActivePdfUrl(null);
                setActivePaperName("");
              }}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-all text-sm font-semibold"
            >
              <ArrowLeft size={18} />
              Back to Library
            </button>
            <h2 className="font-bold text-base truncate max-w-xs sm:max-w-md">{activePaperName}</h2>
            <a 
              href={activePdfUrl} 
              download
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Download size={14} />
              Download PDF
            </a>
          </div>

          {/* Interactive PDF frame container with Sidebar */}
          <div className="flex-1 flex bg-slate-950 overflow-hidden relative">
            {/* Left side: PDF iframe */}
            <div className="flex-1 h-full relative">
              <iframe 
                src={activePdfUrl ? `${activePdfUrl}&cb=${Date.now()}` : undefined}
                className="w-full h-full border-none"
                title="ePaper PDF Reader"
              />
            </div>

            {/* Toggle Button for Sidebar */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="absolute right-4 top-4 z-[10000] bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl border border-slate-700 flex items-center justify-center shadow-lg"
              title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            >
              <Brain size={18} className={sidebarOpen ? "text-blue-400" : "text-slate-400"} />
            </button>

            {/* Right side: Trainer Sidebar */}
            {sidebarOpen && (
              <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 text-white flex flex-col h-full z-10 relative shrink-0">
                <div className="p-5 border-b border-slate-800 flex items-center gap-2">
                  <Brain className="text-blue-400 shrink-0" size={20} />
                  <div>
                    <h3 className="font-extrabold text-sm tracking-tight">AI Training Collector</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Collect relevant articles for model training</p>
                  </div>
                </div>

                {/* Form to add article */}
                <form onSubmit={handleSaveArticle} className="p-5 border-b border-slate-800 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Headline/Topic</label>
                    <input
                      type="text"
                      required
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. Google launches new AI model"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason/Context (Optional)</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Critical launch update for tech sector"
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sector</label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      {SECTORS.map(sec => (
                        <option key={sec} value={sec} className="bg-slate-900 text-white">{sec}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg flex flex-col justify-center">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Relevance Score</span>
                      <span className="text-xs font-black text-emerald-400 mt-0.5">1.0 (Relevant)</span>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting || !headline.trim()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 shadow-md shadow-blue-500/20"
                    >
                      <Plus size={14} />
                      {isSubmitting ? "Saving..." : "Add Article"}
                    </button>
                  </div>
                </form>

                {/* Saved Articles List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Saved Today ({savedArticles.length})</span>
                  </h4>

                  {savedArticles.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-medium">
                      No articles marked today. Start adding relevant headlines above!
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {savedArticles.map(art => (
                        <div key={art.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-start justify-between gap-3 group">
                          <div className="space-y-1 min-w-0">
                            <p className="text-xs font-bold text-slate-200 leading-snug break-words">{art.headline}</p>
                            {art.reason && (
                              <p className="text-[10px] text-slate-400 italic break-words">Reason: {art.reason}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteArticle(art.id)}
                            className="text-slate-500 hover:text-red-500 transition-colors p-1 rounded hover:bg-slate-850 shrink-0"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer with Master Export */}
                <div className="p-5 border-t border-slate-800 bg-slate-950/50">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} className="text-blue-400" />
                    Export All Training Data (CSV)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
