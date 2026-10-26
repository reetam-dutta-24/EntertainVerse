import { describe, expect, it } from "vitest";
import { DEFAULT_ICE_SERVERS, iceServersFromEnv } from "@/lib/realtime/ice-servers";

describe("iceServersFromEnv", () => {
  it("uses public STUN only when no TURN relay is configured", () => {
    expect(iceServersFromEnv({})).toEqual(DEFAULT_ICE_SERVERS);
  });

  it("adds the TURN relay with its credentials", () => {
    expect(
      iceServersFromEnv({
        TURN_URLS: "turn:turn.example.com:3478, turns:turn.example.com:5349",
        TURN_USERNAME: "user",
        TURN_CREDENTIAL: "secret",
      }),
    ).toEqual([
      ...DEFAULT_ICE_SERVERS,
      { urls: ["turn:turn.example.com:3478", "turns:turn.example.com:5349"], username: "user", credential: "secret" },
    ]);
  });

  it("ignores a TURN relay with missing credentials or non-TURN urls", () => {
    expect(iceServersFromEnv({ TURN_URLS: "turn:turn.example.com:3478", TURN_USERNAME: "user" })).toEqual(DEFAULT_ICE_SERVERS);
    expect(iceServersFromEnv({ TURN_URLS: "https://not-a-turn-server", TURN_USERNAME: "u", TURN_CREDENTIAL: "c" })).toEqual(DEFAULT_ICE_SERVERS);
  });
});
