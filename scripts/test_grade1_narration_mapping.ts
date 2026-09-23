import fs from "node:fs";
import path from "node:path";
import { loadVerifiedSolution } from "../src/lib/solution-store";

const root = process.cwd();
const dir = path.join(root, "private", "solutions");
const ids = fs.readdirSync(dir)
  .filter((name) => /^au-amc-pre-a-s[12]-q(?:0[1-9]|1\d|2[0-5])\.json$/.test(name))
  .map((name) => name.replace(/\.json$/, ""))
  .sort();

if (ids.length !== 50) throw new Error(`expected 50 grade-one solutions, got ${ids.length}`);

let scenes = 0;
for (const id of ids) {
  const storyboard = loadVerifiedSolution(id);
  if (!storyboard || storyboard.quality !== "verified") throw new Error(`missing verified storyboard: ${id}`);
  if (storyboard.scenes.length !== 3) throw new Error(`${id}: expected 3 scenes, got ${storyboard.scenes.length}`);
  storyboard.scenes.forEach((scene, index) => {
    const expected = `/grade1-narration/v1/${id}/scene-${String(index + 1).padStart(2, "0")}.mp3`;
    if (scene.audioUrl !== expected) throw new Error(`${id} scene ${index + 1}: ${scene.audioUrl} != ${expected}`);
    const file = path.join(root, "public", expected.slice(1));
    if (!fs.existsSync(file)) throw new Error(`missing bundled audio: ${file}`);
    scenes += 1;
  });
}

console.log(`GRADE1_NARRATION_MAPPING=PASS questions=${ids.length} scenes=${scenes}`);
