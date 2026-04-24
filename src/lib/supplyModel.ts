export interface Zone {
  name: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  supplyScores: number[];
  safetyScore: number;
  explanation: string;
}

export interface SupplyData {
  zone: string;
  hour: number;
  supply: number;
  demand: number;
}

export class SupplyModel {
  private zones: Zone[];

  constructor(zones: Zone[]) {
    this.zones = zones;
  }

  getSupplyForZone(zoneName: string, hour: number): number {
    const zone = this.zones.find(z => z.name === zoneName);
    return zone ? zone.supplyScores[hour] : 0;
  }

  getSupplyLevel(supply: number): 'low' | 'medium' | 'high' {
    if (supply < 40) return 'low';
    if (supply < 70) return 'medium';
    return 'high';
  }

  getEstimatedWait(supply: number): number {
    if (supply < 40) return 38;
    if (supply < 70) return 20;
    return 10;
  }

  getAllZones(): Zone[] {
    return this.zones;
  }
}