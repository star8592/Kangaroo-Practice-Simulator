import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TECH_BOOKS, TECH_TOPICS, getTechBook } from "@/lib/tech-books";
import s from "../books.module.css";
type Params = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return TECH_BOOKS.map(book => ({ slug: book.slug }));
}
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const book = getTechBook((await params).slug);
  if (!book) return { title: "书籍不存在｜SOC THINK" };
  return {
    title: book.title + "：中文导读与实训｜SOC THINK",
    description: book.introduction + " 阅读重点、官方资料与关联实践。",
    alternates: { canonical: "/skill-labs/books/" + book.slug },
  };
}
export default async function TechBookDetailPage({ params }: Params) {
  const book = getTechBook((await params).slug);
  if (!book) notFound();
  const category = TECH_TOPICS.find(item => item.id === book.topic)?.label;
  const schema = {
    "@context": "https://schema.org", "@type": "Book", name: book.title,
    author: { "@type": "Person", name: book.author },
    url: book.officialUrl,
  };
  return <div className={s.shell}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <nav className={s.breadcrumb} aria-label="当前位置"><Link href="/skill-labs">技能实训</Link><span>/</span><Link href="/skill-labs/books">技术书库</Link><span>/</span><span>{book.title}</span></nav>
    <header className={s.detailHeader}>
      <span className={s.topic}>{category} · {book.level}</span>
      <h1>{book.title}</h1>
      <p className={s.author}>{book.author}</p>
      <p className={s.lead}>{book.introduction}</p>
      <a href={book.officialUrl} target="_blank" rel="noopener noreferrer" className={s.primaryLink}>访问作者或项目官网 ↗</a>
      <p className={s.access}>{book.access}。请遵守原站许可与购买条款。</p>
    </header>
    <div className={s.detailGrid}>
      <div className={s.mainColumn}>
        <section className={s.detailSection}>
          <h2>为什么推荐</h2><p>{book.reason}</p>
        </section>
        <section className={s.detailSection}>
          <h2>读完要能做什么</h2><p>{book.practice}</p>
          <p className={s.note}>这是建议练习任务，不代表该项目已在本站部署或自动评分。</p>
        </section>
        <section className={s.detailSection}>
          <h2>延伸技术资料</h2>
          <ul className={s.linkList}>{book.references.map(ref => <li key={ref.url}>
            <span>{ref.kind}</span><a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.title} ↗</a>
          </li>)}</ul>
        </section>
      </div>
      <aside className={s.labCard}>
        <span className={s.eyebrow}>NEXT STEP / 动手做</span>
        <h2>相关技能实训</h2>
        <h3>{book.lab.title}</h3><p>{book.lab.note}</p>
        <Link href={book.lab.href}>进入已开放入口 →</Link>
      </aside>
    </div>
    <p className={s.disclosure}>本站只提供自主撰写的中文阅读指引、第三方官方链接和自有实训入口，不提供第三方书籍的未授权复制品。书目为编辑精选，不代表作者、出版方或 Hacker News 官方背书。</p>
    <nav className={s.bottomNav}><Link href="/skill-labs/books">← 返回技术书库</Link><Link href="/skill-labs">浏览技能实训 →</Link></nav>
  </div>;
}
