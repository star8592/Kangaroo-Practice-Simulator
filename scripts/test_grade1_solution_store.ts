import bundle from "../data/verified-solutions/grade1-v1.json";
import { loadVerifiedSolution } from "../src/lib/solution-store";

const rows = (bundle as { solutions: Record<string, unknown> }).solutions;
const ids = Object.keys(rows);
if (ids.length !== 218) throw new Error(`expected 218 bundled grade-one solutions, got ${ids.length}`);
for (const id of ids) {
  const solution = loadVerifiedSolution(id);
  if (!solution) throw new Error(`${id}: store returned null`);
  if (solution.quality !== "verified" || solution.requiresGeneration) throw new Error(`${id}: not verified delivery`);
  if (solution.scenes.length < 2) throw new Error(`${id}: insufficient scenes`);
  for (const scene of solution.scenes) {
    if (!scene.narration.trim()) throw new Error(`${id}: blank narration`);
    if (scene.audioUrl?.startsWith("/generated-solutions/")) {
      throw new Error(`${id}: non-deployable runtime audio leaked: ${scene.audioUrl}`);
    }
  }
}
const preA = loadVerifiedSolution("au-amc-pre-a-s1-q01");
if (!preA?.scenes.every((scene) => scene.audioUrl?.startsWith("/grade1-narration/v1/"))) {
  throw new Error("Pre-A bundled narration was not attached");
}
console.log(`GRADE1_SOLUTION_STORE=PASS questions=${ids.length}`);
