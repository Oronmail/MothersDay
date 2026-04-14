import { AuthCard } from "@/components/AuthCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[460px] border-0 bg-transparent p-0 shadow-none sm:rounded-none"
        dir="rtl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>התחברות לאיזור האישי</DialogTitle>
          <DialogDescription>התחברות עם Google או קישור למייל.</DialogDescription>
        </DialogHeader>
        <AuthCard onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};
