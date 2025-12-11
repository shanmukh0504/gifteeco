"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { SlotKey, BoundingBox, DEFAULT_BOUNDING_BOXES } from "@/constants/customization";
import BoundingBoxEditor from "./BoundingBoxEditor";

interface MockupImageWithBoundingBoxProps {
  label?: string;
  slot: SlotKey;
  image?: string;
  boundingBox?: BoundingBox;
  onImageChange: (url: string | undefined) => void;
  onBoundingBoxChange: (box: BoundingBox) => void;
}

export default function MockupImageWithBoundingBox({
  label = "Mockup Image",
  slot,
  image,
  boundingBox,
  onImageChange,
  onBoundingBoxChange,
}: MockupImageWithBoundingBoxProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentBoundingBox = boundingBox || DEFAULT_BOUNDING_BOXES[slot];

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      setUploading(false);
      setProgress(0);
      if (xhr.status !== 200) {
        toast.error("Upload failed");
        return;
      }
      try {
        const { url } = JSON.parse(xhr.responseText);
        onImageChange(url);
        if (!boundingBox) {
          onBoundingBoxChange(DEFAULT_BOUNDING_BOXES[slot]);
        }
        toast.success("Image uploaded");
      } catch (error) {
        console.error(error);
        toast.error("Unable to parse upload response");
      }
    });

    xhr.addEventListener("error", () => {
      setUploading(false);
      setProgress(0);
      toast.error("Upload failed");
    });

    xhr.open("POST", "/api/upload");
    xhr.send(form);
  };

  const handleFilesFromDrop = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const file = Array.from(fileList).find((candidate) =>
      candidate.type.startsWith("image/")
    );
    if (file) {
      handleFile(file);
    } else {
      toast.error("Please drop an image file");
    }
  };

  const removeImage = () => {
    onImageChange(undefined);
    toast.success("Image removed");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">{label}</p>
        <button
          type="button"
          className="rounded-md border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-50"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? `Uploading ${progress}%` : image ? "Replace" : "Upload"}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {uploading && (
        <div className="h-2 w-full rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {image ? (
        <div className="space-y-3">
          <BoundingBoxEditor
            image={image}
            slot={slot}
            boundingBox={currentBoundingBox}
            onBoundingBoxChange={onBoundingBoxChange}
          />
          <button
            type="button"
            onClick={removeImage}
            className="w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
          >
            Remove Image
          </button>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragOver(false);
            handleFilesFromDrop(event.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          className={`group relative flex aspect-square w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed transition ${
            isDragOver
              ? "border-brand/60 bg-brand/5"
              : "border-neutral-200 bg-neutral-50 hover:border-brand/40"
          }`}
        >
          <div className="flex flex-col items-center gap-2 text-center text-sm text-neutral-500">
            <svg
              className={`h-10 w-10 ${
                isDragOver ? "text-brand" : "text-neutral-400"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div>
              <p className="font-medium text-neutral-600">
                Drag & drop image or click to upload
              </p>
              <p className="text-xs text-neutral-400">
                One mockup required per slot
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

