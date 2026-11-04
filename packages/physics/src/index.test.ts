import { describe, expect, it } from "vitest";
import { sampleWave, satisfiesWaveDispersion, units } from "./index";

describe("wave model and units", () => {
  const parameters = {
    amplitudeMetres: 1,
    frequencyHertz: 0.5,
    waveSpeedMetresPerSecond: 2,
    initialCondition: "traveling" as const,
  };

  it("samples finite displacements and obeys the wave dispersion relation", () => {
    const samples = sampleWave(parameters, 0.5);
    expect(samples).toHaveLength(121);
    expect(samples.every((sample) => Number.isFinite(sample.displacementMetres))).toBe(true);
    expect(satisfiesWaveDispersion(parameters)).toBe(true);
  });

  it("keeps physical units explicit", () => {
    expect(units.find((unit) => unit.id === "metre-per-second")?.symbol).toBe("m·s⁻¹");
  });
});
