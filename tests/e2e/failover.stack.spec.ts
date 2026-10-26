import { exec, execSync } from "node:child_process";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import type { Socket } from "socket.io-client";
import { E2E_BASE_URL, E2E_SERVERS } from "./support/env";
import { AISHA, connect, firstNames, nextEvent, signInApi, VIKRAM, type PartyState } from "./support/servers";

/**
 * A server going away mid-party — a deploy, a scale-down, `docker stop`. Runs last (it stops
 * server A), and starts it again afterwards.
 *
 * Users reach the app through the load balancer, pinned to a server by the `lb_server`
 * cookie (the local stand-in for the AWS load balancer's sticky cookie).
 */
const compose = "docker compose -f docker-compose.e2e.yml";
const party = "listen:demon-slayer-corps";

test.afterAll(() => {
  execSync(`${compose} start app-a`, { stdio: "inherit" });
  execSync(`${compose} up -d --wait app-a`, { stdio: "inherit" });
});

/** Like the app's party hook: (re)join the party every time the connection is (re)made. */
function rejoinOnConnect(socket: Socket) {
  socket.on("connect", () => socket.emit("party:join", { key: party }));
}

test("stopping a server hands its users to the other server without losing the party", async ({ request }) => {
  test.setTimeout(90_000);
  const aishaSession = await signInApi(E2E_BASE_URL, AISHA.email);
  const vikramSession = await signInApi(E2E_BASE_URL, VIKRAM.email);
  const aisha = await connect(E2E_BASE_URL, `${aishaSession.cookie}; lb_server=a`);
  const vikram = await connect(E2E_BASE_URL, `${vikramSession.cookie}; lb_server=b`);

  const hosting = nextEvent<PartyState>(aisha, "party:state");
  aisha.emit("party:join", { key: party });
  const aishaId = (await hosting).hostId;
  rejoinOnConnect(aisha);
  const together = nextEvent<PartyState>(aisha, "party:state", (state) => state.members.length === 2);
  vikram.emit("party:join", { key: party });
  await together;
  const paused = nextEvent<PartyState>(vikram, "party:state", (state) => state.positionSec === 42);
  aisha.emit("party:control", { key: party, control: { action: "pause", positionSec: 42 } });
  await paused;

  // Stop server A (Aisha's). `docker stop` sends SIGTERM; it returns once A has exited.
  const disconnected = nextEvent<string>(aisha, "disconnect");
  const stopping = promisify(exec)(`${compose} stop app-a`);
  await expect
    .poll(async () => (await request.get(`${E2E_SERVERS.a}/api/health`).then((r) => r.json(), () => null))?.status, { timeout: 5000 })
    .toBe("draining");
  await stopping;
  expect(await disconnected).toBe("transport close");

  // Aisha's tab reconnects by itself — the load balancer sends it to server B — and
  // rejoins. She's still the host, Vikram is still there, the position is kept.
  const back = await nextEvent<PartyState>(aisha, "party:state", (state) => state.members.length === 2, 30_000);
  expect(back.hostId).toBe(aishaId);
  expect(firstNames(back)).toEqual(["Aisha", "Vikram"]);
  expect(back.positionSec).toBe(42);

  // And the party keeps working from server B.
  const seek = nextEvent<PartyState>(vikram, "party:state", (state) => state.positionSec === 50);
  aisha.emit("party:control", { key: party, control: { action: "pause", positionSec: 50 } });
  await seek;

  // Pages pinned to A are now served by B.
  const health = await aishaSession.api.get("/api/health", { headers: { cookie: "lb_server=a" } });
  expect(await health.json()).toMatchObject({ status: "ok", server: "b" });

  aisha.close();
  vikram.close();
});
