import React, { useState } from "react";
import { Info } from "lucide-react";

const BOT_COPY_REMINDER =
  "Please first test the content before sending it, by sending it to Carmen Test. Once confirmed everything is okay then proceed further";

const BotCopyReminder = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={BOT_COPY_REMINDER}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
      >
        <Info size={12} />
      </button>
      {isOpen && (
        <span className="absolute right-0 top-full z-[90] mt-1 w-64 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-left text-[10px] font-semibold leading-relaxed text-amber-900 shadow-lg">
          {BOT_COPY_REMINDER}
        </span>
      )}
    </span>
  );
};

export default BotCopyReminder;
