import { accountExists } from "./signup.queries";

export async function validate(
  firstName: string,
  lastName: string,
  email: string,
  password: string
) {
  let errors: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  } = {};

  if (!firstName || !firstName.trim()) {
    errors.firstName = "First name is required.";
  } else if (firstName.trim().length > 50) {
    errors.firstName = "First name must be 50 characters or less.";
  }

  if (!lastName || !lastName.trim()) {
    errors.lastName = "Last name is required.";
  } else if (lastName.trim().length > 50) {
    errors.lastName = "Last name must be 50 characters or less.";
  }

  if (!email) {
    errors.email = "Email is required.";
  } else if (!email.includes("@")) {
    errors.email = "Please enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  }

  if (!errors.email && (await accountExists(email))) {
    errors.email = "An account with this email already exists.";
  }

  return Object.keys(errors).length ? errors : null;
}
