// ── Inventory category tree with predefined fields per item type ────

export interface PredefinedField {
  key: string;
  label: string;
  placeholder?: string;
}

export interface InventorySubCategory {
  key: string;
  label: string;
  icon: string;
  predefinedFields?: PredefinedField[];
}

export interface InventoryCategory {
  key: string;
  label: string;
  icon: string;
  children: InventorySubCategory[];
}

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  {
    key: "appliance",
    label: "מוצרי חשמל",
    icon: "🔌",
    children: [
      {
        key: "ac",
        label: "מזגן",
        icon: "❄️",
        predefinedFields: [
          { key: "btu", label: "BTU", placeholder: "12000" },
          { key: "refrigerant", label: "סוג גז", placeholder: "R410A" },
          { key: "filter_type", label: "סוג מסנן", placeholder: "" },
        ],
      },
      {
        key: "washing_machine",
        label: "מכונת כביסה",
        icon: "🫧",
        predefinedFields: [
          { key: "capacity_kg", label: 'קיבולת (ק"ג)', placeholder: "8" },
          { key: "load_type", label: "סוג טעינה", placeholder: "קדמית / עליונה" },
        ],
      },
      {
        key: "dryer",
        label: "מייבש כביסה",
        icon: "💨",
        predefinedFields: [
          { key: "capacity_kg", label: 'קיבולת (ק"ג)', placeholder: "8" },
          { key: "dryer_type", label: "סוג", placeholder: "קונדנסור / משאבת חום" },
        ],
      },
      {
        key: "dishwasher",
        label: "מדיח כלים",
        icon: "🍽️",
        predefinedFields: [
          { key: "place_settings", label: "מכסות", placeholder: "14" },
        ],
      },
      {
        key: "fridge",
        label: "מקרר",
        icon: "🧊",
        predefinedFields: [
          { key: "capacity_liters", label: "נפח (ליטר)", placeholder: "500" },
          { key: "fridge_type", label: "סוג", placeholder: "דו-דלתי / צד-צד / French Door" },
        ],
      },
      {
        key: "oven",
        label: "תנור",
        icon: "🔥",
        predefinedFields: [
          { key: "oven_type", label: "סוג", placeholder: "בנוי / משולב" },
          { key: "capacity_liters", label: "נפח (ליטר)", placeholder: "65" },
        ],
      },
      {
        key: "microwave",
        label: "מיקרוגל",
        icon: "📡",
        predefinedFields: [
          { key: "wattage", label: "הספק (וואט)", placeholder: "1000" },
        ],
      },
      {
        key: "vacuum",
        label: "שואב אבק",
        icon: "🧹",
        predefinedFields: [
          { key: "vacuum_type", label: "סוג", placeholder: "רובוט / אלחוטי / רגיל" },
        ],
      },
    ],
  },
  {
    key: "electronics",
    label: "אלקטרוניקה",
    icon: "📱",
    children: [
      {
        key: "tv",
        label: "טלוויזיה",
        icon: "📺",
        predefinedFields: [
          { key: "screen_size", label: 'גודל מסך (")', placeholder: "55" },
          { key: "resolution", label: "רזולוציה", placeholder: "4K / 8K" },
          { key: "smart_tv", label: "מערכת הפעלה", placeholder: "Google TV / WebOS / Tizen" },
        ],
      },
      {
        key: "computer",
        label: "מחשב",
        icon: "💻",
        predefinedFields: [
          { key: "cpu", label: "מעבד", placeholder: "" },
          { key: "ram", label: "זיכרון (GB)", placeholder: "16" },
          { key: "storage", label: "אחסון", placeholder: "512GB SSD" },
        ],
      },
      {
        key: "phone",
        label: "טלפון",
        icon: "📱",
        predefinedFields: [
          { key: "storage", label: "אחסון (GB)", placeholder: "256" },
          { key: "color", label: "צבע", placeholder: "" },
        ],
      },
      {
        key: "tablet",
        label: "טאבלט",
        icon: "📟",
        predefinedFields: [
          { key: "screen_size", label: 'גודל מסך (")', placeholder: "11" },
          { key: "storage", label: "אחסון (GB)", placeholder: "128" },
        ],
      },
      {
        key: "speaker",
        label: "רמקול / סאונד-בר",
        icon: "🔊",
        predefinedFields: [
          { key: "speaker_type", label: "סוג", placeholder: "סאונד-בר / רמקול חכם / נייד" },
          { key: "connectivity", label: "חיבור", placeholder: "Bluetooth / WiFi / HDMI" },
        ],
      },
      {
        key: "router",
        label: "ראוטר / מודם",
        icon: "📶",
        predefinedFields: [
          { key: "wifi_standard", label: "תקן WiFi", placeholder: "WiFi 6 / WiFi 6E" },
          { key: "isp", label: "ספק", placeholder: "" },
        ],
      },
    ],
  },
  {
    key: "furniture",
    label: "ריהוט",
    icon: "🛋️",
    children: [
      {
        key: "sofa",
        label: "ספה",
        icon: "🛋️",
        predefinedFields: [
          { key: "material", label: "חומר", placeholder: "בד / עור / דמוי עור" },
          { key: "seats", label: "מושבים", placeholder: "3" },
        ],
      },
      {
        key: "bed",
        label: "מיטה",
        icon: "🛏️",
        predefinedFields: [
          { key: "size", label: "גודל", placeholder: "זוגית / יחיד / ילדים" },
          { key: "mattress_type", label: "סוג מזרן", placeholder: "" },
        ],
      },
      {
        key: "table",
        label: "שולחן",
        icon: "🪑",
        predefinedFields: [
          { key: "table_type", label: "סוג", placeholder: "אוכל / סלון / כתיבה" },
          { key: "material", label: "חומר", placeholder: "" },
        ],
      },
      {
        key: "closet",
        label: "ארון",
        icon: "🚪",
        predefinedFields: [
          { key: "closet_type", label: "סוג", placeholder: "בגדים / אחסון / מטבח" },
        ],
      },
    ],
  },
  {
    key: "plumbing",
    label: "אינסטלציה",
    icon: "🚿",
    children: [
      {
        key: "water_heater",
        label: "דוד שמש / חשמל",
        icon: "🌡️",
        predefinedFields: [
          { key: "heater_type", label: "סוג", placeholder: "שמש / חשמל / משולב" },
          { key: "capacity_liters", label: "נפח (ליטר)", placeholder: "150" },
        ],
      },
      {
        key: "water_filter",
        label: "מסנן / בר מים",
        icon: "💧",
        predefinedFields: [
          { key: "filter_type", label: "סוג מסנן", placeholder: "" },
          { key: "replacement_interval", label: "החלפת מסנן", placeholder: "כל 6 חודשים" },
        ],
      },
      {
        key: "toilet",
        label: "אסלה / ברז",
        icon: "🚽",
        predefinedFields: [],
      },
    ],
  },
  {
    key: "outdoor",
    label: "חוץ / גינה",
    icon: "🌳",
    children: [
      {
        key: "grill",
        label: "גריל / מנגל",
        icon: "🔥",
        predefinedFields: [
          { key: "grill_type", label: "סוג", placeholder: "גז / פחם / חשמלי" },
        ],
      },
      {
        key: "garden_tool",
        label: "כלי גינה",
        icon: "🌱",
        predefinedFields: [],
      },
    ],
  },
  {
    key: "other",
    label: "אחר",
    icon: "📦",
    children: [
      {
        key: "general",
        label: "פריט כללי",
        icon: "📦",
        predefinedFields: [],
      },
    ],
  },
];

// Flatten for quick lookup
export function findSubCategory(categoryKey: string, subKey: string): InventorySubCategory | undefined {
  const cat = INVENTORY_CATEGORIES.find((c) => c.key === categoryKey);
  return cat?.children.find((s) => s.key === subKey);
}

export function findCategoryBySubKey(subKey: string): { category: InventoryCategory; sub: InventorySubCategory } | undefined {
  for (const cat of INVENTORY_CATEGORIES) {
    const sub = cat.children.find((s) => s.key === subKey);
    if (sub) return { category: cat, sub };
  }
  return undefined;
}
