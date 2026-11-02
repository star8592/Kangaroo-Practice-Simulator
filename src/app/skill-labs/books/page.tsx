import type { Metadata } from "next";
import Link from "next/link";
import { TECH_BOOKS, TECH_TOPICS, filterTechBooks } from "@/lib/tech-books";
import s from "./books.module.css";
export const metadata: Metadata = {
  title: "技术书库：编程、AI、数据库与游戏开发｜SOC THINK",
  description: "精选技术原书与作者官网，提供原创中文导读、官方文档、开源参考和可运行的 SOC THINK 技能实训入口。",
  alternates: { canonical: "/skill-labs/books" },
};
type Query = { q?: string | string[]; topic?: string | string[] };
export default async function TechBooksPage({ searchParams }: { searchParams: Promise<Query> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const topic = typeof params.topic === "string" ? params.topic : "";
  const currentTopic = TECH_TOPICS.some(item => item.id === topic) ? topic : "";
  const results = filterTechBooks(query, currentTopic);
  return <div className={s.shell}>
    <nav className={s.breadcrumb} aria-label="当前位置"><Link href="/skill-labs">技能实训</Link><span>/</span><span>技术书库</span></nav>
    <header className={s.hero}>
      <span className={s.eyebrow}>SOC THINK / TECH LIBRARY</span>
      <h1>技术书库</h1>
      <p>找一本真正值得读的书，再用官方文档和真实练习把技术学会。</p>
      <div className={s.heroLinks}><a href="#books">浏览书籍</a><Link href="/skill-labs">进入技能实训</Link></div>
    </header>
    <form action="/skill-labs/books" method="get" role="search" className={s.filters}>
      <label htmlFor="book-query">搜索书名、作者或技术主题</label>
      <div className={s.filterFields}>
        <input id="book-query" name="q" type="search" placeholder="例如 Rust、数据、游戏" defaultValue={query} maxLength={100}/>
        <select name="topic" aria-label="技术分类" defaultValue={currentTopic}>
          <option value="">全部领域</option>
          {TECH_TOPICS.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
        </select>
        <button type="submit">查找书籍</button>
      </div>
    </form>
    <div id="books" className={s.sectionHeading}>
      <h2>精选书籍 <span>{results.length} / {TECH_BOOKS.length}</span></h2>
      <p>人工核验的起步书目，不是 Hacker News 热度榜。</p>
    </div>
    {results.length === 0 ? <section className={s.empty}><p>没有匹配的书籍，可以换个关键词或重选领域。</p><Link href="/skill-labs/books">查看全部书籍</Link></section> :
    <div className={s.grid}>{results.map(book => <article className={s.bookCard} key={book.slug}>
      <span className={s.topic}>{TECH_TOPICS.find(item => item.id === book.topic)?.label}</span>
      <h3><Link href={"/skill-labs/books/" + book.slug}>{book.title}</Link></h3>
      <p className={s.author}>{book.author} · {book.level}</p>
      <p className={s.intro}>{book.introduction}</p>
      <div className={s.cardBottom}>
        <span>{book.access}</span>
        <Link href={"/skill-labs/books/" + book.slug}>查看导读与实训 →</Link>
      </div>
    </article>)}</div>}
    <section className={s.policy}>
      <h2>我们如何选书</h2>
      <p>优先核对作者、出版方、开放书籍站点与官方文档。所有推荐理由和实践建议由 SOC THINK 自行编写；第三方封面、书评、评论全文和下载文件均不在本页复制。外部免费阅读仅表示原站提供阅读，不代表可以商业转载。</p>
    </section>
  </div>;
}
