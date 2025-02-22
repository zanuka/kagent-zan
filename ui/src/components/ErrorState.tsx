"use client";
import { useEffect } from "react";
import { useRouter } from "next/router";

interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
      <div className="text-red-500">{message}</div>
    </div>
  );
}

export function ErrorStateWithRedirect({ message }: { message: string }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return <ErrorState message={message} />;
}
