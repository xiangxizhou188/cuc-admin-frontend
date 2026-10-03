export type ApiProductTranslation={locale:"en"|"es"|"zh";name:string;description:string;seo_title:string;seo_description:string;is_manual:number};
export type ProductSaveResult={id:string;translationStatus:"ready"|"unavailable"|"failed"|"limited"|"busy"};
const PRODUCTION_API_BASE_URL = "https://api.cucsupply.com";
const LOCAL_API_BASE_URL = "http://localhost:8787";

export function resolveApiBaseUrl(hostname?: string): string {
  const currentHostname = hostname ?? (typeof window === "undefined" ? "" : window.location.hostname);
  return process.env.NODE_ENV!=="production"&&(currentHostname === "localhost" || currentHostname === "127.0.0.1")
    ? LOCAL_API_BASE_URL
    : PRODUCTION_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "catalog_manager" | "inventory_manager" | "content_editor";
};

export type ApiProduct = {
  translations?: ApiProductTranslation[];
  stock?:Record<string,number>;
  id: string;
  sku: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  categoryId: string | null;
  subcategoryId: string | null;
  productType: "OEM" | "Universal";
  status: "draft" | "published" | "unpublished" | "archived";
  priceCents: number;
  compareAtPriceCents: number | null;
  costCents: number | null;
  description: string;
  specifications: Record<string, string>;
  compatibility: string[];
  downloads: string[];
  primaryMediaId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  media?: { product_id: string; media_id: string; role: "primary" | "detail" | "exploded"; sort_order: number }[];
  mediaIds?: string[];
  translationCount?: number;
  publishingChannels:string[]; collections:string[]; tags:string[]; themeTemplate:string;
  inventoryTracked:boolean; continueSelling:boolean; barcode:string; isPhysical:boolean;
  shippingClass:"parcel"|"freight"|"quote_required"; stripeTaxCode:string;
  weightValue:number; weightUnit:"lb"|"oz"|"kg"|"g"; packageName:string; countryOfOrigin:string; hsCode:string;
  seoTitle:string; seoDescription:string; productOptions:{name:string;values:string[]}[]; metafields:Record<string,string>;
  variants:{id?:string;title:string;sku:string;barcode:string;optionValues:Record<string,string>;priceCents:number;compareAtPriceCents:number|null;weightValue:number;weightUnit:"lb"|"oz"|"kg"|"g";mediaId:string|null;isActive:boolean;sortOrder:number}[];
};

export type ApiCategory = {
  id: string; parentId: string | null; name: string; slug: string; description: string;
  icon: string; imageUrl: string; sortOrder: number; isActive: boolean; createdAt: string; updatedAt: string;
};

export type ApiBrand = {
  id: string; name: string; slug: string; description: string; logoUrl: string;
  websiteUrl: string; sortOrder: number; isActive: boolean; createdAt: string; updatedAt: string;
};

export type ApiInventoryRow = {
  product_id: string;
  sku: string;
  product_name: string;
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;
  quantity: number;
  reorder_point: number;
  updated_at: string;
};

export type ApiWarehouse = {
  id: string;
  code: string;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
};

export type ApiAudit = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  actor_name: string | null;
  created_at: string;
};

export type ApiPageSlot = {
  id: string; page_key: string; slot_key: string; locale: "en" | "es" | "zh";
  heading: string; body: string; link_url: string; media_id: string | null; updated_at: string;
};

export type ApiMembershipTier = { id:string; code:string; name:string; minSpendCents:number; cashbackPercent:number; sortOrder:number; isActive:boolean };
export type ApiMembershipCustomer = { id:string; username:string; email:string|null; displayName:string; status:string; eligibleSpendCents:number; tierCode:string; tierName:string; cashbackPercent:number; availableCents:number; pendingCents:number; lifetimeEarnedCents:number; lastLoginAt:string|null };
export type ApiOrder={id:string;orderNumber:string;customerId:string;customerName:string;username:string;status:"submitted"|"confirmed"|"processing"|"shipped"|"delivered"|"cancelled"|"refunded";checkoutId:string|null;paymentStatus:string;refundedAmountCents:number;totalCents:number;city:string;state:string;createdAt:string};
export type ApiSettings={store_name:string;store_url:string;require_publish_review:string;support_email:string;support_phone:string};
export type ApiCustomerTag={id:string;name:string;color:string;customerCount?:number};
export type ApiAdminCustomer={id:string;username:string;email:string|null;displayName:string;phone:string;company:string;customerType:string;preferredLanguage:string;status:string;emailSubscribed:boolean;smsSubscribed:boolean;whatsappSubscribed:boolean;taxExempt:boolean;taxId:string;storeCreditCents:number;adminNote:string;orderCount:number;amountSpentCents:number;lastOrderAt:string|null;location:string;createdAt:string;lastLoginAt:string|null;tierName:string;cashbackCents:number;tags:ApiCustomerTag[]};
export type ApiCustomerDetail=ApiAdminCustomer&{addresses:{id:string;label:string;recipientName:string;phone:string;addressLine1:string;addressLine2:string;city:string;state:string;postalCode:string;country:string;isDefault:boolean}[];orders:{id:string;orderNumber:string;status:string;totalCents:number;createdAt:string}[];timeline:{id:string;eventType:string;content:string;authorName:string|null;createdAt:string}[]};
export type ApiCustomerSegment={id:string;name:string;ruleKey:string;customerCount:number;customerPercent:number;createdBy:string;createdAt:string};
export type ApiDashboard = {
  generatedAt: string;
  products: { total:number; published:number; draft:number; unpublished:number };
  inventory: { totalQuantity:number; lowStockItems:number; activeWarehouses:number };
  catalog: { expectedTranslations:number; completedTranslations:number; incompleteProducts:number; completenessPercent:number };
  lowStockProducts: { id:string; sku:string; name:string; brand:string; category:string; total_quantity:number; lowest_quantity:number; low_warehouse_count:number }[];
};

type Envelope<T> = { ok: true; data: T };
type ErrorEnvelope = { ok: false; error: { code: string; message: string; details?: unknown; requestId?: string } };

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export type ApiPage<T>={items:T[];pagination:{page:number;page_size:number;total_items:number;total_pages:number;has_previous:boolean;has_next:boolean}};
async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response:Response;
  try{response=await fetch(`${API_BASE_URL}${path}`,{...options,headers})}catch(error){if(options.signal?.aborted)throw error;throw new ApiClientError(0,"NETWORK_ERROR","无法连接服务，请检查网络后重试。")}

  let payload: Envelope<T> | ErrorEnvelope;
  try {
    payload = await response.json() as Envelope<T> | ErrorEnvelope;
  } catch {
    throw new ApiClientError(response.status, "INVALID_RESPONSE", "The API returned an invalid response.");
  }

  if(!payload||typeof payload!=="object"||typeof payload.ok!=="boolean")throw new ApiClientError(502,"INVALID_RESPONSE","服务暂时不可用，请重试。");
  if (!response.ok || !payload.ok) {
    const apiError = "error" in payload ? payload.error : { code: "REQUEST_FAILED", message: "Request failed." };
    if (response.status === 401 && token) {
      window.localStorage.removeItem("neotrix-admin-token");
      window.dispatchEvent(new Event("neotrix-auth-expired"));
    }
    throw new ApiClientError(response.status,apiError?.code??"REQUEST_FAILED",response.status===401?"登录已过期，请重新登录。":response.status===403?"你没有权限执行此操作。":response.status===409?"当前数据状态不允许此操作，请刷新后检查。":response.status>=500?"服务暂时不可用，请重试。":"无法完成操作，请检查输入后重试。");
  }
  if(!("data" in payload)||payload.data===undefined)throw new ApiClientError(502,"INVALID_RESPONSE","服务暂时不可用，请重试。");
  return payload.data;
}

export type ImportSource={title:string|null;brand:string|null;model:string|null;mpn:string|null;sku:string|null;upc:string|null;price:string|null;currency:string|null;description:string|null;specifications:Record<string,string>;images:{sourceUrl:string;originalUrl?:string;selected:boolean;role:"REFERENCE"}[];documents:{sourceUrl:string;title:string|null;role:"REFERENCE"}[]};
export type ProductImportSummary={importId:string;title:string;sourceSite:string;sourceUrl:string;sourceProductId:string|null;sourcePrice:string|null;status:"pending_review"|"rejected"|"draft_created";productId:string|null;createdAt:string};
export type ProductImportDetail=ProductImportSummary&{capturedAt:string;source:unknown;reviewedSource:ImportSource};
export async function importSourceImage(token:string,importId:string,index:number):Promise<File>{
 const response=await fetch(`${API_BASE_URL}/v1/admin/product-imports/${encodeURIComponent(importId)}/images/${index}`,{headers:{Authorization:`Bearer ${token}`},credentials:"omit"});
 if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.error?.message??"无法读取参考图片，请下载后手动上传。");}
 const blob=await response.blob();const extensions:Record<string,string>={"image/webp":"webp","image/jpeg":"jpg","image/png":"png","image/avif":"avif"};
 return new File([blob],`import-${importId}-${index}.${extensions[blob.type]??"bin"}`,{type:blob.type});
}
export const api = {
  productImports:(token:string,query:URLSearchParams)=>request<{items:ProductImportSummary[];page:number;total:number}>(`/v1/admin/product-imports?${query}`,{},token),
  productImport:(token:string,id:string)=>request<ProductImportDetail>(`/v1/admin/product-imports/${encodeURIComponent(id)}`,{},token),
  rejectProductImport:(token:string,id:string)=>request(`/v1/admin/product-imports/${encodeURIComponent(id)}/reject`,{method:"POST"},token),
  list:async<T>(token:string,path:string,params:URLSearchParams,signal?:AbortSignal)=>{
    const data=await request<ApiPage<T>>(`${path}?${params}`,{signal,cache:"no-store"},token);
    if(!Array.isArray(data?.items)||!data.pagination||![data.pagination.page,data.pagination.page_size,data.pagination.total_items,data.pagination.total_pages].every(Number.isSafeInteger))throw new ApiClientError(502,"INVALID_RESPONSE","列表暂时不可用，请重试。");
    return data;
  },
  setupStatus: () => request<{ initialized: boolean }>("/v1/setup/status"),
  bootstrap: (input: { email: string; name: string; password: string; bootstrapToken: string }) =>
    request<ApiUser>("/v1/setup/bootstrap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${input.bootstrapToken}`,
      },
      body: JSON.stringify({ email: input.email, name: input.name, password: input.password }),
    }),
  login: (account: string, password: string) =>
    request<{ token: string; expiresAt: string; user: ApiUser }>("/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: account, password }),
    }),
  me: (token: string) => request<ApiUser>("/v1/auth/me", {}, token),
  dashboard: (token: string) => request<ApiDashboard>("/v1/dashboard", { cache: "no-store" }, token),
  logout: (token: string) => request<{ loggedOut: boolean }>("/v1/auth/logout", { method: "POST" }, token),
  settings:(token:string)=>request<ApiSettings>("/v1/settings",{},token),
  updateSettings:(token:string,input:Partial<ApiSettings>)=>request<ApiSettings>("/v1/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)},token),
  orders:(token:string)=>request<ApiPage<ApiOrder>>("/v1/admin/orders",{},token),
  refundOrder:(token:string,checkoutId:string,body:{amountCents:number;reason:string;requestId:string})=>request<{refundId:string;status:string;amountCents:number}>(`/v1/admin/stripe/checkout/${checkoutId}/refunds`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)},token),
  updateOrderStatus:(token:string,id:string,status:ApiOrder["status"])=>request<{id:string;status:string}>(`/v1/admin/orders/${id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})},token),
  customers:(token:string)=>request<ApiPage<ApiAdminCustomer>>("/v1/admin/customers",{},token),
  customer:(token:string,id:string)=>request<ApiCustomerDetail>(`/v1/admin/customers/${id}`,{},token),
  updateCustomer:(token:string,id:string,input:Partial<ApiCustomerDetail>&{tagIds:string[]})=>request<{id:string}>(`/v1/admin/customers/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)},token),
  addCustomerNote:(token:string,id:string,content:string)=>request<{id:string}>(`/v1/admin/customers/${id}/notes`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content})},token),
  customerTags:(token:string)=>request<ApiCustomerTag[]>("/v1/admin/customer-tags",{},token),
  createCustomerTag:(token:string,input:{name:string;color:string})=>request<ApiCustomerTag>("/v1/admin/customer-tags",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)},token),
  customerSegments:(token:string)=>request<ApiCustomerSegment[]>("/v1/admin/customer-segments",{},token),
  products: (token: string) => request<ApiProduct[]>("/v1/products?limit=100", {}, token),
  categories: (token?: string) => request<ApiCategory[]>(token ? "/v1/categories?includeInactive=true" : "/v1/categories", token ? { cache: "no-store" } : {}, token),
  createCategory: (token: string, category: Omit<ApiCategory, "id" | "createdAt" | "updatedAt">) =>
    request<{ id: string }>("/v1/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(category) }, token),
  updateCategory: (token: string, id: string, category: Partial<Omit<ApiCategory, "id" | "createdAt" | "updatedAt">>) =>
    request<{ id: string }>(`/v1/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(category) }, token),
  deleteCategory: (token: string, id: string) =>
    request<{ id: string; deleted: boolean }>(`/v1/categories/${id}`, { method: "DELETE" }, token),
  brands: (token?: string) => request<ApiBrand[]>(token ? "/v1/brands?includeInactive=true" : "/v1/brands", token ? { cache: "no-store" } : {}, token),
  createBrand: (token: string, brand: Omit<ApiBrand, "id" | "createdAt" | "updatedAt">) =>
    request<{ id: string }>("/v1/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brand) }, token),
  updateBrand: (token: string, id: string, brand: Partial<Omit<ApiBrand, "id" | "createdAt" | "updatedAt">>) =>
    request<{ id: string }>(`/v1/brands/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brand) }, token),
  deleteBrand: (token: string, id: string) =>
    request<{ id: string; deleted: boolean }>(`/v1/brands/${id}`, { method: "DELETE" }, token),
  product: (token:string,id:string)=>request<ApiProduct>(`/v1/products/${id}`,{},token),
  translateProduct:(token:string,id:string)=>request<{translationStatus:ProductSaveResult["translationStatus"]}>(`/v1/products/${id}/translations`,{method:"POST"},token),
  saveProductTranslation:(token:string,id:string,t:ApiProductTranslation)=>request<{saved:boolean}>(`/v1/products/${id}/translations/${t.locale}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:t.name,description:t.description,seoTitle:t.seo_title,seoDescription:t.seo_description})},token),
  createProduct: (token: string, product: Omit<ApiProduct, "id" | "primaryMediaId" | "publishedAt" | "createdAt" | "updatedAt"> & { initialInventory?: Record<string, number>; importId?:string }) =>
    request<ProductSaveResult>("/v1/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    }, token),
  updateProduct: (token: string, id: string, product: Omit<ApiProduct, "id" | "primaryMediaId" | "publishedAt" | "createdAt" | "updatedAt">) =>
    request<ProductSaveResult>(`/v1/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    }, token),
  changeProductStatus: (token: string, id: string, status: ApiProduct["status"]) =>
    request<{ id: string; status: ApiProduct["status"] }>(`/v1/products/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }, token),
  inventory: (token: string) => request<ApiInventoryRow[]>("/v1/inventory?limit=300", {}, token),
  warehouses: (token: string) => request<ApiWarehouse[]>("/v1/warehouses", {}, token),
  createWarehouse: (token: string, warehouse: Pick<ApiWarehouse, "code" | "name" | "location">) =>
    request<{ id: string }>("/v1/warehouses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(warehouse) }, token),
  updateWarehouse: (token: string, id: string, warehouse: Pick<ApiWarehouse, "code" | "name" | "location" | "isActive">) =>
    request<{ id: string }>(`/v1/warehouses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(warehouse) }, token),
  deleteWarehouse: (token: string, id: string) => request<{ id: string; deleted: boolean }>(`/v1/warehouses/${id}`, { method: "DELETE" }, token),
  adjustInventory: (token: string, input: { productId: string; warehouseId: string; delta: number; reason: string }) =>
    request<{ newQuantity: number }>("/v1/inventory/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }, token),
  uploadMedia: (token: string, file: File, purpose: "product" | "page", altText = "") =>
    request<{ id: string }>("/v1/media", {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "X-File-Size": String(file.size),
        "X-Filename": encodeURIComponent(file.name),
        "X-Media-Purpose": purpose,
        "X-Alt-Text": encodeURIComponent(altText),
      },
      body: file,
    }, token),
  pageSlots: (token: string) => request<ApiPageSlot[]>("/v1/page-slots?page=home", {}, token),
  updatePageSlot: (token: string, input: Record<string, unknown>) =>
    request<Record<string, unknown>>("/v1/page-slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }, token),
  auditLogs: (token: string) => request<ApiPage<ApiAudit>>("/v1/audit-logs?page_size=25", {}, token),
  membershipTiers: (token:string) => request<ApiMembershipTier[]>("/v1/admin/membership/tiers",{},token),
  updateMembershipTier: (token:string,id:string,input:{name:string;minSpendCents:number;cashbackPercent:number}) => request<{id:string}>(`/v1/admin/membership/tiers/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)},token),
  membershipCustomers: (token:string) => request<ApiPage<ApiMembershipCustomer>>("/v1/admin/membership/customers",{},token),
  adjustCashback: (token:string,customerId:string,input:{amountCents:number;reason:string}) => request<{id:string;balanceCents:number}>(`/v1/admin/membership/customers/${customerId}/cashback-adjustments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)},token),
  recordCompletedOrder: (token:string,customerId:string,input:{orderNumber:string;eligibleSubtotalCents:number}) => request<{orderId:string;cashbackCents:number;eligibleSpendCents:number}>(`/v1/admin/membership/customers/${customerId}/completed-orders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)},token),
  health: () => request<{ service: string; status: string; mediaStorage: "available" | "unavailable" }>("/health"),
};
