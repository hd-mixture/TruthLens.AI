'use client';

import React from 'react';

interface ConfusionMatrixProps {
  matrix: {
    true_negative_real: number;
    false_positive_fake: number;
    false_negative_real: number;
    true_positive_fake: number;
  };
  modelName: string;
}

export default function ConfusionMatrixVisualizer({ matrix, modelName }: ConfusionMatrixProps) {
  const tn = matrix.true_negative_real || 0;
  const fp = matrix.false_positive_fake || 0;
  const fn = matrix.false_negative_real || 0;
  const tp = matrix.true_positive_fake || 0;
  const total = tn + fp + fn + tp || 1;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">
            Confusion Matrix &bull; {modelName}
          </h4>
          <p className="text-xs text-slate-400">
            Evaluating classification accuracy on the 20% holdout test dataset ({total} test samples).
          </p>
        </div>
        <div className="text-xs bg-slate-800/80 px-2.5 py-1 rounded-md text-cyan-400 font-mono">
          N = {total} samples
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center">
        {/* Matrix Header / Predicted Labels */}
        <div className="w-full max-w-md">
          <div className="text-center pb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-cyan-400">
              Predicted Label &rarr;
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {/* Corner spacer */}
            <div className="flex items-center justify-center font-semibold text-slate-400 p-2">
              Actual Class &darr;
            </div>
            <div className="rounded-lg bg-slate-800/60 p-2 font-semibold text-emerald-400 border border-emerald-500/20">
              Pred: REAL (0)
            </div>
            <div className="rounded-lg bg-slate-800/60 p-2 font-semibold text-rose-400 border border-rose-500/20">
              Pred: FAKE (1)
            </div>

            {/* Row 1: Actual REAL */}
            <div className="flex items-center justify-center rounded-lg bg-slate-800/60 p-2 font-semibold text-emerald-400 border border-emerald-500/20">
              Actual: REAL
            </div>
            {/* True Negative */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 transition hover:bg-emerald-500/20">
              <span className="text-2xl font-black text-emerald-400">{tn}</span>
              <div className="text-[10px] uppercase font-bold text-emerald-300 mt-1">
                True Negative (TN)
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {Math.round((tn / total) * 100)}% of test set
              </div>
            </div>
            {/* False Positive (Type I Error) */}
            <div className={`rounded-xl border p-4 transition ${
              fp > 0 ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950/40'
            }`}>
              <span className={`text-2xl font-black ${fp > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {fp}
              </span>
              <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                False Positive (FP)
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Type I Error</div>
            </div>

            {/* Row 2: Actual FAKE */}
            <div className="flex items-center justify-center rounded-lg bg-slate-800/60 p-2 font-semibold text-rose-400 border border-rose-500/20">
              Actual: FAKE
            </div>
            {/* False Negative (Type II Error) */}
            <div className={`rounded-xl border p-4 transition ${
              fn > 0 ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950/40'
            }`}>
              <span className={`text-2xl font-black ${fn > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {fn}
              </span>
              <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                False Negative (FN)
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Type II Error</div>
            </div>
            {/* True Positive */}
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 transition hover:bg-rose-500/20">
              <span className="text-2xl font-black text-rose-400">{tp}</span>
              <div className="text-[10px] uppercase font-bold text-rose-300 mt-1">
                True Positive (TP)
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {Math.round((tp / total) * 100)}% of test set
              </div>
            </div>
          </div>
        </div>

        {/* Academic Notes */}
        <div className="mt-4 grid grid-cols-2 gap-4 w-full text-xs text-slate-400 border-t border-slate-800/60 pt-4">
          <div>
            <span className="font-semibold text-slate-300">Precision:</span> TP / (TP + FP) ={' '}
            <strong className="text-cyan-400 font-mono">
              {tp + fp > 0 ? `${((tp / (tp + fp)) * 100).toFixed(1)}%` : 'N/A'}
            </strong>
          </div>
          <div>
            <span className="font-semibold text-slate-300">Recall / Sensitivity:</span> TP / (TP + FN) ={' '}
            <strong className="text-cyan-400 font-mono">
              {tp + fn > 0 ? `${((tp / (tp + fn)) * 100).toFixed(1)}%` : 'N/A'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
