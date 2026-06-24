CREATE TABLE "EmailOtpChallenge" (
    "email" TEXT NOT NULL PRIMARY KEY,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "lastSentAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
