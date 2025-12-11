"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { BoundingBox, SlotKey, DEFAULT_BOUNDING_BOXES } from "@/constants/customization";

interface BoundingBoxEditorProps {
  image: string;
  slot: SlotKey;
  boundingBox: BoundingBox;
  onBoundingBoxChange: (box: BoundingBox) => void;
}

export default function BoundingBoxEditor({
  image,
  slot,
  boundingBox,
  onBoundingBoxChange,
}: BoundingBoxEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  
  const dragStartRef = useRef({ x: 0, y: 0 });
  const boxStartRef = useRef<BoundingBox>(boundingBox || DEFAULT_BOUNDING_BOXES[slot]);

  const currentBox = boundingBox || DEFAULT_BOUNDING_BOXES[slot];

  useEffect(() => {
    if (!isDragging && !isResizing) {
      boxStartRef.current = boundingBox || DEFAULT_BOUNDING_BOXES[slot];
    }
  }, [boundingBox, slot, isDragging, isResizing]);

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const getRelativePosition = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: clamp((clientX - rect.left) / rect.width, 0, 1),
        y: clamp((clientY - rect.top) / rect.height, 0, 1),
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      
      if (target.classList.contains("resize-handle")) {
        setIsResizing(true);
        setResizeHandle(target.dataset.handle || null);
        const relativePos = getRelativePosition(e.clientX, e.clientY);
        dragStartRef.current = relativePos;
        boxStartRef.current = currentBox;
      } else if (target === boxRef.current || boxRef.current?.contains(target)) {
        setIsDragging(true);
        const relativePos = getRelativePosition(e.clientX, e.clientY);
        dragStartRef.current = relativePos;
        boxStartRef.current = currentBox;
      }
    },
    [currentBox, getRelativePosition]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;

      const initialDragStart = dragStartRef.current;
      const initialBoxStart = boxStartRef.current;

      if (isDragging) {
        const relativePos = getRelativePosition(e.clientX, e.clientY);
        const deltaX = relativePos.x - initialDragStart.x;
        const deltaY = relativePos.y - initialDragStart.y;

        const newBox: BoundingBox = {
          x: clamp(initialBoxStart.x + deltaX, 0, 1 - initialBoxStart.width),
          y: clamp(initialBoxStart.y + deltaY, 0, 1 - initialBoxStart.height),
          width: initialBoxStart.width,
          height: initialBoxStart.height,
        };

        onBoundingBoxChange(newBox);
      } else if (isResizing && resizeHandle) {
        const relativePos = getRelativePosition(e.clientX, e.clientY);
        const deltaX = relativePos.x - initialDragStart.x;
        const deltaY = relativePos.y - initialDragStart.y;

        let newBox: BoundingBox = { ...initialBoxStart };

        switch (resizeHandle) {
          case "nw":
            newBox = {
              x: clamp(initialBoxStart.x + deltaX, 0, initialBoxStart.x + initialBoxStart.width - 0.05),
              y: clamp(initialBoxStart.y + deltaY, 0, initialBoxStart.y + initialBoxStart.height - 0.05),
              width: clamp(initialBoxStart.width - deltaX, 0.05, 1 - initialBoxStart.x),
              height: clamp(initialBoxStart.height - deltaY, 0.05, 1 - initialBoxStart.y),
            };
            break;
          case "ne":
            newBox = {
              x: initialBoxStart.x,
              y: clamp(initialBoxStart.y + deltaY, 0, initialBoxStart.y + initialBoxStart.height - 0.05),
              width: clamp(initialBoxStart.width + deltaX, 0.05, 1 - initialBoxStart.x),
              height: clamp(initialBoxStart.height - deltaY, 0.05, 1 - initialBoxStart.y),
            };
            break;
          case "sw":
            newBox = {
              x: clamp(initialBoxStart.x + deltaX, 0, initialBoxStart.x + initialBoxStart.width - 0.05),
              y: initialBoxStart.y,
              width: clamp(initialBoxStart.width - deltaX, 0.05, 1 - initialBoxStart.x),
              height: clamp(initialBoxStart.height + deltaY, 0.05, 1 - initialBoxStart.y),
            };
            break;
          case "se":
            newBox = {
              x: initialBoxStart.x,
              y: initialBoxStart.y,
              width: clamp(initialBoxStart.width + deltaX, 0.05, 1 - initialBoxStart.x),
              height: clamp(initialBoxStart.height + deltaY, 0.05, 1 - initialBoxStart.y),
            };
            break;
          case "n":
            newBox = {
              x: initialBoxStart.x,
              y: clamp(initialBoxStart.y + deltaY, 0, initialBoxStart.y + initialBoxStart.height - 0.05),
              width: initialBoxStart.width,
              height: clamp(initialBoxStart.height - deltaY, 0.05, 1 - initialBoxStart.y),
            };
            break;
          case "s":
            newBox = {
              x: initialBoxStart.x,
              y: initialBoxStart.y,
              width: initialBoxStart.width,
              height: clamp(initialBoxStart.height + deltaY, 0.05, 1 - initialBoxStart.y),
            };
            break;
          case "w":
            newBox = {
              x: clamp(initialBoxStart.x + deltaX, 0, initialBoxStart.x + initialBoxStart.width - 0.05),
              y: initialBoxStart.y,
              width: clamp(initialBoxStart.width - deltaX, 0.05, 1 - initialBoxStart.x),
              height: initialBoxStart.height,
            };
            break;
          case "e":
            newBox = {
              x: initialBoxStart.x,
              y: initialBoxStart.y,
              width: clamp(initialBoxStart.width + deltaX, 0.05, 1 - initialBoxStart.x),
              height: initialBoxStart.height,
            };
            break;
        }

        if (newBox.x + newBox.width > 1) {
          newBox.width = 1 - newBox.x;
        }
        if (newBox.y + newBox.height > 1) {
          newBox.height = 1 - newBox.y;
        }

        onBoundingBoxChange(newBox);
      }
    },
    [isDragging, isResizing, resizeHandle, getRelativePosition, onBoundingBoxChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">
        Drag the box to move, drag corners/edges to resize
      </p>
      <div
        ref={containerRef}
        className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-neutral-200 bg-neutral-50"
        onMouseDown={handleMouseDown}
      >
        <Image
          src={image}
          alt={`${slot} mockup`}
          fill
          className="object-contain"
        />
        <div
          ref={boxRef}
          className="absolute cursor-move border-2 border-dashed border-[#FF9AA2] bg-[#FF9AA2]/10"
          style={{
            left: `${currentBox.x * 100}%`,
            top: `${currentBox.y * 100}%`,
            width: `${currentBox.width * 100}%`,
            height: `${currentBox.height * 100}%`,
          }}
        >
          <div
            className="resize-handle absolute -left-1 -top-1 h-3 w-3 cursor-nwse-resize rounded-full bg-[#FF9AA2] border-2 border-white"
            data-handle="nw"
          />
          <div
            className="resize-handle absolute -right-1 -top-1 h-3 w-3 cursor-nesw-resize rounded-full bg-[#FF9AA2] border-2 border-white"
            data-handle="ne"
          />
          <div
            className="resize-handle absolute -left-1 -bottom-1 h-3 w-3 cursor-nesw-resize rounded-full bg-[#FF9AA2] border-2 border-white"
            data-handle="sw"
          />
          <div
            className="resize-handle absolute -right-1 -bottom-1 h-3 w-3 cursor-nwse-resize rounded-full bg-[#FF9AA2] border-2 border-white"
            data-handle="se"
          />
          <div
            className="resize-handle absolute -left-1 top-1/2 h-3 w-3 -translate-y-1/2 cursor-ew-resize rounded-full bg-[#FF9AA2] border-2 border-white"
            data-handle="w"
          />
          <div
            className="resize-handle absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 cursor-ew-resize rounded-full bg-[#FF9AA2] border-2 border-white"
            data-handle="e"
          />
          <div
            className="resize-handle absolute left-1/2 -top-1 h-3 w-3 -translate-x-1/2 cursor-ns-resize rounded-full bg-[#FF9AA2] border-2 border-white"
            data-handle="n"
          />
          <div
            className="resize-handle absolute left-1/2 -bottom-1 h-3 w-3 -translate-x-1/2 cursor-ns-resize rounded-full bg-[#FF9AA2] border-2 border-white"
            data-handle="s"
          />
        </div>
      </div>
    </div>
  );
}
