import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  HiOutlineCollection,
  HiOutlineExternalLink,
  HiOutlinePhotograph,
  HiOutlineTrash,
  HiOutlineUpload,
} from "react-icons/hi";

import restaurantService from "../../../services/restaurantService";
import { RestaurantSettingsShell } from "./shared";
import { useRestaurantSettingsPage } from "./useRestaurantSettingsPage";

export default function RestaurantImagesSettings() {
  const { settings, loading, hydrate } = useRestaurantSettingsPage();
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingCover(true);
    try {
      hydrate(await restaurantService.uploadSettingsCoverImage(file));
      toast.success("Cover image updated.");
    } catch (error) {
      console.error("Failed to upload cover image", error);
      toast.error(error.response?.data?.detail || "Could not upload the cover image.");
    } finally {
      setUploadingCover(false);
    }
  };

  const uploadGallery = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setUploadingGallery(true);
    try {
      hydrate(await restaurantService.uploadSettingsGalleryImages(files));
      toast.success("Gallery updated.");
    } catch (error) {
      console.error("Failed to upload gallery images", error);
      toast.error(error.response?.data?.detail || "Could not upload gallery images.");
    } finally {
      setUploadingGallery(false);
    }
  };

  const makeCover = async (imageUrl) => {
    try {
      hydrate(await restaurantService.setSettingsCoverImage(imageUrl));
      toast.success("Cover image changed.");
    } catch (error) {
      console.error("Failed to set cover image", error);
      toast.error(error.response?.data?.detail || "Could not set the cover image.");
    }
  };

  const removeImage = async (imageUrl) => {
    if (!window.confirm("Remove this restaurant image?")) return;

    try {
      hydrate(await restaurantService.removeSettingsGalleryImage(imageUrl));
      toast.success("Image removed.");
    } catch (error) {
      console.error("Failed to remove gallery image", error);
      toast.error(error.response?.data?.detail || "Could not remove the image.");
    }
  };

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-[30px] bg-[#F4ECE2]" />
        <div className="grid gap-6 xl:grid-cols-[1.28fr_0.72fr]">
          <div className="h-[38rem] animate-pulse rounded-[30px] bg-[#F7F1EA]" />
          <div className="h-[38rem] animate-pulse rounded-[30px] bg-[#F7F1EA]" />
        </div>
      </div>
    );
  }

  const galleryImages = settings?.profile?.gallery_image_urls || [];

  return (
    <RestaurantSettingsShell
      sectionLabel="Settings - Images"
      title="Restaurant cover and gallery media."
      description="Manage the image set that represents the restaurant across internal admin views and customer-facing discovery surfaces."
      settings={settings}
    >
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-serif text-[#201711]">Images</h2>
          <p className="mt-2 text-sm leading-7 text-[#6D5A4B]">
            Keep one strong cover image and a clean gallery for ambience, storefront, and signature spaces.
          </p>
        </div>

        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={uploadCover} />
        <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadGallery} />

        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="overflow-hidden rounded-[28px] border border-[#E8DED4] bg-[#FCF7F1]">
            {settings?.profile?.cover_image_url ? (
              <img
                src={settings.profile.cover_image_url}
                alt={settings?.tenant?.name || "Restaurant cover"}
                className="h-80 w-full object-cover"
              />
            ) : (
              <div className="flex h-80 items-center justify-center text-[#B28667]">
                <HiOutlinePhotograph className="text-6xl" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1F1A17] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#382920] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <HiOutlineUpload className="text-base" />
              {uploadingCover ? "Uploading..." : "Upload cover image"}
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploadingGallery}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8CBBB] bg-white px-5 py-3 text-sm font-semibold text-[#3A2C21] transition hover:bg-[#FBF6F0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <HiOutlineCollection className="text-base" />
              {uploadingGallery ? "Uploading..." : "Add gallery images"}
            </button>
          </div>
        </div>

        {galleryImages.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {galleryImages.map((imageUrl) => {
              const isCover = imageUrl === settings?.profile?.cover_image_url;
              return (
                <article
                  key={imageUrl}
                  className="overflow-hidden rounded-[24px] border border-[#E8DED4] bg-[#FFFCF9]"
                >
                  <img src={imageUrl} alt="Restaurant gallery" className="h-56 w-full object-cover" />
                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap gap-2">
                      {isCover ? (
                        <span className="inline-flex rounded-full bg-[#201711] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                          Current cover
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makeCover(imageUrl)}
                          className="rounded-full border border-[#D7C7B7] px-3 py-1.5 text-xs font-semibold text-[#3B2B21] transition hover:bg-[#F8F1E8]"
                        >
                          Make cover
                        </button>
                      )}
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-[#D7C7B7] px-3 py-1.5 text-xs font-semibold text-[#3B2B21] transition hover:bg-[#F8F1E8]"
                      >
                        <HiOutlineExternalLink />
                        Open
                      </a>
                      <button
                        type="button"
                        onClick={() => removeImage(imageUrl)}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        <HiOutlineTrash />
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[26px] border border-dashed border-[#DECFC0] bg-[#FCF7F1] px-6 py-12 text-center">
            <HiOutlinePhotograph className="mx-auto text-5xl text-[#BB8C6D]" />
            <h3 className="mt-4 text-2xl font-serif text-[#21170F]">No restaurant images yet</h3>
            <p className="mt-3 text-sm leading-7 text-[#6D5A4B]">
              Add cover and gallery images for the restaurant space, ambience, and storefront.
            </p>
          </div>
        )}
      </div>
    </RestaurantSettingsShell>
  );
}
