/**
 * LAKSH Date & Time Utility Functions
 * Ensures correct local date, time, and timestamp handling across all user operations.
 */

/**
 * Returns the local date string in YYYY-MM-DD format.
 * Prevents UTC day-shift bugs for positive or negative timezone offsets.
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} YYYY-MM-DD
 */
export const getLocalDateStr = (date = new Date()) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns the local time string in HH:mm 24-hour format for <input type="time" />.
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} HH:mm
 */
export const getLocalTimeStr = (date = new Date()) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Builds a local ISO-like datetime string YYYY-MM-DDTHH:mm:ss without timezone skew.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeStr - HH:mm or HH:mm:ss
 * @returns {string} YYYY-MM-DDTHH:mm:ss
 */
export const buildLocalDateTimeStr = (dateStr, timeStr) => {
  if (!dateStr) dateStr = getLocalDateStr();
  if (!timeStr) timeStr = getLocalTimeStr();
  const cleanTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr}T${cleanTime}`;
};

/**
 * Formats an ISO or datetime string into local display time (e.g. "07:16 PM").
 * @param {string|Date} dateOrStr
 * @returns {string}
 */
export const formatDisplayTime = (dateOrStr) => {
  if (!dateOrStr) return '';
  let str = String(dateOrStr).trim();
  // If stored in database as 'YYYY-MM-DD HH:mm:ss'
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Formats a date string (YYYY-MM-DD) into user-friendly display date.
 * (e.g. "Wednesday, Oct 21, 2026" or "Today, Oct 21")
 * @param {string|Date} dateOrStr
 * @returns {string}
 */
export const formatDisplayDate = (dateOrStr) => {
  if (!dateOrStr) return '';
  const str = String(dateOrStr).split('T')[0].split(' ')[0];
  const parts = str.split('-').map(Number);
  if (parts.length !== 3) return str;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);

  const todayStr = getLocalDateStr();
  const isToday = str === todayStr;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = str === getLocalDateStr(yesterday);

  const formatted = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (isToday) return `Today (${formatted})`;
  if (isYesterday) return `Yesterday (${formatted})`;
  return formatted;
};
