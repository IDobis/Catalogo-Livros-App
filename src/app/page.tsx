"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import HomePageClient from "./HomePageClient";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#121212",
        }}
      />
    );
  }

  return <HomePageClient />;
}
