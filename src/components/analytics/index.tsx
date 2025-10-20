import GoogleAnalytics from "./google-analytics";
import OpenPanelAnalytics from "./open-panel";
import Plausible from "./plausible";
import Clarity from "./clarity";

export default function Analytics() {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  return (
    <>
      <OpenPanelAnalytics />
      <GoogleAnalytics />
      <Plausible />
      <Clarity />
    </>
  );
}
