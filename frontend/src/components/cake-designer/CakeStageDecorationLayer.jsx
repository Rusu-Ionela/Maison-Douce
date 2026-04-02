import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Ellipse, Group, Line, Rect, Shape, Text, Transformer } from "react-konva";
import { getDecorationLibraryItem } from "../../lib/cakeDecorations";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgba(hex, alpha = 1) {
  const normalized = String(hex || "").replace("#", "");
  if (normalized.length !== 6) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function pointInEllipse(point, surface) {
  const dx = (point.x - surface.x) / Math.max(surface.radiusX, 1);
  const dy = (point.y - surface.y) / Math.max(surface.radiusY, 1);
  return dx * dx + dy * dy <= 1;
}

function pointInRect(point, surface) {
  return (
    point.x >= surface.x &&
    point.x <= surface.x + surface.width &&
    point.y >= surface.y &&
    point.y <= surface.y + surface.height
  );
}

function buildSurfaces(model) {
  const tiers = Array.isArray(model?.tiers) && model.tiers.length ? model.tiers : [model];
  return tiers.flatMap((tier, tierIndex) =>
    Object.values(tier?.cake?.surfaces || {})
      .filter(Boolean)
      .map((surface) => ({ ...surface, tierIndex }))
  );
}

function resolveSurfacePoint(surface, element) {
  if (surface.type === "top") {
    return {
      x: surface.x + (element.x - 0.5) * surface.radiusX * 1.72,
      y: surface.y + (element.y - 0.5) * surface.radiusY * 1.62,
    };
  }

  return {
    x: surface.x + element.x * surface.width,
    y: surface.y + element.y * surface.height,
  };
}

function normalizePoint(surface, point) {
  if (surface.type === "top") {
    return {
      x: clamp(0.5 + (point.x - surface.x) / Math.max(surface.radiusX * 1.72, 1), 0.06, 0.94),
      y: clamp(0.5 + (point.y - surface.y) / Math.max(surface.radiusY * 1.62, 1), 0.08, 0.92),
    };
  }

  return {
    x: clamp((point.x - surface.x) / Math.max(surface.width, 1), 0.06, 0.94),
    y: clamp((point.y - surface.y) / Math.max(surface.height, 1), 0.08, 0.92),
  };
}

function surfaceDistance(point, surface) {
  if ((surface.type === "top" && pointInEllipse(point, surface)) || (surface.type === "front" && pointInRect(point, surface))) {
    return 0;
  }

  const center =
    surface.type === "top"
      ? { x: surface.x, y: surface.y }
      : { x: surface.x + surface.width / 2, y: surface.y + surface.height / 2 };
  return Math.hypot(point.x - center.x, point.y - center.y);
}

function pickSurface(point, surfaces, element, definition) {
  return surfaces
    .filter((surface) => definition.zones.includes(surface.type))
    .map((surface) => ({
      surface,
      score:
        surfaceDistance(point, surface) +
        (surface.type === element.zone && Number(surface.tierIndex) === Number(element.tierIndex)
          ? -10
          : 0),
    }))
    .sort((left, right) => left.score - right.score)[0]?.surface;
}

function getBaseSize(surface, definition) {
  if (definition.category === "topper") return surface.type === "top" ? surface.radiusX * 0.42 : surface.width * 0.34;
  if (definition.category === "figurine") return surface.type === "top" ? surface.radiusX * 0.26 : surface.width * 0.22;
  if (definition.category === "lumanari") return surface.type === "top" ? surface.radiusX * 0.28 : surface.width * 0.18;
  return surface.type === "top" ? surface.radiusX * 0.24 : surface.width * 0.18;
}

function HeartGlyph({ x = 0, y = 0, size = 20, ...rest }) {
  return (
    <Shape
      x={x}
      y={y}
      sceneFunc={(context, shape) => {
        context.beginPath();
        context.moveTo(0, size * 0.42);
        context.bezierCurveTo(-size * 0.7, size * 0.06, -size * 0.74, -size * 0.52, 0, -size * 0.12);
        context.bezierCurveTo(size * 0.74, -size * 0.52, size * 0.7, size * 0.06, 0, size * 0.42);
        context.closePath();
        context.fillStrokeShape(shape);
      }}
      {...rest}
    />
  );
}

function StarGlyph({ x = 0, y = 0, size = 18, ...rest }) {
  return (
    <Shape
      x={x}
      y={y}
      sceneFunc={(context, shape) => {
        const spikes = 5;
        const outerRadius = size * 0.5;
        const innerRadius = size * 0.22;
        let rotation = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;

        context.beginPath();
        context.moveTo(0, -outerRadius);

        for (let index = 0; index < spikes; index += 1) {
          context.lineTo(Math.cos(rotation) * outerRadius, Math.sin(rotation) * outerRadius);
          rotation += step;
          context.lineTo(Math.cos(rotation) * innerRadius, Math.sin(rotation) * innerRadius);
          rotation += step;
        }

        context.closePath();
        context.fillStrokeShape(shape);
      }}
      {...rest}
    />
  );
}

function ButterflyGlyph({ x = 0, y = 0, size = 20, fill, accent }) {
  return (
    <Group x={x} y={y}>
      <Ellipse
        x={-size * 0.16}
        y={-size * 0.08}
        radiusX={size * 0.2}
        radiusY={size * 0.26}
        rotation={-22}
        fill={fill}
      />
      <Ellipse
        x={size * 0.16}
        y={-size * 0.08}
        radiusX={size * 0.2}
        radiusY={size * 0.26}
        rotation={22}
        fill={fill}
      />
      <Ellipse
        x={-size * 0.14}
        y={size * 0.16}
        radiusX={size * 0.14}
        radiusY={size * 0.18}
        rotation={-18}
        fill={accent}
      />
      <Ellipse
        x={size * 0.14}
        y={size * 0.16}
        radiusX={size * 0.14}
        radiusY={size * 0.18}
        rotation={18}
        fill={accent}
      />
      <Line
        points={[0, -size * 0.22, 0, size * 0.3]}
        stroke="rgba(76, 52, 62, 0.72)"
        strokeWidth={Math.max(1.4, size * 0.04)}
        lineCap="round"
      />
    </Group>
  );
}

function MacaronGlyph({ x = 0, y = 0, size = 20, shell, filling }) {
  return (
    <Group x={x} y={y}>
      <Ellipse x={0} y={-size * 0.18} radiusX={size * 0.28} radiusY={size * 0.12} fill={shell} />
      <Rect
        x={-size * 0.28}
        y={-size * 0.14}
        width={size * 0.56}
        height={size * 0.14}
        cornerRadius={999}
        fill={filling}
      />
      <Ellipse x={0} y={0} radiusX={size * 0.28} radiusY={size * 0.12} fill={shell} />
    </Group>
  );
}

function GoldLeafShard({ x = 0, y = 0, size = 20, fill, rotation = 0 }) {
  return (
    <Shape
      x={x}
      y={y}
      rotation={rotation}
      sceneFunc={(context, shape) => {
        context.beginPath();
        context.moveTo(-size * 0.12, size * 0.34);
        context.bezierCurveTo(
          -size * 0.42,
          size * 0.1,
          -size * 0.34,
          -size * 0.32,
          0,
          -size * 0.38
        );
        context.bezierCurveTo(size * 0.22, -size * 0.24, size * 0.34, 0, size * 0.1, size * 0.36);
        context.closePath();
        context.fillStrokeShape(shape);
      }}
      fill={fill}
      stroke={rgba("#fff3c7", 0.52)}
      strokeWidth={1}
    />
  );
}

function SilhouetteGlyph({ size = 20, fill }) {
  return (
    <>
      <Circle x={0} y={-size * 0.22} radius={size * 0.12} fill={fill} />
      <Shape
        sceneFunc={(context, shape) => {
          context.beginPath();
          context.moveTo(-size * 0.18, size * 0.24);
          context.quadraticCurveTo(-size * 0.28, -size * 0.02, -size * 0.12, -size * 0.1);
          context.lineTo(size * 0.12, -size * 0.1);
          context.quadraticCurveTo(size * 0.28, -size * 0.02, size * 0.18, size * 0.24);
          context.closePath();
          context.fillStrokeShape(shape);
        }}
        fill={fill}
      />
      <Rect
        x={-size * 0.24}
        y={size * 0.22}
        width={size * 0.48}
        height={size * 0.08}
        cornerRadius={999}
        fill={rgba(fill, 0.7)}
      />
    </>
  );
}

function DecorationVisual({ definition, size, tint, palette }) {
  const primary = tint || palette.accent;
  const soft = palette.soft;

  switch (definition.kind) {
    case "pearlCluster":
      return (
        <>
          {[
            { x: -0.2, y: 0.1, scale: 0.22 },
            { x: 0.08, y: -0.04, scale: 0.18 },
            { x: 0.26, y: 0.16, scale: 0.16 },
          ].map((pearl, index) => (
            <Group key={`pearl-${index}`} x={pearl.x * size} y={pearl.y * size}>
              <Circle x={0} y={0} radius={size * pearl.scale} fill={soft} />
              <Circle
                x={-size * 0.05}
                y={-size * 0.05}
                radius={size * pearl.scale * 0.28}
                fill={rgba("#ffffff", 0.92)}
              />
            </Group>
          ))}
        </>
      );
    case "fondantBalls":
      return (
        <>
          {[
            { x: -0.22, y: 0.08, radius: 0.18, fill: primary },
            { x: 0.04, y: -0.06, radius: 0.2, fill: soft },
            { x: 0.24, y: 0.14, radius: 0.16, fill: palette.frosting },
          ].map((ball, index) => (
            <Group key={`ball-${index}`} x={ball.x * size} y={ball.y * size}>
              <Circle x={0} y={0} radius={size * ball.radius} fill={ball.fill} />
              <Circle
                x={-size * 0.04}
                y={-size * 0.05}
                radius={size * ball.radius * 0.24}
                fill={rgba("#ffffff", 0.4)}
              />
            </Group>
          ))}
        </>
      );
    case "roseCluster":
    case "wildBloom":
      return (
        <>
          {Array.from({ length: definition.kind === "roseCluster" ? 6 : 5 }, (_, index) => (
            <Ellipse
              key={`petal-${index}`}
              x={Math.cos((Math.PI * 2 * index) / 5) * size * 0.34}
              y={Math.sin((Math.PI * 2 * index) / 5) * size * 0.26}
              radiusX={definition.kind === "roseCluster" ? size * 0.26 : size * 0.22}
              radiusY={definition.kind === "roseCluster" ? size * 0.16 : size * 0.12}
              rotation={index * 38}
              fill={index % 2 === 0 ? primary : soft}
            />
          ))}
          <Circle x={0} y={0} radius={size * 0.12} fill={soft} />
        </>
      );
    case "butterflyFlight":
      return (
        <>
          <ButterflyGlyph
            x={-size * 0.14}
            y={size * 0.02}
            size={size * 0.72}
            fill={primary}
            accent={soft}
          />
          <ButterflyGlyph
            x={size * 0.16}
            y={-size * 0.14}
            size={size * 0.54}
            fill={soft}
            accent={palette.frosting}
          />
        </>
      );
    case "goldLeaf":
      return (
        <>
          <GoldLeafShard
            x={-size * 0.12}
            y={size * 0.04}
            size={size * 0.64}
            fill={rgba(palette.gold, 0.9)}
            rotation={-18}
          />
          <GoldLeafShard
            x={size * 0.18}
            y={-size * 0.16}
            size={size * 0.42}
            fill={rgba("#f4d692", 0.82)}
            rotation={16}
          />
        </>
      );
    case "macaronStack":
      return (
        <>
          <MacaronGlyph
            x={-size * 0.16}
            y={size * 0.12}
            size={size * 0.72}
            shell={primary}
            filling={soft}
          />
          <MacaronGlyph
            x={size * 0.18}
            y={-size * 0.02}
            size={size * 0.64}
            shell={soft}
            filling={palette.frosting}
          />
        </>
      );
    case "berryCluster":
      return (
        <>
          <Ellipse
            x={-size * 0.16}
            y={-size * 0.12}
            radiusX={size * 0.14}
            radiusY={size * 0.08}
            rotation={-32}
            fill="#7f9d6f"
          />
          <Ellipse
            x={size * 0.18}
            y={-size * 0.08}
            radiusX={size * 0.14}
            radiusY={size * 0.08}
            rotation={28}
            fill="#68854f"
          />
          <Circle x={-size * 0.16} y={size * 0.08} radius={size * 0.14} fill="#9f2443" />
          <Circle x={size * 0.02} y={-size * 0.02} radius={size * 0.17} fill="#b02e4d" />
          <Circle x={size * 0.18} y={size * 0.12} radius={size * 0.13} fill="#7d1736" />
          <Circle
            x={-size * 0.05}
            y={-size * 0.14}
            radius={size * 0.04}
            fill={rgba("#ffffff", 0.26)}
          />
        </>
      );
    case "satinBow":
      return (
        <>
          <Ellipse
            x={-size * 0.18}
            y={0}
            radiusX={size * 0.22}
            radiusY={size * 0.14}
            rotation={-22}
            fill={primary}
          />
          <Ellipse
            x={size * 0.18}
            y={0}
            radiusX={size * 0.22}
            radiusY={size * 0.14}
            rotation={22}
            fill={primary}
          />
          <Rect
            x={-size * 0.08}
            y={-size * 0.08}
            width={size * 0.16}
            height={size * 0.16}
            cornerRadius={999}
            fill={soft}
          />
          <Line
            points={[
              -size * 0.08,
              size * 0.06,
              -size * 0.22,
              size * 0.34,
              -size * 0.02,
              size * 0.16,
            ]}
            stroke={primary}
            strokeWidth={Math.max(2, size * 0.08)}
            lineCap="round"
            lineJoin="round"
          />
          <Line
            points={[
              size * 0.08,
              size * 0.06,
              size * 0.22,
              size * 0.34,
              size * 0.02,
              size * 0.16,
            ]}
            stroke={primary}
            strokeWidth={Math.max(2, size * 0.08)}
            lineCap="round"
            lineJoin="round"
          />
        </>
      );
    case "teddyBear":
      return (
        <>
          <Circle x={0} y={size * 0.12} radius={size * 0.24} fill="#b88764" />
          <Circle x={0} y={-size * 0.12} radius={size * 0.22} fill="#c19370" />
          <Circle x={-size * 0.16} y={-size * 0.28} radius={size * 0.08} fill="#b88764" />
          <Circle x={size * 0.16} y={-size * 0.28} radius={size * 0.08} fill="#b88764" />
        </>
      );
    case "goldTopper":
    case "weddingArch":
    case "christeningCross":
      return (
        <>
          <Line
            points={[-size * 0.24, size * 0.28, -size * 0.24, -size * 0.16, size * 0.24, -size * 0.16, size * 0.24, size * 0.28]}
            stroke={rgba(palette.gold, 0.92)}
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
          />
          <Text
            x={-size * 0.2}
            y={-size * 0.08}
            width={size * 0.4}
            text={definition.category === "topper" ? definition.label.split(" ")[0] : "Top"}
            align="center"
            fontSize={Math.max(10, size * 0.11)}
            fill={rgba(palette.gold, 0.96)}
          />
        </>
      );
    case "candleTrio":
      return (
        <>
          {[-0.22, 0, 0.22].map((offset, index) => (
            <Group key={`candle-${index}`} x={offset * size}>
              <Rect x={-size * 0.055} y={-size * 0.28} width={size * 0.11} height={size * 0.46} cornerRadius={999} fill={index === 1 ? primary : soft} />
              <Ellipse x={0} y={-size * 0.34} radiusX={size * 0.04} radiusY={size * 0.08} fill={index === 1 ? "#f4be5b" : "#ffd98d"} />
            </Group>
          ))}
        </>
      );
    case "heartCharms":
      return (
        <>
          <HeartGlyph x={-size * 0.16} y={size * 0.02} size={size * 0.28} fill={primary} />
          <HeartGlyph x={size * 0.12} y={-size * 0.12} size={size * 0.22} fill={soft} />
        </>
      );
    case "starSparkles":
      return (
        <>
          <StarGlyph x={-size * 0.1} y={size * 0.04} size={size * 0.42} fill={rgba(palette.gold, 0.94)} />
          <StarGlyph x={size * 0.18} y={-size * 0.12} size={size * 0.28} fill={rgba("#fff4bf", 0.92)} />
          <Circle x={size * 0.28} y={size * 0.16} radius={size * 0.04} fill={rgba("#fff4bf", 0.72)} />
        </>
      );
    default:
      if (definition.kind === "figurineSilhouette") {
        return <SilhouetteGlyph size={size} fill={rgba(primary, 0.92)} />;
      }
      if (definition.kind === "kidsCrown") {
        return (
          <>
            <Line
              points={[
                -size * 0.28,
                size * 0.16,
                -size * 0.18,
                -size * 0.08,
                0,
                size * 0.04,
                size * 0.18,
                -size * 0.08,
                size * 0.28,
                size * 0.16,
              ]}
              stroke={rgba(palette.gold, 0.96)}
              strokeWidth={Math.max(2, size * 0.08)}
              lineCap="round"
              lineJoin="round"
            />
            <Circle x={-size * 0.18} y={-size * 0.08} radius={size * 0.05} fill={soft} />
            <Circle x={0} y={size * 0.02} radius={size * 0.05} fill={soft} />
            <Circle x={size * 0.18} y={-size * 0.08} radius={size * 0.05} fill={soft} />
            <StarGlyph x={0} y={-size * 0.16} size={size * 0.22} fill={primary} />
          </>
        );
      }
      return (
        <>
          <Circle x={0} y={0} radius={size * 0.24} fill={primary} />
          <Circle x={-size * 0.22} y={size * 0.1} radius={size * 0.16} fill={soft} />
          <Circle x={size * 0.24} y={size * 0.08} radius={size * 0.14} fill={palette.frosting} />
        </>
      );
  }
}

function DecorationNode({ element, surfaces, palette, selected, editable, onSelect, onChange, registerNode }) {
  const [hovered, setHovered] = useState(false);
  const definition = getDecorationLibraryItem(element.definitionId);
  const surface = surfaces.find((item) => item.type === element.zone && Number(item.tierIndex) === Number(element.tierIndex));
  if (!definition || !surface) return null;

  const point = resolveSurfacePoint(surface, element);
  const size = getBaseSize(surface, definition) * clamp(Number(element.scale || 1), 0.45, 2.4);

  return (
    <Group
      ref={(node) => registerNode(element.id, node)}
      x={point.x}
      y={point.y}
      rotation={Number(element.rotation || 0)}
      draggable={editable}
      opacity={clamp(Number(element.opacity ?? 1), 0.35, 1)}
      onMouseDown={(event) => {
        event.cancelBubble = true;
        onSelect?.(element.id);
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        onSelect?.(element.id);
      }}
      onMouseEnter={(event) => {
        const container = event.target.getStage()?.container();
        if (container) {
          container.style.cursor = editable ? "grab" : "pointer";
        }
        setHovered(true);
      }}
      onMouseLeave={(event) => {
        const container = event.target.getStage()?.container();
        if (container) {
          container.style.cursor = "default";
        }
        setHovered(false);
      }}
      onDragStart={(event) => {
        const container = event.target.getStage()?.container();
        if (container) {
          container.style.cursor = "grabbing";
        }
      }}
      onDragEnd={(event) => {
        if (!editable || !onChange) return;
        const node = event.target;
        const container = node.getStage()?.container();
        if (container) {
          container.style.cursor = "grab";
        }
        const nextSurface = pickSurface(node.position(), surfaces, element, definition);
        if (!nextSurface) return;
        const nextPosition = normalizePoint(nextSurface, node.position());
        onChange(element.id, {
          tierIndex: nextSurface.tierIndex,
          zone: nextSurface.type,
          x: nextPosition.x,
          y: nextPosition.y,
          rotation: node.rotation(),
        });
      }}
      onTransformEnd={(event) => {
        if (!editable || !onChange) return;
        const node = event.target;
        const averageScale = (Math.abs(node.scaleX()) + Math.abs(node.scaleY())) / 2;
        node.scaleX(1);
        node.scaleY(1);
        onChange(element.id, {
          scale: clamp((Number(element.scale || 1) * averageScale) || 1, 0.45, 2.4),
          rotation: node.rotation(),
        });
      }}
    >
      <Ellipse
        x={0}
        y={size * 0.34}
        radiusX={size * 0.28}
        radiusY={size * 0.1}
        fill={selected ? "rgba(78, 58, 66, 0.18)" : "rgba(78, 58, 66, 0.12)"}
      />
      <DecorationVisual definition={definition} size={size} tint={String(element.tint || "")} palette={palette} />
      {selected || hovered ? (
        <Circle
          x={0}
          y={0}
          radius={size * 0.74}
          stroke={selected ? "rgba(65, 84, 71, 0.78)" : "rgba(148, 132, 119, 0.58)"}
          strokeWidth={selected ? 2 : 1.4}
          dash={selected ? [7, 5] : [4, 5]}
        />
      ) : null}
    </Group>
  );
}

export default function CakeStageDecorationLayer({
  model,
  decorations = [],
  selectedDecorationId = "",
  editable = false,
  onDecorationSelect,
  onDecorationChange,
}) {
  const nodeRefs = useRef(new Map());
  const transformerRef = useRef(null);
  const surfaces = useMemo(() => buildSurfaces(model), [model]);
  const palette = useMemo(() => {
    const tier = Array.isArray(model?.tiers) && model.tiers.length ? model.tiers[0] : model;
    return {
      accent: tier?.message?.plaque?.stroke || "#bf6f97",
      soft: tier?.cake?.innerTopFill || "#fff7fb",
      frosting: tier?.cake?.shellColor || "#f7eee5",
      gold: "#d1ae6c",
    };
  }, [model]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    if (!editable || !selectedDecorationId) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }
    const node = nodeRefs.current.get(selectedDecorationId);
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [decorations, editable, selectedDecorationId]);

  return (
    <Group>
      {editable
        ? surfaces.map((surface) =>
            surface.type === "top" ? (
              <Ellipse
                key={`guide-${surface.tierIndex}-${surface.type}`}
                x={surface.x}
                y={surface.y}
                radiusX={surface.radiusX}
                radiusY={surface.radiusY}
                stroke="rgba(148, 132, 119, 0.34)"
                strokeWidth={1}
                dash={[6, 5]}
              />
            ) : (
              <Rect
                key={`guide-${surface.tierIndex}-${surface.type}`}
                x={surface.x}
                y={surface.y}
                width={surface.width}
                height={surface.height}
                cornerRadius={18}
                stroke="rgba(148, 132, 119, 0.34)"
                strokeWidth={1}
                dash={[6, 5]}
              />
            )
          )
        : null}

      {[...(Array.isArray(decorations) ? decorations : [])]
        .sort((left, right) => Number(left.zIndex || 0) - Number(right.zIndex || 0))
        .map((element) => (
          <DecorationNode
            key={element.id}
            element={element}
            surfaces={surfaces}
            palette={palette}
            selected={selectedDecorationId === element.id}
            editable={editable}
            onSelect={onDecorationSelect}
            onChange={onDecorationChange}
            registerNode={(id, node) => {
              if (node) {
                nodeRefs.current.set(id, node);
              } else {
                nodeRefs.current.delete(id);
              }
            }}
          />
        ))}

      {editable ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled
          anchorSize={9}
          borderStroke="rgba(65, 84, 71, 0.82)"
          anchorStroke="rgba(65, 84, 71, 0.82)"
          anchorFill="#fffdf9"
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          boundBoxFunc={(oldBox, nextBox) => {
            if (nextBox.width < 18 || nextBox.height < 18) return oldBox;
            return nextBox;
          }}
        />
      ) : null}
    </Group>
  );
}
