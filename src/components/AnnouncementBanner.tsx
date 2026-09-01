import { useStoreSettings } from "@/hooks/useStoreSettings";

export const AnnouncementBanner = () => {
  // Read the threshold from store_settings so the banner can never drift from
  // what checkout actually charges (the hook falls back to 35 / 350).
  const { data: settings } = useStoreSettings();
  const threshold = settings?.free_shipping_threshold ?? 350;

  return <div className="bg-primary text-primary-foreground py-1.5 md:py-2 px-3 md:px-4 text-lg md:text-base relative">
      <div className="text-center" dir="rtl">
        <span>משלוח חינם ברכישה מעל {threshold} ש״ח</span>
      </div>
    </div>;
};
