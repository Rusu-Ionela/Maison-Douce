import React, { useMemo } from "react";

export default function SlotPicker({ slots, date, value, onChange }) {
    const daySlots = useMemo(() => {
        const arr = Array.isArray(slots)
            ? slots
            : Array.isArray(slots?.slots)
                ? slots.slots
                : [];

        if (!date) return [];

        return arr
            .filter((s) => s.date === date)
            .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    }, [slots, date]);

    if (!date) {
        return (
            <div className="text-gray-500 text-sm">
                Selectează mai întâi o dată.
            </div>
        );
    }

    if (daySlots.length === 0) {
        return (
            <div className="text-gray-500 text-sm">
                Nu există intervale pentru această zi.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {daySlots.map((s) => {
                const disabled = (s.free ?? 0) <= 0;
                const selected = value === s.time;
                return (
                    <button
                        key={`${s.date}_${s.time}`}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && onChange?.(s.time)}
                        className={[
                            "border rounded px-3 py-2 text-sm",
                            selected ? "bg-blue-600 text-white" : "bg-white",
                            disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-50",
                        ].join(" ")}
                        title={disabled ? "Slot ocupat" : `${s.free} libere`}
                    >
                        {s.time} {disabled ? "(ocupat)" : `(${s.free} libere)`}
                    </button>
                );
            })}
        </div>
    );
}
