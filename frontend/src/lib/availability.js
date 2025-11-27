// backend/lib/availability.js
const DEFAULT_SCHEDULE = {
    // HH:mm -> HH:mm (slot orar)
    start: "09:00",
    end: "18:00",
    stepMinutes: 60, // 60 min per slot
    closedWeekdays: [0], // 0 = Duminică (închis)
};

function toHM(date) {
    return date.toISOString().slice(11, 16);
}
function parseHM(hm) {
    const [h, m] = hm.split(":").map(Number);
    return { h, m };
}
function addMinutes(d, minutes) {
    const nd = new Date(d);
    nd.setMinutes(nd.getMinutes() + minutes);
    return nd;
}
function ymd(date) {
    return date.toISOString().slice(0, 10);
}

function generateSlotsForDate(dateYMD, schedule = DEFAULT_SCHEDULE) {
    const d = new Date(dateYMD + "T00:00:00.000Z");
    const weekday = d.getUTCDay();
    if (schedule.closedWeekdays.includes(weekday)) return [];

    const { h: sh, m: sm } = parseHM(schedule.start);
    const { h: eh, m: em } = parseHM(schedule.end);

    const start = new Date(dateYMD + "T00:00:00.000Z");
    start.setUTCHours(sh, sm, 0, 0);
    const end = new Date(dateYMD + "T00:00:00.000Z");
    end.setUTCHours(eh, em, 0, 0);

    const out = [];
    let cur = start;
    while (cur < end) {
        const nxt = addMinutes(cur, schedule.stepMinutes);
        out.push({ date: dateYMD, time: toHM(cur), timeSlot: `${toHM(cur)}-${toHM(nxt)}` });
        cur = nxt;
    }
    return out;
}

function enumerateDays(fromYMD, toYMD) {
    const res = [];
    let d = new Date(fromYMD + "T00:00:00.000Z");
    const end = new Date(toYMD + "T00:00:00.000Z");
    while (d <= end) {
        res.push(ymd(d));
        d.setUTCDate(d.getUTCDate() + 1);
    }
    return res;
}

module.exports = { DEFAULT_SCHEDULE, generateSlotsForDate, enumerateDays };
