import { strict as assert } from "node:assert";
import { buildFallbackStoryboard } from "../src/lib/solution-storyboard";

const weak = buildFallbackStoryboard({
  stem: "请查看下方官方原题图。",
  solution: "官方答案 / Official answer: B",
  answer: "B",
  assetUrl: "/local-assets/example.png",
});
assert.equal(weak.quality, "answer-only");
assert.equal(weak.requiresGeneration, true);
assert.equal(weak.scenes[0].visual.type, "source-image");

const cube = buildFallbackStoryboard({
  stem: "一个正方体旋转后，哪个图形可能出现？",
  solution: "观察相邻面关系。旋转不会改变相邻关系，因此选择 C。",
  answer: "C",
  concept: "空间想象",
});
assert.equal(cube.quality, "heuristic");
assert.equal(cube.scenes[0].visual.type, "solid3d");

const fraction = buildFallbackStoryboard({
  stem: "分数 3/5 表示把整体平均分成5份，取其中3份。",
  solution: "把整体平均分成5份，再涂3份，所以是3/5。",
  answer: "A",
  concept: "分数",
});
assert.equal(fraction.scenes[0].visual.type, "fraction-bar");
console.log("SOLUTION_STORYBOARD=PASS");
