export const fixedTestClock = "2026-07-11T00:00:00.000Z";
export const visualViewports = [
  { name: "mobile", width: 360, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

export function withFixedNow<T>(callback: () => T): T {
  const originalNow = Date.now;
  Date.now = () => new Date(fixedTestClock).valueOf();
  try {
    return callback();
  } finally {
    Date.now = originalNow;
  }
}
