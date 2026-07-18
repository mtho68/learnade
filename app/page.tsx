import LearnadeApp from "./LearnadeApp";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <LearnadeApp openAIUser={user ? { displayName:user.displayName, email:user.email } : null} signInPath={chatGPTSignInPath("/")} signOutPath={chatGPTSignOutPath("/")} />;
}
