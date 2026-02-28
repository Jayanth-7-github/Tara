import { Button } from "./button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "./empty";
import { IconHome, IconCompass } from "@tabler/icons-react";

export default function NotFoundUi() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black text-white">
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="mask-b-from-20% mask-b-to-80% font-extrabold text-9xl">
            404
          </EmptyTitle>

          <EmptyDescription className="-mt-8 text-nowrap text-foreground/80">
            The page you're looking for might have been <br />
            moved or doesn't exist.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent>
          <div className="flex gap-3">
            <Button
              asChild
              className="rounded-full bg-neutral-200 px-7 py-3 text-black shadow-[0_0_0_1px_rgba(255,255,255,0.02)] hover:bg-neutral-100 transition-colors"
            >
              <a href="/">
                <IconHome className="size-4 mr-2" />
                Go Home
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              className="rounded-full border border-neutral-600 px-7 py-3 text-white hover:border-neutral-400 bg-transparent"
            >
              <a href="/events">
                <IconCompass className="size-4 mr-2" />
                Explore
              </a>
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
