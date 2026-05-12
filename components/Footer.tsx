export function Footer() {
  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-[1900] p-3 sm:p-4">
      <div className="pointer-events-auto mx-auto max-w-[min(100%,720px)] rounded-xl bg-white/92 px-3 py-2 text-center shadow-md ring-1 ring-black/5 backdrop-blur dark:bg-stone-950/92 dark:ring-white/10">
        <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-400 sm:text-xs">
          문의나 피드백은 아래 메일로 보내 주시면 감사하겠습니다.
        </p>
        <p className="mt-1">
          <a
            href="mailto:sewon0325@gmail.com"
            className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-300 sm:text-sm"
          >
            sewon0325@gmail.com
          </a>
        </p>
      </div>
    </footer>
  );
}
