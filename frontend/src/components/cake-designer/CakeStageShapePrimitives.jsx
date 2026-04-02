import { Ellipse, Line, Rect, Shape } from "react-konva";

export function getCakeShapeId(cake = {}) {
  return String(cake?.shape || "round").trim().toLowerCase();
}

export function getCakeBodyCornerRadius(cake = {}) {
  const shapeId = getCakeShapeId(cake);
  if (shapeId === "square") {
    return Math.max(14, cake.bodyWidth * 0.04);
  }
  if (shapeId === "heart") {
    return Math.max(22, cake.bodyWidth * 0.12);
  }
  return Math.max(22, cake.bodyWidth * 0.08);
}

export function HeartShape({ x, y, width, height, strokeWidth = 0, ...rest }) {
  return (
    <Shape
      x={x}
      y={y}
      strokeWidth={strokeWidth}
      sceneFunc={(context, shape) => {
        const halfWidth = width / 2;
        const fullHeight = height;
        context.beginPath();
        context.moveTo(0, fullHeight * 0.48);
        context.bezierCurveTo(
          -halfWidth,
          fullHeight * 0.08,
          -halfWidth * 0.98,
          -fullHeight * 0.46,
          0,
          -fullHeight * 0.12
        );
        context.bezierCurveTo(
          halfWidth * 0.98,
          -fullHeight * 0.46,
          halfWidth,
          fullHeight * 0.08,
          0,
          fullHeight * 0.48
        );
        context.closePath();
        context.fillStrokeShape(shape);
      }}
      {...rest}
    />
  );
}

export function CakeTopSurface({ cake }) {
  const shapeId = getCakeShapeId(cake);
  const commonProps = {
    stroke: cake.shellStroke,
    strokeWidth: 1.4,
    fillLinearGradientStartPoint: {
      x: cake.topX,
      y: cake.topY - cake.topRadiusY,
    },
    fillLinearGradientEndPoint: {
      x: cake.topX,
      y: cake.topY + cake.topRadiusY,
    },
    fillLinearGradientColorStops: [
      0,
      "rgba(255,255,255,0.88)",
      0.22,
      cake.shellTop,
      1,
      cake.shellColor,
    ],
  };

  if (shapeId === "square") {
    return (
      <Rect
        x={cake.topX - cake.topRadiusX * 0.88}
        y={cake.topY - cake.topRadiusY}
        width={cake.topRadiusX * 1.76}
        height={cake.topRadiusY * 2}
        cornerRadius={cake.topRadiusY * 0.38}
        {...commonProps}
      />
    );
  }

  if (shapeId === "heart") {
    return (
      <HeartShape
        x={cake.topX}
        y={cake.topY}
        width={cake.topRadiusX * 1.76}
        height={cake.topRadiusY * 2.1}
        {...commonProps}
      />
    );
  }

  return (
    <Ellipse
      x={cake.topX}
      y={cake.topY}
      radiusX={cake.topRadiusX}
      radiusY={cake.topRadiusY}
      {...commonProps}
    />
  );
}

export function CakeInnerTopSurface({ cake }) {
  const shapeId = getCakeShapeId(cake);
  const commonProps = {
    fill: cake.innerTopFill,
    opacity: 0.94,
  };

  if (shapeId === "square") {
    return (
      <Rect
        x={cake.topX - cake.innerTopRadiusX * 0.88}
        y={cake.topY - cake.innerTopRadiusY}
        width={cake.innerTopRadiusX * 1.76}
        height={cake.innerTopRadiusY * 2}
        cornerRadius={cake.innerTopRadiusY * 0.34}
        {...commonProps}
      />
    );
  }

  if (shapeId === "heart") {
    return (
      <HeartShape
        x={cake.topX}
        y={cake.topY}
        width={cake.innerTopRadiusX * 1.74}
        height={cake.innerTopRadiusY * 2.08}
        {...commonProps}
      />
    );
  }

  return (
    <Ellipse
      x={cake.topX}
      y={cake.topY}
      radiusX={cake.innerTopRadiusX}
      radiusY={cake.innerTopRadiusY}
      {...commonProps}
    />
  );
}

export function CakeTopHighlight({ cake }) {
  const shapeId = getCakeShapeId(cake);

  if (shapeId === "square") {
    return (
      <Rect
        x={cake.topX - cake.innerTopRadiusX * 0.62}
        y={cake.topY - cake.innerTopRadiusY * 0.56}
        width={cake.innerTopRadiusX * 1.24}
        height={cake.innerTopRadiusY * 0.54}
        cornerRadius={999}
        fill="rgba(255,255,255,0.2)"
      />
    );
  }

  if (shapeId === "heart") {
    return (
      <HeartShape
        x={cake.topX}
        y={cake.topY - cake.innerTopRadiusY * 0.16}
        width={cake.innerTopRadiusX * 1.02}
        height={cake.innerTopRadiusY * 0.96}
        fill="rgba(255,255,255,0.12)"
      />
    );
  }

  return (
    <>
      <Line
        points={[
          cake.topX - cake.innerTopRadiusX * 0.78,
          cake.topY - cake.innerTopRadiusY * 0.18,
          cake.topX,
          cake.topY - cake.innerTopRadiusY * 0.44,
          cake.topX + cake.innerTopRadiusX * 0.74,
          cake.topY - cake.innerTopRadiusY * 0.14,
        ]}
        stroke="rgba(255,255,255,0.58)"
        strokeWidth={Math.max(2, cake.topRadiusY * 0.12)}
        lineCap="round"
        lineJoin="round"
        tension={0.45}
      />

      <Ellipse
        x={cake.topX}
        y={cake.topY + cake.topRadiusY * 0.12}
        radiusX={cake.innerTopRadiusX * 0.92}
        radiusY={cake.innerTopRadiusY * 0.74}
        fill="rgba(255,255,255,0.1)"
      />
    </>
  );
}
