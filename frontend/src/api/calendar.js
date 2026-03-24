// frontend/src/api/calendar.js
import api from "/src/lib/api.js";

export async function getAvailability(prestatorId, options = {}) {
    const { from, to, hideFull, month } = options;

    if (month) {
        const params = new URLSearchParams();
        params.set("providerId", prestatorId);
        params.set("month", month);
        if (hideFull != null) {
            params.set("hideFull", String(Boolean(hideFull)));
        }

        const res = await api.get(`/calendar/availability?${params.toString()}`);
        return res.data;
    }

    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (hideFull) params.set("hideFull", "true");

    const url =
        `/calendar/disponibilitate/${prestatorId}` +
        (params.toString() ? `?${params.toString()}` : "");

    const res = await api.get(url);
    return res.data;
}

export async function bookSlot(payload) {
    const res = await api.post("/calendar/book", payload);
    return res.data;
}

export async function reserveSlot(payload) {
    return bookSlot(payload);
}
