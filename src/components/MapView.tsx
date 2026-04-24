import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Zone } from '../lib/supplyModel';

interface MapViewProps {
  zones: Zone[];
  currentHour: number;
  onZoneClick: (zone: Zone) => void;
  style: any;
}

export const MapView: React.FC<MapViewProps> = ({
  zones,
  currentHour,
  onZoneClick,
  style
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !style) return;

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: style,
      center: [103.8198, 1.3521],
      zoom: 12,
      transformRequest: (url) => {
        if (url.startsWith('https://maps.grab.com')) {
          return {
            url: url,
            headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
          };
        }
      }
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      mapRef.current?.remove();
    };
  }, [style]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Update zone colors when hour changes
    zones.forEach((zone, index) => {
      const supply = zone.supplyScores[currentHour];
      let color = supply < 40 ? 'red' : supply < 70 ? 'yellow' : 'green';
      mapRef.current!.setPaintProperty(`zone-fill-${index}`, 'fill-color', color);
    });
  }, [currentHour, zones]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Add zones to map
    zones.forEach((zone, index) => {
      const supply = zone.supplyScores[currentHour];
      let color = supply < 40 ? 'red' : supply < 70 ? 'yellow' : 'green';

      mapRef.current!.addSource(`zone-${index}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: zone.geometry,
          properties: zone
        }
      });

      mapRef.current!.addLayer({
        id: `zone-fill-${index}`,
        type: 'fill',
        source: `zone-${index}`,
        paint: {
          'fill-color': color,
          'fill-opacity': 0.5
        }
      });

      mapRef.current!.addLayer({
        id: `zone-outline-${index}`,
        type: 'line',
        source: `zone-${index}`,
        paint: {
          'line-color': '#000',
          'line-width': 2
        }
      });
    });

    // Add click handler
    mapRef.current.on('click', (e) => {
      const features = mapRef.current!.queryRenderedFeatures(e.point, {
        layers: zones.map((_, index) => `zone-fill-${index}`)
      });

      if (features.length > 0) {
        const zone = features[0].properties as Zone;
        onZoneClick(zone);
      }
    });

  }, [zones, currentHour, onZoneClick]);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />;
};