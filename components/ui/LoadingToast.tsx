"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface LoadingToastProps {
  isVisible: boolean;
  message: string;
  type?: "loading" | "success" | "error";
  duration?: number;
}

export function LoadingToast({
  isVisible,
  message,
  type = "loading",
  duration = 3000,
}: LoadingToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      if (type === "success" && duration > 0) {
        const timer = setTimeout(() => {
          setShow(false);
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
    }
  }, [isVisible, type, duration]);

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "loading":
        return "bg-gradient-to-r from-cyan-900/80 to-blue-900/60 border-cyan-500/40";
      case "success":
        return "bg-gradient-to-r from-emerald-900/80 to-green-900/60 border-emerald-500/40";
      case "error":
        return "bg-gradient-to-r from-red-900/80 to-rose-900/60 border-red-500/40";
      default:
        return "bg-gradient-to-r from-cyan-900/80 to-blue-900/60 border-cyan-500/40";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <Card
        className={`p-4 backdrop-blur-sm shadow-xl ${getBackgroundColor()}`}
      >
        <div className="flex items-center gap-3">
          {getIcon()}
          <span className="text-white font-medium text-sm">{message}</span>
        </div>
      </Card>
    </div>
  );
}
