"use client";

import Register1 from "@/components/register/Register1";
import Register2 from "@/components/register/Register2";
import Register3 from "@/components/register/Register3";
import { UserProvider } from "@/components/context/UserProvider";

export default function RegisterPage() {
  return (
    <UserProvider>
      <Register1 />
      <Register2 />
      <Register3 />
    </UserProvider>
  );
}
