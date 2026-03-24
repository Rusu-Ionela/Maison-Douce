const CalendarDayCapacity = require("../models/CalendarDayCapacity");
const CalendarSlotEntry = require("../models/CalendarSlotEntry");
const ProviderAvailability = require("../models/ProviderAvailability");

const DEFAULT_PROVIDER_SCHEDULE = Object.freeze({
  workingDays: [1, 2, 3, 4, 5, 6],
  workingHours: { start: "09:00", end: "18:00" },
  slotDurationMinutes: 60,
  breaks: [{ start: "13:00", end: "14:00" }],
  maxOrdersPerSlot: 1,
  timezone: "Europe/Chisinau",
});

function normalizePrestatorId(value) {
  return String(value || "").trim();
}

function normalizeMonthString(value) {
  const month = String(value || "").trim();
  return /^\d{4}-\d{2}$/.test(month) ? month : "";
}

function formatDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMonthRange(monthValue) {
  const month = normalizeMonthString(monthValue);
  if (!month) return null;

  const start = new Date(`${month}-01T12:00:00`);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1, 0);

  return {
    month,
    from: formatDate(start),
    to: formatDate(end),
  };
}

function buildDefaultRange(daysAhead = 60) {
  const from = new Date();
  from.setHours(12, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + Math.max(1, Number(daysAhead || 60)));
  return {
    from: formatDate(from),
    to: formatDate(to),
  };
}

function toDateRange(from, to) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function normalizeTime(value, fallback = "00:00") {
  const raw = String(value || "").trim();
  return /^\d{2}:\d{2}$/.test(raw) ? raw : fallback;
}

function timeToMinutes(value) {
  const clean = normalizeTime(value);
  const [hours, minutes] = clean.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTime(value) {
  const minutes = Math.max(0, Number(value || 0));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function normalizeBreaks(list = []) {
  return (Array.isArray(list) ? list : [])
    .map((item) => {
      const start = normalizeTime(item?.start);
      const end = normalizeTime(item?.end);
      const startMinutes = timeToMinutes(start);
      const endMinutes = timeToMinutes(end);
      if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
        return null;
      }
      return { start, end, startMinutes, endMinutes };
    })
    .filter(Boolean)
    .sort((left, right) => left.startMinutes - right.startMinutes);
}

function normalizeWorkingDays(list) {
  const values = (Array.isArray(list) ? list : [])
    .map((item) => Number(item))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  const unique = Array.from(new Set(values));
  return unique.length ? unique.sort((left, right) => left - right) : [...DEFAULT_PROVIDER_SCHEDULE.workingDays];
}

function normalizeSchedule(source = {}) {
  const rawStart = normalizeTime(
    source?.workingHours?.start || source?.startTime || DEFAULT_PROVIDER_SCHEDULE.workingHours.start,
    DEFAULT_PROVIDER_SCHEDULE.workingHours.start
  );
  const rawEnd = normalizeTime(
    source?.workingHours?.end || source?.endTime || DEFAULT_PROVIDER_SCHEDULE.workingHours.end,
    DEFAULT_PROVIDER_SCHEDULE.workingHours.end
  );
  const startMinutes = timeToMinutes(rawStart);
  const endMinutes = timeToMinutes(rawEnd);

  const safeWorkingHours =
    startMinutes != null && endMinutes != null && endMinutes > startMinutes
      ? { start: rawStart, end: rawEnd, startMinutes, endMinutes }
      : {
          start: DEFAULT_PROVIDER_SCHEDULE.workingHours.start,
          end: DEFAULT_PROVIDER_SCHEDULE.workingHours.end,
          startMinutes: timeToMinutes(DEFAULT_PROVIDER_SCHEDULE.workingHours.start),
          endMinutes: timeToMinutes(DEFAULT_PROVIDER_SCHEDULE.workingHours.end),
        };

  const slotDurationMinutes = Math.max(
    15,
    Number(source?.slotDurationMinutes || DEFAULT_PROVIDER_SCHEDULE.slotDurationMinutes)
  );

  const maxOrdersPerSlot = Math.max(
    1,
    Number(source?.maxOrdersPerSlot || DEFAULT_PROVIDER_SCHEDULE.maxOrdersPerSlot)
  );

  return {
    workingDays: normalizeWorkingDays(source?.workingDays),
    workingHours: safeWorkingHours,
    slotDurationMinutes,
    breaks: normalizeBreaks(source?.breaks),
    maxOrdersPerSlot,
    timezone: String(source?.timezone || DEFAULT_PROVIDER_SCHEDULE.timezone).trim() || DEFAULT_PROVIDER_SCHEDULE.timezone,
  };
}

function serializeSchedule(schedule) {
  if (!schedule) return null;
  return {
    workingDays: Array.isArray(schedule.workingDays) ? [...schedule.workingDays] : [],
    workingHours: {
      start: schedule.workingHours?.start || DEFAULT_PROVIDER_SCHEDULE.workingHours.start,
      end: schedule.workingHours?.end || DEFAULT_PROVIDER_SCHEDULE.workingHours.end,
    },
    slotDurationMinutes: Number(schedule.slotDurationMinutes || DEFAULT_PROVIDER_SCHEDULE.slotDurationMinutes),
    breaks: Array.isArray(schedule.breaks)
      ? schedule.breaks.map((item) => ({
          start: item.start,
          end: item.end,
        }))
      : [],
    maxOrdersPerSlot: Number(schedule.maxOrdersPerSlot || DEFAULT_PROVIDER_SCHEDULE.maxOrdersPerSlot),
    timezone: schedule.timezone || DEFAULT_PROVIDER_SCHEDULE.timezone,
  };
}

function buildFallbackSchedule(prestatorId = "") {
  return {
    prestatorId: normalizePrestatorId(prestatorId),
    ...normalizeSchedule(DEFAULT_PROVIDER_SCHEDULE),
  };
}

async function getProviderSchedule(prestatorId) {
  const normalizedPrestatorId = normalizePrestatorId(prestatorId);
  const doc = await ProviderAvailability.findOne({ prestatorId: normalizedPrestatorId }).lean();
  if (doc) {
    return {
      schedule: {
        prestatorId: normalizedPrestatorId,
        ...normalizeSchedule(doc),
      },
      configured: true,
      source: "configured",
    };
  }

  return {
    schedule: buildFallbackSchedule(normalizedPrestatorId),
    configured: false,
    source: "fallback",
  };
}

function doesIntervalOverlapBreak(startMinutes, endMinutes, breaks = []) {
  return breaks.some(
    (item) => startMinutes < item.endMinutes && endMinutes > item.startMinutes
  );
}

function buildGeneratedSlots(schedule, from, to) {
  const normalizedSchedule = schedule ? normalizeSchedule(schedule) : buildFallbackSchedule();
  const days = toDateRange(from, to);
  const result = [];

  for (const date of days) {
    const day = new Date(`${date}T12:00:00`).getDay();
    if (!normalizedSchedule.workingDays.includes(day)) continue;

    for (
      let startMinutes = normalizedSchedule.workingHours.startMinutes;
      startMinutes + normalizedSchedule.slotDurationMinutes <= normalizedSchedule.workingHours.endMinutes;
      startMinutes += normalizedSchedule.slotDurationMinutes
    ) {
      const endMinutes = startMinutes + normalizedSchedule.slotDurationMinutes;
      if (doesIntervalOverlapBreak(startMinutes, endMinutes, normalizedSchedule.breaks)) {
        continue;
      }

      result.push({
        date,
        time: minutesToTime(startMinutes),
        capacity: normalizedSchedule.maxOrdersPerSlot,
        used: 0,
        source: "schedule",
      });
    }
  }

  return result;
}

async function getDayCapacityMap(prestatorId, from, to) {
  const query = { prestatorId: normalizePrestatorId(prestatorId) };
  if (from && to) query.date = { $gte: from, $lte: to };
  else if (from) query.date = { $gte: from };
  else if (to) query.date = { $lte: to };

  const items = await CalendarDayCapacity.find(query).lean();
  const result = new Map();
  items.forEach((item) => result.set(item.date, Number(item.capacity || 0)));
  return result;
}

function groupSlotsByDate(slots = []) {
  const slotsByDate = {};
  const slotDetailsByDate = {};
  const allSlotsByDate = {};
  const allSlotDetailsByDate = {};
  const availableDates = [];
  const availableDateSet = new Set();

  for (const slot of slots) {
    if (!allSlotsByDate[slot.date]) allSlotsByDate[slot.date] = [];
    if (!allSlotDetailsByDate[slot.date]) allSlotDetailsByDate[slot.date] = [];

    allSlotsByDate[slot.date].push(slot.time);
    allSlotDetailsByDate[slot.date].push({
      time: slot.time,
      capacity: slot.capacity,
      used: slot.used,
      free: slot.free,
    });

    if (Number(slot.free || 0) <= 0) continue;

    if (!slotsByDate[slot.date]) slotsByDate[slot.date] = [];
    if (!slotDetailsByDate[slot.date]) slotDetailsByDate[slot.date] = [];

    slotsByDate[slot.date].push(slot.time);
    slotDetailsByDate[slot.date].push({
      time: slot.time,
      capacity: slot.capacity,
      used: slot.used,
      free: slot.free,
    });

    if (!availableDateSet.has(slot.date)) {
      availableDateSet.add(slot.date);
      availableDates.push(slot.date);
    }
  }

  return {
    availableDates,
    slotsByDate,
    slotDetailsByDate,
    allSlotsByDate,
    allSlotDetailsByDate,
  };
}

async function buildAvailabilityRange({
  prestatorId,
  from,
  to,
  hideFull = false,
} = {}) {
  const normalizedPrestatorId = normalizePrestatorId(prestatorId);
  if (!normalizedPrestatorId) {
    const error = new Error("providerId este obligatoriu.");
    error.statusCode = 400;
    throw error;
  }

  const safeRange =
    from && to
      ? { from, to }
      : from || to
        ? { from: from || to, to: to || from }
        : buildDefaultRange();

  const scheduleState = await getProviderSchedule(normalizedPrestatorId);
  const query = { prestatorId: normalizedPrestatorId };
  if (safeRange.from && safeRange.to) {
    query.date = { $gte: safeRange.from, $lte: safeRange.to };
  }

  const [entries, dayCaps] = await Promise.all([
    CalendarSlotEntry.find(query).lean(),
    getDayCapacityMap(normalizedPrestatorId, safeRange.from, safeRange.to),
  ]);

  const generatedSlots = buildGeneratedSlots(
    scheduleState.schedule,
    safeRange.from,
    safeRange.to
  );

  const merged = new Map();
  const usedByDate = new Map();

  generatedSlots.forEach((slot) => {
    merged.set(`${slot.date}|${slot.time}`, {
      date: slot.date,
      time: slot.time,
      capacity: Number(slot.capacity || 0),
      used: 0,
      source: slot.source,
    });
  });

  entries.forEach((entry) => {
    const key = `${entry.date}|${entry.time}`;
    const existing = merged.get(key);
    const capacity = Math.max(0, Number(entry.capacity || 0));
    const used = Math.max(0, Number(entry.used || 0));
    usedByDate.set(entry.date, (usedByDate.get(entry.date) || 0) + used);
    merged.set(key, {
      date: entry.date,
      time: entry.time,
      capacity,
      used,
      source: existing ? "stored+schedule" : "stored",
    });
  });

  let slots = Array.from(merged.values()).map((slot) => {
    let free = Math.max(0, Number(slot.capacity || 0) - Number(slot.used || 0));
    const dayCap = dayCaps.get(slot.date);
    if (dayCap != null && (usedByDate.get(slot.date) || 0) >= Number(dayCap || 0)) {
      free = 0;
    }

    return {
      date: slot.date,
      time: slot.time,
      capacity: Number(slot.capacity || 0),
      used: Number(slot.used || 0),
      free,
      source: slot.source,
    };
  });

  slots.sort((left, right) =>
    `${left.date}${left.time}`.localeCompare(`${right.date}${right.time}`)
  );

  const visibleSlots =
    String(hideFull).toLowerCase() === "true"
      ? slots.filter((slot) => Number(slot.free || 0) > 0)
      : slots;

  const grouped = groupSlotsByDate(visibleSlots);
  const allGrouped = groupSlotsByDate(slots);
  const hasVisibleAvailability = grouped.availableDates.length > 0;

  let message = "";
  if (!scheduleState.configured) {
    message =
      "Nu exista disponibilitate configurata pentru acest patiser. Se afiseaza programul implicit pentru testare.";
  }
  if (!hasVisibleAvailability && !message) {
    message = "Nu exista intervale disponibile in perioada selectata.";
  }

  return {
    providerId: normalizedPrestatorId,
    prestatorId: normalizedPrestatorId,
    from: safeRange.from,
    to: safeRange.to,
    month:
      safeRange.from && safeRange.to && safeRange.from.slice(0, 7) === safeRange.to.slice(0, 7)
        ? safeRange.from.slice(0, 7)
        : "",
    slots: visibleSlots,
    availableDates: grouped.availableDates,
    slotsByDate: grouped.slotsByDate,
    slotDetailsByDate: grouped.slotDetailsByDate,
    allSlotsByDate: allGrouped.allSlotsByDate,
    allSlotDetailsByDate: allGrouped.allSlotDetailsByDate,
    totalSlots: slots.length,
    totalVisibleSlots: visibleSlots.length,
    schedule: serializeSchedule(scheduleState.schedule),
    scheduleConfigured: scheduleState.configured,
    source: scheduleState.source,
    message,
  };
}

async function buildAvailabilityMonth({ prestatorId, month, hideFull = true } = {}) {
  const monthRange = getMonthRange(month);
  if (!monthRange) {
    const error = new Error("Parametrul month trebuie sa fie in format YYYY-MM.");
    error.statusCode = 400;
    throw error;
  }

  const data = await buildAvailabilityRange({
    prestatorId,
    from: monthRange.from,
    to: monthRange.to,
    hideFull,
  });

  return {
    ...data,
    month: monthRange.month,
  };
}

async function ensureSchedulableSlot({ prestatorId, date, time } = {}) {
  const normalizedPrestatorId = normalizePrestatorId(prestatorId);
  if (!normalizedPrestatorId || !date || !time) {
    return { slotEntry: null, scheduleState: null, materialized: false };
  }

  const existing = await CalendarSlotEntry.findOne({
    prestatorId: normalizedPrestatorId,
    date,
    time,
  });
  if (existing) {
    return { slotEntry: existing, scheduleState: null, materialized: false };
  }

  const scheduleState = await getProviderSchedule(normalizedPrestatorId);
  const generatedSlot = buildGeneratedSlots(scheduleState.schedule, date, date).find(
    (item) => item.time === time
  );

  if (!generatedSlot || Number(generatedSlot.capacity || 0) <= 0) {
    return { slotEntry: null, scheduleState, materialized: false };
  }

  let slotEntry = null;
  try {
    slotEntry = await CalendarSlotEntry.findOneAndUpdate(
      { prestatorId: normalizedPrestatorId, date, time },
      {
        $setOnInsert: {
          capacity: Number(generatedSlot.capacity || scheduleState.schedule.maxOrdersPerSlot || 1),
          used: 0,
        },
      },
      {
        new: true,
        upsert: true,
      }
    );
  } catch (error) {
    if (error?.code === 11000) {
      slotEntry = await CalendarSlotEntry.findOne({
        prestatorId: normalizedPrestatorId,
        date,
        time,
      });
    } else {
      throw error;
    }
  }

  return {
    slotEntry,
    scheduleState,
    materialized: true,
  };
}

module.exports = {
  DEFAULT_PROVIDER_SCHEDULE,
  buildAvailabilityMonth,
  buildAvailabilityRange,
  buildDefaultRange,
  buildFallbackSchedule,
  ensureSchedulableSlot,
  getMonthRange,
  getProviderSchedule,
  normalizeMonthString,
  normalizePrestatorId,
  serializeSchedule,
};
