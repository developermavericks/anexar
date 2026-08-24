import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebaseClient';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { BookOpen, Download, Calendar, ArrowLeft, ZoomIn, FileText } from 'lucide-react';

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

const getDisplayName = (name) => {
  return DISPLAY_NAMES[name] || name;
};

export default function EPaperReader() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [epapers, setEpapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [activePaperName, setActivePaperName] = useState("");

  useEffect(() => {
    fetchEpapersForDate();
  }, [selectedDate]);

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

        {/* Date Selector styled to fit the banner */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2 shadow-sm shrink-0 w-fit relative z-10">
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

      {/* Main Grid */}
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

          {/* Interactive PDF frame container */}
          <div className="flex-1 bg-slate-950 overflow-hidden relative">
            <iframe 
              src={activePdfUrl ? `${activePdfUrl}&cb=${Date.now()}` : undefined}
              className="w-full h-full border-none"
              title="ePaper PDF Reader"
            />
          </div>
        </div>
      )}
    </div>
  );
}
