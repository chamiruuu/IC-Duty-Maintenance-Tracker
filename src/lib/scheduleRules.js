import { isSameDay, parseISO, isMonday, getDate } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Shanghai';

export const WEEKLY_SCHEDULE = {
    1: [ 
        { name: "SA Gaming", type: "weekly" },
        { name: "WM", type: "weekly" },
        { name: "GClub Live", type: "weekly" },
        { name: "OG Plus", type: "first_monday" },
        { name: "ALLBET", type: "first_monday" }
    ],
    2: [ 
        { name: "BG Casino", type: "weekly" },
        { name: "JILI", type: "weekly" },
        { name: "QQ4D", type: "weekly" },
        { name: "MG Live", type: "weekly" }
    ],
    3: [ 
        // 👇 ADDED STATUS LINKS HERE
        { name: "AWC", type: "weekly", statusLink: "https://allwecan.info/maint-board/19:e1edf14c6eec44ee8ff6d8d680fcda07@thread.skype" },
        { name: "Sexy Casino", type: "weekly", statusLink: "https://allwecan.info/maint-board/19:e1edf14c6eec44ee8ff6d8d680fcda07@thread.skype" },
        { name: "DG Casino", type: "weekly" },
        { name: "CQ9 Slots", type: "weekly" },
        { name: "RSG", type: "weekly" }
    ],
    4: [], 
    5: [ 
        { name: "C-Sports", type: "weekly", note: "Night Shift Confirm" }
    ],
    6: [], 
    0: []  
};

const isFirstMondayOfMonth = (date) => {
    return isMonday(date) && getDate(date) <= 7;
};

export const getChecklistForDate = (targetDate, maintenanceList) => {
    const dayIndex = targetDate.getDay();
    const rules = WEEKLY_SCHEDULE[dayIndex] || [];

    const activeRules = rules.filter(rule => {
        if (rule.type === 'first_monday') return isFirstMondayOfMonth(targetDate);
        return true;
    });

    return activeRules.map(rule => {
        const foundEntry = maintenanceList.find(m => {
            if (!m.start_time) return false;

            const pName = m.provider.toLowerCase();
            const rName = rule.name.toLowerCase();
            const nameMatch = pName.includes(rName) || rName.includes(pName);

            const dbDateZoned = toZonedTime(parseISO(m.start_time), TIMEZONE);
            const dateMatch = isSameDay(dbDateZoned, targetDate);

            return nameMatch && dateMatch;
        });

        return {
            provider: rule.name,
            note: rule.note,
            statusLink: rule.statusLink, // 👇 ADDED THIS LINE TO PASS THE LINK
            status: foundEntry ? 'ok' : 'missing',
            entry: foundEntry
        };
    });
};