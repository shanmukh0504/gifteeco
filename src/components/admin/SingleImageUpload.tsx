"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

interface SingleImageUploadProps {
  label?: string;
  image?: string;
  onChange: (url: string | undefined) => void;
}

export default function SingleImageUpload({
  label = "Mockup Image",
  image,
  onChange,
}: SingleImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
        onChange(url);
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
    onChange(undefined);
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
          image
            ? "border-neutral-200 bg-white"
            : isDragOver
            ? "border-brand/60 bg-brand/5"
            : "border-neutral-200 bg-neutral-50 hover:border-brand/40"
        }`}
      >
        {image ? (
          <>
            <Image
              src={image}
              alt={label}
              fill
              className="rounded-2xl object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeImage();
              }}
              className="absolute right-3 top-3 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer"
              aria-label="Remove mockup"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
}

