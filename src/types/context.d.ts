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
}
