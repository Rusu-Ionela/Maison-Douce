function pad2(value) {
  return String(value).padStart(2, "0");
}

export function formatDateInput(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

export function parseDateInput(value, options = {}) {
  if (!value) {
    return null;
  }

  const [year, month, day] = String(value).split("-").map(Number);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const {
    hours = 12,
    minutes = 0,
    seconds = 0,
    milliseconds = 0,
  } = options;

  const date = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    seconds,
    milliseconds
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(value, amount) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() + Number(amount || 0));
  return date;
}

export function getTodayDateInput() {
  return formatDateInput(new Date());
}
