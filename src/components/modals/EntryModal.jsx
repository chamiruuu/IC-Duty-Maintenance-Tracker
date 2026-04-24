import React, { useEffect, useState, useRef } from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import {
  X,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  ChevronDown,
  Search,
  Check,
  Info,
} from "lucide-react";
import CopyButton from "../CopyButton";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { generateUrgentScript } from "../../lib/scriptGenerator";

dayjs.extend(utc);
dayjs.extend(timezone);

const EntryModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  handleConfirm,
  loading,
  editingId,
  errors,
  setErrors,
  existingMaintenances,
  providersDB = [],
  userProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [isPartGame, setIsPartGame] = useState(false);
  const [showRescheduleSop, setShowRescheduleSop] = useState(false);
  const [rescheduleChecklist, setRescheduleChecklist] = useState({
    internal: false,
    boSync: false,
  });

  const [urgentChecks, setUrgentChecks] = useState({
    contact: false,
    bo82: false,
    merchant: false,
    redmine: false,
  });
  const [boWebChecks, setBoWebChecks] = useState({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
  });
  const [urgentBoWebChecks, setUrgentBoWebChecks] = useState({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
  });

  const [urgentScript, setUrgentScript] = useState({
    title: "",
    startMessage: "",
  });
  const [initialTimes, setInitialTimes] = useState({ start: null, end: null });
  const [wasTimeChanged, setWasTimeChanged] = useState(false);

  const isBoWebSop = ["BO", "WEB", "BO/WEB"].includes(formData.provider);

  const getTimePhrases = (start, end, isUFN) => {
    if (!start)
      return {
        title: "",
        body: "",
        scheduledUfnTitle: "",
        scheduledUfnBody: "",
      };
    const dStart = start.format("YYYY-MM-DD");
    const tStart = start.format("HH:mm");

    if (isUFN) {
      return {
        title: `until further notice (from ${dStart} ${tStart})`,
        body: `until further notice`,
        scheduledUfnTitle: `on ${dStart} ${tStart}(GMT+8) , and the end time will be until further notice.`,
        scheduledUfnBody: `on ${dStart} ${tStart}(GMT+8) , and the end time will be until further notice.`,
      };
    }

    const dEnd = end ? end.format("YYYY-MM-DD") : "??-??";
    const tEnd = end ? end.format("HH:mm") : "??:??";

    if (end && dStart !== dEnd) {
      return {
        title: `from ${dStart} ${tStart} to ${dEnd} ${tEnd}(GMT+8)`,
        body: `from ${dStart} ${tStart} to ${dEnd} ${tEnd}(GMT+8)`,
      };
    } else {
      return {
        title: `on ${dStart} between ${tStart} to ${tEnd}(GMT+8)`,
        body: `on ${dStart} between ${tStart} to ${tEnd}(GMT+8)`,
      };
    }
  };

  const generatePartGameScript = (isUrgentMode) => {
    const {
      provider,
      startTime,
      endTime,
      isUntilFurtherNotice,
      affectedGames,
    } = formData;
    if (!provider || !startTime) return { title: "", body: "" };

    const games = (affectedGames || "").split("\n").filter((g) => g.trim());
    const isMultiple = games.length > 1;
    const gameName = games[0] ? games[0].trim() : "Game Name";

    const subjectName = isMultiple
      ? `${provider}-part of the game`
      : `${provider}-${gameName}`;

    const time = getTimePhrases(startTime, endTime, isUntilFurtherNotice);

    let title = "";
    let body = "";

    if (isUrgentMode) {
      if (isUntilFurtherNotice) {
        title = `【${subjectName}】【Urgent Maintenance】until further notice(from ${startTime.format("YYYY-MM-DD HH:mm")})`;
        body = `Hello there,\nPlease be informed that【${subjectName}】 is going urgent maintenance until further notice, during the period,other games can be able to access and the game lobby will not close . Please contact us if you require further assistance.\nThank you for your support and cooperation.`;
      } else {
        title = `【${subjectName}】【Urgent Maintenance】${time.title}`;
        body = `Hello there,\nPlease be informed that【${subjectName}】 is going urgent maintenance ${time.body} , during the period,other games can be able to access and the game lobby will not close . Please contact us if you require further assistance.\nThank you for your support and cooperation.`;
      }
    } else {
      if (isUntilFurtherNotice) {
        title = `【${subjectName}】scheduled to have system maintenance ${time.scheduledUfnTitle}`;
        body = `Hello there,\nPlease be informed that【${subjectName}】scheduled to have system maintenance ${time.scheduledUfnBody} During the period,other games can be able to access and the game  lobby will not close . Please contact us if you require further assistance.\nThank you for your support and cooperation.`;
      } else {
        title = `【${subjectName}】scheduled to have system maintenance ${time.title}`;
        body = `Hello there,\nPlease be informed that 【${subjectName}】scheduled to have system maintenance ${time.body}, during the period,other games can be able to access and the game lobby will not close . Please contact us if you require further assistance.\nThank you for your support and cooperation.`;
      }
    }

    if (isMultiple) {
      body += `\nAffected game list :\n\n${games.map((g) => `【${g.trim()}】`).join("\n")}`;
    }

    return { title, startMessage: body, body };
  };

  const currentTypeStr = formData.type || "Scheduled";
  const isUrgent = currentTypeStr.includes("Urgent");
  const isCancelled = currentTypeStr === "Cancelled";

  const isUrgentLocked =
    isUrgent &&
    !isBoWebSop &&
    ((!isPartGame && !urgentChecks.contact) ||
      !urgentChecks.bo82 ||
      (!isPartGame && !urgentChecks.merchant) ||
      !urgentChecks.redmine);

  const isBoWebLocked =
    isBoWebSop &&
    !isUrgent &&
    !isCancelled &&
    Object.values(boWebChecks).some((checked) => !checked);
  const isUrgentBoWebLocked =
    isUrgent &&
    isBoWebSop &&
    !isCancelled &&
    Object.values(urgentBoWebChecks).some((checked) => !checked);

  useEffect(() => {
    if (isUrgent) {
      if (isPartGame) setUrgentScript(generatePartGameScript(true));
      else setUrgentScript(generateUrgentScript(formData));
    }
  }, [formData, isPartGame, isUrgent]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(formData.provider || "");
      setErrors({});
      setShowRescheduleSop(false);
      setWasTimeChanged(false);
      setRescheduleChecklist({ internal: false, boSync: false });
      setUrgentChecks({
        contact: false,
        bo82: false,
        merchant: false,
        redmine: false,
      });

      const isEdit = !!editingId;
      setBoWebChecks({
        step1: isEdit,
        step2: isEdit,
        step3: isEdit,
        step4: isEdit,
        step5: isEdit,
      });
      setUrgentBoWebChecks({
        step1: isEdit,
        step2: isEdit,
        step3: isEdit,
        step4: isEdit,
      });

      const typeStr = formData.type || "Scheduled";
      const isPg =
        typeStr.includes("Part of the Game") || !!formData.affectedGames;
      setIsPartGame(isPg);

      if (isEdit) {
        const fmt = "YYYY-MM-DD HH:mm";
        setInitialTimes({
          start: formData.startTime
            ? dayjs(formData.startTime).format(fmt)
            : null,
          end: formData.endTime ? dayjs(formData.endTime).format(fmt) : null,
        });
      } else {
        setInitialTimes({ start: null, end: null });
      }
    }
  }, [isOpen, editingId]);

  useEffect(() => {
    if (editingId && initialTimes.start) {
      const fmt = "YYYY-MM-DD HH:mm";
      const currentStart = formData.startTime
        ? dayjs(formData.startTime).format(fmt)
        : null;
      const currentEnd = formData.endTime
        ? dayjs(formData.endTime).format(fmt)
        : null;

      const isTimeChanged =
        currentStart !== initialTimes.start || currentEnd !== initialTimes.end;
      const isFuture = dayjs().isBefore(dayjs(initialTimes.start));

      if (isTimeChanged !== wasTimeChanged) {
        setWasTimeChanged(isTimeChanged);

        if (isTimeChanged && isFuture) {
          if (isBoWebSop) {
            setShowRescheduleSop(false);
            setBoWebChecks({
              step1: false,
              step2: false,
              step3: false,
              step4: false,
              step5: false,
            });
            setUrgentBoWebChecks({
              step1: false,
              step2: false,
              step3: false,
              step4: false,
            });
          } else {
            setShowRescheduleSop(true);
          }
        } else {
          setShowRescheduleSop(false);
          if (isBoWebSop) {
            setBoWebChecks({
              step1: true,
              step2: true,
              step3: true,
              step4: true,
              step5: true,
            });
            setUrgentBoWebChecks({
              step1: true,
              step2: true,
              step3: true,
              step4: true,
            });
          }
        }
      }
    }
  }, [
    formData.startTime,
    formData.endTime,
    editingId,
    initialTimes,
    isBoWebSop,
    wasTimeChanged,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const filteredProviders = providersDB.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleProviderSelect = (providerObj) => {
    setFormData({
      ...formData,
      provider: providerObj.name,
      isInHouse: providerObj.is_in_house,
    });
    setSearchTerm(providerObj.name);
    setIsDropdownOpen(false);
    setErrors({
      ...errors,
      provider: false,
      providerDuplicate: false,
      providerInvalid: false,
    });
  };

  const handleTypeChange = (e) => {
    const newBase = e.target.value;
    let newTypeStr = newBase;
    if (newBase === "Cancelled") setErrors({});
    else if (isPartGame)
      newTypeStr =
        newBase === "Urgent" ? "Part of the Game (Urgent)" : "Part of the Game";

    setFormData({ ...formData, type: newTypeStr });
  };

  const handlePartGameChange = (e) => {
    const checked = e.target.checked;
    setIsPartGame(checked);
    const baseUrgent = formData.type.includes("Urgent");
    if (checked) {
      const newStr = baseUrgent
        ? "Part of the Game (Urgent)"
        : "Part of the Game";
      setFormData({ ...formData, type: newStr });
    } else {
      const newStr = baseUrgent ? "Urgent" : "Scheduled";
      setFormData({ ...formData, type: newStr, affectedGames: "" });
    }
  };

  const validateAndConfirm = () => {
    if (
      showRescheduleSop &&
      (!rescheduleChecklist.internal || !rescheduleChecklist.boSync)
    )
      return;
    if (
      isUrgentLocked ||
      (isBoWebSop && !isUrgent && isBoWebLocked) ||
      (isBoWebSop && isUrgent && isUrgentBoWebLocked)
    )
      return;

    const newErrors = {};
    let hasError = false;

    if (!formData.provider) {
      newErrors.provider = true;
      hasError = true;
    }
    if (!isCancelled && !formData.redmineLink) {
      newErrors.redmineLink = true;
      hasError = true;
    }
    if (!formData.startTime) {
      newErrors.startTime = true;
      hasError = true;
    }

    if (!formData.isUntilFurtherNotice && !isCancelled) {
      if (!formData.endTime) {
        newErrors.endTime = true;
        hasError = true;
      } else if (formData.startTime) {
        if (formData.endTime.isBefore(formData.startTime)) {
          newErrors.endTime = true;
          newErrors.timeInvalid = "End Time cannot be before Start Time";
          hasError = true;
        } else if (formData.endTime.isSame(formData.startTime)) {
          newErrors.endTime = true;
          newErrors.timeInvalid = "Start and End Time cannot be the same";
          hasError = true;
        }
      }
    }

    if (isPartGame && !formData.affectedGames?.trim()) {
      newErrors.affectedGames = true;
      hasError = true;
    }

    // --- UPDATED DUPLICATE PROVIDER LOGIC ---
    if (existingMaintenances && !hasError && !editingId) {
      const formDay = dayjs(formData.startTime)
        .tz("Asia/Shanghai")
        .format("YYYY-MM-DD");
      const newTicket = formData.redmineLink
        ? formData.redmineLink.replace(/\D/g, "")
        : "";
      const otherMaintenances = existingMaintenances.filter(
        (m) => m.id !== editingId,
      );

      const duplicateProvider = otherMaintenances.some((m) => {
        const mDay = dayjs(m.start_time)
          .tz("Asia/Shanghai")
          .format("YYYY-MM-DD");

        if (m.provider !== formData.provider || mDay !== formDay) return false;

        // If either the existing maintenance or the new one is "Part of the Game", we allow it to coexist.
        const existingIsPartGame =
          m.type?.includes("Part of the Game") || !!m.affected_games;
        if (existingIsPartGame || isPartGame) return false;

        return true;
      });

      if (duplicateProvider && !isUrgent) {
        newErrors.providerDuplicate = true;
        hasError = true;
      }

      if (!isCancelled && newTicket.length > 0) {
        const duplicateTicket = otherMaintenances.some((m) => {
          const mTicket = m.redmine_ticket ? m.redmine_ticket.toString() : "";
          return mTicket === newTicket;
        });
        if (duplicateTicket) {
          newErrors.redmineDuplicate = true;
          hasError = true;
        }
      }
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    let startString = isCancelled
      ? dayjs(formData.startTime)
          .tz("Asia/Shanghai")
          .format("YYYY-MM-DD 00:00:00")
      : dayjs(formData.startTime).format("YYYY-MM-DD HH:mm:ss");
    const zonedStart = dayjs.tz(startString, "Asia/Shanghai");

    let zonedEnd = null;
    if (!formData.isUntilFurtherNotice && !isCancelled && formData.endTime) {
      const endString = dayjs(formData.endTime).format("YYYY-MM-DD HH:mm:ss");
      zonedEnd = dayjs.tz(endString, "Asia/Shanghai");
    }

    handleConfirm(zonedStart, zonedEnd);
  };

  const getPreviewId = (url) => {
    if (!url) return "";
    const digits = url.replace(/\D/g, "");
    return digits ? `CS-${digits}` : "";
  };

  const generateScheduledScript = (part) => {
    const { provider, startTime, endTime, isUntilFurtherNotice, type } =
      formData;
    if (!provider || !startTime) return "";

    if (type === "Cancelled") {
      if (part === "title") return `${provider} Cancel Maintenance`;
      return startTime.format("YYYY/MM/DD");
    }

    if (isPartGame) {
      const scriptData = generatePartGameScript(false);
      if (part === "title") return scriptData.title;
      return scriptData.body;
    }

    const time = getTimePhrases(startTime, endTime, isUntilFurtherNotice);

    if (isUntilFurtherNotice) {
      if (part === "title")
        return `【${provider}】scheduled to have system maintenance ${time.scheduledUfnTitle}`;
      return `Hello there\nPlease be informed that【${provider}】scheduled to have system maintenance ${time.scheduledUfnBody} The game lobby will closed during this period.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
    } else {
      if (part === "title")
        return `【${provider}】scheduled to have system maintenance ${time.title}`;
      return `Hello there, \nPlease be informed that 【${provider}】 scheduled to have system maintenance ${time.body} , the game lobby will closed during this period.\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
    }
  };

  const getBoWebScripts = () => {
    const target = formData.provider;
    const isUFN = formData.isUntilFurtherNotice;

    if (!formData.startTime)
      return { scriptMsg: "", reportBack: "", title: "" };

    const time = getTimePhrases(formData.startTime, formData.endTime, isUFN);

    let scriptMsg = "";
    let title = "";
    const reportBack =
      "Hi Team, please be informed that the merchants have been informed through the SKYPEBOT. Thank You ~!!";

    if (isUFN) {
      const targetDesc =
        target === "BO"
          ? "BO"
          : target === "WEB"
            ? "Website"
            : "BO and Website";
      title = `【${target}】scheduled to have system maintenance ${time.scheduledUfnTitle}`;
      scriptMsg = `Hello there\nPlease be informed that【${target}】scheduled to have system maintenance ${time.scheduledUfnBody} The ${targetDesc} will close during this period.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
    } else {
      title = `【${target}】scheduled to have system maintenance ${time.title}`;
      scriptMsg = `Hello Dear team,\n【${target}】scheduled to maintenance ${time.body}, the ${target === "BO/WEB" ? "BO/WEB" : target} will close during this period.\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
    }

    return { scriptMsg, reportBack, title };
  };

  const getUrgentBoWebScripts = () => {
    const target = formData.provider;
    const isUFN = formData.isUntilFurtherNotice;

    const time = getTimePhrases(formData.startTime, formData.endTime, isUFN);

    const targetDesc =
      target === "BO" ? "BO" : target === "WEB" ? "Website" : "BO and Website";

    let scriptMsg = "";
    let title = "";

    if (isUFN) {
      title = `【${target}】【Urgent Maintenance】until further notice (from ${formData.startTime.format("YYYY-MM-DD HH:mm")})`;
      scriptMsg = `Hello there\nPlease be informed that【${target}】 is going urgent maintenance until further notice,the ${targetDesc} will close during this period.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
    } else {
      title = `【${target}】【Urgent Maintenance】${time.title}`;
      scriptMsg = `Hello there\nPlease be informed that【${target}】 is going urgent maintenance ${time.body} ,the ${targetDesc} will close during this period.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
    }
    return {
      scriptMsg,
      title,
      reportBack:
        "Hi Team, please be informed that the merchants have been informed through the SKYPEBOT. Thank You ~!!",
    };
  };

  const internalUpdateMsg = `Maintenance time update for ${formData.provider}, BO8.2 announcement has been updated.`;
  const urgentInternalMsg = isPartGame
    ? `Urgent Maintenance: ${formData.provider || "Provider"} - Part of the Game (Lobby Remains Open).`
    : `Urgent Maintenance: ${formData.provider || "Provider"} - Please assist to close the game.`;

  const workName = userProfile?.work_name?.split(" ")[0].trim() || "Team";
  // ONLY USE 'CLOSE' FOR ENTRY MODAL
  const boCloseScript = `This is ${workName}, please help to close 【${formData.provider}】 via bo.indo368cash.com Thank You`;

  const inputStyle = (isError) =>
    `w-full bg-white border text-gray-900 text-sm rounded-sm px-3 py-2 outline-none transition-all ${isError ? "border-red-500 bg-red-50" : "border-gray-300 focus:border-black"}`;

  const getProviderHint = () => {
    if (formData.provider === "Pragmatic Play")
      return {
        text: "For Reel Kingdom games, Please Upload Images.",
        link: "https://snipboard.io/h6JWba.jpg",
      };
    if (formData.provider === "PT Slots")
      return {
        text: "For PT-GPAS games, Please Upload Images.",
        link: "https://snipboard.io/uDgQrB.jpg",
      };
    return { text: "Please use text format only.", link: null };
  };
  const providerHint = getProviderHint();

  const boWebData = isBoWebSop && !isUrgent ? getBoWebScripts() : null;
  const urgentBoWebData =
    isBoWebSop && isUrgent ? getUrgentBoWebScripts() : null;

  const getStepClass = (isChecked) =>
    `rounded-lg p-4 relative cursor-pointer transition-all duration-300 border-2 ${isChecked ? "bg-emerald-50 border-emerald-400 shadow-md" : "bg-white border-blue-100 hover:border-blue-300 shadow-sm"}`;
  const getBadgeClass = (isChecked) =>
    `absolute top-0 left-0 text-[10px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-sm transition-colors flex items-center gap-1 ${isChecked ? "bg-emerald-500 text-white" : "bg-blue-100 text-blue-800"}`;

  // Special urgent styling for BO/WEB
  const getUrgentStepClass = (isChecked) =>
    `rounded-lg p-4 relative cursor-pointer transition-all duration-300 border-2 ${isChecked ? "bg-red-50 border-red-400 shadow-md" : "bg-white border-red-100 hover:border-red-300 shadow-sm"}`;
  const getUrgentBadgeClass = (isChecked) =>
    `absolute top-0 left-0 text-[10px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-sm transition-colors flex items-center gap-1 ${isChecked ? "bg-red-500 text-white" : "bg-red-100 text-red-800"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${isUrgent ? "bg-red-50 border-red-100" : isBoWebSop && !isCancelled ? "bg-blue-50 border-blue-100" : "bg-white border-gray-100"}`}
        >
          <h2
            className={`text-sm font-bold uppercase tracking-wide ${isUrgent ? "text-red-700" : isBoWebSop && !isCancelled ? "text-blue-800" : "text-gray-900"}`}
          >
            {editingId
              ? "Edit Maintenance"
              : isUrgent
                ? "New Urgent Entry"
                : isBoWebSop && !isCancelled
                  ? "New BO/WEB SOP"
                  : "New Maintenance Entry"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT PANEL: INPUTS */}
          <div className="w-1/2 p-6 space-y-5 border-r border-gray-100 overflow-y-auto">
            <div ref={dropdownRef} className="relative">
              <div className="flex justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-500">
                  Provider *
                </label>
                {errors.providerDuplicate && (
                  <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                    <AlertCircle size={10} /> Already exists
                  </span>
                )}
                {errors.providerInvalid && (
                  <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                    <AlertCircle size={10} /> Invalid Provider
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  className={`${inputStyle(errors.provider || errors.providerDuplicate || errors.providerInvalid)} pr-8`}
                  placeholder="Search or Select Provider..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setFormData({ ...formData, provider: e.target.value });
                    if (!isDropdownOpen) setIsDropdownOpen(true);
                    setErrors({
                      ...errors,
                      provider: false,
                      providerDuplicate: false,
                      providerInvalid: false,
                    });
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                />
                <div className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none">
                  {isDropdownOpen ? (
                    <Search size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </div>
              </div>
              {isDropdownOpen && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-xl max-h-48 overflow-y-auto">
                  {filteredProviders.length > 0 ? (
                    filteredProviders.map((p) => (
                      <li
                        key={p.id}
                        className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer font-medium"
                        onClick={() => handleProviderSelect(p)}
                      >
                        <div className="flex items-center justify-between">
                          <span>{p.name}</span>
                          {p.is_in_house && (
                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase font-bold">
                              In-House
                            </span>
                          )}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-2 text-sm text-gray-400 italic">
                      No matches found
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* SUB-SELECTION FOR BO/WEB */}
            {isBoWebSop && (
              <div
                className={`p-3 border rounded-md animate-in fade-in slide-in-from-top-2 ${isUrgent ? "bg-red-50/50 border-red-100" : "bg-blue-50/50 border-blue-100"}`}
              >
                <label
                  className={`block text-[10px] font-bold mb-2 uppercase tracking-wider ${isUrgent ? "text-red-800" : "text-blue-800"}`}
                >
                  Select Target System
                </label>
                <div className="flex gap-4">
                  {["BO", "WEB", "BO/WEB"].map((sys) => (
                    <label
                      key={sys}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        value={sys}
                        checked={formData.provider === sys}
                        onChange={(e) =>
                          setFormData({ ...formData, provider: e.target.value })
                        }
                        className={`w-3.5 h-3.5 focus:ring-opacity-50 border-gray-300 ${isUrgent ? "text-red-600 focus:ring-red-500" : "text-blue-600 focus:ring-blue-500"}`}
                      />
                      <span
                        className={`text-xs font-semibold ${isUrgent ? "text-red-900" : "text-blue-900"}`}
                      >
                        {sys === "BO/WEB" ? "BOTH (BO/WEB)" : sys}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!isCancelled && (
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500">
                    Redmine Link *
                  </label>
                  {errors.redmineDuplicate ? (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                      <AlertCircle size={10} /> Ticket number already used
                    </span>
                  ) : (
                    <span className="text-indigo-600 font-mono text-xs">
                      {getPreviewId(formData.redmineLink)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    className={`${inputStyle(errors.redmineLink || errors.redmineDuplicate)} pl-8`}
                    placeholder="Paste URL..."
                    value={formData.redmineLink}
                    onChange={(e) => {
                      setFormData({ ...formData, redmineLink: e.target.value });
                      setErrors({
                        ...errors,
                        redmineLink: false,
                        redmineDuplicate: false,
                      });
                    }}
                  />
                  <LinkIcon
                    size={14}
                    className="absolute left-2.5 top-2.5 text-gray-400"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Type
                </label>
                <select
                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-sm px-3 py-2 outline-none focus:border-black"
                  value={
                    isCancelled
                      ? "Cancelled"
                      : isUrgent
                        ? "Urgent"
                        : "Scheduled"
                  }
                  onChange={handleTypeChange}
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 mt-6 pl-1">
                <label
                  className={`flex items-center gap-2 cursor-pointer ${isCancelled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded-sm border-gray-300 text-black focus:ring-black"
                    checked={formData.isUntilFurtherNotice}
                    disabled={isCancelled}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        isUntilFurtherNotice: e.target.checked,
                      });
                      if (e.target.checked)
                        setErrors({ ...errors, endTime: false });
                    }}
                  />
                  <span className="text-xs font-medium text-gray-700">
                    Until Further Notice
                  </span>
                </label>

                {!isBoWebSop && (
                  <label
                    className={`flex items-center gap-2 cursor-pointer ${isCancelled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded-sm border-gray-300 text-purple-600 focus:ring-purple-600"
                      checked={isPartGame}
                      disabled={isCancelled}
                      onChange={handlePartGameChange}
                    />
                    <span className="text-xs font-bold text-purple-700">
                      Part of the Game
                    </span>
                  </label>
                )}
              </div>
            </div>

            {isPartGame && !isBoWebSop && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500">
                    Affected Games (One per line) *
                  </label>
                  {providerHint &&
                    (providerHint.link ? (
                      <a
                        href={providerHint.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-500 flex items-center gap-1 hover:underline"
                      >
                        <Info size={10} /> {providerHint.text}
                      </a>
                    ) : (
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Info size={10} /> {providerHint.text}
                      </span>
                    ))}
                </div>
                <textarea
                  className={`${inputStyle(errors.affectedGames)} h-24 font-mono text-xs`}
                  placeholder="E.g.\nSweet Bonanza\nGate of Olympus"
                  value={formData.affectedGames || ""}
                  onChange={(e) => {
                    setFormData({ ...formData, affectedGames: e.target.value });
                    setErrors({ ...errors, affectedGames: false });
                  }}
                />
              </div>
            )}

            {isCancelled ? (
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-500">
                  Date of Cancellation *
                </label>
                <DatePicker
                  value={formData.startTime}
                  onChange={(newValue) => {
                    setFormData((prev) => ({ ...prev, startTime: newValue }));
                    setErrors({
                      ...errors,
                      startTime: false,
                      providerDuplicate: false,
                    });
                  }}
                  format="YYYY-MM-DD"
                  slotProps={{
                    textField: {
                      size: "small",
                      className: errors.startTime ? "bg-red-50" : "",
                      error: !!errors.startTime,
                      fullWidth: true,
                    },
                  }}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-500">
                    Start Time (UTC+8) *
                  </label>
                  <DateTimePicker
                    value={formData.startTime}
                    onChange={(newValue) => {
                      setFormData((prev) => ({ ...prev, startTime: newValue }));
                      setErrors({
                        ...errors,
                        startTime: false,
                        providerDuplicate: false,
                        timeInvalid: false,
                      });
                    }}
                    timeSteps={{ minutes: 1 }}
                    ampm={false}
                    slotProps={{
                      textField: {
                        size: "small",
                        fullWidth: true,
                        className: errors.startTime ? "bg-red-50" : "",
                        error: !!errors.startTime,
                      },
                    }}
                  />
                </div>
                <div
                  className={
                    formData.isUntilFurtherNotice
                      ? "opacity-50 pointer-events-none"
                      : ""
                  }
                >
                  <label className="block text-xs font-semibold mb-1.5 text-gray-500">
                    End Time (UTC+8) *
                  </label>
                  <DateTimePicker
                    value={formData.endTime}
                    onChange={(newValue) => {
                      setFormData((prev) => ({ ...prev, endTime: newValue }));
                      setErrors({
                        ...errors,
                        endTime: false,
                        timeInvalid: false,
                      });
                    }}
                    disabled={formData.isUntilFurtherNotice}
                    timeSteps={{ minutes: 1 }}
                    ampm={false}
                    slotProps={{
                      textField: {
                        size: "small",
                        fullWidth: true,
                        className: errors.endTime ? "bg-red-50" : "",
                        error: !!errors.endTime,
                      },
                    }}
                  />
                  {errors.timeInvalid && (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                      <AlertCircle size={10} /> {errors.timeInvalid}
                    </span>
                  )}
                </div>
              </>
            )}

            {showRescheduleSop && (
              <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="p-1.5 bg-red-100 text-red-600 rounded-md">
                    <AlertCircle size={16} />
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Reschedule Protocol
                  </h4>
                </div>
                <div className="space-y-3">
                  <div
                    onClick={() =>
                      setRescheduleChecklist((p) => ({
                        ...p,
                        internal: !p.internal,
                      }))
                    }
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group ${rescheduleChecklist.internal ? "bg-emerald-50/80 border-emerald-500 shadow-md" : "bg-white border-gray-100 hover:border-blue-200 hover:shadow-md"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${rescheduleChecklist.internal ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110" : "bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500"}`}
                      >
                        {rescheduleChecklist.internal ? (
                          <Check size={16} strokeWidth={3} />
                        ) : (
                          <span className="text-xs font-bold">1</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <span
                          className={`block text-xs font-bold transition-colors ${rescheduleChecklist.internal ? "text-emerald-900" : "text-gray-700"}`}
                        >
                          Notify Internal Group
                        </span>
                      </div>
                    </div>
                    <div
                      className="mt-3 pl-12 flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-[10px] font-mono text-gray-500 truncate select-all">
                        {internalUpdateMsg}
                      </div>
                      <CopyButton text={internalUpdateMsg} label="COPY" />
                    </div>
                  </div>
                  <div
                    onClick={() =>
                      setRescheduleChecklist((p) => ({
                        ...p,
                        boSync: !p.boSync,
                      }))
                    }
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group ${rescheduleChecklist.boSync ? "bg-emerald-50/80 border-emerald-500 shadow-md" : "bg-white border-gray-100 hover:border-blue-200 hover:shadow-md"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${rescheduleChecklist.boSync ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110" : "bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500"}`}
                    >
                      {rescheduleChecklist.boSync ? (
                        <Check size={16} strokeWidth={3} />
                      ) : (
                        <span className="text-xs font-bold">2</span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold transition-colors ${rescheduleChecklist.boSync ? "text-emerald-900" : "text-gray-700"}`}
                    >
                      Update BO8.2 & Sync BO8.7
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: SCRIPTS & SOPs */}
          <div
            className={`w-1/2 p-6 flex flex-col overflow-y-auto ${isUrgent ? "bg-red-50" : isBoWebSop && !isCancelled ? "bg-[#f4f7fc]" : "bg-gray-50"}`}
          >
            {isUrgent && isBoWebSop ? (
              // --- NEW: URGENT BO/WEB SOP LAYOUT ---
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-red-200">
                  <div className="flex items-center gap-2">
                    <div className="bg-red-100 p-1.5 rounded text-red-600">
                      <AlertCircle size={16} />
                    </div>
                    <h3 className="text-xs font-bold text-red-900 uppercase tracking-widest">
                      Urgent {formData.provider} SOP
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId && wasTimeChanged && isUrgentBoWebLocked ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                        <AlertCircle size={12} /> Time Changed: Verify steps
                      </span>
                    ) : isUrgentBoWebLocked ? (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-1 rounded">
                        Complete steps
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded flex items-center gap-1">
                        <Check size={12} /> Ready
                      </span>
                    )}
                  </div>
                </div>

                {/* Step 1 */}
                <div
                  onClick={() =>
                    setUrgentBoWebChecks((prev) => ({
                      ...prev,
                      step1: !prev.step1,
                    }))
                  }
                  className={getUrgentStepClass(urgentBoWebChecks.step1)}
                >
                  <div className={getUrgentBadgeClass(urgentBoWebChecks.step1)}>
                    {urgentBoWebChecks.step1 ? (
                      <>
                        <Check size={10} strokeWidth={4} /> DONE
                      </>
                    ) : (
                      "STEP 1"
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold mt-2 mb-2 transition-colors ${urgentBoWebChecks.step1 ? "text-emerald-900" : "text-gray-700"}`}
                  >
                    Send msg to internal group:
                  </p>
                  <div
                    className="flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-[10px] font-mono text-gray-600 whitespace-pre-wrap select-all">
                      {urgentBoWebData.scriptMsg || (
                        <span className="text-gray-300 italic">
                          Select time first...
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <CopyButton text={urgentBoWebData.scriptMsg} />
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div
                  onClick={() =>
                    setUrgentBoWebChecks((prev) => ({
                      ...prev,
                      step2: !prev.step2,
                    }))
                  }
                  className={getUrgentStepClass(urgentBoWebChecks.step2)}
                >
                  <div className={getUrgentBadgeClass(urgentBoWebChecks.step2)}>
                    {urgentBoWebChecks.step2 ? (
                      <>
                        <Check size={10} strokeWidth={4} /> DONE
                      </>
                    ) : (
                      "STEP 2"
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold mt-2 transition-colors ${urgentBoWebChecks.step2 ? "text-emerald-900" : "text-gray-700"}`}
                  >
                    Notify merchants via robot BO:{" "}
                    <span className="font-bold text-red-700">
                      [IC-Main Announcement(No Stag)]
                    </span>
                  </p>
                </div>

                {/* Step 3 */}
                <div
                  onClick={() =>
                    setUrgentBoWebChecks((prev) => ({
                      ...prev,
                      step3: !prev.step3,
                    }))
                  }
                  className={getUrgentStepClass(urgentBoWebChecks.step3)}
                >
                  <div className={getUrgentBadgeClass(urgentBoWebChecks.step3)}>
                    {urgentBoWebChecks.step3 ? (
                      <>
                        <Check size={10} strokeWidth={4} /> DONE
                      </>
                    ) : (
                      "STEP 3"
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold mt-2 mb-2 transition-colors ${urgentBoWebChecks.step3 ? "text-emerald-900" : "text-gray-700"}`}
                  >
                    Report back to IP Internal Group:
                  </p>
                  <div
                    className="flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-[10px] font-mono text-gray-600 select-all">
                      {urgentBoWebData.reportBack}
                    </div>
                    <div className="flex-shrink-0">
                      <CopyButton text={urgentBoWebData.reportBack} />
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div
                  onClick={() =>
                    setUrgentBoWebChecks((prev) => ({
                      ...prev,
                      step4: !prev.step4,
                    }))
                  }
                  className={getUrgentStepClass(urgentBoWebChecks.step4)}
                >
                  <div className={getUrgentBadgeClass(urgentBoWebChecks.step4)}>
                    {urgentBoWebChecks.step4 ? (
                      <>
                        <Check size={10} strokeWidth={4} /> DONE
                      </>
                    ) : (
                      "STEP 4"
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold mt-2 mb-3 transition-colors ${urgentBoWebChecks.step4 ? "text-emerald-900" : "text-gray-700"}`}
                  >
                    Redmine creation:
                  </p>

                  <div
                    className="space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[10px] font-bold text-gray-400">
                          TITLE
                        </label>
                        <CopyButton text={urgentBoWebData.title} />
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-[10px] font-mono text-gray-800 break-words">
                        {urgentBoWebData.title || (
                          <span className="text-gray-300 italic">
                            Waiting...
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[10px] font-bold text-gray-400">
                          START CONTENT
                        </label>
                        <CopyButton text={urgentBoWebData.scriptMsg} />
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-[10px] font-mono text-gray-800 whitespace-pre-wrap">
                        {urgentBoWebData.scriptMsg || (
                          <span className="text-gray-300 italic">
                            Waiting...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isUrgent ? (
              // --- STANDARD URGENT LAYOUT ---
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-red-200">
                  <div className="bg-red-100 p-1.5 rounded text-red-600">
                    <AlertCircle size={16} />
                  </div>
                  <h3 className="text-xs font-bold text-red-800 uppercase tracking-widest">
                    Urgent SOP & Scripts
                  </h3>
                </div>
                <div className="bg-white border border-red-100 rounded-lg p-3 shadow-sm space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Required SOP Actions
                  </h4>

                  {!isPartGame && (
                    <div
                      onClick={() =>
                        setUrgentChecks((prev) => ({
                          ...prev,
                          contact: !prev.contact,
                        }))
                      }
                      className={`flex flex-col gap-2 p-2.5 rounded-md border cursor-pointer transition-all ${urgentChecks.contact ? "bg-red-50 border-red-300" : "bg-white border-gray-200 hover:border-red-200"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-[3px] flex items-center justify-center border transition-colors ${urgentChecks.contact ? "bg-red-600 border-red-600" : "border-gray-300 bg-white"}`}
                        >
                          {urgentChecks.contact && (
                            <Check
                              size={10}
                              className="text-white"
                              strokeWidth={4}
                            />
                          )}
                        </div>
                        <span
                          className={`text-xs ${urgentChecks.contact ? "text-red-900 font-medium" : "text-gray-600"}`}
                        >
                          1. Contact Personnel to Open/Close Game
                        </span>
                      </div>
                      <div className="pl-7 space-y-1.5">
                        <div className="text-[10px] text-gray-500 flex flex-col gap-1 bg-gray-50 p-2 rounded border border-gray-100">
                          <div className="flex gap-1">
                            <span className="font-bold text-gray-700 whitespace-nowrap">
                              Mon-Fri 10AM-7PM:
                            </span>{" "}
                            <span>Carmen (IP Internal) / Support</span>
                          </div>
                          <div className="flex gap-1">
                            <span className="font-bold text-gray-700 whitespace-nowrap">
                              Outside of above:
                            </span>{" "}
                            <span>Open/Close Teams Group</span>
                          </div>
                          <div className="flex gap-1">
                            <span className="font-bold text-red-600 whitespace-nowrap">
                              No Reply? (&gt;15m):
                            </span>{" "}
                            <span>Live Chat on WEB for QQ288 Support</span>
                          </div>
                          <div className="flex gap-1">
                            <span className="font-bold text-red-700 whitespace-nowrap">
                              Still No Reply?
                            </span>{" "}
                            <span className="font-bold text-red-700 underline">
                              Call Carmen
                            </span>
                          </div>
                        </div>
                        <div
                          className="mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex gap-2">
                            <div className="flex-1 bg-white border border-gray-200 rounded px-2 py-1.5 text-[10px] font-mono text-gray-600 truncate select-all">
                              {urgentInternalMsg}
                            </div>
                            <CopyButton
                              text={urgentInternalMsg}
                              label="Teams"
                            />
                          </div>
                          <div className="flex gap-2 mt-1">
                            <div className="flex-1 bg-white border border-gray-200 rounded px-2 py-1.5 text-[10px] font-mono text-gray-600 truncate select-all">
                              {boCloseScript}
                            </div>
                            <CopyButton
                              text={boCloseScript}
                              label="Open/Close"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    onClick={() =>
                      setUrgentChecks((prev) => ({ ...prev, bo82: !prev.bo82 }))
                    }
                    className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-all ${urgentChecks.bo82 ? "bg-red-50 border-red-300" : "bg-white border-gray-200 hover:border-red-200"}`}
                  >
                    <div
                      className={`w-4 h-4 rounded-[3px] flex items-center justify-center border transition-colors ${urgentChecks.bo82 ? "bg-red-600 border-red-600" : "border-gray-300 bg-white"}`}
                    >
                      {urgentChecks.bo82 && (
                        <Check
                          size={10}
                          className="text-white"
                          strokeWidth={4}
                        />
                      )}
                    </div>
                    <span
                      className={`text-xs ${urgentChecks.bo82 ? "text-red-900 font-medium" : "text-gray-600"}`}
                    >
                      {formData.isInHouse ? (
                        <>
                          Notify <b>Internal Maint. Group</b> (No BO8.2)
                        </>
                      ) : (
                        <>
                          {isPartGame ? "1." : "2."} Create <b>BO 8.2</b> (Do
                          NOT Sync 8.7)
                        </>
                      )}
                    </span>
                  </div>

                  {!isPartGame && (
                    <div
                      onClick={() =>
                        setUrgentChecks((prev) => ({
                          ...prev,
                          merchant: !prev.merchant,
                        }))
                      }
                      className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-all ${urgentChecks.merchant ? "bg-red-50 border-red-300" : "bg-white border-gray-200 hover:border-red-200"}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-[3px] flex items-center justify-center border transition-colors ${urgentChecks.merchant ? "bg-red-600 border-red-600" : "border-gray-300 bg-white"}`}
                      >
                        {urgentChecks.merchant && (
                          <Check
                            size={10}
                            className="text-white"
                            strokeWidth={4}
                          />
                        )}
                      </div>
                      <span
                        className={`text-xs ${urgentChecks.merchant ? "text-red-900 font-medium" : "text-gray-600"}`}
                      >
                        3. Notify Merchants using the <b>BOT</b>
                      </span>
                    </div>
                  )}

                  <div
                    onClick={() =>
                      setUrgentChecks((prev) => ({
                        ...prev,
                        redmine: !prev.redmine,
                      }))
                    }
                    className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-all ${urgentChecks.redmine ? "bg-red-50 border-red-300" : "bg-white border-gray-200 hover:border-red-200"}`}
                  >
                    <div
                      className={`w-4 h-4 rounded-[3px] flex items-center justify-center border transition-colors ${urgentChecks.redmine ? "bg-red-600 border-red-600" : "border-gray-300 bg-white"}`}
                    >
                      {urgentChecks.redmine && (
                        <Check
                          size={10}
                          className="text-white"
                          strokeWidth={4}
                        />
                      )}
                    </div>
                    <span
                      className={`text-xs ${urgentChecks.redmine ? "text-red-900 font-medium" : "text-gray-600"}`}
                    >
                      {isPartGame ? "2." : "4."} Create <b>Redmine Ticket</b>{" "}
                      (Attach Screenshot)
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-bold text-red-400">
                      TITLE (BO & Redmine)
                    </label>
                    <CopyButton text={urgentScript.title} />
                  </div>
                  <div className="bg-white border border-red-200 rounded p-3 text-xs font-mono text-gray-800 break-words shadow-sm">
                    {urgentScript.title || (
                      <span className="text-gray-300 italic">
                        Select provider & time...
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-bold text-red-400">
                      ANNOUNCEMENT (Robot, Redmine, BO8.2)
                    </label>
                    <CopyButton text={urgentScript.startMessage} />
                  </div>
                  <div className="bg-white border border-red-200 rounded p-3 text-xs font-mono text-gray-800 whitespace-pre-wrap shadow-sm min-h-[120px]">
                    {urgentScript.startMessage || (
                      <span className="text-gray-300 italic">
                        Waiting for input...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : isBoWebSop && !isCancelled ? (
              // --- SCHEDULED BO/WEB SOP LAYOUT ---
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 p-1.5 rounded text-blue-600">
                      <AlertCircle size={16} />
                    </div>
                    <h3 className="text-xs font-bold text-blue-900 uppercase tracking-widest">
                      {formData.provider} SOP
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId && wasTimeChanged && isBoWebLocked ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                        <AlertCircle size={12} /> Time Changed: Verify steps
                      </span>
                    ) : isBoWebLocked ? (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-1 rounded">
                        Complete all steps to confirm
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded flex items-center gap-1">
                        <Check size={12} /> Ready
                      </span>
                    )}
                  </div>
                </div>

                {/* Step 1 */}
                <div
                  onClick={() =>
                    setBoWebChecks((prev) => ({ ...prev, step1: !prev.step1 }))
                  }
                  className={getStepClass(boWebChecks.step1)}
                >
                  <div className={getBadgeClass(boWebChecks.step1)}>
                    {boWebChecks.step1 ? (
                      <>
                        <Check size={10} strokeWidth={4} /> DONE
                      </>
                    ) : (
                      "STEP 1"
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold mt-2 mb-2 transition-colors ${boWebChecks.step1 ? "text-emerald-900" : "text-gray-700"}`}
                  >
                    Send maintenance message to internal group:
                  </p>
                  <div
                    className="flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-[10px] font-mono text-gray-600 whitespace-pre-wrap select-all">
                      {boWebData.scriptMsg || (
                        <span className="text-gray-300 italic">
                          Please select start/end time first...
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <CopyButton text={boWebData.scriptMsg} />
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div
                  onClick={() =>
                    setBoWebChecks((prev) => ({ ...prev, step2: !prev.step2 }))
                  }
                  className={getStepClass(boWebChecks.step2)}
                >
                  <div className={getBadgeClass(boWebChecks.step2)}>
                    {boWebChecks.step2 ? (
                      <>
                        <Check size={10} strokeWidth={4} /> DONE
                      </>
                    ) : (
                      "STEP 2"
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold mt-2 transition-colors ${boWebChecks.step2 ? "text-emerald-900" : "text-gray-700"}`}
                  >
                    Notify the merchants via robot's BO using{" "}
                    <span className="font-bold text-blue-700">
                      [IC-Main Group Announcement(NO stag)]
                    </span>
                  </p>
                </div>

                {/* Step 3 */}
                <div
                  onClick={() =>
                    setBoWebChecks((prev) => ({ ...prev, step3: !prev.step3 }))
                  }
                  className={getStepClass(boWebChecks.step3)}
                >
                  <div className={getBadgeClass(boWebChecks.step3)}>
                    {boWebChecks.step3 ? (
                      <>
                        <Check size={10} strokeWidth={4} /> DONE
                      </>
                    ) : (
                      "STEP 3"
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold mt-2 mb-2 transition-colors ${boWebChecks.step3 ? "text-emerald-900" : "text-gray-700"}`}
                  >
                    Report back to IP internal Group as task is completed:
                  </p>
                  <div
                    className="flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-[10px] font-mono text-gray-600 select-all">
                      {boWebData.reportBack}
                    </div>
                    <div className="flex-shrink-0">
                      <CopyButton text={boWebData.reportBack} />
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div
                  onClick={() =>
                    setBoWebChecks((prev) => ({ ...prev, step4: !prev.step4 }))
                  }
                  className={getStepClass(boWebChecks.step4)}
                >
                  <div className={getBadgeClass(boWebChecks.step4)}>
                    {boWebChecks.step4 ? (
                      <>
                        <Check size={10} strokeWidth={4} /> DONE
                      </>
                    ) : (
                      "STEP 4"
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold mt-2 transition-colors ${boWebChecks.step4 ? "text-emerald-900" : "text-gray-700"}`}
                  >
                    Set up BO8.2
                  </p>
                </div>

                {/* Step 5 */}
                <div
                  onClick={() =>
                    setBoWebChecks((prev) => ({ ...prev, step5: !prev.step5 }))
                  }
                  className={getStepClass(boWebChecks.step5)}
                >
                  <div className={getBadgeClass(boWebChecks.step5)}>
                    {boWebChecks.step5 ? (
                      <>
                        <Check size={10} strokeWidth={4} /> DONE
                      </>
                    ) : (
                      "STEP 5"
                    )}
                  </div>
                  <p
                    className={`text-xs font-semibold mt-2 mb-3 transition-colors ${boWebChecks.step5 ? "text-emerald-900" : "text-gray-700"}`}
                  >
                    Create the Redmine Ticket:
                  </p>

                  <div
                    className="space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[10px] font-bold text-gray-400">
                          TITLE
                        </label>
                        <CopyButton text={boWebData.title} />
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-[10px] font-mono text-gray-800 break-words">
                        {boWebData.title || (
                          <span className="text-gray-300 italic">
                            Waiting for input...
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <label className="text-[10px] font-bold text-gray-400">
                          START MESSAGE
                        </label>
                        <CopyButton text={boWebData.scriptMsg} />
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-[10px] font-mono text-gray-800 whitespace-pre-wrap">
                        {boWebData.scriptMsg || (
                          <span className="text-gray-300 italic">
                            Waiting for input...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // --- STANDARD SCHEDULED / CANCELLED / PART OF GAME LAYOUT ---
              <div className="flex flex-col gap-4 h-full">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Generated Script
                  </span>
                  {formData.isInHouse ? (
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                      INTERNAL ONLY
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-gray-400">
                      READ-ONLY
                    </span>
                  )}
                </div>

                <div className="group relative">
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[10px] font-semibold text-gray-400">
                      TITLE
                    </label>
                    <CopyButton text={generateScheduledScript("title")} />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-sm p-3 text-xs font-mono text-gray-800 break-words min-h-[3rem] max-h-20 overflow-y-auto">
                    {generateScheduledScript("title")}
                  </div>
                </div>

                <div className="group relative flex-1 min-h-0 flex flex-col">
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[10px] font-semibold text-gray-400">
                      BODY
                    </label>
                    <CopyButton text={generateScheduledScript("body")} />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-sm p-3 text-xs font-mono text-gray-800 whitespace-pre-wrap flex-1 overflow-y-auto">
                    {generateScheduledScript("body")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-sm transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={validateAndConfirm}
            disabled={
              loading ||
              (showRescheduleSop &&
                (!rescheduleChecklist.internal ||
                  !rescheduleChecklist.boSync)) ||
              isUrgentLocked ||
              (isBoWebSop && !isUrgent && !isCancelled && isBoWebLocked) ||
              (isBoWebSop && isUrgent && !isCancelled && isUrgentBoWebLocked)
            }
            className={`px-4 py-2 text-xs font-bold text-white rounded-sm shadow-sm transition-colors flex items-center gap-2 ${
              loading ||
              (showRescheduleSop &&
                (!rescheduleChecklist.internal ||
                  !rescheduleChecklist.boSync)) ||
              isUrgentLocked ||
              (isBoWebSop && !isUrgent && isBoWebLocked) ||
              (isBoWebSop && isUrgent && isUrgentBoWebLocked)
                ? "bg-gray-300 cursor-not-allowed"
                : isUrgent
                  ? "bg-red-600 hover:bg-red-700"
                  : isBoWebSop && !isCancelled
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-black hover:bg-gray-800"
            }`}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : editingId ? (
              "Update Entry"
            ) : (
              "Confirm Entry"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntryModal;
