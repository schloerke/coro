import React from "react";
import { Deck as SpectacleDeck, Slide } from "spectacle";
import ContextPyramid from "./components/ContextPyramid.jsx";

export default function Deck() {
  return (
    <SpectacleDeck>
      <Slide>
        <ContextPyramid
          name="flaw"
          caption={[
            "Call A enters its domain",
            "A awaits — domain NOT torn down",
            "Call B starts, stacks on top",
            "Merged: A's context leaks into B",
          ]}
        />
      </Slide>
    </SpectacleDeck>
  );
}
