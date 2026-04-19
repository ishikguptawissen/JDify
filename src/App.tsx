import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  FileText, Scan, Send, Copy, RotateCcw, Download, 
  CheckCircle2, AlertCircle, Search, Hash, Star, Layout,
  Linkedin, Github, FileUp, Sparkles, ChevronDown, ChevronUp, Code,
  Upload, X, FileMinus, FilePlus, FileDigit, Paperclip, Share2, Info,
  Clock, History as HistoryIcon, Plus, Trash2, ExternalLink, Calendar, Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';
import ThemeToggle from './components/ThemeToggle';
import { JDResponse, HistoryItem, TabItem } from './types';

export default function App() {
  const [input, setInput] = useState('');
  const [reference, setReference] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTabPanel, setActiveTabPanel] = useState<'jd' | 'query' | 'json' | 'social'>('jd');
  const [inputFileName, setInputFileName] = useState<string | null>(null);
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null);
  
  // Voice Input State
  const [listeningTo, setListeningTo] = useState<'input' | 'reference' | null>(null);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);

  // History and Tab State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [tabs, setTabs] = useState<TabItem[]>([
    { id: 'initial', title: 'New JD', data: null }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('initial');
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Derived state: Active JD result based on active tab
  const activeTabData = tabs.find(t => t.id === activeTabId)?.data || null;
  const result = activeTabData;

  useEffect(() => {
    const savedHistory = localStorage.getItem('jdify_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('jdify_history', JSON.stringify(history));
  }, [history]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    responsibilities: true,
    skills: true,
    query: true
  });

  const [isDraggingInput, setIsDraggingInput] = useState(false);
  const [isDraggingReference, setIsDraggingReference] = useState(false);

  const inputFilesRef = useRef<HTMLInputElement>(null);
  const referenceFilesRef = useRef<HTMLInputElement>(null);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFileUpload = async (file: File, target: 'input' | 'reference') => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }

    setIsParsing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/parse-file', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        if (contentType && contentType.includes('application/json')) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to parse file');
        } else {
          const text = await response.text();
          throw new Error(`Server returned error ${response.status}: ${text.slice(0, 100)}...`);
        }
      }
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but received ${contentType || 'plain text'}. Response starts with: ${text.slice(0, 100)}...`);
      }

      const data = await response.json();
      if (target === 'input') {
        setInput(data.text);
        setInputFileName(file.name);
      } else {
        setReference(data.text);
        setReferenceFileName(file.name);
      }
    } catch (err: any) {
      setError(`Error parsing file: ${err.message}`);
    } finally {
      setIsParsing(false);
      if (inputFilesRef.current) inputFilesRef.current.value = '';
      if (referenceFilesRef.current) referenceFilesRef.current.value = '';
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'input' | 'reference') => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, target);
  };

  const onDrop = (e: React.DragEvent, target: 'input' | 'reference') => {
    e.preventDefault();
    if (target === 'input') setIsDraggingInput(false);
    else setIsDraggingReference(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file, target);
  };

  const onDragOver = (e: React.DragEvent, target: 'input' | 'reference') => {
    e.preventDefault();
    if (target === 'input') setIsDraggingInput(true);
    else setIsDraggingReference(true);
  };

  const onDragLeave = (e: React.DragEvent, target: 'input' | 'reference') => {
    e.preventDefault();
    if (target === 'input') setIsDraggingInput(false);
    else setIsDraggingReference(false);
  };

  const triggerUpload = (target: 'input' | 'reference') => {
    if (target === 'input') {
      inputFilesRef.current?.click();
    } else {
      referenceFilesRef.current?.click();
    }
  };

  const handleReset = () => {
    setInput('');
    setReference('');
    setInputFileName(null);
    setReferenceFileName(null);
    setTabs([{ id: 'initial', title: 'New JD', data: null }]);
    setActiveTabId('initial');
    setHistory([]);
    localStorage.removeItem('jdify_history');
    setIsHistoryOpen(false);
    setError(null);
    setActiveTabPanel('jd');
    if (inputFilesRef.current) inputFilesRef.current.value = '';
    if (referenceFilesRef.current) referenceFilesRef.current.value = '';
    setIsConfirmingReset(false);
  };

  const toggleListening = (target: 'input' | 'reference') => {
    if (listeningTo === target) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setListeningTo(null);
      setInterimText('');
      return;
    }

    if (listeningTo && listeningTo !== target) {
      if (recognitionRef.current) recognitionRef.current.stop();
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setListeningTo(target);
      setInterimText('');
    };

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        if (target === 'input') {
          setInput(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + final);
          if (inputFileName) setInputFileName(null);
        } else {
          setReference(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + final);
          if (referenceFileName) setReferenceFileName(null);
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
      }
      setListeningTo(null);
      setInterimText('');
    };

    recognition.onend = () => {
      // Avoid clearing if we manually stopped it, but it automatically fires. 
      // We'll just reset state.
      setListeningTo(null);
      setInterimText('');
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setError("Failed to start voice input. Please try again.");
    }
  };

  const getDisplayValue = (target: 'input' | 'reference') => {
    const base = target === 'input' ? input : reference;
    if (listeningTo === target && interimText) {
      return base + (base.endsWith(' ') || base === '' ? '' : ' ') + interimText;
    }
    return base;
  };

  const handleInputTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>, target: 'input' | 'reference') => {
    if (listeningTo === target) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setListeningTo(null);
      setInterimText('');
    }
    
    if (target === 'input') {
      setInput(e.target.value);
      if (inputFileName) setInputFileName(null);
    } else {
      setReference(e.target.value);
      if (referenceFileName) setReferenceFileName(null);
    }
  };

  const handleGenerate = async (isRefine: boolean = false) => {
    if (!input.trim() && !(isRefine && result)) return;

    setIsGenerating(true);
    setError(null);
    // Note: We don't clear result immediately to allow "Refine & Regenerate" feel
    
    const isWissen = input.toLowerCase().includes('wissen');
    const wissenAbout = `Wissen Technology is a product engineering company founded in 2015, focused on delivering niche, custom-built solutions to solve complex business challenges across industries worldwide. The company operates with a strong product engineering mindset, ensuring that every solution is architected and delivered right the first time.

With a global footprint of 2000+ employees across the US, UK, UAE, India, and Australia, Wissen Technology combines deep domain knowledge with cutting-edge technology expertise to deliver superior outcomes. The organization emphasizes faster time-to-market, reduced rework, and strong alignment with client objectives.

Wissen has a proven track record of building mission-critical systems across industries such as financial services, healthcare, retail, and manufacturing. Its delivery models include outcome-based projects for predictable costs and timelines, as well as agile pods that provide flexibility to adapt to evolving business needs.

Driven by top-tier talent and a commitment to excellence, Wissen Technology aims to be the partner of choice for building world-class custom products that deliver exceptional impact—the first time, every time.`;

    const inputContext = (isRefine && result)
      ? `Original Input:\n${input}\n\nCurrent JD to Refine:\n${JSON.stringify({
          job_title: result.job_title,
          role_summary: result.role_summary,
          responsibilities: result.responsibilities
        })}\n\nInstructions: Please refine the current job description. Improve the wording, make it more engaging and professional, and ensure clarity. You may add or remove details if it makes the JD stronger, but keep the core requirements.`
      : input;

    const prompt = `
      You are an expert technical recruiter and HR consultant. 
      Your task is to generate a comprehensive, high-quality, and publish-ready Job Description (JD) based on the provided hiring notes.
      
      ### HIRING NOTES:
      ${inputContext}
      
      ### REFERENCE JD (Optional context):
      ${reference || "None provided"}
      
      ### MANDATORY JD STRUCTURE & RULES:
      1. **Job Title**: Accurate and professional.
      2. **Experience Range**: Specific (e.g., "3-5 years").
      3. **Location & Work Mode**: Specific (e.g., "Remote", "Hybrid - New York", "On-site"). Inferred if not specified.
      4. **Role Summary**: 3-4 lines of engaging summary.
      5. **Key Responsibilities**: Exactly 6-8 detailed bullet points.
      6. **Required Skills**: Exactly 5-8 mandatory skills.
      7. **Preferred Skills**: 3-5 optional skills.
      8. **Qualifications**: Education and specific experience expectations.
      9. **Company/Team Context**: ${isWissen ? `The company is Wissen Technology. You MUST use this EXACT text for "company_overview" without any modification: "${wissenAbout}"` : "If missing in input, generate a realistic context for a product-driven company (startup or established) including team size and growth stage."}
      10. **Tech Stack**: Strictly derived from input/reference.
      11. **Soft Skills**: Communication, ownership, collaboration, etc.
      12. **Assumptions**: List exactly what you inferred because it was missing in the input (e.g., assumed agile workflow, assumed specific industry if vague). ${isWissen ? "Do NOT list the company overview as an assumption since it is fixed." : ""}
      
      ### HIRING BOOST (SOCIAL MEDIA):
      - **LinkedIn Post**: Engaging hook, role intro, highlights, and CTA.
      - **Short Version**: 2-3 lines for quick sharing.
      - **Hashtags**: Relevant industry and role hashtags.
      
      ### RECRUITER TOOLS:
      - **Boolean Search Query**: A high-quality boolean string for LinkedIn/Indeed.
      - **Search Keywords**: 10-15 relevant keywords.
      
      ### QUALITY CONTROL:
      - Ensure the output is detailed and "publish-ready".
      - Ensure all sections are present.
      - Score the JD from 1-10 and provide feedback.
      
      Return the response strictly as a JSON object matching this schema:
      {
        "job_title": string,
        "location": string,
        "work_mode": string,
        "experience": string,
        "role_summary": string,
        "responsibilities": string[],
        "required_skills": string[],
        "preferred_skills": string[],
        "qualifications": string[],
        "tech_stack": string[],
        "soft_skills": string[],
        "company_overview": string,
        "assumptions": string[],
        "social_media": {
          "linkedin_post": string,
          "short_version": string,
          "hashtags": string[]
        },
        "search_query_boolean": string,
        "search_keywords": string[],
        "quality_score": number,
        "quality_feedback": string[]
      }
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              job_title: { type: Type.STRING },
              location: { type: Type.STRING },
              work_mode: { type: Type.STRING },
              experience: { type: Type.STRING },
              role_summary: { type: Type.STRING },
              responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
              required_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              preferred_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              qualifications: { type: Type.ARRAY, items: { type: Type.STRING } },
              tech_stack: { type: Type.ARRAY, items: { type: Type.STRING } },
              soft_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              company_overview: { type: Type.STRING },
              assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
              social_media: {
                type: Type.OBJECT,
                properties: {
                  linkedin_post: { type: Type.STRING },
                  short_version: { type: Type.STRING },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["linkedin_post", "short_version", "hashtags"]
              },
              search_query_boolean: { type: Type.STRING },
              search_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              quality_score: { type: Type.NUMBER },
              quality_feedback: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: [
              "job_title", "location", "work_mode", "experience", "role_summary", 
              "responsibilities", "required_skills", "preferred_skills", "qualifications", 
              "tech_stack", "soft_skills", "company_overview", "assumptions", 
              "social_media", "search_query_boolean", "search_keywords", 
              "quality_score", "quality_feedback"
            ]
          }
        }
      });

      const data = JSON.parse(response.text || "{}") as JDResponse;
      
      if (isWissen) {
        data.company_overview = wissenAbout;
      }
      
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        data: data
      };
      
      setHistory(prev => [newHistoryItem, ...prev]);

      // Handle Tab Logic: If active tab is empty, use it. Else create new tab (limit 5)
      setTabs(prev => {
        const activeTab = prev.find(t => t.id === activeTabId);
        if (activeTab && activeTab.data === null) {
          return prev.map(t => t.id === activeTabId ? { ...t, title: data.job_title, data } : t);
        } else {
          // Create new tab if under limit, else reuse current
          if (prev.length < 5) {
            const newTabId = crypto.randomUUID();
            setActiveTabId(newTabId);
            return [...prev, { id: newTabId, title: data.job_title, data }];
          } else {
            return prev.map(t => t.id === activeTabId ? { ...t, title: data.job_title, data } : t);
          }
        }
      });
      
      setActiveTabPanel('jd');
    } catch (err: any) {
      setError(err.message || 'Something went wrong during generation. Please try again.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewTab = () => {
    if (tabs.length >= 5) {
      alert("Maximum 5 tabs reached. Please close one to open a new one.");
      return;
    }
    const newTabId = crypto.randomUUID();
    setTabs(prev => [...prev, { id: newTabId, title: 'New JD', data: null }]);
    setActiveTabId(newTabId);
    setInput('');
    setReference('');
    setInputFileName(null);
    setReferenceFileName(null);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      // If last tab, clear it instead of closing
      setTabs([{ id: 'initial', title: 'New JD', data: null }]);
      setActiveTabId('initial');
      return;
    }
    
    setTabs(prev => {
      const remaining = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
  };

  const handleSelectHistory = (item: HistoryItem) => {
    // Load into active tab
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, title: item.data.job_title, data: item.data } : t));
    setIsHistoryOpen(false);
  };

  const handleOpenHistoryInNewTab = (item: HistoryItem) => {
    if (tabs.length >= 5) {
      alert("Maximum 5 tabs reached.");
      return;
    }
    const newTabId = crypto.randomUUID();
    setTabs(prev => [...prev, { id: newTabId, title: item.data.job_title, data: item.data }]);
    setActiveTabId(newTabId);
    setIsHistoryOpen(false);
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCopyJSON = () => {
    if (!result) return;
    copyToClipboard(JSON.stringify(result, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyQuery = () => {
    if (!result) return;
    copyToClipboard(result.search_query_boolean);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopySocial = (type: 'linkedin' | 'short') => {
    if (!result) return;
    const text = type === 'linkedin' ? result.social_media.linkedin_post : result.social_media.short_version;
    copyToClipboard(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const text = `
${result.job_title}
Experience: ${result.experience} | Location: Remote

ROLE SUMMARY
${result.role_summary}

CORE RESPONSIBILITIES
${result.responsibilities.map(r => `• ${r}`).join('\n')}

REQUIRED SKILLS
${result.required_skills.join(', ')}

PREFERRED SKILLS
${result.preferred_skills.join(', ')}

QUALIFICATIONS
${result.qualifications.join('\n')}

SEARCH QUERY
${result.search_query_boolean}
    `.trim();
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JD_${result.job_title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyFull = () => {
    if (!result) return;
    
    const text = `
${result.job_title}
Experience: ${result.experience} | Location: Remote

ROLE SUMMARY
${result.role_summary}

CORE RESPONSIBILITIES
${result.responsibilities.map(r => `• ${r}`).join('\n')}

KEYWORDS: ${result.search_keywords.join(', ')}

BOOLEAN SEARCH QUERY:
${result.search_query_boolean}
    `.trim();
    
    copyToClipboard(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-gray-200 dark:border-border-theme bg-white dark:bg-bg-main">
        <div className="max-w-[1920px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight dark:text-text-primary">
                JD<span className="text-accent">ify</span>
              </h1>
            </div>
            <p className="text-[12px] text-gray-500 dark:text-text-secondary mt-0.5">From messy hiring notes to polished Job Descriptions.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2.5 rounded-xl text-gray-400 hover:text-accent hover:bg-accent/5 transition-all relative group"
              title="Generation History"
            >
              <Clock className="w-5 h-5" />
              {history.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-white dark:border-bg-main" />
              )}
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-border-theme" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row max-w-[1920px] mx-auto w-full overflow-hidden">
        {/* Left Section: Inputs */}
        <section className="w-full md:w-[440px] border-r border-gray-200 dark:border-border-theme p-8 overflow-y-auto bg-gray-50/50 dark:bg-[#0d0d10] shrink-0">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-text-secondary block">
                    Job Notes / Transcription
                  </label>
                </div>

                {/* Unified Compact Input Container */}
                <div 
                  onDrop={(e) => onDrop(e, 'input')}
                  onDragOver={(e) => onDragOver(e, 'input')}
                  onDragLeave={(e) => onDragLeave(e, 'input')}
                  className={`
                    group flex flex-col rounded-xl border transition-all duration-300 bg-white dark:bg-bg-input shadow-sm overflow-hidden min-h-[180px]
                    ${isDraggingInput 
                      ? 'border-accent ring-2 ring-accent/20 scale-[1.01]' 
                      : 'border-gray-200 dark:border-border-theme focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'}
                  `}
                >
                  {/* Top Bar for Actions & Tags */}
                  <div className="w-full p-2.5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-border-theme/50">
                    <div className="flex items-center gap-2">
                      <AnimatePresence>
                        {inputFileName ? (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold"
                          >
                            <FileText className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{inputFileName}</span>
                            <button 
                              onClick={() => {
                                setInputFileName(null);
                                setInput('');
                              }}
                              className="p-0.5 hover:bg-accent/20 rounded transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ) : !input && (
                          <motion.span 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-[10px] text-gray-400 dark:text-text-secondary font-medium px-2 py-1 flex items-center gap-1.5 italic"
                          >
                            <Paperclip className="w-3 h-3" />
                            Drop file or paste notes
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleListening('input')}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${listeningTo === 'input' ? 'text-red-500 bg-red-50 dark:bg-red-500/10 animate-pulse' : 'text-gray-400 hover:text-accent hover:bg-accent/5'}`}
                        title={listeningTo === 'input' ? "Stop listening" : "Start voice input"}
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => triggerUpload('input')}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-accent hover:bg-accent/5 transition-all"
                        title="Upload file"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="file"
                        ref={inputFilesRef}
                        onChange={(e) => onFileChange(e, 'input')}
                        className="hidden"
                        accept=".pdf,.docx,.txt"
                      />
                    </div>
                  </div>

                  <textarea
                    value={getDisplayValue('input')}
                    onChange={(e) => handleInputTextChange(e, 'input')}
                    placeholder={listeningTo === 'input' ? "Listening..." : "E.g. We are looking for a Senior Frontend Developer with 5+ years of React experience. Must know Tailwind..."}
                    className="flex-1 w-full p-4 text-sm outline-none transition-all resize-none bg-transparent dark:text-text-primary placeholder:text-gray-400 dark:placeholder:text-text-secondary custom-scrollbar min-h-[140px]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-text-secondary block">
                      Reference JD (Optional)
                    </label>
                  </div>
                  
                  {/* Unified Compact Input Container */}
                  <div 
                    onDrop={(e) => onDrop(e, 'reference')}
                    onDragOver={(e) => onDragOver(e, 'reference')}
                    onDragLeave={(e) => onDragLeave(e, 'reference')}
                    className={`
                      group flex flex-col rounded-xl border transition-all duration-300 bg-white dark:bg-bg-input shadow-sm overflow-hidden min-h-[140px]
                      ${isDraggingReference 
                        ? 'border-accent ring-2 ring-accent/20 scale-[1.01]' 
                        : 'border-gray-200 dark:border-border-theme focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'}
                    `}
                  >
                    {/* Top Bar for Actions & Tags */}
                    <div className="w-full p-2.5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-border-theme/50">
                      <div className="flex items-center gap-2">
                        <AnimatePresence>
                          {referenceFileName ? (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold"
                            >
                              <FileText className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{referenceFileName}</span>
                              <button 
                                onClick={() => {
                                  setReferenceFileName(null);
                                  setReference('');
                                }}
                                className="p-0.5 hover:bg-accent/20 rounded transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </motion.div>
                          ) : !reference && (
                            <motion.span 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-[10px] text-gray-400 dark:text-text-secondary font-medium px-2 py-1 flex items-center gap-1.5 italic"
                            >
                              <Paperclip className="w-3 h-3" />
                              Optional comparison JD
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleListening('reference')}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${listeningTo === 'reference' ? 'text-red-500 bg-red-50 dark:bg-red-500/10 animate-pulse' : 'text-gray-400 hover:text-accent hover:bg-accent/5'}`}
                          title={listeningTo === 'reference' ? "Stop listening" : "Start voice input"}
                        >
                          <Mic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => triggerUpload('reference')}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-accent hover:bg-accent/5 transition-all"
                          title="Upload file"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="file"
                          ref={referenceFilesRef}
                          onChange={(e) => onFileChange(e, 'reference')}
                          className="hidden"
                          accept=".pdf,.docx,.txt"
                        />
                      </div>
                    </div>

                    <textarea
                      value={getDisplayValue('reference')}
                      onChange={(e) => handleInputTextChange(e, 'reference')}
                      placeholder={listeningTo === 'reference' ? "Listening..." : "Paste a reference job description to help the AI match the style..."}
                      className="flex-1 w-full p-4 text-sm outline-none transition-all resize-none bg-transparent dark:text-text-primary placeholder:text-gray-400 dark:placeholder:text-text-secondary custom-scrollbar min-h-[100px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 flex items-start gap-3 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleGenerate(false)}
                disabled={isGenerating || !input.trim()}
                className="w-full py-4 rounded-lg bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all flex items-center justify-center gap-2 group shadow-xl shadow-accent/20"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Job Description</span>
                  </>
                )}
              </button>

              {isConfirmingReset ? (
                <div className="flex items-center gap-2 w-full">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold transition-all hover:bg-red-100 dark:hover:bg-red-900/40"
                  >
                    Yes, Reset
                  </button>
                  <button
                    onClick={() => setIsConfirmingReset(false)}
                    className="flex-1 py-3 rounded-lg border border-gray-200 dark:border-border-theme text-gray-500 dark:text-text-secondary hover:bg-gray-50 dark:hover:bg-bg-input text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingReset(true)}
                  className="w-full py-3 rounded-lg border border-gray-200 dark:border-border-theme text-gray-500 dark:text-text-secondary hover:bg-gray-50 dark:hover:bg-bg-input text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All Inputs</span>
                </button>
              )}
            </div>
          </div>
        </section>
        <section className="w-full md:flex-1 flex flex-col bg-white dark:bg-bg-main overflow-hidden relative">
          {/* Tab Bar */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-border-theme/50 px-6 bg-gray-50/30 dark:bg-black/10 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pt-2 pr-4 no-scrollbar">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  role="button"
                  tabIndex={0}
                  className={`
                    cursor-pointer group relative px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-x border-t
                    ${activeTabId === tab.id 
                      ? 'bg-white dark:bg-bg-main text-accent border-gray-100 dark:border-border-theme shadow-[0_-2px_10px_-4px_rgba(0,0,0,0.05)]' 
                      : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-200'}
                  `}
                >
                  <span className="truncate max-w-[100px]">{tab.title}</span>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 rounded-md hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Close tab"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                  {activeTabId === tab.id && (
                    <motion.div 
                      layoutId="activeTabUnderline"
                      className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-accent z-10" 
                    />
                  )}
                </div>
              ))}
              
              {tabs.length < 5 && (
                <button
                  onClick={handleNewTab}
                  className="p-2 ml-1 text-gray-400 hover:text-accent hover:bg-accent/5 rounded-lg transition-all"
                  title="New Generation"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pl-4 py-1">
              <button
                onClick={() => handleGenerate(true)}
                disabled={!result || isGenerating}
                className="px-3 py-1.5 rounded-lg border border-accent/20 bg-accent/5 text-accent text-xs font-bold hover:bg-accent/10 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed group"
                title="Improve JD"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Refine</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar scroll-smooth">
          <div className="max-w-4xl mx-auto w-full">
            <AnimatePresence mode="wait">
              {!result && !isGenerating && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-[60vh] flex flex-col items-center justify-center text-center"
                >
                  <div className="w-20 h-20 bg-gray-50 dark:bg-bg-card border dark:border-border-theme rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                    <Layout className="w-8 h-8 text-gray-300 dark:text-gray-700" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Editor Template</h3>
                  <p className="text-gray-500 dark:text-text-secondary text-sm max-w-xs">Your generated Job Description will appear here formatted for perfection.</p>
                </motion.div>
              )}

              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="flex gap-6 items-center">
                    <div className="h-24 w-24 bg-gray-100 dark:bg-bg-card animate-pulse rounded-xl" />
                    <div className="flex-1 space-y-3">
                       <div className="h-6 w-1/3 bg-gray-100 dark:bg-bg-card animate-pulse rounded-md" />
                       <div className="h-4 w-full bg-gray-100 dark:bg-bg-card animate-pulse rounded-md" />
                    </div>
                  </div>
                  <div className="h-[400px] bg-gray-100 dark:bg-bg-card animate-pulse rounded-2xl" />
                </motion.div>
              )}

              {result && (
                <div className="space-y-6">
                  {/* Tabs Header */}
                  <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-bg-input rounded-xl border dark:border-border-theme w-fit">
                    <button 
                      onClick={() => setActiveTabPanel('jd')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTabPanel === 'jd' ? 'bg-white dark:bg-bg-card text-accent shadow-sm' : 'text-gray-500 dark:text-text-secondary hover:text-gray-700'}`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Job Description</span>
                    </button>
                    <button 
                      onClick={() => setActiveTabPanel('query')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTabPanel === 'query' ? 'bg-white dark:bg-bg-card text-accent shadow-sm' : 'text-gray-500 dark:text-text-secondary hover:text-gray-700'}`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Search Query</span>
                    </button>
                    <button 
                      onClick={() => setActiveTabPanel('json')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTabPanel === 'json' ? 'bg-white dark:bg-bg-card text-accent shadow-sm' : 'text-gray-500 dark:text-text-secondary hover:text-gray-700'}`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>Raw JSON</span>
                    </button>
                    <button 
                      onClick={() => setActiveTabPanel('social')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTabPanel === 'social' ? 'bg-white dark:bg-bg-card text-accent shadow-sm' : 'text-gray-500 dark:text-text-secondary hover:text-gray-700'}`}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="flex items-center gap-1.5">
                        Social Boost
                        <span className="px-1 py-0.5 rounded-md bg-accent/10 text-[8px] uppercase tracking-wider">New</span>
                      </span>
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTabPanel === 'jd' && (
                      <motion.div
                        key="jd-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                      >
                        {/* Stats Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-white dark:bg-bg-card border border-gray-200 dark:border-border-theme rounded-xl p-4 flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-xl border border-green-500/20">
                              {result.quality_score}
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-gray-400 dark:text-text-secondary uppercase tracking-widest">Quality Score</div>
                              <div className="text-xs font-medium dark:text-text-primary">Excellent alignment with notes</div>
                            </div>
                          </div>
                          <div className="bg-white dark:bg-bg-card border border-gray-200 dark:border-border-theme rounded-xl p-4 flex items-center gap-4 shadow-sm font-medium">
                            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
                              <Star className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-gray-400 dark:text-text-secondary uppercase tracking-widest">Experience Level</div>
                              <div className="text-xs font-medium dark:text-text-primary">{result.experience}</div>
                            </div>
                          </div>
                        </div>

                        {/* JD Container */}
                        <div className="bg-white dark:bg-bg-card border border-gray-200 dark:border-border-theme rounded-xl flex flex-col min-h-[500px] shadow-xl relative overflow-hidden">
                          <div className="p-8 border-b border-gray-100 dark:border-border-theme bg-gray-50/30 dark:bg-white/[0.01] flex justify-between items-start">
                            <div>
                              <h2 className="text-2xl font-bold dark:text-text-primary mb-1">{result.job_title}</h2>
                              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-text-secondary font-medium uppercase tracking-tight">
                                <span>{result.experience}</span>
                                <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                                <span>{result.work_mode} • {result.location}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={handleDownload}
                                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-border-theme text-gray-700 dark:text-text-primary text-xs font-bold hover:bg-gray-50 dark:hover:bg-bg-input transition-all flex items-center justify-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                              </button>
                              <button 
                                onClick={handleCopyFull}
                                className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold ${
                                  isCopied 
                                  ? "border-green-200 bg-green-50 text-green-600" 
                                  : "bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20"
                                }`}
                              >
                                {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="p-8 space-y-8">
                            {/* Summary */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-text-secondary">Role Summary</h4>
                              <p className="text-sm leading-relaxed dark:text-text-primary opacity-90">{result.role_summary}</p>
                            </div>

                            {/* Responsibilities */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-text-secondary">Core Responsibilities</h4>
                              <ul className="space-y-3 text-sm dark:text-text-primary opacity-90">
                                {result.responsibilities.map((item, i) => (
                                  <li key={i} className="flex items-start gap-4">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent/40 mt-1.5 shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Qualifications */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-text-secondary">Qualifications & Experience</h4>
                              <ul className="space-y-3 text-sm dark:text-text-primary opacity-90">
                                {result.qualifications.map((item, i) => (
                                  <li key={i} className="flex items-start gap-4">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                               {/* Tech Stack */}
                               <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-text-secondary">Expected Tech Stack</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {result.tech_stack.map((ts, i) => (
                                    <span key={i} className="px-2.5 py-1 bg-accent/5 border border-accent/10 rounded-md text-[11px] font-bold text-accent">
                                      {ts}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Soft Skills */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-text-secondary">Soft Skills & Values</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {result.soft_skills.map((ss, i) => (
                                    <span key={i} className="px-2.5 py-1 bg-gray-50 dark:bg-bg-input border dark:border-border-theme rounded-md text-[11px] font-semibold dark:text-text-secondary">
                                      {ss}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Company Overview */}
                            <div className="space-y-3 pt-4 p-6 bg-gray-50/50 dark:bg-white/[0.01] rounded-2xl border dark:border-border-theme">
                              <div className="flex items-center gap-2 mb-1">
                                <Star className="w-3.5 h-3.5 text-accent" />
                                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-text-secondary">Company & Team Context</h4>
                              </div>
                              <p className="text-sm leading-relaxed dark:text-text-primary opacity-80">{result.company_overview}</p>
                            </div>

                            {/* Assumptions */}
                            <div className="space-y-3 pt-6 border-t dark:border-border-theme">
                              <div className="flex items-center gap-2">
                                <Info className="w-3.5 h-3.5 text-blue-500" />
                                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-text-secondary">Inferred Assumptions</h4>
                              </div>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-[11px] text-gray-500 dark:text-text-secondary italic">
                                {result.assumptions.map((ash, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                                    {ash}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTabPanel === 'social' && (
                      <motion.div
                        key="social-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           {/* LinkedIn Post Card */}
                           <div className="bg-white dark:bg-bg-card border border-gray-200 dark:border-border-theme rounded-2xl shadow-xl overflow-hidden flex flex-col">
                              <div className="p-6 border-b dark:border-border-theme flex items-center justify-between bg-blue-50/50 dark:bg-blue-900/10">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                    <Linkedin className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-bold">LinkedIn Job Post</h3>
                                    <p className="text-[10px] text-gray-500">Optimized for engagement</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleCopySocial('linkedin')}
                                  className={`p-2.5 rounded-lg border transition-all ${
                                    isCopied ? "bg-green-50 text-green-600 border-green-200" : "bg-white dark:bg-bg-input text-gray-500 hover:text-accent dark:border-border-theme"
                                  }`}
                                  title="Copy Post"
                                >
                                  {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                              </div>
                              <div className="p-6 flex-1 bg-white/[0.02]">
                                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed dark:text-text-primary opacity-90">
                                  {result.social_media.linkedin_post}
                                </pre>
                              </div>
                           </div>

                           <div className="space-y-6">
                              {/* Short Version */}
                              <div className="bg-white dark:bg-bg-card border border-gray-200 dark:border-border-theme rounded-2xl p-6 shadow-lg">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <Send className="w-4 h-4 text-accent" />
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider">Short Version</h4>
                                  </div>
                                  <button 
                                    onClick={() => handleCopySocial('short')}
                                    className="text-gray-400 hover:text-accent transition-colors"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                                <p className="text-sm dark:text-text-primary opacity-90 italic">"{result.social_media.short_version}"</p>
                              </div>

                              {/* Hashtags */}
                              <div className="bg-white dark:bg-bg-card border border-gray-200 dark:border-border-theme rounded-2xl p-6 shadow-lg">
                                <div className="flex items-center gap-2 mb-4">
                                  <Hash className="w-4 h-4 text-orange-500" />
                                  <h4 className="text-xs font-extrabold uppercase tracking-wider">Recommended Hashtags</h4>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {result.social_media.hashtags.map((tag, i) => (
                                    <span key={i} className="text-xs font-bold text-accent px-2 py-1 bg-accent/5 rounded-md hover:bg-accent/10 transition-colors cursor-pointer">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Viral Tip */}
                              <div className="p-6 bg-gradient-to-br from-accent/5 to-transparent rounded-2xl border border-accent/10">
                                 <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                                      <Sparkles className="w-4 h-4 text-accent" />
                                    </div>
                                    <h4 className="text-xs font-bold uppercase text-accent tracking-widest">Hiring Boost Tip</h4>
                                 </div>
                                 <p className="text-[11px] leading-relaxed text-gray-500 dark:text-text-secondary">
                                   To increase visibility, attach a team photo alongside this LinkedIn post. Posts with authentic team visuals receive up to 3x more engagement within candidate pools.
                                 </p>
                              </div>
                           </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTabPanel === 'query' && (
                      <motion.div
                        key="query-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                        <div className="bg-white dark:bg-bg-card border border-gray-200 dark:border-border-theme rounded-xl p-8 shadow-xl">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                <Search className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold">Boolean Search Query</h3>
                                <p className="text-xs text-gray-500 dark:text-text-secondary">Optimized for LinkedIn and X-Ray search</p>
                              </div>
                            </div>
                            <button 
                              onClick={handleCopyQuery}
                              className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold ${
                                isCopied 
                                ? "border-green-200 bg-green-50 text-green-600" 
                                : "bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20"
                              }`}
                            >
                              {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              <span>{isCopied ? 'Copied!' : 'Copy Query'}</span>
                            </button>
                          </div>
                          
                          <div className="p-6 bg-gray-50 dark:bg-bg-input rounded-xl border-l-[4px] border-accent font-mono text-sm leading-relaxed dark:text-text-primary break-words">
                            {result.search_query_boolean}
                          </div>

                          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-gray-50 dark:bg-bg-input border dark:border-border-theme">
                              <h5 className="text-[10px] font-extrabold uppercase text-gray-400 mb-2">Targeted Keywords</h5>
                              <div className="flex flex-wrap gap-1.5">
                                {result.search_keywords.slice(0, 10).map((k, i) => (
                                  <span key={i} className="text-[10px] bg-white dark:bg-bg-card px-2 py-0.5 rounded border dark:border-border-theme">
                                    {k}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="p-4 rounded-lg bg-gray-50 dark:bg-bg-input border dark:border-border-theme">
                              <h5 className="text-[10px] font-extrabold uppercase text-gray-400 mb-2">Search Pro-Tip</h5>
                              <p className="text-[10px] leading-relaxed text-gray-500">Paste this query into LinkedIn Recruiter's "Keywords" field to find candidates matching these specific seniority and skill variations.</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTabPanel === 'json' && (
                      <motion.div
                        key="json-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                         <div className="bg-white dark:bg-bg-card border border-gray-200 dark:border-border-theme rounded-xl shadow-xl overflow-hidden">
                          <div className="flex items-center justify-between p-6 border-b dark:border-border-theme">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-bg-input flex items-center justify-center text-gray-500">
                                <Code className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold">Raw JSON Output</h3>
                                <p className="text-xs text-gray-500 dark:text-text-secondary">Developer-friendly structured response</p>
                              </div>
                            </div>
                            <button 
                              onClick={handleCopyJSON}
                              className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold ${
                                isCopied 
                                ? "border-green-200 bg-green-50 text-green-600" 
                                : "bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20"
                              }`}
                            >
                              {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              <span>{isCopied ? 'Copied!' : 'Copy JSON'}</span>
                            </button>
                          </div>
                          <div className="p-0 overflow-hidden">
                            <pre className="p-8 bg-[#0d0d10] text-blue-400 font-mono text-xs overflow-x-auto h-[500px] leading-relaxed">
                              {JSON.stringify(result, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
      </main>

      {/* History Drawer */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[400px] bg-white dark:bg-bg-main shadow-2xl z-[101] border-l border-gray-200 dark:border-border-theme flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 dark:border-border-theme flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <HistoryIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold dark:text-text-primary">Generation History</h2>
                    <p className="text-[10px] text-gray-400 dark:text-text-secondary uppercase tracking-widest font-bold">Past {history.length} Generations</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-bg-input transition-all"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <HistoryIcon className="w-12 h-12 text-gray-200 dark:text-gray-800 mb-4" />
                    <p className="text-gray-400 text-sm">No history yet. Start generating Job Descriptions to see them here.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.id}
                      className="group p-4 rounded-xl border border-gray-100 dark:border-border-theme/50 hover:border-accent/30 hover:bg-accent/[0.02] dark:hover:bg-accent/[0.01] transition-all cursor-pointer relative"
                      onClick={() => handleSelectHistory(item)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-bold dark:text-text-primary pr-8 truncate">{item.data.job_title}</h3>
                        <button 
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                          className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all absolute top-3 right-3"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <p className="text-[11px] text-gray-500 dark:text-text-secondary line-clamp-2 mb-3 leading-relaxed">
                        {item.data.role_summary}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-text-secondary font-medium">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenHistoryInNewTab(item);
                          }}
                          className="p-1.5 rounded-md hover:bg-accent/10 text-accent opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-[10px] font-bold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>New Tab</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
