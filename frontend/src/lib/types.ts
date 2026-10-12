export interface ScoreFactor {
  name: string;
  score: number;
  max: number;
  status: 'pass' | 'warning' | 'danger';
  description: string;
}

export interface TextStats {
  char_count: number;
  word_count: number;
  sentence_count: number;
  uppercase_ratio: number;
  exclamation_count: number;
  question_count: number;
  avg_word_length: number;
}

export interface AIExplanation {
  summary: string;
  explanation: string;
  key_claims: string[];
  suspicious_language_notes: string;
  verification_suggestions: string[];
  engine: string;
}

export interface OCRDetails {
  engine: string;
  confidence?: number;
  warning?: string | null;
  steps?: string[];
  filename?: string;
  is_low_confidence?: boolean;
  page_count?: number;
  source_url?: string;
}

export interface WebReference {
  title: string;
  source: string;
  url: string;
  published_at?: string;
}

export interface EvidenceVerification {
  extracted_claim: string;
  entities: string[];
  search_query: string;
  sources_checked: WebReference[];
  status: 'SUPPORTED' | 'CONTRADICTED' | 'INSUFFICIENT_EVIDENCE' | string;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  consistency_score: number;
  message: string;
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  input_type: 'text' | 'image' | 'clipboard' | 'pdf' | 'url';
  title: string;
  input_text: string;
  cleaned_text: string;
  prediction: 'Likely Real' | 'Potentially Fake' | string;
  confidence: number;
  class_label: 'REAL' | 'FAKE' | string;
  probabilities: {
    REAL: number;
    FAKE: number;
  };
  credibility_score: number;
  risk_level: string;
  score_factors: ScoreFactor[];
  warning_signs: string[];
  positive_indicators: string[];
  ai_explanation: AIExplanation;
  text_stats: TextStats;
  ocr_details?: OCRDetails | null;
  evidence_verification?: EvidenceVerification | null;
}

export interface HistoryItem {
  id: string;
  created_at: string;
  input_type: 'text' | 'image' | 'clipboard' | 'pdf' | 'url';
  title: string;
  snippet: string;
  prediction: string;
  confidence: number;
  credibility_score: number;
  risk_level: string;
  warning_signs: string[];
}

export interface HistoryStats {
  total_analyzed: number;
  likely_real_count: number;
  potentially_fake_count: number;
  average_credibility: number;
}

export interface ModelMetrics {
  primary_model: string;
  total_samples: number;
  train_samples: number;
  test_samples: number;
  class_distribution: {
    REAL: number;
    FAKE: number;
  };
  vocabulary_size: number;
  ngram_range: [number, number];
  models: {
    [modelName: string]: {
      accuracy: number;
      precision: number;
      recall: number;
      f1_score: number;
      confusion_matrix: {
        true_negative_real: number;
        false_positive_fake: number;
        false_negative_real: number;
        true_positive_fake: number;
      };
    };
  };
  primary_metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    confusion_matrix: {
      true_negative_real: number;
      false_positive_fake: number;
      false_negative_real: number;
      true_positive_fake: number;
    };
  };
  top_features: {
    fake_indicators: Array<{ word: string; weight: number }>;
    real_indicators: Array<{ word: string; weight: number }>;
  };
  pipeline_description: Array<{
    step: number;
    title: string;
    desc: string;
  }>;
}
