import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { cmsSiteContent, mergeCmsContent } from "@/lib/cms-content";
import { createCmsNavigation } from "@/lib/cms-navigation";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient, cmsNavigation: createCmsNavigation(cmsSiteContent, mergeCmsContent) },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
