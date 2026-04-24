import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";
import zones from "./data/zones.js";
import pickupPoints from "./data/pickupPoints.js";
import { GrabMapsAPI } from "./lib/grabMaps.ts";

const SINGAPORE_CENTER = [103.8198, 1.3521];
const ROUTE_SOURCE_ID = "walking-route";
const ROUTE_LAYER_ID = "walking-route-line";
const SELECTED_ZONE_SOURCE_ID = "selected-zone-highlight";
const SELECTED_ZONE_LAYER_ID = "selected-zone-highlight-line";
const FALLBACK_BASEMAP_STYLE = {
  version: 8,
  name: "Fallback Light Basemap",
  sources: {
    fallbackOsm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "fallback-osm",
      type: "raster",
      source: "fallbackOsm",
    },
  ],
};
const HARDCODED_PICKUP_NAMES = [
  "Boon Lay MRT",
  "Jurong Point",
  "Bishan MRT",
  "Ang Mo Kio Hub",
  "Woodlands MRT",
  "Tampines MRT",
  "Orchard MRT",
];

function getSupplyColor(supply) {
  if (supply < 40) return "#e02d3c";
  if (supply < 70) return "#f5b544";
  return "#00b14f";
}

function getSupplyLevel(supply) {
  if (supply < 40) return "Low";
  if (supply < 70) return "Medium";
  return "High";
}

function makeZoneFeature(zone) {
  return {
    type: "Feature",
    geometry: zone.geometry,
    properties: {
      name: zone.name,
    },
  };
}

function upsertZoneBoxes(map, currentHour, onZoneClick) {
  if (!map?.isStyleLoaded?.()) {
    return false;
  }

  zones.forEach((zone, index) => {
    const sourceId = `zone-${index}`;
    const fillId = `zone-fill-${index}`;
    const outlineId = `zone-outline-${index}`;
    const supply = zone.supplyScores[currentHour];

    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(makeZoneFeature(zone));
    } else {
      map.addSource(sourceId, {
        type: "geojson",
        data: makeZoneFeature(zone),
      });
    }

    if (!map.getLayer(fillId)) {
      map.addLayer({
        id: fillId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": getSupplyColor(supply),
          "fill-opacity": 0.62,
        },
      });

      map.on("click", fillId, async (event) => {
        onZoneClick(zone, event);
      });

      map.on("mouseenter", fillId, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", fillId, () => {
        map.getCanvas().style.cursor = "";
      });
    } else {
      map.setPaintProperty(fillId, "fill-color", getSupplyColor(supply));
      map.setPaintProperty(fillId, "fill-opacity", 0.62);
    }

    if (!map.getLayer(outlineId)) {
      map.addLayer({
        id: outlineId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#15251f",
          "line-width": 2.5,
          "line-opacity": 0.92,
        },
      });
    }
  });

  return true;
}

function getWaitTime(supply) {
  if (supply < 40) return 38;
  if (supply < 70) return 20;
  return 10;
}

function normalizeSafetyScore(score) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    return 0;
  }

  return numericScore > 1 ? numericScore / 100 : numericScore;
}

function normalizeName(name) {
  return name.toLowerCase().replace(/\s+exit\s+[a-z0-9]+$/i, "").trim();
}

function isHardcodedPickup(pickup) {
  const pickupName = normalizeName(pickup.name);
  return HARDCODED_PICKUP_NAMES.some((name) => pickupName.includes(normalizeName(name)));
}

function getBestPickupForZone(zone) {
  return getRankedPickupsForZone(zone)[0] ?? pickupPoints[0];
}

function getPredictedPickupWait(currentWait, pickup) {
  const reliability = pickup.reliabilityScore ?? (pickup.demand ?? 60) / 100;
  const waitReduction = currentWait * (0.46 + reliability * 0.28);
  return Math.max(6, Math.round(currentWait - waitReduction));
}

function scorePickup(pickup, currentWait) {
  const predictedWait = getPredictedPickupWait(currentWait, pickup);
  const waitReductionScore = ((currentWait - predictedWait) / currentWait) * 100;
  const walkingScore = Math.max(0, 100 - (pickup.walkMinutes ?? 8) * 8);
  const safetyScore = normalizeSafetyScore(pickup.safetyScore) * 100;
  const reliabilityScore = (pickup.reliabilityScore ?? (pickup.demand ?? 60) / 100) * 100;

  return {
    score:
      waitReductionScore * 0.4 +
      walkingScore * 0.25 +
      safetyScore * 0.25 +
      reliabilityScore * 0.1,
    predictedWait,
  };
}

function getRankedPickupsForZone(zone, currentWait = 38) {
  const zonePickups = pickupPoints.filter((pickup) => pickup.zone === zone.name);
  const hardcodedZonePickups = zonePickups.filter(isHardcodedPickup);
  const candidates = hardcodedZonePickups.length > 0 ? hardcodedZonePickups : zonePickups;

  return candidates
    .map((pickup) => {
      const scoring = scorePickup(pickup, currentWait);
      return {
        ...pickup,
        recommendationScore: scoring.score,
        predictedWait: scoring.predictedWait,
        totalTime: (pickup.walkMinutes ?? 8) + scoring.predictedWait,
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore);
}

function getSearchQueryForPickup(pickupName) {
  return pickupName.replace(/\s+Exit\s+[A-Z0-9]+$/i, "").trim();
}

function normalizeCoordinatePair(value) {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const first = Number(value[0]);
  const second = Number(value[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }

  // Singapore coordinates are around lng 103.x and lat 1.x.
  if (Math.abs(first) <= 5 && Math.abs(second) > 90) {
    return [second, first];
  }

  return [first, second];
}

function extractPlaceCoordinate(searchResponse) {
  const candidates =
    searchResponse?.places ??
    searchResponse?.results ??
    searchResponse?.items ??
    searchResponse?.features ??
    searchResponse?.data ??
    [];
  const first = Array.isArray(candidates) ? candidates[0] : candidates;

  const arrayCoordinate =
    first?.geometry?.coordinates ??
    first?.location?.coordinates ??
    first?.coordinate ??
    first?.coordinates ??
    first?.point;
  const normalizedArray = normalizeCoordinatePair(arrayCoordinate);
  if (normalizedArray) {
    return normalizedArray;
  }

  const lat = Number(
    first?.geometry?.location?.lat ??
      first?.location?.lat ??
      first?.location?.latitude ??
      first?.lat ??
      first?.latitude,
  );
  const lng = Number(
    first?.geometry?.location?.lng ??
      first?.geometry?.location?.lon ??
      first?.location?.lng ??
      first?.location?.lon ??
      first?.location?.longitude ??
      first?.lng ??
      first?.lon ??
      first?.longitude,
  );

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return [lng, lat];
  }

  return null;
}

function extractRouteCoordinates(routeResponse) {
  const route = routeResponse?.routes?.[0] ?? routeResponse?.route ?? routeResponse;
  const coordinates =
    route?.geometry?.coordinates ??
    route?.legs?.[0]?.geometry?.coordinates ??
    route?.features?.[0]?.geometry?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  return coordinates;
}

function makeRouteGeoJson(coordinates) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      },
    ],
  };
}

function upsertRoute(map, coordinates) {
  const data = makeRouteGeoJson(coordinates);

  if (map.getSource(ROUTE_SOURCE_ID)) {
    map.getSource(ROUTE_SOURCE_ID).setData(data);
    return;
  }

  map.addSource(ROUTE_SOURCE_ID, {
    type: "geojson",
    data,
  });

  map.addLayer({
    id: ROUTE_LAYER_ID,
    type: "line",
    source: ROUTE_SOURCE_ID,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#1267ff",
      "line-width": 5,
      "line-opacity": 0.9,
    },
  });
}

function upsertSelectedZoneHighlight(map, zone) {
  const data = {
    type: "Feature",
    geometry: zone.geometry,
    properties: {
      name: zone.name,
    },
  };

  if (map.getSource(SELECTED_ZONE_SOURCE_ID)) {
    map.getSource(SELECTED_ZONE_SOURCE_ID).setData(data);
  } else {
    map.addSource(SELECTED_ZONE_SOURCE_ID, {
      type: "geojson",
      data,
    });
  }

  if (map.getLayer(SELECTED_ZONE_LAYER_ID)) {
    return;
  }

  map.addLayer({
    id: SELECTED_ZONE_LAYER_ID,
    type: "line",
    source: SELECTED_ZONE_SOURCE_ID,
    paint: {
      "line-color": "#1267ff",
      "line-width": 4,
      "line-opacity": 0.95,
      "line-blur": 0.4,
    },
  });
}

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const grabMapsApiRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const tileWarningCountRef = useRef(0);
  const usingFallbackBasemapRef = useRef(false);
  const [apiStatus, setApiStatus] = useState({
    state: "checking",
    message: "Checking GrabMaps style descriptor...",
  });

  const [mapReady, setMapReady] = useState(false);
  const [mapStyleRevision, setMapStyleRevision] = useState(0);
  const [currentHour, setCurrentHour] = useState(23);
  const [selectedZone, setSelectedZone] = useState(zones.find((zone) => zone.name === "Jurong West") ?? zones[0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [routeStatus, setRouteStatus] = useState("No route selected yet.");
  const [usedFallbackRoute, setUsedFallbackRoute] = useState(false);
  const [recommendedPickup, setRecommendedPickup] = useState(getBestPickupForZone(zones.find((zone) => zone.name === "Jurong West") ?? zones[0]));
  const [pickupCoordinateSource, setPickupCoordinateSource] = useState("Local fallback coordinate");

  const selectedSupply = selectedZone.supplyScores[currentHour];
  const selectedWait = getWaitTime(selectedSupply);
  const rankedPickups = useMemo(() => getRankedPickupsForZone(selectedZone, selectedWait), [selectedZone, selectedWait]);
  const selectedPickup = rankedPickups[0] ?? getBestPickupForZone(selectedZone);
  const pickupWait = recommendedPickup.predictedWait ?? getPredictedPickupWait(selectedWait, recommendedPickup);
  const walkMinutes = recommendedPickup.walkMinutes ?? 8;
  const totalTime = walkMinutes + pickupWait;
  const timeSaved = Math.max(0, selectedWait - totalTime);
  const selectedSafetyScore = normalizeSafetyScore(selectedZone.safetyScore);
  const recommendedPickupSafetyScore = normalizeSafetyScore(recommendedPickup.safetyScore);
  const showSafetyNotice = currentHour >= 21 && selectedSafetyScore < 0.65;

  function openZoneRecommendation(zone) {
    setSelectedZone(zone);
    setSidebarOpen(true);
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadMap() {
      try {
        if (!mapContainerRef.current || mapRef.current) return;

        const api = new GrabMapsAPI({
          apiKey: import.meta.env.VITE_GRABMAPS_API_KEY,
        });
        const map = await api.createMap(mapContainerRef.current, SINGAPORE_CENTER, 11);

        if (isCancelled) {
          api.destroy();
          return;
        }

        grabMapsApiRef.current = api;
        mapRef.current = map;
        setApiStatus({
          state: "success",
          message: api.isUsingLibrary()
            ? "GrabMaps library map loaded."
            : "GrabMaps library unavailable; using authenticated MapLibre fallback.",
        });

        if (map.isStyleLoaded?.()) {
          setMapReady(true);
        } else {
          map.once("load", () => {
            console.log("GrabMaps library MapLibre instance is ready.");
            setMapReady(true);
          });
          map.once("idle", () => {
            setMapReady(true);
          });
        }

        map.on("error", (event) => {
          const error = event?.error || event;
          const message = error?.message || error?.statusText || String(error);
          const isGrabVectorTileWarning =
            message.includes("maps/tiles") || message.includes(".pbf");

          if (isGrabVectorTileWarning) {
            tileWarningCountRef.current += 1;
            console.warn("Grab vector tile warning:", message);

            if (tileWarningCountRef.current >= 2 && !usingFallbackBasemapRef.current) {
              usingFallbackBasemapRef.current = true;
              console.warn("Switching to fallback basemap after repeated Grab vector tile warnings.");
              map.setStyle(FALLBACK_BASEMAP_STYLE);
              setApiStatus({
                state: "success",
                message: "Grab vector tiles unavailable; using fallback basemap for demo.",
              });
              setMapStyleRevision((revision) => revision + 1);
            }
            return;
          }

          console.warn("MapLibre / GrabMaps map warning:", message, error);
        });
      } catch (error) {  
        console.error("GrabMaps library map failed:", error);
        setApiStatus({
          state: "error",
          message: `GrabMaps library map failed: ${error.message}`,
        });
      }
    }

    loadMap();

    return () => {
      isCancelled = true;
      grabMapsApiRef.current?.destroy();
      if (!grabMapsApiRef.current) {
        mapRef.current?.remove();
      }
      grabMapsApiRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const handleZoneClick = async (zone, event) => {
      openZoneRecommendation(zone);
      try {
        const reverse = await grabMapsApiRef.current?.reverseGeocode?.([event.lngLat.lng, event.lngLat.lat]);
        if (reverse) {
          console.log("GrabMaps ReverseGeocode result:", reverse);
        }
      } catch (error) {
        console.warn("GrabMaps ReverseGeocode unavailable for clicked map point:", error);
      }
    };

    const drawBoxes = () => {
      upsertZoneBoxes(map, currentHour, handleZoneClick);
    };

    drawBoxes();
    map.on("styledata", drawBoxes);
    map.on("idle", drawBoxes);

    return () => {
      map.off("styledata", drawBoxes);
      map.off("idle", drawBoxes);
    };
  }, [currentHour, mapReady, mapStyleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.isStyleLoaded()) return;

    zones.forEach((zone, index) => {
      const layerId = `zone-fill-${index}`;
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "fill-color", getSupplyColor(zone.supplyScores[currentHour]));
        map.setPaintProperty(layerId, "fill-opacity", 0.62);
      }
    });
  }, [currentHour, mapReady, mapStyleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!sidebarOpen || !mapReady || !map?.isStyleLoaded() || !selectedZone) return;

    upsertSelectedZoneHighlight(map, selectedZone);
    let animationFrame = 0;
    const startedAt = performance.now();

    function animatePulse(now) {
      if (!map.getLayer(SELECTED_ZONE_LAYER_ID)) return;

      const phase = ((now - startedAt) % 1600) / 1600;
      const pulse = Math.sin(phase * Math.PI);
      map.setPaintProperty(SELECTED_ZONE_LAYER_ID, "line-width", 3.5 + pulse * 5);
      map.setPaintProperty(SELECTED_ZONE_LAYER_ID, "line-opacity", 0.45 + pulse * 0.5);
      animationFrame = requestAnimationFrame(animatePulse);
    }

    animationFrame = requestAnimationFrame(animatePulse);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [selectedZone, mapReady, sidebarOpen, mapStyleRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!sidebarOpen || !mapReady || !map?.isStyleLoaded() || !selectedZone || !selectedPickup) {
      return;
    }

    const start = selectedZone.center;
    let isCancelled = false;

    setRecommendedPickup(selectedPickup);
    setPickupCoordinateSource("Searching GrabMaps SearchText...");
    setRouteStatus("Resolving named pickup with GrabMaps SearchText...");
    setUsedFallbackRoute(false);

    async function loadWalkingRoute() {
      let pickupForRoute = selectedPickup;
      let coordinateSource = "Local fallback coordinate";

      try {
        const api = grabMapsApiRef.current;
        if (!api) {
          throw new Error("GrabMaps library client is not ready.");
        }

        try {
          const query = getSearchQueryForPickup(selectedPickup.name);
          const searchResponse = await api.searchText(query, start);
          const searchedCoordinate = extractPlaceCoordinate(searchResponse);

          if (searchedCoordinate) {
            pickupForRoute = {
              ...selectedPickup,
              name: query,
              coordinates: searchedCoordinate,
            };
            coordinateSource = "GrabMaps SearchText coordinate";
          }
        } catch (searchError) {
          console.warn("SearchText failed, using local pickup coordinate:", searchError);
        }

        if (isCancelled) return;
        setRecommendedPickup(pickupForRoute);
        setPickupCoordinateSource(coordinateSource);

        const end = pickupForRoute.coordinates;
        const fallbackCoordinates = [start, end];

        selectedMarkerRef.current?.remove();
        pickupMarkerRef.current?.remove();
        selectedMarkerRef.current = new maplibregl.Marker({ color: "#e02d3c" })
          .setLngLat(start)
          .setPopup(new maplibregl.Popup().setText(`${selectedZone.name}: ${selectedWait} min wait`))
          .addTo(map);
        pickupMarkerRef.current = new maplibregl.Marker({ color: "#00b14f" })
          .setLngLat(end)
          .setPopup(new maplibregl.Popup().setText(pickupForRoute.name))
          .addTo(map);

        map.fitBounds([start, end], { padding: 90, maxZoom: 14, duration: 700 });
        setRouteStatus("Loading GrabMaps pedestrian route...");

        const routeResponse = await api.calculateWaypointRoute(start, end, "pedestrian");
        const routeCoordinates = extractRouteCoordinates(routeResponse);

        if (!routeCoordinates) {
          throw new Error("No route geometry returned");
        }

        if (isCancelled) return;
        upsertRoute(map, routeCoordinates);
        setRouteStatus("GrabMaps pedestrian route loaded.");
        setUsedFallbackRoute(false);
      } catch (error) {
        console.error("Pedestrian route failed, using fallback route:", error);
        if (isCancelled) return;
        const end = pickupForRoute.coordinates;
        const fallbackCoordinates = [start, end];

        selectedMarkerRef.current?.remove();
        pickupMarkerRef.current?.remove();
        selectedMarkerRef.current = new maplibregl.Marker({ color: "#e02d3c" })
          .setLngLat(start)
          .setPopup(new maplibregl.Popup().setText(`${selectedZone.name}: ${selectedWait} min wait`))
          .addTo(map);
        pickupMarkerRef.current = new maplibregl.Marker({ color: "#00b14f" })
          .setLngLat(end)
          .setPopup(new maplibregl.Popup().setText(pickupForRoute.name))
          .addTo(map);

        upsertRoute(map, fallbackCoordinates);
        setRouteStatus("Fallback route used.");
        setUsedFallbackRoute(true);
      }
    }

    loadWalkingRoute();

    return () => {
      isCancelled = true;
    };
  }, [selectedZone, selectedPickup, selectedWait, mapReady, sidebarOpen, mapStyleRevision]);

  return (
    <main className="map-page">
      <div ref={mapContainerRef} className="map-container" />
      <section className={`status-card ${apiStatus.state}`}>
        <p className="eyebrow">RouteWise setup check</p>
        <h1>GrabMaps + MapLibre</h1>
        <p>{apiStatus.message}</p>
        <label className="compact-time-control">
          <span>Time: {currentHour}:00</span>
          <input
            type="range"
            min="0"
            max="23"
            value={currentHour}
            onChange={(event) => setCurrentHour(Number(event.target.value))}
          />
        </label>
        <div className="zone-shortcuts">
          {zones.map((zone) => (
            <button
              key={zone.name}
              type="button"
              onClick={() => openZoneRecommendation(zone)}
              style={{ borderColor: getSupplyColor(zone.supplyScores[currentHour]) }}
            >
              <span style={{ background: getSupplyColor(zone.supplyScores[currentHour]) }} />
              {zone.name}
            </button>
          ))}
        </div>
        {!sidebarOpen && (
          <p className="click-hint">
            Click a coloured zone or use the zone buttons to open recommendations.
          </p>
        )}
      </section>
      <section className={`route-card ${sidebarOpen ? "open" : ""}`} aria-hidden={!sidebarOpen}>
        <p className="eyebrow">Selected zone</p>
        <h2>{selectedZone.name}</h2>
        <div className="time-saved-hero" aria-live="polite" key={`${selectedZone.name}-${timeSaved}`}>
          <strong>{timeSaved}</strong>
          <span>min saved</span>
        </div>
        <label className="time-control">
          <span>Hour: {currentHour}:00</span>
          <input
            type="range"
            min="0"
            max="23"
            value={currentHour}
            onChange={(event) => setCurrentHour(Number(event.target.value))}
          />
        </label>
        <div className="recommendation-summary">
          <div>
            <span>1. Current zone estimated wait</span>
            <strong>{selectedWait} min</strong>
          </div>
          <div>
            <span>2. Nearest better pickup point</span>
            <strong>{recommendedPickup.name}</strong>
          </div>
          <div>
            <span>3. Walking time</span>
            <strong>{walkMinutes} min</strong>
          </div>
          <div>
            <span>4. New estimated wait</span>
            <strong>{pickupWait} min</strong>
          </div>
          <div>
            <span>5. Time saved</span>
            <strong>{timeSaved} min</strong>
          </div>
        </div>
        <div className="route-stats">
          <div>
            <span>Supply</span>
            <strong>{getSupplyLevel(selectedSupply)}</strong>
          </div>
          <div>
            <span>Pickup safety</span>
            <strong>{Math.round(recommendedPickupSafetyScore * 100)}%</strong>
          </div>
        </div>
        {showSafetyNotice && (
          <div className="safety-note">
            <strong>Late-night pickup note</strong>
            <p>
              This recommendation is safety-aware using walkability proxies: MRT proximity, active
              POIs, and late-night accessibility. The suggested pickup has stronger pickup anchors
              for this hour.
            </p>
          </div>
        )}
        {rankedPickups.length > 1 && (
          <div className="pickup-list">
            <p className="eyebrow">Pickup point ranking</p>
            {rankedPickups.slice(0, 5).map((pickup, index) => (
              <div className="pickup-row" key={pickup.id}>
                <strong>{index + 1}. {pickup.name}</strong>
                <span>
                  {pickup.type ?? "Pickup anchor"} · {pickup.walkMinutes ?? 8} min walk · safety{" "}
                  {Math.round(normalizeSafetyScore(pickup.safetyScore) * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
        <p>
          Walk to <strong>{recommendedPickup.name}</strong>; estimated wait drops to{" "}
          <strong>{pickupWait} min</strong>.
        </p>
        <div className="demo-output">
          <p><strong>Best pickup:</strong> {recommendedPickup.name}</p>
          <p><strong>Walk:</strong> {walkMinutes} min</p>
          <p><strong>Predicted ride wait:</strong> {pickupWait} min</p>
          <p><strong>Total time:</strong> {totalTime} min</p>
          <p><strong>Current wait:</strong> {selectedWait} min</p>
          <p><strong>Time saved:</strong> {timeSaved} min</p>
        </div>
        <p className="route-status">{pickupCoordinateSource}</p>
        <p className="route-status">{routeStatus}</p>
        {usedFallbackRoute && <span className="fallback-badge">fallback route used</span>}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
