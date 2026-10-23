// Old /studio/* bookmarks land on the workbench's root routes. Kept until the prefix is no longer in
// use anywhere; the page itself renders nothing.
import { redirect } from "react-router";

export function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const rest = url.pathname.replace(/^\/studio\/?/, "");
  throw redirect(`${rest ? `/${rest}` : "/"}${url.search}`, 302);
}

export default function LegacyStudio() {
  return null;
}
