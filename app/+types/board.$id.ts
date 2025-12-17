import type { loader } from "../routes/board.$id";

export type LoaderData = Awaited<ReturnType<typeof loader>>;
