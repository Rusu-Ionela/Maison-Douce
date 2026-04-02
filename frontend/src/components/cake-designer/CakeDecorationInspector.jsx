import { buttons } from "../../lib/tailwindComponents";
import {
  getDecorationColorSwatches,
  getDecorationLibraryItem,
} from "../../lib/cakeDecorations";

function RangeControl({ label, min, max, step, value, onChange }) {
  return (
    <label className="block text-sm font-semibold text-gray-700">
      {label}
      <div className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-[#3d3137]"
        />
        <span className="w-14 text-right text-sm text-[#5f564d]">{value}</span>
      </div>
    </label>
  );
}

export default function CakeDecorationInspector({
  element,
  tierCount,
  onUpdate,
  onDuplicate,
  onDelete,
}) {
  const item = getDecorationLibraryItem(element?.definitionId || "");
  const swatches = getDecorationColorSwatches();

  if (!element || !item) {
    return (
      <div className="rounded-[22px] border border-dashed border-rose-200 bg-[rgba(255,249,242,0.76)] px-4 py-5 text-sm leading-6 text-[#6d625a]">
        Selecteaza un element din preview sau din lista de straturi ca sa il poti roti,
        scala, recolora sau muta pe alt etaj.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[24px] border border-rose-100 bg-white/92 p-4 shadow-soft">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-600">
          Element selectat
        </div>
        <div className="mt-2 text-lg font-semibold text-gray-900">{item.label}</div>
        <div className="text-sm text-[#6d625a]">{item.category}</div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-700">Etaj</div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: tierCount }, (_, index) => (
            <button
              key={`tier-${index}`}
              type="button"
              onClick={() => onUpdate({ tierIndex: index })}
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                Number(element.tierIndex || 0) === index
                  ? "border-charcoal bg-charcoal text-white"
                  : "border-rose-200 bg-white text-[#6d625a]"
              }`}
            >
              Etaj {index + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-700">Zona</div>
        <div className="flex flex-wrap gap-2">
          {item.zones.map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => onUpdate({ zone })}
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                element.zone === zone
                  ? "border-charcoal bg-charcoal text-white"
                  : "border-rose-200 bg-white text-[#6d625a]"
              }`}
            >
              {zone === "top" ? "Sus" : "Lateral"}
            </button>
          ))}
        </div>
      </div>

      <RangeControl
        label="Rotatie"
        min={-180}
        max={180}
        step={1}
        value={Math.round(Number(element.rotation || 0))}
        onChange={(value) => onUpdate({ rotation: value })}
      />

      <RangeControl
        label="Scara"
        min={45}
        max={240}
        step={1}
        value={Math.round(clampScale(Number(element.scale || 1)) * 100)}
        onChange={(value) => onUpdate({ scale: value / 100 })}
      />

      <RangeControl
        label="Opacitate"
        min={35}
        max={100}
        step={1}
        value={Math.round(Number(element.opacity ?? 1) * 100)}
        onChange={(value) => onUpdate({ opacity: value / 100 })}
      />

      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-700">Nuanta elementului</div>
        <div className="flex flex-wrap gap-2">
          {swatches.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => onUpdate({ tint: swatch })}
              className={`h-8 w-8 rounded-full border transition ${
                element.tint === swatch ? "border-charcoal ring-2 ring-sage/35" : "border-white/90"
              }`}
              style={{ backgroundColor: swatch }}
            />
          ))}
          <label className="flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-[#6d625a]">
            Custom
            <input
              type="color"
              value={element.tint || "#f4d9e6"}
              onChange={(event) => onUpdate({ tint: event.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttons.outline} onClick={onDuplicate}>
          Duplica
        </button>
        <button type="button" className={buttons.outline} onClick={onDelete}>
          Sterge
        </button>
      </div>
    </div>
  );
}

function clampScale(value) {
  return Math.min(2.4, Math.max(0.45, value));
}
