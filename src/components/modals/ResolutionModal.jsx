import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  FileText,
  Send,
  Check,
  Lock,
  ExternalLink,
  Users,
  MessageSquare,
  Timer,
} from "lucide-react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import CopyButton from "../CopyButton";

dayjs.extend(utc);
dayjs.extend(timezone);

const REDMINE_BASE_URL = "https://bugtracking.ickwbase.com/issues/";
const SHANGHAI_TZ = "Asia/Shanghai";

const ResolutionModal = ({
  isOpen,
  onClose,
  item,
  onExtend,
  onComplete,
  loading,
  initialMode = "select",
  userProfile,
}) => {
  const [mode, setMode] = useState("select");
  const [extensionType, setExtensionType] = useState("time");
  const [newEndTime, setNewEndTime] = useState(null);

  const [now, setNow] = useState(dayjs().tz(SHANGHAI_TZ));

  const endTime =
    item && item.end_time ? dayjs(item.end_time).tz(SHANGHAI_TZ) : null;
  const secondsRemaining = endTime ? endTime.diff(now, "second") : 0;

  const isLateExtension = endTime ? secondsRemaining <= 300 : false;
  const isWaitingForEndTime = isLateExtension && secondsRemaining > 0;

  const isBoWebSop = item
    ? ["BO", "WEB", "BO/WEB"].includes(item.provider)
    : false;

  const isPartGame = item
    ? item.type && item.type.includes("Part of the Game")
    : false;

  const reportBackMsg =
    "Hi Team, please be informed that the merchants have been informed through the SKYPEBOT. Thank You ~!!";

  const [checklist, setChecklist] = useState({
    manualClose: false,
    boUpdate: false,
    notifyMerchant: false,
    internalNotify: false,
    redmineUpdate: false,
    reportBack: false,
  });

  const hasStarted = () => {
    if (!item || !item.start_time) return true;
    return dayjs()
      .tz(SHANGHAI_TZ)
      .isAfter(dayjs(item.start_time).tz(SHANGHAI_TZ));
  };

  useEffect(() => {
    if (isOpen && item) {
      setMode(initialMode);
      setExtensionType("time");
      setNewEndTime(dayjs(item.end_time).tz(SHANGHAI_TZ).add(1, "hour"));
      setChecklist({
        manualClose: false,
        boUpdate: false,
        notifyMerchant: false,
        internalNotify: false,
        redmineUpdate: false,
        reportBack: false,
      });
    }
  }, [isOpen, item, initialMode]);

  useEffect(() => {
    if (isOpen && mode === "extend") {
      setNow(dayjs().tz(SHANGHAI_TZ));
      const timer = setInterval(() => setNow(dayjs().tz(SHANGHAI_TZ)), 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, mode]);

  if (!isOpen || !item) return null;

  const formatCountdown = (totalSeconds) => {
    if (totalSeconds <= 0) return "00:00";
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  let requiredKeys = [];
  if (isBoWebSop) {
    requiredKeys = [
      "internalNotify",
      "notifyMerchant",
      "reportBack",
      "redmineUpdate",
    ];
  } else if (isPartGame) {
    requiredKeys = ["boUpdate", "redmineUpdate"];
  } else {
    requiredKeys = [
      "boUpdate",
      "internalNotify",
      "notifyMerchant",
      "redmineUpdate",
    ];
  }

  if (isLateExtension && !isPartGame && !isBoWebSop) {
    requiredKeys.push("manualClose");
  }

  const isSopComplete = requiredKeys.every((key) => checklist[key]);

  const getManualCloseMsg = () => {
    return `Maintenance for ${item.provider} has been extended. Please help to close the game, Thank You.`;
  };

  const workName = userProfile?.work_name?.split(" ")[0].trim() || "Team";
  // ONLY USE 'CLOSE' FOR RESOLUTION MODAL
  const getBOCloseScript = () =>
    `This is ${workName}, please help to close 【${item.provider}】 via bo.indo368cash.com Thank You`;

  const getBoWebExtensionMsg = () => {
    if (extensionType === "notice") {
      return `Hello there\nPlease be informed that 【${item.provider}】will extend the maintenance until further notice\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
    }
    const timeStr = newEndTime?.format("YYYY-MM-DD HH:mm");
    return `Hello there\nPlease be informed that 【${item.provider}】will extend the maintenance until ${timeStr}(GMT+8).\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
  };

  const getInternalGroupMsg = () => {
    if (isBoWebSop) return getBoWebExtensionMsg();
    return `${item.provider} maintenance time extended. BO8.2 announcement has been updated.`;
  };

  const getAnnouncementBody = () => {
    if (isBoWebSop) return getBoWebExtensionMsg();

    if (isPartGame) {
      const games = (item.affected_games || "")
        .split("\n")
        .filter((g) => g.trim());
      const isMultiple = games.length > 1;
      const gameName = games[0] ? games[0].trim() : "Game Name";
      const subject = `【${isMultiple ? `${item.provider}-part of the game` : `${item.provider}-${gameName}`}】`;

      let baseMsg = "";
      if (extensionType === "notice") {
        baseMsg = `Hello there\nPlease be informed that ${subject} will extend the maintenance until further notice, during the period, other games can be able to access and the game lobby will not close.\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
      } else {
        const timeStr = newEndTime?.format("YYYY-MM-DD HH:mm");
        baseMsg = `Hello there\nPlease be informed that ${subject} will extend the maintenance until ${timeStr}(GMT+8), during the period, other games can be able to access and the game lobby will not close.\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
      }

      if (isMultiple && games.length > 0) {
        baseMsg += `\n\nAffected game list :\n\n${games.map((g) => `【${g.trim()}】`).join("\n")}`;
      }
      return baseMsg;
    }

    if (extensionType === "notice") {
      return `Hello there\nPlease be informed that 【${item.provider}】 will extend the maintenance until further notice.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
    }
    const timeStr = newEndTime?.format("YYYY-MM-DD HH:mm");
    return `Hello there\nPlease be informed that 【${item.provider}】 will extend the maintenance until ${timeStr}(GMT+8).\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
  };

  const getRedmineDisplayId = (ticketNum) => {
    if (!ticketNum) return "-";
    return `CS-${ticketNum.toString().replace(/\D/g, "")}`;
  };

  const handleConfirmExtension = () => {
    if (extensionType === "time" && !newEndTime) return;
    if (!isSopComplete || isWaitingForEndTime) return;
    onExtend(item.id, newEndTime, extensionType === "notice");
  };

  const toggleCheck = (key) => {
    if (isWaitingForEndTime) return;
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderStep = (
    key,
    number,
    text,
    icon = null,
    isCritical = false,
    copyText = null,
  ) => {
    const isChecked = checklist[key];
    const baseBorder = isCritical
      ? "border-red-100 hover:border-red-300"
      : "border-gray-100 hover:border-blue-200";
    const checkedBorder = isCritical
      ? "border-red-500 bg-red-50"
      : "border-emerald-500 bg-emerald-50/80";
    const checkedIconBg = isCritical
      ? "bg-red-500 text-white"
      : "bg-emerald-500 text-white";

    return (
      <div
        onClick={() => toggleCheck(key)}
        className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 group select-none ${
          isWaitingForEndTime ? "cursor-not-allowed" : "cursor-pointer"
        } ${
          isChecked
            ? `${checkedBorder} shadow-md transform scale-[1.01]`
            : `bg-white ${baseBorder} hover:shadow-lg hover:-translate-y-0.5`
        }`}
      >
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
            isChecked
              ? `${checkedIconBg} shadow-lg scale-110 rotate-0`
              : "bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 rotate-0"
          }`}
        >
          {isChecked ? (
            <Check size={20} strokeWidth={3} />
          ) : (
            icon || (
              <span className="text-sm font-bold font-mono">{number}</span>
            )
          )}
        </div>

        <div
          className={`flex-1 transition-colors duration-300 ${isChecked ? "text-gray-900" : "text-gray-600"}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs leading-relaxed font-medium block">
              {text}
            </span>
            {copyText && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                }}
                title="Copy Message"
              >
                <CopyButton
                  text={copyText}
                  size={14}
                  className="text-gray-400 hover:text-black bg-white border border-gray-200 p-1 rounded-md shadow-sm"
                />
              </div>
            )}
          </div>
        </div>

        {isChecked && (
          <div className="absolute top-2 right-2 opacity-20 animate-in fade-in zoom-in">
            <CheckCircle2
              size={16}
              className={isCritical ? "text-red-600" : "text-emerald-500"}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
            <Clock size={16} className="text-red-500" /> Maintenance Resolution
          </h3>

          <div className="flex items-center gap-4">
            <div className="bg-white border border-gray-200 px-2 py-1 rounded text-[10px] font-mono font-bold text-gray-500 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
              {item.redmine_ticket ? (
                <a
                  href={`${REDMINE_BASE_URL}${item.redmine_ticket}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-indigo-600 hover:underline"
                  title="Open Redmine Ticket"
                  onClick={(e) => e.stopPropagation()}
                >
                  {getRedmineDisplayId(item.redmine_ticket)}
                  <ExternalLink size={10} />
                </a>
              ) : (
                "-"
              )}
            </div>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6 flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div>
              <h4 className="font-bold text-lg text-gray-900">
                {item.provider}
              </h4>
              <p className="text-xs text-gray-500">
                Scheduled End:{" "}
                {endTime ? endTime.format("YYYY-MM-DD HH:mm") : "N/A"}
              </p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
                Action Required
              </span>
              {mode === "extend" && isLateExtension && (
                <p className="text-[10px] font-bold text-red-600 mt-1 flex items-center justify-end gap-1">
                  <AlertTriangle size={10} /> Late Extension (&lt;5m)
                </p>
              )}
            </div>
          </div>

          {mode === "select" && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={onComplete}
                className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-emerald-100 bg-emerald-50/50 rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-all group"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={28} />
                </div>
                <div className="text-center">
                  <span className="block font-bold text-emerald-900 text-lg">
                    Completed
                  </span>
                  <span className="text-xs text-emerald-600">
                    Game is open & transfers working
                  </span>
                </div>
              </button>

              {hasStarted() ? (
                <button
                  onClick={() => setMode("extend")}
                  className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-blue-100 bg-blue-50/50 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-all group"
                >
                  <div className="w-14 h-14 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock size={28} />
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-blue-900 text-lg">
                      Extend Time
                    </span>
                    <span className="text-xs text-blue-600">
                      Provider needs more time
                    </span>
                  </div>
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-gray-100 bg-gray-50 rounded-xl opacity-60 cursor-not-allowed">
                  <Clock size={28} className="text-gray-400" />
                  <div className="text-center">
                    <span className="block font-bold text-gray-500 text-lg">
                      Extend Time
                    </span>
                    <span className="text-xs text-gray-400">
                      Not started yet. Use Edit.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === "extend" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                    Extension Type
                  </label>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setExtensionType("time")}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${extensionType === "time" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-900"}`}
                    >
                      New End Time
                    </button>
                    <button
                      onClick={() => setExtensionType("notice")}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${extensionType === "notice" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-900"}`}
                    >
                      Until Further Notice
                    </button>
                  </div>
                </div>
                {extensionType === "time" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                      New Estimated End (UTC+8)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <DatePicker
                        value={newEndTime}
                        onChange={(val) => setNewEndTime(val)}
                        slotProps={{ textField: { size: "small" } }}
                      />
                      <TimePicker
                        value={newEndTime}
                        onChange={(val) => setNewEndTime(val)}
                        ampm={false}
                        slotProps={{ textField: { size: "small" } }}
                      />
                    </div>
                  </div>
                )}
                {extensionType === "notice" && (
                  <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <span className="text-xs font-medium text-gray-500 flex items-center gap-2">
                      <AlertTriangle size={14} /> Will be marked "Until Notice"
                    </span>
                  </div>
                )}
              </div>
              <hr className="border-gray-100" />

              <div className="relative rounded-xl">
                {isWaitingForEndTime && (
                  <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl border border-orange-200 shadow-xl animate-in fade-in zoom-in-95 duration-300">
                    <Lock
                      size={36}
                      className="text-orange-500 mb-3 animate-pulse"
                    />
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      Extension Locked
                    </h4>
                    <p className="text-sm text-gray-600 text-center max-w-sm leading-relaxed">
                      Because this extension is within 5 minutes of completion,
                      you must wait until exactly{" "}
                      <strong className="text-orange-600 font-mono text-base">
                        {endTime.format("HH:mm:ss")}
                      </strong>{" "}
                      before proceeding with the SOP.
                    </p>
                    <div className="mt-5 px-5 py-3 bg-orange-100 text-orange-800 font-mono font-bold rounded-xl text-2xl flex items-center gap-3 shadow-inner border border-orange-200">
                      <Timer size={24} className="text-orange-600" />
                      {formatCountdown(secondsRemaining)}
                    </div>
                  </div>
                )}

                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch transition-all duration-500 ${isWaitingForEndTime ? "opacity-20 pointer-events-none blur-[1px]" : "opacity-100"}`}
                >
                  {/* LEFT: CHECKLIST */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-gray-900 uppercase flex items-center gap-2">
                      <FileText size={14} /> SOP Checklist{" "}
                      <span className="text-red-500">*</span>
                    </h5>
                    <div className="space-y-2">
                      {isLateExtension &&
                        !isPartGame &&
                        !isBoWebSop &&
                        renderStep(
                          "manualClose",
                          "!",
                          <>
                            <strong>CRITICAL: Manual Game Close</strong>
                            <br />
                            Late extension. Manually close game to prevent
                            auto-open.
                          </>,
                          <Lock size={16} />,
                          true,
                        )}

                      {isBoWebSop ? (
                        <>
                          {renderStep(
                            "internalNotify",
                            "1",
                            <>
                              Send message to <strong>IP Internal Group</strong>
                              .<br />
                              (Use copy text on right)
                            </>,
                            <Send size={16} />,
                            false,
                            getInternalGroupMsg(),
                          )}
                          {renderStep(
                            "notifyMerchant",
                            "2",
                            <>
                              Notify Merchant via Robot's BO Select:
                              <br />
                              <strong>
                                【IC-Main Group Announcement(No Stag)】
                              </strong>
                            </>,
                            <Users size={16} />,
                          )}
                          {renderStep(
                            "reportBack",
                            "3",
                            <>
                              Report back to <strong>IP Internal Group</strong>{" "}
                              once task is completed.
                            </>,
                            <MessageSquare size={16} />,
                            false,
                            reportBackMsg,
                          )}
                          {renderStep(
                            "redmineUpdate",
                            "4",
                            <>
                              Update <strong>Redmine</strong>.
                            </>,
                          )}
                        </>
                      ) : isPartGame ? (
                        <>
                          {renderStep(
                            "boUpdate",
                            "1",
                            <>
                              Update <strong>BO8.2</strong> Announcement.
                              <br />
                              <span className="text-[10px] text-gray-500 font-normal">
                                (No need to sync BO8.7)
                              </span>
                              <br />
                              {extensionType === "notice"
                                ? 'Check "Until Further Notice".'
                                : 'Update the "Start Content".'}
                            </>,
                          )}
                          {renderStep(
                            "redmineUpdate",
                            "2",
                            <>
                              Update <strong>Redmine</strong>.
                            </>,
                          )}
                        </>
                      ) : (
                        <>
                          {renderStep(
                            "boUpdate",
                            "1",
                            <>
                              Update <strong>BO8.2</strong> Announcement.
                              <br />
                              {extensionType === "notice"
                                ? 'Check "Until Further Notice".'
                                : 'Update the "Start Content".'}
                            </>,
                          )}
                          {renderStep(
                            "internalNotify",
                            "2",
                            <>
                              Notify <strong>IP Internal Group</strong>.<br />
                              (Use copy text on right)
                            </>,
                          )}
                          {renderStep(
                            "notifyMerchant",
                            "3",
                            <>
                              Notify Merchant via Robot's BO Select:
                              <br />
                              <strong>
                                【IC-Maintenance&Promo of providers】
                              </strong>
                            </>,
                          )}
                          {renderStep(
                            "redmineUpdate",
                            "4",
                            <>
                              Update <strong>Redmine & Sync BO8.7</strong>.
                            </>,
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: MESSAGES */}
                  <div className="space-y-3 flex flex-col h-full">
                    <h5 className="text-xs font-bold text-gray-900 uppercase flex items-center gap-2">
                      <Send size={14} /> Messages to Copy
                    </h5>

                    {isLateExtension && !isPartGame && !isBoWebSop && (
                      <div className="space-y-1 shrink-0">
                        <label className="text-[10px] font-bold text-red-500 animate-pulse">
                          MANUAL CLOSE MSG (CRITICAL)
                        </label>
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-2">
                            <div className="flex-1 bg-red-50 border border-red-200 rounded p-2 text-xs font-mono text-red-800 truncate">
                              {getManualCloseMsg()}
                            </div>
                            <CopyButton
                              text={getManualCloseMsg()}
                              label="Teams"
                              disabled={isWaitingForEndTime}
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 bg-red-50 border border-red-200 rounded p-2 text-xs font-mono text-red-800 truncate">
                              {getBOCloseScript()}
                            </div>
                            <CopyButton
                              text={getBOCloseScript()}
                              label="Open/Close"
                              disabled={isWaitingForEndTime}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {!isPartGame && (
                      <div className="space-y-1 shrink-0">
                        <label className="text-[10px] font-bold text-gray-400">
                          INTERNAL GROUP MSG
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-xs font-mono text-gray-700 truncate">
                            {getInternalGroupMsg()}
                          </div>
                          <CopyButton
                            text={getInternalGroupMsg()}
                            disabled={isWaitingForEndTime}
                          />
                        </div>
                      </div>
                    )}

                    {isBoWebSop && (
                      <div className="space-y-1 shrink-0">
                        <label className="text-[10px] font-bold text-gray-400">
                          REPORT BACK MSG
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-xs font-mono text-gray-700 truncate">
                            {reportBackMsg}
                          </div>
                          <CopyButton
                            text={reportBackMsg}
                            disabled={isWaitingForEndTime}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 flex-1 flex flex-col min-h-0">
                      <label className="text-[10px] font-bold text-gray-400 shrink-0">
                        ANNOUNCEMENT BODY
                      </label>
                      <div className="flex gap-2 flex-1 min-h-0">
                        <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-xs font-mono text-gray-700 overflow-y-auto min-h-[80px] h-full whitespace-pre-wrap">
                          {getAnnouncementBody()}
                        </div>
                        <CopyButton
                          text={getAnnouncementBody()}
                          disabled={isWaitingForEndTime}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() =>
                    initialMode === "extend" ? onClose() : setMode("select")
                  }
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {initialMode === "extend" ? "Cancel" : "Back"}
                </button>
                <button
                  onClick={handleConfirmExtension}
                  disabled={loading || !isSopComplete || isWaitingForEndTime}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all ${isSopComplete && !isWaitingForEndTime ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isWaitingForEndTime ? (
                    "Wait for End Time to Proceed"
                  ) : isSopComplete ? (
                    "Confirm Extension & Update System"
                  ) : (
                    "Complete SOP Checklist to Proceed"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResolutionModal;
