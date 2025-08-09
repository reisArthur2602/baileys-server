-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "qrCode" TEXT,
    "webhookUrl" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
