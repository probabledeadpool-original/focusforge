"use client";

import Component from "@/components/ui/ai-message";

export default function DemoOne() {
  return (
    <div className="flex min-h-[440px] w-full items-center justify-center bg-background p-10">
      <div className="w-full max-w-lg space-y-4">
        <Component from="user" timestamp="09:24">
          Why does my dialog feel sluggish when it opens?
        </Component>

        <Component
          copyText="Your transition is 600ms with an easeInOut curve."
          from="assistant"
          onRetry={() => undefined}
          onVote={() => undefined}
          timestamp="09:24"
        >
          Your transition is 600ms with an ease-in-out curve, so the first third
          of the motion is almost stationary. Drop it to 0.25s with an ease-out
          curve and it will read as instant without losing the animation.
        </Component>
      </div>
    </div>
  );
}
