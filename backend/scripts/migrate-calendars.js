// backend/scripts/migrate-calendars.js
/**
 * Migration script: CalendarPrestator.slots → CalendarSlotEntry
 * Run with: node backend/scripts/migrate-calendars.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const CalendarPrestator = require("../models/CalendarPrestator");
const CalendarSlotEntry = require("../models/CalendarSlotEntry");

async function main() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/tort-app");
        console.log("✓ Connected to MongoDB");

        // Find all CalendarPrestator docs
        const prestators = await CalendarPrestator.find().lean();
        console.log(`Found ${prestators.length} prestator calendar docs`);

        let totalMigrated = 0;

        for (const prestator of prestators) {
            if (!Array.isArray(prestator.slots) || prestator.slots.length === 0) {
                continue;
            }

            console.log(`\n  Migrating prestator ${prestator.prestatorId}...`);

            // For each slot in the array, create a CalendarSlotEntry doc
            for (const slot of prestator.slots) {
                try {
                    const { date, time, capacity = 1, used = 0 } = slot;

                    if (!date || !time) {
                        console.warn(`    ⚠ Skipped slot with missing date/time:`, slot);
                        continue;
                    }

                    // Upsert CalendarSlotEntry (by unique index: prestatorId, date, time)
                    await CalendarSlotEntry.updateOne(
                        {
                            prestatorId: prestator.prestatorId,
                            date,
                            time,
                        },
                        {
                            $set: {
                                prestatorId: prestator.prestatorId,
                                date,
                                time,
                                capacity: Number(capacity) || 1,
                                used: Number(used) || 0,
                            },
                        },
                        { upsert: true }
                    );

                    totalMigrated++;
                } catch (err) {
                    console.error(`    ❌ Error migrating slot:`, err.message);
                }
            }
        }

        console.log(`\n✓ Migration complete: ${totalMigrated} slot entries created/updated`);

        // Optional: List sample CalendarSlotEntry docs
        const sample = await CalendarSlotEntry.find().limit(5).lean();
        console.log("\n  Sample CalendarSlotEntry docs:");
        sample.forEach((e) => {
            console.log(
                `    - ${e.prestatorId} | ${e.date} ${e.time} | capacity=${e.capacity}, used=${e.used}`
            );
        });

        // Optional: Keep or archive CalendarPrestator (your choice)
        console.log("\n⚠ CalendarPrestator documents still exist (for safety). Consider archiving after verification.");

    } catch (error) {
        console.error("❌ Migration failed:", error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("\n✓ Disconnected from MongoDB");
    }
}

main();
