import React from "react";
import { Deck as SpectacleDeck, Slide } from "spectacle";
import LiveOutput from "./components/LiveOutput.jsx";

export default function Deck() {
  return (
    <SpectacleDeck>
      <Slide>
        <LiveOutput showFixed={true} />
      </Slide>
    </SpectacleDeck>
  );
}
