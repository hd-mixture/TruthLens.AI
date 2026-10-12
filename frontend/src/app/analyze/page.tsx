'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Image as ImageIcon,
  Clipboard,
  FileCheck,
  Globe,
  UploadCloud,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  Key,
  HelpCircle,
  Zap,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import {
  analyzeText,
  analyzeImage,
  analyzePdf,
  analyzeUrl,
  extractOcrOnly
} from '@/lib/api';

type TabType = 'text' | 'image' | 'pdf' | 'url';

export default function AnalyzePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('text');

  // Input states
  const [textInput, setTextInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isClipboardImage, setIsClipboardImage] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // OCR preview state
  const [ocrPreviewText, setOcrPreviewText] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);
  const [isOcrExtracting, setIsOcrExtracting] = useState(false);

  // Processing & Error states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Form Reset Function
  const handleResetForm = () => {
    setTextInput('');
    setTitleInput('');
    setUrlInput('');
    setSelectedFile(null);
    setFilePreview(null);
    setIsClipboardImage(false);
    setOcrPreviewText(null);
    setOcrConfidence(null);
    setOcrWarning(null);
    setErrorMessage(null);
    setIsAnalyzing(false);
    setAnalysisPhase('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  // Ensure loading state is never stuck on mount, unmount, or browser back/forward navigation
  useEffect(() => {
    setIsAnalyzing(false);
    setAnalysisPhase('');

    // If navigated via "Verify Another" or back link with ?reset=true, reset the form completely
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reset') === 'true' || params.get('new') === 'true') {
        handleResetForm();
      }
    }

    const handleBackNavigation = () => {
      setIsAnalyzing(false);
      setAnalysisPhase('');
    };

    window.addEventListener('pageshow', handleBackNavigation);
    window.addEventListener('popstate', handleBackNavigation);

    return () => {
      setIsAnalyzing(false);
      setAnalysisPhase('');
      window.removeEventListener('pageshow', handleBackNavigation);
      window.removeEventListener('popstate', handleBackNavigation);
    };
  }, []);

  // Load saved API key from localStorage if available
  useEffect(() => {
    const savedKey = localStorage.getItem('truthlens_gemini_key');
    if (savedKey) setApiKeyInput(savedKey);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKeyInput(key);
    localStorage.setItem('truthlens_gemini_key', key);
    setShowApiKeyModal(false);
  };

  // Clipboard Paste (Ctrl+V) Global Handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing in a text field unless they are on image tab
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            if (blob) {
              const file = new File([blob], `clipboard_${Date.now()}.png`, { type: blob.type });
              handleImageSelection(file, true);
              setActiveTab('image');
              return;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleImageSelection = (file: File, fromClipboard = false) => {
    // Validate image type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please upload a valid image (JPG, PNG, or WEBP).');
      return;
    }

    // Size limit 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image file exceeds the 10MB limit.');
      return;
    }

    setSelectedFile(file);
    setIsClipboardImage(fromClipboard);
    setErrorMessage(null);
    setOcrPreviewText(null);
    setOcrConfidence(null);
    setOcrWarning(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setFilePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePdfSelection = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setErrorMessage('Please upload a valid PDF document (.pdf).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('PDF document exceeds the 10MB limit.');
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (activeTab === 'image') {
        handleImageSelection(file);
      } else if (activeTab === 'pdf') {
        handlePdfSelection(file);
      }
    }
  };

  // Preview OCR extraction
  const handleExtractOcrPreview = async () => {
    if (!selectedFile) return;
    setIsOcrExtracting(true);
    setErrorMessage(null);

    try {
      const res = await extractOcrOnly(selectedFile);
      setOcrPreviewText(res.text);
      setOcrConfidence(res.confidence);
      setOcrWarning(res.warning || null);
    } catch (err: any) {
      setErrorMessage(err.message || 'OCR extraction failed.');
    } finally {
      setIsOcrExtracting(false);
    }
  };

  // Preloaded benchmark samples
  const loadSample = (type: 'fake' | 'real') => {
    if (type === 'fake') {
      setTextInput(
        'SHOCKING: Drinking boiled lemon juice with baking soda completely eliminates all cancer cells overnight, but Big Pharma is desperately hiding the secret cure! SHARE BEFORE IT IS DELETED!'
      );
      setTitleInput('Miracle Lemon Cancer Cure Hoax');
    } else {
      setTextInput(
        'The Federal Reserve announced an interest rate adjustment following its two-day Federal Open Market Committee meeting, citing stabilizing inflation figures across regional banking sectors.'
      );
      setTitleInput('Federal Reserve Official Monetary Policy');
    }
    setErrorMessage(null);
  };

  // Main Submit Analysis Handler
  const handleAnalyze = async () => {
    setErrorMessage(null);
    setIsAnalyzing(true);
    setAnalysisPhase('Validating news claim content...');

    try {
      let result;

      if (activeTab === 'text') {
        if (!textInput.trim() || textInput.trim().length < 15) {
          throw new Error('Please enter at least 15 characters of news text.');
        }
        setAnalysisPhase('Cross-referencing live news feeds & claim databases...');
        result = await analyzeText(textInput, titleInput || undefined, apiKeyInput || undefined);
      } else if (activeTab === 'image') {
        if (!selectedFile) {
          throw new Error('Please upload an image, drop a screenshot, or press Ctrl+V.');
        }
        setAnalysisPhase('Reading text from screenshot image...');
        result = await analyzeImage(
          selectedFile,
          isClipboardImage ? 'clipboard' : 'image',
          selectedFile.name,
          apiKeyInput || undefined
        );
      } else if (activeTab === 'pdf') {
        if (!selectedFile) {
          throw new Error('Please select a PDF document to upload.');
        }
        setAnalysisPhase('Extracting text from PDF document...');
        result = await analyzePdf(selectedFile, apiKeyInput || undefined);
      } else if (activeTab === 'url') {
        if (!urlInput.trim()) {
          throw new Error('Please enter a valid article URL.');
        }
        setAnalysisPhase('Retrieving article content from URL...');
        result = await analyzeUrl(urlInput, apiKeyInput || undefined);
      }

      setAnalysisPhase('Synthesizing evidence & publisher citations...');

      if (result) {
        // Store in sessionStorage and navigate to /results with unique record ID
        sessionStorage.setItem('truthlens_active_result', JSON.stringify(result));
        
        // Reset analyzing state so that if user navigates back, it is never stuck in loading
        setIsAnalyzing(false);
        setAnalysisPhase('');

        router.push(`/results?id=${result.id}`);
      }
    } catch (err: any) {
      const msg = err.message || 'Analysis encountered an error.';
      setIsAnalyzing(false);
      setAnalysisPhase('');
      // Check if the error indicates Gemini quota/rate limit exhaustion
      const isQuota = /quota|429|resource_exhausted|rate limit/i.test(msg);
      if (isQuota) {
        setErrorMessage('Server AI quota limit reached. Please enter a Gemini API key below to continue.');
        setShowApiKeyModal(true);
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisPhase('');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-widest font-bold text-cyan-600 dark:text-cyan-400">
              Live Verification Studio
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Verify Any News Claim
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Check headlines, screenshot forwards (Ctrl+V), documents, or article URLs against verified global news sources.
          </p>
        </div>

        {/* Active Key indicator (only shown if a custom key has been entered) */}
        {apiKeyInput && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowApiKeyModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 transition hover:bg-cyan-500/20"
            >
              <Key className="h-3 w-3" />
              <span>Personal Key Active</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            setActiveTab('text');
            setErrorMessage(null);
          }}
          style={activeTab === 'text' ? { color: '#ffffff' } : undefined}
          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs font-semibold transition ${
            activeTab === 'text'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 !text-white font-bold shadow-md shadow-cyan-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <FileText className={`h-4 w-4 ${activeTab === 'text' ? 'text-white' : ''}`} />
          <span style={activeTab === 'text' ? { color: '#ffffff' } : undefined} className={activeTab === 'text' ? '!text-white font-bold' : ''}>Type / Paste Text</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('image');
            setErrorMessage(null);
          }}
          style={activeTab === 'image' ? { color: '#ffffff' } : undefined}
          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs font-semibold transition ${
            activeTab === 'image'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 !text-white font-bold shadow-md shadow-cyan-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <ImageIcon className={`h-4 w-4 ${activeTab === 'image' ? 'text-white' : ''}`} />
          <span style={activeTab === 'image' ? { color: '#ffffff' } : undefined} className={activeTab === 'image' ? '!text-white font-bold' : ''}>Image / Screenshot</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('pdf');
            setErrorMessage(null);
          }}
          style={activeTab === 'pdf' ? { color: '#ffffff' } : undefined}
          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs font-semibold transition ${
            activeTab === 'pdf'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 !text-white font-bold shadow-md shadow-cyan-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <FileCheck className={`h-4 w-4 ${activeTab === 'pdf' ? 'text-white' : ''}`} />
          <span style={activeTab === 'pdf' ? { color: '#ffffff' } : undefined} className={activeTab === 'pdf' ? '!text-white font-bold' : ''}>PDF Document</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('url');
            setErrorMessage(null);
          }}
          style={activeTab === 'url' ? { color: '#ffffff' } : undefined}
          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs font-semibold transition ${
            activeTab === 'url'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 !text-white font-bold shadow-md shadow-cyan-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <Globe className={`h-4 w-4 ${activeTab === 'url' ? 'text-white' : ''}`} />
          <span style={activeTab === 'url' ? { color: '#ffffff' } : undefined} className={activeTab === 'url' ? '!text-white font-bold' : ''}>Article URL</span>
        </button>
      </div>

      {/* Main Analysis Card Container */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-300 flex items-start space-x-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Error:</span> {errorMessage}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* TAB 1: TEXT INPUT */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                News Text or Headline
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Load Demo:</span>
                <button
                  type="button"
                  onClick={() => loadSample('real')}
                  className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                >
                  Real News
                </button>
                <button
                  type="button"
                  onClick={() => loadSample('fake')}
                  className="text-[11px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20"
                >
                  Viral Fake News
                </button>
              </div>
            </div>

            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Optional: Enter article headline or title..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 px-4 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            />

            <div className="relative">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={8}
                placeholder="Paste or type the full news content, WhatsApp forward, social media post, or statement here (minimum 15 characters)..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 p-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-y transition"
              />
              <div className="absolute bottom-3 right-3 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                {textInput.split(/\s+/).filter(Boolean).length} words &bull; {textInput.length} chars
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: IMAGE / SCREENSHOT / CLIPBOARD */}
        {activeTab === 'image' && (
          <div className="space-y-6">
            {/* Clipboard Banner */}
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3.5 flex items-center justify-between text-xs text-cyan-800 dark:text-cyan-300">
              <div className="flex items-center space-x-2">
                <Clipboard className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>
                  <strong>Clipboard Detection Enabled:</strong> Take a screenshot using{' '}
                  <code className="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-900 dark:text-white font-mono">Win + Shift + S</code>{' '}
                  or Print Screen, then press{' '}
                  <code className="bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-900 dark:text-white font-mono">Ctrl + V</code>{' '}
                  anywhere to paste directly!
                </span>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : selectedFile
                  ? 'border-emerald-500/50 bg-slate-100/70 dark:bg-slate-950/60'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/40 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageSelection(e.target.files[0]);
                  }
                }}
              />

              {filePreview ? (
                <div className="space-y-4">
                  <div className="relative inline-block max-w-sm rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-2xl">
                    <img
                      src={filePreview}
                      alt="Uploaded screenshot preview"
                      className="max-h-64 object-contain mx-auto"
                    />
                    {isClipboardImage && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-cyan-600 dark:bg-cyan-500 text-white text-[10px] font-bold shadow-sm">
                        Pasted from Clipboard (Ctrl+V)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <strong>{selectedFile?.name}</strong> &bull;{' '}
                    {selectedFile && (selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setFilePreview(null);
                        setOcrPreviewText(null);
                      }}
                      className="text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 underline"
                    >
                      Remove Image
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExtractOcrPreview();
                      }}
                      disabled={isOcrExtracting}
                      className="flex items-center space-x-1.5 px-3 py-1 rounded bg-slate-200 dark:bg-slate-800 text-xs text-cyan-700 dark:text-cyan-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{isOcrExtracting ? 'Extracting OCR...' : 'Preview OCR Text First'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Click to browse, drag & drop, or press Ctrl+V to paste screenshot
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Supports JPG, PNG, WEBP &bull; Max size 10MB &bull; WhatsApp forwards, X/Facebook posts, newspapers
                  </p>
                </div>
              )}
            </div>

            {/* OCR Preview Text Box (if user previewed) */}
            {ocrPreviewText && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-4 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">OCR Extracted Text Preview</span>
                  </div>
                  {ocrConfidence !== null && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ocrConfidence >= 50
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      Confidence: {ocrConfidence}%
                    </span>
                  )}
                </div>

                {ocrWarning && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center space-x-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{ocrWarning}</span>
                  </div>
                )}

                <textarea
                  value={ocrPreviewText}
                  onChange={(e) => setOcrPreviewText(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-500">
                  You can edit the extracted OCR text above if characters were misrecognized before running full analysis.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PDF INPUT */}
        {activeTab === 'pdf' && (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => pdfInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-emerald-500/50 bg-slate-100/70 dark:bg-slate-950/60'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/40 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePdfSelection(e.target.files[0]);
                  }
                }}
              />

              {selectedFile ? (
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <FileCheck className="h-7 w-7" />
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; Ready for text extraction
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 underline"
                  >
                    Change PDF File
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <FileCheck className="h-7 w-7" />
                  </div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Click to select or drag and drop a PDF file
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Supports news releases, research papers, circulars (.pdf up to 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: URL INPUT */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Web Article URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/news/article-headline..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              TruthLens AI will fetch the page, clean advertisements/scripts, and extract readable article text for machine learning verification.
            </p>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-500">
            Real-time evidence corroboration across verified global news outlets &amp; wire agencies
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            {(textInput || titleInput || urlInput || selectedFile || ocrPreviewText) && !isAnalyzing && (
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
              >
                Clear Form
              </button>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              style={{ color: '#ffffff' }}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-8 py-3 text-sm font-bold !text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span style={{ color: '#ffffff' }} className="!text-white font-bold">{analysisPhase || 'Analyzing...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-white shrink-0" />
                  <span style={{ color: '#ffffff' }} className="!text-white font-bold">Verify &amp; Analyze News</span>
                  <ArrowRight className="h-4 w-4 text-white ml-1 shrink-0" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* API Key Modal - Appears when quota limit is reached */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="rounded-2xl border border-amber-500/30 bg-white dark:bg-slate-900 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Quota Limit Reached</h3>
              </div>
              <button onClick={() => setShowApiKeyModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              The server's shared Gemini AI verification quota has reached its free limit. To continue deep generative claim verification, please enter your free Google Gemini API key.
            </p>

            <div className="space-y-1.5">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Paste your Gemini API key (AIzaSy...)"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-1 font-medium"
                >
                  <span>Get a free key from Google AI Studio</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              {apiKeyInput && (
                <button
                  type="button"
                  onClick={() => saveApiKey('')}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Clear Key
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  saveApiKey(apiKeyInput);
                }}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-xs font-bold text-white hover:from-cyan-400 hover:to-indigo-500 shadow-md transition-all"
              >
                Save &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
