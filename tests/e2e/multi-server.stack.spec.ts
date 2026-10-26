import { expect, test } from "@playwright/test";
import { E2E_BASE_URL, E2E_SERVERS } from "./support/env";
import { AISHA, connect, firstNames, nextEvent, signInApi, VIKRAM, type PartyState } from "./support/servers";

/**
 * Two app servers behind a load balancer (npm run test:e2e:stack). Each test puts users on
 * different servers on purpose and checks they still see one app: realtime messages,
 * party state, uploaded files and cached data all agree.
 */
const { a: A, b: B } = E2E_SERVERS;

test("the load balancer spreads visitors across both servers", async ({ request }) => {
  const servers = new Set<string>();
  for (let i = 0; i < 10; i++) {
    const response = await request.get(`${E2E_BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
    servers.add((await response.json()).server);
  }
  expect([...servers].sort()).toEqual(["a", "b"]);
});

test("a DM sent through server A arrives live for a user connected to server B", async () => {
  const aisha = await signInApi(A, AISHA.email);
  const vikram = await signInApi(B, VIKRAM.email);
  // Only friends can message: Aisha's follow sends a request, Vikram's follow back accepts it.
  await aisha.api.post(`/api/users/${VIKRAM.handle}/follow`);
  const accepted = await vikram.api.post(`/api/users/${AISHA.handle}/follow`);
  expect((await accepted.json()).friendStatus).toBe("friends");
  const vikramTab = await connect(B, vikram.cookie);

  const text = `cross-server hello ${Date.now()}`;
  const arrived = nextEvent(vikramTab, "dm:message", (message) => JSON.stringify(message).includes(text));
  const sent = await aisha.api.post("/api/dm/send", { data: { recipientHandle: VIKRAM.handle, content: text } });
  expect(sent.ok()).toBe(true);
  await arrived;

  vikramTab.close();
});

test("a listen party with the host on server A and a member on server B stays in sync", async () => {
  const party = "listen:demon-slayer-corps";
  const aisha = await connect(A, (await signInApi(A, AISHA.email)).cookie);
  const vikram = await connect(B, (await signInApi(B, VIKRAM.email)).cookie);

  const hosting = nextEvent<PartyState>(aisha, "party:state");
  aisha.emit("party:join", { key: party });
  const aishaId = (await hosting).hostId;

  // Each server sends its own users the party state — both read it from Redis.
  const seenOnA = nextEvent<PartyState>(aisha, "party:state", (state) => state.members.length === 2);
  const seenOnB = nextEvent<PartyState>(vikram, "party:state", (state) => state.members.length === 2);
  vikram.emit("party:join", { key: party });
  const [stateOnA, stateOnB] = await Promise.all([seenOnA, seenOnB]);
  expect(firstNames(stateOnB)).toEqual(firstNames(stateOnA));
  expect(stateOnB.hostId).toBe(aishaId);

  const seek = nextEvent<PartyState>(vikram, "party:state", (state) => state.positionSec === 42);
  aisha.emit("party:control", { key: party, control: { action: "pause", positionSec: 42 } });
  await seek;

  // Server B enforces the host rule from the shared state, too.
  const refused = nextEvent<{ message: string }>(vikram, "party:error");
  vikram.emit("party:control", { key: party, control: { action: "pause", positionSec: 99 } });
  expect((await refused).message).toBe("Only the host controls playback.");

  const aishaLeft = nextEvent<PartyState>(vikram, "party:state", (state) => state.members.length === 1);
  aisha.emit("party:leave", { key: party });
  await aishaLeft;
  vikram.emit("party:leave", { key: party });
  aisha.close();
  vikram.close();
});

test("a file uploaded through server A is served by server B (shared S3 bucket)", async ({ request }) => {
  const aisha = await signInApi(A, AISHA.email);
  // A real 1×1 PNG.
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const upload = await aisha.api.post("/api/upload", { multipart: { file: { name: "avatar.png", mimeType: "image/png", buffer: png } } });
  expect(upload.ok()).toBe(true);
  const { url } = await upload.json();

  const served = await request.get(`${B}${url}`);
  expect(served.status()).toBe(200);
  expect(served.headers()["content-type"]).toBe("image/png");
  expect(Buffer.compare(await served.body(), png)).toBe(0);
});

test("a change made through server A shows on server B at once (shared cache clearing)", async () => {
  const aisha = await signInApi(A, AISHA.email);
  const vikram = await signInApi(B, VIKRAM.email);
  const word = `Zyxq${Date.now()}`;
  const searchOnB = async () => JSON.stringify((await (await vikram.api.get(`/api/search?q=${word}`)).json()).results);

  // Server B searches first, caching "nothing found".
  expect(await searchOnB()).not.toContain(`${word} Club`);
  const created = await aisha.api.post("/api/communities", { data: { name: `${word} Club` } });
  expect(created.status()).toBe(201);

  // Without the shared invalidation, B would keep serving its cached empty result.
  await expect.poll(searchOnB, { timeout: 3000 }).toContain(`${word} Club`);
});
