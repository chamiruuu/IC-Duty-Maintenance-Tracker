import React, { useState } from "react";
import {
  Users,
  X,
  UserPlus,
  Loader2,
  Shuffle,
  Check,
  UserMinus,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Key,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import CopyButton from "../CopyButton";

const QC_PLUS_ROLE = "QC+";
const LEGACY_QC_PLUS_ROLE = "qc_leader";

const UserModal = ({
  isOpen,
  onClose,
  userTab,
  setUserTab,
  userList,
  userForm,
  setUserForm,
  loading,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
  editingUser,
  setEditingUser,
  newUserCredentials,
  setNewUserCredentials,
  handleSendResetLink, // <-- ADD IT HERE
  canManageAdmin, // <-- ADDED PROP
  canManageQCPermissions,
}) => {
  const [generatedPass, setGeneratedPass] = useState("");
  const [showPasswords, setShowPasswords] = useState({});
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  if (!isOpen) return null;

  // Force Tab to List if they don't have manage rights (QC Role)
  if (!canManageAdmin && userTab !== "list") {
    setUserTab("list");
  }

  const handleGenerate = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++)
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setGeneratedPass(pass);
  };

  const togglePasswordVisibility = (id) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email || "");
  const isFormValid =
    isEmailValid && userForm.workName?.trim() && userForm.password?.trim();

  const isQCPlusRole = (role) =>
    role === QC_PLUS_ROLE || role === LEGACY_QC_PLUS_ROLE;
  const isQCRole = (role) => role === "qc" || isQCPlusRole(role);
  const getRoleLabel = (role) => {
    if (isQCPlusRole(role)) return "QC+";
    if (role === "qc") return "qc";
    return role;
  };

  const toggleQCPermission = (user) => {
    const nextRole = isQCPlusRole(user.role) ? "qc" : QC_PLUS_ROLE;
    handleUpdateUser(user.id, { role: nextRole });
  };

  const getRoleBadgeClass = (role) => {
    if (role === "admin") return "bg-black text-white";
    if (role === "leader") return "bg-indigo-600 text-white";
    if (isQCPlusRole(role)) return "bg-emerald-100 text-emerald-700";
    if (role === "qc") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-600";
  };

  const renderRoleBadge = (role) => (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getRoleBadgeClass(role)}`}
    >
      {getRoleLabel(role)}
    </span>
  );

  const renderQCPermissionToggle = (user) => {
    if (!canManageQCPermissions || !isQCRole(user.role)) return null;

    const hasEditAccess = isQCPlusRole(user.role);

    return (
      <button
        onClick={() => toggleQCPermission(user)}
        aria-label={hasEditAccess ? "QC+ permission granted" : "Grant QC+ permission"}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-colors ${
          hasEditAccess
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
        }`}
        title={
          hasEditAccess
            ? "Click to make QC view only"
            : "Click to allow QC editing"
        }
      >
        {hasEditAccess ? (
          <ShieldCheck size={11} />
        ) : (
          <>
            <ShieldOff size={11} /> Grant QC+
          </>
        )}
      </button>
    );
  };

  const confirmDelete = () => {
    if (deleteConfirmation) {
      handleDeleteUser(deleteConfirmation.id, deleteConfirmation.work_name);
      setDeleteConfirmation(null);
    }
  };

  return (
    <>
      {/* --- CUSTOM DELETE POPUP (GLOBAL LAYER) --- */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-5">
                <AlertTriangle
                  className="h-7 w-7 text-red-600"
                  strokeWidth={2.5}
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Delete User?
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Are you sure you want to permanently delete <br />
                <span className="font-bold text-gray-800">
                  {deleteConfirmation.work_name}
                </span>
                ?
                <br />
                <span className="text-red-500 font-medium text-xs mt-1 block">
                  This action cannot be undone.
                </span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="w-full py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="w-full py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN USER MODAL --- */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <Users size={16} /> User Management
              </h2>
              {/* HIDDEN FOR QC ROLE */}
              {canManageAdmin && (
                <div className="flex bg-gray-100 p-0.5 rounded">
                  <button
                    onClick={() => setUserTab("list")}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${userTab === "list" ? "bg-white shadow-sm text-black" : "text-gray-500"}`}
                  >
                    Users List
                  </button>
                  <button
                    onClick={() => setUserTab("create")}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${userTab === "create" ? "bg-white shadow-sm text-black" : "text-gray-500"}`}
                  >
                    Create New
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 sm:static text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>

          {/* --- CREATE TAB --- */}
          {userTab === "create" && canManageAdmin ? (
            <div className="p-4 sm:p-8 max-w-md mx-auto w-full overflow-y-auto">
              {newUserCredentials ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center animate-in zoom-in-95 duration-300">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check size={24} strokeWidth={3} />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-900 mb-1">
                    User Created!
                  </h3>
                  <p className="text-xs text-emerald-700 mb-4">
                    The password has been saved to the list.
                  </p>

                  <button
                    onClick={() => {
                      setNewUserCredentials(null);
                      setUserTab("list");
                    }}
                    className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Done & View List
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        className={`w-full bg-white border text-gray-900 text-sm rounded-sm px-3 py-2 outline-none transition-colors
                                   ${
                                     userForm.email && !isEmailValid
                                       ? "border-red-500 focus:border-red-500 text-red-900"
                                       : "border-gray-300 focus:border-black"
                                   }`}
                        placeholder="newuser@example.com"
                        value={userForm.email}
                        onChange={(e) =>
                          setUserForm({ ...userForm, email: e.target.value })
                        }
                      />
                      {userForm.email && !isEmailValid && (
                        <AlertCircle
                          size={16}
                          className="absolute right-3 top-2.5 text-red-500 animate-pulse"
                        />
                      )}
                    </div>
                    {userForm.email && !isEmailValid && (
                      <p className="text-[10px] text-red-500 mt-1 font-medium">
                        Please enter a valid email address.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      Work Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-sm px-3 py-2 outline-none focus:border-black"
                      placeholder="e.g. Chamiru"
                      value={userForm.workName}
                      onChange={(e) =>
                        setUserForm({ ...userForm, workName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      Role
                    </label>
                    <select
                      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-sm px-3 py-2 outline-none focus:border-black"
                      value={userForm.role}
                      onChange={(e) =>
                        setUserForm({ ...userForm, role: e.target.value })
                      }
                    >
                      <option value="normal">Normal User</option>
                      <option value="leader">Leader</option>
                      <option value="admin">Admin</option>
                      {/* ADD QC ROLE TO SELECT */}
                      <option value="qc">QC (View Only)</option>
                    </select>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-gray-500 uppercase">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-gray-400">
                        Paste generated password below
                      </span>
                    </div>

                    <input
                      type="text"
                      className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-sm px-3 py-2 outline-none focus:border-black font-mono"
                      placeholder="Paste password here..."
                      value={userForm.password}
                      onChange={(e) =>
                        setUserForm({ ...userForm, password: e.target.value })
                      }
                    />

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                      <div className="flex-1 bg-white border border-dashed border-gray-300 rounded px-3 py-2 text-xs font-mono text-gray-600 h-9 flex items-center">
                        {generatedPass || "Click Generate ->"}
                      </div>
                      <button
                        onClick={handleGenerate}
                        className="px-3 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded hover:bg-gray-300 flex items-center gap-1"
                      >
                        <Shuffle size={12} /> Generate
                      </button>
                      {generatedPass && (
                        <div className="h-9">
                          <CopyButton text={generatedPass} label="COPY" />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateUser}
                    disabled={loading || !isFormValid}
                    className={`w-full py-2.5 text-xs font-bold text-white rounded-sm shadow-sm transition-colors flex items-center justify-center gap-2 mt-4 
                             ${loading || !isFormValid ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-gray-800"}`}
                    title={
                      !isFormValid
                        ? "Please fill all required fields correctly"
                        : ""
                    }
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            // --- LIST TAB ---
            <div className="flex-1 overflow-y-auto p-3 md:p-0">
              <table className="hidden md:table w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-xs uppercase tracking-wide">
                      Work Name
                    </th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wide">
                      Email
                    </th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wide">
                      Password
                    </th>
                    <th className="px-6 py-3 text-xs uppercase tracking-wide">
                      Role
                    </th>
                    {/* ONLY SHOW ACTION COLUMN IF CAN MANAGE */}
                    {canManageAdmin && (
                      <th className="px-6 py-3 text-right text-xs uppercase tracking-wide">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userList.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 group">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {editingUser === u.id ? (
                          <input
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                            defaultValue={u.work_name}
                            onBlur={(e) =>
                              handleUpdateUser(u.id, {
                                work_name: e.target.value,
                              })
                            }
                          />
                        ) : (
                          u.work_name
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {u.email}
                      </td>

                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 min-w-[80px]">
                            {showPasswords[u.id]
                              ? u.visible_password || "******"
                              : "••••••••"}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPasswords[u.id] ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                          </button>
                          <CopyButton
                            text={u.visible_password || ""}
                            label=""
                          />
                        </div>
                      </td>

                      <td className="px-6 py-3">
                        {editingUser === u.id ? (
                          <select
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                            value={isQCPlusRole(u.role) ? QC_PLUS_ROLE : u.role}
                            onChange={(e) =>
                              handleUpdateUser(u.id, { role: e.target.value })
                            }
                          >
                            <option value="normal">Normal</option>
                            <option value="leader">Leader</option>
                            <option value="admin">Admin</option>
                            {/* ADD QC OPTION TO EDIT LIST */}
                            <option value="qc">QC (View Only)</option>
                            <option
                              value={QC_PLUS_ROLE}
                              disabled={!canManageQCPermissions}
                            >
                              QC+
                            </option>
                          </select>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {renderRoleBadge(u.role)}
                            {renderQCPermissionToggle(u)}
                          </div>
                        )}
                      </td>
                      {/* ONLY RENDER ACTIONS IF USER IS ADMIN/LEADER */}
                      {canManageAdmin && (
                        <td className="px-6 py-3 text-right flex items-center justify-end gap-3">
                          <button
                            onClick={() =>
                              setEditingUser(editingUser === u.id ? null : u.id)
                            }
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            {editingUser === u.id ? "Done" : "Edit"}
                          </button>

                          <button
                            onClick={() => handleSendResetLink(u.email)}
                            className="text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Send Password Reset Email"
                          >
                            <Key size={14} />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmation(u)}
                            className="text-gray-300 hover:text-red-600 transition-colors"
                            title="Delete User"
                          >
                            <UserMinus size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-3 md:hidden">
                {userList.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {editingUser === u.id ? (
                          <input
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-medium"
                            defaultValue={u.work_name}
                            onBlur={(e) =>
                              handleUpdateUser(u.id, {
                                work_name: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <div className="font-semibold text-gray-900 truncate">
                            {u.work_name}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {u.email}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {editingUser === u.id ? (
                          <select
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                            value={isQCPlusRole(u.role) ? QC_PLUS_ROLE : u.role}
                            onChange={(e) =>
                              handleUpdateUser(u.id, { role: e.target.value })
                            }
                          >
                            <option value="normal">Normal</option>
                            <option value="leader">Leader</option>
                            <option value="admin">Admin</option>
                            <option value="qc">QC (View Only)</option>
                            <option
                              value={QC_PLUS_ROLE}
                              disabled={!canManageQCPermissions}
                            >
                              QC+
                            </option>
                          </select>
                        ) : (
                          <>
                            {renderRoleBadge(u.role)}
                            {renderQCPermissionToggle(u)}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 rounded bg-gray-50 px-3 py-2">
                      <span className="font-mono text-xs text-gray-700 truncate">
                        {showPasswords[u.id]
                          ? u.visible_password || "******"
                          : "********"}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => togglePasswordVisibility(u.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPasswords[u.id] ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                        <CopyButton text={u.visible_password || ""} label="" />
                      </div>
                    </div>

                    {canManageAdmin && (
                      <div className="mt-3 flex items-center justify-end gap-3 border-t border-gray-100 pt-3">
                        <button
                          onClick={() =>
                            setEditingUser(editingUser === u.id ? null : u.id)
                          }
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          {editingUser === u.id ? "Done" : "Edit"}
                        </button>
                        <button
                          onClick={() => handleSendResetLink(u.email)}
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Send Password Reset Email"
                        >
                          <Key size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation(u)}
                          className="text-gray-300 hover:text-red-600 transition-colors"
                          title="Delete User"
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UserModal;
