const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

(async () => {
    const url = "http://localhost:5000/api/calendar/availability/default";
    const body = {
        slots: [
            { date: "2025-10-16", time: "10:00", capacity: 2 },
            { date: "2025-10-16", time: "11:00", capacity: 1 },
            { date: "2025-10-17", time: "15:00", capacity: 3 },
        ],
    };

    const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    console.log("Status:", r.status);
    console.log("Response:", await r.text());
})();
