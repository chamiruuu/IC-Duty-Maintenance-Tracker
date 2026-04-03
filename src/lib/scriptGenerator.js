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
    const dStart = dayjs(startTime).tz("Asia/Shanghai").format('YYYY-MM-DD');
    const tStart = dayjs(startTime).tz("Asia/Shanghai").format('HH:mm');
    
    let timePhrase = '';
    let titleSuffix = '';

    if (isUntilFurtherNotice) {
        timePhrase = `until further notice`;
        titleSuffix = `until further notice (from ${dStart} ${tStart})`;
    } else {
        const dEnd = endTime ? dayjs(endTime).tz("Asia/Shanghai").format('YYYY-MM-DD') : '';
        const tEnd = endTime ? dayjs(endTime).tz("Asia/Shanghai").format('HH:mm') : '??:??';
        
        // MULTI-DAY CHECK
        if (dEnd && dStart !== dEnd) {
            timePhrase = `from ${dStart} ${tStart} to ${dEnd} ${tEnd}(GMT+8)`;
            titleSuffix = timePhrase;
        } else {
            timePhrase = `on ${dStart} between ${tStart} to ${tEnd}(GMT+8)`;
            titleSuffix = timePhrase;
        }
    }

    // 1. Title (For BO & Redmine)
    const title = `【${provider}】【Urgent Maintenance】 ${titleSuffix}`.replace(/】\s+on/, '】on');

    // 2. Start Message (For Robot BO)
    const startMessage = `Hello there\nPlease be informed that【${provider}】 is going urgent maintenance ${timePhrase} , the game lobby will closed during this period.\nPlease contact us if you require further assistance.\nThank you for your cooperation and patience.`;

    // 3. Finish Message (For Completion)
    const finishMessage = `Hello there, \nPlease be informed that 【${provider}】 urgent maintenance has been completed\nPlease contact us if you require further assistance.\nThank you for your support and cooperation.`;

    return { title, startMessage, finishMessage };
};