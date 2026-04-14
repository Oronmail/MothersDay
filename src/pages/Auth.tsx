import headerTexture from "@/assets/header-texture.png";
import { AuthCard } from "@/components/AuthCard";

export default function Auth() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      dir="rtl"
      style={{
        backgroundImage: `url(${headerTexture})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <AuthCard redirectOnSuccess showStoreLink />
    </div>
  );
}
