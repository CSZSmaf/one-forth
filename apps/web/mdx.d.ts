declare module "*.mdx" {
  import type { ComponentType } from "react";

  const MdxContent: ComponentType<{
    readonly components?: Readonly<Record<string, unknown>>;
  }>;
  export default MdxContent;
}
