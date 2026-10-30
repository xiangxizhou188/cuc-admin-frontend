"use client";
import { useEffect, useState } from "react";
import {
  api,
  type ProductImportSummary,
  type ProductImportDetail,
} from "./api";
const statusLabel = {
  pending_review: "待审核",
  rejected: "已拒绝",
  draft_created: "已生成草稿",
};
export function ProductImportReview({
  token,
  onCreateDraft,
  onOpenProduct,
}: {
  token: string;
  onCreateDraft: (item: ProductImportDetail) => void;
  onOpenProduct: (item: ProductImportDetail) => void;
}) {
  const [items, setItems] = useState<ProductImportSummary[]>([]),
    [detail, setDetail] = useState<ProductImportDetail | null>(null),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    api
      .productImports(
        token,
        new URLSearchParams({
          page: String(page),
          q,
          ...(status ? { status } : {}),
        }),
      )
      .then((r) => {
        if (active) {
          setItems(r.items);
          setTotal(r.total);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [token, page, q, status, reload]);
  async function open(id: string) {
    setBusy(true);
    setError("");
    try {
      setDetail(await api.productImport(token, id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("import");
    if (id && /^[a-f0-9-]{36}$/.test(id)) void open(id);
  }, [token]);
  async function reject() {
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      await api.rejectProductImport(token, detail.importId);
      await open(detail.importId);
      setReload((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: ProductImportSummary) {
    if (!window.confirm(`确定删除这条商品导入记录？${item.productId ? "已生成的商品草稿会保留。" : ""}`)) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteProductImport(token, item.importId);
      if (detail?.importId === item.importId) setDetail(null);
      if (items.length === 1 && page > 1) setPage(page - 1);
      else setReload((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="imports-page">
      <p className="eyebrow">商品资料审核</p>
      <h2>商品导入</h2>
      <p>
        先审核来源资料，再生成 CUC 商品草稿。来源售价、描述和图片不会自动发布。
      </p>
      <div className="toolbar">
        <label>
          搜索
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="商品标题或来源网站"
          />
        </label>
        <label>
          状态
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部</option>
            {Object.entries(statusLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => setReload((v) => v + 1)} disabled={busy}>
          刷新
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">加载中…</p>}
      <div className="table-wrap">
        <table className="import-list-table">
          <thead>
            <tr>
              <th>商品</th>
              <th>来源</th>
              <th>来源价格</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.importId}>
                <td><div className="import-product-cell">
                  {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer"/> : <span className="import-image-empty" aria-hidden="true"/>}
                  <span title={item.title}>{item.title}</span>
                </div></td>
                <td>{item.sourceSite}</td>
                <td>{item.sourcePrice ?? "未采集"}</td>
                <td>{statusLabel[item.status]}{item.optimizationStatus==="succeeded"&&" · SEO 已优化"}{item.optimizationStatus==="optimization_failed"&&" · SEO 失败"}{item.optimizationStatus==="processing"&&" · SEO 处理中"}</td>
                <td><div className="import-row-actions">
                  <button disabled={busy} onClick={() => open(item.importId)}>审核</button>
                  <button className="danger-action" disabled={busy} onClick={() => void remove(item)}>删除</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && !busy && (
          <p>暂无导入记录。从插件点击 Import as Draft 后在这里查看。</p>
        )}
      </div>
      <div className="import-pagination">
        <button
          disabled={page <= 1 || busy}
          onClick={() => setPage((p) => p - 1)}
        >
          上一页
        </button>
        <span>
          第 {page} 页 · 共 {total} 条
        </span>
        <button
          disabled={page * 25 >= total || busy}
          onClick={() => setPage((p) => p + 1)}
        >
          下一页
        </button>
      </div>
      {detail && (
        <section className="import-review">
          <div className="import-review-head">
            <div><p className="eyebrow">PRODUCT REVIEW</p><h3>{detail.optimized?.productName??detail.title}</h3><p>核对来源资料和 AI 优化结果后，在商品草稿中填写并保存 CUC 商品信息。</p></div>
            <div><span className="import-review-status">{statusLabel[detail.status]}</span><button onClick={() => setDetail(null)}>关闭详情</button></div>
          </div>
          <div className="import-review-layout">
            <div className="import-review-main">
              {detail.optimizationStatus==="optimization_failed"&&<p role="alert">SEO 优化失败（{detail.optimizationErrorCode??"未知错误"}）。原始资料已保留，请在插件中明确点击 Retry；当前不能按优化成功创建商品草稿。</p>}
              {detail.optimizationStatus==="processing"&&<p role="status">SEO 优化处理中，请稍后刷新审核记录。</p>}
              {!!detail.duplicateSeoContent?.length&&<p role="alert">发现 {detail.duplicateSeoContent.length} 个商品的 SEO 内容或 URL 相同／相近，请审核后再创建草稿：{detail.duplicateSeoContent.map(item=>item.sku).join("、")}</p>}
              {detail.optimized&&<section className="import-review-card">
                <h4>SEO 优化结果 <small>已保存 · 点击“审核并填写商品草稿”可修改</small></h4>
                <div className="import-review-fields">
                  <label className="wide">商品名称 / H1 <input readOnly value={detail.optimized.productName}/></label>
                  <label className="wide">SEO 标题 <input readOnly value={detail.optimized.seoTitle}/><small>{detail.optimized.seoTitle.length} / 60 字符{(detail.optimized.seoTitle.length<50||detail.optimized.seoTitle.length>60)&&" · 建议 50–60 字符"}</small></label>
                  <label className="wide">Meta Description <textarea readOnly value={detail.optimized.metaDescription}/><small>{detail.optimized.metaDescription.length} / 160 字符{(detail.optimized.metaDescription.length<140||detail.optimized.metaDescription.length>160)&&" · 建议 140–160 字符"}</small></label>
                  <label className="wide">URL Slug <input readOnly value={detail.optimized.slug}/></label>
                  <label className="wide">简短描述 <textarea readOnly value={detail.optimized.shortDescription}/></label>
                  <label className="wide">完整描述 <textarea readOnly value={detail.optimized.fullDescription}/></label>
                  <label>主要关键词 <input readOnly value={detail.optimized.primaryKeyword}/></label>
                  <label>次要关键词 <input readOnly value={detail.optimized.secondaryKeywords.join(", ")}/></label>
                </div>
                <div className="import-seo-preview"><small>Google 搜索预览</small><strong>{detail.optimized.seoTitle}</strong><span>https://cucsupply.com/products/{detail.optimized.slug}</span><p>{detail.optimized.metaDescription}</p></div>
              </section>}
              <section className="import-review-card">
                <h4>原始来源资料 <small>只读 · AI 未覆盖</small></h4>
                <div className="import-review-fields">
                  <label className="wide">标题<input readOnly value={detail.reviewedSource.title ?? detail.title}/></label>
                  {([ ["品牌", "brand"], ["型号", "model"], ["MPN", "mpn"], ["SKU", "sku"], ["条码 / UPC", "upc"] ] as const).map(([label, key]) => (
                    <label key={key}>{label}<input readOnly value={detail.reviewedSource[key] ?? "未采集"}/></label>
                  ))}
                  <label className="wide">来源描述<textarea readOnly value={detail.reviewedSource.description ?? "未采集"}/></label>
                </div>
              </section>
              <section className="import-review-card">
                <h4>价格与商品组织</h4>
                <div className="import-review-fields">
                  <label>来源售价<input readOnly value={detail.reviewedSource.price ?? "未采集"}/></label>
                  <label>币种<input readOnly value={detail.reviewedSource.currency ?? "未采集"}/></label>
                  <label>CUC 售价<input readOnly value="在商品草稿中填写"/></label>
                  <label>分类<input readOnly value="在商品草稿中选择"/></label>
                  <label>库存数量<input readOnly value="在商品草稿中填写"/></label>
                  <label>配送类别<input readOnly value="在商品草稿中选择"/></label>
                </div>
              </section>
              <section className="import-review-card">
                <h4>媒体 <small>已选用 {detail.reviewedSource.images.filter(i => i.selected).length} 张参考图片</small></h4>
                <div className="import-reference-grid">
                  {detail.reviewedSource.images.filter(i => i.selected).map((i, n) => (
                    <a key={n} href={i.originalUrl ?? i.sourceUrl} target="_blank" rel="noreferrer">
                      <img src={i.originalUrl ?? i.sourceUrl} alt={`来源参考图 ${n + 1}`} loading="lazy" referrerPolicy="no-referrer"/>
                      <span>{i.aiGenerated ? "AI 处理图 · 待人工核对" : "来源参考图"}</span>
                    </a>
                  ))}
                </div>
              </section>
              <section className="import-review-card">
                <h4>来源可选规格</h4>
                {detail.reviewedSource.variants?.length ? <div className="import-review-fields">
                  {detail.reviewedSource.variants.map((variant, index) => <label key={`${variant.optionName}-${variant.optionValue}-${index}`}>
                    {variant.optionName} · {variant.optionValue}{variant.selected ? "（当前规格）" : ""}
                    <input readOnly value={variant.price && variant.currency ? `${variant.currency} ${variant.price} · 来源参考价` : "来源价格未采集"}/>
                  </label>)}
                </div> : <p>未采集可选规格</p>}
              </section>
              <section className="import-review-card">
                <h4>规格参数</h4>
                {Object.keys(detail.reviewedSource.specifications).length ? <div className="import-review-fields">
                  {Object.entries(detail.reviewedSource.specifications).map(([key, value]) => (
                    <label key={key}>{key}<input readOnly value={value}/></label>
                  ))}
                </div> : <p>未采集规格参数</p>}
              </section>
              {detail.reviewedSource.documents.length > 0 && <section className="import-review-card">
                <h4>参考文档</h4>
                {detail.reviewedSource.documents.map((d, n) => <p key={n}><a href={d.sourceUrl} target="_blank" rel="noreferrer">{d.title ?? "参考文档"}</a></p>)}
              </section>}
            </div>
            <aside className="import-review-side">
              <section className="import-review-card">
                <h4>来源信息</h4>
                <dl><div><dt>状态</dt><dd>{statusLabel[detail.status]}</dd></div><div><dt>来源网站</dt><dd>{detail.sourceSite}</dd></div><div><dt>来源商品 ID</dt><dd>{detail.sourceProductId ?? "未采集"}</dd></div><div><dt>采集时间</dt><dd>{new Date(detail.capturedAt).toLocaleString("zh-CN")}</dd></div><div><dt>导入记录 ID</dt><dd>{detail.importId}</dd></div></dl>
                <a href={detail.sourceUrl} target="_blank" rel="noreferrer">打开来源商品页 ↗</a>
              </section>
              <section className="import-review-card import-review-actions">
                <h4>审核操作</h4>
                {detail.status === "pending_review" && <><button className="primary" disabled={busy||detail.optimizationStatus==="processing"||detail.optimizationStatus==="optimization_failed"} onClick={() => onCreateDraft(detail)}>审核并填写商品草稿</button><button disabled={busy} onClick={reject}>拒绝本次导入</button></>}
                {detail.productId && <button onClick={() => onOpenProduct(detail)}>打开已生成的商品草稿</button>}
              </section>
            </aside>
          </div>
          <details className="import-review-evidence"><summary>原始来源与证据</summary><pre>{JSON.stringify(detail.source, null, 2)}</pre></details>
        </section>
      )}
    </section>
  );
}
