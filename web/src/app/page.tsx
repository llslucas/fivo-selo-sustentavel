import { redirect } from "next/navigation";

// A landing mora em /home; a raiz só redireciona para não quebrar os links para "/".
export default function Root() {
  redirect("/home");
}
