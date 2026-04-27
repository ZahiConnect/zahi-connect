import { OURAIRPORTS_CSV_URL, parseOurAirportsCsv } from "../lib/airportSuggestions";

self.onmessage = async (event) => {
  if (event.data?.type !== "load-airports") return;

  try {
    const response = await fetch(OURAIRPORTS_CSV_URL);
    if (!response.ok) throw new Error("Airport data could not be loaded.");
    const suggestions = parseOurAirportsCsv(await response.text());
    self.postMessage({ type: "airports-loaded", suggestions });
  } catch (error) {
    self.postMessage({
      type: "airports-error",
      message: error?.message || "Airport data could not be loaded.",
    });
  }
};
