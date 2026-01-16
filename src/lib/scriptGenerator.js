import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const generateUrgentScript = (formData) => {
    const { provider, startTime, endTime, isUntilFurtherNotice } = formData;
    
    // Safety check
    if (!provider || !startTime) return { title: '', startMessage: '', finishMessage: '' };

    // Format Times to GMT+8 (Asia/Shanghai)
    // We assume the input 'startTime' is already a DayJS object from the DatePicker
    const dStart = dayjs(startTime).tz("Asia/Shanghai").format('YYYY-MM-DD');
    const tStart = dayjs(startTime).tz("Asia/Shanghai").format('HH:mm');
    
    let timeRange = '';
    let titleSuffix = '';

    if (isUntilFurtherNotice) {
        timeRange = `until further notice`;
        titleSuffix = `until further notice (from ${dStart} ${tStart})`;
    } else {
        const tEnd = endTime ? dayjs(endTime).tz("Asia/Shanghai").format('HH:mm') : '??:??';
        timeRange = `${tStart} to ${tEnd}(GMT+8)`;
        titleSuffix = `on ${dStart} between ${timeRange}`;
    }

    // 1. Title (For BO & Redmine)
    const title = `【${provider}】【Urgent Maintenance】${titleSuffix}`;

    // 2. Start Message (For Robot BO)
    const startMessage = `Hello there
Please be informed that【${provider}】 is going urgent maintenance ${isUntilFurtherNotice ? 'until further notice' : `on ${dStart} between ${timeRange}`} , the game lobby will closed during this period.
Please contact us if you require further assistance.
Thank you for your cooperation and patience.`;

    // 3. Finish Message (For Completion)
    const finishMessage = `Hello there, 
Please be informed that 【${provider}】 urgent maintenance has been completed
Please contact us if you require further assistance.
Thank you for your support and cooperation.`;

    return { title, startMessage, finishMessage };
};