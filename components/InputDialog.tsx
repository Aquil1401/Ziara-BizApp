"use client";

import React, { useState, useEffect } from 'react';
import { X, Type } from 'lucide-react';

interface InputDialogProps {
  isOpen: boolean;
  title: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function InputDialog({
  isOpen,
  title,
  label,
  placeholder = "",
  defaultValue = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onCancel}
      />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <Type className="text-indigo-600" size={24} />
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
        
        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{label}</label>
            <input 
              autoFocus
              className="premium-input font-bold text-lg"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div className="p-6 bg-slate-50 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end border-t border-slate-100">
            <button 
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-white text-slate-600 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
            >
              {cancelLabel}
            </button>
            <button 
              type="submit"
              disabled={!value.trim()}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
