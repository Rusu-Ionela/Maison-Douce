// frontend/src/lib/calendar.js
import api from "./api.js";

export async function getAvailability({
    prestatorId = "default",
    from,
    to,
    hideFull = false,
}) {
    const { data } = await api.get(`/calendar/availability/${prestatorId}`, {
        params: { from, to, hideFull },
    });
    return data;
}

export async function makeReservation(payload) {
    // payload = { prestatorId, date, timeSlot, handoffMethod, ... }
    const { data } = await api.post("/calendar/reserve", payload);
    return data;
}
