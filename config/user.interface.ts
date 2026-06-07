// user.interface.ts
export interface User {
  _id: string;
  _openid: string;
  createdAt: number;     // 创建时间
  updatedAt: number;     // 更新时间
  isVIP: boolean;        // 是否VIP会员
  nickName: string;      // 昵称
  scores: number;        // 积分余额
  phone?: string;        // 联系电话（可选）
  avatarUrl?: string;    // 头像URL（可选）
}