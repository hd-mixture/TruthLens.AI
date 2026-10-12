import { AnalysisResult, HistoryItem, HistoryStats, ModelMetrics } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Checks backend API health status
 */
export async function checkBackendHealth(): Promise<{ status: string; online: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return { status: data.status || 'healthy', online: true };
    }
    return { status: 'offline', online: false };
  } catch {
    return { status: 'offline', online: false };
  }
}

/**
 * Analyzes raw news text
 */
export async function analyzeText(
  text: string,
  title?: string,
  apiKey?: string
): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE_URL}/analyze/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, title, input_type: 'text', api_key: apiKey }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to analyze text' }));
    throw new Error(errorData.detail || `Server error (${res.status})`);
  }

  return res.json();
}

/**
 * Analyzes image or clipboard screenshot via Computer Vision & OCR
 */
export async function analyzeImage(
  file: File | Blob,
  inputType: 'image' | 'clipboard' = 'image',
  filename?: string,
  apiKey?: string
): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('file', file, filename || (file instanceof File ? file.name : 'screenshot.png'));
  formData.append('input_type', inputType);
  if (apiKey) {
    formData.append('api_key', apiKey);
  }

  const res = await fetch(`${API_BASE_URL}/analyze/image`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to process image' }));
    throw new Error(errorData.detail || `Image processing failed (${res.status})`);
  }

  return res.json();
}

/**
 * Extracts OCR text only for preview/editing
 */
export async function extractOcrOnly(file: File | Blob, filename?: string): Promise<{
  success: boolean;
  text: string;
  confidence: number;
  warning?: string;
  steps: string[];
  is_low_confidence: boolean;
}> {
  const formData = new FormData();
  formData.append('file', file, filename || (file instanceof File ? file.name : 'screenshot.png'));

  const res = await fetch(`${API_BASE_URL}/ocr/extract-only`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'OCR extraction failed' }));
    throw new Error(errorData.detail || 'OCR extraction failed');
  }

  return res.json();
}

/**
 * Analyzes a PDF document
 */
export async function analyzePdf(file: File, apiKey?: string): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('file', file, file.name);
  if (apiKey) {
    formData.append('api_key', apiKey);
  }

  const res = await fetch(`${API_BASE_URL}/analyze/pdf`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to analyze PDF' }));
    throw new Error(errorData.detail || `PDF analysis failed (${res.status})`);
  }

  return res.json();
}

/**
 * Analyzes a news article via web URL
 */
export async function analyzeUrl(url: string, apiKey?: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE_URL}/analyze/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, api_key: apiKey }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to analyze article from URL' }));
    throw new Error(errorData.detail || `URL analysis failed (${res.status})`);
  }

  return res.json();
}

/**
 * Retrieves past analysis history
 */
export async function getHistory(
  limit: number = 50,
  offset: number = 0,
  search?: string,
  filterPrediction?: string
): Promise<HistoryItem[]> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (search) params.append('search', search);
  if (filterPrediction && filterPrediction !== 'ALL') params.append('filter_prediction', filterPrediction);

  const res = await fetch(`${API_BASE_URL}/history?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

/**
 * Retrieves full details of a specific analysis record
 */
export async function getHistoryDetail(recordId: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE_URL}/history/${recordId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Analysis record not found');
  return res.json();
}

/**
 * Deletes a record from history
 */
export async function deleteHistoryItem(recordId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/history/${recordId}`, { method: 'DELETE' });
  return res.ok;
}

/**
 * Clears all history records
 */
export async function clearAllHistory(): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/history`, { method: 'DELETE' });
  return res.ok;
}

/**
 * Retrieves aggregate history stats
 */
export async function getHistoryStats(): Promise<HistoryStats> {
  const res = await fetch(`${API_BASE_URL}/history-stats`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

/**
 * Retrieves ML model performance metrics
 */
export async function getModelMetrics(): Promise<ModelMetrics> {
  const res = await fetch(`${API_BASE_URL}/model/metrics`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch model metrics');
  return res.json();
}
