import { redirectWithClearedCookie } from "../auth/auth";

export function loader() {
  return redirectWithClearedCookie();
}

export function action() {
  return redirectWithClearedCookie();
}
