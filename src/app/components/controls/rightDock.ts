import { createContext, useContext } from "react";

type Ctx = { rightOffset: number; setRightOffset: (n: number) => void };

export const RightDockContext = createContext<Ctx>({
  rightOffset: 0,
  setRightOffset: () => {},
});

export function useRightDockOffset() {
  return useContext(RightDockContext).rightOffset;
}

export function useSetRightDockOffset() {
  return useContext(RightDockContext).setRightOffset;
}
