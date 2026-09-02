import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import smileyIcon from "@/assets/smiley-icon.png";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Brand smiley in place of sonner's generic checkmark. Masked (not a plain
 * <img>) so the line art picks up the brand ink colour, same as the header icons.
 */
const SuccessIcon = () => (
  <span
    aria-hidden="true"
    className="block h-5 w-5 shrink-0 bg-[#3c2a2e]"
    style={{
      WebkitMaskImage: `url(${smileyIcon})`,
      maskImage: `url(${smileyIcon})`,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
    }}
  />
);

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group font-sans"
      icons={{ success: <SuccessIcon /> }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-none",
          description: "group-[.toast]:text-muted-foreground",
          // Sonner styles its buttons with higher specificity than a bare
          // Tailwind class, so these need !important to actually win.
          actionButton:
            "group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground group-[.toast]:!rounded-none",
          cancelButton:
            "group-[.toast]:!bg-muted group-[.toast]:!text-muted-foreground group-[.toast]:!rounded-none",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
