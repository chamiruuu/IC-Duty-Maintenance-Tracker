import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';

const ActionMenu = ({ onEdit, onDelete, hasPermission }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="text-gray-400 hover:text-gray-900 p-1 rounded hover:bg-gray-200 transition-colors">
        <MoreHorizontal size={16} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 shadow-lg rounded-md z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <button onClick={() => { onEdit(); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <Edit size={12} /> Edit
          </button>
          {hasPermission && (
            <>
              <div className="h-px bg-gray-100 my-0.5"></div>
              <button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
                <Trash2 size={12} /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;