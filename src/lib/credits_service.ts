import { getUserCredits, decreaseCredits, increaseCredits, CreditsTransType } from '@/services/credit';
import { getCreditsByUserAndTransType } from '@/models/credit';

/**
 * 检查用户是否有足够的积分
 * @param userId 用户UUID
 * @param requiredCredits 需要的积分数量
 * @returns 是否有足够积分
 */
export async function hasEnoughCredits(userId: string, requiredCredits: number): Promise<boolean> {
  try {
    const userCredits = await getUserCredits(userId);
    return userCredits.left_credits >= requiredCredits;
  } catch (error) {
    console.error('Error checking user credits:', error);
    return false;
  }
}

/**
 * 扣除用户积分
 * @param userId 用户UUID
 * @param credits 要扣除的积分数量
 * @param description 扣除原因描述
 * @returns 是否扣除成功
 */
export async function deductCredits(userId: string, credits: number, description: string): Promise<boolean> {
  try {
    await decreaseCredits({
      user_uuid: userId,
      trans_type: CreditsTransType.AIImageEdit, // 使用AI图片编辑专用类型
      credits: credits
    });
    console.log(`Successfully deducted ${credits} credits from user ${userId} for: ${description}`);
    return true;
  } catch (error) {
    console.error(`Failed to deduct ${credits} credits from user ${userId}:`, error);
    return false;
  }
}

/**
 * 为失败的AI图片生成/编辑退还积分
 * @param userId 用户UUID
 * @param credits 要退还的积分数量
 * @param taskId 相关的任务ID（用于审计跟踪）
 * @param reason 退款原因
 * @returns 是否退款成功
 */
export async function refundCreditsForFailedGeneration(
  userId: string,
  credits: number,
  taskId: string,
  reason: string = 'Generation failed'
): Promise<boolean> {
  try {
    console.log(`Starting credit refund for user ${userId}: ${credits} credits for task ${taskId}`);

    // 查找用户最近的AI图片编辑消耗记录，以获取正确的过期时间和order_no
    let expiredAt: string;
    let orderNo: string;

    const aiImageEditTransactions = await getCreditsByUserAndTransType(
      userId,
      CreditsTransType.AIImageEdit,
      10 // 获取最近10条记录
    );

    if (aiImageEditTransactions && aiImageEditTransactions.length > 0) {
      // 找到第一个消耗记录（负数金额）
      const consumptionRecord = aiImageEditTransactions.find(record =>
        record.credits < 0 && Math.abs(record.credits) === credits
      );

      if (consumptionRecord && consumptionRecord.expired_at && consumptionRecord.order_no) {
        expiredAt = consumptionRecord.expired_at.toISOString();
        orderNo = consumptionRecord.order_no;
        console.log(`Found matching consumption record with expired_at: ${expiredAt}, order_no: ${orderNo}`);
      } else {
        // 如果找不到匹配的消耗记录，使用最新的消耗记录的过期时间
        const latestConsumption = aiImageEditTransactions[0];
        expiredAt = latestConsumption.expired_at?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        orderNo = latestConsumption.order_no || `refund_${taskId}`;
        console.log(`Using latest consumption record with expired_at: ${expiredAt}, order_no: ${orderNo}`);
      }
    } else {
      // 如果找不到任何消耗记录，使用默认的30天后过期
      expiredAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      orderNo = `refund_${taskId}`;
      console.warn(`No AI image edit consumption records found for user ${userId}, using default expiration`);
    }

    await increaseCredits({
      user_uuid: userId,
      trans_type: CreditsTransType.RefundAIImageEdit,
      credits: credits,
      expired_at: expiredAt,
      order_no: orderNo
    });

    console.log(`Successfully refunded ${credits} credits to user ${userId} for task ${taskId}. Reason: ${reason}`);
    console.log(`Refund details: expired_at=${expiredAt}, order_no=${orderNo}`);
    return true;
  } catch (error) {
    console.error(`Failed to refund ${credits} credits to user ${userId} for task ${taskId}:`, error);
    console.error('Refund error details:', {
      userId,
      credits,
      taskId,
      reason,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}