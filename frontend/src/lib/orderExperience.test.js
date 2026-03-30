import { describe, expect, it } from "vitest";
import {
  buildOrderChatLink,
  buildOrderTimeline,
  canReviewDeliveredOrder,
  getOrderStatusTone,
} from "./orderExperience";

describe("orderExperience", () => {
  it("builds a delivery timeline with the current step highlighted", () => {
    const timeline = buildOrderTimeline({
      metodaLivrare: "livrare",
      status: "in_lucru",
      statusHistory: [{ status: "acceptata", note: "confirmata" }],
    });

    expect(timeline).toHaveLength(5);
    expect(timeline[2].state).toBe("current");
    expect(timeline[1].note).toBe("confirmata");
  });

  it("marks delivered orders as reviewable", () => {
    expect(canReviewDeliveredOrder({ status: "livrata" })).toBe(true);
    expect(canReviewDeliveredOrder({ status: "in_lucru" })).toBe(false);
  });

  it("builds a chat link scoped to the order and provider", () => {
    const link = buildOrderChatLink({
      _id: "abc123",
      numeroComanda: "CMD-1",
      prestatorId: "provider-1",
    });

    expect(link).toContain("providerId=provider-1");
    expect(link).toContain("CMD-1");
  });

  it("returns a success tone for completed statuses", () => {
    expect(getOrderStatusTone({ status: "gata" })).toBe("success");
    expect(getOrderStatusTone({ status: "refuzata" })).toBe("error");
  });
});
