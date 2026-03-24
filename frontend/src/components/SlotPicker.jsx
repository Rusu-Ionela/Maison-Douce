import { useMemo } from "react";

function getSlotCountLabel(slot) {
  const free = Number(slot?.free ?? 0);
  if (free <= 0) return "ocupat";
  if (free === 1) return "1 loc liber";
  return `${free} locuri libere`;
}

export default function SlotPicker({ slots, date, value, onChange }) {
  const daySlots = useMemo(() => {
    const items = Array.isArray(slots)
      ? slots
      : Array.isArray(slots?.slots)
        ? slots.slots
        : [];

    if (!date) return [];

    return items
      .filter((slot) => slot.date === date)
      .sort((left, right) =>
        String(left.time || "").localeCompare(String(right.time || ""))
      );
  }, [slots, date]);

  if (!date) {
    return (
      <div className="rounded-[24px] border border-dashed border-rose-200 bg-ivory/80 px-4 py-5 text-sm text-[#6e665d]">
        Selecteaza mai intai o data pentru a vedea intervalele disponibile.
      </div>
    );
  }

  if (daySlots.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-rose-200 bg-ivory/80 px-4 py-5 text-sm text-[#6e665d]">
        Nu exista intervale disponibile pentru aceasta zi.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {daySlots.map((slot) => {
        const disabled = Number(slot.free ?? 0) <= 0;
        const selected = value === slot.time;

        return (
          <button
            key={`${slot.date}_${slot.time}`}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange?.(slot.time)}
            title={disabled ? "Interval ocupat" : `${slot.free} locuri disponibile`}
            className={[
              "rounded-[22px] border px-3 py-3 text-left shadow-soft transition duration-200",
              selected
                ? "border-pink-500 bg-charcoal text-white"
                : "border-rose-200 bg-[rgba(255,253,248,0.94)] text-ink",
              disabled
                ? "cursor-not-allowed opacity-55"
                : "hover:-translate-y-0.5 hover:border-sage-deep/50 hover:bg-white",
            ].join(" ")}
          >
            <div className="text-base font-semibold">{slot.time}</div>
            <div
              className={`mt-1 text-xs font-medium ${
                selected ? "text-rose-100" : disabled ? "text-[#8a8178]" : "text-pink-600"
              }`}
            >
              {getSlotCountLabel(slot)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
