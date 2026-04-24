export interface SafetyData {
  zone: string;
  score: number;
  factors: string[];
}

export class SafetyModel {
  private safetyData: Map<string, SafetyData>;

  constructor() {
    this.safetyData = new Map();
  }

  setSafetyData(zone: string, score: number, factors: string[]) {
    this.safetyData.set(zone, { zone, score, factors });
  }

  getSafetyScore(zone: string): number {
    return this.safetyData.get(zone)?.score || 50;
  }

  getSafetyFactors(zone: string): string[] {
    return this.safetyData.get(zone)?.factors || [];
  }

  isSafeZone(zone: string): boolean {
    return this.getSafetyScore(zone) >= 70;
  }
}