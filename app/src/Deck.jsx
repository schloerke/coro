import React from "react";
import { Deck as SpectacleDeck, Slide, Heading } from "spectacle";

export default function Deck() {
  return (
    <SpectacleDeck>
      <Slide>
        <Heading>Spectacle + React 19 OK</Heading>
      </Slide>
    </SpectacleDeck>
  );
}
