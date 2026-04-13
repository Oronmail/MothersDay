export const AnnouncementBanner = () => {
  return <div className="bg-primary text-primary-foreground py-1.5 md:py-2 px-3 md:px-4 text-lg md:text-base relative">
      {/* Mobile: centered single text */}
      <div className="sm:hidden text-center" dir="rtl">
        <span>משלוח חינם ברכישה מעל 350 ש״ח</span>
      </div>

      {/* Desktop: grid layout with centered pipe */}
      <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] items-center w-full" dir="rtl">
        <div className="text-left">
          <span>משלוח חינם ברכישה מעל 350 ש״ח</span>
        </div>
        <div className="flex justify-center px-2">
          <span>|</span>
        </div>
        <div className="text-right">
          <span>10% הנחה על כל הסטים</span>
        </div>
      </div>
    </div>;
};