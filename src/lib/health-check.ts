import { allProducts, type Product } from "@/data/catalog";

/** The featured CMS service, irrespective of its section or display order. */
export function healthCheckProduct(): Product | undefined {
  return allProducts.find((product) =>
    product.status !== "hidden" &&
    (/health[\s-]*check/i.test(product.name) || /health[\s-]*check/i.test(product.slug))
  );
}
