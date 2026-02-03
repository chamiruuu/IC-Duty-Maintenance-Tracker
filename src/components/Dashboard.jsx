import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

// --- FIXED IMPORTS ---
import { format, toZonedTime } from "date-fns-tz";
import {
  isSameDay,
  differenceInMinutes,
  parseISO,
  addHours,
  addMinutes,
  isFuture,
  isToday,
  addDays,
} from "date-fns";
// ---------------------

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

import {
  Clock,
  Plus,
  ExternalLink,
  RefreshCcw,
  Trash2,
  Edit2,
  CalendarDays,
  Gamepad2,
  User,
  CheckSquare,
  History as HistoryIcon,
  LayoutList,
  ShieldCheck,
  Shield,
  Users,
  LogOut,
  Check,
  Bell,
  Zap,
  PlayCircle,
  AlertTriangle,
  Timer,
  CheckCircle2,
  Ban,
  MessageSquarePlus,
  Eraser,
  Lock,
  Info,
  Activity,
  Calendar,
  Settings,
  Filter,
  Search,
  X,
  Archive,
} from "lucide-react";

import NotificationToast from "./NotificationToast";
import NotificationMenu from "./NotificationMenu";
import EntryModal from "./modals/EntryModal";
import CompletionModal from "./modals/CompletionModal";
import UserModal from "./modals/UserModal";
import DeleteModal from "./modals/DeleteModal";
import ResolutionModal from "./modals/ResolutionModal";
import CancellationModal from "./modals/CancellationModal";
import CancelRequestModal from "./modals/CancelRequestModal";
import DeleteRequestModal from "./modals/DeleteRequestModal";
import FeedbackModal from "./modals/FeedbackModal";
import ConfirmationModal from "./modals/ConfirmationModal";
import ScheduleModal from "./modals/ScheduleModal";
import ProviderManagerModal from "./modals/ProviderManagerModal"; // NEW IMPORT
import { getChecklistForDate } from "../lib/scheduleRules";
import { generateUrgentScript } from "../lib/scriptGenerator";
import ArchiveManagerModal from './modals/ArchiveManagerModal';

const REDMINE_BASE_URL = "https://bugtracking.ickwbase.com/issues/";

const playNotificationSound = () => {
  try {
    const audio = new Audio("/notification.mp3");
    audio.volume = 0.5;
    audio.play().catch((e) => {
      console.error("Audio play blocked", e);
    });
  } catch (e) {
    console.error("Audio failed", e);
  }
};

const Dashboard = ({ session }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState({
    role: "normal",
    work_name: "",
  });
  const isHighLevel = ["admin", "leader"].includes(userProfile.role);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(null); // null = All Dates
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterRef = useRef(null); // To close menu when clicking outside

  // --- PRESENCE STATE ---
  const [activeUsers, setActiveUsers] = useState([]);
  const [isPresenceMenuOpen, setIsPresenceMenuOpen] = useState(false);

  // --- SCHEDULE STATE ---
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [checklistAlerted, setChecklistAlerted] = useState(false);

  // --- PROVIDER MANAGEMENT STATE (NEW) ---
  const [providersList, setProvidersList] = useState([]);
  const [isProviderManagerOpen, setIsProviderManagerOpen] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [isCancelRequestModalOpen, setIsCancelRequestModalOpen] =
    useState(false);
  const [isDeleteRequestModalOpen, setIsDeleteRequestModalOpen] =
    useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [resolutionInitialMode, setResolutionInitialMode] = useState("select");
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  const [actionConfig, setActionConfig] = useState(null);

  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("pending");

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
  const [sopChecks, setSopChecks] = useState({
    transfer: false,
    gameOpen: false,
    redmineUpdate: false,
  });

  const [userTab, setUserTab] = useState("list");
  const [userForm, setUserForm] = useState({
    email: "",
    workName: "",
    password: "",
    role: "normal",
  });
  const [editingUser, setEditingUser] = useState(null);
  const [newUserCredentials, setNewUserCredentials] = useState(null);

  // --- UPDATED: Initial Form State to include new fields ---
  const [formData, setFormData] = useState({
    provider: "",
    type: "Scheduled",
    isUntilFurtherNotice: false,
    redmineLink: "",
    startTime: null,
    endTime: null,
    affectedGames: "", // New field for Part of the Game
    isInHouse: false, // New field for Restricted/In-House
  });

  // --- INITIAL DATA & TIME SYNC (HARDENED FOR BACKGROUND USE) ---
  useEffect(() => {
    fetchUserProfile();
    fetchMaintenances();

    // 1. Request Notification Permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // 2. Force Refresh on Network Reconnect
    const handleOnline = () => {
      setIsConnected(true);
      fetchMaintenances();
      triggerNotification(
        "System Online",
        "Connection restored. Data updated.",
        "success",
      );
    };

    const handleOffline = () => {
      setIsConnected(false);
      triggerNotification(
        "System Offline",
        "Lost connection to server.",
        "error",
      );
    };

    // 3. Force Refresh when Tab becomes Visible (User clicks back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchMaintenances();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. REAL-TIME SUBSCRIPTION
    const channelName = `maintenances_tracker_${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "maintenances" },
        () => {
          fetchMaintenances();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsConnected(true);
        else if (status === "CLOSED" || status === "CHANNEL_ERROR")
          setIsConnected(false);
      });

    // 5. SAFETY POLLING (Fallback Method) - Runs every 60s
    const pollingTimer = setInterval(() => {
      if (document.visibilityState === "hidden") {
        fetchMaintenances();
      }
    }, 60000);

    // 6. Clock Timer
    const clockTimer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setNotificationHistory((prev) =>
        prev.filter((n) => differenceInMinutes(now, n.timestamp) <= 10),
      );
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(pollingTimer);
      clearInterval(clockTimer);
    };
  }, []);

  // --- FETCH PROVIDERS FROM DB (NEW) ---
  useEffect(() => {
    const fetchProviders = async () => {
      const { data } = await supabase
        .from("providers")
        .select("*")
        .order("name", { ascending: true });
      if (data) setProvidersList(data);
    };
    fetchProviders();
  }, [isProviderManagerOpen]); // Refresh when manager closes

  // --- PRESENCE SYSTEM ---
  useEffect(() => {
    if (!userProfile.work_name) return;

    const presenceChannel = supabase.channel("system_presence", {
      config: { presence: { key: session.user.id } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const users = [];
        for (const key in state) {
          if (state[key] && state[key].length > 0) {
            users.push(state[key][0]);
          }
        }
        setActiveUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            name: userProfile.work_name,
            role: userProfile.role,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [userProfile.work_name]);

  // --- NOTIFICATION & SCHEDULE LOGIC ---
  useEffect(() => {
    const checkTimer = setInterval(() => {
      const now = new Date();
      const timeZone = "Asia/Shanghai";

      // --- 9:00 AM SCHEDULE CHECK ---
      const nowZoned = toZonedTime(now, timeZone);
      const currentHour = parseInt(format(nowZoned, "H", { timeZone }));

      if (currentHour >= 9 && !checklistAlerted && maintenances.length > 0) {
        const tomorrow = addDays(nowZoned, 1);
        const checklist = getChecklistForDate(tomorrow, maintenances);
        const missingCount = checklist.filter(
          (i) => i.status === "missing",
        ).length;

        if (missingCount > 0) {
          const missingNames = checklist
            .filter((i) => i.status === "missing")
            .map((i) => i.provider)
            .join(", ");
          triggerNotification(
            "Daily Schedule Alert",
            `⚠️ Missing ${missingCount} checks for tomorrow (${format(tomorrow, "MMM dd")}): ${missingNames}. Please check the Schedule.`,
            "warning",
          );
          setChecklistAlerted(true);
        } else {
          setChecklistAlerted(true);
        }
      }
      // Reset alert flag next day
      if (currentHour === 1 && checklistAlerted) {
        setChecklistAlerted(false);
      }

      maintenances.forEach((m) => {
        // 1. COMPLETED/CANCELLED CHECK (Existing Logic)
        if (m.status === "Cancelled" || m.status === "Completed") {
          if (m.status === "Completed" && !m.bo_deleted && m.completion_time) {
            const completeDate = parseISO(m.completion_time);
            const twoHoursLater = addHours(completeDate, 2);

            // Difference: (Now - Target).
            // If positive, Now is PAST the target.
            const diff = differenceInMinutes(now, twoHoursLater);

            const reminderId = `${m.id}-2hr-reminder`;

            // UPDATED: Check (diff >= 0) to ensure we are AFTER the 2-hour mark
            if (diff >= 0 && diff <= 5 && !alertedRef.current.has(reminderId)) {
              triggerNotification(
                `Action Required: BO 8.2 Cleanup`,
                `2 hours have passed since completion for ${m.provider}. Please delete announcement & confirm.`,
                "warning", // This type triggers browser notification
              );
              alertedRef.current.add(reminderId);
            }
          }
          return;
        }

        // 2. "UNTIL FURTHER NOTICE" LOGIC (Shift Boundary System)
        if (m.is_until_further_notice) {
          const SHANGHAI_TZ = "Asia/Shanghai";
          const nowZoned = toZonedTime(now, SHANGHAI_TZ);
          const currentH = parseInt(
            format(nowZoned, "H", { timeZone: SHANGHAI_TZ }),
          );
          const currentM = parseInt(
            format(nowZoned, "m", { timeZone: SHANGHAI_TZ }),
          );
          const currentTimeValue = currentH + currentM / 60;

          // --- GET FIRST NAME ---
          const rawName = userProfile.work_name || "User";
          const firstName = rawName.split(" ")[0].trim();
          // ----------------------

          // Define Shift Start Times (UTC+8)
          // 07:00 (Morning), 14:45 (Afternoon), 22:45 (Night)
          const shiftBoundaries = [7.0, 14.75, 22.75];

          shiftBoundaries.forEach((boundary) => {
            const timeSinceShiftStart = currentTimeValue - boundary;

            if (timeSinceShiftStart >= 0 && timeSinceShiftStart < 0.75) {
              // We are at the start of a shift!
              const boundaryDate = toZonedTime(now, SHANGHAI_TZ);
              boundaryDate.setHours(Math.floor(boundary));
              boundaryDate.setMinutes((boundary % 1) * 60);
              boundaryDate.setSeconds(0);

              const maintenanceStart = toZonedTime(
                parseISO(m.start_time),
                SHANGHAI_TZ,
              );

              if (maintenanceStart < boundaryDate) {
                const alertId = `${m.id}-shift-check-${format(nowZoned, "yyyy-MM-dd")}-${boundary}`;

                if (!alertedRef.current.has(alertId)) {
                  // --- UPDATED SCRIPT HERE ---
                  const script = `Hi Team this is ${firstName}, Asking for an update regarding the ${m.provider} maintenance. Is there an estimated time for completion? Thank you.`;

                  triggerNotification(
                    `Shift Handover Check: ${m.provider}`,
                    `New Shift Started (${format(boundaryDate, "HH:mm")}). Please follow up with provider.`,
                    "warning",
                    script,
                  );
                  alertedRef.current.add(alertId);
                }
              }
            }
          });
          return;
        }

        // 3. STANDARD SCHEDULED LOGIC (Fixed End Time)
        if (!m.end_time) return;

        const endDate = parseISO(m.end_time);
        const minutesLeft = differenceInMinutes(endDate, now);
        const minutesPast = differenceInMinutes(now, endDate);

        // --- UPDATE START: Get First Name Only ---
        const rawName = userProfile.work_name || "User";
        const firstName = rawName.split(" ")[0].trim();
        // -----------------------------------------

        const alertId30 = `${m.id}-30min-warn`;
        if (
          minutesLeft <= 30 &&
          minutesLeft > 25 &&
          !alertedRef.current.has(alertId30)
        ) {
          const endStr = format(parseISO(m.end_time), "HH:mm");
          // UPDATED: Uses ${firstName}
          const script = `Hi Team, This is ${firstName}. May we confirm if the maintenance end on time ${endStr}? Thank You.`;
          triggerNotification(
            `30-Min Check: ${m.provider}`,
            `Time to confirm status. Click to copy script.`,
            "warning",
            script,
          );
          alertedRef.current.add(alertId30);
        }

        const alertIdGrace = `${m.id}-grace-period`;
        if (
          minutesPast > 0 &&
          minutesPast <= 5 &&
          !alertedRef.current.has(alertIdGrace)
        ) {
          // UPDATED: Uses ${firstName}
          const script = `Hi Team, this is ${firstName}. May we confirm if the scheduled maintenance is completed now ? Thank You.`;
          triggerNotification(
            `Scheduled Time Reached`,
            `Please confirm completion for 【${m.provider}】.`,
            "warning",
            script,
          );
          alertedRef.current.add(alertIdGrace);
        }

        if (minutesPast > 5) {
          const snoozedUntil = m.snoozed_until
            ? parseISO(m.snoozed_until)
            : null;
          if (!snoozedUntil || now >= snoozedUntil) {
            const minuteId = Math.floor(Date.now() / 60000);
            const nagId = `${m.id}-overdue-${minuteId}`;
            if (!alertedRef.current.has(nagId)) {
              triggerNotification(
                `CRITICAL OVERDUE: ${m.provider}`,
                `Exceeded >5 mins. Immediate Extension or Completion required.`,
                "urgent",
                null,
                m.id,
              );
              alertedRef.current.add(nagId);
            }
          }
        }
      });
    }, 5000);
    return () => clearInterval(checkTimer);
  }, [maintenances, userProfile, checklistAlerted]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSnooze = async (maintenanceId, notificationId) => {
    removeNotification(notificationId);
    const snoozedTime = addMinutes(new Date(), 5).toISOString();
    await supabase
      .from("maintenances")
      .update({ snoozed_until: snoozedTime })
      .eq("id", maintenanceId);
    setMaintenances((prev) =>
      prev.map((m) =>
        m.id === maintenanceId ? { ...m, snoozed_until: snoozedTime } : m,
      ),
    );
  };

  const triggerNotification = (
    title,
    message,
    type,
    copyText = null,
    maintenanceId = null,
  ) => {
    playNotificationSound();
    const id = Date.now();
    setNotifications((prev) => [
      ...prev,
      { id, title, message, type, copyText, maintenanceId },
    ]);
    setNotificationHistory((prev) => [
      { id, title, message, type, timestamp: new Date(), copyText },
      ...prev,
    ]);

    // BROWSER NOTIFICATION LOGIC
    if (
      type !== "success" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(title, { body: message });
    }

    setTimeout(() => removeNotification(id), 20000);
  };
  const removeNotification = (id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const executeAction = async (actionType, payload) => {
    try {
      setLoading(true);
      let error = null;

      if (actionType === "OVERRIDE_PENDING") {
        const { itemId } = payload;
        await toggleStatus(itemId, "Upcoming");
      } else if (actionType === "CONFIRM_BO_DELETE") {
        const { item } = payload;
        const deleterName = userProfile.work_name || "User";
        const now = new Date().toISOString();
        setMaintenances((prev) =>
          prev.map((m) =>
            m.id === item.id
              ? {
                  ...m,
                  bo_deleted: true,
                  bo_deleted_by: deleterName,
                  bo_deleted_at: now,
                }
              : m,
          ),
        );
        const { error: err } = await supabase
          .from("maintenances")
          .update({
            bo_deleted: true,
            bo_deleted_by: deleterName,
            bo_deleted_at: now,
          })
          .eq("id", item.id);
        error = err;
        if (!error)
          triggerNotification(
            "Success",
            `BO 8.2 cleanup confirmed for ${item.provider}.`,
            "success",
          );
      } else if (actionType === "UNDO_COMPLETION") {
        const { item } = payload;
        setMaintenances((prev) =>
          prev.map((m) =>
            m.id === item.id
              ? {
                  ...m,
                  status: "Upcoming",
                  completion_time: null,
                  completed_by: null,
                }
              : m,
          ),
        );
        const { error: err } = await supabase
          .from("maintenances")
          .update({
            status: "Upcoming",
            completion_time: null,
            completed_by: null,
          })
          .eq("id", item.id);
        error = err;
        if (!error)
          triggerNotification(
            "Success",
            `Completion undone for ${item.provider}. Status reverted to Pending.`,
            "success",
          );
      } else if (actionType === "UNDO_BO_CLEAN") {
        const { item } = payload;
        setMaintenances((prev) =>
          prev.map((m) =>
            m.id === item.id
              ? {
                  ...m,
                  bo_deleted: false,
                  bo_deleted_by: null,
                  bo_deleted_at: null,
                }
              : m,
          ),
        );
        const { error: err } = await supabase
          .from("maintenances")
          .update({
            bo_deleted: false,
            bo_deleted_by: null,
            bo_deleted_at: null,
          })
          .eq("id", item.id);
        error = err;
        if (!error)
          triggerNotification(
            "Success",
            `BO 8.2 cleanup undone for ${item.provider}. Please clean again.`,
            "success",
          );
      }

      if (error)
        triggerNotification(
          "Error",
          error.message || "An error occurred.",
          "error",
        );
      setActionConfig(null);
    } catch (err) {
      triggerNotification(
        "Error",
        err.message || "An unexpected error occurred.",
        "error",
      );
      setActionConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const timeZone = "Asia/Shanghai";
  const zonedTime = toZonedTime(currentTime, timeZone);

  const getGreeting = () => {
    const h = parseInt(format(zonedTime, "H", { timeZone }));
    const m = parseInt(format(zonedTime, "m", { timeZone }));

    // Convert time to decimal (e.g., 14:30 becomes 14.5)
    const timeVal = h + m / 60;
    const name = userProfile.work_name || "User";

    // 07:00 to 14:29 -> Morning
    if (timeVal >= 7 && timeVal < 14.5) return `Good Morning, ${name}`;

    // 14:30 to 21:59 -> Afternoon
    if (timeVal >= 14.5 && timeVal < 22) return `Good Afternoon, ${name}`;

    // 22:00 to 06:59 -> Night
    return `Good Night, ${name}`;
  };

  const fetchUserProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    if (data) setUserProfile(data);
    else
      setUserProfile({
        role: "normal",
        work_name: session.user.email.split("@")[0],
      });
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };
  const fetchUserList = async () => {
    if (!isHighLevel) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setUserList(data);
  };

  const handleCreateUser = async () => {
    if (!userForm.email || !userForm.workName || !userForm.password) {
      triggerNotification(
        "Validation Error",
        "Please fill all required fields.",
        "error",
      );
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("create_new_user", {
      new_email: userForm.email,
      new_password: userForm.password,
      new_work_name: userForm.workName,
      new_role: userForm.role,
    });
    setLoading(false);
    if (error) triggerNotification("Error", error.message, "error");
    else {
      setNewUserCredentials({
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        workName: userForm.workName,
      });
      setUserForm({ email: "", workName: "", password: "", role: "normal" });
      fetchUserList();
      triggerNotification(
        "Success",
        `User ${userForm.email} created successfully.`,
        "success",
      );
    }
  };
  const handleUpdateUser = async (userId, updates) => {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);
    if (error)
      triggerNotification("Error", `Update failed: ${error.message}`, "error");
    else {
      setEditingUser(null);
      fetchUserList();
      triggerNotification("Success", "User updated successfully.", "success");
    }
  };
  const handleDeleteUser = async (userId, userName) => {
    const { error } = await supabase.rpc("delete_user", {
      target_user_id: userId,
    });
    if (error)
      triggerNotification("Error", `Delete failed: ${error.message}`, "error");
    else {
      fetchUserList();
      triggerNotification(
        "Success",
        `User ${userName} deleted successfully.`,
        "success",
      );
    }
  };

  const fetchMaintenances = async () => {
    const { data, error } = await supabase
      .from("maintenances")
      .select("*")
      .order("start_time", { ascending: true });
    if (!error) setMaintenances(data);
  };
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchMaintenances();
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const handleInitiateDelete = (item) => {
    if (isHighLevel) {
      setDeletingId(item.id);
      setIsDeleteModalOpen(true);
    } else {
      setDeleteRequestId(item);
      setIsDeleteRequestModalOpen(true);
    }
  };
  const handleRequestDeleteConfirm = async (item) => {
    const { error } = await supabase
      .from("maintenances")
      .update({ deletion_pending: true })
      .eq("id", item.id);
    if (!error) {
      setIsDeleteRequestModalOpen(false);
      setDeleteRequestId(null);
      fetchMaintenances();
    }
  };
  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setLoading(true);
    setMaintenances((prev) => prev.filter((m) => m.id !== deletingId));
    await supabase.from("maintenances").delete().eq("id", deletingId);
    setLoading(false);
    setIsDeleteModalOpen(false);
    setDeletingId(null);
  };
  const handleRejectDelete = async () => {
    if (!deletingId) return;
    setLoading(true);
    const { error } = await supabase
      .from("maintenances")
      .update({ deletion_pending: false })
      .eq("id", deletingId);
    setLoading(false);
    if (!error) {
      triggerNotification(
        "Success",
        "Delete request rejected. Entry restored.",
        "success",
      );
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      fetchMaintenances();
    } else triggerNotification("Error", error.message, "error");
  };

  const handleExtendMaintenance = async (id, newEndTimeDayJs, isNotice) => {
    setLoading(true);
    const payload = {
      is_until_further_notice: isNotice,
      end_time: isNotice ? null : newEndTimeDayJs.toISOString(),
      type: "Extended Maintenance",
    };
    const { error } = await supabase
      .from("maintenances")
      .update(payload)
      .eq("id", id);
    setLoading(false);
    if (!error) {
      setIsResolutionModalOpen(false);
      fetchMaintenances();
    }
  };
  const handleInitiateCancel = (item) => {
    setCancellingItem(item);
    if (isHighLevel) setIsCancellationModalOpen(true);
    else setIsCancelRequestModalOpen(true);
  };
  const handleRequestCancelConfirm = async (item) => {
    const { error } = await supabase
      .from("maintenances")
      .update({ cancellation_pending: true })
      .eq("id", item.id);
    if (!error) {
      setIsCancelRequestModalOpen(false);
      setCancellingItem(null);
      fetchMaintenances();
    }
  };
  const handleConfirmCancel = async (id) => {
    setLoading(true);
    const { error } = await supabase
      .from("maintenances")
      .update({ status: "Cancelled", cancellation_pending: false })
      .eq("id", id);
    setLoading(false);
    if (!error) {
      setIsCancellationModalOpen(false);
      setCancellingItem(null);
      fetchMaintenances();
    }
  };
  const handleOpenResolution = (item, mode = "select") => {
    setResolvingItem(item);
    setResolutionInitialMode(mode);
    setIsResolutionModalOpen(true);
  };
  const handleProceedToCompletion = () => {
    setIsResolutionModalOpen(false);
    initiateCompletion(resolvingItem);
  };

  const initiateCompletion = (item) => {
    if (item.status === "Completed" || item.status === "Cancelled") {
      if (item.status === "Completed" && !item.bo_deleted) return;
      if (isHighLevel) {
        setActionConfig({
          type: "OVERRIDE_PENDING",
          title: "Override Completion Status",
          message: `Mark ${item.provider} as Pending again?`,
          confirmText: "Override",
          payload: { itemId: item.id },
        });
      }
    } else {
      setCompletingItem(item);
      setSopChecks({ transfer: false, gameOpen: false, redmineUpdate: false });
      setIsCompletionModalOpen(true);
    }
  };

  const confirmCompletion = async (actualCompletionTime) => {
    const finalTimeISO = actualCompletionTime
      ? actualCompletionTime.toISOString()
      : new Date().toISOString();
    const completerName = userProfile.work_name || "User";
    setMaintenances((prev) =>
      prev.map((m) =>
        m.id === completingItem.id
          ? {
              ...m,
              status: "Completed",
              completion_time: finalTimeISO,
              completed_by: completerName,
            }
          : m,
      ),
    );
    await supabase
      .from("maintenances")
      .update({
        status: "Completed",
        completion_time: finalTimeISO,
        completed_by: completerName,
      })
      .eq("id", completingItem.id);
    setIsCompletionModalOpen(false);
    setCompletingItem(null);

    // --- NEW: Generate Finish Script for Urgent Completion ---
    let finishScript = null;
    if (completingItem.type === "Urgent") {
      const scriptData = {
        provider: completingItem.provider,
        startTime: completingItem.start_time,
        endTime: null,
        isUntilFurtherNotice: false,
      };
      const scripts = generateUrgentScript(scriptData);
      finishScript = scripts.finishMessage;
    }
    triggerNotification(
      "Success",
      "Maintenance Completed.",
      "success",
      finishScript,
    );
  };

  const handleConfirmBODeleted = (item) => {
    setActionConfig({
      type: "CONFIRM_BO_DELETE",
      title: "Confirm BO 8.2 Cleanup",
      message: `Confirm BO 8.2 Announcement has been DELETED for ${item.provider}?`,
      confirmText: "Confirm",
      payload: { item },
    });
  };
  const handleUndoCompletion = (item) => {
    if (!isHighLevel) return;
    if (item.bo_deleted) {
      triggerNotification(
        "Warning",
        `Please Undo 'BO Clean' first.`,
        "warning",
      );
      return;
    }
    setActionConfig({
      type: "UNDO_COMPLETION",
      title: "Undo Completion",
      message: `Undo Completion for ${item.provider}? This will revert it to 'Pending'.`,
      confirmText: "Undo",
      payload: { item },
    });
  };
  const handleUndoBOClean = (item) => {
    if (!isHighLevel) return;
    setActionConfig({
      type: "UNDO_BO_CLEAN",
      title: "Undo BO 8.2 Cleanup",
      message: `Undo BO 8.2 Clean for ${item.provider}? This will require cleaning again.`,
      confirmText: "Undo",
      payload: { item },
    });
  };
  const toggleStatus = async (id, newStatus) => {
    setMaintenances((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m)),
    );
    await supabase
      .from("maintenances")
      .update({ status: newStatus })
      .eq("id", id);
  };

  const handleOpenNewEntry = (prefillProvider = null, prefillDate = null) => {
    setEditingId(null);
    setErrors({});
    let startTime = dayjs().tz("Asia/Shanghai");
    if (prefillDate)
      startTime = dayjs(prefillDate)
        .tz("Asia/Shanghai")
        .hour(10)
        .minute(0)
        .second(0);
    // --- UPDATED: Reset new fields ---
    setFormData({
      provider: typeof prefillProvider === "string" ? prefillProvider : "",
      type: "Scheduled",
      isUntilFurtherNotice: false,
      redmineLink: "",
      startTime: startTime,
      endTime: startTime.add(2, "hour"),
      affectedGames: "",
      isInHouse: false,
    });
    setIsModalOpen(true);
    setIsScheduleModalOpen(false);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    const fullLink = item.redmine_ticket
      ? `${REDMINE_BASE_URL}${item.redmine_ticket}`
      : "";
    const startStr = dayjs(item.start_time)
      .tz("Asia/Shanghai")
      .format("YYYY-MM-DD HH:mm:ss");
    const formStartTime = dayjs(startStr);
    let formEndTime = null;
    if (item.end_time) {
      const endStr = dayjs(item.end_time)
        .tz("Asia/Shanghai")
        .format("YYYY-MM-DD HH:mm:ss");
      formEndTime = dayjs(endStr);
    }
    const itemType = item.status === "Cancelled" ? "Cancelled" : item.type;
    // --- UPDATED: Populate new fields from item ---
    setFormData({
      provider: item.provider,
      type: itemType,
      isUntilFurtherNotice: item.is_until_further_notice,
      redmineLink: fullLink,
      startTime: formStartTime,
      endTime: formEndTime,
      affectedGames: item.affected_games || "",
      isInHouse: item.is_in_house || false,
    });
    setIsModalOpen(true);
  };

  const handleConfirm = async (zonedStartTime, zonedEndTime) => {
    setLoading(true);
    const digitsOnly = formData.redmineLink
      ? formData.redmineLink.replace(/\D/g, "")
      : null;
    let finalStatus = "Upcoming";
    let isPendingCancel = false;
    let finalType = formData.type;
    if (formData.type === "Cancelled") {
      finalStatus = "Cancelled";
      finalType = "Cancelled";
      isPendingCancel = false;
    }

    const payload = {
      provider: formData.provider,
      type: finalType,
      start_time: zonedStartTime.toISOString(),
      end_time:
        formData.isUntilFurtherNotice ||
        formData.type === "Cancelled" ||
        !zonedEndTime
          ? null
          : zonedEndTime.toISOString(),
      is_until_further_notice: formData.isUntilFurtherNotice,
      redmine_ticket: digitsOnly,
      recorder: userProfile.work_name || session.user.email,
      cancellation_pending: isPendingCancel,
      affected_games: formData.affectedGames,
      is_in_house: formData.isInHouse,

      // --- ADD THIS LINE ---
      status: finalStatus,
      // --------------------
    };

    let error;
    if (editingId)
      ({ error } = await supabase
        .from("maintenances")
        .update(payload)
        .eq("id", editingId));
    // You can also simplify the insert line below since status is now in payload:
    else
      ({ error } = await supabase
        .from("maintenances")
        .insert([{ ...payload }]));

    setLoading(false);
    if (!error) {
      setIsModalOpen(false);
      setEditingId(null);
      setErrors({});
      fetchMaintenances();
      triggerNotification(
        "Success",
        `Maintenance entry ${editingId ? "updated" : "created"} successfully.`,
        "success",
      );
    } else triggerNotification("Error", error.message, "error");
  };

  const getRedmineDisplayId = (ticketNum) =>
    ticketNum ? `CS-${ticketNum.toString().replace(/\D/g, "")}` : "-";
  const formatSmartDate = (startIso, endIso, isNotice, status) => {
    if (!startIso) return "-";
    const start = toZonedTime(new Date(startIso), timeZone);
    const startStr = format(start, "MMM dd", { timeZone });
    if (status === "Cancelled") return startStr;
    const startTime = format(start, "HH:mm", { timeZone });
    if (isNotice) return `${startStr}, ${startTime} → Until Notice`;
    if (!endIso) return `${startStr}, ${startTime}`;
    const end = toZonedTime(new Date(endIso), timeZone);
    const endStr = format(end, "HH:mm", { timeZone });
    const fullEnd = format(end, "MMM dd, HH:mm", { timeZone });
    return isSameDay(start, end)
      ? `${startStr}, ${startTime} - ${endStr}`
      : `${startStr}, ${startTime} - ${fullEnd}`;
  };

  const getTypeBadge = (item) => {
    if (item.type === "Extended Maintenance")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 animate-pulse">
          EXTENDED
        </span>
      );
    if (item.type === "Urgent")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
          URGENT
        </span>
      );
    if (item.type === "Cancelled" || item.status === "Cancelled")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-500 border border-gray-300 line-through">
          CANCELLED
        </span>
      );
    // --- UPDATED: New Badge for Part of the Game ---
    if (item.type === "Part of the Game")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
          PART OF GAME
        </span>
      );

    if (item.status === "Completed" && item.completion_time && item.end_time) {
      const actual = parseISO(item.completion_time);
      const planned = parseISO(item.end_time);
      if (differenceInMinutes(planned, actual) > 5) {
        const displayTime = format(toZonedTime(actual, timeZone), "HH:mm", {
          timeZone,
        });
        return (
          <div className="relative group inline-block cursor-help">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-200 transition-colors">
              EARLY <Clock size={10} />
            </span>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block whitespace-nowrap bg-gray-900 text-white text-[10px] py-1 px-2 rounded shadow-lg z-50">
              Completion Time: {displayTime}
            </div>
          </div>
        );
      }
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
        SCHEDULED
      </span>
    );
  };

  const getStatusBadge = (item) => {
    if (item.deletion_pending)
      return (
        <button
          onClick={() => isHighLevel && handleInitiateDelete(item)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 ${isHighLevel ? "animate-pulse cursor-pointer hover:bg-red-100" : "cursor-default"}`}
        >
          <Trash2 size={12} /> Pending Delete
        </button>
      );
    if (item.status === "Cancelled")
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 cursor-default line-through">
          <Ban size={12} /> Cancelled
        </span>
      );
    if (item.cancellation_pending)
      return (
        <button
          onClick={() => isHighLevel && handleInitiateCancel(item)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 ${isHighLevel ? "animate-pulse cursor-pointer hover:bg-orange-100" : "cursor-default"}`}
        >
          <AlertTriangle size={12} /> Pending Cancel
        </button>
      );
    if (item.status === "Completed") {
      return !item.bo_deleted ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
          <Eraser size={12} /> BO Clean Pending
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 cursor-default">
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    }
    const now = new Date();
    const start = parseISO(item.start_time);
    const end = item.end_time ? parseISO(item.end_time) : null;
    if (now < start)
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 cursor-default">
          <Timer size={12} /> Upcoming
        </span>
      );
    if (end && now > end)
      return (
        <button
          onClick={() => handleOpenResolution(item)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 animate-pulse hover:bg-red-100 transition-colors"
        >
          <AlertTriangle size={12} /> Action Required
        </button>
      );
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

  // --- UPDATED SORTING LOGIC ---
  const getSortedMaintenances = (items) => {
    const now = new Date();

    return [...items].sort((a, b) => {
      // --- 1. HISTORY VIEW: Sort by Start Time (Newest First) ---
      if (view === "history") {
        return (
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
      }

      // --- 2. PENDING VIEW: Smart Priority Sort ---

      // Helper to determine the "Tier" of an item
      const getTier = (item) => {
        const isCompleted = item.status === "Completed";
        const isCancelled = item.status === "Cancelled"; 
        const isUrgent = item.type && item.type.includes("Urgent");
        const startTime = new Date(item.start_time);
        const isStarted = now >= startTime;

        // Tier 1: Urgent & Ongoing (Top Priority)
        if (isUrgent && isStarted && !isCompleted && !isCancelled) return 1;

        // Tier 2: Regular Ongoing
        if (!isUrgent && isStarted && !isCompleted && !isCancelled) return 2;

        // Tier 3: Completed (Pending BO Clean)
        if (isCompleted) return 3;

        // Tier 4: Upcoming OR Cancelled 
        // We group them together here so we can sort them by Date vs Status below
        if (!isStarted || isCancelled) return 4; 

        return 5; // Fallback
      };

      const tierA = getTier(a);
      const tierB = getTier(b);

      // First, sort by Tier (Lower number = Higher priority)
      if (tierA !== tierB) return tierA - tierB;

      // --- TIE-BREAKERS WITHIN TIERS ---

      // Tier 3 (Completed): Sort by Completion Time (Oldest first = Needs cleaning longest)
      if (tierA === 3) {
        const completeA = a.completion_time
          ? new Date(a.completion_time).getTime()
          : 0;
        const completeB = b.completion_time
          ? new Date(b.completion_time).getTime()
          : 0;
        return completeA - completeB;
      }

      // Tier 4 (Upcoming & Cancelled): The "Daily Block" Sort
      if (tierA === 4) {
        // 1. Sort by Day First (Ignore time)
        const dateA = new Date(a.start_time).setHours(0,0,0,0);
        const dateB = new Date(b.start_time).setHours(0,0,0,0);

        if (dateA !== dateB) {
            // Earlier date comes first (Today before Tomorrow)
            return dateA - dateB;
        }

        // 2. Same Day? Check Status (Upcoming must be above Cancelled)
        const isCancelledA = a.status === 'Cancelled';
        const isCancelledB = b.status === 'Cancelled';

        if (isCancelledA !== isCancelledB) {
            // If A is Cancelled (true), it should go AFTER B (false)
            // false - true = -1 (Upcoming comes first)
            // true - false = 1  (Cancelled comes last)
            return isCancelledA - isCancelledB;
        }

        // 3. Same Day & Same Status? Sort by Time
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      }

      // Fallback for Tiers 1 & 2: Sort by Start Time (Soonest First)
      return (
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    });
  };

  // --- UPDATED FILTER LOGIC ---
  const filteredMaintenances = getSortedMaintenances(
    maintenances.filter((item) => {
      // 1. VIEW FILTER (Pending vs History)
      let isVisible = false;
      if (view === "pending") {
        if (item.status === "Completed") isVisible = !item.bo_deleted;
        else if (item.status === "Cancelled") {
          const itemDate = toZonedTime(parseISO(item.start_time), timeZone);
          const nowDate = toZonedTime(new Date(), timeZone);
          isVisible =
            format(itemDate, "yyyy-MM-dd", { timeZone }) >=
            format(nowDate, "yyyy-MM-dd", { timeZone });
        } else isVisible = true;
      } else {
        if (item.status === "Completed") isVisible = item.bo_deleted;
        else if (item.status === "Cancelled") {
          const itemDate = toZonedTime(parseISO(item.start_time), timeZone);
          const nowDate = toZonedTime(new Date(), timeZone);
          isVisible =
            format(itemDate, "yyyy-MM-dd", { timeZone }) <
            format(nowDate, "yyyy-MM-dd", { timeZone });
        } else isVisible = false;
      }

      if (!isVisible) return false;

      // 2. SEARCH FILTER (Provider or Redmine)
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        const providerMatch = item.provider.toLowerCase().includes(lowerTerm);
        const ticketMatch = item.redmine_ticket
          ? item.redmine_ticket.toString().includes(lowerTerm)
          : false;
        if (!providerMatch && !ticketMatch) return false;
      }

      // 3. DATE FILTER (Smart Range & Face Value Fix)
      if (filterDate) {
        // A. Get User Selection as "YYYY-MM-DD" (Raw Face Value)
        // We ignore browser timezones and just grab the numbers the user clicked.
        const userSelectedDate = new Date(filterDate);
        const filterStr = [
          userSelectedDate.getFullYear(),
          String(userSelectedDate.getMonth() + 1).padStart(2, "0"),
          String(userSelectedDate.getDate()).padStart(2, "0"),
        ].join("-");

        // B. Get Item Start as "YYYY-MM-DD" (In Shanghai/System Timezone)
        const startZoned = toZonedTime(parseISO(item.start_time), timeZone);
        const startStr = format(startZoned, "yyyy-MM-dd", { timeZone });

        // --- CHECK 1: CANCELLED ITEMS (Strict Match) ---
        // Cancelled items should only appear on their specific start date.
        if (item.status === "Cancelled") {
          if (startStr !== filterStr) return false;
        }
        // --- CHECK 2: ACTIVE / COMPLETED ITEMS (Range Match) ---
        else {
          // Calculate the "Effective End Date"
          let endStr = startStr;

          if (item.end_time) {
            // Scenario A: Has a scheduled end time
            const endZoned = toZonedTime(parseISO(item.end_time), timeZone);
            endStr = format(endZoned, "yyyy-MM-dd", { timeZone });
          } else if (item.status === "Completed" && item.completion_time) {
            // Scenario B: Completed "Until Further Notice" -> Ends at actual completion
            const compZoned = toZonedTime(
              parseISO(item.completion_time),
              timeZone
            );
            endStr = format(compZoned, "yyyy-MM-dd", { timeZone });
          } else {
            // Scenario C: Active "Until Further Notice" -> Goes on forever (9999)
            // If it started before today, it is still active today.
            endStr = "9999-12-31";
          }

          // THE LOGIC: Is the Filter Date inside [Start, End]?
          // String comparison works perfectly for YYYY-MM-DD format.
          if (filterStr < startStr || filterStr > endStr) {
            return false;
          }
        }
      }
      
      return true;
    })
  );

  const getMinutesSinceCompletion = (completionTime) => {
    if (!completionTime) return 0;
    const now = new Date();
    const done = new Date(completionTime);
    return Math.floor((now - done) / 1000 / 60);
  };
  const isBOCleanupEnabled = (completionTime) =>
    getMinutesSinceCompletion(completionTime) >= 120;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="h-screen flex flex-col bg-white text-gray-900 font-sans overflow-hidden">
        <NotificationToast
          notifications={notifications}
          removeNotification={removeNotification}
          onSnooze={handleSnooze}
        />
        <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white sticky top-0 z-20">
          {/* LEFT SIDE: Title & Tabs */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-0">
              <div className="bg-gray-900 text-white w-45 h-6 rounded flex items-center justify-center font-bold text-xs">
                IC-Duty Maintenance Control
              </div>
            </div>
            <div className="flex bg-gray-100 p-0.5 rounded-lg">
              <button
                onClick={() => setView("pending")}
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all ${view === "pending" ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-gray-900"}`}
              >
                <LayoutList size={12} /> Pending
              </button>
              <button
                onClick={() => setView("history")}
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold transition-all ${view === "history" ? "bg-white shadow-sm text-black" : "text-gray-500 hover:text-gray-900"}`}
              >
                <HistoryIcon size={12} /> History
              </button>
            </div>
          </div>

          {/* RIGHT SIDE: Actions */}
          <div className="flex items-center gap-4">
            {/* Active Users Indicator */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-100 rounded-full hover:bg-gray-50 transition-colors shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold text-gray-600">
                  {activeUsers.length} Online
                </span>
              </button>
              {activeUsers.length > 0 && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-lg shadow-xl z-50 overflow-hidden hidden group-hover:block animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    Currently Active
                  </div>
                  <ul className="max-h-40 overflow-y-auto">
                    {activeUsers.map((u, i) => (
                      <li
                        key={i}
                        className="px-3 py-2 text-xs text-gray-700 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className="font-medium truncate max-w-[100px]">
                            {u.name}
                          </span>
                        </div>
                        {u.role !== "normal" && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-500 uppercase">
                            {u.role}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <span className="hidden md:block text-xs font-medium text-gray-500 animate-in fade-in slide-in-from-top-2">
              {getGreeting()}
            </span>

            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              title="Submit Feedback"
            >
              <MessageSquarePlus size={18} />
            </button>

            <div className="relative">
              <button
                onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)}
                className={`p-2 rounded-full transition-colors relative ${isNotifMenuOpen ? "bg-gray-100 text-black" : "text-gray-400 hover:text-black hover:bg-gray-50"}`}
              >
                <Bell size={18} />
                {notificationHistory.length > 0 && (
                  <div className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                )}
              </button>
              <NotificationMenu
                isOpen={isNotifMenuOpen}
                onClose={() => setIsNotifMenuOpen(false)}
                history={notificationHistory}
                onClear={() => setNotificationHistory([])}
              />
            </div>

            {/* PROVIDER MANAGER BUTTON (ADMIN ONLY) */}
            {isHighLevel && (
              <button
                onClick={() => setIsProviderManagerOpen(true)}
                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                title="Manage Providers"
              >
                <Settings size={18} />
              </button>
            )}

            {/* --- ARCHIVE BUTTON (VISIBLE TO ALL FOR NOW) --- */}
            {['admin', 'leader'].includes(userProfile?.role) && (
                <button
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Data Archival Manager (Admins Only)"
                >
                  <Archive size={20} />
                </button>
            )}

            {isHighLevel && (
              <button
                onClick={() => {
                  fetchUserList();
                  setIsUserModalOpen(true);
                }}
                className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
              >
                <Users size={18} />
              </button>
            )}

            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            >
              <LogOut size={18} />
            </button>

            <div className="h-4 w-px bg-gray-300"></div>

            <div className="flex items-center gap-3 font-mono text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded border border-gray-200">
              <div className="flex items-center gap-2 border-r border-gray-300 pr-3 mr-1">
                <CalendarDays size={14} />
                <span>{format(zonedTime, "EEE, MMM dd", { timeZone })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>{format(zonedTime, "HH:mm:ss", { timeZone })}</span>
                <span className="text-xs text-gray-400">UTC+8</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-2"
              >
                <Calendar size={14} /> Schedule
              </button>
              <button
                onClick={() => handleOpenNewEntry()}
                className="bg-gray-900 hover:bg-black text-white px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={14} /> New Entry
              </button>
            </div>
          </div>
        </header>

        {/* --- SUB-HEADER: SEARCH & FILTER --- */}
        <div className="px-6 py-3 shrink-0 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between gap-4">
          {/* Left: Title */}
          <div className="flex items-center gap-3 shrink-0">
            <h2 className="text-lg font-semibold text-gray-800 hidden md:block">
              {view === "pending"
                ? "Pending Maintenance"
                : "Maintenance History"}
            </h2>
            <span className="bg-gray-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {filteredMaintenances.length}
            </span>
          </div>

          {/* Center/Right: Controls */}
          <div className="flex-1 flex items-center justify-end gap-2 max-w-3xl">
            {/* 1. SEARCH BAR */}
            <div className="relative group w-full max-w-xs transition-all focus-within:max-w-md">
              <Search
                className="absolute left-3 top-2 text-gray-400 group-focus-within:text-indigo-500"
                size={14}
              />
              <input
                type="text"
                placeholder="Search Provider or Redmine No"
                className="w-full pl-9 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-2 text-gray-400 hover:text-red-500"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* 2. DATE FILTER DROPDOWN */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${filterDate ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                <Filter size={14} />
                <span>
                  {filterDate
                    ? dayjs(filterDate).format("MMM DD")
                    : "Filter Date"}
                </span>
                {filterDate && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setFilterDate(null);
                    }}
                    className="p-0.5 hover:bg-indigo-100 rounded-full"
                  >
                    <X size={10} />
                  </div>
                )}
              </button>

              {/* Dropdown Menu */}
              {isFilterMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95">
                  <div className="text-[10px] font-bold text-gray-400 uppercase px-2 py-1">
                    Quick Filters
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      onClick={() => {
                        setFilterDate(new Date());
                        setIsFilterMenuOpen(false);
                      }}
                      className="px-3 py-2 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-xs font-medium text-left"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        setFilterDate(addDays(new Date(), 1));
                        setIsFilterMenuOpen(false);
                      }}
                      className="px-3 py-2 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-xs font-medium text-left"
                    >
                      Tomorrow
                    </button>
                  </div>
                  <div className="border-t border-gray-100 my-1"></div>
                  <div className="p-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                      Select Specific Date
                    </label>
                    <DatePicker
                      value={filterDate ? dayjs(filterDate) : null}
                      onChange={(val) => {
                        setFilterDate(val ? val.toDate() : null);
                        // Optional: Comment this out if you want the menu to stay open after selection
                        setIsFilterMenuOpen(false); 
                      }}
                      slotProps={{
                        textField: { size: "small", fullWidth: true },
                        // ⬇️ ADD THIS SECTION ⬇️
                        popper: {
                          disablePortal: true, // Forces the calendar to stay inside your menu DOM
                        },
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setFilterDate(null);
                      setIsFilterMenuOpen(false);
                    }}
                    className="w-full mt-2 py-1.5 text-xs text-red-600 font-bold hover:bg-red-50 rounded-lg"
                  >
                    Clear Filter
                  </button>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="h-6 w-px bg-gray-300 mx-1"></div>

            {/* Connection & Refresh (Existing) */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md shadow-sm">
              <span className={`relative flex h-2 w-2`}>
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? "bg-emerald-500" : "bg-red-500"}`}
                ></span>
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden sm:block">
                {isConnected ? "Online" : "Offline"}
              </span>
            </div>
            <button
              onClick={handleManualRefresh}
              className="p-1.5 bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
              title="Refresh Data"
            >
              <RefreshCcw
                size={14}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>

        {/* TABLE WRAPPER */}
        <div className="flex-1 w-full overflow-y-auto overscroll-none">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 w-12 text-center">#</th>
                <th className="px-6 py-3">Redmine No</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Schedule (UTC+8)</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-left">Recorder</th>
                <th className="px-6 py-3 text-left">Completer</th>
                <th className="px-6 py-3 text-left">BO Cleaner</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMaintenances.map((item, index) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 transition-colors group ${item.status === "Completed" ? "bg-purple-50/20" : ""} ${item.type === "Urgent" && item.status !== "Completed" ? "bg-red-50/40" : ""}`}
                >
                  <td className="px-6 py-3 text-center text-gray-400 text-xs">
                    {index + 1}
                  </td>
                  <td className="px-6 py-3">
                    {item.status !== "Cancelled" && item.redmine_ticket ? (
                      <a
                        href={`${REDMINE_BASE_URL}${item.redmine_ticket}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-indigo-600 hover:underline flex items-center gap-1 w-fit"
                      >
                        {getRedmineDisplayId(item.redmine_ticket)}{" "}
                        <ExternalLink
                          size={10}
                          className="opacity-0 group-hover:opacity-100"
                        />
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Gamepad2 size={14} className="text-gray-400" />
                      <div>
                        <div
                          className={`font-medium ${item.status === "Cancelled" ? "text-gray-500 line-through" : "text-gray-900"}`}
                        >
                          {item.provider}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.status === "Cancelled"
                            ? "Cancelled"
                            : item.type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">{getTypeBadge(item)}</td>
                  <td className="px-6 py-3 font-mono text-gray-600 text-xs">
                    {formatSmartDate(
                      item.start_time,
                      item.end_time,
                      item.is_until_further_notice,
                      item.status,
                    )}
                  </td>
                  <td className="px-6 py-3">{getStatusBadge(item)}</td>
                  <td className="px-6 py-3 text-xs text-gray-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-gray-400" />{" "}
                      {item.recorder}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-xs">
                    {item.status === "Completed" ? (
                      <button
                        onClick={() => handleUndoCompletion(item)}
                        disabled={!isHighLevel}
                        className={`flex items-center gap-1.5 text-emerald-600 font-bold transition-all ${isHighLevel ? "hover:text-red-600 cursor-pointer" : "cursor-default"}`}
                        title={
                          isHighLevel ? "Click to UNDO Completion" : "Completed"
                        }
                      >
                        <CheckCircle2 size={12} /> {item.completed_by}
                      </button>
                    ) : (
                      item.status !== "Cancelled" && (
                        <button
                          onClick={() => initiateCompletion(item)}
                          className="transition-colors p-1.5 rounded-md text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 border border-transparent hover:border-emerald-200"
                          title="Mark as Completed"
                        >
                          <CheckSquare size={16} />
                        </button>
                      )
                    )}
                  </td>
                  <td className="px-6 py-3 text-xs">
                    {item.bo_deleted_by ? (
                      <button
                        onClick={() => handleUndoBOClean(item)}
                        disabled={!isHighLevel}
                        className={`flex items-center gap-1.5 text-purple-600 font-bold transition-all ${isHighLevel ? "hover:text-red-600 cursor-pointer" : "cursor-default"}`}
                        title={
                          isHighLevel ? "Click to UNDO BO Clean" : "BO Cleaned"
                        }
                      >
                        <Eraser size={12} /> {item.bo_deleted_by}
                      </button>
                    ) : (
                      item.status === "Completed" &&
                      (isBOCleanupEnabled(item.completion_time) ? (
                        <button
                          onClick={() => handleConfirmBODeleted(item)}
                          className="p-1.5 rounded-md bg-white border border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-all shadow-sm animate-pulse"
                          title="Confirm BO 8.2 Deleted"
                        >
                          <Eraser size={16} />
                        </button>
                      ) : (
                        <div
                          className="flex items-center gap-1"
                          title={`${120 - getMinutesSinceCompletion(item.completion_time)} mins remaining until unlock`}
                        >
                          <button
                            disabled
                            className="p-1.5 rounded-md bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200"
                          >
                            <Eraser size={16} />
                          </button>
                          <Lock size={10} className="text-gray-300" />
                        </div>
                      ))
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenResolution(item, "extend")}
                        disabled={
                          item.status === "Completed" ||
                          item.status === "Cancelled"
                        }
                        className={`p-1.5 rounded-md transition-all duration-200 ${
                          item.status === "Completed" ||
                          item.status === "Cancelled"
                            ? "text-gray-200 cursor-not-allowed"
                            : "text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        }`}
                        title={
                          item.status === "Completed"
                            ? "Maintenance Completed"
                            : "Extend Time"
                        }
                      >
                        <Clock size={15} />
                      </button>

                      {(() => {
                        const isStarted =
                          new Date() >= new Date(item.start_time);
                        return (
                          <button
                            onClick={() => !isStarted && handleEdit(item)}
                            disabled={isStarted}
                            className={`p-1.5 rounded transition-colors ${isStarted ? "text-gray-300 cursor-not-allowed" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}
                            title={
                              isStarted
                                ? "Maintenance Started. Use Extension."
                                : "Edit"
                            }
                          >
                            <Edit2 size={15} />
                          </button>
                        );
                      })()}
                      {item.status !== "Cancelled" && (
                        <button
                          onClick={() => handleInitiateCancel(item)}
                          className="text-gray-400 hover:text-orange-600 hover:bg-orange-50 p-1.5 rounded transition-colors"
                          title="Cancel Maintenance"
                        >
                          <Ban size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => handleInitiateDelete(item)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                        title="Delete Entry"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODALS */}
        <ScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          maintenances={maintenances}
          onOpenEntryModal={handleOpenNewEntry}
        />
        {/* UPDATED: Pass providersDB to EntryModal */}
        <EntryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          formData={formData}
          setFormData={setFormData}
          handleConfirm={handleConfirm}
          loading={loading}
          editingId={editingId}
          errors={errors}
          setErrors={setErrors}
          existingMaintenances={maintenances}
          providersDB={providersList}
        />
        <CompletionModal
          isOpen={isCompletionModalOpen}
          onClose={() => setIsCompletionModalOpen(false)}
          onConfirm={confirmCompletion}
          item={completingItem}
          sopChecks={sopChecks}
          setSopChecks={setSopChecks}
        />
        <UserModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          userTab={userTab}
          setUserTab={setUserTab}
          userList={userList}
          userForm={userForm}
          setUserForm={setUserForm}
          loading={loading}
          handleCreateUser={handleCreateUser}
          handleUpdateUser={handleUpdateUser}
          handleDeleteUser={handleDeleteUser}
          editingUser={editingUser}
          setEditingUser={setEditingUser}
          newUserCredentials={newUserCredentials}
          setNewUserCredentials={setNewUserCredentials}
          generatePassword={() => {
            const chars =
              "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
            let pass = "";
            for (let i = 0; i < 12; i++)
              pass += chars.charAt(Math.floor(Math.random() * chars.length));
            setUserForm((prev) => ({ ...prev, password: pass }));
          }}
        />
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          onReject={handleRejectDelete}
          loading={loading}
          isDeletionRequest={
            maintenances.find((m) => m.id === deletingId)?.deletion_pending
          }
        />
        <ResolutionModal
          isOpen={isResolutionModalOpen}
          onClose={() => setIsResolutionModalOpen(false)}
          item={resolvingItem}
          initialMode={resolutionInitialMode}
          onExtend={handleExtendMaintenance}
          onComplete={handleProceedToCompletion}
          loading={loading}
        />
        <CancellationModal
          isOpen={isCancellationModalOpen}
          onClose={() => setIsCancellationModalOpen(false)}
          item={cancellingItem}
          onConfirm={handleConfirmCancel}
          loading={loading}
        />
        <CancelRequestModal
          isOpen={isCancelRequestModalOpen}
          onClose={() => setIsCancelRequestModalOpen(false)}
          item={cancellingItem}
          onConfirm={handleRequestCancelConfirm}
          loading={loading}
        />
        <DeleteRequestModal
          isOpen={isDeleteRequestModalOpen}
          onClose={() => setIsDeleteRequestModalOpen(false)}
          item={deleteRequestId}
          onConfirm={handleRequestDeleteConfirm}
          loading={loading}
        />
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          userName={userProfile.work_name || "User"}
          triggerNotification={triggerNotification}
        />
        <ConfirmationModal
          isOpen={!!actionConfig}
          onClose={() => setActionConfig(null)}
          onConfirm={() =>
            executeAction(actionConfig?.type, actionConfig?.payload)
          }
          config={{
            title: actionConfig?.title || "",
            message: actionConfig?.message || "",
            type: actionConfig?.type?.includes("UNDO")
              ? "warning"
              : actionConfig?.type === "CONFIRM_BO_DELETE"
                ? "danger"
                : "info",
            confirmText: actionConfig?.confirmText || "Confirm",
          }}
          loading={loading}
        />
        {/* NEW: Provider Manager Modal */}
        <ProviderManagerModal
          isOpen={isProviderManagerOpen}
          onClose={() => setIsProviderManagerOpen(false)}
        />

        <ArchiveManagerModal 
        isOpen={isArchiveModalOpen} 
        onClose={() => setIsArchiveModalOpen(false)} 
        userProfile={userProfile}
    />
      </div>
    </LocalizationProvider>
  );
};

export default Dashboard;
