import type { DishRecommendationResponse } from "@/shared/api-contract";
import { enforceAiRateLimit } from "@/server/http/ai-rate-limit";
import { handleRoute } from "@/server/http/handle-route";
import { DishRequestSchema, readJsonBody } from "@/server/http/request-schemas";
import { getCurrentYear, toWineResponse } from "@/server/http/wine-response";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";
const RECENT_DISH_LIMIT = 8;

export async function GET(): Promise<Response> {
  return handleRoute(async () => {
    const { dishRecommendationRepository } = getServiceContainer();
    return Response.json({
      recentDishes: dishRecommendationRepository.listRecentDishes(RECENT_DISH_LIMIT),
    });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const { dish, shouldForceRefresh } = DishRequestSchema.parse(await readJsonBody(request));
    const container = getServiceContainer();
    enforceAiRateLimit(container);

    const result = await container.dishRecommendationService.recommendForDish(
      dish,
      shouldForceRefresh,
    );
    const currentYear = getCurrentYear();
    const responseBody: DishRecommendationResponse = {
      dish: result.dish,
      isFromCache: result.isFromCache,
      createdAt: result.createdAt.toISOString(),
      recommendations: result.recommendations.map((recommendation) => ({
        wine: toWineResponse(recommendation.wine, currentYear),
        reasoning: recommendation.reasoning,
        servingTip: recommendation.servingTip,
      })),
    };
    return Response.json(responseBody);
  });
}
