// frontend/src/components/features/products/ImageUpload.tsx
import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { XMarkIcon, PhotoIcon } from "@heroicons/react/24/outline";

interface ImageUploadProps {
  imageUrl?: string;
  onImageUpload: (file: File) => void;
  onImageRemove: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  imageUrl,
  onImageUpload,
  onImageRemove,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onImageUpload(acceptedFiles[0]);
      }
    },
    [onImageUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Gambar Produk
      </label>

      {imageUrl ? (
        <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2 border-gray-200">
          <img
            src={
              imageUrl.startsWith("http")
                ? imageUrl
                : `http://localhost:3001${imageUrl}`
            }
            alt="Product"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={onImageRemove}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary-500 bg-primary-50"
              : "border-gray-300 hover:border-primary-400"
          }`}
        >
          <input {...getInputProps()} />
          <PhotoIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
          {isDragActive ? (
            <p className="text-sm text-primary-600">Drop gambar di sini...</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Drag & drop gambar di sini, atau klik untuk memilih
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Maks 5MB (JPG, PNG, GIF, WEBP)
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
