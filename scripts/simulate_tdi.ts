import DifficultyProgression from '../core/level-generation/DifficultyProgression';
import { PLAYER_PHYSICS } from '../core/level-generation/PhysicsPassability';

const RUN_TIME_SECONDS = 600; // 10 minutes
const TICK_RATE = 1; // 1 tick per second
let progression = new DifficultyProgression();

console.log('=== START TDI SIMULATION (10 minutes) ===\n');

let maxTDI = 0;
let avgTDI = 0;
let totalTDI = 0;
let alerts = 0;

for (let timePlayed = 0; timePlayed <= RUN_TIME_SECONDS; timePlayed += TICK_RATE) {
    // mock distance
    const currentSpeed = Math.min(
        PLAYER_PHYSICS.BASE_SPEED + Math.floor(timePlayed / 30) * PLAYER_PHYSICS.SPEED_GROWTH_PER_30S,
        PLAYER_PHYSICS.MAX_SPEED
    );
    const distance = timePlayed * currentSpeed;
    
    // Calculate normalized difficulty (similar to Progression logic)
    const normalizedDistance = Math.min(distance / 5000, 1);
    
    const params = {
        difficulty: normalizedDistance, // We pass base difficulty manually to let calc engine modify it
        distance,
        score: timePlayed * 10,
        combo: 1,
        averageSpeed: currentSpeed,
        obstaclesPassed: timePlayed,
        perfectActions: timePlayed,
        damageTaken: 0,
        timePlayed,
        levelCompletions: 0
    };
    
    const diffResult = progression.calculateDifficulty(params);
    
    // Simulate active threats linearly based on density
    // Assuming 5 is max threats in 60m sight range at density 1.0
    const activeThreats = Math.floor(diffResult.params.obstacleDensity * 5);
    
    const tdi = (activeThreats * diffResult.params.currentRunSpeed) / diffResult.params.reactionBudget;
    
    if (tdi > maxTDI) maxTDI = tdi;
    totalTDI += tdi;
    
    if (tdi > 35) {
        alerts++;
    }
    
    if (timePlayed % 60 === 0) { // Log every minute
        console.log(`Minute ${timePlayed / 60}:`);
        console.log(`- Speed: ${diffResult.params.currentRunSpeed.toFixed(2)} m/s`);
        console.log(`- Difficulty: ${diffResult.difficulty.toFixed(2)}`);
        console.log(`- Density (Base/Adjusted): ${diffResult.params.obstacleDensity.toFixed(2)}`);
        console.log(`- Max Active Threats in Sight: ${activeThreats}`);
        console.log(`- Reaction Budget: ${diffResult.params.reactionBudget}ms`);
        console.log(`- Projected TDI: ${tdi.toFixed(2)}\n`);
    }
}

avgTDI = totalTDI / RUN_TIME_SECONDS;

console.log('=== SIMULATION RESULTS ===');
console.log(`Average TDI: ${avgTDI.toFixed(2)} (Target Standard: 18-26)`);
console.log(`Max TDI reached: ${maxTDI.toFixed(2)}`);
console.log(`Frustration Alerts (TDI > 35): ${alerts}`);
console.log(alerts > 0 ? '⚠️ WARNING: Generators might cause frustration at peak levels.' : '✅ Perfect balance, no frustration spikes detected.');
