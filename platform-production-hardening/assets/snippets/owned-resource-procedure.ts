import { TRPCError } from "@trpc/server";

type ResourceWithOwner = {
  id: string;
  ownerId: string | null;
};

type FetchResourceParams = {
  resourceId: string;
  userId: string;
};

type FetchResourceFn<T extends ResourceWithOwner> = (
  params: FetchResourceParams
) => Promise<T | null>;

export async function requireOwnedResource<T extends ResourceWithOwner>(
  fetchResource: FetchResourceFn<T>,
  input: { resourceId: string },
  ctx: { userId: string | null }
): Promise<T> {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const resource = await fetchResource({
    resourceId: input.resourceId,
    userId: ctx.userId,
  });

  if (!resource) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found." });
  }

  if (resource.ownerId !== ctx.userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
  }

  return resource;
}
