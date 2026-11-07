export type BaseUnit = 'g' | 'ml' | '個';

export interface PurchaseUnit {
    value: string;
    label: string;
    dimension: 'weight' | 'volume' | 'count' | 'package';
    baseUnit?: BaseUnit;
    defaultRate?: number;
}

export const UNIT_GROUP_LABELS: Record<PurchaseUnit['dimension'], string> = {
    weight: '重量單位',
    volume: '容量單位',
    count: '計數單位',
    package: '包裝單位（自行設定換算量）',
};

// Rates are the amount of base units in one purchase unit. Package/container
// units intentionally have no rate: the merchant must enter the pack size.
export const PURCHASE_UNITS: PurchaseUnit[] = [
    { value: 'mg', label: '毫克 (mg)', dimension: 'weight', baseUnit: 'g', defaultRate: 0.001 },
    { value: 'g', label: '公克 (g)', dimension: 'weight', baseUnit: 'g', defaultRate: 1 },
    { value: 'kg', label: '公斤 (kg)', dimension: 'weight', baseUnit: 'g', defaultRate: 1000 },
    { value: '台兩', label: '台兩', dimension: 'weight', baseUnit: 'g', defaultRate: 37.5 },
    { value: '台斤', label: '台斤（600g）', dimension: 'weight', baseUnit: 'g', defaultRate: 600 },
    { value: '市斤', label: '市斤（500g）', dimension: 'weight', baseUnit: 'g', defaultRate: 500 },
    { value: 'oz', label: '盎司 (oz)', dimension: 'weight', baseUnit: 'g', defaultRate: 28.3495 },
    { value: 'lb', label: '磅 (lb)', dimension: 'weight', baseUnit: 'g', defaultRate: 453.5924 },
    { value: 'ml', label: '毫升 (ml)', dimension: 'volume', baseUnit: 'ml', defaultRate: 1 },
    { value: 'cl', label: '厘升 (cl)', dimension: 'volume', baseUnit: 'ml', defaultRate: 10 },
    { value: 'dl', label: '分升 (dl)', dimension: 'volume', baseUnit: 'ml', defaultRate: 100 },
    { value: 'L', label: '公升 (L)', dimension: 'volume', baseUnit: 'ml', defaultRate: 1000 },
    { value: 'fl oz', label: '液量盎司 (fl oz)', dimension: 'volume', baseUnit: 'ml', defaultRate: 29.5735 },
    { value: '加侖', label: '美制加侖', dimension: 'volume', baseUnit: 'ml', defaultRate: 3785.4118 },
    { value: '個', label: '個（可自訂內容量）', dimension: 'package' },
    { value: '隻', label: '隻', dimension: 'count', baseUnit: '個', defaultRate: 1 },
    { value: '顆', label: '顆', dimension: 'count', baseUnit: '個', defaultRate: 1 },
    { value: '片', label: '片（可自訂內容量）', dimension: 'package' },
    { value: '塊', label: '塊（可自訂內容量）', dimension: 'package' },
    { value: '份', label: '份（可自訂內容量）', dimension: 'package' },
    { value: '支', label: '支', dimension: 'count', baseUnit: '個', defaultRate: 1 },
    { value: '條', label: '條', dimension: 'count', baseUnit: '個', defaultRate: 1 },
    { value: '粒', label: '粒', dimension: 'count', baseUnit: '個', defaultRate: 1 },
    { value: '打', label: '打（12個）', dimension: 'count', baseUnit: '個', defaultRate: 12 },
    { value: '盒', label: '盒', dimension: 'package' },
    { value: '包', label: '包', dimension: 'package' },
    { value: '袋', label: '袋', dimension: 'package' },
    { value: '瓶', label: '瓶', dimension: 'package' },
    { value: '罐', label: '罐', dimension: 'package' },
    { value: '桶', label: '桶', dimension: 'package' },
    { value: '箱', label: '箱', dimension: 'package' },
    { value: '捲', label: '捲', dimension: 'package' },
    { value: '組', label: '組', dimension: 'package' },
];

export const BASE_UNITS: { value: BaseUnit; label: string }[] = [
    { value: 'g', label: '重量－公克 (g)' },
    { value: 'ml', label: '容量－毫升 (ml)' },
    { value: '個', label: '計數－個' },
];

export function normalizeBaseUnit(unit: string): BaseUnit {
    const normalized = unit.trim().toLowerCase();
    if (/(公斤|公克|台斤|市斤|台兩|kg|mg|\bg\b|克|斤|兩|lb|oz)/i.test(normalized)) return 'g';
    if (/(毫升|公升|ml|\bl\b|cc|c\.c\.|加侖|fl\s*oz)/i.test(normalized)) return 'ml';
    return '個';
}

export function baseUnitFactor(unit: string): number {
    const normalized = unit.trim().toLowerCase();
    if (/(公斤|kg)/.test(normalized)) return 1000;
    if (/(台斤)/.test(normalized)) return 600;
    if (/(市斤)/.test(normalized)) return 500;
    if (/(台兩)/.test(normalized)) return 37.5;
    if (/(公升|\bl\b)/.test(normalized)) return 1000;
    return 1;
}

export function conversionRateForBase(unit: PurchaseUnit, materialUnit: string): number {
    return (unit.defaultRate || 1) / baseUnitFactor(materialUnit);
}

export function unitsForBase(baseUnit: string): PurchaseUnit[] {
    const normalized = normalizeBaseUnit(baseUnit);
    return PURCHASE_UNITS.filter((unit) => !unit.baseUnit || unit.baseUnit === normalized);
}
