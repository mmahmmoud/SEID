-- Attendance: daily clock-in / clock-out per employee
CREATE TABLE "Attendance" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "userId"      TEXT NOT NULL,
    "date"        TEXT NOT NULL,           -- YYYY-MM-DD
    "clockIn"     DATETIME,
    "clockOut"    DATETIME,
    "clockInLat"  REAL,
    "clockInLng"  REAL,
    "clockOutLat" REAL,
    "clockOutLng" REAL,
    "status"      TEXT NOT NULL DEFAULT 'PRESENT',  -- PRESENT | ABSENT | LATE | HALF_DAY
    "notes"       TEXT,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Attendance_userId_date_key" ON "Attendance"("userId", "date");
CREATE INDEX "Attendance_userId_idx" ON "Attendance"("userId");
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- FieldVisit: a site/client visit made during working hours
CREATE TABLE "FieldVisit" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "userId"      TEXT NOT NULL,
    "clientId"    TEXT,
    "clientName"  TEXT,                   -- fallback if client not in ERP
    "visitDate"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat"         REAL NOT NULL,
    "lng"         REAL NOT NULL,
    "address"     TEXT,                   -- reverse-geocoded or typed
    "purpose"     TEXT,                   -- reason for visit
    "notes"       TEXT,                   -- outcome / what was discussed
    "photoUrl"    TEXT,                   -- optional photo proof
    "duration"    INTEGER,                -- minutes on site
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldVisit_userId_fkey"   FOREIGN KEY ("userId")   REFERENCES "User"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FieldVisit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "FieldVisit_userId_idx"    ON "FieldVisit"("userId");
CREATE INDEX "FieldVisit_clientId_idx"  ON "FieldVisit"("clientId");
CREATE INDEX "FieldVisit_visitDate_idx" ON "FieldVisit"("visitDate");

-- GPSPing: periodic location pings while employee is clocked in
CREATE TABLE "GPSPing" (
    "id"           TEXT NOT NULL PRIMARY KEY,
    "userId"       TEXT NOT NULL,
    "attendanceId" TEXT,
    "lat"          REAL NOT NULL,
    "lng"          REAL NOT NULL,
    "accuracy"     REAL,
    "recordedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GPSPing_userId_fkey"       FOREIGN KEY ("userId")       REFERENCES "User"("id")       ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GPSPing_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "GPSPing_userId_idx"       ON "GPSPing"("userId");
CREATE INDEX "GPSPing_attendanceId_idx" ON "GPSPing"("attendanceId");
CREATE INDEX "GPSPing_recordedAt_idx"   ON "GPSPing"("recordedAt");
