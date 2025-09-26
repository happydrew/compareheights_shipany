import { ReactNode } from "react";
import { User } from "./user";

export interface ContextValue {
  showSignModal: boolean;
  setShowSignModal: (show: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  showFeedback: boolean;
  setShowFeedback: (show: boolean) => void;
  promptFromTemplate: string | null;
  setPromptFromTemplate: (prompt: string | null) => void;
}
