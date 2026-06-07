// scoresLog.interface.ts
// 积分变动日志

export type ScoresLogType = 'redeem' | 'add' | 'deduct';

export interface ScoresLog {
  _id: string;
  _openid: string;         // 用户ID
  type: ScoresLogType;     // 变动类型：redeem=兑换, add=增加, deduct=扣除
  title: string;           // 变动说明/商品名
  scoreItemId?: string;    // 关联的积分商品ID（redeem 时有值）
  scoresChange: number;    // 变动积分（负数表示减少）
  currentScores: number;   // 变动后当前积分余额
  createdAt: number;       // 创建时间
}