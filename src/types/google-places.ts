import { Place } from "./database";

export type AutocompletePrediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types?: string[];
};

export type PlaceDetailsResponse = {
  place: Place;
  source: "cache" | "google";
};

export type NearbySearchResponse = {
  places: Place[];
  source: "cache" | "google";
  error?: string;
  message?: string;
};
