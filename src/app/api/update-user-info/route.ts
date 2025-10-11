import { respData, respErr, respJson } from "@/lib/resp";
import { updateUserProfile } from "@/models/user";
import { getUserUuid } from "@/services/user";

export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respJson(-2, "no auth");
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (error) {
      return respErr("invalid params");
    }

    const { nickname, avatar_url, locale } = body;

    const payload: Partial<{
      nickname: string;
      avatar_url: string;
      locale: string;
    }> = {};

    if (nickname !== undefined) {
      if (typeof nickname !== "string") {
        return respErr("invalid nickname");
      }

      const trimmed = nickname.trim();
      if (!trimmed) {
        return respErr("display name is required");
      }

      payload.nickname = trimmed;
    }

    if (avatar_url !== undefined) {
      if (typeof avatar_url !== "string") {
        return respErr("invalid avatar url");
      }

      payload.avatar_url = avatar_url.trim();
    }

    if (locale !== undefined) {
      if (typeof locale !== "string") {
        return respErr("invalid locale");
      }

      payload.locale = locale;
    }

    if (Object.keys(payload).length === 0) {
      return respErr("no changes provided");
    }

    const updatedUser = await updateUserProfile(user_uuid, payload);
    if (!updatedUser) {
      return respErr("failed to update user");
    }

    return respData(updatedUser);
  } catch (error) {
    console.error("update user info failed:", error);
    return respErr("update user info failed");
  }
}
