/**
 * R7C guided question cards are curated prompts tied to approved, scored
 * reference sentences in the existing Rust catalogue. They do not imply
 * generative conversation or answer correctness evaluation.
 */
export type GuidedQuestion={question:string;translation:string;hint:string};
export const GUIDED_QUESTIONS:Readonly<Record<string,GuidedQuestion>>={
 "octopus-flexibility":{
  question:"How can an octopus fit into very small spaces?",
  translation:"章鱼怎么钻进很狭窄的地方？",
  hint:"想一想：章鱼的身体里有骨头吗？",
 },
 "octopus-remarkable-abilities":{
  question:"Does an octopus have only one special ability?",
  translation:"章鱼只有一种特殊本领吗？",
  hint:"提示：灵活性只是它的很多本领之一。",
 },
 "octopus-learn-from-experience":{
  question:"What can an octopus learn to do?",
  translation:"章鱼能够学习做什么？",
  hint:"提示：探索谜题、记住路线、积累经验。",
 },
 "bees-rich-patch":{
  question:"What happens when a bee finds many flowers?",
  translation:"蜜蜂发现很多花以后会怎样？",
  hint:"想想蜜蜂回到蜂巢后会做什么。",
 },
 "bees-short-dance":{
  question:"How does a honeybee help other bees find flowers?",
  translation:"蜜蜂怎样帮助其他蜜蜂找到花？",
  hint:"提示：它会在蜂巢里跳舞。",
 },
 "bees-direction-and-distance":{
  question:"What can a bee's dance tell the other bees?",
  translation:"蜜蜂跳的舞能告诉同伴什么？",
  hint:"提示：方向与距离。",
 },
 "trees-cooler-pavement":{
  question:"Where does the ground feel cooler on a hot day?",
  translation:"天气炎热时，哪里的地面更凉快？",
  hint:"想想大树下和没有遮阴的路面。",
 },
 "trees-leaves-and-water":{
  question:"How do leaves help cool the air?",
  translation:"树叶怎样帮助空气变凉？",
  hint:"提示：挡住一部分阳光，也能让水分带走热量。",
 },
 "trees-slow-rainwater":{
  question:"What do trees do to rainwater?",
  translation:"树木会怎样影响雨水？",
  hint:"提示：它们能减缓雨水落到地面的速度。",
 },
};
