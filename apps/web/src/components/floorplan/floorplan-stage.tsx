"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Line, Text, Group, Arc } from "react-konva";
import type Konva from "konva";
import type { EditorConnection, EditorElement, EditorZone } from "./floorplan-editor";

function useHtmlImage(url: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = url;
  }, [url]);
  return image;
}

export type FloorPlanStageHandle = {
  exportPng: () => string | null;
};

export default function FloorPlanStage({
  width,
  height,
  imageUrl,
  scale,
  stagePos,
  onStagePosChange,
  showGrid,
  elements,
  connections,
  zones,
  selectedId,
  editable,
  onSelect,
  onMove,
  statusColor,
  onReady,
}: {
  width: number;
  height: number;
  imageUrl: string | null;
  scale: number;
  stagePos: { x: number; y: number };
  onStagePosChange: (pos: { x: number; y: number }) => void;
  showGrid: boolean;
  elements: EditorElement[];
  connections: EditorConnection[];
  zones: EditorZone[];
  selectedId: string | null;
  editable: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  statusColor: (status?: string | null) => string;
  onReady?: (handle: FloorPlanStageHandle) => void;
}) {
  const bg = useHtmlImage(imageUrl);
  const stageRef = useRef<Konva.Stage | null>(null);
  const elementMap = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);

  useEffect(() => {
    onReady?.({
      exportPng: () => {
        const stage = stageRef.current;
        if (!stage) return null;
        return stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
      },
    });
  }, [onReady]);

  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    const lines: Array<{ points: number[] }> = [];
    for (let x = 0; x <= width; x += 40) lines.push({ points: [x, 0, x, height] });
    for (let y = 0; y <= height; y += 40) lines.push({ points: [0, y, width, y] });
    return lines;
  }, [showGrid, width, height]);

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={scale}
      scaleY={scale}
      x={stagePos.x}
      y={stagePos.y}
      draggable
      onDragEnd={(e) => {
        if (e.target === e.target.getStage()) {
          onStagePosChange({ x: e.target.x(), y: e.target.y() });
        }
      }}
      onMouseDown={(e) => {
        if (e.target === e.target.getStage()) onSelect(null);
      }}
      className="bg-slate-100"
    >
      <Layer listening={false}>
        {bg ? (
          <KonvaImage image={bg} width={width} height={height} />
        ) : (
          <Rect width={width} height={height} fill="#e2e8f0" />
        )}
        {gridLines.map((line, idx) => (
          <Line key={idx} points={line.points} stroke="#cbd5e1" strokeWidth={1} opacity={0.5} />
        ))}
        {zones.map((zone) => {
          const flat = zone.points.flatMap((p) => [p.x, p.y]);
          return (
            <Line
              key={zone.id}
              points={flat}
              closed
              fill={`rgba(59,130,246,${zone.opacity})`}
              stroke="#2563eb"
              strokeWidth={1}
            />
          );
        })}
      </Layer>

      <Layer>
        {connections.map((c) => {
          const a = elementMap.get(c.sourceElementId);
          const b = elementMap.get(c.targetElementId);
          if (!a || !b) return null;
          return (
            <Line
              key={c.id}
              points={[a.x + a.width / 2, a.y + a.height / 2, b.x + b.width / 2, b.y + b.height / 2]}
              stroke="#0f172a"
              strokeWidth={2}
              dash={c.connectionType === "logical" ? [6, 4] : undefined}
            />
          );
        })}

        {elements.map((el) => {
          const selected = el.id === selectedId;
          const fill = statusColor(el.device?.status || el.statusOverride);
          const meta = (el.metadata || {}) as {
            directionDeg?: number;
            fovDeg?: number;
            rangePx?: number;
            opacity?: number;
            color?: string;
          };
          return (
            <Group
              key={el.id}
              x={el.x}
              y={el.y}
              rotation={el.rotation}
              draggable={editable && !el.isLocked}
              onClick={() => onSelect(el.id)}
              onTap={() => onSelect(el.id)}
              onDragEnd={(e) => onMove(el.id, e.target.x(), e.target.y())}
            >
              {el.elementType === "camera" ? (
                <Arc
                  x={el.width / 2}
                  y={el.height / 2}
                  innerRadius={0}
                  outerRadius={meta.rangePx ?? 120}
                  angle={meta.fovDeg ?? 90}
                  rotation={(meta.directionDeg ?? 0) - (meta.fovDeg ?? 90) / 2}
                  fill={meta.color ?? "#3b82f6"}
                  opacity={meta.opacity ?? 0.2}
                  listening={false}
                />
              ) : null}
              <Rect
                width={el.width}
                height={el.height}
                fill={fill}
                cornerRadius={6}
                stroke={selected ? "#f59e0b" : "#0f172a"}
                strokeWidth={selected ? 3 : 1}
              />
              <Circle x={el.width / 2} y={el.height / 2} radius={4} fill="#fff" listening={false} />
              <Text
                y={el.height + 4}
                width={120}
                text={el.label || el.device?.name || el.elementType}
                fontSize={11}
                fill="#0f172a"
                listening={false}
              />
              {(el.openTickets?.length ?? 0) > 0 ? (
                <Circle x={el.width - 2} y={2} radius={6} fill="#f59e0b" listening={false} />
              ) : null}
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
