import { useRouter } from "expo-router";
import React from "react";

import TravelPlansPanel from "@/components/TravelPlansPanel";

export default function TravelTab() {
  const router = useRouter();

  return (
    <TravelPlansPanel
      onShowDates={() => router.replace("/(tabs)/plan")}
    />
  );
}
