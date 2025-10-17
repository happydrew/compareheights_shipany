import { ReactNode } from "react";
import { User } from "./user";

export interface ContextValue {
  showSignModal: boolean;
  setShowSignModal: (show: boolean) => void;
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  showFeedback: boolean;
  setShowFeedback: (show: boolean) => void;
  promptFromTemplate: string | null;
  setPromptFromTemplate: (prompt: string | null) => void;
  // 订阅状态：true = 付费订阅用户（可无水印导出），false = 未登录或免费用户
  isPaidSubscriber: boolean;
}
