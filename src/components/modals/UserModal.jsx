import React, { useState } from 'react';
import { Users, X, UserPlus, Loader2, Shuffle, Check, UserMinus, Copy, Eye, EyeOff } from 'lucide-react';
import CopyButton from '../CopyButton';

const UserModal = ({
  isOpen, onClose, userTab, setUserTab, userList, userForm, setUserForm,
  loading, handleCreateUser, handleUpdateUser, handleDeleteUser,
  editingUser, setEditingUser, newUserCredentials, setNewUserCredentials
}) => {
  
  const [generatedPass, setGeneratedPass] = useState("");
  const [showPasswords, setShowPasswords] = useState({}); // To toggle visibility in list

  if (!isOpen) return null;

  const handleGenerate = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setGeneratedPass(pass);
  };

  const togglePasswordVisibility = (id) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
         
         {/* Header */}
         <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
               <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <Users size={16} /> User Management
               </h2>
               <div className="flex bg-gray-100 p-0.5 rounded">
                  <button onClick={() => setUserTab('list')} className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${userTab === 'list' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>Users List</button>
                  <button onClick={() => setUserTab('create')} className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${userTab === 'create' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>Create New</button>
               </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-black"><X size={18} /></button>
         </div>
         
         {/* --- CREATE TAB --- */}
         {userTab === 'create' ? (
            <div className="p-8 max-w-md mx-auto w-full overflow-y-auto">
               
               {newUserCredentials ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center animate-in zoom-in-95 duration-300">
                     <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Check size={24} strokeWidth={3} />
                     </div>
                     <h3 className="text-lg font-bold text-emerald-900 mb-1">User Created!</h3>
                     <p className="text-xs text-emerald-700 mb-4">The password has been saved to the list.</p>
                     
                     <button 
                        onClick={() => { setNewUserCredentials(null); setUserTab('list'); }}
                        className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                     >
                        Done & View List
                     </button>
                  </div>
               ) : (
                  <div className="space-y-5">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Email Address</label>
                        <input type="email" className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-sm px-3 py-2 outline-none focus:border-black" placeholder="newuser@example.com" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Work Name</label>
                        <input type="text" className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-sm px-3 py-2 outline-none focus:border-black" placeholder="e.g. Chamiru" value={userForm.workName} onChange={(e) => setUserForm({...userForm, workName: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Role</label>
                        <select className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-sm px-3 py-2 outline-none focus:border-black" value={userForm.role} onChange={(e) => setUserForm({...userForm, role: e.target.value})}>
                           <option value="normal">Normal User</option>
                           <option value="leader">Leader</option>
                           <option value="admin">Admin</option>
                        </select>
                     </div>
                     
                     {/* PASSWORD SECTION */}
                     <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Password</label>
                            <span className="text-[10px] text-gray-400">Paste generated password below</span>
                        </div>
                        
                        {/* Manual Input Field */}
                        <input 
                            type="text" 
                            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-sm px-3 py-2 outline-none focus:border-black font-mono" 
                            placeholder="Paste password here..." 
                            value={userForm.password} 
                            onChange={(e) => setUserForm({...userForm, password: e.target.value})} 
                        />

                        {/* Generator Box */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                            <div className="flex-1 bg-white border border-dashed border-gray-300 rounded px-3 py-2 text-xs font-mono text-gray-600 h-9 flex items-center">
                                {generatedPass || "Click Generate ->"}
                            </div>
                            <button onClick={handleGenerate} className="px-3 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded hover:bg-gray-300 flex items-center gap-1">
                                <Shuffle size={12} /> Generate
                            </button>
                            {generatedPass && (
                                <div className="h-9">
                                    <CopyButton text={generatedPass} label="COPY" />
                                </div>
                            )}
                        </div>
                     </div>

                     <button onClick={handleCreateUser} disabled={loading} className="w-full py-2.5 text-xs font-bold text-white bg-black hover:bg-gray-800 rounded-sm shadow-sm transition-colors flex items-center justify-center gap-2 mt-4">{loading ? <Loader2 size={14} className="animate-spin" /> : 'Create Account'}</button>
                  </div>
               )}
            </div>
         ) : (
            // --- LIST TAB ---
            <div className="flex-1 overflow-y-auto p-0">
               <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0">
                     <tr>
                        <th className="px-6 py-3 text-xs uppercase tracking-wide">Work Name</th>
                        <th className="px-6 py-3 text-xs uppercase tracking-wide">Email</th>
                        <th className="px-6 py-3 text-xs uppercase tracking-wide">Password</th> {/* NEW COLUMN */}
                        <th className="px-6 py-3 text-xs uppercase tracking-wide">Role</th>
                        <th className="px-6 py-3 text-right text-xs uppercase tracking-wide">Action</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {userList.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50 group">
                           <td className="px-6 py-3 font-medium text-gray-900">
                              {editingUser === u.id ? (
                                 <input className="border border-gray-300 rounded px-2 py-1 text-xs" defaultValue={u.work_name} onBlur={(e) => handleUpdateUser(u.id, { work_name: e.target.value })} />
                              ) : u.work_name}
                           </td>
                           <td className="px-6 py-3 text-gray-500 text-xs">{u.email}</td>
                           
                           {/* PASSWORD DISPLAY COLUMN */}
                           <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 min-w-[80px]">
                                        {showPasswords[u.id] ? (u.visible_password || '******') : '••••••••'}
                                    </span>
                                    <button 
                                        onClick={() => togglePasswordVisibility(u.id)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPasswords[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                    <CopyButton text={u.visible_password || ''} label="" />
                                </div>
                           </td>

                           <td className="px-6 py-3">
                              {editingUser === u.id ? (
                                 <select className="border border-gray-300 rounded px-2 py-1 text-xs" defaultValue={u.role} onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}>
                                    <option value="normal">Normal</option>
                                    <option value="leader">Leader</option>
                                    <option value="admin">Admin</option>
                                 </select>
                              ) : (
                                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-black text-white' : u.role === 'leader' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                              )}
                           </td>
                           <td className="px-6 py-3 text-right flex items-center justify-end gap-3">
                              <button onClick={() => setEditingUser(editingUser === u.id ? null : u.id)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                                 {editingUser === u.id ? 'Done' : 'Edit'}
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(u.id, u.work_name)}
                                className="text-gray-300 hover:text-red-600 transition-colors"
                                title="Delete User"
                              >
                                 <UserMinus size={14} />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>
    </div>
  );
};

export default UserModal;