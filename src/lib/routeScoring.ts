import { SupplyModel } from './supplyModel';
import { SafetyModel } from './safetyModel';

export interface Route {
  id: string;
  zones: string[];
  distance: number;
  duration: number;
  score: number;
}

export class RouteScoring {
  private supplyModel: SupplyModel;
  private safetyModel: SafetyModel;

  constructor(supplyModel: SupplyModel, safetyModel: SafetyModel) {
    this.supplyModel = supplyModel;
    this.safetyModel = safetyModel;
  }

  scoreRoute(route: Route, currentHour: number): number {
    let totalScore = 0;
    let zoneCount = 0;

    for (const zoneName of route.zones) {
      const supply = this.supplyModel.getSupplyForZone(zoneName, currentHour);
      const safety = this.safetyModel.getSafetyScore(zoneName);

      // Weighted score: 60% supply, 40% safety
      const zoneScore = (supply * 0.6) + (safety * 0.4);
      totalScore += zoneScore;
      zoneCount++;
    }

    return zoneCount > 0 ? totalScore / zoneCount : 0;
  }

  getRecommendedRoutes(routes: Route[], currentHour: number): Route[] {
    return routes
      .map(route => ({
        ...route,
        score: this.scoreRoute(route, currentHour)
      }))
      .sort((a, b) => b.score - a.score);
  }
}