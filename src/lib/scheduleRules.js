import { isSameDay, parseISO, isMonday, getDate } from 'date-fns';

// 0=Sun, 1=Mon, ..., 5=Fri
export const WEEKLY_SCHEDULE = {
    1: [ // MONDAY Target
        { name: "SA Gaming", type: "weekly" },
        { name: "WM", type: "weekly" },
        { name: "GClub Live", type: "weekly" },
        { name: "OG Plus", type: "first_monday" },
        { name: "ALLBET", type: "first_monday" }
    ],
    2: [ // TUESDAY Target
        { name: "BG Casino", type: "weekly" },
        { name: "JILI", type: "weekly" },
        { name: "QQ4D", type: "weekly" },
        { name: "MG Live", type: "weekly" }
    ],
    3: [ // WEDNESDAY Target
        { name: "AWC", type: "weekly", note: "Sexy Casino" },
        { name: "DG Casino", type: "weekly" },
        { name: "CQ9 Slots", type: "weekly" },
        { name: "RSG", type: "weekly" }
    ],
    4: [], // THURSDAY Target
    5: [ // FRIDAY Target
        { name: "C-Sports", type: "weekly", note: "Night Shift Confirm" }
    ],
    6: [], // SATURDAY Target
    0: []  // SUNDAY Target
};

const isFirstMondayOfMonth = (date) => {
    return isMonday(date) && getDate(date) <= 7;
};

export const getChecklistForDate = (targetDate, maintenanceList) => {
    const dayIndex = targetDate.getDay();
    const rules = WEEKLY_SCHEDULE[dayIndex] || [];

    // 1. Filter rules that apply to this specific date
    const activeRules = rules.filter(rule => {
        if (rule.type === 'first_monday') return isFirstMondayOfMonth(targetDate);
        return true;
    });

    // 2. Check against DB
    return activeRules.map(rule => {
        // Find if ANY entry exists for this provider on this date (Scheduled OR Cancelled)
        const foundEntry = maintenanceList.find(m => {
            // Case-insensitive check
            const pName = m.provider.toLowerCase();
            const rName = rule.name.toLowerCase();
            const dateMatch = isSameDay(parseISO(m.start_time), targetDate);
            // Handle Cancelled entries which might only have start_time
            return dateMatch && (pName.includes(rName) || rName.includes(pName));
        });

        return {
            provider: rule.name,
            note: rule.note,
            status: foundEntry ? 'ok' : 'missing', // 'ok' = Green, 'missing' = Red
            entry: foundEntry
        };
    });
};