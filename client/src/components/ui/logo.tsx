import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "horizontal";
  className?: string;
}

export function Logo({ size = "md", variant = "default", className = "" }: LogoProps) {
  const sizeClass = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16",
  }[size];

  if (variant === "horizontal") {
    return (
      <div className={`flex items-center ${className}`}>
        <EquidadeLogo className={`${sizeClass} text-primary`} />
        <span className="ml-2 font-bold text-foreground text-xl">EQUIDADE</span>
      </div>
    );
  }

  return <EquidadeLogo className={`${sizeClass} text-primary ${className}`} />;
}

function EquidadeLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      fill="currentColor"
      role="img"
      aria-label="Logo Equidade"
    >
      <path d="M50 5C25.19 5 5 25.19 5 50s20.19 45 45 45 45-20.19 45-45S74.81 5 50 5zm0 10c19.33 0 35 15.67 35 35S69.33 85 50 85 15 69.33 15 50s15.67-35 35-35z" />
      <path d="M35 32.5c-6.904 0-12.5 5.596-12.5 12.5s5.596 12.5 12.5 12.5c3.75 0 7.09-1.64 9.375-4.24A14.98 14.98 0 0165 50c0-8.284-6.716-15-15-15s-15 6.716-15 15c0 1.462.21 2.873.602 4.207A7.483 7.483 0 0135 52.5c-4.142 0-7.5-3.358-7.5-7.5s3.358-7.5 7.5-7.5 7.5 3.358 7.5 7.5h5c0-6.904-5.596-12.5-12.5-12.5z" />
      <path d="M65 40c6.075 0 11 4.925 11 11s-4.925 11-11 11-11-4.925-11-11 4.925-11 11-11zm0 5c-3.314 0-6 2.686-6 6s2.686 6 6 6 6-2.686 6-6-2.686-6-6-6z" />
      <path d="M77.5 32.5h-5v35h5v-35z" />
      <path d="M25 67.5h5v-15h-5v15z" />
    </svg>
  );
}