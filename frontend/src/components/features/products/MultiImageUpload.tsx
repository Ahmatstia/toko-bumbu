// frontend/src/components/features/products/MultiImageUpload.tsx
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  PhotoIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

interface ImageFile {
  id: string;
  file?: File;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface MultiImageUploadProps {
  existingImages?: Array<{
    id: string;
    imageUrl: string;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  existingImages = [],
  onImagesChange,
  maxImages = 10,
}) => {
  const [images, setImages] = useState<ImageFile[]>(() => {
    // Konversi existing images ke format internal
    return existingImages.map((img) => ({
      id: img.id,
      url: img.imageUrl,
      isPrimary: img.isPrimary,
      sortOrder: img.sortOrder,
    }));
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newImages = acceptedFiles.map((file, index) => ({
        id: `new-${Date.now()}-${index}`,
        file,
        url: URL.createObjectURL(file),
        isPrimary: images.length === 0 && index === 0,
        sortOrder: images.length + index,
      }));

      const updatedImages = [...images, ...newImages].slice(0, maxImages);
      setImages(updatedImages);
      onImagesChange(updatedImages);
    },
    [images, maxImages, onImagesChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: maxImages - images.length,
  });

  const handleRemove = (id: string) => {
    const updatedImages = images.filter((img) => img.id !== id);

    // Jika gambar yang dihapus adalah primary, set gambar pertama jadi primary
    const removedImage = images.find((img) => img.id === id);
    if (removedImage?.isPrimary && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true;
    }

    // Update sortOrder
    updatedImages.forEach((img, index) => {
      img.sortOrder = index;
    });

    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  const handleSetPrimary = (id: string) => {
    const updatedImages = images.map((img) => ({
      ...img,
      isPrimary: img.id === id,
    }));
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  const handleMoveUp = (id: string) => {
    const index = images.findIndex((img) => img.id === id);
    if (index === 0) return;

    const updatedImages = [...images];
    [updatedImages[index - 1], updatedImages[index]] = [
      updatedImages[index],
      updatedImages[index - 1],
    ];

    // Update sortOrder
    updatedImages.forEach((img, idx) => {
      img.sortOrder = idx;
    });

    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  const handleMoveDown = (id: string) => {
    const index = images.findIndex((img) => img.id === id);
    if (index === images.length - 1) return;

    const updatedImages = [...images];
    [updatedImages[index], updatedImages[index + 1]] = [
      updatedImages[index + 1],
      updatedImages[index],
    ];

    // Update sortOrder
    updatedImages.forEach((img, idx) => {
      img.sortOrder = idx;
    });

    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Gambar Produk (Maks {maxImages} gambar)
      </label>

      {/* Dropzone */}
      {images.length < maxImages && (
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
                Maks 5MB per gambar (JPG, PNG, GIF, WEBP)
              </p>
              <p className="text-xs text-gray-500">
                Tersisa {maxImages - images.length} slot
              </p>
            </>
          )}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((image) => (
              <div
                key={image.id}
                className="relative group border rounded-lg overflow-hidden bg-gray-50"
              >
                <div className="aspect-square">
                  <img
                    src={
                      image.url.startsWith("http")
                        ? image.url
                        : `http://localhost:3001${image.url}`
                    }
                    alt="Product"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Image Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {image.isPrimary && (
                    <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <StarIconSolid className="h-3 w-3" />
                      Utama
                    </span>
                  )}
                </div>

                {/* Image Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(image.id)}
                    disabled={image.isPrimary}
                    className={`p-1.5 rounded-full ${
                      image.isPrimary
                        ? "bg-yellow-500 text-white cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-yellow-500 hover:text-white"
                    }`}
                    title="Set sebagai gambar utama"
                  >
                    <StarIcon className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveUp(image.id)}
                    disabled={image.sortOrder === 0}
                    className="p-1.5 bg-white rounded-full text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    title="Naik"
                  >
                    <ArrowUpIcon className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveDown(image.id)}
                    disabled={image.sortOrder === images.length - 1}
                    className="p-1.5 bg-white rounded-full text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    title="Turun"
                  >
                    <ArrowDownIcon className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(image.id)}
                    className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                    title="Hapus"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default MultiImageUpload;
