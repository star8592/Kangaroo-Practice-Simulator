import assert from "node:assert/strict";
import { TECH_BOOKS, TECH_TOPICS, getTechBook, filterTechBooks } from "../src/lib/tech-books";
assert.ok(TECH_BOOKS.length >= 8, "A meaningful original starter catalog is required");
assert.equal(new Set(TECH_BOOKS.map(book => book.slug)).size, TECH_BOOKS.length);
const topics = new Set(TECH_TOPICS.map(topic => topic.id));
const allowedLabs = new Set(["/skill-labs", "/skill-labs/agent-foundations", "/skill-labs/code-lab", "/skill-labs/sql-lab", "/skill-labs/webgpu-basics"]);
for (const book of TECH_BOOKS) {
  assert.match(book.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(topics.has(book.topic));
  assert.ok(book.title && book.author && book.reason && book.practice && book.introduction);
  assert.match(book.officialUrl, /^https:\/\//);
  if (book.officialDownload) {
    assert.match(book.officialDownload.url, /^https:\/\//);
    assert.equal(book.officialDownload.source, "作者官网");
    assert.equal(book.officialDownload.format, "PDF");
  }
  assert.ok(allowedLabs.has(book.lab.href), "No fake or planned lab link: " + book.slug);
  assert.ok(book.references.length > 0);
  for (const ref of book.references) assert.match(ref.url, /^https:\/\//);
  assert.equal(getTechBook(book.slug)?.title, book.title);
}
assert.equal(getTechBook("not-found"), undefined);
assert.ok(getTechBook("designing-data-intensive-applications")?.author.includes("Chris Riccomini"), "Use 2026 second-edition authors");
assert.ok(filterTechBooks("Rust", "").some(book => book.slug === "the-rust-programming-language"));
assert.ok(filterTechBooks("not-an-actual-book", "").length === 0);
assert.ok(filterTechBooks("AI 与机器学习", "").some(book => book.slug === "dive-into-deep-learning"));
assert.ok(filterTechBooks("3D 与游戏开发", "").some(book => book.slug === "game-programming-patterns"));
assert.ok(filterTechBooks("", "games").every(book => book.topic === "games"));
assert.equal(TECH_BOOKS.some(book => /hacker.news.*score|z.library/i.test(book.reason)), false);
console.log("TECH_BOOK_LIBRARY_CONTRACT=PASS; books=" + TECH_BOOKS.length);

assert.equal(TECH_BOOKS.filter(book => Boolean(book.officialDownload)).length, 1, "Only verified first-party PDF is marked downloadable");
assert.equal(getTechBook("dive-into-deep-learning")?.officialDownload?.url, "https://d2l.ai/d2l-en.pdf");
