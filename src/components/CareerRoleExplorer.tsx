"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {CAREER_ROLE_GROUPS,CAREER_ROLES} from "@/lib/career-role-taxonomy";
import styles from "@/app/career/career-commerce.module.css";

export default function CareerRoleExplorer(){
  const [category,setCategory]=useState("all");
  const [search,setSearch]=useState("");
  const query=search.trim().toLocaleLowerCase("zh-CN").slice(0,60);
  const visible=useMemo(()=>{
    return CAREER_ROLE_GROUPS.map(group=>{
      if(category!=="all"&&group.id!==category)return null;
      const segments=group.segments.map(segment=>({
        name:segment.name,
        roles:segment.roles.filter(role=>!query||[role.title,role.segment,role.groupTitle]
          .join(" ").toLocaleLowerCase("zh-CN").includes(query)),
      })).filter(segment=>segment.roles.length>0);
      return segments.length?{...group,segments}:null;
    }).filter((g):g is NonNullable<typeof g>=>g!==null);
  },[category,query]);
  const count=visible.reduce((n,group)=>n+group.segments.reduce((a,s)=>a+s.roles.length,0),0);
  return <section id="career-directory" className={styles.catalogSection} aria-label="按行业分类搜索职业岗位">
    <div className={styles.sectionHeading}>
      <div>
        <span className={styles.overline}>EXPLORE CAREERS</span>
        <h2>按行业找岗位</h2>
        <p>先选择行业，再查看具体职位。{CAREER_ROLE_GROUPS.length} 个行业大类、{CAREER_ROLES.length} 个岗位名称，支持搜索。</p>
      </div>
      <div className={styles.roleCount} aria-label={"共"+CAREER_ROLES.length+"个岗位名称"}>
        <strong>{CAREER_ROLES.length}</strong><span>个岗位方向</span>
      </div>
    </div>
    <div className={styles.directoryControls}>
      <label className={styles.directorySearch}>
        <span>搜索具体岗位</span>
        <input type="search" value={search} onChange={v=>setSearch(v.target.value)}
          placeholder="例如：质量工程师、数据分析师、采购、销售…"
          aria-label="搜索具体岗位" maxLength={60}/>
      </label>
      {(query||category!=="all")&&<button className={styles.resetButton} type="button"
        onClick={()=>{setCategory("all");setSearch("");}}>清除筛选</button>}
    </div>
    <div className={styles.categoryTabs} role="group" aria-label="行业分类">
      <button type="button" className={category==="all"?styles.activeTab:styles.categoryTab}
        aria-pressed={category==="all"} onClick={()=>setCategory("all")}>
        全部岗位 <span>{CAREER_ROLES.length}</span>
      </button>
      {CAREER_ROLE_GROUPS.map(group=><button type="button" key={group.id}
        className={category===group.id?styles.activeTab:styles.categoryTab}
        aria-pressed={category===group.id} onClick={()=>setCategory(group.id)}>
        {group.title} <span>{group.roleCount}</span>
      </button>)}
    </div>
    <div className={styles.resultMeta} aria-live="polite">当前显示 <strong>{count}</strong> 个岗位名称
      <span>这是职业导航目录，不等于实时招聘数；有对应产品的岗位才会出现可用商品入口。</span>
    </div>
    {visible.length===0?<div className={styles.emptyRoles}>未找到匹配岗位，可换一个词或清除行业筛选。</div>:
      <div className={styles.roleGroups}>
        {visible.map(group=><article key={group.id} className={styles.roleGroup}>
          <div className={styles.roleGroupHeader}>
            <h3>{group.title}</h3>
            <span>{group.segments.reduce((n,s)=>n+s.roles.length,0)} 个职位</span>
          </div>
          {group.segments.map(segment=><div key={segment.name} className={styles.roleSegment}>
            <h4>{segment.name}</h4>
            <div className={styles.roleLinks}>
              {segment.roles.map(role=><Link key={role.id} href={"/career/roles/"+role.id}>
                {role.title}<span aria-hidden="true">›</span>
              </Link>)}
            </div>
          </div>)}
        </article>)}
      </div>}
    <p className={styles.directoryFoot}>
      本目录采用面向用户的行业导航分类，参考国家职业分类思路，但不是逐条照搬官方职业编码。
      部分岗位只有分类目录，尚无经核对的实际招聘或本站训练产品。
      <a href="https://www.ndrc.gov.cn/fggz/jyysr/jysrsbxf/202210/t20221031_1340470.html"
        target="_blank" rel="noopener noreferrer">了解国家职业分类体系</a>
    </p>
  </section>;
}
