import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "20px",
  className = "",
  style,
  ...props
}) => {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-editorial-line ${className}`}
      style={{ width, height, ...style }}
      {...props}
    />
  );
};
