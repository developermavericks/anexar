import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebaseClient';
import { collection, getDocs, query, where, orderBy, addDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { BookOpen, Download, Calendar, ArrowLeft, ZoomIn, FileText, Brain, Plus, Trash2, Search, RefreshCw, Image, Paperclip, X, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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
  "Financial Times": "from-[#FFEDE0] to-[#E5C1A7] text-[#3F200C]",
  "F.T. Daily": "from-[#FFEDE0] to-[#E5C1A7] text-[#3F200C]",
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
  "Business S. Edition": "BS",
  "Financial Times": "FT",
  "F.T. Daily": "FT"
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
  "Business S. Edition": "Business Standard",
  "Financial Times": "Financial Times",
  "F.T. Daily": "Financial Times"
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

const isAllowedTrainer = (email) => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  const allowedPrefixes = ["pooja", "satyam", "divyansh", "arun", "chetan", "udbhav", "tanvi", "aditya"];
  const prefix = lower.split('@')[0];
  return allowedPrefixes.some(p => prefix.startsWith(p));
};

export default function EPaperReader() {
  const { user } = useAuth();
  const showTrainerFeatures = Boolean(user && isAllowedTrainer(user.email));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [epapers, setEpapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const [stableIframeUrl, setStableIframeUrl] = useState("");
  const [activePaperName, setActivePaperName] = useState("");
  const [headline, setHeadline] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedArticles, setSavedArticles] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("library"); // "library", "website", or "training"
  const [databaseFilter, setDatabaseFilter] = useState("epaper"); // "epaper" or "website"

  // Website Articles States
  const [webPublication, setWebPublication] = useState("Vogue");
  const [webCustomPublication, setWebCustomPublication] = useState("");
  const [webHeadline, setWebHeadline] = useState("");
  const [webReason, setWebReason] = useState("");
  const [webSectors, setWebSectors] = useState([]);
  const [webScreenshotFile, setWebScreenshotFile] = useState(null);
  const [webScreenshotPreview, setWebScreenshotPreview] = useState(null);
  const [isSavingWebArticle, setIsSavingWebArticle] = useState(false);
  const [webArticles, setWebArticles] = useState([]);
  const [loadingWebArticles, setLoadingWebArticles] = useState(false);

  // Website Filters States
  const [webSearchQuery, setWebSearchQuery] = useState("");
  const [webPublicationFilter, setWebPublicationFilter] = useState("all");
  const [webCollectorFilter, setWebCollectorFilter] = useState("all");
  const [webSectorFilter, setWebSectorFilter] = useState("all");

  // Excel View Filters States
  const [dbSourceTypeFilter, setDbSourceTypeFilter] = useState("all"); // "all", "epaper", "website"
  const [dbPublicationFilter, setDbPublicationFilter] = useState("all");
  const [dbCollectorFilter, setDbCollectorFilter] = useState("all");
  const [dbSectorFilter, setDbSectorFilter] = useState("all");

  const fetchWebArticles = async () => {
    setLoadingWebArticles(true);
    try {
      const qSnap = await getDocs(
        query(collection(db, "model_training_data"), orderBy("createdAt", "desc"))
      );
      const items = qSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.sourceType === "website");
      setWebArticles(items);
    } catch (err) {
      console.error("Error fetching website articles:", err);
    } finally {
      setLoadingWebArticles(false);
    }
  };

  useEffect(() => {
    if (currentTab === "website" || currentTab === "training") {
      fetchWebArticles();
    }
  }, [currentTab]);

  const handleSubmitWebArticle = async (e) => {
    e.preventDefault();
    if (!webHeadline.trim()) {
      alert("Please enter a headline.");
      return;
    }

    setIsSavingWebArticle(true);
    try {
      const docRef = doc(collection(db, "model_training_data"));
      
      let finalScreenshotUrl = "";
      if (webScreenshotFile) {
        const fileExtension = webScreenshotFile.name.split('.').pop() || 'png';
        const storagePath = `training_screenshots/${docRef.id}.${fileExtension}`;
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, webScreenshotFile);
        finalScreenshotUrl = await getDownloadURL(fileRef);
      }

      const selectedPublication = webPublication === "Custom" ? webCustomPublication.trim() : webPublication;
      if (!selectedPublication) {
        alert("Please enter or select a publication.");
        setIsSavingWebArticle(false);
        return;
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      const micro = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const formattedReviewedAt = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}${micro}`;

      const docData = {
        article_id: docRef.id,
        headline: webHeadline.trim(),
        human_relevant: 1,
        human_age_bracket: "general",
        reviewed_at: formattedReviewedAt,
        batch_id: "Anexar_batch",
        reviewer_reason: webReason.trim(),
        reviewer_initials: user?.name || (user?.email ? user.email.split('@')[0] : 'developer'),
        sector: webSectors.join(", "),
        screenshotUrl: finalScreenshotUrl,
        
        // internal database helpers
        sourceType: "website",
        publication: selectedPublication,
        paperName: selectedPublication,
        reason: webReason.trim(),
        addedBy: user?.email ? user.email.split('@')[0] : "developer",
        createdAt: now.toISOString()
      };

      await setDoc(docRef, docData);
      
      setWebPublication("Vogue");
      setWebCustomPublication("");
      setWebHeadline("");
      setWebReason("");
      setWebSectors([]);
      setWebScreenshotFile(null);
      setWebScreenshotPreview(null);

      await fetchWebArticles();
      await fetchAllTrainingData();
      alert("Website article training data added successfully!");
    } catch (err) {
      console.error("Error adding website article:", err);
      alert("Failed to save website article data: " + err.message);
    } finally {
      setIsSavingWebArticle(false);
    }
  };

  const handleInlineUploadWebScreenshot = async (docId, file) => {
    if (!file) return;
    setUploadingDocId(docId);
    try {
      const fileExtension = file.name.split('.').pop() || 'png';
      const fileRef = ref(storage, `training_screenshots/${docId}.${fileExtension}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);

      await setDoc(doc(db, "model_training_data", docId), {
        screenshotUrl: downloadUrl
      }, { merge: true });

      await fetchWebArticles();
      await fetchAllTrainingData();
      alert("Screenshot replaced successfully!");
    } catch (err) {
      console.error("Error replacing inline screenshot:", err);
      alert("Failed to replace screenshot: " + err.message);
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleDeleteWebArticle = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this website training entry?")) return;
    try {
      await deleteDoc(doc(db, "model_training_data", docId));
      await fetchWebArticles();
      await fetchAllTrainingData();
      alert("Entry deleted successfully!");
    } catch (err) {
      console.error("Error deleting website article:", err);
      alert("Failed to delete entry: " + err.message);
    }
  };

  const getGlobalDisplayId = (item) => {
    const sorted = [...allTrainingData].reverse();
    const idx = sorted.findIndex(x => x.id === item.id);
    if (idx !== -1) {
      return `anexar_${idx + 1}`;
    }
    return "anexar_-";
  };

  const [allTrainingData, setAllTrainingData] = useState([]);
  const [loadingTrainingData, setLoadingTrainingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectors, setSectors] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [uploadingDocId, setUploadingDocId] = useState(null);

  // PDF Text Extraction & Search
  const [pdfTextPages, setPdfTextPages] = useState([]);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [pdfSearchQuery, setPdfSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Extract text from the loaded ePaper PDF in the background
  useEffect(() => {
    if (!activePdfUrl) {
      setPdfTextPages([]);
      setPdfSearchQuery("");
      setSearchResults([]);
      return;
    }

    const extractText = async () => {
      setIsExtractingText(true);
      setPdfTextPages([]);
      setPdfSearchQuery("");
      setSearchResults([]);
      try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const proxiedUrl = isLocal
          ? activePdfUrl.replace("https://firebasestorage.googleapis.com", "/storage-proxy")
          : `https://proxypdf-mjsmlxvrgq-uc.a.run.app?url=${encodeURIComponent(activePdfUrl)}`;
        console.log("Loading PDF for text extraction:", proxiedUrl);
        const loadingTask = pdfjsLib.getDocument(proxiedUrl);
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        const extractedPages = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          try {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            extractedPages.push({
              page: pageNum,
              text: pageText
            });
          } catch (pageErr) {
            console.error(`Error extracting text for page ${pageNum}:`, pageErr);
            extractedPages.push({
              page: pageNum,
              text: ""
            });
          }
        }
        setPdfTextPages(extractedPages);
        console.log("Successfully extracted text from PDF:", numPages, "pages");
      } catch (err) {
        console.error("Error loading PDF for text extraction:", err);
      } finally {
        setIsExtractingText(false);
      }
    };

    extractText();
  }, [activePdfUrl]);

  // Search logic and snippet generator
  useEffect(() => {
    if (!pdfSearchQuery.trim() || pdfTextPages.length === 0) {
      setSearchResults([]);
      return;
    }

    const query = pdfSearchQuery.toLowerCase();
    const results = [];

    pdfTextPages.forEach(pageObj => {
      const text = pageObj.text;
      const lowerText = text.toLowerCase();
      let index = lowerText.indexOf(query);

      // Find all matches in this page
      while (index !== -1) {
        // Extract a snippet (e.g. 50 characters before and after)
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + query.length + 50);
        let snippet = text.slice(start, end).trim();

        // Add ellipsis if truncated
        if (start > 0) snippet = "..." + snippet;
        if (end < text.length) snippet = snippet + "...";

        results.push({
          page: pageObj.page,
          index: index,
          snippet: snippet,
          matchWord: text.slice(index, index + query.length)
        });

        // Search for next occurrence
        index = lowerText.indexOf(query, index + 1);
        
        // Limit results per page to 5 to avoid overloading UI
        if (results.filter(r => r.page === pageObj.page).length >= 5) {
          break;
        }
      }
    });

    setSearchResults(results);
  }, [pdfSearchQuery, pdfTextPages]);

  const highlightSnippet = (snippet, matchWord) => {
    if (!matchWord) return snippet;
    const parts = snippet.split(new RegExp(`(${escapeRegExp(matchWord)})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === matchWord.toLowerCase() 
            ? <strong key={i} className="text-blue-400 bg-blue-500/10 px-0.5 rounded">{part}</strong> 
            : part
        )}
      </>
    );
  };

  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const handleManualSyncToSheets = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('https://synctogooglesheetshttp-mjsmlxvrgq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(`Successfully synchronized ${data.count} records to Google Sheets!`);
      } else {
        alert(`Sync failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Sync error:", err);
      alert("Network error: Failed to connect to sync endpoint.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (showTrainerFeatures) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [user]);

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
      
      // Generate precise microsecond timestamp for reviewed_at
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      const micro = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const formattedReviewedAt = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}${micro}`;

      const docRef = doc(collection(db, "model_training_data"));
      
      // 1. Upload screenshot to Firebase Storage if present
      let screenshotUrl = "";
      if (screenshotFile) {
        const fileExtension = screenshotFile.name.split('.').pop() || 'png';
        const storagePath = `training_screenshots/${docRef.id}.${fileExtension}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, screenshotFile);
        screenshotUrl = await getDownloadURL(storageRef);
      }

      await setDoc(docRef, {
        article_id: docRef.id,
        headline: headline.trim(),
        human_relevant: 1,
        human_age_bracket: "general",
        reviewed_at: formattedReviewedAt,
        batch_id: "Anexar_batch",
        reviewer_reason: reason.trim(),
        reviewer_initials: user?.name || user?.email || 'Anonymous',
        sector: sectors.map(s => s.toLowerCase()).join(', '),
        screenshotUrl: screenshotUrl,
        
        // internal database helpers
        sourceType: "epaper",
        paperName: paperNameOnly,
        date: selectedDate,
        createdAt: now.toISOString()
      });
      setHeadline("");
      setReason("");
      setSectors([]);
      setScreenshotFile(null);
      setScreenshotPreview(null);
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
      await fetchAllTrainingData();
      await fetchWebArticles();
    } catch (err) {
      console.error("Error deleting training article:", err);
    }
  };

  const handleInlineUploadScreenshot = async (e, docId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDocId(docId);
    try {
      const fileExtension = file.name.split('.').pop() || 'png';
      const storagePath = `training_screenshots/${docId}.${fileExtension}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Update Firestore document with merge true
      await setDoc(doc(db, "model_training_data", docId), {
        screenshotUrl: downloadUrl
      }, { merge: true });
      
      await fetchAllTrainingData();
      await fetchSavedArticles();
      await fetchWebArticles();
    } catch (err) {
      console.error("Error uploading inline screenshot:", err);
      alert("Failed to upload screenshot. Please try again.");
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleExportCSV = async () => {
    try {
      const isWeb = currentTab === "website" || (currentTab === "training" && databaseFilter === "website");
      const collectionName = isWeb ? "website_training_data" : "model_training_data";
      
      const q = query(
        collection(db, collectionName),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        alert("No training data collected yet to export!");
        return;
      }

      const headers = ["id", "article_id", "headline", "human_relevant", "human_age_bracket", "reviewed_at", "batch_id", "reviewer_reason", "reviewer_initials", "sector", "publication", "screenshot_url"];
      const rows = snapshot.docs.map((doc, idx) => {
        const d = doc.data();
        const prefix = isWeb ? "website" : "anexar";
        const displayId = `${prefix}_${snapshot.size - idx}`;
        return [
          `"${displayId}"`,
          isWeb ? `"${(d.articleUrl || '').replace(/"/g, '""')}"` : `"${d.article_id || doc.id}"`,
          `"${(d.headline || '').replace(/"/g, '""')}"`,
          d.human_relevant !== undefined ? d.human_relevant : 1,
          `"${d.human_age_bracket || 'general'}"`,
          `"${d.reviewed_at || formatReviewedAt(d.createdAt) || ''}"`,
          `"${d.batch_id || (isWeb ? 'Website_batch' : 'Anexar_batch')}"`,
          `"${(d.reviewer_reason || d.reason || '').replace(/"/g, '""')}"`,
          `"${(d.reviewer_initials || d.addedBy || '').replace(/"/g, '""')}"`,
          `"${(d.sector || '').toLowerCase()}"`,
          isWeb ? `"${(d.publication || '').replace(/"/g, '""')}"` : `"${(d.paperName || '').replace(/"/g, '""')}"`,
          `"${d.screenshotUrl || ''}"`
        ];
      });

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = window.document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", isWeb ? `website_training_data_${new Date().toISOString().split('T')[0]}.csv` : `epaper_training_data_${new Date().toISOString().split('T')[0]}.csv`);
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (err) {
      console.error("Error exporting CSV:", err);
      alert("Failed to export CSV: " + err.message);
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
          {showTrainerFeatures && (
            <>
              <button
                onClick={() => setCurrentTab(currentTab === "library" ? "training" : "library")}
                className="flex items-center gap-1.5 bg-blue-50 dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-slate-800 text-blue-600 dark:text-slate-300 border border-blue-100/50 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-black shadow-sm transition-all"
                title="Toggle between ePaper Library and Training Data Database"
              >
                <FileText size={14} className="text-blue-500" />
                {currentTab === "library" ? "View Training Data" : "View ePaper Library"}
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 bg-blue-50 dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-slate-800 text-blue-600 dark:text-slate-300 border border-blue-100/50 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-black shadow-sm transition-all"
                title="Download full CSV training dataset"
              >
                <Brain size={14} className="text-blue-500" />
                Export Training Data
              </button>
            </>
          )}

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
      {showTrainerFeatures && (
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
            onClick={() => setCurrentTab("website")}
            className={`px-4 py-2.5 text-xs font-black tracking-wider uppercase flex items-center gap-1.5 border-b-2 transition-all ${
              currentTab === "website"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <Globe size={14} />
            Website Articles
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
            Tattle Training Database (Excel View)
          </button>
        </div>
      )}

      {/* Library Grid View */}
      {currentTab === "library" && (
        <>
          {/* Daily ePaper Assignments Reference Grid - Only shown to assigned trainers */}
          {showTrainerFeatures && (
            <div className="bg-white dark:bg-[#1E293B] border border-[#EAE8E4] dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 mb-6 animate-fade-in">
              <h4 className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">Daily ePaper Assignments</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                  <div className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">👩‍💻 Tanvi</div>
                  <div className="text-xs font-extrabold text-slate-850 dark:text-white mt-1 leading-tight flex flex-wrap gap-1">
                    <a href="https://www.careerswave.in/the-hindu-epaper-pdf-download-for-upsc/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Hindu ↗</a>,
                    <a href="https://www.careerswave.in/business-standard-newspaper-in-pdf/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Business Standard ↗</a>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                  <div className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">👩‍💻 Pooja</div>
                  <div className="text-xs font-extrabold text-slate-850 dark:text-white mt-1 leading-tight flex flex-wrap gap-1">
                    <a href="https://www.careerswave.in/economic-times-epaper-pdf-free-download/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Econ ↗</a>,
                    <a href="https://www.careerswave.in/times-of-india-epaper-pdf-free-download/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">TOI ↗</a>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                  <div className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">👨‍💻 Satyam</div>
                  <div className="text-xs font-extrabold text-slate-850 dark:text-white mt-1 leading-tight flex flex-wrap gap-1">
                    <a href="https://www.careerswave.in/business-line-epaper-pdf-free-download/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Business Line ↗</a>,
                    <a href="https://www.careerswave.in/mint-epaper-pdf-free-download/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Mint ↗</a>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                  <div className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">👨‍💻 Divyansh</div>
                  <div className="text-xs font-extrabold text-slate-850 dark:text-white mt-1 leading-tight flex flex-wrap gap-1">
                    <a href="https://indianexpress.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Indian Express ↗</a>,
                    <a href="https://www.livemint.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Live Mint ↗</a>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                  <div className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">👨‍💻 Arun</div>
                  <div className="text-xs font-extrabold text-slate-850 dark:text-white mt-1 leading-tight flex flex-wrap gap-1">
                    <a href="https://www.careerswave.in/the-financial-express-epaper-pdf-free-download/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Financial Express ↗</a>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                  <div className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">👨‍💻 Aditya</div>
                  <div className="text-xs font-extrabold text-slate-850 dark:text-white mt-1 leading-tight flex flex-wrap gap-1">
                    <a href="https://www.marca.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">La Marca ↗</a>,
                    <a href="https://thediplomat.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">The Diplomat ↗</a>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                  <div className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">👨‍💻 Udbhav</div>
                  <div className="text-xs font-extrabold text-slate-850 dark:text-white mt-1 leading-tight flex flex-wrap gap-1">
                    <a href="https://www.careerswave.in/hindustan-times-epaper-pdf-free-download/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Hindustan Times ↗</a>,
                    <a href="https://www.careerswave.in/dainik-bhaskar-epaper-pdf-free-download/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Dainik Bhaskar ↗</a>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                            setStableIframeUrl(paper.pdfUrl ? `${paper.pdfUrl}&cb=${Date.now()}` : "");
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

      {/* Website Articles View */}
      {currentTab === "website" && (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[450px]">
          {/* Left side: Collected Web Articles Table */}
          <div className="flex-1 bg-white dark:bg-[#1E293B] border border-[#EAE8E4] dark:border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-xl">
            <div className="p-5 border-b border-[#EAE8E4] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/35">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white tracking-tight">Saved Website Articles</h3>
                <p className="text-[10px] text-slate-450 font-semibold mt-0.5">List of website entries collected today</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Website Search Input */}
                <div className="relative flex items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-sm">
                  <Search size={12} className="text-slate-400 mr-2 animate-pulse" />
                  <input
                    type="text"
                    value={webSearchQuery}
                    onChange={(e) => setWebSearchQuery(e.target.value)}
                    placeholder="Search website articles..."
                    className="bg-transparent border-none outline-none text-[11px] font-semibold text-slate-700 dark:text-slate-300 w-36 focus:w-44 transition-all"
                  />
                  {webSearchQuery && (
                    <button onClick={() => setWebSearchQuery("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-white ml-1">
                      <X size={10} />
                    </button>
                  )}
                </div>
                <button
                  onClick={fetchWebArticles}
                  disabled={loadingWebArticles}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <RefreshCw size={14} className={loadingWebArticles ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            
            {/* Website Filters Bar */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-[#EAE8E4] dark:border-slate-800">
              <div className="space-y-0.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Site / Publication</label>
                <select
                  value={webPublicationFilter}
                  onChange={(e) => setWebPublicationFilter(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-[11px] rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Sites</option>
                  {Array.from(new Set(webArticles.map(item => item.publication).filter(Boolean))).sort().map(pub => (
                    <option key={pub} value={pub}>{pub}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-0.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Collector</label>
                <select
                  value={webCollectorFilter}
                  onChange={(e) => setWebCollectorFilter(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-[11px] rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Collectors</option>
                  {Array.from(new Set(webArticles.map(item => item.reviewer_initials || item.addedBy || "").filter(Boolean))).sort().map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-0.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sector</label>
                <select
                  value={webSectorFilter}
                  onChange={(e) => setWebSectorFilter(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-[11px] rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Sectors</option>
                  {SECTORS.map(sec => (
                    <option key={sec} value={sec.toLowerCase()}>{sec}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
              {loadingWebArticles ? (
                <div className="py-20 text-center text-slate-450 text-xs">Loading website articles...</div>
              ) : webArticles.length === 0 ? (
                <div className="py-20 text-center text-slate-450 text-xs italic">No website articles saved yet. Use the sidebar to add entries!</div>
              ) : (
                <div className="min-w-full inline-block align-middle">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-450 uppercase font-black tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Publication</th>
                        <th className="px-4 py-3">Headline</th>
                        <th className="px-4 py-3">Sectors</th>
                        <th className="px-4 py-3 text-center">Screenshot</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-slate-700 dark:text-slate-305 font-semibold">
                      {webArticles
                        .filter(item => {
                          // 1. Text Search query filter
                          const query = webSearchQuery.toLowerCase();
                          if (query) {
                            const matchesQuery = (
                              (item.headline || '').toLowerCase().includes(query) ||
                              (item.publication || '').toLowerCase().includes(query) ||
                              (item.reviewer_initials || item.addedBy || '').toLowerCase().includes(query) ||
                              (item.sector || '').toLowerCase().includes(query)
                            );
                            if (!matchesQuery) return false;
                          }

                          // 2. Publication filter
                          if (webPublicationFilter !== "all" && item.publication !== webPublicationFilter) return false;

                          // 3. Collector filter
                          const col = item.reviewer_initials || item.addedBy || "";
                          if (webCollectorFilter !== "all" && col !== webCollectorFilter) return false;

                          // 4. Sector filter
                          const sec = (item.sector || "").toLowerCase();
                          if (webSectorFilter !== "all" && !sec.includes(webSectorFilter.toLowerCase())) return false;

                          return true;
                        })
                        .map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-400">{getGlobalDisplayId(item)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-md font-bold uppercase text-[9px]">
                              {item.publication}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate" title={item.headline}>
                            {item.headline}
                          </td>
                          <td className="px-4 py-3 max-w-[120px] truncate" title={item.sector}>
                            {item.sector || "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.screenshotUrl ? (
                                <>
                                  <a 
                                    href={item.screenshotUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="h-8 w-12 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden hover:border-blue-500 transition-all flex items-center justify-center shrink-0 shadow-sm"
                                  >
                                    <img src={item.screenshotUrl} alt="ss" className="h-full w-full object-cover" />
                                  </a>
                                  <label className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer transition-colors relative" title="Replace Screenshot">
                                    <Paperclip size={12} />
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => handleInlineUploadWebScreenshot(item.id, e.target.files[0])}
                                      disabled={uploadingDocId === item.id}
                                    />
                                  </label>
                                </>
                              ) : (
                                <label className="flex items-center justify-center h-8 w-12 rounded border border-dashed border-slate-350 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors" title="Attach Screenshot">
                                  {uploadingDocId === item.id ? <RefreshCw size={10} className="animate-spin text-blue-500" /> : <Plus size={12} />}
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => handleInlineUploadWebScreenshot(item.id, e.target.files[0])}
                                    disabled={uploadingDocId === item.id}
                                  />
                                </label>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDeleteWebArticle(item.id)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              title="Delete Entry"
                            >
                              <Trash2 size={13} />
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

          {/* Right side: Website Articles Collector Form */}
          <div className="w-80 sm:w-96 bg-white dark:bg-[#1E293B] border border-[#EAE8E4] dark:border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-xl h-full shrink-0">
            <div className="p-5 border-b border-[#EAE8E4] dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/35">
              <Brain className="text-blue-500 shrink-0" size={20} />
              <div>
                <h3 className="font-extrabold text-sm tracking-tight text-slate-850 dark:text-white">Website Collector</h3>
                <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Collect articles from site publications</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
              {/* Guidelines / Assignments Reference Card */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 shadow-inner">
                <h4 className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">Site Assignment Guide</h4>
                <div className="space-y-1.5 text-[10px] text-slate-650 dark:text-slate-400 font-semibold leading-relaxed">
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                    <span>👩‍💻 Tanvi</span>
                    <span className="font-bold"><a href="https://www.vogue.in" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Vogue ↗</a></span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                    <span>👩‍💻 Pooja</span>
                    <span className="font-bold"><a href="https://www.ign.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">gaming ↗</a></span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                    <span>👨‍💻 Satyam</span>
                    <span className="font-bold"><a href="https://techcrunch.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">TechCrunch ↗</a></span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                    <span>👨‍💻 Divyansh</span>
                    <span className="font-bold"><a href="https://www.si.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Sports Illustrated ↗</a></span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                    <span>👨‍💻 Arun</span>
                    <span className="font-bold flex gap-1">
                      <a href="https://inc42.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Inc42 ↗</a>,
                      <a href="https://www.espn.in" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">ESPN ↗</a>,
                      <a href="https://www.ndtv.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">NDTV ↗</a>
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-1">
                    <span>👨‍💻 Aditya</span>
                    <span className="font-bold flex gap-1">
                      <a href="https://www.lequipe.fr" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">L’equipe ↗</a>,
                      <a href="https://www.marca.com/en/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">la marca ↗</a>,
                      <a href="https://thediplomat.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">the diplomat ↗</a>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>👨‍💻 Udbhav</span>
                    <span className="font-bold"><a href="https://edition.cnn.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">CNN ↗</a></span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitWebArticle} className="space-y-4">

                {/* Publication Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Publication / Site</label>
                  <select
                    value={webPublication}
                    onChange={(e) => setWebPublication(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 outline-none text-xs rounded-xl px-3 py-2 text-slate-800 dark:text-white transition-colors"
                  >
                    <option value="Vogue">Vogue</option>
                    <option value="gaming">gaming</option>
                    <option value="TechCrunch">TechCrunch</option>
                    <option value="Sports Illustrated">Sports Illustrated</option>
                    <option value="Inc42">Inc42</option>
                    <option value="ESPN">ESPN</option>
                    <option value="NDTV">NDTV</option>
                    <option value="L’equipe">L’equipe</option>
                    <option value="la marca">la marca</option>
                    <option value="the diplomat">the diplomat</option>
                    <option value="CNN">CNN</option>
                    <option value="Custom">Custom (Type manually...)</option>
                  </select>
                </div>

                {/* Custom Publication Field */}
                {webPublication === "Custom" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Custom Publication Name</label>
                    <input
                      type="text"
                      value={webCustomPublication}
                      onChange={(e) => setWebCustomPublication(e.target.value)}
                      placeholder="e.g. Forbes"
                      required
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 outline-none text-xs rounded-xl px-3 py-2 text-slate-800 dark:text-white transition-colors"
                    />
                  </div>
                )}

                {/* Headline/Topic */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Headline / Topic</label>
                  <input
                    type="text"
                    value={webHeadline}
                    onChange={(e) => setWebHeadline(e.target.value)}
                    placeholder="e.g. Vogue launches new fashion trends"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 outline-none text-xs rounded-xl px-3 py-2 text-slate-800 dark:text-white transition-colors"
                  />
                </div>

                {/* Reason/Context */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Reason / Context (Optional)</label>
                  <textarea
                    value={webReason}
                    onChange={(e) => setWebReason(e.target.value)}
                    placeholder="e.g. Highly relevant for creative sector trends"
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 outline-none text-xs rounded-xl px-3 py-2 text-slate-800 dark:text-white transition-colors resize-none"
                  />
                </div>

                {/* Sectors Checkboxes Grid */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Sectors (Select Multiple)</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 max-h-36 overflow-y-auto custom-scrollbar">
                    {SECTORS.map(sec => {
                      const isChecked = webSectors.includes(sec.toLowerCase());
                      return (
                        <label 
                          key={sec} 
                          className={`flex items-center gap-2 text-[10px] text-slate-650 dark:text-slate-350 font-bold hover:text-slate-850 dark:hover:text-white cursor-pointer select-none`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const secKey = sec.toLowerCase();
                              if (e.target.checked) {
                                setWebSectors([...webSectors, secKey]);
                              } else {
                                setWebSectors(webSectors.filter(s => s !== secKey));
                              }
                            }}
                            className="rounded border-slate-300 dark:border-slate-800 text-blue-500 focus:ring-0 focus:ring-offset-0 bg-slate-50 dark:bg-slate-950 w-3.5 h-3.5"
                          />
                          {sec}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Screenshot Upload */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Upload Screenshot (Optional)</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex flex-col items-center justify-center px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded-xl cursor-pointer group transition-colors">
                      <span className="text-[11px] text-slate-450 group-hover:text-slate-600 dark:group-hover:text-slate-200 font-black">Choose Image/Screenshot</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setWebScreenshotFile(file);
                            setWebScreenshotPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                    {webScreenshotPreview && (
                      <div className="relative h-12 w-16 rounded border border-slate-350 dark:border-slate-700 overflow-hidden bg-slate-550 shrink-0">
                        <img src={webScreenshotPreview} alt="preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setWebScreenshotFile(null);
                            setWebScreenshotPreview(null);
                          }}
                          className="absolute top-0.5 right-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5"
                        >
                          <X size={8} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSavingWebArticle}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                >
                  {isSavingWebArticle ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add Website Entry
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet / Table View */}
      {currentTab === "training" && (
        <div className="bg-white dark:bg-[#1E293B] border border-[#EAE8E4] dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">Tattle Training Dataset</h3>
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

              <button
                onClick={handleManualSyncToSheets}
                disabled={isSyncing}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:opacity-75 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-500/20"
                title="Force instant sync to configured Google Sheet"
              >
                <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "Syncing..." : "Sync to Sheets"}
              </button>
            </div>
          </div>

          {/* Database Filters Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-inner animate-fade-in">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Source Type</label>
              <select
                value={dbSourceTypeFilter}
                onChange={(e) => setDbSourceTypeFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-xs rounded-xl px-3 py-2 text-slate-700 dark:text-slate-350 transition-colors"
              >
                <option value="all">All Sources</option>
                <option value="epaper">Newspaper ePapers</option>
                <option value="website">Website Articles</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Publication / Site</label>
              <select
                value={dbPublicationFilter}
                onChange={(e) => setDbPublicationFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-xs rounded-xl px-3 py-2 text-slate-700 dark:text-slate-350 transition-colors"
              >
                <option value="all">All Publications</option>
                {Array.from(new Set(allTrainingData.map(item => item.paperName || item.publication || "").filter(Boolean))).sort().map(pub => (
                  <option key={pub} value={pub}>{pub}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Collector</label>
              <select
                value={dbCollectorFilter}
                onChange={(e) => setDbCollectorFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-xs rounded-xl px-3 py-2 text-slate-700 dark:text-slate-350 transition-colors"
              >
                <option value="all">All Collectors</option>
                {Array.from(new Set(allTrainingData.map(item => item.reviewer_initials || item.addedBy || "").filter(Boolean))).sort().map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Sector</label>
              <select
                value={dbSectorFilter}
                onChange={(e) => setDbSectorFilter(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-xs rounded-xl px-3 py-2 text-slate-700 dark:text-slate-350 transition-colors"
              >
                <option value="all">All Sectors</option>
                {SECTORS.map(sec => (
                  <option key={sec} value={sec.toLowerCase()}>{sec}</option>
                ))}
              </select>
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
                    <th className="p-4">publication</th>
                    <th className="p-4 text-center">screenshot</th>
                    <th className="p-4 text-center">actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-slate-700 dark:text-slate-350">
                  {allTrainingData
                    .filter(item => {
                      // 1. Search Query filter
                      const query = searchQuery.toLowerCase();
                      const matchesQuery = (
                        (item.headline || '').toLowerCase().includes(query) ||
                        (item.paperName || item.publication || '').toLowerCase().includes(query) ||
                        (item.reviewer_initials || item.addedBy || '').toLowerCase().includes(query) ||
                        (item.reviewer_reason || item.reason || '').toLowerCase().includes(query) ||
                        (item.sector || '').toLowerCase().includes(query)
                      );
                      if (!matchesQuery) return false;

                      // 2. Source Type filter
                      if (dbSourceTypeFilter !== "all") {
                        const type = item.sourceType || "epaper";
                        if (type !== dbSourceTypeFilter) return false;
                      }

                      // 3. Publication/Site filter
                      if (dbPublicationFilter !== "all") {
                        const pub = item.paperName || item.publication || "";
                        if (pub !== dbPublicationFilter) return false;
                      }

                      // 4. Collector filter
                      if (dbCollectorFilter !== "all") {
                        const col = item.reviewer_initials || item.addedBy || "";
                        if (col !== dbCollectorFilter) return false;
                      }

                      // 5. Sector filter
                      if (dbSectorFilter !== "all") {
                        const sec = (item.sector || "").toLowerCase();
                        if (!sec.includes(dbSectorFilter.toLowerCase())) return false;
                      }

                      return true;
                    })
                    .map((item, idx) => {
                      const globalIdx = allTrainingData.findIndex(x => x.id === item.id);
                      const displayId = `anexar_${allTrainingData.length - globalIdx}`;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-500 dark:text-slate-400">
                            {displayId}
                          </td>
                          <td className="p-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all max-w-[120px]" title={item.article_id || item.id}>
                            {item.article_id || item.id || "-"}
                          </td>
                          <td className="p-4 font-bold text-slate-900 dark:text-slate-100 break-words min-w-[200px]">
                            {item.headline}
                          </td>
                          <td className="p-4 text-center font-bold text-slate-900 dark:text-white">
                            {item.human_relevant !== undefined ? item.human_relevant : 1}
                          </td>
                          <td className="p-4 text-center font-semibold text-slate-500">
                            {item.human_age_bracket || "general"}
                          </td>
                          <td className="p-4 font-mono text-[11px] text-slate-550 dark:text-slate-400 shrink-0">
                            {item.reviewed_at || formatReviewedAt(item.createdAt)}
                          </td>
                          <td className="p-4 font-semibold text-slate-500">
                            {item.batch_id || "Anexar_batch"}
                          </td>
                          <td className="p-4 italic max-w-[200px] break-words text-slate-550">
                            {item.reviewer_reason || item.reason || "-"}
                          </td>
                          <td className="p-4 font-semibold text-slate-800 dark:text-white max-w-[120px] truncate" title={item.reviewer_initials || item.addedBy}>
                            {item.reviewer_initials || item.addedBy}
                          </td>
                          <td className="p-4 font-bold text-blue-500 dark:text-blue-450 uppercase text-[10px] tracking-wider">
                            {(item.sector || "-").toLowerCase()}
                          </td>
                          <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                            {item.paperName || item.publication || "-"}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center items-center">
                              {uploadingDocId === item.id ? (
                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : item.screenshotUrl ? (
                                <div className="flex items-center gap-1.5 justify-center">
                                  <a 
                                    href={item.screenshotUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-10 h-7 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 hover:border-blue-500 transition-all shadow-sm"
                                  >
                                    <img src={item.screenshotUrl} alt="ss" className="w-full h-full object-cover" />
                                  </a>
                                  <label className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-650 cursor-pointer transition-colors" title="Replace Screenshot">
                                    <Paperclip size={11} />
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => handleInlineUploadScreenshot(e, item.id)}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <label className="flex items-center justify-center w-10 h-7 rounded border border-dashed border-slate-350 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-slate-350 cursor-pointer transition-colors" title="Attach Screenshot">
                                  <Plus size={10} />
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => handleInlineUploadScreenshot(e, item.id)}
                                  />
                                </label>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteArticle(item.id)}
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="Delete Entry"
                            >
                              <Trash2 size={13} />
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
                setStableIframeUrl("");
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
                src={stableIframeUrl || undefined}
                className="w-full h-full border-none"
                title="ePaper PDF Reader"
              />
            </div>

            {/* Toggle Button for Sidebar */}
            {showTrainerFeatures && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute right-4 top-4 z-[10000] bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl border border-slate-700 flex items-center justify-center shadow-lg"
                title={sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
              >
                <Brain size={18} className={sidebarOpen ? "text-blue-400" : "text-slate-400"} />
              </button>
            )}

            {/* Right side: Trainer Sidebar */}
            {showTrainerFeatures && sidebarOpen && (
              <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 text-white flex flex-col h-full z-10 relative shrink-0">
                <div className="p-5 border-b border-slate-800 flex items-center gap-2">
                  <Brain className="text-blue-400 shrink-0" size={20} />
                  <div>
                    <h3 className="font-extrabold text-sm tracking-tight">Tattle Training Collector</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Collect relevant articles for model training</p>
                  </div>
                </div>


                {/* Scrollable Sidebar Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
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

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sectors (Select multiple)</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar">
                        {SECTORS.map(sec => {
                          const isChecked = sectors.includes(sec);
                          return (
                            <label 
                              key={sec} 
                              className={`flex items-center gap-2 text-xs p-1 rounded-lg cursor-pointer transition-colors select-none ${
                                isChecked 
                                  ? "text-blue-400 font-bold" 
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSectors([...sectors, sec]);
                                  } else {
                                    setSectors(sectors.filter(s => s !== sec));
                                  }
                                }}
                                className="rounded border-slate-800 text-blue-600 focus:ring-blue-500/50 bg-slate-900 w-3.5 h-3.5"
                              />
                              {sec}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Upload Screenshot (Optional)</label>
                      {screenshotPreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <img src={screenshotPreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-800" />
                            <span className="text-[11px] text-slate-350 truncate max-w-[150px] font-semibold">{screenshotFile?.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setScreenshotFile(null);
                              setScreenshotPreview(null);
                            }}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center border border-dashed border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/[0.02] rounded-xl p-4 cursor-pointer transition-all">
                          <Paperclip size={18} className="text-slate-500 mb-1" />
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Choose Image/Screenshot</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setScreenshotFile(file);
                                setScreenshotPreview(URL.createObjectURL(file));
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
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
                  <div className="p-5 space-y-4">
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
                              {(art.reviewer_reason || art.reason) && (
                                <p className="text-[10px] text-slate-400 italic break-words">Reason: {art.reviewer_reason || art.reason}</p>
                              )}
                              <p className="text-[9px] text-slate-500 font-extrabold tracking-wide uppercase mt-1">
                                Added by: {art.reviewer_initials || art.addedBy || 'Anonymous'}
                              </p>
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
