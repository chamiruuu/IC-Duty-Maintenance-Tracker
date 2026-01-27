import React, { useState, useEffect } from 'react';
import { X, Plus, Search, Trash2, Edit2, Shield, Loader2, Check, Ban, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const ProviderManagerModal = ({ isOpen, onClose }) => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // New Provider Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: '', is_in_house: false });

  // Fetch Providers
  const fetchProviders = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('providers').select('*').order('name', { ascending: true });
    if (!error) setProviders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchProviders();
  }, [isOpen]);

  // Actions
  const handleAdd = async () => {
    if (!newProvider.name.trim()) return;
    const { error } = await supabase.from('providers').insert([newProvider]);
    if (!error) {
      setIsAdding(false);
      setNewProvider({ name: '', is_in_house: false });
      fetchProviders();
    } else {
      alert("Error adding provider. Name might be duplicate.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this provider?")) return;
    await supabase.from('providers').delete().eq('id', id);
    fetchProviders();
  };

  const handleUpdate = async (id, updates) => {
    await supabase.from('providers').update(updates).eq('id', id);
    fetchProviders(); 
    setEditingId(null);
  };

  const filteredProviders = providers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Shield size={22} strokeWidth={2.5} />
            </div>
            <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight">Provider Management</h3>
                <p className="text-xs text-gray-500 font-medium">Configure provider list & status</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 flex gap-3 bg-gray-50/80 shrink-0 items-center">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-2.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Find a provider..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {!isAdding && (
            <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-gray-200 hover:shadow-xl active:scale-95">
                <Plus size={16} strokeWidth={3} /> <span className="hidden sm:inline">Add New</span>
            </button>
          )}
        </div>

        {/* List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50">
           
           {/* Add New Form (Slides In) */}
           {isAdding && (
              <div className="mb-4 p-4 bg-white border border-indigo-100 rounded-2xl shadow-sm animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1"><Plus size={12}/> New Provider</span>
                    <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600"><X size={14}/></button>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Provider Name</label>
                        <input 
                            value={newProvider.name} 
                            onChange={e => setNewProvider({...newProvider, name: e.target.value})} 
                            className="w-full p-2.5 text-sm font-medium border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all" 
                            placeholder="Enter name..." 
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                        <label className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all select-none ${newProvider.is_in_house ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                            <input type="checkbox" checked={newProvider.is_in_house} onChange={e => setNewProvider({...newProvider, is_in_house: e.target.checked})} className="hidden" />
                            <Building2 size={16} />
                            <span className="text-xs font-bold">In-House</span>
                            {newProvider.is_in_house && <Check size={14} strokeWidth={3} />}
                        </label>
                        
                        <button onClick={handleAdd} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-md">
                            Save
                        </button>
                    </div>
                </div>
              </div>
           )}

           {/* Loading State */}
           {loading ? (
             <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <span className="text-xs font-medium">Syncing database...</span>
             </div>
           ) : filteredProviders.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2 opacity-60">
                <Search size={32} />
                <span className="text-sm">No providers match "{searchTerm}"</span>
             </div>
           ) : (
             /* Provider List Items */
             filteredProviders.map(p => (
               <div key={p.id} className={`group relative bg-white p-3 rounded-xl border transition-all duration-200 ${editingId === p.id ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-md z-10' : 'border-gray-200 hover:border-indigo-200 hover:shadow-sm'}`}>
                  
                  {editingId === p.id ? (
                    // --- EDIT MODE ---
                    <div className="flex flex-col sm:flex-row items-center gap-3 animate-in fade-in">
                       <div className="flex-1 w-full">
                           <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block sm:hidden">Name</label>
                           <input 
                             className="w-full text-sm font-bold text-gray-900 border border-gray-200 p-2 rounded-lg focus:outline-none focus:border-indigo-500" 
                             defaultValue={p.name} 
                             id={`edit-name-${p.id}`} 
                             autoFocus
                           />
                       </div>
                       
                       <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                           <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-transparent hover:bg-white hover:border-gray-200 transition-all">
                              <input type="checkbox" defaultChecked={p.is_in_house} id={`edit-house-${p.id}`} className="rounded text-indigo-600 focus:ring-0" /> 
                              In-House
                           </label>
                           <div className="flex gap-1">
                              <button onClick={() => {
                                 const name = document.getElementById(`edit-name-${p.id}`).value;
                                 const is_in_house = document.getElementById(`edit-house-${p.id}`).checked;
                                 handleUpdate(p.id, { name, is_in_house });
                              }} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors" title="Save"><Check size={16} strokeWidth={3} /></button>
                              
                              <button onClick={() => setEditingId(null)} className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors" title="Cancel"><X size={16} strokeWidth={3} /></button>
                           </div>
                       </div>
                    </div>
                  ) : (
                    // --- VIEW MODE ---
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         {/* Avatar */}
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-sm transition-colors ${p.is_in_house ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                            {p.name.charAt(0).toUpperCase()}
                         </div>
                         
                         {/* Info */}
                         <div>
                             <div className="font-bold text-sm text-gray-900">{p.name}</div>
                             {p.is_in_house ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    <Building2 size={10} /> In-House
                                </span>
                             ) : (
                                <span className="text-[10px] text-gray-400 font-medium">Standard Provider</span>
                             )}
                         </div>
                      </div>

                      {/* Action Buttons (Visible on Hover) */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                         <button onClick={() => setEditingId(p.id)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit"><Edit2 size={16} /></button>
                         <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  )}
               </div>
             ))
           )}
        </div>
        
        {/* Footer info */}
        <div className="bg-gray-50 p-3 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-medium">
                {filteredProviders.length} providers loaded • Changes reflect immediately in Entry Modal
            </p>
        </div>

      </div>
    </div>
  );
};

export default ProviderManagerModal;