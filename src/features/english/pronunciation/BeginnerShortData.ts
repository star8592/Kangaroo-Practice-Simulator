/**
 * R8: original SOC THINK phonics/foundation recordings from AccentLab's
 * pinned Kokoro af_heart voice. Not a native-human audio claim.
 * Approved audio evidence: star8592/AccentLab/frontend/src/data/foundationAudioManifest.json
 * Exact text is sent to the EXISTING Rust private-session scoring contract.
 */
export type BeginnerShortItem={
 id:string;text:string;translation:string;tip:string;
 audioUrl:string;audioSha256:string;voice:string;
};
export const BEGINNER_SHORT_ITEMS:ReadonlyArray<BeginnerShortItem> = [
 {id:"cat-sleeping-one",text:"The cat is sleeping.",translation:"小猫正在睡觉。",tip:"先听清楚 cat 和 sleeping，再把整句话连起来读。",
  audioUrl:"/english/pronunciation/app/audio/foundation-v36/f-07412159f1-fcfcba54f643.mp3",audioSha256:"fcfcba54f643194f352658996bf0c442fdbb1cd2715c1cf97272bf3e24a294a1",voice:"Kokoro af_heart"},
 {id:"cat-sleeping-many",text:"The cats are sleeping.",translation:"猫咪们正在睡觉。",tip:"注意 cats 和 are。先听两遍，再试着读完整句。",
  audioUrl:"/english/pronunciation/app/audio/foundation-v36/f-40713ce468-ae12c2fd921c.mp3",audioSha256:"ae12c2fd921c38717a933e6cf9343911515cba46b4e5b470a40024d1632df41d",voice:"Kokoro af_heart"},
 {id:"want-red-apple",text:"I want a red apple.",translation:"我想要一个红苹果。",tip:"分两小段：I want / a red apple。",
  audioUrl:"/english/pronunciation/app/audio/foundation-v36/f-e13c01f36c-16093d096823.mp3",audioSha256:"16093d0968230dba69e9c51f594c1c5fa1a3ea68961484057284257fe27b496a",voice:"Kokoro af_heart"},
 {id:"want-the-apple",text:"I want the red apple.",translation:"我想要那个红苹果。",tip:"先听 the，再把 red apple 连起来。",
  audioUrl:"/english/pronunciation/app/audio/foundation-v36/f-124c88ccc9-8a494762ae59.mp3",audioSha256:"8a494762ae5977f00499a91116f5d25f7c9fbe5e65fbeabaf52c882e9e188f1f",voice:"Kokoro af_heart"},
 {id:"find-it-can",text:"She can find it.",translation:"她能找到它。",tip:"先读 She can，再接 find it。",
  audioUrl:"/english/pronunciation/app/audio/foundation-v36/f-a11c776b9e-377b1f37c837.mp3",audioSha256:"377b1f37c837fccc7da79f6d5c694e433d551629725922ace3aadd53e79d72e9",voice:"Kokoro af_heart"},
 {id:"find-it-cannot",text:"She can't find it.",translation:"她找不到它。",tip:"比较 can 和 can't 的不同，听清后再模仿。",
  audioUrl:"/english/pronunciation/app/audio/foundation-v36/f-fd112865aa-96a9d5c3cb2d.mp3",audioSha256:"96a9d5c3cb2d6a3b78bb5b6b1b599889a22cb174ab6c6c724720f2cbaee2ae28",voice:"Kokoro af_heart"},
 {id:"read-this-can",text:"We can read this.",translation:"我们能读懂这个。",tip:"试着把 We can 和 read this 连起来。",
  audioUrl:"/english/pronunciation/app/audio/foundation-v36/f-583698d0c3-eae2faa12acf.mp3",audioSha256:"eae2faa12acf5fded675cd1e184bf8d29437a636f2aa1e9fd075dfe130838143",voice:"Kokoro af_heart"},
 {id:"read-this-cannot",text:"We can't read this.",translation:"我们读不懂这个。",tip:"先听 can’t，再把全句流畅读出来。",
  audioUrl:"/english/pronunciation/app/audio/foundation-v36/f-b9762dc12f-915db2db0571.mp3",audioSha256:"915db2db0571fbc98918e46fa5994a51a24dc91b013a5be0472fbf9d159deec7",voice:"Kokoro af_heart"},
 {id:"cant-swim",text:"I can't swim",translation:"我不会游泳。",tip:"先听 I can't，再读 swim。",
  audioUrl:"/english/pronunciation/app/audio/foundation-v36/f-5861d11ee5-3ddad4d7b717.mp3",audioSha256:"3ddad4d7b7178639c1311cbfaea4402eb35e1a1614dd01f8d3e97a4ee46c43db",voice:"Kokoro af_heart"},
 {id:"green-apples",text:"green apples",translation:"青苹果。",tip:"两个词先分别听，再连起来读。",
  audioUrl:"/english/pronunciation/app/audio/foundation-v36/f-3b772b1437-c64d8477834d.mp3",audioSha256:"c64d8477834d24549af472657347396a78cda9b4d8d683ecbc7290da60bfbc94",voice:"Kokoro af_heart"},
];
export const BEGINNER_SLOW_PREFIX="/english/pronunciation/next-lab/audio/beginner-slow-03";
