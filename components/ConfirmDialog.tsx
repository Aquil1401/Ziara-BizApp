"use client";

import React from 'react';
import { X, AlertTriangle, Info, CheckCircle, HelpCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  type = 'warning',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  showCancel = true,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      icon: <AlertTriangle className="text-rose-600" size={24} />,
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
    },
    warning: {
      icon: <HelpCircle className="text-amber-600" size={24} />,
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
    },
    info: {
      icon: <Info className="text-indigo-600" size={24} />,
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
      btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
    },
    success: {
      icon: <CheckCircle className="text-emerald-600" size={24} />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
    }
  };

  const config = typeConfig[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <div className={`p-6 ${config.bg} border-b ${config.border} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              {config.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-white/50 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8">
          <p className="text-slate-600 leading-relaxed font-medium text-lg">
            {message}
          </p>
        </div>

        <div className={`p-6 bg-slate-50 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end ${!showCancel ? 'sm:justify-center' : ''}`}>
          {showCancel && (
            <button 
              onClick={onCancel}
              className="px-6 py-3 bg-white text-slate-600 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
            >
              {cancelLabel}
            </button>
          )}
          <button 
            onClick={onConfirm}
            className={`px-8 py-3 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 ${config.btn} ${!showCancel ? 'w-full sm:w-auto sm:px-12' : ''}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
