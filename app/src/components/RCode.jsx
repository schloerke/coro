import React from "react";
import { CodePane } from "spectacle";

export default function RCode({ children }) {
  return <CodePane language="r">{children}</CodePane>;
}
