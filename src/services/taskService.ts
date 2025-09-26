import {
  createTask,
  updateTask,
  getTaskById,
  CreateTaskData,
  UpdateTaskData
} from "@/models/task";
import { getSnowId } from "@/lib/hash";
import { getUserCredits } from "@/services/credit";
import { refundCreditsForFailedGeneration } from "@/lib/credits_service";

// 任务类型枚举
export enum TaskType {
  AIImageEdit = "ai_image_edit",
  AIImageGeneration = "ai_image_generation",
  AITextGeneration = "ai_text_generation",
  AIVideoGeneration = "ai_video_generation",
}

// 任务状态枚举
export enum TaskStatus {
  Pending = "pending",
  Processing = "processing",
  Success = "success",
  Failed = "failed",
  Cancelled = "cancelled",
}

// 第三方服务提供商枚举
export enum ExternalProvider {
  KieAI = "kie.ai",
  OpenAI = "openai",
  Anthropic = "anthropic",
}

/**
 * 创建任务记录
 * @param userUuid 用户UUID
 * @param taskType 任务类型
 * @param creditsConsumed 消耗的积分
 * @param options 可选参数
 */
export async function createTaskRecord(
  userUuid: string,
  taskType: TaskType,
  creditsConsumed: number,
  options: {
    externalTaskId?: string;
    externalProvider?: ExternalProvider;
  } = {}
): Promise<string> {
  try {
    console.log("createTaskRecord: 开始创建任务记录", { userUuid, taskType, creditsConsumed, options });

    // 获取用户当前积分
    const userCredits = await getUserCredits(userUuid);

    const creditsRemaining = Math.max(0, userCredits.left_credits - creditsConsumed);

    // 生成任务ID
    const taskId = `${taskType}_${getSnowId()}`;

    // 创建任务数据
    const taskData: CreateTaskData = {
      id: taskId,
      user_uuid: userUuid,
      task_type: taskType,
      credits_consumed: creditsConsumed,
      credits_remaining: creditsRemaining,
      task_status: TaskStatus.Pending,
      external_task_id: options.externalTaskId,
      external_provider: options.externalProvider,
    };

    console.log("createTaskRecord: 准备插入数据库", { taskData });

    // 创建任务
    const result = await createTask(taskData);
    console.log("createTaskRecord: 数据库插入成功", { result });

    console.log(`任务记录已创建: ${taskId}, 用户: ${userUuid}, 消耗积分: ${creditsConsumed}`);
    return taskId;

  } catch (error) {
    console.error("createTaskRecord: 创建任务记录失败 - 详细错误信息:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : 'No stack',
      userUuid,
      taskType,
      creditsConsumed,
      options
    });
    throw new Error(`创建任务记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 更新任务状态
 * @param taskId 任务ID
 * @param status 新状态
 * @param options 可选参数
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  options: {
    errorMessage?: string;
  } = {}
): Promise<void> {
  try {
    const updateData: UpdateTaskData = {
      task_status: status,
      error_message: options.errorMessage,
    };

    await updateTask(taskId, updateData);

    console.log(`任务状态已更新: ${taskId}, 状态: ${status}`);

  } catch (error) {
    console.error("更新任务状态失败:", error);
    throw new Error("更新任务状态失败");
  }
}

/**
 * 标记任务为处理中
 * @param taskId 任务ID
 */
export async function markTaskAsProcessing(taskId: string): Promise<void> {
  await updateTaskStatus(taskId, TaskStatus.Processing);
}

/**
 * 标记任务为成功
 * @param taskId 任务ID
 */
export async function markTaskAsSuccess(taskId: string): Promise<void> {
  await updateTaskStatus(taskId, TaskStatus.Success);
}

/**
 * 标记任务为失败
 * @param taskId 任务ID
 * @param errorMessage 错误信息
 */
export async function markTaskAsFailed(taskId: string, errorMessage: string): Promise<void> {
  await updateTaskStatus(taskId, TaskStatus.Failed, {
    errorMessage
  });
}

/**
 * 标记任务为失败并退还积分
 * @param taskId 任务ID
 * @param errorMessage 错误信息
 */
export async function markTaskAsFailedWithRefund(taskId: string, errorMessage: string): Promise<void> {
  try {
    // 首先更新任务状态
    await updateTaskStatus(taskId, TaskStatus.Failed, {
      errorMessage
    });

    // 获取任务信息以进行退款
    const task = await getTaskById(taskId);
    if (!task) {
      console.error(`Task not found for refund: ${taskId}`);
      return;
    }

    // 只对AI图片相关任务进行退款
    if (task.task_type === TaskType.AIImageEdit || task.task_type === TaskType.AIImageGeneration) {
      console.log(`Processing refund for failed task: ${taskId}, credits: ${task.credits_consumed}`);

      // 退还积分
      const refundSuccess = await refundCreditsForFailedGeneration(
        task.user_uuid,
        task.credits_consumed,
        taskId,
        errorMessage
      );

      if (refundSuccess) {
        console.log(`Successfully refunded ${task.credits_consumed} credits for failed task ${taskId}`);
      } else {
        console.error(`Failed to refund credits for task ${taskId}. Manual intervention may be required.`);
      }
    } else {
      console.log(`No refund needed for task type: ${task.task_type}`);
    }

  } catch (error) {
    console.error(`Error in markTaskAsFailedWithRefund for task ${taskId}:`, error);
    // 即使退款失败，也要确保任务状态已更新
    // 任务状态更新在上面已经完成，这里只记录退款失败的日志
  }
}

/**
 * 标记任务为取消
 * @param taskId 任务ID
 */
export async function markTaskAsCancelled(taskId: string): Promise<void> {
  await updateTaskStatus(taskId, TaskStatus.Cancelled);
}