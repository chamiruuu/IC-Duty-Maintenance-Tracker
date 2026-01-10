import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

const CopyButton = ({ text, label = "COPY" }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className={`flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-sm transition-all duration-300 ${copied ? 'bg-emerald-500 text-white scale-105' : 'bg-black text-white hover:bg-gray-800'}`}>
      {copied ? <Check size={10} /> : <Copy size={8} />} {copied ? 'COPIED!' : label}
    </button>
  );
};

export default CopyButton;