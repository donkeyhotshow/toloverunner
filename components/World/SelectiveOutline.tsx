import React from "react";

interface SelectiveOutlineProps {
  thickness?: number;
  color?: string;
  children?: React.ReactNode;
}

export const SelectiveOutline: React.FC<SelectiveOutlineProps> = ({ children }) => {
  // Outline effect is handled in shaders/postprocessing; this is a no-op wrapper for TS/JSX.
  return <>{children}</>;
};

export default SelectiveOutline;
