// order.interface.ts
// 订单结构

export interface OrderItem {
  goodsId: string;      // 商品ID
  name: string;         // 商品名称（冗余，实时从 goods 查）
  spec: string;         // 规格描述（字符串，兼容旧数据）
  unitPrice: number;    // 单价（下单时的快照）
  quantity: number;     // 数量
  imageUrl?: string;    // 商品图片（冗余）
}

export interface Address {
  name: string;         // 收货人姓名
  phone: string;        // 联系电话
  province: string;     // 省
  city: string;         // 市
  district: string;     // 区
  detail: string;       // 详细地址
}

export type OrderStatus =
  | 'PENDING_PAY'    // 待支付
  | 'PAID'           // 已支付
  | 'BAKING'         // 制作中
  | 'SHIPPING'       // 配送中
  | 'FINISHED'       // 已完成
  | 'CANCELLED';     // 已取消

export interface Order {
  _id: string;
  _openid: string;
  items: OrderItem[];   // 订单项列表
  totalPrice: number;   // 订单总价
  address: Address;     // 收货地址
  status: OrderStatus;  // 订单状态
  remark?: string;      // 备注（可选）
  phone: string;       // 联系电话
  createdAt: number;   // 创建时间
  paidAt?: number;     // 支付时间（时间戳）
  updatedAt: number;    // 更新时间
}