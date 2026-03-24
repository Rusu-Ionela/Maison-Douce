import { useMemo } from "react";
import { Circle, Ellipse, Group, Layer, Line, Rect, Stage, Text } from "react-konva";

function CakeLayer({ layer, opacity = 1 }) {
  return (
    <Group opacity={opacity}>
      <Rect
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        fill={layer.fill}
        stroke={layer.shade}
        strokeWidth={1.1}
        cornerRadius={layer.radius}
      />

      <Line
        points={[
          layer.x + layer.width * 0.06,
          layer.y + layer.height * 0.18,
          layer.x + layer.width * 0.94,
          layer.y + layer.height * 0.18,
        ]}
        stroke={layer.accent}
        opacity={0.36}
        strokeWidth={Math.max(1.1, layer.height * 0.08)}
        lineCap="round"
      />

      {layer.ribbons.map((ribbon, index) => (
        <Line
          key={`${layer.id}-ribbon-${index}`}
          points={ribbon.points}
          stroke={ribbon.stroke}
          opacity={ribbon.opacity}
          strokeWidth={ribbon.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
        />
      ))}

      {layer.dots.map((dot, index) => (
        <Circle
          key={`${layer.id}-dot-${index}`}
          x={dot.x}
          y={dot.y}
          radius={dot.radius}
          fill={dot.fill}
          opacity={dot.opacity}
        />
      ))}
    </Group>
  );
}

function FlowerCluster({ cluster, opacity = 1 }) {
  return (
    <Group opacity={opacity}>
      {cluster.leaves.map((leaf, index) => (
        <Ellipse
          key={`leaf-${index}`}
          x={leaf.x}
          y={leaf.y}
          radiusX={leaf.radiusX}
          radiusY={leaf.radiusY}
          rotation={leaf.rotation}
          fill={leaf.fill}
          opacity={0.94}
        />
      ))}

      {cluster.petals.map((petal, index) => (
        <Ellipse
          key={`petal-${index}`}
          x={petal.x}
          y={petal.y}
          radiusX={petal.radiusX}
          radiusY={petal.radiusY}
          rotation={petal.rotation}
          fill={petal.fill}
          shadowColor="rgba(145, 97, 118, 0.16)"
          shadowBlur={2}
        />
      ))}

      <Circle
        x={cluster.center.x}
        y={cluster.center.y}
        radius={cluster.center.radius}
        fill={cluster.center.fill}
      />
    </Group>
  );
}

function FruitCluster({ cluster, opacity = 1 }) {
  return (
    <Group opacity={opacity}>
      {cluster.leaves.map((leaf, index) => (
        <Ellipse
          key={`leaf-${index}`}
          x={leaf.x}
          y={leaf.y}
          radiusX={leaf.radiusX}
          radiusY={leaf.radiusY}
          rotation={leaf.rotation}
          fill={leaf.fill}
        />
      ))}

      {cluster.berries.map((berry, index) => (
        <Circle
          key={`berry-${index}`}
          x={berry.x}
          y={berry.y}
          radius={berry.radius}
          fill={berry.fill}
          shadowColor="rgba(69, 22, 33, 0.18)"
          shadowBlur={2}
          shadowOffsetY={1}
        />
      ))}
    </Group>
  );
}

function scalePoints(points = [], fromFrame, toFrame) {
  const scaleX = toFrame.width / Math.max(fromFrame.width, 1);
  const scaleY = toFrame.height / Math.max(fromFrame.height, 1);
  const next = [];

  for (let index = 0; index < points.length; index += 2) {
    next.push(toFrame.x + (points[index] - fromFrame.x) * scaleX);
    next.push(toFrame.y + (points[index + 1] - fromFrame.y) * scaleY);
  }

  return next;
}

function projectLayerToFrame(layer, frame) {
  return {
    ...layer,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    radius: Math.max(4, Math.min(16, frame.height * 0.34)),
    dots: layer.dots.map((dot) => ({
      ...dot,
      x: frame.x + ((dot.x - layer.x) / Math.max(layer.width, 1)) * frame.width,
      y: frame.y + ((dot.y - layer.y) / Math.max(layer.height, 1)) * frame.height,
      radius: Math.max(1, dot.radius * (frame.height / Math.max(layer.height, 1))),
    })),
    ribbons: layer.ribbons.map((ribbon) => ({
      ...ribbon,
      points: scalePoints(
        ribbon.points,
        { x: layer.x, y: layer.y, width: layer.width, height: layer.height },
        frame
      ),
      strokeWidth: Math.max(1.1, ribbon.strokeWidth * (frame.height / Math.max(layer.height, 1))),
    })),
  };
}

function PremiumBoard({ board, stageHeight, offsetX = 0, offsetY = 0, scale = 1, opacity = 1 }) {
  return (
    <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale} opacity={opacity}>
      <Ellipse
        x={board.x}
        y={board.y + board.radiusY * 0.7}
        radiusX={board.radiusX * 0.82}
        radiusY={board.radiusY * 0.84}
        fill="rgba(127, 95, 105, 0.18)"
        blurRadius={Math.max(3, stageHeight * 0.01)}
      />

      <Ellipse
        x={board.x}
        y={board.y}
        radiusX={board.radiusX}
        radiusY={board.radiusY}
        fillLinearGradientStartPoint={{ x: board.x, y: board.y - board.radiusY }}
        fillLinearGradientEndPoint={{ x: board.x, y: board.y + board.radiusY }}
        fillLinearGradientColorStops={[0, board.highlight, 0.55, board.fill, 1, board.shadow]}
        shadowColor="rgba(104, 74, 80, 0.12)"
        shadowBlur={8}
        shadowOffsetY={4}
      />

      <Ellipse
        x={board.x}
        y={board.y - board.radiusY * 0.14}
        radiusX={board.radiusX * 0.9}
        radiusY={board.radiusY * 0.48}
        fill="rgba(255, 255, 255, 0.9)"
      />
    </Group>
  );
}

function WholeCakeIllustration({
  model,
  decorationOpacity = 1,
  toppingOpacity = 1,
  messageOpacity = 1,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
}) {
  return (
    <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
      <Ellipse
        x={model.cake.topX}
        y={model.cake.bodyY + model.cake.bodyHeight + model.cake.topRadiusY * 0.26}
        radiusX={model.cake.topRadiusX * 0.9}
        radiusY={model.cake.topRadiusY * 0.58}
        fill="rgba(117, 87, 98, 0.18)"
      />

      <Rect
        x={model.cake.bodyX}
        y={model.cake.bodyY}
        width={model.cake.bodyWidth}
        height={model.cake.bodyHeight}
        stroke={model.cake.shellStroke}
        strokeWidth={1.4}
        cornerRadius={Math.max(22, model.cake.bodyWidth * 0.08)}
        shadowColor="rgba(102, 72, 81, 0.18)"
        shadowBlur={14}
        shadowOffsetY={8}
        fillLinearGradientStartPoint={{ x: model.cake.bodyX, y: model.cake.bodyY }}
        fillLinearGradientEndPoint={{
          x: model.cake.bodyX,
          y: model.cake.bodyY + model.cake.bodyHeight,
        }}
        fillLinearGradientColorStops={[
          0,
          model.cake.shellTop,
          0.42,
          model.cake.shellColor,
          1,
          model.cake.shellShadow,
        ]}
      />

      <Rect
        x={model.cake.sideHighlight.x}
        y={model.cake.sideHighlight.y}
        width={model.cake.sideHighlight.width}
        height={model.cake.sideHighlight.height}
        fill={model.cake.sideHighlight.fill}
        cornerRadius={999}
      />

      <Rect
        x={model.cake.sideShadow.x}
        y={model.cake.sideShadow.y}
        width={model.cake.sideShadow.width}
        height={model.cake.sideShadow.height}
        fill={model.cake.sideShadow.fill}
        cornerRadius={999}
      />

      <Ellipse
        x={model.cake.topX}
        y={model.cake.topY}
        radiusX={model.cake.topRadiusX}
        radiusY={model.cake.topRadiusY}
        stroke={model.cake.shellStroke}
        strokeWidth={1.4}
        fillLinearGradientStartPoint={{
          x: model.cake.topX,
          y: model.cake.topY - model.cake.topRadiusY,
        }}
        fillLinearGradientEndPoint={{
          x: model.cake.topX,
          y: model.cake.topY + model.cake.topRadiusY,
        }}
        fillLinearGradientColorStops={[
          0,
          "rgba(255,255,255,0.88)",
          0.22,
          model.cake.shellTop,
          1,
          model.cake.shellColor,
        ]}
      />

      <Ellipse
        x={model.cake.topX}
        y={model.cake.topY}
        radiusX={model.cake.innerTopRadiusX}
        radiusY={model.cake.innerTopRadiusY}
        fill={model.cake.innerTopFill}
        opacity={0.94}
      />

      <Line
        points={[
          model.cake.topX - model.cake.innerTopRadiusX * 0.78,
          model.cake.topY - model.cake.innerTopRadiusY * 0.18,
          model.cake.topX,
          model.cake.topY - model.cake.innerTopRadiusY * 0.44,
          model.cake.topX + model.cake.innerTopRadiusX * 0.74,
          model.cake.topY - model.cake.innerTopRadiusY * 0.14,
        ]}
        stroke="rgba(255,255,255,0.58)"
        strokeWidth={Math.max(2, model.cake.topRadiusY * 0.12)}
        lineCap="round"
        lineJoin="round"
        tension={0.45}
      />

      <Ellipse
        x={model.cake.topX}
        y={model.cake.topY + model.cake.topRadiusY * 0.12}
        radiusX={model.cake.innerTopRadiusX * 0.92}
        radiusY={model.cake.innerTopRadiusY * 0.74}
        fill="rgba(255,255,255,0.1)"
      />

      {model.sideBands.map((band, index) => (
        <Line
          key={`band-${index}`}
          points={band.points}
          stroke={model.sideBandStyle.stroke}
          strokeWidth={model.sideBandStyle.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
          opacity={0.92 * decorationOpacity}
        />
      ))}

      {model.swags.map((swag, index) => (
        <Line
          key={`swag-${index}`}
          points={swag.points}
          stroke={swag.stroke}
          strokeWidth={swag.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.55}
          opacity={decorationOpacity}
        />
      ))}

      {model.topRows.map((bead, index) => (
        <Circle
          key={`top-bead-${index}`}
          x={bead.x}
          y={bead.y}
          radius={bead.radius}
          fill={bead.fill}
          shadowColor={bead.shadow}
          shadowBlur={2}
          opacity={decorationOpacity}
        />
      ))}

      {model.bottomRows.map((bead, index) => (
        <Circle
          key={`bottom-bead-${index}`}
          x={bead.x}
          y={bead.y}
          radius={bead.radius}
          fill={bead.fill}
          shadowColor={bead.shadow}
          shadowBlur={2}
          opacity={decorationOpacity}
        />
      ))}

      {model.floralClusters.map((cluster, index) => (
        <FlowerCluster key={`flower-${index}`} cluster={cluster} opacity={decorationOpacity} />
      ))}

      {model.topping.pearls.map((pearl, index) => (
        <Circle
          key={`pearl-${index}`}
          x={pearl.x}
          y={pearl.y}
          radius={pearl.radius}
          fill={pearl.fill}
          shadowColor={pearl.shadow}
          shadowBlur={2}
          opacity={toppingOpacity}
        />
      ))}

      {model.topping.fruits.map((cluster, index) => (
        <FruitCluster key={`fruit-${index}`} cluster={cluster} opacity={toppingOpacity} />
      ))}

      {model.topping.chocolates.map((piece, index) => (
        <Line
          key={`chocolate-${index}`}
          points={piece.points}
          closed
          fill={piece.fill}
          stroke="rgba(80, 44, 29, 0.22)"
          strokeWidth={1}
          shadowColor="rgba(74, 43, 32, 0.16)"
          shadowBlur={3}
          opacity={toppingOpacity}
        />
      ))}

      {model.topping.drizzles.map((drizzle, index) => (
        <Line
          key={`drizzle-${index}`}
          points={drizzle.points}
          stroke={drizzle.stroke}
          strokeWidth={drizzle.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.42}
          opacity={toppingOpacity}
        />
      ))}

      {model.message.visible ? (
        <Group opacity={messageOpacity}>
          <Rect
            x={model.message.plaque.x}
            y={model.message.plaque.y}
            width={model.message.plaque.width}
            height={model.message.plaque.height}
            cornerRadius={999}
            fill={model.message.plaque.fill}
            stroke={model.message.plaque.stroke}
            strokeWidth={1.4}
            shadowColor="rgba(86, 57, 67, 0.14)"
            shadowBlur={5}
            shadowOffsetY={2}
          />
          <Text
            x={model.message.plaque.x + model.message.plaque.width * 0.08}
            y={model.message.plaque.y + model.message.plaque.height * 0.16}
            width={model.message.plaque.width * 0.84}
            height={model.message.plaque.height * 0.68}
            text={model.message.text}
            align="center"
            verticalAlign="middle"
            fontFamily={model.message.fontFamily}
            fontStyle={model.message.fontStyle}
            fontSize={Math.max(
              14,
              Math.min(24, model.message.plaque.height * 0.44) -
                Math.max(0, model.message.text.length - 16) * 0.18
            )}
            fill={model.message.textFill}
            wrap="word"
            lineHeight={0.9}
          />
        </Group>
      ) : null}
    </Group>
  );
}

function SectionSlice({ model, stageWidth, stageHeight }) {
  const slice = useMemo(() => {
    const sliceWidth = model.cake.bodyWidth * 0.34;
    const sliceHeight = model.cake.bodyHeight * 0.84;
    const sliceX = stageWidth * 0.16;
    const sliceY = model.board.y - sliceHeight - model.board.radiusY * 0.2;
    const shellX = sliceWidth * 0.085;
    const shellY = sliceHeight * 0.075;
    const shellBottom = sliceHeight * 0.06;
    const innerFrame = {
      x: sliceX + shellX,
      y: sliceY + shellY,
      width: sliceWidth - shellX * 1.35,
      height: sliceHeight - shellY - shellBottom,
    };
    const gap = Math.max(3, stageHeight * 0.006);
    const rawHeight = model.layers.reduce((sum, layer) => sum + layer.height, 0);
    const targetHeight = innerFrame.height - gap * (model.layers.length - 1);
    const ratio = targetHeight / Math.max(rawHeight, 1);
    let currentY = innerFrame.y;

    const layers = model.layers.map((layer, index) => {
      const nextHeight =
        index === model.layers.length - 1
          ? innerFrame.y + innerFrame.height - currentY
          : layer.height * ratio;
      const projected = projectLayerToFrame(layer, {
        x: innerFrame.x,
        y: currentY,
        width: innerFrame.width,
        height: nextHeight,
      });
      currentY += nextHeight + gap;
      return projected;
    });

    return {
      x: sliceX,
      y: sliceY,
      width: sliceWidth,
      height: sliceHeight,
      topCenterX: sliceX + sliceWidth / 2,
      topCenterY: sliceY + sliceWidth * 0.08,
      topRadiusX: sliceWidth / 2,
      topRadiusY: sliceWidth * 0.11,
      layers,
    };
  }, [model, stageHeight, stageWidth]);

  const hasPearls = model.topping.pearls.length > 0;
  const hasFruit = model.topping.fruits.length > 0;
  const hasChocolate = model.topping.chocolates.length > 0;

  return (
    <Group>
      <Ellipse
        x={slice.x + slice.width * 0.52}
        y={model.board.y + model.board.radiusY * 0.2}
        radiusX={slice.width * 0.54}
        radiusY={slice.width * 0.12}
        fill="rgba(121, 88, 96, 0.16)"
      />

      <Rect
        x={slice.x}
        y={slice.y + slice.topRadiusY * 0.54}
        width={slice.width}
        height={slice.height - slice.topRadiusY * 0.54}
        cornerRadius={Math.max(20, slice.width * 0.09)}
        stroke={model.cake.shellStroke}
        strokeWidth={1.3}
        fillLinearGradientStartPoint={{ x: slice.x, y: slice.y }}
        fillLinearGradientEndPoint={{ x: slice.x, y: slice.y + slice.height }}
        fillLinearGradientColorStops={[
          0,
          model.cake.shellTop,
          0.38,
          model.cake.shellColor,
          1,
          model.cake.shellShadow,
        ]}
        shadowColor="rgba(92, 60, 71, 0.18)"
        shadowBlur={10}
        shadowOffsetY={6}
      />

      <Ellipse
        x={slice.topCenterX}
        y={slice.topCenterY}
        radiusX={slice.topRadiusX}
        radiusY={slice.topRadiusY}
        fillLinearGradientStartPoint={{
          x: slice.topCenterX,
          y: slice.topCenterY - slice.topRadiusY,
        }}
        fillLinearGradientEndPoint={{
          x: slice.topCenterX,
          y: slice.topCenterY + slice.topRadiusY,
        }}
        fillLinearGradientColorStops={[
          0,
          "rgba(255,255,255,0.92)",
          0.26,
          model.cake.shellTop,
          1,
          model.cake.shellColor,
        ]}
        stroke={model.cake.shellStroke}
        strokeWidth={1.2}
      />

      <Rect
        x={slice.layers[0]?.x - slice.width * 0.02}
        y={slice.layers[0]?.y - slice.height * 0.02}
        width={slice.layers[0]?.width + slice.width * 0.04}
        height={
          slice.layers[slice.layers.length - 1]?.y +
            slice.layers[slice.layers.length - 1]?.height -
            slice.layers[0]?.y +
            slice.height * 0.04 || 0
        }
        fill="rgba(255, 250, 245, 0.86)"
        cornerRadius={14}
      />

      {slice.layers.map((layer) => (
        <CakeLayer key={`slice-${layer.id}`} layer={layer} />
      ))}

      <Line
        points={[
          slice.x + slice.width * 0.14,
          slice.y + slice.height * 0.12,
          slice.x + slice.width * 0.38,
          slice.y + slice.height * 0.04,
          slice.x + slice.width * 0.76,
          slice.y + slice.height * 0.09,
        ]}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={Math.max(2, slice.width * 0.03)}
        lineCap="round"
        lineJoin="round"
        tension={0.45}
      />

      {hasPearls ? (
        <>
          <Circle
            x={slice.x + slice.width * 0.38}
            y={slice.y + slice.height * 0.05}
            radius={slice.width * 0.028}
            fill={model.topping.pearls[0]?.fill}
            shadowColor={model.topping.pearls[0]?.shadow}
            shadowBlur={2}
          />
          <Circle
            x={slice.x + slice.width * 0.5}
            y={slice.y + slice.height * 0.025}
            radius={slice.width * 0.022}
            fill={model.topping.pearls[1]?.fill || model.topping.pearls[0]?.fill}
            shadowColor={model.topping.pearls[0]?.shadow}
            shadowBlur={2}
          />
        </>
      ) : null}

      {hasFruit ? (
        <FruitCluster
          cluster={{
            ...model.topping.fruits[0],
            berries: model.topping.fruits[0].berries.map((berry) => ({
              ...berry,
              x: slice.x + slice.width * 0.52 + (berry.x - model.topping.fruits[0].berries[0].x) * 0.4,
              y: slice.y + slice.height * 0.02 + (berry.y - model.topping.fruits[0].berries[0].y) * 0.4,
              radius: berry.radius * 0.65,
            })),
            leaves: model.topping.fruits[0].leaves.map((leaf) => ({
              ...leaf,
              x: slice.x + slice.width * 0.48 + (leaf.x - model.topping.fruits[0].berries[0].x) * 0.4,
              y: slice.y + slice.height * 0.01 + (leaf.y - model.topping.fruits[0].berries[0].y) * 0.4,
              radiusX: leaf.radiusX * 0.64,
              radiusY: leaf.radiusY * 0.64,
            })),
          }}
        />
      ) : null}

      {hasChocolate ? (
        <>
          <Line
            points={[
              slice.x + slice.width * 0.44,
              slice.y + slice.height * 0.07,
              slice.x + slice.width * 0.56,
              slice.y - slice.height * 0.05,
              slice.x + slice.width * 0.66,
              slice.y + slice.height * 0.08,
            ]}
            closed
            fill={model.topping.chocolates[0]?.fill}
            stroke="rgba(80, 44, 29, 0.22)"
            strokeWidth={1}
          />
          <Line
            points={[
              slice.x + slice.width * 0.26,
              slice.y + slice.height * 0.1,
              slice.x + slice.width * 0.44,
              slice.y + slice.height * 0.06,
              slice.x + slice.width * 0.6,
              slice.y + slice.height * 0.11,
            ]}
            stroke={model.topping.drizzles[0]?.stroke}
            strokeWidth={Math.max(1.8, slice.width * 0.026)}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
          />
        </>
      ) : null}
    </Group>
  );
}

export default function CakePreview2DStage({
  stageRef,
  stageWidth,
  stageHeight,
  mode,
  model,
  footerText,
}) {
  const isSection = mode === "section";

  return (
    <Stage
      width={stageWidth}
      height={stageHeight}
      ref={stageRef}
      style={{ display: "block", margin: "0 auto" }}
    >
      <Layer>
        <Rect x={0} y={0} width={stageWidth} height={stageHeight} fill={model.background.base} />

        {model.background.orbs.map((orb, index) => (
          <Circle
            key={`orb-${index}`}
            x={orb.x}
            y={orb.y}
            radius={orb.radius}
            fill={orb.fill}
          />
        ))}

        {isSection ? (
          <>
            <PremiumBoard
              board={model.board}
              stageHeight={stageHeight}
              offsetX={stageWidth * 0.12}
              offsetY={stageHeight * 0.02}
              scale={0.84}
              opacity={0.7}
            />

            <WholeCakeIllustration
              model={model}
              decorationOpacity={0.62}
              toppingOpacity={0.68}
              messageOpacity={0.54}
              scale={0.84}
              offsetX={stageWidth * 0.12}
              offsetY={stageHeight * 0.02}
            />

            <PremiumBoard board={model.board} stageHeight={stageHeight} opacity={0.72} />
            <SectionSlice model={model} stageWidth={stageWidth} stageHeight={stageHeight} />
          </>
        ) : (
          <>
            <PremiumBoard board={model.board} stageHeight={stageHeight} />
            <WholeCakeIllustration
              model={model}
              decorationOpacity={1}
              toppingOpacity={1}
              messageOpacity={1}
            />
          </>
        )}

        <Text
          x={stageWidth * 0.1}
          y={stageHeight * 0.9}
          width={stageWidth * 0.8}
          text={footerText}
          align="center"
          fontSize={Math.max(12, stageWidth * 0.022)}
          fill="#7f6170"
        />
      </Layer>
    </Stage>
  );
}
