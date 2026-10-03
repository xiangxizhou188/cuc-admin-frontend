import type { Metadata } from "next";
import { AdminApp } from "./admin-app";

export const metadata: Metadata = {
  title: "CUC Supply Admin",
  description: "Catalog, inventory, and content operations for CUC Supply.",
};

export default function Home() {
  return <AdminApp />;
}
