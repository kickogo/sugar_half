// scoresStore.interface.ts
// 积分商城商品

export interface ScoresStoreItem {
  _id: string;
  title: string;          // 商品标题
  desc: string;           // 商品描述/详情
  imageUrl: string;       // 商品图片
  requiredScores: number; // 所需积分
  stock: number;          // 库存数量
  redeemCount: number;    // 已兑换次数
  status: number;         // 1=上架 0=下架
  expireTime?: number;    // 过期时间（时间戳），可选
  createdAt: number;      // 创建时间
  updatedAt: number;      // 更新时间
}