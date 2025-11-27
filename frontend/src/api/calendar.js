// frontend/src/api/calendar.js
import api from "/src/lib/api.js";

// ia sloturile de disponibilitate
export async function getAvailability(prestatorId, options = {}) {
    const { from, to, hideFull } = options;

    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (hideFull) params.set("hideFull", "true");

    const url =
        `/calendar/disponibilitate/${prestatorId}` +
        (params.toString() ? `?${params.toString()}` : "");

    console.log("[getAvailability] URL:", url);

    const res = await api.get(url);
    return res.data; // { slots: [...] }
}

// rezervă un slot
export async function reserveSlot(payload) {
    const res = await api.post("/calendar/reserve", payload);
    return res.data;
}

