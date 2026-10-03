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
  onOpenProduct: (id: string) => void;
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
  return (
    <section>
      <p className="eyebrow">PRODUCT IMPORTS</p>
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
        <table>
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
                <td>{item.title}</td>
                <td>{item.sourceSite}</td>
                <td>{item.sourcePrice ?? "未采集"}</td>
                <td>{statusLabel[item.status]}</td>
                <td>
                  <button onClick={() => open(item.importId)}>审核</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && !busy && (
          <p>暂无导入记录。从插件点击 Import as Draft 后在这里查看。</p>
        )}
      </div>
      <div className="toolbar">
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
        <section className="panel">
          <div className="toolbar">
            <h3>{detail.title}</h3>
            <button onClick={() => setDetail(null)}>关闭详情</button>
          </div>
          <p>
            {statusLabel[detail.status]} · {detail.importId}
          </p>
          <a href={detail.sourceUrl} target="_blank" rel="noreferrer">
            打开来源商品页
          </a>
          <p>采集时间：{detail.capturedAt}</p>
          <dl>
            {(
              [
                "brand",
                "model",
                "mpn",
                "sku",
                "upc",
                "price",
                "currency",
              ] as const
            ).map((k) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{detail.reviewedSource[k] ?? "未采集"}</dd>
              </div>
            ))}
          </dl>
          <h4>来源规格</h4>
          <dl>
            {Object.entries(detail.reviewedSource.specifications).map(
              ([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ),
            )}
          </dl>
          <h4>选中的参考图片</h4>
          <div className="import-reference-grid">
            {detail.reviewedSource.images
              .filter((i) => i.selected)
              .map((i, n) => (
                <a key={n} href={i.originalUrl ?? i.sourceUrl} target="_blank" rel="noreferrer">
                  <img
                    src={i.originalUrl ?? i.sourceUrl}
                    alt={`来源参考图 ${n + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <span>REFERENCE · 未发布</span>
                </a>
              ))}
          </div>
          <h4>参考 PDF / 文档</h4>
          {detail.reviewedSource.documents.map((d, n) => (
            <p key={n}>
              <a href={d.sourceUrl} target="_blank" rel="noreferrer">
                {d.title ?? "参考文档"}
              </a>
            </p>
          ))}
          <details>
            <summary>第三方来源描述（未发布）</summary>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {detail.reviewedSource.description ?? "未采集"}
            </p>
          </details>
          <details>
            <summary>原始来源与证据</summary>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {JSON.stringify(detail.source, null, 2)}
            </pre>
          </details>
          <div className="toolbar">
            {detail.status === "pending_review" && (
              <>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => onCreateDraft(detail)}
                >
                  审核并填写商品草稿
                </button>
                <button disabled={busy} onClick={reject}>
                  拒绝本次导入
                </button>
              </>
            )}
            {detail.productId && (
              <button onClick={() => onOpenProduct(detail.productId!)}>
                打开已生成的商品草稿
              </button>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
