export default [
  {
    name: "CBD",
    center: [103.85, 1.2825],
    geometry: {
      type: "Polygon",
      coordinates: [[
        [103.84, 1.275],
        [103.86, 1.275],
        [103.86, 1.29],
        [103.84, 1.29],
        [103.84, 1.275]
      ]]
    },
    supplyScores: [
      85, 80, 75, 70, 65, 60, 70, 80, 90, 95, 98, 100, 100, 98, 95, 90, 85, 90, 95, 98, 100, 95, 90, 85
    ],
    safetyScore: 0.9,
    explanation: "Central Business District with high daytime activity and consistent supply due to business hours and nightlife."
  },
  {
    name: "Orchard",
    center: [103.83, 1.305],
    geometry: {
      type: "Polygon",
      coordinates: [[
        [103.825, 1.295],
        [103.84, 1.295],
        [103.84, 1.315],
        [103.825, 1.315],
        [103.825, 1.295]
      ]]
    },
    supplyScores: [
      80, 75, 70, 65, 60, 55, 65, 75, 85, 90, 95, 98, 100, 98, 95, 90, 85, 90, 95, 98, 100, 95, 90, 80
    ],
    safetyScore: 0.85,
    explanation: "Shopping and entertainment hub with high supply from shopping hours and evening crowds."
  },
  {
    name: "Tampines",
    center: [103.9425, 1.3525],
    geometry: {
      type: "Polygon",
      coordinates: [[
        [103.935, 1.345],
        [103.95, 1.345],
        [103.95, 1.365],
        [103.935, 1.365],
        [103.935, 1.345]
      ]]
    },
    supplyScores: [
      60, 55, 50, 45, 40, 35, 45, 55, 65, 70, 75, 80, 85, 80, 75, 70, 65, 70, 75, 80, 75, 70, 65, 60
    ],
    safetyScore: 0.75,
    explanation: "Residential and commercial area with moderate supply, higher during commuting hours."
  },
  {
    name: "Ang Mo Kio",
    center: [103.845, 1.37],
    geometry: {
      type: "Polygon",
      coordinates: [[
        [103.835, 1.36],
        [103.855, 1.36],
        [103.855, 1.38],
        [103.835, 1.38],
        [103.835, 1.36]
      ]]
    },
    supplyScores: [
      55, 50, 45, 40, 35, 30, 40, 50, 60, 65, 70, 75, 80, 75, 70, 65, 60, 65, 70, 75, 70, 65, 60, 55
    ],
    safetyScore: 0.8,
    explanation: "Mixed residential and commercial zone with steady supply during peak hours."
  },
  {
    name: "Woodlands",
    center: [103.785, 1.437],
    geometry: {
      type: "Polygon",
      coordinates: [[
        [103.78, 1.43],
        [103.8, 1.43],
        [103.8, 1.45],
        [103.78, 1.45],
        [103.78, 1.43]
      ]]
    },
    supplyScores: [
      20, 15, 10, 5, 5, 10, 25, 35, 45, 50, 55, 60, 65, 60, 55, 50, 45, 50, 55, 60, 50, 40, 35, 20
    ],
    safetyScore: 0.62,
    explanation: "Northern residential area with lower supply at night due to fewer late-night activities."
  },
  {
    name: "Jurong West",
    center: [103.7075, 1.3425],
    geometry: {
      type: "Polygon",
      coordinates: [[
        [103.695, 1.33],
        [103.72, 1.33],
        [103.72, 1.35],
        [103.695, 1.35],
        [103.695, 1.33]
      ]]
    },
    supplyScores: [
      35, 30, 25, 20, 15, 10, 20, 30, 40, 45, 50, 55, 60, 55, 50, 45, 40, 45, 50, 55, 45, 35, 30, 35
    ],
    safetyScore: 0.6,
    explanation: "Residential edge zone, lower late-night driver density"
  }
];
