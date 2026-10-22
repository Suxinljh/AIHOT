// The product entry: the workbench. The public reading site is retired, so `/` is only a redirect to
// the studio, whose own layout turns a missing session into the sign-in page.
import { redirect } from "react-router";

export function loader() {
  throw redirect("/studio");
}
