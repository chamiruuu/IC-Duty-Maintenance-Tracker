import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

// --- FIXED IMPORTS ---
import { format, toZonedTime } from 'date-fns-tz'; 
import { isSameDay, differenceInMinutes, parseISO, addHours, addMinutes, isFuture, isToday } from 'date-fns'; 
// ---------------------

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

import { 
  Clock, Plus, ExternalLink, RefreshCcw, 
  Trash2, Edit2, CalendarDays,
  Gamepad2, User, CheckSquare, History as HistoryIcon, LayoutList,
  ShieldCheck, Shield, Users, LogOut, Check, Bell, Zap,
  PlayCircle, AlertTriangle, Timer, CheckCircle2, Ban,
  MessageSquarePlus 
} from 'lucide-react';

import NotificationToast from './NotificationToast';
import NotificationMenu from './NotificationMenu';
import EntryModal from './modals/EntryModal';
import CompletionModal from './modals/CompletionModal';
import UserModal from './modals/UserModal';
import DeleteModal from './modals/DeleteModal';
import ResolutionModal from './modals/ResolutionModal';
import CancellationModal from './modals/CancellationModal';
import CancelRequestModal from './modals/CancelRequestModal'; 
import DeleteRequestModal from './modals/DeleteRequestModal'; 
import FeedbackModal from './modals/FeedbackModal'; 

const REDMINE_BASE_URL = "https://bugtracking.ickwbase.com/issues/"; 

// --- ROBUST SOUND EFFECT ---
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const audioContext = new AudioContext();

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch((e) => console.warn("Audio resume failed:", e));
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.error("Audio failed", e);
  }
};

const Dashboard = ({ session }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); 
  const [userProfile, setUserProfile] = useState({ role: 'normal', work_name: '' });
  const isHighLevel = ['admin', 'leader'].includes(userProfile.role);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [isCancelRequestModalOpen, setIsCancelRequestModalOpen] = useState(false); 
  const [isDeleteRequestModalOpen, setIsDeleteRequestModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false); 
  
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('pending'); 

  const [maintenances, setMaintenances] = useState([]);
  const [userList, setUserList] = useState([]); 
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null); 
  const [deleteRequestId, setDeleteRequestId] = useState(null); 
  const [resolvingItem, setResolvingItem] = useState(null);
  const [cancellingItem, setCancellingItem] = useState(null);
  
  const [notifications, setNotifications] = useState([]); 
  const [notificationHistory, setNotificationHistory] = useState([]); 
  const alertedRef = useRef(new Set());
  
  const [completingItem, setCompletingItem] = useState(null);
  const [sopChecks, setSopChecks] = useState({ transfer: false, gameOpen: false, redmineUpdate: false });

  const [userTab, setUserTab] = useState('list'); 
  const [userForm, setUserForm] = useState({ email: '', workName: '', password: '', role: 'normal' });
  const [editingUser, setEditingUser] = useState(null);
  const [newUserCredentials, setNewUserCredentials] = useState(null);

  const [formData, setFormData] = useState({
    provider: '',
    type: 'Scheduled',
    isUntilFurtherNotice: false,
    redmineLink: '',
    startTime: null,
    endTime: null
  });

  // --- 1. INITIAL SETUP & REALTIME ---
  useEffect(() => {
    fetchUserProfile();
    fetchMaintenances();
    
    if ("Notification" in window) Notification.requestPermission();

    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const channelName = `maintenances_tracker_${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenances' }, () => {
          fetchMaintenances(); 
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsConnected(true);
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setIsConnected(false);
      });

    const clockTimer = setInterval(() => {
        const now = new Date();
        setCurrentTime(now);
        setNotificationHistory(prev => prev.filter(n => differenceInMinutes(now, n.timestamp) <= 10));
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(clockTimer);
    };
  }, []);

  // --- 2. NOTIFICATION CHECKER ---
  useEffect(() => {
    const checkTimer = setInterval(() => {
       const now = new Date(); 
       
       maintenances.forEach(m => {
          
          // B. POST-COMPLETION TRACKER
          if (m.status === 'Completed' && m.completion_time) {
              const completeDate = parseISO(m.completion_time);
              const twoHoursLater = addHours(completeDate, 2);
              const diff = differenceInMinutes(now, twoHoursLater);
              
              const reminderId = `${m.id}-2hr-reminder`;
              if (Math.abs(diff) <= 2 && !alertedRef.current.has(reminderId)) {
                  triggerNotification(
                      `Action Required: SOP Clean-up`, 
                      `2 hours post-completion for ${m.provider}. Please delete BO8.2 announcement.`, 
                      'warning'
                  );
                  alertedRef.current.add(reminderId);
              }
              return;
          }

          if (m.status === 'Cancelled') return;
          if (m.is_until_further_notice || !m.end_time) return;
          
          // A. ONGOING / UPCOMING CHECKS
          const endDate = parseISO(m.end_time); 
          const minutesLeft = differenceInMinutes(endDate, now); 
          const minutesPast = differenceInMinutes(now, endDate); 

          // 1. PRE-WARNING (30 mins)
          const alertId30 = `${m.id}-30min-warn`;
          if (minutesLeft <= 30 && minutesLeft > 25) {
             if (!alertedRef.current.has(alertId30)) {
                triggerNotification(
                    `Maintenance Interval Alert`, 
                    `【${m.provider}】 concludes in 30 minutes. Please verify status with provider.`, 
                    'warning'
                );
                alertedRef.current.add(alertId30);
             }
          }

          // 2. GRACE PERIOD (0 to 5 mins past)
          const alertIdGrace = `${m.id}-grace-period`;
          if (minutesPast > 0 && minutesPast <= 5) {
              if (!alertedRef.current.has(alertIdGrace)) {
                  const script = `Hi Team, this is ${userProfile.work_name}. May we confirm if the scheduled maintenance is completed now ? Thank You.`;
                  triggerNotification(
                      `Scheduled Time Reached`, 
                      `Please confirm completion for 【${m.provider}】.`, 
                      'warning',
                      script
                  );
                  alertedRef.current.add(alertIdGrace);
              }
          }

          // 3. HARD OVERDUE (> 5 mins) -> GLOBAL DB SNOOZE CHECK
          if (minutesPast > 5) {
              const snoozedUntil = m.snoozed_until ? parseISO(m.snoozed_until) : null;
              const isSnoozed = snoozedUntil && now < snoozedUntil;

              if (!isSnoozed) {
                  const minuteId = Math.floor(Date.now() / 60000); 
                  const nagId = `${m.id}-overdue-${minuteId}`;
                  
                  if (!alertedRef.current.has(nagId)) {
                      triggerNotification(
                          `CRITICAL OVERDUE: ${m.provider}`, 
                          `Maintenance exceeded scheduled time by >5 mins. Immediate Extension or Completion required.`, 
                          'urgent',
                          null,
                          m.id 
                      );
                      alertedRef.current.add(nagId);
                  }
              }
          }
       });
    }, 5000); 

    return () => clearInterval(checkTimer);
  }, [maintenances, userProfile]);

  // --- SNOOZE HANDLER ---
  const handleSnooze = async (maintenanceId, notificationId) => {
    removeNotification(notificationId);
    const snoozedTime = addMinutes(new Date(), 5).toISOString();
    await supabase.from('maintenances').update({ snoozed_until: snoozedTime }).eq('id', maintenanceId);
    setMaintenances(prev => prev.map(m => m.id === maintenanceId ? { ...m, snoozed_until: snoozedTime } : m));
  };

  const triggerNotification = (title, message, type, copyText = null, maintenanceId = null) => {
    playNotificationSound();
    const id = Date.now();
    setNotifications(prev => [...prev, { id, title, message, type, copyText, maintenanceId }]);
    setNotificationHistory(prev => [{ id, title, message, type, timestamp: new Date(), copyText }, ...prev]);

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: message });
    }
    
    setTimeout(() => removeNotification(id), 20000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const timeZone = 'Asia/Shanghai';
  const zonedTime = toZonedTime(currentTime, timeZone);

  // --- GREETING LOGIC ---
  const getGreeting = () => {
    const hour = parseInt(format(zonedTime, 'H', { timeZone })); 
    let greeting = "Good Night";
    if (hour >= 7 && hour < 15) greeting = "Good Morning";
    else if (hour >= 15 && hour < 23) greeting = "Good Afternoon";
    else greeting = "Good Night";

    return `${greeting}, ${userProfile.work_name || 'User'}`;
  };

  // --- SUPABASE ACTIONS ---
  const fetchUserProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (data) setUserProfile(data);
    else setUserProfile({ role: 'normal', work_name: session.user.email.split('@')[0] });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const fetchUserList = async () => {
    if (!isHighLevel) return;
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUserList(data);
  };

  // --- USER MANAGEMENT (EXPANDED FOR READABILITY) ---
  const handleCreateUser = async () => {
    if (!userForm.email || !userForm.workName || !userForm.password) {
      alert("Please fill all fields.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('create_new_user', {
      new_email: userForm.email,
      new_password: userForm.password,
      new_work_name: userForm.workName,
      new_role: userForm.role
    });
    setLoading(false);
    if (error) {
      alert("Error: " + error.message);
    } else {
      setNewUserCredentials({ 
        email: userForm.email, 
        password: userForm.password,
        role: userForm.role,
        workName: userForm.workName
      });
      setUserForm({ email: '', workName: '', password: '', role: 'normal' });
      fetchUserList();
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) alert("Update failed: " + error.message);
    else {
      setEditingUser(null);
      fetchUserList();
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete user "${userName}"?`)) return;
    const { error } = await supabase.rpc('delete_user', { target_user_id: userId });
    if (error) alert("Delete failed: " + error.message);
    else fetchUserList();
  };

  const fetchMaintenances = async () => {
    const { data, error } = await supabase.from('maintenances').select('*').order('start_time', { ascending: true });
    if (!error) setMaintenances(data);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchMaintenances();
    setTimeout(() => setIsRefreshing(false), 700);
  };

  // --- DELETE LOGIC (REQUEST VS CONFIRM) ---
  const handleInitiateDelete = (item) => {
    if (isHighLevel) {
        // Admin: Direct Delete Confirmation
        setDeletingId(item.id);
        setIsDeleteModalOpen(true);
    } else {
        // Normal User: Request Delete Modal
        setDeleteRequestId(item);
        setIsDeleteRequestModalOpen(true);
    }
  };

  const handleRequestDeleteConfirm = async (item) => {
    const { error } = await supabase.from('maintenances').update({ deletion_pending: true }).eq('id', item.id);
    if (!error) {
        setIsDeleteRequestModalOpen(false);
        setDeleteRequestId(null);
        fetchMaintenances();
    } else {
        alert("Error requesting delete: " + error.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setLoading(true); 
    setMaintenances(prev => prev.filter(m => m.id !== deletingId));
    const { error } = await supabase.from('maintenances').delete().eq('id', deletingId);
    setLoading(false);
    setIsDeleteModalOpen(false);
    setDeletingId(null);
    if (error) { 
        alert("Error deleting: " + error.message); 
        fetchMaintenances();
    }
  };

  // --- EXTENSION LOGIC ---
  const handleExtendMaintenance = async (id, newEndTimeDayJs, isNotice) => {
    setLoading(true);
    const payload = {
        is_until_further_notice: isNotice,
        end_time: isNotice ? null : newEndTimeDayJs.toISOString()
    };
    const { error } = await supabase.from('maintenances').update(payload).eq('id', id);
    setLoading(false);
    if (!error) {
        setIsResolutionModalOpen(false);
        fetchMaintenances(); 
    } else {
        alert("Error extending: " + error.message);
    }
  };

  // --- CANCELLATION LOGIC ---
  const handleInitiateCancel = (item) => {
    setCancellingItem(item);
    if (isHighLevel) {
        setIsCancellationModalOpen(true); // Admin -> Approve
    } else {
        setIsCancelRequestModalOpen(true); // Normal -> Request
    }
  };

  const handleRequestCancelConfirm = async (item) => {
    const { error } = await supabase.from('maintenances').update({ cancellation_pending: true }).eq('id', item.id);
    if (!error) {
        setIsCancelRequestModalOpen(false);
        setCancellingItem(null);
        fetchMaintenances();
    } else {
        alert("Error reporting cancellation: " + error.message);
    }
  };

  const handleConfirmCancel = async (id) => {
    setLoading(true);
    const { error } = await supabase.from('maintenances')
        .update({ status: 'Cancelled', cancellation_pending: false })
        .eq('id', id);
    setLoading(false);
    if (!error) {
        setIsCancellationModalOpen(false);
        setCancellingItem(null);
        fetchMaintenances();
    } else {
        alert("Error: " + error.message);
    }
  };

  const handleOpenResolution = (item) => {
    setResolvingItem(item);
    setIsResolutionModalOpen(true);
  };

  const handleProceedToCompletion = () => {
    setIsResolutionModalOpen(false); 
    initiateCompletion(resolvingItem); 
  };

  const toggleVerified = async (id, currentStatus) => {
    if (!isHighLevel) return; 
    const newStatus = !currentStatus;
    const verifiedBy = newStatus ? userProfile.work_name : null;
    setMaintenances(prev => prev.map(m => m.id === id ? { ...m, setup_confirmed: newStatus, verified_by_name: verifiedBy } : m));
    await supabase.from('maintenances').update({ setup_confirmed: newStatus, verified_by_name: verifiedBy }).eq('id', id);
  };

  const initiateCompletion = (item) => {
    if (item.status === 'Completed' || item.status === 'Cancelled') {
      if (isHighLevel && window.confirm("Override: Mark as Pending?")) {
        toggleStatus(item.id, 'Upcoming');
      }
    } else {
      setCompletingItem(item);
      setSopChecks({ transfer: false, gameOpen: false, redmineUpdate: false });
      setIsCompletionModalOpen(true);
    }
  };

  const confirmCompletion = async (actualCompletionTime) => {
    const finalTimeISO = actualCompletionTime ? actualCompletionTime.toISOString() : new Date().toISOString();

    setMaintenances(prev => prev.map(m => m.id === completingItem.id ? { ...m, status: 'Completed', completion_time: finalTimeISO } : m));
    
    await supabase.from('maintenances')
      .update({ status: 'Completed', completion_time: finalTimeISO })
      .eq('id', completingItem.id);

    setIsCompletionModalOpen(false);
    setCompletingItem(null);
  };

  const toggleStatus = async (id, newStatus) => {
    setMaintenances(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
    await supabase.from('maintenances').update({ status: newStatus }).eq('id', id);
  };

  // --- NEW ENTRY: PRE-FILL TIME ---
  const handleOpenNewEntry = () => {
    setEditingId(null);
    setErrors({});
    const nowChina = dayjs().tz("Asia/Shanghai");
    
    // Pre-fill Start Time = Now, End Time = Now + 2 Hours
    setFormData({ 
        provider: '', 
        type: 'Scheduled', 
        isUntilFurtherNotice: false, 
        redmineLink: '', 
        startTime: nowChina, 
        endTime: nowChina.add(2, 'hour') 
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    const fullLink = item.redmine_ticket ? `${REDMINE_BASE_URL}${item.redmine_ticket}` : '';
    const startStr = dayjs(item.start_time).tz("Asia/Shanghai").format('YYYY-MM-DD HH:mm:ss');
    const formStartTime = dayjs(startStr);
    let formEndTime = null;
    if (item.end_time) {
        const endStr = dayjs(item.end_time).tz("Asia/Shanghai").format('YYYY-MM-DD HH:mm:ss');
        formEndTime = dayjs(endStr);
    }
    const itemType = item.status === 'Cancelled' ? 'Cancelled' : item.type;
    setFormData({ provider: item.provider, type: itemType, isUntilFurtherNotice: item.is_until_further_notice, redmineLink: fullLink, startTime: formStartTime, endTime: formEndTime });
    setIsModalOpen(true);
  };

  // --- SAVE LOGIC (NEW ENTRY) ---
  const handleConfirm = async (zonedStartTime, zonedEndTime) => {
    setLoading(true);

    const digitsOnly = formData.redmineLink ? formData.redmineLink.replace(/\D/g, '') : null; 
    
    let finalStatus = 'Upcoming';
    let isPendingCancel = false;
    let finalType = formData.type;

    if (formData.type === 'Cancelled') {
        finalStatus = 'Cancelled'; 
        finalType = 'Scheduled'; 
        isPendingCancel = false; 
    }

    const payload = {
      provider: formData.provider,
      type: finalType,
      start_time: zonedStartTime.toISOString(),
      end_time: (formData.isUntilFurtherNotice || formData.type === 'Cancelled') ? null : zonedEndTime.toISOString(),
      is_until_further_notice: formData.isUntilFurtherNotice,
      redmine_ticket: digitsOnly,
      recorder: userProfile.work_name || session.user.email,
      cancellation_pending: isPendingCancel
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('maintenances').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('maintenances').insert([{ ...payload, status: finalStatus }]));
    }
    
    setLoading(false);
    if (!error) {
      setIsModalOpen(false);
      resetForm();
      fetchMaintenances();
    } else {
      alert(error.message);
    }
  };

  const resetForm = () => { setEditingId(null); setErrors({}); };

  const getRedmineDisplayId = (ticketNum) => ticketNum ? `CS-${ticketNum.toString().replace(/\D/g, '')}` : '-';
  
  const formatSmartDate = (startIso, endIso, isNotice, status) => {
    if (!startIso) return '-';
    const start = toZonedTime(new Date(startIso), timeZone);
    const startStr = format(start, 'MMM dd', { timeZone });
    
    if (status === 'Cancelled') return startStr;

    const startTime = format(start, 'HH:mm', { timeZone });
    if (isNotice) return `${startStr}, ${startTime} → Until Notice`;
    if (!endIso) return `${startStr}, ${startTime}`;
    
    const end = toZonedTime(new Date(endIso), timeZone);
    const endStr = format(end, 'HH:mm', { timeZone });
    const fullEnd = format(end, 'MMM dd, HH:mm', { timeZone });
    return isSameDay(start, end) ? `${startStr}, ${startTime} - ${endStr}` : `${startStr}, ${startTime} - ${fullEnd}`;
  };

  const getStatusBadge = (item) => {
    if (item.deletion_pending) {
        return (
            <button onClick={() => isHighLevel && handleInitiateDelete(item)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 ${isHighLevel ? 'animate-pulse cursor-pointer hover:bg-red-100' : 'cursor-default'}`}>
                <Trash2 size={12} /> Pending Delete
            </button>
        );
    }
    if (item.status === 'Cancelled') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 cursor-default line-through">
                <Ban size={12} /> Cancelled
            </span>
        );
    }
    if (item.cancellation_pending) {
        return (
            <button onClick={() => isHighLevel && handleInitiateCancel(item)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 ${isHighLevel ? 'animate-pulse cursor-pointer hover:bg-orange-100' : 'cursor-default'}`}>
                <AlertTriangle size={12} /> Pending Cancel
            </button>
        );
    }
    if (item.status === 'Completed') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 cursor-default">
                <CheckCircle2 size={12} /> Completed
            </span>
        );
    }

    const now = new Date(); 
    const start = parseISO(item.start_time); 
    const end = item.end_time ? parseISO(item.end_time) : null;

    if (now < start) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 cursor-default">
                <Timer size={12} /> Upcoming
            </span>
        );
    }
    if (end && now > end) {
        return (
            <button onClick={() => handleOpenResolution(item)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 animate-pulse hover:bg-red-100 transition-colors">
                <AlertTriangle size={12} /> Action Required
            </button>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default">
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Ongoing
        </span>
    );
  };

  const filteredMaintenances = maintenances.filter(item => {
    if (view === 'pending') {
        if (item.status === 'Completed') return false;
        if (item.status === 'Cancelled') {
            const end = item.end_time ? parseISO(item.end_time) : parseISO(item.start_time);
            return isToday(end) || isFuture(end);
        }
        return true;
    } else {
        if (item.status === 'Completed') return true;
        if (item.status === 'Cancelled') {
             const end = item.end_time ? parseISO(item.end_time) : parseISO(item.start_time);
             return !isToday(end) && !isFuture(end);
        }
        return false;
    }
  });

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        
        {/* Active Toast Notification */}
        <NotificationToast notifications={notifications} removeNotification={removeNotification} onSnooze={handleSnooze} />

        {/* Header */}
        <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><div className="bg-gray-900 text-white w-6 h-6 rounded flex items-center justify-center font-bold text-xs">IC</div><span className="font-semibold text-sm tracking-tight text-gray-700">Maintenance Control</span></div>
            <div className="flex bg-gray-100 p-0.5 rounded-lg">
               <button onClick={() => setView('pending')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all ${view === 'pending' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-900'}`}><LayoutList size={12} /> Pending</button>
               <button onClick={() => setView('history')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all ${view === 'history' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-900'}`}><HistoryIcon size={12} /> History</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <span className="hidden md:block text-xs font-medium text-gray-500 animate-in fade-in slide-in-from-top-2">{getGreeting()}</span>
             
             {/* FEEDBACK BUTTON */}
             <button onClick={() => setIsFeedbackModalOpen(true)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="Submit Feedback"><MessageSquarePlus size={18} /></button>

             <div className="relative">
                <button onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)} className={`p-2 rounded-full transition-colors relative ${isNotifMenuOpen ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}>
                   <Bell size={18} />
                   {notificationHistory.length > 0 && <div className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></div>}
                </button>
                <NotificationMenu isOpen={isNotifMenuOpen} onClose={() => setIsNotifMenuOpen(false)} history={notificationHistory} onClear={() => setNotificationHistory([])} />
             </div>

             {isHighLevel && <button onClick={() => { fetchUserList(); setIsUserModalOpen(true); }} className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors"><Users size={18} /></button>}
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"><LogOut size={18} /></button>
            <div className="h-4 w-px bg-gray-300"></div>
            <div className="flex items-center gap-3 font-mono text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded border border-gray-200">
              <div className="flex items-center gap-2 border-r border-gray-300 pr-3 mr-1"><CalendarDays size={14} /><span>{format(zonedTime, 'EEE, MMM dd', { timeZone })}</span></div>
              <div className="flex items-center gap-2"><Clock size={14} /><span>{format(zonedTime, 'HH:mm:ss', { timeZone })}</span><span className="text-xs text-gray-400">UTC+8</span></div>
            </div>
            <button onClick={handleOpenNewEntry} className="bg-gray-900 hover:bg-black text-white px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-2"><Plus size={14} /> New Entry</button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">{view === 'pending' ? 'Pending Maintenance' : 'Maintenance History'}</h2>
              <span className="bg-gray-200 text-gray-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{filteredMaintenances.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md shadow-sm">
                <span className={`relative flex h-2 w-2`}>
                  {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isConnected ? 'Connected' : 'Offline'}</span>
            </div>
            <button onClick={handleManualRefresh} className="p-1.5 bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50">
                <RefreshCcw size={14} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="w-full">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 w-12 text-center">#</th>
                <th className="px-6 py-3">Redmine No</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Schedule (UTC+8)</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Recorder</th>
                <th className="px-6 py-3 text-center">Verified</th>
                <th className="px-6 py-3 text-center w-24">Done</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMaintenances.map((item, index) => (
                <tr key={item.id} className={`hover:bg-gray-50 transition-colors group ${item.status === 'Completed' || item.status === 'Cancelled' ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-6 py-3 text-center text-gray-400 text-xs">{index + 1}</td>
                  
                  {/* REDMINE: Hide if Cancelled */}
                  <td className="px-6 py-3">
                    {item.status !== 'Cancelled' && item.redmine_ticket ? <a href={`${REDMINE_BASE_URL}${item.redmine_ticket}`} target="_blank" rel="noopener noreferrer" className="font-mono text-indigo-600 hover:underline flex items-center gap-1 w-fit">{getRedmineDisplayId(item.redmine_ticket)} <ExternalLink size={10} className="opacity-0 group-hover:opacity-100" /></a> : <span className="text-gray-400">-</span>}
                  </td>
                  
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2"><Gamepad2 size={14} className="text-gray-400" /><div><div className={`font-medium ${item.status === 'Completed' || item.status === 'Cancelled' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{item.provider}</div><div className="text-xs text-gray-500 mt-0.5">{item.status === 'Cancelled' ? 'Cancelled' : item.type}</div></div></div>
                  </td>
                  <td className="px-6 py-3 font-mono text-gray-600 text-xs">{formatSmartDate(item.start_time, item.end_time, item.is_until_further_notice, item.status)}</td>
                  
                  <td className="px-6 py-3">
                    {getStatusBadge(item)}
                  </td>

                  <td className="px-6 py-3 text-gray-600 text-xs"><div className="flex items-center gap-2" title={item.recorder}><User size={14} className="text-gray-400" /><span className="truncate max-w-[120px]">{item.recorder}</span></div></td>
                  <td className="px-6 py-3 text-center">
                      <button onClick={() => toggleVerified(item.id, item.setup_confirmed)} className={`flex items-center justify-center gap-1 mx-auto transition-all ${!isHighLevel ? 'cursor-default' : 'hover:scale-110 active:scale-95'}`} title={item.setup_confirmed ? `Verified by ${item.verified_by_name}` : "Not Verified"}>
                        {item.setup_confirmed ? <><ShieldCheck size={18} className="text-blue-600 fill-blue-50" />{!isHighLevel && <span className="text-[10px] font-bold text-gray-500">{item.verified_by_name}</span>}</> : <Shield size={18} className="text-gray-300" />}
                      </button>
                  </td>
                  
                  {/* DONE BUTTON: Disabled if Cancelled */}
                  <td className="px-6 py-3 text-center">
                    <button disabled={item.status === 'Cancelled'} onClick={() => initiateCompletion(item)} className={`transition-colors p-1 rounded-md hover:bg-gray-100 ${item.status === 'Completed' ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-500'} ${item.status === 'Cancelled' ? 'opacity-0 cursor-default' : ''}`}>
                        <CheckSquare size={18} fill={item.status === 'Completed' ? "currentColor" : "none"} className={item.status === 'Completed' ? "text-emerald-100" : ""} />
                    </button>
                  </td>
                  
                  <td className="px-6 py-3 text-right">
                     <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(item)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Edit"><Edit2 size={15} /></button>
                        
                        {/* BAN: Only show if NOT cancelled (to cancel active ones) */}
                        {item.status !== 'Cancelled' && (
                            <button onClick={() => handleInitiateCancel(item)} className="text-gray-400 hover:text-orange-600 hover:bg-orange-50 p-1.5 rounded transition-colors" title="Cancel Maintenance"><Ban size={15} /></button>
                        )}

                        {/* DELETE: Show for everyone (Request vs Confirm) */}
                        <button onClick={() => handleInitiateDelete(item)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors" title="Delete Entry"><Trash2 size={15} /></button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <EntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} formData={formData} setFormData={setFormData} handleConfirm={handleConfirm} loading={loading} editingId={editingId} errors={errors} setErrors={setErrors} existingMaintenances={maintenances} />
        <CompletionModal isOpen={isCompletionModalOpen} onClose={() => setIsCompletionModalOpen(false)} onConfirm={confirmCompletion} item={completingItem} sopChecks={sopChecks} setSopChecks={setSopChecks} />
        <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} userTab={userTab} setUserTab={setUserTab} userList={userList} userForm={userForm} setUserForm={setUserForm} loading={loading} handleCreateUser={handleCreateUser} handleUpdateUser={handleUpdateUser} handleDeleteUser={handleDeleteUser} editingUser={editingUser} setEditingUser={setEditingUser} newUserCredentials={newUserCredentials} setNewUserCredentials={setNewUserCredentials} generatePassword={() => { const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"; let pass = ""; for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length)); setUserForm(prev => ({ ...prev, password: pass })); }} />
        <DeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} loading={loading} />
        <ResolutionModal isOpen={isResolutionModalOpen} onClose={() => setIsResolutionModalOpen(false)} item={resolvingItem} onExtend={handleExtendMaintenance} onComplete={handleProceedToCompletion} loading={loading} />
        <CancellationModal isOpen={isCancellationModalOpen} onClose={() => setIsCancellationModalOpen(false)} item={cancellingItem} onConfirm={handleConfirmCancel} loading={loading} />
        <CancelRequestModal isOpen={isCancelRequestModalOpen} onClose={() => setIsCancelRequestModalOpen(false)} item={cancellingItem} onConfirm={handleRequestCancelConfirm} loading={loading} />
        <DeleteRequestModal isOpen={isDeleteRequestModalOpen} onClose={() => setIsDeleteRequestModalOpen(false)} item={deleteRequestId} onConfirm={handleRequestDeleteConfirm} loading={loading} />
        {/* FEEDBACK MODAL: No database prop, it handles email internally */}
        <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} userName={userProfile.work_name || 'User'} />
      </div>
    </LocalizationProvider>
  );
};

export default Dashboard;