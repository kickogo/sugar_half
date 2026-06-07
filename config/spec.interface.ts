// spec.interface.ts
// 规格配置结构（存储在 goods.specConfig）

export interface SizeOption {
  name: string;  // e.g. "6寸 2-3人份"
  price: number; // e.g. 0, 40, 80
}

export interface PackagingOption {
  name: string;  // e.g. "礼盒", "保冷包"
  price: number;
}

export interface CreamOption {
  name: string;  // e.g. "无需增量", "加奶油1份"
  price: number;
}

export interface SpecConfig {
  size: SizeOption[];
  filling: string[];      // e.g. ["桑椹莓莓", "芋泥啵啵", "布丁燕麦脆"]
  card: string[];        // e.g. ["需要", "不需要"]
  candle: string[];      // e.g. ["数字蜡烛", "长条蜡烛", "无需蜡烛"]
  mention: string[];     // e.g. ["需要", "不需要"]
  packaging: PackagingOption[];
  cream: CreamOption[];
}

// 购物车中存储的已选规格
export interface CartSpec {
  size: string;
  filling: string;
  card: string;
  candle: string;
  mention: string;
  packaging: string;
  cream: string;
}