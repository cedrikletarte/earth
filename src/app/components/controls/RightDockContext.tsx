import React, { useMemo, useState } from "react";
import { RightDockContext } from "./rightDock";

export function RightDockProvider({ children }: { children: React.ReactNode }) {
  const [rightOffset, setRightOffset] = useState(0);
  const value = useMemo(() => ({ rightOffset, setRightOffset }), [rightOffset]);
  return (
    <RightDockContext.Provider value={value}>
      {children}
    </RightDockContext.Provider>
  );
}
