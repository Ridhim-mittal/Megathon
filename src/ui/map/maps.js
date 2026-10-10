// The maps the story can play on, ready to draw: the village and the town of the first job.
import "./art.js";
import "./cityArt.js";
import { CITY } from "./city.js";
import { VILLAGE } from "./village.js";

export const MAPS = { village: VILLAGE, city: CITY };

// Which map a story mission plays on (default: the village).
const MISSION_MAPS = { job: "city" };
export const mapForMission = (missionId) => MAPS[MISSION_MAPS[missionId]] ?? VILLAGE;
