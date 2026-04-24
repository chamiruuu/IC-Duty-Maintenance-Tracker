import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Activity,
  Clock,
  ArrowRight,
  Check,
  Send,
  CheckSquare,
  AlertTriangle,
  Users,
  PlayCircle,
  FileText,
  ExternalLink,
  X,
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

const CompletionModal = ({
  isOpen,
  item,
  onClose,
  onConfirm,
  sopChecks,
  setSopChecks,
  userProfile,
}) => {
  const [completionTime, setCompletionTime] = useState(null);
  const [leaderApproved, setLeaderApproved] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const nowChina = dayjs().tz("Asia/Shanghai");
      const visualNow = dayjs(nowChina.format("YYYY-MM-DD HH:mm:ss"));
      setCompletionTime(visualNow);
      setSopChecks({});
      setLeaderApproved(null);
    }
  }, [isOpen, setSopChecks]);

  if (!isOpen || !item) return null;

  const isExtended =
    item.type?.includes("Extended Maintenance") || item.is_until_further_notice;
  const isUrgent = item.type?.toLowerCase().includes("urgent");
  const isPartGame =
    item.type?.includes("Part of the Game") || !!item.affected_games;

  // Hide robot notify if it is an Extended Scheduled Maintenance with a fixed end time
  const isScheduledExtendedFixed =
    item.type?.includes("Extended Maintenance") &&
    !item.is_until_further_notice &&
    !isUrgent;

  // --- THE FIX: Also hide robot notify if it is an Urgent Part of the Game maintenance ---
  const showRobotNotify =
    (isUrgent || (isExtended && !isScheduledExtendedFixed)) &&
    !(isPartGame && isUrgent);

  const isBoWebSop = ["BO", "WEB", "BO/WEB"].includes(item.provider);
  const reportBackMsg =
    "Hi Team, please be informed that the merchants have been informed through the SKYPEBOT. Thank You ~!!";

  const scheduledEnd = item.end_time
    ? dayjs(
        dayjs(item.end_time).tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss"),
      )
    : null;

  const minutesDifference =
    scheduledEnd && completionTime
      ? scheduledEnd.diff(completionTime, "minute")
      : 0;

  const isEarly = minutesDifference > 5;
  const totalEarlyMinutes = isEarly ? minutesDifference : 0;

  const getFormattedEarlyTime = () => {
    if (totalEarlyMinutes < 60) return `${totalEarlyMinutes} mins`;
    const hours = Math.floor(totalEarlyMinutes / 60);
    const minutes = totalEarlyMinutes % 60;
    return minutes > 0 ? `${hours} hrs ${minutes} mins` : `${hours} hrs`;
  };

  const getFinishContent = () => {
    if (isPartGame) {
      const games = (item.affected_games || "")
        .split("\n")
        .filter((g) => g.trim());
      const isMultiple = games.length > 1;
      const gameName = games[0] ? games[0].trim() : "Game";
      const subjectSuffix = isMultiple ? "part of the game" : gameName;
      const subject = `${item.provider}-${subjectSuffix}`;
      const typeText = isUrgent
        ? "urgent maintenance"
        : "scheduled maintenance";
      return `Hello there,\n\nPlease be informed that 【${subject}】 ${typeText} has been completed\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
    }

    if (isUrgent) {
      return `Hello there, \nPlease be informed that 【${item.provider}】 urgent maintenance has been completed\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
    }

    if (isBoWebSop) {
      if (isExtended) {
        return `Hello there\nPlease be informed that 【${item.provider}】 extend maintenance has been completed.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
      } else {
        return `Hello there, \nPlease be informed that 【${item.provider}】 scheduled maintenance has been completed\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
      }
    }

    if (isExtended) {
      return `Hello there\nPlease be informed that 【${item.provider}】 extend maintenance has been completed.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;
    }

    return `Hello there, \nPlease be informed that 【${item.provider}】 scheduled maintenance has been completed\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;
  };

  const getManualOpenMsg = () => {
    const reason = isEarly
      ? "have completed before the scheduled end time"
      : "has been completed";
    return `maintenance for ${item.provider}, ${reason}. Please help to open. Thank You.`;
  };

  const workName = userProfile?.work_name?.split(" ")[0].trim() || "Team";
  const getBOOpenScript = () =>
    `This is ${workName}, please help to open 【${item.provider}】 via bo.indo368cash.com Thank You`;

  const getLeaderConfirmScript = () => {
    return `Hi Team, may we confirm as the maintenance for 【${item.provider}】has been completed, do we need to inform merchant's using the SKYPEBOT or not ? Thank You ~!!`;
  };

  const handleConfirm = () => {
    if (completionTime) {
      const timeString = completionTime.format("YYYY-MM-DD HH:mm:ss");
      const finalTime = dayjs.tz(timeString, "Asia/Shanghai");
      onConfirm(finalTime);
    }
  };

  const getRedmineDisplayId = (ticketNum) => {
    if (!ticketNum) return "-";
    return `CS-${ticketNum.toString().replace(/\D/g, "")}`;
  };

  const toggleCheck = (key) =>
    setSopChecks((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderCheckItem = (key, title, desc, icon, scripts = null) => {
    const isChecked = sopChecks[key];
    const activeColor = isEarly
      ? "border-orange-500 bg-orange-50/50"
      : "border-emerald-500 bg-emerald-50/50";
    const iconBg = isEarly ? "bg-orange-500" : "bg-emerald-500";
    const textColor = isEarly ? "text-orange-900" : "text-emerald-900";

    let scriptArray = [];
    if (typeof scripts === "string") {
      scriptArray = [{ text: scripts, label: "COPY" }];
    } else if (Array.isArray(scripts)) {
      scriptArray = scripts;
    }

    return (
      <div
        onClick={() => toggleCheck(key)}
        className={`w-full group flex items-start gap-4 p-4 rounded-xl border-2 text-left cursor-pointer transition-all duration-200 ${isChecked ? activeColor : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}
      >
        <div
          className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${isChecked ? `${iconBg} text-white shadow-sm` : "bg-gray-200 text-gray-500 group-hover:bg-gray-300"}`}
        >
          {isChecked ? <Check size={16} strokeWidth={3} /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-sm font-bold ${isChecked ? textColor : "text-gray-900"}`}
            >
              {title}
            </span>

            {scriptArray.length > 0 && (
              <div
                className="flex items-center gap-2 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {scriptArray.map((s, idx) => (
                  <CopyButton key={idx} text={s.text} label={s.label} />
                ))}
              </div>
            )}
          </div>

          <span className="text-xs text-gray-500 mt-1 block leading-relaxed pr-8">
            {desc}
          </span>
        </div>
      </div>
    );
  };

  let canConfirm = false;
  if (isBoWebSop) {
    const requiredChecks = isUrgent
      ? ["internalGroup", "merchantNotify", "reportBack", "redmineUpdate"]
      : [
          "internalGroup",
          "merchantNotify",
          "reportBack",
          "boUpdate",
          "redmineUpdate",
        ];

    const noLeaderChecks = isUrgent
      ? ["redmineUpdate"]
      : ["boUpdate", "redmineUpdate"];

    if (isEarly && !isUrgent) {
      if (leaderApproved === "yes") {
        canConfirm = requiredChecks.every((k) => sopChecks[k]);
      } else if (leaderApproved === "no") {
        canConfirm = noLeaderChecks.every((k) => sopChecks[k]);
      }
    } else {
      canConfirm = requiredChecks.every((k) => sopChecks[k]);
    }
  } else {
    if (isEarly) {
      if (isPartGame) {
        canConfirm = sopChecks.functionalCheck && sopChecks.announcements;
      } else {
        canConfirm =
          sopChecks.manualOpen &&
          sopChecks.functionalCheck &&
          sopChecks.announcements;
      }
    } else {
      if (isPartGame) {
        canConfirm =
          sopChecks.gameTest &&
          sopChecks.documentation &&
          (!showRobotNotify || sopChecks.robotNotify);
      } else {
        canConfirm =
          sopChecks.gameTest &&
          sopChecks.documentation &&
          (!showRobotNotify || sopChecks.robotNotify) &&
          (!isExtended || sopChecks.manualOpen);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">
        <div
          className={`px-6 py-5 border-b border-gray-200 shrink-0 ${isEarly ? "bg-orange-50" : isUrgent ? "bg-amber-50" : "bg-gray-50"}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3
                className={`text-lg font-bold tracking-tight flex items-center gap-2 ${isEarly ? "text-orange-800" : isUrgent ? "text-amber-800" : "text-gray-900"}`}
              >
                {isEarly ? (
                  <AlertTriangle size={20} className="text-orange-600" />
                ) : isUrgent ? (
                  <AlertTriangle size={20} className="text-amber-600" />
                ) : (
                  <ShieldCheck className="text-emerald-600" size={20} />
                )}
                {isEarly
                  ? "Early Completion Warning"
                  : isUrgent
                    ? "Urgent Completion"
                    : "Verify Completion"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {isEarly ? (
                  <>
                    Closing at{" "}
                    <span className="font-bold font-mono text-orange-700">
                      {completionTime ? completionTime.format("HH:mm") : ""}
                    </span>{" "}
                    ({getFormattedEarlyTime()} early). Manual verification
                    required.
                  </>
                ) : (
                  `Finalizing maintenance for ${item.provider}.`
                )}
              </p>
            </div>
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
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
              <Clock size={10} /> Set Completion Time (UTC+8)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker
                value={completionTime}
                onChange={(val) => setCompletionTime(val)}
                slotProps={{
                  textField: { size: "small", className: "bg-white" },
                }}
              />
              <TimePicker
                value={completionTime}
                onChange={(val) => setCompletionTime(val)}
                ampm={false}
                slotProps={{
                  textField: { size: "small", className: "bg-white" },
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h5
              className={`text-xs font-bold uppercase ${isEarly ? "text-orange-700" : "text-gray-900"}`}
            >
              {isEarly && !isUrgent
                ? "Manual Intervention Required (SOP)"
                : "SOP Checklist"}
            </h5>

            {isBoWebSop ? (
              <>
                {isEarly && !isUrgent && (
                  <div className="mb-5 p-4 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                          <Users size={14} />
                        </div>
                        <p className="text-sm font-bold text-gray-800">
                          Leader Confirmation
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          Ask Leader
                        </span>
                        <CopyButton text={getLeaderConfirmScript()} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setLeaderApproved("yes");
                          setSopChecks({});
                        }}
                        className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border-2 transition-all duration-200 ${
                          leaderApproved === "yes"
                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                            : "border-gray-100 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600"
                        }`}
                      >
                        <Send
                          size={16}
                          className={`mb-1.5 ${leaderApproved === "yes" ? "text-blue-600" : "text-gray-400"}`}
                        />
                        <span className="text-xs font-bold">
                          Inform Merchants
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setLeaderApproved("no");
                          setSopChecks({});
                        }}
                        className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg border-2 transition-all duration-200 ${
                          leaderApproved === "no"
                            ? "border-gray-500 bg-gray-100 text-gray-800 shadow-sm"
                            : "border-gray-100 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600"
                        }`}
                      >
                        <X
                          size={16}
                          className={`mb-1.5 ${leaderApproved === "no" ? "text-gray-600" : "text-gray-400"}`}
                        />
                        <span className="text-xs font-bold">Do Not Inform</span>
                      </button>
                    </div>
                  </div>
                )}

                {(!isEarly || isUrgent || leaderApproved === "yes") && (
                  <>
                    {renderCheckItem(
                      "internalGroup",
                      "1. Internal Group Msg",
                      "Send completion message to IP Internal Group",
                      <Send size={16} />,
                      getFinishContent(),
                    )}
                    {renderCheckItem(
                      "merchantNotify",
                      "2. Notify Merchants",
                      "Via robot BO [IC-Main Group Announcement(No Stag)]",
                      <Users size={16} />,
                    )}
                    {renderCheckItem(
                      "reportBack",
                      "3. Report Back",
                      "Report to IP internal group",
                      <CheckSquare size={16} />,
                      reportBackMsg,
                    )}
                    {!isUrgent &&
                      renderCheckItem(
                        "boUpdate",
                        "4. Update BO8.2",
                        "Update BO8.2 Finish Content",
                        <FileText size={16} />,
                      )}
                    {renderCheckItem(
                      "redmineUpdate",
                      isUrgent ? "4. Update Redmine" : "5. Update Redmine",
                      "Update Redmine with finish content",
                      <Activity size={16} />,
                    )}
                  </>
                )}

                {isEarly && !isUrgent && leaderApproved === "no" && (
                  <>
                    {renderCheckItem(
                      "boUpdate",
                      "1. Update BO8.2",
                      "Update BO8.2 Finish Content",
                      <FileText size={16} />,
                    )}
                    {renderCheckItem(
                      "redmineUpdate",
                      "2. Update Redmine",
                      "Update Redmine with finish content",
                      <Activity size={16} />,
                    )}
                  </>
                )}
              </>
            ) : isEarly ? (
              <>
                {!isPartGame &&
                  renderCheckItem(
                    "manualOpen",
                    "Manual Game Open (Note 1)",
                    "Contacted personnel & manually opened game.",
                    <PlayCircle size={16} />,
                    [
                      { text: getManualOpenMsg(), label: "Teams" },
                      { text: getBOOpenScript(), label: "Open/Close" },
                    ],
                  )}
                {renderCheckItem(
                  "functionalCheck",
                  "Functional Check",
                  "Confirmed game is open & transfers are working normally.",
                  <ShieldCheck size={16} />,
                )}
                {renderCheckItem(
                  "announcements",
                  "Update Announcements (Note 4)",
                  "Updated BO8.2 (End Announcement) & Redmine.",
                  <FileText size={16} />,
                )}
              </>
            ) : (
              <>
                {!isPartGame &&
                  isExtended &&
                  renderCheckItem(
                    "manualOpen",
                    "Manual Game Open (Note 1)",
                    "Maintenance was extended. Manually open game & confirm.",
                    <PlayCircle size={16} />,
                    [
                      { text: getManualOpenMsg(), label: "Teams" },
                      { text: getBOOpenScript(), label: "Open/Close" },
                    ],
                  )}
                {renderCheckItem(
                  "gameTest",
                  "Game & Transfer Test",
                  isPartGame
                    ? "Game was not closed. Confirmed transfers working."
                    : "Manual open successful. Game loading & transfers normal on WEB.",
                  <Activity size={16} />,
                )}
                {showRobotNotify &&
                  renderCheckItem(
                    "robotNotify",
                    "Notify Merchants (Robot BO)",
                    'Send "Maintenance Completed" announcement to 【IC-Maintenance&Promo】 group.',
                    <Users size={16} />,
                  )}
                {renderCheckItem(
                  "documentation",
                  "Update BO8.2 & Redmine",
                  isUrgent
                    ? 'Add "Completed" to BO title. Update Redmine. Assign to Carmen.'
                    : 'Add "Completed" to BO title. Update Redmine & Schedule.',
                  <CheckSquare size={16} />,
                )}
              </>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <h5 className="text-xs font-bold text-gray-900 uppercase flex items-center gap-2">
              <Send size={12} /> FINISH CONTENT
            </h5>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded p-2 text-xs font-mono text-gray-700 h-24 overflow-y-auto whitespace-pre-wrap">
                {getFinishContent()}
              </div>
              <CopyButton text={getFinishContent()} />
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col gap-4 shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-gray-400 justify-center">
            <Clock size={10} />
            <span>
              Completion timestamp:{" "}
              <strong>
                {completionTime ? completionTime.format("HH:mm:ss") : "--:--"}{" "}
                (UTC+8)
              </strong>
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`flex-[2] py-3 text-xs font-bold text-white rounded-lg shadow-lg shadow-black/10 transition-all flex items-center justify-center gap-2 ${!canConfirm ? "bg-gray-300 cursor-not-allowed" : isEarly ? "bg-orange-600 hover:bg-orange-700" : "bg-black hover:bg-gray-800"}`}
            >
              {isEarly ? "Confirm Early Completion" : "Confirm Completion"}{" "}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompletionModal;
