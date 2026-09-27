import assert from "node:assert/strict";
import { calendarDaysUntil, nextCompetitionEvent } from "../src/lib/competition-calendar";

assert.equal(calendarDaysUntil("2026-11-05", "2026-09-27"), 39);
assert.equal(nextCompetitionEvent({competitionId:"maa-amc", today:"2026-09-27"})?.id, "maa-amc-10-12-a-2026");
assert.equal(nextCompetitionEvent({competitionId:"maa-amc", stageId:"maa-amc8", today:"2026-09-27"})?.id, "maa-amc8-2027");
assert.equal(nextCompetitionEvent({competitionId:"maa-amc", stageId:"maa-amc10", today:"2026-11-06"})?.id, "maa-amc-10-12-b-2026");
assert.equal(nextCompetitionEvent({competitionId:"cemc", gradeBand:"7-8", today:"2026-09-27"})?.id, "cemc-gauss-2027-onsa");
assert.equal(nextCompetitionEvent({competitionId:"australian-amc", today:"2026-09-27"}), null);
console.log("competition calendar: PASS");
