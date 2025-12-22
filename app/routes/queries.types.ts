import type { Prisma } from "../../prisma/client";

export type HomeData = Prisma.BoardGetPayload<{
  select: {
    id: true;
    name: true;
    color: true;
    accountId: true;
    _count: {
      select: {
        items: true;
        members: true;
      };
    };
  };
}>[];

export type BoardData = Prisma.BoardGetPayload<{
  include: {
    items: {
      include: {
        _count: { select: { comments: true } };
        createdByUser: {
          select: { id: true; firstName: true; lastName: true };
        };
        Assignee: { select: { id: true; name: true; userId: true } };
      };
    };
    columns: { orderBy: { order: "asc" } };
    members: {
      include: {
        Account: {
          select: { id: true; email: true; firstName: true; lastName: true };
        };
      };
    };
    invitations: {
      where: { status: "pending" };
      include: { Account: { select: { email: true } } };
    };
    assignees: {
      select: { id: true; name: true; userId: true };
      orderBy: { name: "asc" };
    };
  };
}>;

export type ActivityItem = Prisma.ActivityGetPayload<{
  include: {
    board: {
      select: { id: true; name: true; color: true };
    };
    item: {
      select: {
        id: true;
        title: true;
        columnId: true;
        Column: { select: { name: true } };
      };
    };
    user: {
      select: { id: true; firstName: true; lastName: true };
    };
  };
}>;
