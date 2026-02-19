import type { GetServerSideProps } from "next";
import { parseSessionToken } from "@/lib/auth/session";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const token = req.cookies?.fintrack_session;
  const session = token ? await parseSessionToken(token) : null;
  return {
    redirect: {
      destination: session ? "/dashboard" : "/login",
      permanent: false,
    },
  };
};

export default function HomeRedirect() {
  return null;
}
