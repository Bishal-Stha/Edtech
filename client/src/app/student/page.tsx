"use client";

import dynamic from "next/dynamic";

const StudentView = dynamic(() => import("@/components/StudentView"), {
  ssr: false,
});

export default function StudentPage() {
  return <StudentView />;
}
