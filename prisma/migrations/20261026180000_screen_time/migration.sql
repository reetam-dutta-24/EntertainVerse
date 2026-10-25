-- Self-imposed daily limit (Mindful mode) and per-day usage. Additive only.
CREATE TABLE "ScreenTimeSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyLimitMinutes" INTEGER,
    "pendingLimitMinutes" INTEGER,
    "pendingFromDay" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreenTimeSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScreenTimeDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "lastBeatAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "ScreenTimeDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScreenTimeSettings_userId_key" ON "ScreenTimeSettings"("userId");
CREATE UNIQUE INDEX "ScreenTimeDay_userId_day_key" ON "ScreenTimeDay"("userId", "day");

ALTER TABLE "ScreenTimeSettings" ADD CONSTRAINT "ScreenTimeSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScreenTimeDay" ADD CONSTRAINT "ScreenTimeDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
