"use client";
import React from "react";

export function PhoneFrame({
  children,
  width = 320,
  height = 660,
  className = "",
}: {
  children: React.ReactNode;
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <div className={`phone-frame ${className}`} style={{ width, height }}>
      <div className="phone-screen">
        <div className="phone-notch" />
        {children}
      </div>
    </div>
  );
}
