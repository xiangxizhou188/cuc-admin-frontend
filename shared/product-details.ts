type DetailSection = "overview" | "features" | "specifications" | "applications" | "included";

const sectionNames: Record<string, DetailSection> = {
  overview: "overview",
  "概览": "overview", "概述": "overview", "resumen": "overview",
  features: "features",
  "特点": "features", "特性": "features", "características": "features",
  specifications: "specifications",
  "规格": "specifications", "规格参数": "specifications", "especificaciones": "specifications",
  applications: "applications",
  "应用": "applications", "用途": "applications", "aplicaciones": "applications",
  "what's included": "included",
  "包装内容": "included", "包装包含": "included", "包含物品": "included", "包含": "included", "contenido de la caja": "included",
};

const numberWords: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
};

function lines(text: string) {
  return text.split(/\r?\n/).map(line => line.trim().replace(/^[-•]\s*/, "")).filter(Boolean);
}

function specKey(label: string) {
  const normalized = label.toLowerCase().replace(/\s*\([^)]*\)$/, "").replace(/^item /, "").replace(/ type$/, "").replace(/^outside /, "outer ").trim();
  return ({ "颜色": "color", "内径": "inner diameter", "外径": "outer diameter", "长度": "length", "材质": "material", "材料": "material", "重量": "weight", "产品重量（按供货）": "weight", "单位数量": "unit count" } as Record<string, string>)[normalized] ?? normalized;
}

function specLabel(label: string) {
  return ({ "Item Length": "Length", "Item Weight": "Item weight", "Material Type": "Material", "Outside Diameter": "Outer diameter", "Item Dimensions L x W": "Dimensions (L × W)" } as Record<string, string>)[label] ?? label;
}

function shortUnit(value: string) {
  return value.replace(/\bfeet\b/gi, "ft").replace(/\binch(?:es)?\b/gi, "in").replace(/\bpounds\b/gi, "lb");
}

export function buildProductDetails(description: string, specifications: Record<string, string>) {
  const sections = { overview: "", features: "", specifications: "", applications: "", included: "" };
  const matches = [...description.matchAll(/(?:^|\n)\s*(Overview|概览|概述|Resumen|Features|特点|特性|Características|Specifications|规格参数|规格|Especificaciones|Applications|应用|用途|Aplicaciones|What's Included|包装内容|包装包含|包含物品|包含|Contenido de la caja)[:：][ \t]*/gi)];
  if (!matches.length) sections.overview = description.trim();
  else {
    sections.overview = description.slice(0, matches[0]!.index).trim();
    matches.forEach((match, index) => {
      const section = sectionNames[match[1]!.toLowerCase()];
      if (section) sections[section] = description.slice(match.index! + match[0].length, matches[index + 1]?.index ?? description.length).trim();
    });
  }

  const specs = Object.entries(specifications).filter(([, value]) => value.trim()).map(([label, value]) => ({ label: specLabel(label), value }));
  for (const line of lines(sections.specifications)) {
    const match = line.match(/^([^:：]+)[:：]\s*(.+)$/);
    if (match && !specs.some(row => specKey(row.label) === specKey(match[1]!))) specs.push({ label: specLabel(match[1]!), value: match[2]! });
  }
  const order = ["color", "inner diameter", "outer diameter", "length", "material", "weight"];
  specs.sort((a, b) => {
    const left = order.indexOf(specKey(a.label)), right = order.indexOf(specKey(b.label));
    return (left < 0 ? order.length : left) - (right < 0 ? order.length : right);
  });

  const findSpec = (key: string) => specs.find(row => specKey(row.label) === key)?.value;
  const highlights: { value: string; label: string }[] = [];
  for (const [key, label] of [["length", "Length"], ["inner diameter", "Inner diameter"]]) {
    const value = findSpec(key!);
    if (value) highlights.push({ value: shortUnit(value), label:label! });
  }
  const fittings = sections.overview.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+connector fittings?\s*\(([^)]+)\)/i);
  if (fittings) highlights.push({ value: `${numberWords[fittings[1]!.toLowerCase()] ?? fittings[1]} fittings`, label: fittings[2]! });
  const chineseFittings = sections.overview.match(/([一二三四五六七八九十\d]+)个接头(?:配件)?[（(]([^）)]+)[）)]/);
  if (chineseFittings) highlights.push({ value: `${({ 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 } as Record<string, number>)[chineseFittings[1]!] ?? chineseFittings[1]} 个接头`, label: chineseFittings[2]! });
  const weight = findSpec("weight");
  if (weight) highlights.push({ value: shortUnit(weight), label: "Item weight" });
  if (highlights.length < 4) {
    const outer = findSpec("outer diameter");
    if (outer) highlights.push({ value: shortUnit(outer), label: "Outer diameter" });
  }

  return { overview: sections.overview, features: lines(sections.features), applications: sections.applications, included: lines(sections.included), specifications: specs, highlights: highlights.slice(0, 4) };
}

export type ProductDetails = ReturnType<typeof buildProductDetails>;
export type ProductContent = Omit<ProductDetails, "specifications">;
export const productDetailsKey = "product_details";

export function parseProductDetails(value: unknown): ProductDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("商品详情格式无效。");
  const data = value as Record<string, unknown>;
  const text = (value: unknown, max = 12000): string => {
    if (typeof value !== "string" || value.length > max) throw new Error("商品详情文本格式或长度无效。");
    return value.trim();
  };
  const list = (value: unknown): string[] => {
    if (!Array.isArray(value) || value.length > 50) throw new Error("商品详情最多允许 50 行。");
    return value.map(item => text(item, 2000));
  };
  const rows = (value: unknown, max: number): {value:string;label:string}[] => {
    if (!Array.isArray(value) || value.length > max) throw new Error(`商品详情最多允许 ${max} 行。`);
    return value.map(item => {
      if (!item || typeof item !== "object") throw new Error("商品详情行格式无效。");
      return {value:text(item.value, 1000),label:text(item.label, 240)};
    });
  };
  return {overview:text(data.overview, 50000),applications:text(data.applications),features:list(data.features),included:list(data.included),highlights:rows(data.highlights, 12),specifications:rows(data.specifications, 100)};
}

export function readProductDetails(description: string, specifications: Record<string,string>, metafields: Record<string,string>): ProductDetails {
  if (!metafields[productDetailsKey]) return buildProductDetails(description, specifications);
  return parseProductDetails({...JSON.parse(metafields[productDetailsKey]), specifications:Object.entries(specifications).map(([label,value])=>({label,value}))});
}

export function productContent(details: ProductDetails): ProductContent {
  const {specifications: _specifications, ...content} = details;
  return content;
}

export function specificationRecord(rows: ProductDetails["specifications"]): Record<string,string> {
  const result: Record<string,string> = {};
  const labels = new Set<string>();
  for (const row of rows) {
    const label = row.label.trim(), value = row.value.trim();
    if (!label || !value) throw new Error("请填写技术参数名称和数值，或删除空行。");
    const key = label.toLowerCase();
    if (labels.has(key)) throw new Error("技术参数名称不能重复。");
    labels.add(key);
    Object.defineProperty(result, label, {value, enumerable:true, configurable:true});
  }
  return result;
}
