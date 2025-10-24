// backend/utils/timeSlots.js
// generator sloturi – simplu și robust

const WORKING_HOURS = {
    start: "09:00",
    end: "18:00",
    stepMinutes: 30
};

// poți muta în DB / setări per prestator pe viitor
function getWorkingHours() {
    return WORKING_HOURS;
}

function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

function toHHMM(mins) {
    const h = Math.floor(mins / 60).toString().padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
}

function generateTimeSlots({ start, end, stepMinutes }) {
    const slots = [];
    for (let t = toMinutes(start); t < toMinutes(end); t += stepMinutes) {
        const a = toHHMM(t);
        const b = toHHMM(t + stepMinutes);
        slots.push(`${a}-${b}`);
    }
    return slots;
}

module.exports = {
    getWorkingHours,
    generateTimeSlots
};
