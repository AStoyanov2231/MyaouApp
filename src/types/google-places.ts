import { Place } from "./database";

export type AutocompletePrediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

export type PlaceDetailsResponse = {
  place: Place;
  source: "cache" | "google";
};
