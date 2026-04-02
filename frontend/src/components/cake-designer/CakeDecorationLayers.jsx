import { buttons } from "../../lib/tailwindComponents";
import { getDecorationLibraryItem } from "../../lib/cakeDecorations";

function getZoneLabel(zone) {
  return zone === "top" ? "Sus" : "Lateral";
}

export default function CakeDecorationLayers({
  elements,
  selectedId,
  onSelect,
  onDuplicate,
  onDelete,
  onMove,
}) {
  const ordered = [...(Array.isArray(elements) ? elements : [])].sort(
    (left, right) => Number(right.zIndex || 0) - Number(left.zIndex || 0)
  );

  return (
    <div className="space-y-3">
      {ordered.length ? (
        ordered.map((element, index) => {
          const item = getDecorationLibraryItem(element.definitionId);
          return (
            <div
              key={element.id}
              className={`rounded-[22px] border px-4 py-3 transition ${
                selectedId === element.id
                  ? "border-charcoal bg-[rgba(61,49,55,0.96)] text-white"
                  : "border-rose-100 bg-white/90 text-[#5f564d]"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(element.id)}
                className="w-full text-left"
              >
                <div className="font-semibold">{item?.label || "Element decorativ"}</div>
                <div
                  className={`mt-1 text-xs uppercase tracking-[0.12em] ${
                    selectedId === element.id ? "text-rose-100" : "text-pink-600"
                  }`}
                >
                  Etaj {Number(element.tierIndex || 0) + 1} • {getZoneLabel(element.zone)}
                </div>
              </button>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttons.outline}
                  onClick={() => onDuplicate(element.id)}
                >
                  Duplica
                </button>
                <button
                  type="button"
                  className={buttons.outline}
                  onClick={() => onMove(element.id, "up")}
                  disabled={index === 0}
                >
                  In fata
                </button>
                <button
                  type="button"
                  className={buttons.outline}
                  onClick={() => onMove(element.id, "down")}
                  disabled={index === ordered.length - 1}
                >
                  In spate
                </button>
                <button
                  type="button"
                  className={buttons.outline}
                  onClick={() => onDelete(element.id)}
                >
                  Sterge
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="rounded-[22px] border border-dashed border-rose-200 bg-[rgba(255,249,242,0.76)] px-4 py-5 text-sm text-[#6d625a]">
          Nu ai adaugat elemente pe tort inca.
        </div>
      )}
    </div>
  );
}
