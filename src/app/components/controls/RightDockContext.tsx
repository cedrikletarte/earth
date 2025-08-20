"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type Ctx = { rightOffset: number; setRightOffset: (n: number) => void };

const RightDockContext = createContext<Ctx>({
  rightOffset: 0,
  setRightOffset: () => {},
});

export function RightDockProvider({ children }: { children: React.ReactNode }) {
  const [rightOffset, setRightOffset] = useState(0);
  const value = useMemo(() => ({ rightOffset, setRightOffset }), [rightOffset]);
  return (
    <RightDockContext.Provider value={value}>
      {children}
    </RightDockContext.Provider>
  );
}

export function useRightDockOffset() {
  return useContext(RightDockContext).rightOffset;
}

export function useSetRightDockOffset() {
  return useContext(RightDockContext).setRightOffset;
}
