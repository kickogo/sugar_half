// goods.interface.ts
import { SpecConfig } from './spec.interface';

export interface Goods {
  _id: string;
  name: string;           // 商品名称
  price: number;          // 基础价格
  imageUrl: string;       // 商品图片（云存储ID）
  status: number;         // 1=上架 0=下架
  isRecommend: boolean;   // 是否推荐
  buyCount: number;       // 购买次数
  category: string;       // 分类ID
  desc: string;           // 商品描述（由 tag 重命名而来）
  specConfig: SpecConfig; // 规格配置（从数据库读取，不再硬编码前端）
  createdAt?: number;     // 创建时间
  updatedAt?: number;     // 更新时间
}