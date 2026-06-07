// cart.interface.ts
import { CartSpec } from './spec.interface';

export interface CartItem {
  _id: string;
  _openid: string;
  goodsId: string;        // 商品ID（关联 goods._id）
  spec: CartSpec;         // 已选规格（对象，不再是字符串）
  quantity: number;       // 数量
  checked: boolean;       // 是否选中（前端状态，不存数据库）
  createdAt: number;      // 创建时间
  updatedAt: number;      // 更新时间

  // 以下字段冗余，应从 goods 表实时获取，暂保留兼容旧数据
  name?: string;
  imageUrl?: string;
  price?: number;
}