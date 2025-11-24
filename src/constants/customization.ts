export type SlotKey = "front" | "back" | "chest";

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const DEFAULT_BOUNDING_BOXES: Record<SlotKey, BoundingBox> = {
  front: { x: 0.3, y: 0.2, width: 0.4, height: 0.5 },
  back: { x: 0.3, y: 0.18, width: 0.4, height: 0.5 },
  chest: { x: 0.55, y: 0.15, width: 0.2, height: 0.2 },
};

export const SLOT_LABELS: Record<SlotKey, string> = {
  front: "Front",
  back: "Back",
  chest: "Chest",
};

