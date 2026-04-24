# RouteWise

**Don’t just find the fastest route; find the one that actually gets you a ride.**

RouteWise is a context-aware mobility system that recommends pickup points and routes based on **ride availability**, not just ETA. Built for the GrabMaps API Hackathon, it helps users avoid long wait times in low-supply areas by predicting where they are most likely to get a ride successfully.

## Problem

In areas like Jurong West or Ang Mo Kio, users can wait 30–45 minutes with little visibility into driver availability. Traditional routing systems optimize for speed, but ignore whether a ride is actually obtainable.

---

## Solution

RouteWise introduces a **Pickup Optimizer** powered by a Match Probability model.  
Instead of only showing the fastest route, it recommends:

- Better pickup points with higher driver availability  
- Routes that balance ETA with the likelihood of getting a ride  
- Safer paths during late-night travel using activity-aware scoring  

---

## Demo Scenario

> It’s 11:30pm in Jurong West.

- Current pickup point → ❌ Low supply (~30 min wait)  
- Suggested pickup (5 min walk) → ✅ Higher supply (~8 min wait)  

RouteWise visualizes this difference and explains *why* using supply heatmaps and time-based patterns.

---

## Features

- **Pickup Optimizer**  
  Recommends better pickup locations based on estimated ride availability  
- **Supply Heatmap**  
  Color-coded zones showing predicted driver availability (green = high, red = low)  
- **Time-based Forecasting**  
  Interactive slider to explore how supply changes throughout the day  
- **Route Scoring Engine**  
  Evaluates routes based on ETA, availability, and safety  
- **Safety-Aware Mode**  
  Prioritizes higher-activity and better-lit areas for late-night travel  


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

## API Integration

The app integrates with GrabMaps API for:
- Map rendering
- Route and ETA calculations
- Place search functionality

If the API request fails, the app still demonstrates the core concept with fallback data.

## MCP

`mcp-config.example.json` shows the MCP server block to merge into Claude Desktop or Cursor under `mcpServers`.

## Future Improvements

- Real-time driver supply integration
- Machine learning-based demand prediction
- Personalized safety preferences
