"use client";
import { VariantProfitPreview,variantShippingCost,setVariantShippingCost } from "./variant-profit-preview";
import {CustomerValueOverview,CustomerPurchasePanels,customerDate} from "./customer-insights";
import { SalesTaxMonitor } from "./sales-tax-monitor";
import { SalesTaxManagement } from "./sales-tax-management";
import { OrderDetail } from "./order-detail";
import { OrderShipping } from "./order-shipping";
import "./orders-manager.css";
import { ReturnsManager } from "./returns-manager";
import {readProductDetails, productContent, specificationRecord, productDetailsKey} from "../shared/product-details";
import {ProductRelationsEditor} from "./product-relations-editor";
import {readRelatedProductIds,relatedProductsKey} from "../shared/product-relations";
import {ProductDetailsEditor} from "./product-details-editor";
import { ProductImportReview } from "./product-import-review";
import { ProductTranslationEditor, translationStatusMessage } from "./product-translation-editor";
import { useAdminList,ListControls,ListStatus,ListPagination,type AdminListState } from "./admin-list";
import { BannerEditor } from "./banner-editor";
import defaultHeroImageUrl from "../public/airnova-home-hero-v2.png?url";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowClockwise,
  ArrowCounterClockwise,
  CaretLeft,
  Truck,
  ArrowsDownUp,
  Bell,
  CaretRight,
  Check,
  ClockCounterClockwise,
  Export,
  GearSix,
  House,
  ImagesSquare,
  List,
  MagnifyingGlass,
  Package,
  Plus,
  Receipt,
  SignOut,
  Trash,
  Translate,
  TreeStructure,
  Trademark,
  Warehouse,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { API_BASE_URL, ApiAdminCustomer, ApiBrand, ApiCategory, ApiClientError, ApiCustomerDetail, ApiCustomerSegment, ApiCustomerTag, ApiDashboard, ApiMembershipCustomer, ApiMembershipTier, ApiOrder, ApiPageSlot, ApiProduct, ApiSettings, ApiUser, ApiWarehouse, api, request, importSourceImage } from "./api";

type Section = "tax-monitor" | "sales-tax" | "imports" | "overview" | "products" | "categories" | "brands" | "inventory" | "customers" | "membership" | "orders" | "returns" | "media" | "activity" | "settings";
type ProductStatus = "Published" | "Draft" | "Unpublished";
type Product = {
  id: string;
  importId?: string;
  importSyncError?: string;
  importMedia?: {id:string;index:number}[];
  sourceImages?: {sourceUrl:string;originalUrl?:string;selected:boolean;removed?:boolean;aiGenerated?:boolean}[];
  sourceDescription?: string;
  sourceImageAltTexts?: {sourceImageIndex:number;altText:string}[];
  sku: string;
  name: string;
  category: string;
  categoryId: string | null;
  subcategoryId: string | null;
  brand: string;
  price: number;
  status: ProductStatus;
  stock: Record<string, number>;
  api: ApiProduct | null;
  mediaIds: string[];
};
type Activity = { id: string; action: string; detail: string; time: string; tone: "green" | "blue" | "amber" };

const nav = [
  { id: "overview", label: "运营概览", icon: House },
  { id: "products", label: "商品管理", icon: Package },
  { id: "imports", label: "商品导入", icon: Export },
  { id: "categories", label: "分类管理", icon: TreeStructure },
  { id: "brands", label: "品牌管理", icon: Trademark },
  { id: "inventory", label: "库存管理", icon: Warehouse },
  { id: "customers", label: "客户管理", icon: UsersThree },
  { id: "membership", label: "会员与积分奖励", icon: UsersThree },
  { id: "orders", label: "订单管理", icon: Receipt },
  { id: "returns", label: "退货与退款", icon: Package },
  { id: "media", label: "首页内容", icon: ImagesSquare },
  { id: "activity", label: "操作日志", icon: ClockCounterClockwise },
  { id: "tax-monitor", label: "全美税务监控", icon: GearSix },
  { id: "sales-tax", label: "销售税管理", icon: GearSix },
  { id: "settings", label: "系统设置", icon: GearSix },
] satisfies { id: Section; label: string; icon: typeof House }[];

const statusLabel: Record<"All" | ProductStatus, string> = { All: "全部", Published: "已上架", Draft: "草稿", Unpublished: "已下架" };
const roleLabel: Record<ApiUser["role"], string> = { super_admin: "超级管理员", catalog_manager: "商品管理员", inventory_manager: "库存管理员", content_editor: "内容编辑" };
const auditActionLabel: Record<string, string> = {
  "system.bootstrapped": "系统初始化",
  "auth.login": "管理员登录",
  "auth.logout": "管理员退出",
  "product.created": "创建商品",
  "product.updated": "更新商品",
  "product.status_changed": "修改商品状态",
  "category.created": "创建分类",
  "category.updated": "更新分类",
  "category.deleted": "删除分类",
  "brand.created": "创建品牌",
  "brand.updated": "更新品牌",
  "brand.deleted": "删除品牌",
  "inventory.adjusted": "调整库存",
  "warehouse.created": "创建仓库",
  "warehouse.updated": "更新仓库",
  "warehouse.deleted": "删除仓库",
  "media.uploaded": "上传媒体",
  "media.updated": "更新媒体",
  "media.deleted": "删除媒体",
  "page_slot.updated": "更新页面内容",
};
const localizeAuditSummary = (summary: string): string => summary
  .replace(" signed in", " 已登录")
  .replace(" signed out", " 已退出")
  .replace(/^Created category /, "创建分类：")
  .replace(/^Updated category /, "更新分类：")
  .replace(/^Deleted category /, "删除分类：")
  .replace(/^Created brand /, "创建品牌：")
  .replace(/^Updated brand /, "更新品牌：")
  .replace(/^Deleted brand /, "删除品牌：")
  .replace(/^Created /, "创建：")
  .replace(/^Updated /, "更新：")
  .replace(/^Uploaded /, "上传：")
  .replace(/^Deleted media asset$/, "已删除媒体素材")
  .replace(/^Product status changed to published$/, "商品已上架")
  .replace(/^Product status changed to unpublished$/, "商品已下架")
  .replace(/^Product status changed to draft$/, "商品状态已改为草稿");

const statusFromApi = (status: ApiProduct["status"]): ProductStatus =>
  status === "published" ? "Published" : status === "draft" ? "Draft" : "Unpublished";
const statusToApi = (status: ProductStatus): ApiProduct["status"] => status.toLowerCase() as ApiProduct["status"];
const productPayload = (product: Product): Omit<ApiProduct, "id" | "primaryMediaId" | "publishedAt" | "createdAt" | "updatedAt" | "importId"> => ({
  sku: product.api?.variants?.[0]?.sku || product.sku,
  name: product.name,
  slug: product.api?.slug || `${product.name}-${product.api?.variants?.[0]?.sku || product.sku}`.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, ""),
  brand: product.brand,
  category: product.category,
  categoryId: product.categoryId,
  subcategoryId: product.subcategoryId,
  productType: product.api?.productType ?? "OEM",
  status: statusToApi(product.status),
  priceCents: Math.round(product.price * 100),
  compareAtPriceCents: product.api?.compareAtPriceCents ?? null,
  costCents: product.api?.costCents ?? null,
  description: product.api?.description ?? "",
  specifications: product.api?.specifications ?? {},
  compatibility: product.api?.compatibility ?? [],
  downloads: product.api?.downloads ?? [],
  mediaIds: product.mediaIds,
  publishingChannels:product.api?.publishingChannels??["online_store"],collections:product.api?.collections??[],tags:product.api?.tags??[],themeTemplate:product.api?.themeTemplate??"default",
  inventoryTracked:product.api?.inventoryTracked??true,continueSelling:product.api?.continueSelling??false,barcode:product.api?.barcode??"",isPhysical:product.api?.isPhysical??true,returnRestriction:product.api?.returnRestriction??"",shippingClass:product.api?.shippingClass??"parcel",stripeTaxCode:product.api?.stripeTaxCode??"txcd_99999999",
  weightValue:product.api?.weightValue??0,weightUnit:product.api?.weightUnit??"lb",packageName:product.api?.packageName??"Store default",countryOfOrigin:product.api?.countryOfOrigin??"",hsCode:product.api?.hsCode??"",
  seoTitle:product.api?.seoTitle??"",seoDescription:product.api?.seoDescription??"",productOptions:product.api?.productOptions??[],metafields:product.api?.metafields??{},variants:product.api?.variants??[],
});

export function AdminConsole({ token, user, onLogout }: { token: string; user: ApiUser; onLogout: () => void | Promise<void> }) {
  const [taxAlertCount,setTaxAlertCount]=useState(0);
  useEffect(()=>{if(user.role!=="super_admin")return;let active=true;const load=()=>request<unknown[]>("/v1/admin/sales-tax/notifications",{},token).then(rows=>{if(active)setTaxAlertCount(rows.length)}).catch(()=>{});void load();const timer=setInterval(()=>void load(),60000);return()=>{active=false;clearInterval(timer)}},[token,user.role]);
  const [section, setSection] = useState<Section>(()=>{const requested=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("section"):null;return nav.some(item=>item.id===requested)?requested as Section:"overview"});
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ProductStatus>("All");
  const [selected, setSelected] = useState<string[]>([]);
  const [importReload,setImportReload]=useState(0);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjusting, setAdjusting] = useState<{ product: Product; warehouse: ApiWarehouse } | null>(null);
  const [warehouses, setWarehouses] = useState<ApiWarehouse[]>([]);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [pageSlots, setPageSlots] = useState<ApiPageSlot[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [mediaEnabled, setMediaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError,setLoadError]=useState("");
  const [membershipTiers,setMembershipTiers]=useState<ApiMembershipTier[]>([]);

  const [dashboard,setDashboard]=useState<ApiDashboard | null>(null);
  const pendingOrderCount = Object.values(dashboard?.operations?.orderCounts ?? {}).reduce((sum, count) => sum + count, 0);
  const ordersList=useAdminList<ApiOrder>(token,"/v1/admin/orders",section==="orders");
  useEffect(()=>{if(new URLSearchParams(window.location.search).get("section")==="orders"){const q=new URLSearchParams(window.location.search).get("q");if(q)ordersList.setSearch(q.slice(0,120))}},[]);
  const customersList=useAdminList<ApiAdminCustomer>(token,"/v1/admin/customers",section==="customers");
  const rewardsList=useAdminList<ApiMembershipCustomer>(token,"/v1/admin/membership/customers",section==="membership");
  const auditList=useAdminList<import("./api").ApiAudit>(token,"/v1/audit-logs",section==="activity");
  const productList=useAdminList<ApiProduct>(token,"/v1/products",section==="products"||section==="inventory"||section==="overview");
  const [settings,setSettings]=useState<ApiSettings|null>(null);

  const [customerTags,setCustomerTags]=useState<ApiCustomerTag[]>([]);
  const [customerSegments,setCustomerSegments]=useState<ApiCustomerSegment[]>([]);

  const refresh = useCallback(async () => {
    const [apiCategories,apiBrands,apiWarehouses,apiDashboard,apiPageSlots,audit,health,tierData,settingsData,tagData,segmentData] = await Promise.all([
      api.categories(token),
      api.brands(token),
      api.warehouses(token),
      api.dashboard(token),
      api.pageSlots(token),
      user.role === "super_admin" ? api.auditLogs(token) : Promise.resolve({items:[]}),
      api.health(),
      user.role === "super_admin" ? api.membershipTiers(token) : Promise.resolve([]),
      user.role === "super_admin" ? api.settings(token) : Promise.resolve(null),
      user.role === "super_admin"||user.role==="catalog_manager"?api.customerTags(token):Promise.resolve([]),
      user.role === "super_admin"||user.role==="catalog_manager"?api.customerSegments(token):Promise.resolve([]),
    ]);
    setCategories(apiCategories);
    setBrands(apiBrands);
    setWarehouses(apiWarehouses);
    setDashboard(apiDashboard);
    setPageSlots(apiPageSlots);
    setActivities(audit.items.map((item) => ({
      id: item.id,
      action: auditActionLabel[item.action] ?? item.action,
      detail: localizeAuditSummary(item.summary),
      time: new Date(item.created_at).toLocaleString("zh-CN"),
      tone: item.action.includes("created") || item.action.includes("login") ? "green" : item.action.includes("media") ? "amber" : "blue",
    })));
    setMediaEnabled(health.mediaStorage === "available");
    setMembershipTiers(tierData);
    rewardsList.reload();ordersList.reload();customersList.reload();auditList.reload();productList.reload();
    setSettings(settingsData);
    setCustomerTags(tagData);setCustomerSegments(segmentData);
  }, [token, user.role]);

  useEffect(()=>{setSelected([]);setProducts(productList.data?.items.map(product=>({id:product.id,importId:product.importId??undefined,sku:product.sku,name:product.name,category:product.category,categoryId:product.categoryId,subcategoryId:product.subcategoryId,brand:product.brand,price:product.priceCents/100,status:statusFromApi(product.status),stock:product.stock??{},api:product,mediaIds:product.media?.map(item=>item.id??item.media_id).filter((id):id is string=>Boolean(id))??(product.primaryMediaId?[product.primaryMediaId]:[])}))??[])},[productList.data]);
  useEffect(()=>{productList.setSearch(query)},[query]);
  useEffect(()=>{productList.change("status",statusFilter==="All"?"":statusToApi(statusFilter))},[statusFilter]);
  const refreshCategories = useCallback(async () => {
    setCategories(await api.categories(token));
  }, [token]);

  const refreshBrands = useCallback(async () => {
    setBrands(await api.brands(token));
  }, [token]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try { await refresh(); }
      catch {if(active)setLoadError("无法加载运营数据，请重试。")}
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [refresh]);

  const title = nav.find((item) => item.id === section)?.label ?? "运营概览";
  const filtered=products;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const openProduct = async (id:string) => {
    try {
      let p=await api.product(token,id);
      let imageError="";
      let importMedia:{id:string;index:number}[]=[];
      if(p.importId){
        try { const synced=await api.syncProductImportImages(token,p.importId);importMedia=synced.items;imageError=synced.failures.length?`${synced.failures.length} 张导入图片未能保存到媒体，请稍后重试。`:""; }
        catch(error) { imageError=error instanceof Error?error.message:"导入图片同步失败，请重试。"; }
        p=await api.product(token,id);
      }
      setEditing({id:p.id,importId:p.importId??undefined,importMedia,importSyncError:imageError,sku:p.sku,name:p.name,category:p.category,categoryId:p.categoryId,subcategoryId:p.subcategoryId,brand:p.brand,price:p.priceCents/100,status:statusFromApi(p.status),stock:p.stock??{},api:p,mediaIds:p.media?.map(item=>item.id??item.media_id).filter((mediaId):mediaId is string=>Boolean(mediaId))??(p.primaryMediaId?[p.primaryMediaId]:[])});
    } catch(error) { notify(error instanceof Error?error.message:"无法读取商品图片，请重试。"); }
  };

  const changeStatus = async (ids: string[], status: ProductStatus) => {
    try {
      await Promise.all(ids.map((id) => api.changeProductStatus(token, id, statusToApi(status))));
      setProducts((current) => current.map((product) => ids.includes(product.id) ? { ...product, status, api: product.api ? { ...product.api, status: statusToApi(status) } : null } : product));
      setSelected([]);
      notify(`已更新 ${ids.length} 个商品`);
      await refresh();
    } catch (error) { notify(error instanceof ApiClientError ? error.message : "无法更新商品状态。" ); }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`确定删除商品「${product.name}」吗？删除后将从商品目录移除。`)) return;
    try {
      await api.changeProductStatus(token, product.id, "archived");
      setProducts(current => current.filter(item => item.id !== product.id));
      setSelected(current => current.filter(id => id !== product.id));
      notify("商品已删除");
      await refresh();
    } catch (error) { notify(error instanceof ApiClientError ? error.message : "删除商品失败，请重试。"); }
  };

  const chooseSection = (id: Section) => {
    const url=new URL(window.location.href);url.searchParams.set("section",id);if(id!=="customers")url.searchParams.delete("customer");if(id!=="orders")url.searchParams.delete("q");window.history.replaceState(null,"",url);
    setSection(id);
    setMobileNav(false);
  };
  const startNewProduct = () => {
    const first=categories.find(c=>!c.parentId&&c.isActive);
    const sub=categories.find(c=>c.parentId===first?.id&&c.isActive);
    setEditing({ id:"", sku:"", name:"", category:first?.name??"", categoryId:first?.id??null, subcategoryId:sub?.id??null, brand:"", price:0, status:"Draft", stock:{}, api:null, mediaIds:[] });
    setSection("products");
  };


  return (
    <div className="admin-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><img src="/cuc-supply-logo.webp" alt="CUC Supply" /></div>
        </div>
        <button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="关闭导航"><X aria-hidden="true" /></button>
        <p className="nav-label">工作台</p>
        <nav>
          {nav.slice(0, 7).map((item) => {
            const NavIcon = item.icon;
            return (
            <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => chooseSection(item.id)}>
              <span className="nav-icon"><NavIcon weight={section === item.id ? "fill" : "regular"} /></span>{item.label}
              {item.id === "inventory" && (dashboard?.inventory.lowStockItems ?? 0) > 0 && <em>{dashboard?.inventory.lowStockItems}</em>}
            </button>
          )})}
        </nav>
        <p className="nav-label nav-label-second">系统</p>
        <nav>
          {nav.slice(7).filter(item=>!["sales-tax","tax-monitor"].includes(item.id)||user.role==="super_admin").map((item) => {
            const NavIcon = item.icon;
            return (
            <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => chooseSection(item.id)}>
              <span className="nav-icon"><NavIcon weight={section === item.id ? "fill" : "regular"} /></span>{item.label}{item.id==="sales-tax"&&taxAlertCount>0&&<em>{taxAlertCount}</em>}
              {item.id === "orders" && pendingOrderCount > 0 && <em className="pending-order-badge" aria-label={`${pendingOrderCount} 笔待处理订单`} title={`${pendingOrderCount} 笔待处理订单`}>{pendingOrderCount > 99 ? "99+" : pendingOrderCount}</em>}
            </button>
          )})}
        </nav>
        <div className="prototype-note"><span>在线</span><p>Worker API 已连接<br />D1 实时数据</p></div>
        <div className="user-card">
          <div className="avatar">{user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
          <div><strong>{user.name}</strong><span>{roleLabel[user.role]}</span></div>
          <button onClick={() => void onLogout()} aria-label="退出登录" title="退出登录"><SignOut aria-hidden="true" /></button>
        </div>
      </aside>
      {mobileNav && <button className="sidebar-scrim" onClick={() => setMobileNav(false)} aria-label="关闭菜单" />}

      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="打开导航"><List aria-hidden="true" /></button>
          <div><p>CUC Supply 暖通供应</p><h1>{title}</h1></div>
          <div className="top-actions">
            {section!=="orders"&&section!=="customers"&&<label className="global-search"><span><MagnifyingGlass aria-hidden="true" /></span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索商品、SKU…" /></label>}
            <button className="icon-button" aria-label="通知" title="查看运营待办" onClick={() => { if(taxAlertCount>0){chooseSection("sales-tax");return;}setSection("overview"); notify(`当前有 ${pendingOrderCount} 笔待处理订单，${dashboard?.inventory.lowStockItems ?? 0} 条低库存提醒，${dashboard?.catalog.incompleteProducts ?? 0} 个商品翻译待完善`); }}><Bell aria-hidden="true" />{(taxAlertCount>0||pendingOrderCount>0||(dashboard?.inventory.lowStockItems ?? 0) + (dashboard?.catalog.incompleteProducts ?? 0) > 0) && <i />}</button>
            {section==="orders"?<button className="primary button-with-icon" disabled={ordersList.loading} onClick={ordersList.reload}><ArrowClockwise aria-hidden="true"/>刷新订单</button>:section!=="customers"?<button className="primary button-with-icon" onClick={startNewProduct}><Plus aria-hidden="true" />新增商品</button>:null}
          </div>
        </header>

        <div className="content">{loadError&&<div role="alert">{loadError}<button onClick={()=>{setLoading(true);setLoadError("");void refresh().catch(()=>setLoadError("无法加载运营数据，请重试。")).finally(()=>setLoading(false))}}>重试</button></div>}
          {section === "overview" && <Overview dashboard={dashboard} onNavigate={chooseSection} onOrder={orderNumber=>{ordersList.change("status","");ordersList.change("from","");ordersList.change("to","");ordersList.setSearch(orderNumber);chooseSection("orders");}} />}
          {section === "imports" && <ProductImportReview key={importReload} token={token} onCreateDraft={item=>{const s=item.reviewedSource,o=item.optimized;const sourceVariants=s.variants??[];const optionNames=[...new Set(sourceVariants.map(v=>v.optionName))];const optionName=optionNames.length===1?optionNames[0]:null;setEditing({id:"",importId:item.importId,sourceImages:s.images,sourceDescription:s.description??"",sourceImageAltTexts:o?.imageAltTexts,sku:s.sku??"",name:o?.productName??s.title??"",category:"",categoryId:null,subcategoryId:null,brand:brands.find(b=>b.name===s.brand)?.name??"",price:0,status:"Draft",stock:{},api:{description:o?.fullDescription??s.description??"",specifications:s.specifications,seoTitle:o?.seoTitle??"",seoDescription:o?.metaDescription??"",slug:o?.slug??"",metafields:o?{short_description:o.shortDescription,primary_keyword:o.primaryKeyword,secondary_keywords:o.secondaryKeywords.join(", ")}:{},productOptions:optionName?[{name:optionName,values:sourceVariants.map(v=>v.optionValue)}]:[],variants:optionName?sourceVariants.map((v,index)=>({title:v.optionValue,sku:"",barcode:"",optionValues:{[optionName]:v.optionValue},priceCents:0,compareAtPriceCents:null,costCents:null,weightValue:0,weightUnit:"lb",mediaId:null,isActive:true,sortOrder:index,stock:{}})):[]} as unknown as ApiProduct,mediaIds:[]})}} onOpenProduct={item=>{void openProduct(item.productId!)}}/>}
          {section === "products" && <><Products list={productList} products={filtered} allProducts={products} query={productList.search} setQuery={productList.setSearch} filter={statusFilter} setFilter={setStatusFilter} selected={selected} setSelected={setSelected} onEdit={product=>{void openProduct(product.id)}} onStatus={changeStatus} onDelete={deleteProduct} /></>}
          {section === "categories" && <CategoryManager categories={categories} onUploadImage={async (file) => {
            const uploaded = await api.uploadMedia(token, file, "page", "Category image");
            return `${API_BASE_URL}/v1/media/${uploaded.id}/content`;
          }} onSave={async (category) => {
            const timestamp = new Date().toISOString();
            if(category.id) {
              await api.updateCategory(token, category.id, category);
              setCategories(current=>current.map(item=>item.id===category.id?{...item,...category,updatedAt:timestamp}:item));
              notify("分类已更新");
            } else {
              const created=await api.createCategory(token, category);
              setCategories(current=>[...current,{...category,id:created.id,createdAt:timestamp,updatedAt:timestamp}]);
              notify("分类已创建");
            }
            void refreshCategories().catch(()=>{});
          }} onDelete={async (category) => {
            await api.deleteCategory(token, category.id);
            setCategories(current=>current.filter(item=>item.id!==category.id));
            notify("分类已删除");
            void refreshCategories().catch(()=>{});
          }} />}
          {section === "brands" && <BrandManager brands={brands} onSave={async (brand) => {
            const timestamp = new Date().toISOString();
            if (brand.id) {
              await api.updateBrand(token, brand.id, brand);
              setBrands(current => current.map(item => item.id === brand.id ? { ...item, ...brand, updatedAt: timestamp } : item));
              notify("品牌已更新");
            } else {
              const created = await api.createBrand(token, brand);
              setBrands(current => [...current, { ...brand, id: created.id, createdAt: timestamp, updatedAt: timestamp }]);
              notify("品牌已创建");
            }
            void refreshBrands().catch(() => {});
          }} onDelete={async (brand) => {
            await api.deleteBrand(token, brand.id);
            setBrands(current => current.filter(item => item.id !== brand.id));
            notify("品牌已删除");
            void refreshBrands().catch(() => {});
          }} />}
          {section === "inventory" && <><Inventory list={productList} products={products} warehouses={warehouses} setAdjusting={setAdjusting} onEditProduct={openProduct} onSaveWarehouse={async warehouse => { if (warehouse.id) await api.updateWarehouse(token, warehouse.id, warehouse); else await api.createWarehouse(token, warehouse); await refresh(); notify(warehouse.id ? "仓库已更新" : "仓库已创建"); }} onDeleteWarehouse={async warehouse => { await api.deleteWarehouse(token, warehouse.id); await refresh(); notify("仓库已删除"); }} /></>}
          {section === "membership" && <MembershipManager tiers={membershipTiers} list={rewardsList} onSaveTier={async(tier)=>{await api.updateMembershipTier(token,tier.id,tier);await refresh();notify("会员等级规则已更新")}} onAdjust={async(customerId,amountCents,reason)=>{await api.adjustCashback(token,customerId,{amountCents,reason});await refresh();notify("积分奖励余额已调整")}} onOrder={async(customerId,orderNumber,eligibleSubtotalCents)=>{await api.recordCompletedOrder(token,customerId,{orderNumber,eligibleSubtotalCents});await refresh();notify("完成订单已记录，会员等级与积分奖励已更新")}} />}
          {section === "tax-monitor" && user.role==="super_admin" && <SalesTaxMonitor token={token} onReview={()=>chooseSection("sales-tax")}/>}
          {section === "sales-tax" && user.role==="super_admin" && <SalesTaxManagement token={token}/>}
          {section === "returns" && (user.role==="super_admin"?<ReturnsManager token={token}/>:<p>退货审核及退款仅限授权管理员。</p>)}
          {section === "orders" && <OrdersManager token={token} list={ordersList} canRefund={user.role==="super_admin"} onRefund={async(checkoutId,body)=>{const result=await api.refundOrder(token,checkoutId,body);await refresh();return result}} onStatus={async(id,status)=>{await api.updateOrderStatus(token,id,status);await refresh();notify("订单状态已更新")}}/>}
          {section === "customers" && <CustomersManager onViewOrders={query=>{ordersList.setSearch(query);chooseSection("orders");const url=new URL(window.location.href);url.searchParams.set("q",query);window.history.replaceState(null,"",url)}} list={customersList} tags={customerTags} segments={customerSegments} onOpen={id=>api.customer(token,id)} onSave={async(customer)=>{await api.updateCustomer(token,customer.id,{...customer,tagIds:customer.tags.map(tag=>tag.id)});await refresh();notify("客户资料已更新")}} onNote={async(id,content)=>{await api.addCustomerNote(token,id,content);notify("内部备注已发布")}} onCreateTag={async name=>{await api.createCustomerTag(token,{name,color:"blue"});await refresh();notify("客户标签已创建")}}/>}
          {loading && <div className="data-loading">正在加载运营数据…</div>}
          {section === "media" && <HomepageContent pageSlots={pageSlots} notify={notify} mediaEnabled={mediaEnabled} onSaveHero={async (locale, content) => {
            await api.updatePageSlot(token, { pageKey:"home", slotKey:"hero_copy", locale, heading:content.title, body:JSON.stringify(content), linkUrl:"/products", mediaId:null });
            setPageSlots(await api.pageSlots(token));
            notify("首页主视觉文案已保存");
          }} onUploadHero={async (file) => {
            const uploaded=await api.uploadMedia(token,file,"page",file.name);
            await api.updatePageSlot(token,{pageKey:"home",slotKey:"hero_image",locale:"en",heading:"Homepage hero image",body:"",linkUrl:"",mediaId:uploaded.id});
            await refresh();
            notify("首页主视觉图片已更新");
          }} />}
          {section === "media" && <BannerEditor key={pageSlots.find(item=>item.slot_key==="side_banner"&&item.locale==="en")?.body??"empty"} token={token} slots={pageSlots} onSaved={async()=>setPageSlots(await api.pageSlots(token))}/>}
          {section === "activity" && <ActivityLog list={auditList} />}
          {section === "settings" && <Settings key={JSON.stringify(settings)} settings={settings} onSave={async input=>{setSettings(await api.updateSettings(token,input));notify("设置已保存")}} />}
        </div>
      </main>

      {editing && <ProductDrawer key={editing.id||"new"} token={token} product={editing} categories={categories} brands={brands} warehouses={warehouses} onClose={() => setEditing(null)} onManageInventory={() => { setEditing(null); setSection("inventory"); }} onSave={async (product, media, initialInventory, imageAlts) => {
        const exists = Boolean(product.id);
        try {
          const mediaIds = await Promise.all(media.map(async (item,index) => typeof item === "string" ? item : (await api.uploadMedia(token, item, "product", imageAlts[index]||product.name)).id));
          const productWithImages = { ...product, mediaIds };
          const result=exists ? await api.updateProduct(token, product.id, productPayload(productWithImages)) : await api.createProduct(token, { ...productPayload(productWithImages), initialInventory, ...(product.importId?{importId:product.importId,status:"draft"}:{}) });
          let imageWarning="";
          if(!exists&&product.importId){try{const synced=await api.syncProductImportImages(token,product.importId);if(synced.failures.length)imageWarning=`，${synced.failures.length} 张参考图片未保存`;}catch{imageWarning="，参考图片同步失败，可在商品编辑页重试";}}
          notify(`${exists ? "商品已保存" : "商品草稿已创建"} · ${translationStatusMessage(result.translationStatus)}${imageWarning}`);
          setEditing(null);
          if(product.importId)setImportReload(value=>value+1);
          await refresh();
        } catch (error) { throw new Error(error instanceof ApiClientError ? error.message : "无法保存商品，请重试。"); }
      }} />}
      {adjusting && <InventoryModal data={adjusting} onClose={() => setAdjusting(null)} onSave={async (quantity, reason) => {
        const previous = adjusting.product.stock[adjusting.warehouse.id] ?? 0;
        try {
          await api.adjustInventory(token, {
            productId: adjusting.product.id,
            warehouseId: adjusting.warehouse.id,
            delta: quantity - previous,
            reason,
          });
          notify("库存已更新");
          setAdjusting(null);
          await refresh();
        } catch (error) { throw new Error(error instanceof ApiClientError ? error.message : "无法调整库存，请重试。"); }
      }} />}
      {toast && <div className="toast" role="status"><span><Check aria-hidden="true" weight="bold" /></span>{toast}</div>}
    </div>
  );
}

function Overview({ dashboard, onNavigate, onOrder }: { dashboard: ApiDashboard | null; onNavigate: (section: Section) => void; onOrder: (orderNumber:string) => void }) {
  const [days, setDays] = useState(7);
  const operations = dashboard?.operations;
  const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const series = Array.from({length:days}, (_, index) => {
    const date = new Date(dashboard?.generatedAt || Date.now());
    date.setUTCDate(date.getUTCDate() - days + index + 1);
    const day = date.toISOString().slice(0,10);
    return operations?.sales.find(item => item.day === day) ?? {day, orders:0, grossCents:0, netCents:0};
  });
  const gross = series.reduce((sum,item) => sum + item.grossCents,0);
  const net = series.reduce((sum,item) => sum + item.netCents,0);
  const count = series.reduce((sum,item) => sum + item.orders,0);
  const counts = operations?.orderCounts ?? {};
  const pending = Object.values(counts).reduce((sum,value) => sum + value,0);
  const max = Math.max(1,...series.map(item => item.netCents));
  const points = series.map((item,index) => `${index * 900 / (days - 1)},${180 - item.netCents / max * 155}`).join(" ");
  const statuses: Record<string,string> = {submitted:"待确认",confirmed:"待处理",processing:"待发货"};
  const ready = Boolean(operations);
  if (dashboard && !operations) return <section className="panel"><PanelHead eyebrow="运营概览" title="运营数据需要订单查看权限"/><p className="sales-note">请使用超级管理员或库存管理员账号查看销售与订单数据。</p><div className="quick-actions"><button onClick={()=>onNavigate("products")}>商品管理</button><button onClick={()=>onNavigate("inventory")}>库存管理</button></div></section>;
  return <div className="operations-overview">
    <div className="welcome"><div><p className="eyebrow">业务概况</p><h2>运营概览</h2><p>关注销售表现，及时处理每一笔订单。</p></div><div className="sync"><span/><div><strong>{ready ? "数据已更新" : "正在同步"}</strong><p>{dashboard ? new Date(dashboard.generatedAt).toLocaleTimeString("zh-CN") : "加载运营数据…"}</p></div></div></div>
    <div className="overview-filters"><label>日期范围 <select value={days} onChange={event=>setDays(Number(event.target.value))}><option value={7}>最近 7 天</option><option value={30}>最近 30 天</option></select></label><span>USD · 按 UTC 日期统计</span></div>
    <section className="metric-grid">
      <Metric label="销售总额" value={ready ? money(gross) : "—"} detail="已付款订单，含税费及运费" trend="" tone="violet"/>
      <Metric label="净销售额" value={ready ? money(net) : "—"} detail="销售总额减去已退款金额" trend="" tone="violet"/>
      <Metric label="已付款订单" value={ready ? String(count) : "—"} detail="所选期间创建的已付款订单" trend="" tone="blue"/>
      <Metric label="待处理订单" value={ready ? String(pending) : "—"} detail="全部待确认、待处理及待发货订单" trend="" tone="amber"/>
    </section>
    <section className="panel sales-panel"><PanelHead eyebrow="销售表现" title="净销售额趋势"/><div className="sales-chart"><div className="chart-scale"><span>{money(max === 1 ? 0 : max)}</span><span>{money(0)}</span></div><svg viewBox="0 0 900 200" role="img" aria-label={`最近 ${days} 天净销售额趋势`} preserveAspectRatio="none"><path d="M0 25H900 M0 102H900 M0 180H900" stroke="#e9edf3" fill="none"/><polyline points={points} fill="none" stroke="#635bff" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg><div className="chart-dates"><span>{series[0].day}</span><span>{series.at(-1)?.day}</span></div></div><p className="sales-note">按订单创建日期归集；不含未确认支付的历史订单。{ready && count === 0 ? "所选期间暂无已付款订单。" : ""}</p></section>
    <div className="dashboard-grid operations-grid">
      <section className="panel"><PanelHead eyebrow="订单履约" title="待处理订单" action="查看全部订单" onAction={()=>onNavigate("orders")}/><div className="order-summary">{Object.entries(statuses).map(([status,label])=><div key={status}><span>{label}</span><strong>{ready ? counts[status] ?? 0 : "—"}</strong></div>)}</div><div className="table-scroll"><table><thead><tr><th>订单 / 客户</th><th>状态</th><th>金额</th><th>创建时间</th><th/></tr></thead><tbody>{operations?.pendingOrders.map(order=><tr key={order.id}><td><strong>{order.orderNumber}</strong><div className="muted-cell">{order.customerName}</div></td><td><span className="operation-status">{statuses[order.status]}</span></td><td>{money(order.totalCents)}</td><td>{new Date(order.createdAt.replace(" ","T") + (/[Z+]/.test(order.createdAt) ? "" : "Z")).toLocaleDateString("zh-CN")}</td><td><button className="row-action" onClick={()=>onOrder(order.orderNumber)}>处理订单 <ArrowRight aria-hidden="true"/></button></td></tr>)}</tbody></table></div>{!operations?.pendingOrders.length && <div className="dashboard-empty">{ready ? "暂无待处理订单" : "正在加载订单…"}</div>}<p className="sales-note">优先显示最早的 8 笔未完成订单。</p></section>
      <section className="panel"><PanelHead eyebrow="运营待办" title="需要关注"/><div className="operations-tasks"><button onClick={()=>onNavigate("inventory")}><Warehouse/><span>低库存提醒<small>检查库存并安排补货</small></span><strong>{dashboard?.inventory.lowStockItems ?? "—"}</strong><CaretRight/></button><button onClick={()=>onNavigate("products")}><Translate/><span>商品翻译待完善<small>完善中文及西班牙语内容</small></span><strong>{dashboard?.catalog.incompleteProducts ?? "—"}</strong><CaretRight/></button><button onClick={()=>onNavigate("customers")}><UsersThree/><span>客户管理<small>查看客户资料与订单</small></span><CaretRight/></button></div></section>
    </div>
  </div>;
}

function Metric({ label, value, detail, trend, tone }: { label: string; value: string; detail: string; trend: string; tone: string }) {
  return <article className={`metric ${tone}`}><div className="metric-top"><span>{label}</span><i /></div><div className="metric-value">{value}</div><div className="metric-foot"><span>{detail}</span><em>{trend}</em></div></article>;
}

function PanelHead({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return <div className="panel-head"><div><p>{eyebrow}</p><h3>{title}</h3></div>{action && <button onClick={onAction}>{action} <span><ArrowRight aria-hidden="true" /></span></button>}</div>;
}

function Products({ list, products, allProducts, query, setQuery, filter, setFilter, selected, setSelected, onEdit, onStatus, onDelete }: { list: AdminListState<ApiProduct>; products: Product[]; allProducts: Product[]; query: string; setQuery: (value: string) => void; filter: "All" | ProductStatus; setFilter: (value: "All" | ProductStatus) => void; selected: string[]; setSelected: (value: string[]) => void; onEdit: (product: Product) => void; onStatus: (ids: string[], status: ProductStatus) => Promise<void>; onDelete: (product: Product) => Promise<void> }) {
  const [deletingId,setDeletingId]=useState<string|null>(null);
  const toggleAll = () => setSelected(selected.length === products.length ? [] : products.map((item) => item.id));
  const remove = async (product: Product) => { if(deletingId)return;setDeletingId(product.id);try{await onDelete(product)}finally{setDeletingId(null)} };
  return (
    <>
      <PageIntro eyebrow="商品目录" title="商品管理" description={`当前页显示 ${allProducts.length} 个商品；搜索与分页覆盖完整目录。`} />
      <section className="panel table-panel">
        <div className="toolbar">
          <label className="table-search"><span className="sr-only">搜索商品</span><span aria-hidden="true"><MagnifyingGlass/></span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="按商品、SKU 或品牌搜索" /></label>
          <div className="status-tabs">{(["All", "Published", "Draft", "Unpublished"] as const).map((status) => <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>{statusLabel[status]}</button>)}</div>

        </div>
        {selected.length > 0 && <div className="bulk-bar"><strong>已选择 {selected.length} 项</strong><button onClick={() => void onStatus(selected, "Published")}>上架</button><button onClick={() => void onStatus(selected, "Unpublished")}>下架</button><button onClick={() => setSelected([])}>取消选择</button></div>}
        <div className="table-scroll">
          <table className="product-list-table">
            <colgroup><col className="product-select-column"/><col/><col className="product-category-column"/><col className="product-price-column"/><col className="product-stock-column"/><col className="product-status-column"/><col className="product-actions-column"/></colgroup>
            <thead><tr><th><input type="checkbox" aria-label="选择本页全部商品" checked={products.length > 0 && selected.length === products.length} onChange={toggleAll} /></th><th>商品</th><th>分类</th><th>价格</th><th>库存</th><th>状态</th><th /></tr></thead>
            <tbody>{products.map((product) => {
              const stock = Object.values(product.stock).reduce((a, b) => a + b, 0);
              return <tr key={product.id}><td><input type="checkbox" aria-label={`选择 ${product.name}`} checked={selected.includes(product.id)} onChange={() => setSelected(selected.includes(product.id) ? selected.filter((id) => id !== product.id) : [...selected, product.id])} /></td><td><div className="product-cell"><ProductThumb category={product.category} mediaId={product.api?.primaryMediaId} name={product.name}/><div><strong title={product.name}>{product.name}</strong><span>{product.sku} · {product.brand}</span></div></div></td><td title={product.category}>{product.category}</td><td>${product.price.toLocaleString()}</td><td><strong className={stock < 8 ? "danger-text" : ""}>{stock}</strong><span className="muted-cell"> 合计</span></td><td><span className={`status ${product.status.toLowerCase()}`}>{statusLabel[product.status]}</span></td><td><div className="product-row-actions"><button className="row-action" disabled={deletingId===product.id} onClick={() => onEdit(product)}>编辑</button><button className="row-action danger-action" disabled={deletingId===product.id} onClick={() => void remove(product)}>删除</button><button aria-label={`切换 ${product.name} 上架状态`} disabled={deletingId===product.id} className="row-action" onClick={() => void onStatus([product.id], product.status === "Published" ? "Unpublished" : "Published")}>{product.status === "Published"?"下架":"上架"}</button></div></td></tr>;
            })}</tbody>
          </table>
        </div>
        <ListStatus list={list}/><ListPagination list={list}/>
      </section>
    </>
  );
}

function MembershipManager({tiers,list,onSaveTier,onAdjust,onOrder}:{tiers:ApiMembershipTier[];list:AdminListState<ApiMembershipCustomer>;onSaveTier:(tier:ApiMembershipTier)=>Promise<void>;onAdjust:(customerId:string,amountCents:number,reason:string)=>Promise<void>;onOrder:(customerId:string,orderNumber:string,eligibleSubtotalCents:number)=>Promise<void>}){
  const [editing,setEditing]=useState<ApiMembershipTier|null>(null);
  const [busy,setBusy]=useState(false);
  const money=(cents:number)=>`$${(cents/100).toFixed(2)}`;
  const adjust=async(customer:ApiMembershipCustomer)=>{const amount=window.prompt("输入调整金额（美元，可为负数）","10.00");if(!amount)return;const reason=window.prompt("请输入调整原因","Customer service adjustment");if(!reason)return;setBusy(true);try{await onAdjust(customer.id,Math.round(Number(amount)*100),reason)}finally{setBusy(false)}};
  const addOrder=async(customer:ApiMembershipCustomer)=>{const order=window.prompt("订单编号","LOCAL-ORDER");if(!order)return;const subtotal=window.prompt("符合积分奖励的商品金额（美元）","100.00");if(!subtotal)return;setBusy(true);try{await onOrder(customer.id,order,Math.round(Number(subtotal)*100))}finally{setBusy(false)}};
  const customers=list.loading||list.error?[]:list.data?.items??[];
  const availableTotal=customers.reduce((sum,customer)=>sum+customer.availableCents,0);
  const pendingTotal=customers.reduce((sum,customer)=>sum+customer.pendingCents,0);
  const initials=(name:string)=>name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase();
  return <>
    <PageIntro eyebrow="会员运营" title="会员与积分奖励" description="按近 395 天付款且通过 30 天确认期的消费自动升降 V0–V9 等级，并维护 CUC Rewards。"/>
    <div className="membership-overview">
      <article><span>匹配账户</span><strong>{list.data?.pagination.total_items??0}</strong><small>筛选后的真实账户数</small></article>
      <article><span>可用积分奖励</span><strong>{money(availableTotal)}</strong><small>本页可用余额</small></article>
      <article><span>待生效积分奖励</span><strong>{money(pendingTotal)}</strong><small>本页待生效余额</small></article>
      <article><span>最高等级</span><strong>{tiers.at(-1)?.code??"V9"}</strong><small>最高 {tiers.at(-1)?.cashbackPercent??10}% 积分回馈</small></article>
    </div>
    <section className="panel membership-admin">
      <PanelHead eyebrow="等级规则" title="V0–V9 会员等级"/>
      <div className="tier-admin-grid">{tiers.map(tier=><article key={tier.id} data-tier={tier.code}>
        <div className="tier-card-head"><span>{tier.code}</span><small>{tier.minSpendCents===0?"默认等级":`${money(tier.minSpendCents)}+`}</small></div>
        <h3>{tier.name}</h3>
        <div className="tier-rate"><strong>{tier.cashbackPercent}</strong><span>% 积分回馈</span></div>
        <p>确认期后的有效消费达到 {money(tier.minSpendCents)}；到期或退款后重新评定</p>
        <button onClick={()=>setEditing({...tier})}>编辑规则 <ArrowRight aria-hidden="true"/></button>
      </article>)}</div>
    </section>
    <section className="panel membership-customers">
      <PanelHead eyebrow="顾客资产" title="会员列表"/><ListControls list={list} statuses={["active","disabled"]} statusLabels={{active:"启用",disabled:"停用"}}/>
      <div className="table-scroll"><table><thead><tr><th>顾客</th><th>等级</th><th>近 395 天已确认消费</th><th>积分回馈</th><th>可用余额</th><th>待生效</th><th>操作</th></tr></thead><tbody>{customers.map(customer=><tr key={customer.id}>
        <td><div className="member-profile"><i>{initials(customer.displayName)}</i><div><strong>{customer.displayName}</strong><span className="table-sub">@{customer.username}</span></div></div></td>
        <td><b className="tier-pill">{customer.tierCode}</b></td><td><strong className="order-count">{money(customer.eligibleSpendCents)}</strong></td><td><span className="cashback-rate">{customer.cashbackPercent}%</span></td><td><strong className="money-value">{money(customer.availableCents)}</strong>{(customer.reservedCents??0)>0&&<small>冻结 {money(customer.reservedCents!)}</small>}{(customer.debtCents??0)>0&&<small>待追回 {money(customer.debtCents!)}</small>}</td><td><span className="pending-value">{money(customer.pendingCents)}</span></td>
        <td><div className="member-actions"><button className="member-primary" disabled={busy} onClick={()=>void addOrder(customer)}><Plus aria-hidden="true"/> 记录订单</button><button disabled={busy} onClick={()=>void adjust(customer)}><ArrowsDownUp aria-hidden="true"/> 调整余额</button></div></td>
      </tr>)}</tbody></table></div><ListStatus list={list}/><ListPagination list={list}/>
    </section>
    {editing&&<div className="modal-backdrop"><form className="membership-tier-modal" onSubmit={async event=>{event.preventDefault();setBusy(true);try{await onSaveTier(editing);setEditing(null)}finally{setBusy(false)}}}><button type="button" className="modal-close" onClick={()=>setEditing(null)}>×</button><div className="tier-modal-badge">{editing.code}</div><p className="eyebrow">会员等级规则</p><h2>编辑 {editing.name}</h2><p className="modal-description">调整升级门槛和积分回馈比例，保存后将应用到所有会员。</p><label>等级名称<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><label>累计有效消费门槛（美元）<input type="number" min="0" step="100" value={editing.minSpendCents/100} onChange={e=>setEditing({...editing,minSpendCents:Math.round(Number(e.target.value)*100)})}/></label><label>积分回馈百分比<input type="number" min="0" max="10" value={editing.cashbackPercent} onChange={e=>setEditing({...editing,cashbackPercent:Number(e.target.value)})}/></label><button className="primary" disabled={busy}>{busy?"保存中…":"保存规则"}</button></form></div>}
  </>;
}

function Inventory({ list, products, warehouses, setAdjusting, onEditProduct, onSaveWarehouse, onDeleteWarehouse }: { list: AdminListState<ApiProduct>; products: Product[]; warehouses: ApiWarehouse[]; setAdjusting: (data: { product: Product; warehouse: ApiWarehouse }) => void; onEditProduct:(id:string)=>Promise<void>; onSaveWarehouse: (warehouse: ApiWarehouse) => Promise<void>; onDeleteWarehouse: (warehouse: ApiWarehouse) => Promise<void> }) {
  const [managing, setManaging] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<ApiWarehouse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const visibleWarehouses = warehouses.filter((warehouse) => warehouse.isActive);
  const edit = (warehouse?: ApiWarehouse) => {
    setError("");
    setEditingWarehouse(warehouse ?? { id: "", code: "", name: "", location: "", isActive: true, createdAt: "" });
  };
  return (
    <>
      <div className="page-intro intro-actions"><div><p className="eyebrow">仓库运营</p><h2>库存管理</h2><p>按仓库查看库存水平并记录库存调整。</p></div><button className="outline-button button-with-icon" onClick={() => setManaging(true)}><Warehouse aria-hidden="true" />管理仓库</button></div>
      <div className="warehouse-cards">
        {visibleWarehouses.map((warehouse, index) => {
          const total = products.reduce((sum, item) => sum + (item.stock[warehouse.id] ?? 0), 0);
          return <article key={warehouse.id}><div className="warehouse-index">{String(index + 1).padStart(2, "0")}</div><p>{warehouse.name}</p><small>{warehouse.code} · {warehouse.location || "未设置地址"}</small><h3>{total} <span>件（本页）</span></h3><div><span>{products.filter((p) => (p.stock[warehouse.id] ?? 0) < 3).length} 项低库存</span><em>{products.length} 个商品</em></div><i><b style={{ width: `${Math.min(100, total / 1.8)}%` }} /></i></article>;
        })}
      </div>
      <section className="panel inventory-panel">
        <PanelHead eyebrow="分仓库存" title="仓库库存" /><ListControls list={list} searchPlaceholder="搜索商品、SKU 或品牌"/>
        <div className="table-scroll"><table><thead><tr><th>商品</th>{visibleWarehouses.map(warehouse => <th key={warehouse.id}>{warehouse.name}</th>)}<th>合计</th></tr></thead><tbody>
          {products.map((product) => <tr key={product.id}><td><div className="product-cell"><ProductThumb category={product.category} mediaId={product.api?.primaryMediaId} name={product.name}/><div><strong>{product.name}</strong><span>{product.sku}</span></div></div></td>{visibleWarehouses.map((warehouse) => { const quantity = product.stock[warehouse.id] ?? 0; return <td key={warehouse.id}><button className={`stock-button ${quantity < 3 ? "low" : ""}`} onClick={() => product.api?.variants?.length?void onEditProduct(product.id):setAdjusting({ product, warehouse })}>{quantity} <span>{product.api?.variants?.length?"编辑规格":"调整"}</span></button></td>; })}<td><strong>{visibleWarehouses.reduce((sum, warehouse) => sum + (product.stock[warehouse.id] ?? 0), 0)}</strong></td></tr>)}
        </tbody></table></div><ListStatus list={list}/><ListPagination list={list}/>
      </section>
      {managing && <div className="modal-layer center-modal"><button className="modal-scrim" onClick={() => !busy && setManaging(false)} aria-label="关闭仓库管理"/><section className="warehouse-manager"><div className="drawer-head"><div><p>仓库设置</p><h2>管理仓库</h2></div><button onClick={() => setManaging(false)}>×</button></div><div className="warehouse-manager-body"><button className="primary button-with-icon" onClick={() => edit()}><Plus aria-hidden="true"/>新增仓库</button>{error && <div className="auth-error">{error}</div>}<div className="warehouse-list">{warehouses.map(warehouse => <article key={warehouse.id}><div><strong>{warehouse.name}</strong><span>{warehouse.code} · {warehouse.location || "未设置地址"}</span></div><em className={warehouse.isActive ? "category-live" : "category-off"}>{warehouse.isActive ? "启用" : "停用"}</em><button onClick={() => edit(warehouse)}>编辑</button><button className="danger-action" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await onDeleteWarehouse(warehouse); } catch (cause) { setError(cause instanceof ApiClientError && cause.code === "WAREHOUSE_IN_USE" ? "该仓库已有库存或调整记录，请改为停用。" : cause instanceof Error ? cause.message : "仓库删除失败。"); } finally { setBusy(false); } }}>删除</button></article>)}</div></div></section></div>}
      {editingWarehouse && <div className="modal-layer center-modal warehouse-editor-layer"><button className="modal-scrim" onClick={() => !busy && setEditingWarehouse(null)} aria-label="关闭仓库编辑"/><form className="inventory-modal" role="dialog" aria-modal="true" aria-label="仓库编辑" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); try { await onSaveWarehouse(editingWarehouse); setEditingWarehouse(null); } catch (cause) { setError(cause instanceof ApiClientError && cause.code === "WAREHOUSE_CONFLICT" ? "仓库代码已存在。" : cause instanceof Error ? cause.message : "仓库保存失败。"); } finally { setBusy(false); } }}><div className="drawer-head"><div><p>{editingWarehouse.id ? "编辑仓库" : "新增仓库"}</p><h2>{editingWarehouse.name || "仓库资料"}</h2></div><button type="button" onClick={() => setEditingWarehouse(null)}>×</button></div>{error && <div className="auth-error warehouse-form-error">{error}</div>}<label><span>仓库名称</span><input required value={editingWarehouse.name} onChange={event => setEditingWarehouse({...editingWarehouse, name:event.target.value})}/></label><label><span>仓库代码</span><input required maxLength={12} value={editingWarehouse.code} onChange={event => setEditingWarehouse({...editingWarehouse, code:event.target.value.toUpperCase().replaceAll(/[^A-Z0-9_-]/g, "")})}/></label><label><span>地址</span><input value={editingWarehouse.location} onChange={event => setEditingWarehouse({...editingWarehouse, location:event.target.value})}/></label>{editingWarehouse.id && <label className="toggle-row"><span>启用仓库</span><input type="checkbox" checked={editingWarehouse.isActive} onChange={event => setEditingWarehouse({...editingWarehouse, isActive:event.target.checked})}/></label>}<div className="drawer-foot"><button type="button" className="outline-button" onClick={() => setEditingWarehouse(null)}>取消</button><button className="primary" disabled={busy}>{busy ? "保存中…" : "保存仓库"}</button></div></form></div>}
    </>
  );
}

type HeroCopy = { eyebrow:string; title:string; description:string; primaryLabel:string };
const heroCopyDefaults:Record<"en"|"zh",HeroCopy> = {
  en:{eyebrow:"CUC HVAC SUPPLY",title:"The right part.\nReady for the job.",description:"HVAC parts, straightforward pricing and online delivery for every customer.",primaryLabel:"Shop products"},
  zh:{eyebrow:"CUC 暖通供应",title:"正确配件，\n随时投入使用。",description:"面向所有顾客的暖通配件、透明价格与在线配送。",primaryLabel:"选购产品"},
};

function HomepageContent({ pageSlots, notify, mediaEnabled, onSaveHero, onUploadHero }: { pageSlots: ApiPageSlot[]; notify: (message: string) => void; mediaEnabled: boolean; onSaveHero:(locale:"en"|"zh",content:HeroCopy)=>Promise<void>; onUploadHero:(file:File)=>Promise<void> }) {
  const [heroLocale,setHeroLocale]=useState<"en"|"zh">("zh");
  const heroImageSlot=pageSlots.find(item=>item.page_key==="home"&&item.slot_key==="hero_image"&&item.media_id);
  const heroImageUrl=heroImageSlot?.media_id?`${API_BASE_URL}/v1/media/${encodeURIComponent(heroImageSlot.media_id)}/content`:defaultHeroImageUrl;
  const storedHero=(locale:"en"|"zh")=>{
    const slot=pageSlots.find(item=>item.page_key==="home"&&item.slot_key==="hero_copy"&&item.locale===locale);
    if(!slot)return heroCopyDefaults[locale];
    try{return {...heroCopyDefaults[locale],...JSON.parse(slot.body) as Partial<HeroCopy>,title:slot.heading||heroCopyDefaults[locale].title};}catch{return {...heroCopyDefaults[locale],title:slot.heading||heroCopyDefaults[locale].title};}
  };
  const [heroCopy,setHeroCopy]=useState<HeroCopy>(()=>storedHero("zh"));
  const [savingHero,setSavingHero]=useState(false);
  const switchHeroLocale=(locale:"en"|"zh")=>{setHeroLocale(locale);setHeroCopy(storedHero(locale))};
  const uploadHero = async (event: ChangeEvent<HTMLInputElement>) => {
    const file=event.target.files?.[0];
    if(!file)return;
    try{await onUploadHero(file);event.target.value=""}
    catch(error){notify(error instanceof ApiClientError?error.message:"无法更新首页主视觉图片。")}
  };
  return (
    <>
      <div className="page-intro"><div><p className="eyebrow">首页运营</p><h2>首页内容</h2><p>管理商城首页主视觉文案、主视觉图片与右侧 Banner。</p></div></div>
      {!mediaEnabled && <div className="service-warning"><strong>图片存储尚未启用。</strong><span>商品和库存接口已可用；启用 Cloudflare R2 后即可上传及替换页面图片。</span></div>}
      <section className="panel page-copy-editor">
        <div className="page-copy-head"><div><p className="eyebrow">首页内容</p><h3>主视觉文案</h3><p>商城会根据顾客选择的语言自动显示对应版本。</p></div><div className="locale-tabs"><button className={heroLocale==="zh"?"active":""} onClick={()=>switchHeroLocale("zh")}>中文</button><button className={heroLocale==="en"?"active":""} onClick={()=>switchHeroLocale("en")}>English</button></div></div>
        <div className="page-copy-form"><label><span>眉题</span><input value={heroCopy.eyebrow} onChange={e=>setHeroCopy({...heroCopy,eyebrow:e.target.value})}/></label><label className="wide"><span>主标题</span><textarea rows={3} value={heroCopy.title} onChange={e=>setHeroCopy({...heroCopy,title:e.target.value})}/><small>使用换行控制标题断行。</small></label><label className="wide"><span>副标题</span><textarea rows={2} value={heroCopy.description} onChange={e=>setHeroCopy({...heroCopy,description:e.target.value})}/></label><label><span>主按钮</span><input value={heroCopy.primaryLabel} onChange={e=>setHeroCopy({...heroCopy,primaryLabel:e.target.value})}/></label></div>
        <div className="page-copy-actions"><span>正在编辑：{heroLocale==="zh"?"中文版本":"English version"}</span><button className="primary" disabled={savingHero} onClick={async()=>{setSavingHero(true);try{await onSaveHero(heroLocale,heroCopy)}catch(error){notify(error instanceof Error?error.message:"文案保存失败")}finally{setSavingHero(false)}}}>{savingHero?"正在保存…":"保存文案"}</button></div>
      </section>
      <section className="media-feature">
        <div className="feature-art"><img src={heroImageUrl} alt="当前首页主视觉"/></div>
        <div><p className="eyebrow">首页 · 主视觉</p><h3>当前首页主视觉图片</h3><p>桌面端建议 1920 × 840 · 支持移动端裁切</p><div><label className={`primary upload-button ${!mediaEnabled ? "disabled" : ""}`}>上传替换图片<input disabled={!mediaEnabled} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => void uploadHero(e)} /></label></div></div>
      </section>
    </>
  );
}

function ActivityLog({list}:{list:AdminListState<import("./api").ApiAudit>}) {
 const rows=list.loading||list.error?[]:list.data?.items??[];
 return <><PageIntro eyebrow="审计记录" title="操作日志" description="服务端检索全部操作记录。"/><section className="panel activity-page"><ListControls list={list} dates/><ListStatus list={list}/>{rows.map(item=><div className="activity-row" key={item.id}><div><strong>{auditActionLabel[item.action]??item.action}</strong><p>{localizeAuditSummary(item.summary)}</p></div><time>{new Date(item.created_at).toLocaleString("zh-CN")}</time></div>)}<ListPagination list={list}/></section></>;
}

function OrdersManager({token,list,onStatus,onRefund,canRefund}:{token:string;list:AdminListState<ApiOrder>;onStatus:(id:string,status:ApiOrder["status"])=>Promise<void>;onRefund:(checkoutId:string,body:{amountCents:number;reason:string;requestId:string})=>Promise<{refundId:string;status:string;amountCents:number}>;canRefund:boolean}){
 const [detailOrder,setDetailOrder]=useState<ApiOrder|null>(null);
 const [shippingOrder,setShippingOrder]=useState<string|null>(null);
 const [busy,setBusy]=useState(""),[error,setError]=useState(""),[result,setResult]=useState("");
 const [refund,setRefund]=useState<{order:ApiOrder;kind:"full"|"partial";amount:string;reason:string;requestId:string}|null>(null);
 useEffect(()=>{if(!refund)return;const previous=document.activeElement as HTMLElement|null;const dialog=document.querySelector<HTMLElement>(".refund-dialog");if(!dialog)return;const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])'));controls()[0]?.focus();const handle=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();if(!dialog.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled)setRefund(null);return}if(event.key!=="Tab")return;const elements=controls(),first=elements[0],last=elements.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}};dialog.addEventListener("keydown",handle);return()=>{dialog.removeEventListener("keydown",handle);previous?.focus()}},[Boolean(refund)]);
 const visible=list.loading||list.error?[]:list.data?.items??[];
 const nextStatuses=(order:ApiOrder)=>{const transitions:Record<string,ApiOrder["status"][]>={submitted:["confirmed","processing",...order.checkoutId?[]:["cancelled" as const]],confirmed:["processing",...order.checkoutId?[]:["cancelled" as const]],processing:["shipped",...order.checkoutId?[]:["cancelled" as const]],shipped:["delivered"],delivered:[],cancelled:[],refunded:[]};return [order.status,...transitions[order.status]??[]]};
 const submitRefund=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();if(busy||!refund?.order.checkoutId)return;const amountCents=Math.round(Number(refund.amount)*100);if(!Number.isSafeInteger(amountCents)||amountCents<1){setError("请输入有效退款金额");return}setBusy(refund.order.id);setError("");try{const response=await onRefund(refund.order.checkoutId,{amountCents,reason:refund.reason,requestId:refund.requestId});setResult(`Stripe refund ${response.refundId}: ${response.status} — $${(response.amountCents/100).toFixed(2)}。库存不会自动回库。`);setRefund(null)}catch(reason){setError(reason instanceof Error?reason.message:"退款请求失败，请重试")}finally{setBusy("")}};
 const fulfillmentLabels:Record<ApiOrder["status"],string>={submitted:"待确认",confirmed:"已确认",processing:"备货中",shipped:"已发货",delivered:"已送达",cancelled:"已取消",refunded:"已退款"};
 const paymentLabels:Record<string,string>={paid:"已付款",partially_refunded:"部分退款",refunded:"已退款",refund_pending:"退款处理中",pending_session:"待付款",pending_payment:"待付款",payment_failed:"支付失败",canceled:"支付已取消",legacy:"历史订单",verification_failed:"待核查",paid_inventory_conflict:"库存待核查"};
 const money=(cents:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);
 const formatDate=(value:string)=>{const date=new Date(value.includes("T")?value:value.replace(" ","T")+"Z");return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("zh-CN",{month:"2-digit",day:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(date)};
 const pagination=list.data?.pagination,filtered=Boolean(list.search||list.filters.status||list.filters.from||list.filters.to);
 const resetFilters=()=>{list.setSearch("");list.change("status","");list.change("from","");list.change("to","")};
 return <div className="orders-workspace">
  <div className="orders-page-heading"><div><p className="orders-eyebrow">履约中心</p><h2>订单管理{pagination&&!list.loading&&!list.error&&<span>{pagination.total_items}</span>}</h2><p>查看付款、安排发货与处理退款，让每一笔订单有序推进。</p></div><span className="orders-live"><i/>实时订单</span></div>
  {error&&<div className="orders-notice is-error" role="alert">{error}</div>}{result&&<div className="orders-notice" role="status">{result}</div>}
  <section className="orders-panel" aria-label="订单列表">
   <div className="orders-status-tabs" role="group" aria-label="按履约状态筛选"><button className={!list.filters.status?"is-active":""} aria-pressed={!list.filters.status} onClick={()=>list.change("status","")}>全部订单</button>{Object.entries(fulfillmentLabels).map(([value,label])=><button key={value} className={list.filters.status===value?"is-active":""} aria-pressed={list.filters.status===value} onClick={()=>list.change("status",value)}>{label}</button>)}</div>
   <div className="orders-toolbar"><label className="orders-search"><MagnifyingGlass aria-hidden="true"/><input type="search" aria-label="搜索订单" placeholder="搜索订单号、客户或邮箱" value={list.search} onChange={event=>list.setSearch(event.target.value)}/></label><div className="orders-dates"><label><span>开始日期</span><input aria-label="订单开始日期" type="date" value={list.filters.from} onChange={event=>list.change("from",event.target.value)}/></label><span className="orders-date-divider" aria-hidden="true">—</span><label><span>结束日期</span><input aria-label="订单结束日期" type="date" value={list.filters.to} min={list.filters.from||undefined} onChange={event=>list.change("to",event.target.value)}/></label></div>{filtered&&<button className="orders-reset" onClick={resetFilters}>清除筛选</button>}</div>
   <div className="orders-table-wrap"><table className="orders-table"><thead><tr><th scope="col">订单 / 下单时间</th><th scope="col">客户</th><th scope="col">收货地区</th><th scope="col" className="orders-amount-head">银行卡实付</th><th scope="col">支付状态</th><th scope="col">履约状态</th><th scope="col">操作</th></tr></thead><tbody>
    {list.loading?<tr><td colSpan={7}><div className="orders-list-state" role="status"><ArrowClockwise className="orders-loading-icon" aria-hidden="true"/><strong>正在加载订单</strong><span>正在获取最新的订单与付款状态</span></div></td></tr>:list.error?<tr><td colSpan={7}><div className="orders-list-state" role="alert"><Package aria-hidden="true"/><strong>订单暂时无法加载</strong><span>{list.error}</span><button onClick={list.reload}>重新加载</button></div></td></tr>:!visible.length?<tr><td colSpan={7}><div className="orders-list-state" role="status"><Package aria-hidden="true"/><strong>{filtered?"没有符合条件的订单":"暂时还没有订单"}</strong><span>{filtered?"试试其他订单号或调整筛选条件":"客户下单后，你可以在这里跟进付款与发货"}</span>{filtered&&<button onClick={resetFilters}>清除筛选</button>}{list.filters.page>1&&<button onClick={()=>list.setPage(1)}>返回第一页</button>}</div></td></tr>:visible.map(order=><tr key={order.id}>
     <td><button className="orders-number orders-detail-link" translate="no" onClick={()=>setDetailOrder(order)} aria-label={`查看订单 ${order.orderNumber} 详情`}>{order.orderNumber}</button><time className="orders-meta" dateTime={order.createdAt}>{formatDate(order.createdAt)}</time></td>
     <td><div className="orders-customer"><span className="orders-avatar" aria-hidden="true">{(order.customerName||order.username||"?").slice(0,1).toUpperCase()}</span><span><strong translate="no">{order.customerName||order.username}</strong><small translate="no">@{order.username}</small></span></div></td>
     <td><span className="orders-location" translate="no">{order.city||"—"}</span><small className="orders-meta" translate="no">{order.state||"—"}</small></td>
     <td className="orders-money"><strong>{money(order.totalCents)}</strong>{order.refundedAmountCents>0?<small className="orders-refunded">已退卡 {money(order.refundedAmountCents)}</small>:<small className="orders-meta">USD</small>}{(order.rewardsCents??0)>0&&<small>Rewards 抵扣 {money(order.rewardsCents!)}</small>}{(order.restoredRewardsCents??0)>0&&<small>已恢复 {money(order.restoredRewardsCents!)}</small>}</td>
     <td><span className={`orders-payment-status is-${order.paymentStatus.replace(/[^a-z_]/g,"")}`}><i/>{paymentLabels[order.paymentStatus]??order.paymentStatus}</span>{order.taxError&&<p className="orders-tax-warning" role="alert" title={order.taxError}>税务记录待核查</p>}</td>
     <td><select className={`orders-fulfillment is-${order.status}`} aria-label={`履约状态 ${order.orderNumber}`} disabled={Boolean(busy)||nextStatuses(order).length<2} value={order.status} onChange={async event=>{setBusy(order.id);setError("");try{await onStatus(order.id,event.target.value as ApiOrder["status"])}catch(reason){setError(reason instanceof Error?reason.message:"更新失败")}finally{setBusy("")}}}>{nextStatuses(order).map(status=><option value={status} key={status}>{fulfillmentLabels[status]}</option>)}</select></td>
     <td><div className="orders-row-actions"><button className="orders-shipping-button" disabled={Boolean(busy)} onClick={()=>setShippingOrder(order.id)}><Truck aria-hidden="true"/>物流与面单</button>{canRefund&&order.checkoutId&&["paid","partially_refunded"].includes(order.paymentStatus)&&<button className="orders-refund-button" disabled={Boolean(busy)} onClick={()=>{setError("");setResult("");setRefund({order,kind:"partial",amount:"",reason:"",requestId:crypto.randomUUID()})}}><ArrowCounterClockwise aria-hidden="true"/>退款</button>}<button className="orders-view-button" onClick={()=>setDetailOrder(order)} aria-label={`查看订单 ${order.orderNumber} 详情`}>详情</button></div></td>
    </tr>)}
   </tbody></table></div>
   <div className="orders-footer"><div>{pagination&&!list.loading&&!list.error?<span>{pagination.total_items>0?`显示 ${(pagination.page-1)*pagination.page_size+1}–${Math.min(pagination.page*pagination.page_size,pagination.total_items)} 条，共 ${pagination.total_items} 条订单`:"共 0 条订单"}</span>:<span>订单数据</span>}<label>每页<select aria-label="每页订单数量" value={list.filters.page_size} onChange={event=>list.change("page_size",event.target.value)}>{[25,50,100].map(value=><option value={value} key={value}>{value} 条</option>)}</select></label></div><nav aria-label="订单分页"><button aria-label="上一页订单" disabled={list.loading||!pagination?.has_previous} onClick={()=>list.setPage(pagination!.page-1)}><CaretLeft aria-hidden="true"/></button><span>第 {pagination?.page??list.filters.page} / {Math.max(1,pagination?.total_pages??1)} 页</span><button aria-label="下一页订单" disabled={list.loading||!pagination?.has_next} onClick={()=>list.setPage(pagination!.page+1)}><CaretRight aria-hidden="true"/></button></nav></div>
  </section><p className="orders-workflow-note">履约与支付状态独立管理；支付退款不会自动将商品回库。</p>
{detailOrder&&<OrderDetail token={token} orderId={detailOrder.id} onClose={()=>setDetailOrder(null)} onShipping={()=>{setShippingOrder(detailOrder.id);setDetailOrder(null)}} onRefund={canRefund?()=>{setError("");setResult("");setRefund({order:detailOrder,kind:"partial",amount:"",reason:"",requestId:crypto.randomUUID()});setDetailOrder(null)}:undefined}/>}
{refund&&<div className="modal-overlay"><form className="panel refund-dialog" role="dialog" aria-modal="true" aria-labelledby="refund-title" onSubmit={submitRefund}><h2 id="refund-title">订单退款 · {refund.order.orderNumber}</h2><p>退货退款请使用「退货与退款」中的按商品检查预览。此处为单独支付调整，金额不默认包含原始配送费；先核对商品、税额、运费和已退款金额。</p><label>退款类型<select disabled={Boolean(busy)} value={refund.kind} onChange={event=>setRefund({...refund,kind:event.target.value as "full"|"partial",amount:event.target.value==="full"?((refund.order.totalCents-refund.order.refundedAmountCents)/100).toFixed(2):"",requestId:crypto.randomUUID()})}><option value="full">退还剩余全部金额</option><option value="partial">部分退款</option></select></label><label>退款金额（USD）<input required type="number" min="0.01" max={((refund.order.totalCents-refund.order.refundedAmountCents)/100).toFixed(2)} step="0.01" readOnly={refund.kind==="full"} disabled={Boolean(busy)} value={refund.amount} onChange={event=>setRefund({...refund,amount:event.target.value,requestId:crypto.randomUUID()})}/></label><label>退款原因<textarea required maxLength={300} disabled={Boolean(busy)} value={refund.reason} onChange={event=>setRefund({...refund,reason:event.target.value})}/></label><p>确认后将向 Stripe 提交实际退款。退款不会自动回库。</p>{error&&<p role="alert">{error}</p>}<button type="button" disabled={Boolean(busy)} onClick={()=>setRefund(null)}>取消</button><button type="submit" disabled={Boolean(busy)}>{busy?"正在提交…":"确认退款"}</button></form></div>}{shippingOrder&&<OrderShipping key={shippingOrder} token={token} orderId={shippingOrder} onClose={()=>setShippingOrder(null)}/>}</div>;
}

function Settings({settings,onSave}:{settings:ApiSettings|null;onSave:(input:ApiSettings)=>Promise<void>}) {
  const [form,setForm]=useState<ApiSettings>(settings??{store_name:"",store_url:"",require_publish_review:"true",support_email:"",support_phone:""});const [saving,setSaving]=useState(false);
  return <><PageIntro eyebrow="系统" title="工作区设置" description="设置直接保存至 D1，并供运营流程使用。" /><div className="settings-grid"><section className="panel settings-panel"><h3>商城连接</h3><p>管理公开商城身份和发布规则。</p><label><span>商城名称</span><input value={form.store_name} onChange={event=>setForm({...form,store_name:event.target.value})}/></label><label><span>商城网址</span><input value={form.store_url} onChange={event=>setForm({...form,store_url:event.target.value})}/></label><label><span>客服邮箱</span><input type="email" value={form.support_email} onChange={event=>setForm({...form,support_email:event.target.value})}/></label><label><span>客服电话</span><input value={form.support_phone} onChange={event=>setForm({...form,support_phone:event.target.value})}/></label><label className="toggle-row"><div><strong>发布前需要审核</strong><p>保存商品时可先进入草稿状态。</p></div><input type="checkbox" checked={form.require_publish_review==="true"} onChange={event=>setForm({...form,require_publish_review:String(event.target.checked)})}/></label><button className="primary" disabled={saving||!settings} onClick={async()=>{setSaving(true);try{await onSave(form)}finally{setSaving(false)}}}>{saving?"保存中…":"保存更改"}</button></section><section className="panel settings-panel"><h3>数据状态</h3><p>商品、订单、库存、会员和页面内容均由 Worker API 与 D1 提供。</p><div className="language-row"><div className="language-code">D1</div><div><strong>业务数据库</strong><span>已连接</span></div><em>实时</em></div><div className="language-row"><div className="language-code">R2</div><div><strong>媒体存储</strong><span>由环境配置决定</span></div><em>对象存储</em></div></section></div></>;
}

function CategoryManager({ categories, onSave, onDelete, onUploadImage }: { categories: ApiCategory[]; onSave: (category: Omit<ApiCategory, "createdAt" | "updatedAt">) => Promise<void>; onDelete: (category: ApiCategory) => Promise<void>; onUploadImage: (file: File) => Promise<string> }) {
  const [editing, setEditing] = useState<Partial<ApiCategory> | null>(null);
  const [deleting, setDeleting] = useState<ApiCategory | null>(null);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  useEffect(() => {
    if (editing && !editing.id && editing.name && !editing.slug) {
      const generated = editing.name.toLowerCase().trim().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "") || `category-${Date.now().toString(36)}`;
      queueMicrotask(()=>setEditing({ ...editing, slug: generated }));
    }
  }, [editing]);
  const parents = categories.filter((item) => !item.parentId).sort((a,b)=>a.sortOrder-b.sortOrder||a.name.localeCompare(b.name));
  const openEditor = (category: Partial<ApiCategory>) => { setSaveError(""); setEditing({ ...category, icon: "Tag", imageUrl: category.imageUrl ?? "" }); };
  const uploadCategoryImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editing) return;
    setUploadingImage(true); setSaveError("");
    try { setEditing({ ...editing, imageUrl: await onUploadImage(file) }); }
    catch (error) { setSaveError(error instanceof ApiClientError ? error.message : "分类图片上传失败，请重试。"); }
    finally { setUploadingImage(false); event.target.value = ""; }
  };
  const requestDelete = (category: ApiCategory) => { setDeleteError(""); setDeleting(category); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing?.name) { setSaveError("请填写分类名称后再保存。"); return; }
    setSaving(true); setSaveError("");
    try {
      await onSave({ id: editing.id ?? "", parentId: editing.parentId ?? null, name: editing.name, slug: editing.slug ?? "", description: editing.description ?? "", icon: "Tag", imageUrl: editing.imageUrl ?? "", sortOrder: editing.sortOrder ?? 0, isActive: editing.isActive ?? true });
      setEditing(null);
    } catch (error) {
      setSaveError(error instanceof ApiClientError ? error.message : "分类保存失败，请检查填写内容后重试。");
    } finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true); setDeleteError("");
    try {
      await onDelete(deleting);
      setDeleting(null);
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "分类删除失败，请稍后重试。";
      setDeleteError(message === "Delete this category's subcategories first." ? "请先删除该分类下的二级分类。" : message === "Move or remove products assigned to this category before deleting it." ? "该分类仍有关联商品，请先移动或移除这些商品。" : message);
    } finally { setDeletingBusy(false); }
  };
  return <><div className="page-intro intro-actions"><div><p className="eyebrow">目录结构</p><h2>分类管理</h2><p>管理商城导航和商品使用的一级、二级分类。</p></div><button className="primary button-with-icon" onClick={()=>openEditor({parentId:null,isActive:true,sortOrder:(parents.length+1)*10,icon:"Tag"})}><Plus aria-hidden="true" />新增分类</button></div>
    <section className="panel category-admin">{parents.map(parent=><div className="category-admin-group" key={parent.id}><div className="category-admin-row"><span className="category-admin-name"><b>{parent.imageUrl?<img src={parent.imageUrl} alt=""/>:<span>{parent.name.slice(0,1)}</span>}</b><span><strong>{parent.name}</strong><small>/{parent.slug}</small></span></span><span>{categories.filter(c=>c.parentId===parent.id).length} 个二级分类</span><span className={parent.isActive?"category-live":"category-off"}>{parent.isActive?"显示中":"已隐藏"}</span><span><button onClick={()=>openEditor(parent)}>编辑</button><button onClick={()=>openEditor({parentId:parent.id,isActive:true,sortOrder:categories.filter(c=>c.parentId===parent.id).length*10+10,imageUrl:""})}>＋ 二级分类</button><button className="danger-action" onClick={()=>requestDelete(parent)}>删除</button></span></div>{categories.filter(c=>c.parentId===parent.id).map(child=><div className="category-admin-row category-child" key={child.id}><span className="category-admin-name"><b>{child.imageUrl?<img src={child.imageUrl} alt=""/>:<span>{child.name.slice(0,1)}</span>}</b><span><strong>{child.name}</strong><small>/{child.slug}</small></span></span><span>{child.description||"二级分类"}</span><span className={child.isActive?"category-live":"category-off"}>{child.isActive?"显示中":"已隐藏"}</span><span><button onClick={()=>openEditor(child)}>编辑</button><button className="danger-action" onClick={()=>requestDelete(child)}>删除</button></span></div>)}</div>)}</section>
    {editing&&<div className="modal-layer center-modal"><button className="modal-scrim" onClick={()=>setEditing(null)} aria-label="关闭"/><form className="category-modal" onSubmit={save}><div className="drawer-head"><div><p>{editing.id?"编辑分类":"新增分类"}</p><h2>{editing.parentId?"二级分类":"一级分类"}</h2></div><button type="button" onClick={()=>setEditing(null)} aria-label="关闭"><X aria-hidden="true" /></button></div>{saveError&&<div className="auth-error category-save-error" role="alert">{saveError}</div>}<label><span>上级分类</span><select value={editing.parentId??""} onChange={e=>setEditing({...editing,parentId:e.target.value||null})}><option value="">无 — 一级分类</option>{parents.filter(p=>p.id!==editing.id).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label><span>分类名称</span><input required value={editing.name??""} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><label><span>URL 标识</span><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="例如：compressors" value={editing.slug??""} onChange={e=>setEditing({...editing,slug:e.target.value.toLowerCase().replaceAll(/[^a-z0-9-]/g,"")})}/><small>用于商城网址，仅支持小写字母、数字和连字符。</small></label><fieldset className="category-image-field"><legend>分类图片</legend><label className={editing.imageUrl?"category-image-upload has-image":"category-image-upload"}>{editing.imageUrl?<img src={editing.imageUrl} alt="分类图片预览"/>:<span><b>＋</b>{uploadingImage?"正在上传…":"上传分类图片"}</span>}<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={uploadCategoryImage} disabled={uploadingImage}/></label><small>推荐 1200 × 900 px，4:3 比例；支持 JPG、PNG、WebP、AVIF，最大 10 MB。</small>{editing.imageUrl&&<button type="button" className="category-image-remove" onClick={()=>setEditing({...editing,imageUrl:""})}>移除图片</button>}</fieldset><label><span>分类说明</span><input value={editing.description??""} onChange={e=>setEditing({...editing,description:e.target.value})}/></label><div className="form-row"><label><span>排序</span><input type="number" min="0" value={editing.sortOrder??0} onChange={e=>setEditing({...editing,sortOrder:Number(e.target.value)})}/></label><label className="toggle-row"><span>显示</span><input type="checkbox" checked={editing.isActive??true} onChange={e=>setEditing({...editing,isActive:e.target.checked})}/></label></div><div className="drawer-foot category-drawer-foot">{editing.id&&<button type="button" className="danger-button" onClick={()=>{const category=categories.find(item=>item.id===editing.id);if(category){setEditing(null);requestDelete(category)}}}>删除分类</button>}<span/><button type="button" className="outline-button" onClick={()=>setEditing(null)}>取消</button><button className="primary" disabled={saving||uploadingImage}>{saving?"正在保存…":"保存更改"}</button></div></form></div>}
    {deleting&&<div className="modal-layer center-modal"><button className="modal-scrim" onClick={()=>!deletingBusy&&setDeleting(null)} aria-label="关闭删除确认"/><section className="delete-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-category-title"><div className="delete-confirm-icon"><Trash aria-hidden="true" /></div><p className="eyebrow">删除分类</p><h2 id="delete-category-title">确认删除“{deleting.name}”？</h2><p>删除后无法恢复。若分类包含二级分类或仍有关联商品，系统将阻止删除。</p>{deleteError&&<div className="auth-error" role="alert">{deleteError}</div>}<div><button className="outline-button" disabled={deletingBusy} onClick={()=>setDeleting(null)}>取消</button><button className="danger-button danger-button-solid" disabled={deletingBusy} onClick={()=>void confirmDelete()}>{deletingBusy?"正在删除…":"确认删除"}</button></div></section></div>}</>;
}

function BrandManager({ brands, onSave, onDelete }: {
  brands: ApiBrand[];
  onSave: (brand: Omit<ApiBrand, "createdAt" | "updatedAt">) => Promise<void>;
  onDelete: (brand: ApiBrand) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Partial<ApiBrand> | null>(null);
  const [deleting, setDeleting] = useState<ApiBrand | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (editing && !editing.id && editing.name && !editing.slug) {
      const generated = editing.name.toLowerCase().trim().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "") || `brand-${Date.now().toString(36)}`;
      queueMicrotask(()=>setEditing({ ...editing, slug: generated }));
    }
  }, [editing]);
  const sorted = [...brands].sort((a,b)=>a.sortOrder-b.sortOrder||a.name.localeCompare(b.name));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true); setError("");
    try {
      await onSave({
        id: editing.id ?? "",
        name: editing.name ?? "",
        slug: editing.slug ?? "",
        description: editing.description ?? "",
        logoUrl: editing.logoUrl ?? "",
        websiteUrl: editing.websiteUrl ?? "",
        sortOrder: editing.sortOrder ?? 0,
        isActive: editing.isActive ?? true,
      });
      setEditing(null);
    } catch (cause) {
      setError(cause instanceof ApiClientError && cause.code === "BRAND_CONFLICT" ? "品牌名称或 URL 标识已存在。" : cause instanceof Error ? cause.message : "品牌保存失败。");
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true); setError("");
    try { await onDelete(deleting); setDeleting(null); }
    catch (cause) {
      setError(cause instanceof ApiClientError && cause.code === "BRAND_IN_USE" ? "该品牌仍有关联商品，请先修改这些商品的品牌。" : cause instanceof Error ? cause.message : "品牌删除失败。");
    } finally { setBusy(false); }
  };
  return <>
    <div className="page-intro intro-actions"><div><p className="eyebrow">商品资料</p><h2>品牌管理</h2><p>统一维护商品品牌、Logo、官网与商城显示状态。</p></div><button className="primary button-with-icon" onClick={()=>{setError("");setEditing({name:"",slug:"",description:"",logoUrl:"",websiteUrl:"",sortOrder:(brands.length+1)*10,isActive:true})}}><Plus aria-hidden="true" />新增品牌</button></div>
    <section className="panel brand-admin">
      <div className="brand-admin-head"><span>品牌</span><span>资料</span><span>状态</span><span>操作</span></div>
      {sorted.length===0?<div className="empty-state brand-empty"><Trademark aria-hidden="true" /><strong>还没有品牌</strong><span>新增第一个品牌后，商品编辑页即可直接选择。</span></div>:sorted.map(brand=><div className="brand-admin-row" key={brand.id}><div className="brand-identity">{brand.logoUrl?<img src={brand.logoUrl} alt=""/>:<span>{brand.name.slice(0,2).toUpperCase()}</span>}<div><strong>{brand.name}</strong><small>/{brand.slug}</small></div></div><div><strong>{brand.description||"暂无说明"}</strong><small>{brand.websiteUrl||"未设置官网"}</small></div><span className={brand.isActive?"category-live":"category-off"}>{brand.isActive?"使用中":"已停用"}</span><div className="brand-actions"><button onClick={()=>{setError("");setEditing(brand)}}>编辑</button><button className="danger-action" onClick={()=>{setError("");setDeleting(brand)}}>删除</button></div></div>)}
    </section>
    {editing&&<div className="modal-layer center-modal"><button className="modal-scrim" onClick={()=>!busy&&setEditing(null)} aria-label="关闭"/><form className="category-modal brand-modal" onSubmit={save}><div className="drawer-head"><div><p>{editing.id?"编辑品牌":"新增品牌"}</p><h2>{editing.name||"创建品牌资料"}</h2></div><button type="button" onClick={()=>setEditing(null)}><X aria-hidden="true" /></button></div>{error&&<div className="auth-error category-save-error">{error}</div>}<label><span>品牌名称</span><input required value={editing.name??""} onChange={e=>{const name=e.target.value;setEditing({...editing,name,slug:editing.id?editing.slug:name.toLowerCase().trim().replaceAll(/[^a-z0-9]+/g,"-").replaceAll(/^-|-$/g,"")})}} placeholder="例如：CUC Supply"/></label><label><span>URL 标识</span><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={editing.slug??""} onChange={e=>setEditing({...editing,slug:e.target.value.toLowerCase().replaceAll(/[^a-z0-9-]/g,"")})}/></label><label><span>品牌说明</span><textarea value={editing.description??""} onChange={e=>setEditing({...editing,description:e.target.value})} placeholder="品牌定位或产品范围"/></label><div className="form-row"><label><span>Logo 图片地址</span><input type="url" value={editing.logoUrl??""} onChange={e=>setEditing({...editing,logoUrl:e.target.value})} placeholder="https://..."/></label><label><span>品牌官网</span><input type="url" value={editing.websiteUrl??""} onChange={e=>setEditing({...editing,websiteUrl:e.target.value})} placeholder="https://..."/></label></div><div className="form-row"><label><span>排序</span><input type="number" min="0" value={editing.sortOrder??0} onChange={e=>setEditing({...editing,sortOrder:Number(e.target.value)})}/></label><label className="toggle-row"><span>允许商品使用</span><input type="checkbox" checked={editing.isActive??true} onChange={e=>setEditing({...editing,isActive:e.target.checked})}/></label></div><div className="drawer-foot"><button type="button" className="outline-button" onClick={()=>setEditing(null)}>取消</button><button className="primary" disabled={busy}>{busy?"正在保存…":"保存品牌"}</button></div></form></div>}
    {deleting&&<div className="modal-layer center-modal"><button className="modal-scrim" onClick={()=>!busy&&setDeleting(null)} aria-label="关闭"/><section className="delete-confirm"><div className="delete-confirm-icon"><Trash aria-hidden="true" /></div><p className="eyebrow">删除品牌</p><h2>确认删除“{deleting.name}”？</h2><p>若仍有商品使用该品牌，系统会阻止删除。可改为停用品牌以保留历史资料。</p>{error&&<div className="auth-error">{error}</div>}<div><button className="outline-button" disabled={busy} onClick={()=>setDeleting(null)}>取消</button><button className="danger-button danger-button-solid" disabled={busy} onClick={()=>void remove()}>{busy?"正在删除…":"确认删除"}</button></div></section></div>}
  </>;
}

function CustomersManager({list,tags,segments,onOpen,onSave,onNote,onCreateTag,onViewOrders}:{onViewOrders:(query:string)=>void;list:AdminListState<ApiAdminCustomer>;tags:ApiCustomerTag[];segments:ApiCustomerSegment[];onOpen:(id:string)=>Promise<ApiCustomerDetail>;onSave:(customer:ApiCustomerDetail)=>Promise<void>;onNote:(id:string,content:string)=>Promise<void>;onCreateTag:(name:string)=>Promise<void>}){
  const [tab,setTab]=useState<"customers"|"segments">("customers");const [selected,setSelected]=useState<ApiCustomerDetail|null>(null);const [loadingDetail,setLoadingDetail]=useState(false);const [note,setNote]=useState("");const [editing,setEditing]=useState(false);const [newTag,setNewTag]=useState("");
  const filtered=list.loading||list.error?[]:list.data?.items??[];
  const [detailError,setDetailError]=useState(""),[detailId,setDetailId]=useState(""),[savingCustomer,setSavingCustomer]=useState(false),[savingNote,setSavingNote]=useState(false);
  const detailRequest=useRef(0);
  const open=async(id:string)=>{const request=++detailRequest.current;setDetailId(id);setLoadingDetail(true);setDetailError("");const url=new URL(window.location.href);url.searchParams.set("section","customers");url.searchParams.set("customer",id);url.searchParams.delete("q");window.history.replaceState(null,"",url);try{const detail=await onOpen(id);if(request===detailRequest.current)setSelected(detail)}catch{if(request===detailRequest.current)setDetailError("无法加载客户详情，请重试。")}finally{if(request===detailRequest.current)setLoadingDetail(false)}};
  useEffect(()=>{const id=new URLSearchParams(window.location.search).get("customer");if(id)void open(id);return()=>{detailRequest.current++}},[]);
  const backToCustomers=()=>{detailRequest.current++;setSelected(null);setEditing(false);setLoadingDetail(false);setDetailError("");setNote("");const url=new URL(window.location.href);url.searchParams.delete("customer");url.searchParams.set("section","customers");window.history.replaceState(null,"",url)};
  const toggleTag=(tag:ApiCustomerTag)=>selected&&setSelected({...selected,tags:selected.tags.some(item=>item.id===tag.id)?selected.tags.filter(item=>item.id!==tag.id):[...selected.tags,tag]});
  if(selected)return <div className="customer-detail-page crm-workspace"><div className="customer-detail-top"><button aria-label="返回客户列表" onClick={backToCustomers}><CaretLeft aria-hidden="true"/></button><div className="customer-avatar">{selected.displayName.slice(0,2).toUpperCase()}</div><div><p className="eyebrow">客户详情</p><h2 translate="no">{selected.displayName}</h2></div><span className={selected.status==="active"?"customer-active":"customer-disabled"}>{selected.status==="active"?"账号正常":"已停用"}</span><button className="outline-button" disabled={savingCustomer} onClick={()=>{if(editing){setEditing(false);void open(selected.id)}else setEditing(true)}}>{editing?"取消编辑":"编辑客户"}</button>{editing&&<button className="primary" disabled={savingCustomer} onClick={async()=>{setSavingCustomer(true);setDetailError("");try{await onSave(selected);setEditing(false);setSelected(await onOpen(selected.id))}catch(reason){setDetailError(reason instanceof Error?reason.message:"保存失败，请重试。")}finally{setSavingCustomer(false)}}}>{savingCustomer?"正在保存…":"保存更改"}</button>}</div>{detailError&&<p className="crm-error" role="alert">{detailError}</p>}<CustomerValueOverview customer={selected}/><div className="customer-detail-grid"><div className="customer-detail-main"><CustomerPurchasePanels customer={selected} onOrders={onViewOrders}/><section className="customer-card timeline-card"><h3>客户跟进记录</h3><div className="timeline-compose"><div className="customer-avatar">{selected.displayName.slice(0,2).toUpperCase()}</div><textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} placeholder="记录客户需求、常用规格、沟通结果或下次跟进事项，仅员工可见…"/><button disabled={!note.trim()||savingNote} onClick={async()=>{setSavingNote(true);setDetailError("");try{await onNote(selected.id,note.trim());setNote("");setSelected(await onOpen(selected.id))}catch(reason){setDetailError(reason instanceof Error?reason.message:"备注保存失败，请重试。")}finally{setSavingNote(false)}}}>{savingNote?"正在保存…":"添加备注"}</button></div><div className="customer-timeline">{selected.timeline.map(item=><article key={item.id}><i/><div><b>{item.eventType==="staff.note"?(item.authorName||"管理员")+" 添加备注":item.content}</b>{item.eventType==="staff.note"&&<p>{item.content}</p>}<span>{new Date(item.createdAt).toLocaleString("zh-CN")}</span></div></article>)}</div></section></div><aside className="customer-detail-side"><section className="customer-card"><h3>联系信息</h3>{editing?<><label><span>姓名</span><input value={selected.displayName} onChange={e=>setSelected({...selected,displayName:e.target.value})}/></label><label><span>邮箱</span><input value={selected.email??""} onChange={e=>setSelected({...selected,email:e.target.value})}/></label><label><span>电话</span><input value={selected.phone} onChange={e=>setSelected({...selected,phone:e.target.value})}/></label><label><span>公司</span><input value={selected.company} onChange={e=>setSelected({...selected,company:e.target.value})}/></label></>:<><a href={`mailto:${selected.email??""}`}>{selected.email||"未填写邮箱"}</a><p>{selected.phone||"未填写电话"}</p><p>{selected.company||"个人客户"}</p></>}<h4>默认地址</h4>{selected.addresses.find(item=>item.isDefault)?<address>{(()=>{const a=selected.addresses.find(item=>item.isDefault)!;return <>{a.recipientName}<br/>{a.addressLine1}<br/>{a.city}, {a.state} {a.postalCode}<br/>{a.country}</>})()}</address>:<p>暂无地址</p>}<h4>营销订阅</h4>{editing?<div className="customer-checks"><label><input type="checkbox" checked={selected.emailSubscribed} onChange={e=>setSelected({...selected,emailSubscribed:e.target.checked})}/>邮件</label><label><input type="checkbox" checked={selected.smsSubscribed} onChange={e=>setSelected({...selected,smsSubscribed:e.target.checked})}/>短信</label><label><input type="checkbox" checked={selected.whatsappSubscribed} onChange={e=>setSelected({...selected,whatsappSubscribed:e.target.checked})}/>WhatsApp</label></div>:<p>{[selected.emailSubscribed&&"邮件",selected.smsSubscribed&&"短信",selected.whatsappSubscribed&&"WhatsApp"].filter(Boolean).join("、")||"未订阅"}</p>}<h4>税务设置</h4>{editing?<label className="customer-check"><input type="checkbox" checked={selected.taxExempt} onChange={e=>setSelected({...selected,taxExempt:e.target.checked})}/>免税客户</label>:<p>{selected.taxExempt?`免税 ${selected.taxId}`:"正常计税"}</p>}</section><section className="customer-card"><h3>会员与余额</h3><p>会员等级 <strong>{selected.tierName}</strong></p><p>账号创建 {customerDate(selected.createdAt)}</p><p className="crm-card-note">CUC Rewards 可用余额 ${(selected.cashbackCents/100).toFixed(2)}</p><h4>独立门店额度</h4>{editing?<input type="number" min="0" step="0.01" value={selected.storeCreditCents/100} onChange={e=>setSelected({...selected,storeCreditCents:Math.round(Number(e.target.value)*100)})}/>:<b>${(selected.storeCreditCents/100).toFixed(2)}</b>}</section><section className="customer-card customer-tags-card"><h3>客户标签</h3><p className="crm-card-note">用于记录客户类型、采购需求与维护重点。</p><div>{(editing?tags:selected.tags).map(tag=><button type="button" className={selected.tags.some(item=>item.id===tag.id)?"active":""} disabled={!editing} onClick={()=>editing&&toggleTag(tag)} key={tag.id}>{tag.name}</button>)}</div>{editing&&<form onSubmit={async e=>{e.preventDefault();if(!newTag.trim())return;await onCreateTag(newTag.trim());setNewTag("")}}><input value={newTag} onChange={e=>setNewTag(e.target.value)} placeholder="新建标签"/><button>＋</button></form>}</section></aside></div></div>;
  return <div className="crm-workspace"><div className="page-intro intro-actions"><div><p className="eyebrow">客户关系</p><h2>{tab==="customers"?"客户管理":"客户分群"}</h2><p>打开客户档案，了解消费、购买偏好与跟进记录。</p></div><div className="customer-tabs"><button className={tab==="customers"?"active":""} onClick={()=>setTab("customers")}>客户列表</button><button className={tab==="segments"?"active":""} onClick={()=>setTab("segments")}>客户标签与分群</button></div></div>{detailError&&<p className="crm-error" role="alert">{detailError} <button onClick={()=>void open(detailId)}>重试</button></p>}{loadingDetail&&<div className="data-loading" role="status">正在加载客户详情…</div>}{tab==="customers"?<section className="panel customer-list-panel"><div className="crm-list-toolbar"><label className="crm-list-search"><MagnifyingGlass aria-hidden="true"/><input type="search" aria-label="搜索客户" value={list.search} onChange={event=>list.setSearch(event.target.value)} placeholder="搜索客户姓名、邮箱、电话或公司"/></label><label>账号状态<select aria-label="客户账号状态" value={list.filters.status} onChange={event=>list.change("status",event.target.value)}><option value="">全部账号</option><option value="active">正常</option><option value="disabled">已停用</option></select></label><button onClick={list.reload} disabled={list.loading}><ArrowClockwise aria-hidden="true"/>刷新列表</button></div><ListStatus list={list}/><div className="table-scroll"><table className="customer-table"><thead><tr><th>客户</th><th>订阅</th><th>所在地</th><th>标签</th><th>有效订单</th><th>净实付金额</th><th>客户档案</th></tr></thead><tbody>{filtered.map(customer=><tr key={customer.id} className="crm-clickable-row" onClick={event=>{if(!(event.target as HTMLElement).closest("a,button,input,select"))void open(customer.id)}}><td><div className="customer-name-cell"><span>{customer.displayName.slice(0,2).toUpperCase()}</span><div><button className="crm-name-link" translate="no" disabled={loadingDetail} onClick={()=>void open(customer.id)}>{customer.displayName}<CaretRight aria-hidden="true"/></button><small>{customer.email||`@${customer.username}`}</small></div></div></td><td><em className={customer.emailSubscribed?"subscribed":"not-subscribed"}>{customer.emailSubscribed?"已订阅":"未订阅"}</em></td><td>{customer.location}</td><td><div className="table-tags">{customer.tags.slice(0,2).map(tag=><i key={tag.id}>{tag.name}</i>)}</div></td><td><b>{customer.validOrderCount}</b><small className="crm-list-meta">共 {customer.orderCount} 笔记录</small></td><td><b>${(customer.amountSpentCents/100).toFixed(2)}</b>{customer.refundedCents>0&&<small className="crm-list-meta">已退款 ${(customer.refundedCents/100).toFixed(2)}</small>}</td><td><button className="crm-open-button" disabled={loadingDetail} onClick={()=>void open(customer.id)}>查看档案 <ArrowRight aria-hidden="true"/></button></td></tr>)}</tbody></table></div><div className="crm-list-footer"><ListPagination list={list}/><label>每页<select aria-label="每页客户数量" value={list.filters.page_size} onChange={event=>list.change("page_size",event.target.value)}>{[25,50,100].map(value=><option value={value} key={value}>{value} 位</option>)}</select></label></div></section>:<section className="panel segment-panel"><div className="customer-search"><MagnifyingGlass aria-hidden="true"/><span>客户分群</span><span>{segments.length} 个分群</span></div><div className="segment-head"><span>名称</span><span>客户占比</span><span>客户数</span><span>创建者</span></div>{segments.map(segment=><article key={segment.id}><div><UsersThree aria-hidden="true"/><b>{segment.ruleKey==="ordered_once"?"仅一笔有效订单":segment.ruleKey==="repeat_customer"?"复购客户":segment.ruleKey==="never_ordered"?"暂无有效成交":segment.name}</b></div><span>{segment.customerPercent}%</span><span>{segment.customerCount}</span><span>{segment.createdBy}</span></article>)}</section>}<p className="crm-card-note">净实付以本站成功付款减已完成退款计算，含税费与运费；Rewards 抵扣另列。</p></div>;
}

function useDialogFocus(selector:string,onClose:()=>void){
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const dialog=document.querySelector<HTMLElement>(selector);if(!dialog)return;const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')).filter(item=>item.getClientRects().length);controls()[0]?.focus();const handle=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();if(!dialog.querySelector<HTMLButtonElement>('button.primary')?.disabled)onClose();return}if(event.key!=="Tab")return;const elements=controls(),first=elements[0],last=elements.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}};dialog.addEventListener("keydown",handle);return()=>{dialog.removeEventListener("keydown",handle);previous?.focus()}},[]);
}

type EditorMedia = ({key:string;kind:"existing";id:string;importIndex?:number}|{key:string;kind:"file";file:File}|{key:string;kind:"source";index:number;url:string})&{selected:boolean};
const newVariant = (index:number,priceCents=0):ApiProduct["variants"][number] => ({title:"Default",sku:"",barcode:"",optionValues:{},priceCents,compareAtPriceCents:null,costCents:null,weightValue:0,weightUnit:"lb",mediaId:null,isActive:true,sortOrder:index,stock:{}});

function ProductDrawer({ token, product, categories, brands, warehouses, onClose, onManageInventory, onSave }: { token:string; product: Product; categories: ApiCategory[]; brands: ApiBrand[]; warehouses: ApiWarehouse[]; onClose: () => void; onManageInventory: () => void; onSave: (product: Product, media: (string|File)[], initialInventory: Record<string, number>, imageAlts:(string|null)[]) => Promise<void> }) {
  useDialogFocus(".product-editor",onClose);
  const [form, setForm] = useState({ ...product, mediaIds: product.mediaIds ?? [] });
  const [details,setDetails]=useState(()=>({slug:product.api?.slug??"",publishingChannels:product.api?.publishingChannels??["online_store"],collections:product.api?.collections??[],tags:product.api?.tags??[],themeTemplate:product.api?.themeTemplate??"default",inventoryTracked:product.api?.inventoryTracked??true,continueSelling:product.api?.continueSelling??false,barcode:product.api?.barcode??"",isPhysical:product.api?.isPhysical??true,returnRestriction:product.api?.returnRestriction??"",shippingClass:product.api?.shippingClass??"parcel" as "parcel"|"freight"|"quote_required",stripeTaxCode:product.api?.stripeTaxCode??"txcd_99999999",weightValue:product.api?.weightValue??0,weightUnit:product.api?.weightUnit??"lb" as "lb"|"oz"|"kg"|"g",packageName:product.api?.packageName??"Store default",countryOfOrigin:product.api?.countryOfOrigin??"",hsCode:product.api?.hsCode??"",seoTitle:product.api?.seoTitle??"",seoDescription:product.api?.seoDescription??"",productType:product.api?.productType??"OEM" as "OEM"|"Universal",description:product.api?.description??product.sourceDescription??"",compareAtPriceCents:product.api?.compareAtPriceCents??null,costCents:product.api?.costCents??null,variants:product.api?.variants?.length?product.api.variants:product.id?[]:[newVariant(0,Math.round(product.price*100))],metafields:product.api?.metafields??{}}));
  const [editorDetails,setEditorDetails]=useState(()=>readProductDetails(product.api?.description??product.sourceDescription??"",product.api?.specifications??{},product.api?.metafields??{}));
  const [mediaItems,setMediaItems]=useState<EditorMedia[]>(()=>[
    ...product.mediaIds.map(id=>({key:`media-${id}`,kind:"existing" as const,id,importIndex:product.importMedia?.find(image=>image.id===id)?.index,selected:true})),
    ...(product.importMedia??[]).filter(image=>!product.mediaIds.includes(image.id)).map(image=>({key:`media-${image.id}`,kind:"existing" as const,id:image.id,importIndex:image.index,selected:false})),
    ...(product.importId?(product.sourceImages??[]).flatMap((image,index)=>image.removed?[]:[{key:`source-${index}`,kind:"source" as const,index,url:image.originalUrl??image.sourceUrl,selected:image.selected}]):[]),
  ]);
  const [previewKey,setPreviewKey]=useState<string|null>(null);
  const [draggingMedia,setDraggingMedia]=useState<string|null>(null);
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.isActive);
  const [initialInventory, setInitialInventory] = useState<Record<string, number>>(() => Object.fromEntries(activeWarehouses.map((warehouse) => [warehouse.id, product.stock[warehouse.id] ?? 0])));
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingMedia,setRemovingMedia]=useState<string|null>(null);
  const [saveError,setSaveError]=useState(product.importSyncError??"");
  const previews = useMemo(() => mediaItems.flatMap(item=>item.kind==="file"?[{key:item.key,url:URL.createObjectURL(item.file)}]:[]), [mediaItems]);
  const mediaUrl=(item:EditorMedia)=>item.kind==="existing"?`${API_BASE_URL}/v1/media/${item.id}/content`:item.kind==="source"?item.url:previews.find(preview=>preview.key===item.key)?.url;
  const previewItem=mediaItems.find(item=>item.key===previewKey);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);
  useEffect(()=>{if(!previewItem)return;const previous=document.activeElement as HTMLElement|null;document.querySelector<HTMLButtonElement>(".editor-image-lightbox button")?.focus();return()=>previous?.focus()},[previewItem?.key]);
  const parents = categories.filter((item) => !item.parentId && item.isActive);
  const children = categories.filter((item) => item.parentId === form.categoryId && item.isActive);
  const addImages = (files: FileList | null) => {
    if (!files) return;
    const allowed = Array.from(files).filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024);
    setMediaItems(current=>[...current,...allowed.slice(0,Math.max(0,12-current.filter(item=>item.selected).length)).map(file=>({key:crypto.randomUUID(),kind:"file" as const,file,selected:true}))]);
  };
  const submit = async (event: FormEvent) => { event.preventDefault(); if(saving)return;setSaving(true);setSaveError(""); try { const chosen=mediaItems.filter(item=>item.selected);const media=await Promise.all(chosen.map(async item=>item.kind==="existing"?item.id:item.kind==="file"?item.file:importSourceImage(token,product.importId!,item.index)));const imageAlts=chosen.map(item=>{const index=item.kind==="source"?item.index:item.kind==="existing"?item.importIndex:undefined;return product.sourceImageAltTexts?.find(alt=>alt.sourceImageIndex===index)?.altText??null});const specifications=specificationRecord(editorDetails.specifications);const apiBase=product.api??({} as ApiProduct);await onSave({...form,api:{...apiBase,...details,specifications,metafields:{...details.metafields,[productDetailsKey]:JSON.stringify(productContent(editorDetails))},priceCents:Math.round(form.price*100),status:statusToApi(form.status),name:form.name,sku:form.sku,brand:form.brand,category:form.category,categoryId:form.categoryId,subcategoryId:form.subcategoryId} as ApiProduct},media,initialInventory,imageAlts); } catch(error){setSaveError(error instanceof Error?error.message:"保存失败，请重试。")} finally { setSaving(false); } };
  const moveMedia=(fromKey:string,toKey:string)=>setMediaItems(current=>{const from=current.findIndex(item=>item.key===fromKey),to=current.findIndex(item=>item.key===toKey);if(from<0||to<0||from===to)return current;const next=[...current];next.splice(to,0,next.splice(from,1)[0]!);return next});
  const removeMedia=async(item:EditorMedia)=>{const index=item.kind==="source"?item.index:item.kind==="existing"?item.importIndex:undefined;if(product.importId&&index!==undefined){setRemovingMedia(item.key);try{await api.removeProductImportImage(token,product.importId,index);setMediaItems(current=>current.filter(media=>media.key!==item.key));setSaveError("")}catch(error){setSaveError(error instanceof Error?error.message:"删除图片失败，请重试。")}finally{setRemovingMedia(null)}}else setMediaItems(current=>current.filter(media=>media.key!==item.key));if(previewKey===item.key)setPreviewKey(null)};
  const setCsv=(key:"tags"|"collections",value:string)=>setDetails({...details,[key]:value.split(",").map(item=>item.trim()).filter(Boolean)});
  const addVariant=()=>setDetails({...details,variants:[...details.variants,newVariant(details.variants.length,details.variants[0]?.priceCents??Math.round(form.price*100))]});
  return <div className="modal-layer product-editor-layer"><form className="product-editor" role="dialog" aria-modal="true" aria-label="商品编辑" onSubmit={submit}>
    <div className="product-editor-bar"><button type="button" aria-label="关闭商品编辑" onClick={onClose}>‹</button><div><p>{product.id?"编辑商品":"新增商品"}</p><h2>{form.name||"未命名商品"}</h2></div><span className={`editor-status status-${form.status.toLowerCase()}`}>{statusLabel[form.status]}</span><button type="button" className="outline-button" onClick={onClose}>取消</button><button className="primary" disabled={saving||(!product.id&&activeWarehouses.length===0)}>{saving?"正在保存…":"保存"}</button></div>
    {saveError&&<p role="alert">{saveError}</p>}<div className="product-editor-scroll"><div className="product-editor-grid"><div className="product-editor-main">
      <section className="editor-card"><label><span>标题</span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="例如：5 匹涡旋压缩机"/></label><label><span>描述</span><div className="rich-toolbar"><b>B</b><i>I</i><u>U</u><span>段落⌄</span><span>≡</span><span>链接</span></div><textarea className="rich-editor" value={details.description} onChange={e=>setDetails({...details,description:e.target.value})} placeholder="描述商品特点、规格和适用场景"/></label><div className="editor-field-title">媒体 <small>最多 12 张，第一张为主图</small></div>
      <div className="product-image-grid">
        {mediaItems.map((item,index)=><div key={item.key} draggable onDragStart={e=>{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",item.key);setDraggingMedia(item.key)}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move"}} onDrop={e=>{e.preventDefault();moveMedia(e.dataTransfer.getData("text/plain"),item.key);setDraggingMedia(null)}} onDragEnd={()=>setDraggingMedia(null)} className={draggingMedia===item.key?"media-dragging":""}>
          <img draggable={false} src={mediaUrl(item)} alt={`放大查看商品图片 ${index+1}`} role="button" tabIndex={0} onClick={()=>setPreviewKey(item.key)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setPreviewKey(item.key)}}} referrerPolicy={item.kind==="source"?"no-referrer":undefined}/>
          <label className="editor-media-select"><input type="checkbox" checked={item.selected} aria-label={`选用图片 ${index+1}`} onChange={e=>{if(e.target.checked&&mediaItems.filter(media=>media.selected).length>=12){setSaveError("最多选用 12 张图片。");return}setMediaItems(current=>current.map(media=>media.key===item.key?{...media,selected:e.target.checked}:media))}}/>选用</label>
          <span>{item.selected?(mediaItems.filter(media=>media.selected).findIndex(media=>media.key===item.key)===0?"主图":"已选用"):"未选用"}</span>
          <button type="button" aria-label={`删除图片 ${index+1}`} title="从商品媒体移除" disabled={removingMedia===item.key} onClick={()=>{void removeMedia(item)}}>×</button>
        </div>)}
        {mediaItems.filter(item=>item.selected).length<12&&<label className="editor-media-add" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addImages(e.dataTransfer.files)}}><strong>＋</strong><span>新增图片</span><input type="file" multiple accept="image/png,image/jpeg,image/webp" aria-label="新增商品图片" onChange={e=>{addImages(e.target.files);e.target.value=""}}/></label>}
      </div>
      <label><span>分类</span><select required value={form.categoryId??""} onChange={e=>{const parent=parents.find(c=>c.id===e.target.value);const first=categories.find(c=>c.parentId===e.target.value&&c.isActive);setForm({...form,categoryId:e.target.value||null,subcategoryId:first?.id??null,category:parent?.name??""})}}><option value="">选择商品分类</option>{parents.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select><small>用于税率、搜索筛选和商城导航。</small></label><label><span>二级分类</span><select required value={form.subcategoryId??""} onChange={e=>setForm({...form,subcategoryId:e.target.value||null})}><option value="">选择二级分类</option>{children.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label></section>
      <section className="editor-card"><h3>商品详情</h3><p className="editor-help">分别编辑概览、亮点、技术参数、应用与包装清单。技术参数与下方可购买的规格独立；原描述保留。</p><ProductDetailsEditor value={editorDetails} onChange={setEditorDetails}/></section>
      <ProductTranslationEditor token={token} productId={product.id}/>
      {details.variants.length===0&&<section className="editor-card"><div className="editor-card-head"><h3>{details.variants.length>0?"商品组信息":"库存"}</h3>{details.variants.length===0&&<label className="switch-label">跟踪库存<input type="checkbox" checked={details.inventoryTracked} onChange={e=>setDetails({...details,inventoryTracked:e.target.checked})}/></label>}</div>{details.variants.length>0?<p className="editor-empty">各规格库存请在下方分别填写；商品组 SKU 仅用于后台识别，顾客下单使用规格 SKU。{product.id&&!product.api?.variants?.length&&"保存后原商品库存会归零，请先把可售数量分配给各规格。"}</p>:activeWarehouses.map(warehouse=><div className="editor-location" key={warehouse.id}><span><b>{warehouse.name}</b><small>{warehouse.code}</small></span>{product.id?<button type="button" onClick={onManageInventory}>{product.stock[warehouse.id]??0} 件 · 管理</button>:<input type="number" min="0" value={initialInventory[warehouse.id]??0} onChange={e=>setInitialInventory({...initialInventory,[warehouse.id]:Math.max(0,Number(e.target.value))})}/>}</div>)}<div className="editor-inline-fields"><label><span>{details.variants.length>0?"商品组 SKU":"SKU"}</span><input required value={form.sku} onChange={e=>setForm({...form,sku:e.target.value.toUpperCase()})}/></label><label><span>条码</span><input value={details.barcode} onChange={e=>setDetails({...details,barcode:e.target.value})}/></label>{details.variants.length===0&&<label className="check-label"><input type="checkbox" checked={details.continueSelling} onChange={e=>setDetails({...details,continueSelling:e.target.checked})}/>缺货时继续销售</label>}</div></section>}
      <section className="editor-card"><h3>特殊退货限制（如适用）</h3><label><span>下单前向客户披露；不排除法定质量救济</span><textarea value={details.returnRestriction} maxLength={1000} onChange={event=>setDetails({...details,returnRestriction:event.target.value})}/></label></section><section className="editor-card"><div className="editor-card-head"><h3>运输</h3><label className="switch-label">实体商品<input type="checkbox" checked={details.isPhysical} onChange={e=>setDetails({...details,isPhysical:e.target.checked})}/></label></div>{details.isPhysical&&<><div className="editor-two"><label><span>配送类别</span><select value={details.shippingClass} onChange={e=>setDetails({...details,shippingClass:e.target.value as typeof details.shippingClass})}><option value="quote_required">需要运费报价</option><option value="parcel">普通配送</option><option value="freight">大件货运</option></select></label><label><span>Stripe Tax Code</span><input value={details.stripeTaxCode} onChange={e=>setDetails({...details,stripeTaxCode:e.target.value})}/></label></div><div className="editor-two"><label><span>包装</span><input value={details.packageName} onChange={e=>setDetails({...details,packageName:e.target.value})}/></label><label><span>发货重量（含包装）</span><div className="weight-input"><input type="number" min="0" step="0.01" value={details.weightValue} onChange={e=>setDetails({...details,weightValue:Number(e.target.value)})}/><select aria-label="重量单位" value={details.weightUnit} onChange={e=>setDetails({...details,weightUnit:e.target.value as typeof details.weightUnit})}><option>lb</option><option>oz</option><option>kg</option><option>g</option></select></div></label></div><div className="editor-two">{[["shipping_length","包装长"],["shipping_width","包装宽"],["shipping_height","包装高"]].map(([key,label])=><label key={key}><span>{label}</span><div className="weight-input"><input aria-label={label} type="number" min="0.01" step="0.01" value={details.metafields[key]??""} onChange={event=>setDetails({...details,metafields:{...details.metafields,[key]:event.target.value}})}/><select aria-label={`${label}单位`} value={details.metafields.shipping_distance_unit||"in"} onChange={event=>setDetails({...details,metafields:{...details.metafields,shipping_distance_unit:event.target.value}})}><option value="in">in</option><option value="cm">cm</option></select></div></label>)}<label><span>每包裹件数</span><input type="number" min="1" step="1" value={details.metafields.shipping_units_per_parcel||"1"} onChange={event=>setDetails({...details,metafields:{...details.metafields,shipping_units_per_parcel:event.target.value}})}/></label></div><p className="editor-hint">填写实际发货包装尺寸，适用于本商品所有规格。规格重量优先于商品重量；默认每件单独打包，多件按每包裹件数报价。</p></>}</section>
      <section className="editor-card"><div className="editor-card-head"><h3>规格与价格</h3><button type="button" className="text-button" onClick={addVariant}>＋ 添加规格</button></div>{product.id&&!product.api?.variants?.length&&details.variants.length>0&&<p className="editor-help">保存后原商品库存会归零，请先把可售数量分配给各规格。</p>}{details.variants.length===0?<div><div className="editor-prices">{details.variants.length===0&&<><label><span>售价</span><div className="money-input"><i>$</i><input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/></div></label><label><span>原价</span><div className="money-input"><i>$</i><input type="number" min="0" step="0.01" value={(details.compareAtPriceCents??0)/100} onChange={e=>setDetails({...details,compareAtPriceCents:Math.round(Number(e.target.value)*100)||null})}/></div></label></>}{details.variants.length===0&&<label><span>成本价</span><div className="money-input"><i>$</i><input aria-label="成本价" type="number" min="0" step="0.01" placeholder="未填写" value={details.costCents===null?"":details.costCents/100} onChange={e=>setDetails({...details,costCents:e.target.value===""?null:Math.round(Number(e.target.value)*100)})}/></div></label>}</div><p className="editor-help">{details.variants.length>0?"请在下方分别填写各规格售价与成本价；商城未选规格时显示在售规格最低价。成本价仅供内部管理。":"成本价仅供内部管理，不向顾客展示。"}</p><p className="editor-help">单一规格可在此填写价格；有多个规格时，点击“添加规格”分别填写。</p></div>:<div className="variant-list">{details.variants.map((variant,index)=><div className="variant-editor" key={variant.id??index}><div className="variant-fields"><label><span>规格名称</span><input required aria-label={`规格 ${index+1} 名称`} value={variant.title} onChange={e=>setDetails({...details,variants:details.variants.map((item,i)=>i===index?{...item,title:e.target.value}:item)})} placeholder="例如 1/2 inch · 100 ft"/></label><label><span>SKU</span><input required aria-label={`规格 ${index+1} SKU`} value={variant.sku} onChange={e=>setDetails({...details,variants:details.variants.map((item,i)=>i===index?{...item,sku:e.target.value.toUpperCase()}:item)})}/></label><label><span>售价 ($)</span><input required aria-label={`规格 ${index+1} 售价`} type="number" min="0.01" step="0.01" value={variant.priceCents/100} onChange={e=>setDetails({...details,variants:details.variants.map((item,i)=>i===index?{...item,priceCents:Math.round(Number(e.target.value)*100)}:item)})}/></label><button type="button" aria-label={`删除规格 ${variant.title}`} disabled={details.variants.length===1} onClick={()=>setDetails({...details,variants:details.variants.filter((_,i)=>i!==index)})}>删除</button></div><div className="variant-stock"><label><span>成本价 ($)</span><input aria-label={`规格 ${index+1} 成本价`} type="number" min="0" step="0.01" placeholder="未填写" value={variant.costCents==null?"":variant.costCents/100} onChange={e=>setDetails({...details,variants:details.variants.map((item,i)=>i===index?{...item,costCents:e.target.value===""?null:Math.round(Number(e.target.value)*100)}:item)})}/></label><label><span>最高运费 ($)</span><input aria-label={`规格 ${index+1} 最高运费`} type="number" min="0" step="0.01" placeholder="未填写" disabled={!variant.id&&!variant.sku} value={variantShippingCost(details.metafields,variant)===null?"":variantShippingCost(details.metafields,variant)!/100} onChange={e=>setDetails({...details,metafields:setVariantShippingCost(details.metafields,variant,e.target.value===""?null:Math.round(Number(e.target.value)*100))})}/></label>{activeWarehouses.map(warehouse=><label key={warehouse.id}><span>{warehouse.name} 库存</span><input aria-label={`${variant.title} ${warehouse.name} 库存`} type="number" min="0" step="1" value={variant.stock?.[warehouse.id]??0} onChange={e=>setDetails({...details,variants:details.variants.map((item,i)=>i===index?{...item,stock:{...item.stock,[warehouse.id]:Math.max(0,Math.floor(Number(e.target.value)))}}:item)})}/></label>)}<label className="check-label"><input type="checkbox" checked={variant.isActive} onChange={e=>setDetails({...details,variants:details.variants.map((item,i)=>i===index?{...item,isActive:e.target.checked}:item)})}/>可供选择</label></div><VariantProfitPreview priceCents={variant.priceCents} costCents={variant.costCents??null} maxShippingCostCents={variantShippingCost(details.metafields,variant)}/></div>)}</div>}</section>
      <ProductRelationsEditor token={token} productId={product.id} ids={readRelatedProductIds(details.metafields[relatedProductsKey])} onChange={ids=>setDetails({...details,metafields:{...details.metafields,[relatedProductsKey]:JSON.stringify(ids)}})}/>
      <section className="editor-card"><h3>搜索引擎列表</h3><label><span>URL Slug</span><input value={details.slug} onChange={e=>setDetails({...details,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-")})} placeholder="product-url"/></label><label><span>页面标题</span><input maxLength={240} value={details.seoTitle} onChange={e=>setDetails({...details,seoTitle:e.target.value})} placeholder={form.name||"商品标题"}/></label><label><span>元描述</span><textarea value={details.seoDescription} onChange={e=>setDetails({...details,seoDescription:e.target.value})}/></label><div className="seo-preview"><b>{details.seoTitle||form.name||"商品标题"}</b><span>/products/{details.slug||"product-url"}</span><p>{details.seoDescription||details.description.slice(0,160)||"添加描述以预览搜索结果。"}</p></div></section>
    </div><aside className="product-editor-side"><section className="editor-card"><label><span>状态</span><select disabled={Boolean(product.importId)} value={form.status} onChange={e=>setForm({...form,status:e.target.value as ProductStatus})}><option value="Published">已上架</option><option value="Draft">草稿</option><option value="Unpublished">已下架</option></select></label></section><section className="editor-card"><h3>发布渠道</h3><label className="check-label"><input type="checkbox" checked={details.publishingChannels.includes("online_store")} onChange={e=>setDetails({...details,publishingChannels:e.target.checked?[...new Set([...details.publishingChannels,"online_store"])]:details.publishingChannels.filter(item=>item!=="online_store")})}/>在线商城</label></section><section className="editor-card"><h3>商品组织</h3><label><span>类型</span><select value={details.productType} onChange={e=>setDetails({...details,productType:e.target.value as typeof details.productType})}><option>OEM</option><option>Universal</option></select></label><label><span>供应商/品牌</span><select value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}><option value="">无品牌</option>{brands.filter(item=>item.isActive||item.name===form.brand).map(item=><option key={item.id}>{item.name}</option>)}</select></label><label><span>集合</span><input value={details.collections.join(", ")} onChange={e=>setCsv("collections",e.target.value)} placeholder="夏季热销, 压缩机"/></label><label><span>标签</span><input value={details.tags.join(", ")} onChange={e=>setCsv("tags",e.target.value)} placeholder="R410A, 商用"/></label></section><section className="editor-card"><label><span>主题模板</span><select value={details.themeTemplate} onChange={e=>setDetails({...details,themeTemplate:e.target.value})}><option value="default">默认商品</option><option value="technical">技术参数商品</option><option value="replacement">替换零件</option></select></label></section></aside></div></div>
  </form>{previewItem&&<div className="editor-image-lightbox" role="dialog" aria-modal="true" aria-label="查看商品大图" onClick={e=>{if(e.target===e.currentTarget)setPreviewKey(null)}} onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();setPreviewKey(null)}}}><button type="button" aria-label="关闭大图" onClick={()=>setPreviewKey(null)}>×</button><img src={mediaUrl(previewItem)} alt="商品大图" referrerPolicy={previewItem.kind==="source"?"no-referrer":undefined}/></div>}</div>;
}

function InventoryModal({ data, onClose, onSave }: { data: { product: Product; warehouse: ApiWarehouse }; onClose: () => void; onSave: (quantity: number, reason: string) => Promise<void> }) {
  useDialogFocus(".inventory-modal",onClose);
  const [saving,setSaving]=useState(false),[error,setError]=useState("");
  const [quantity, setQuantity] = useState(data.product.stock[data.warehouse.id] ?? 0);
  const [reason, setReason] = useState("库存盘点修正");
  return <div className="modal-layer center-modal"><button className="modal-scrim" onClick={onClose} aria-label="关闭库存调整" /><form className="inventory-modal" role="dialog" aria-modal="true" aria-label="库存调整" onSubmit={async e=>{e.preventDefault();if(saving)return;setSaving(true);setError("");try{await onSave(quantity,reason)}catch(reason){setError(reason instanceof Error?reason.message:"调整失败，请重试。")}finally{setSaving(false)}}}><div className="drawer-head"><div><p>库存调整</p><h2>{data.warehouse.name}</h2></div><button type="button" aria-label="关闭" onClick={onClose}>×</button></div><div className="inventory-product"><ProductThumb category={data.product.category} mediaId={data.product.api?.primaryMediaId} name={data.product.name}/><div><strong>{data.product.name}</strong><span>{data.product.sku}</span></div></div><label><span>调整后数量</span><div className="stepper"><button type="button" aria-label="减少数量" onClick={() => setQuantity(Math.max(0, quantity - 1))}>−</button><input aria-label="调整后数量" type="number" min="0" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /><button type="button" aria-label="增加数量" onClick={() => setQuantity(quantity + 1)}>＋</button></div></label><label><span>调整原因</span><select value={reason} onChange={(e) => setReason(e.target.value)}><option>库存盘点修正</option><option>客户退货</option><option>库存损坏</option><option>采购入库</option><option>仓库调拨</option></select></label><div className="drawer-foot"><button type="button" className="outline-button" onClick={onClose}>取消</button>{error&&<p role="alert">{error}</p>}<button className="primary" disabled={saving}>{saving?"正在保存…":"记录调整"}</button></div></form></div>;
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="page-intro"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>;
}

function ProductThumb({ category, mediaId, name }: { category: string; mediaId?: string | null; name?: string }) {
  return <div className={`product-thumb thumb-${category.toLowerCase()} ${mediaId ? "has-image" : ""}`}>{mediaId ? <img src={`${API_BASE_URL}/v1/media/${mediaId}/content`} alt={name ?? "商品图片"}/> : <><i /><b /></>}</div>;
}
