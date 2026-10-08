import { sarabunPsk } from "@/app/components/print/fonts";
import { W119Form } from "./w119-form";

export default function W119Page() {
  return <W119Form printFontClassName={sarabunPsk.className} />;
}
