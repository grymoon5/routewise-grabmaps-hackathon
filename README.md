# RouteWise

Predictive pickup recommendations for low-supply zones, built for the GrabMaps API Hackathon.

## Project Structure

```
src/
├── data/
│   ├── zones.json          # Singapore zone data with supply scores
│   ├── pickupPoints.json   # Sample pickup locations
│   └── incidents.json      # Sample incident data
├── lib/
│   ├── supplyModel.ts      # Supply calculation logic
│   ├── safetyModel.ts      # Safety scoring system
│   ├── routeScoring.ts     # Route evaluation
│   └── grabMaps.ts         # GrabMaps API wrapper
└── components/
    ├── MapView.tsx         # React map component
    ├── RecommendationPanel.tsx  # Supply recommendations
    └── ScenarioControls.tsx     # Time controls
```

## Run

1. Start a local HTTP server:
   ```bash
   python -m http.server 8000
   ```

2. Open `http://localhost:8000` in a web browser.

3. Replace `'bm_your_api_key_here'` in `index.html` with your actual GrabMaps API key.

4. The app will load the map with:
   - Color-coded zones based on supply levels (green=high, yellow=medium, red=low)
   - Interactive time slider to see supply changes throughout the day
   - Click zones for detailed supply information and recommendations
   - Blue pickup point markers

## Features

- **Real-time Supply Visualization**: Zones change color based on driver availability
- **Time-based Forecasting**: Interactive slider to see supply patterns throughout 24 hours
- **Smart Recommendations**: Click zones to get supply levels, wait times, and pickup suggestions
- **Safety Integration**: Safety scores factored into zone recommendations
- **Pickup Points**: Visual markers for high-demand pickup locations

## API Integration

The app integrates with GrabMaps API for:
- Map tiles and styling
- Route calculations
- Place search functionality

If the API request fails, the app still demonstrates the core concept with fallback data.

## MCP

`mcp-config.example.json` shows the MCP server block to merge into Claude Desktop or Cursor under `mcpServers`.
