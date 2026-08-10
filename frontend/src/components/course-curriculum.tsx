import type { CourseContent } from "@/lib/types";

export function CourseCurriculum({ content }: { content: CourseContent }) {
  const lessonCount = content.sections.reduce((count, section) => count + section.lessons.length, 0);

  return (
    <section aria-labelledby="course-curriculum" className="mt-10 scroll-mt-24">
      <div className="flex items-end justify-between gap-4 border-b border-gw-border-soft pb-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-text-faint">Course curriculum</div>
          <h2 id="course-curriculum" className="mt-1.5 font-serif text-[30px] tracking-tight text-gw-ink">
            A practical path, section by section.
          </h2>
        </div>
        <span className="shrink-0 font-mono text-[10.5px] tracking-wide uppercase text-gw-text-faint">
          {content.sections.length} sections · {lessonCount} lessons
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-gw-border-soft bg-gw-surface shadow-[0_8px_24px_-18px_rgba(28,30,42,0.25)]">
        {content.sections.map((section, index) => (
          <details key={section.title} open={index === 0} className="group border-b border-gw-border-hairline last:border-0">
            <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 marker:content-none hover:bg-gw-surface-muted">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gw-primary-soft font-mono text-[10.5px] text-gw-primary-text">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-gw-ink">{section.title}</span>
                <span className="mt-0.5 block truncate text-[12.5px] text-gw-text-muted">{section.summary}</span>
              </span>
              <span className="hidden shrink-0 font-mono text-[10.5px] tracking-wide text-gw-text-faint sm:block">
                {section.lessons.length} lessons · {section.duration_label}
              </span>
              <span className="text-gw-text-faint transition-transform duration-200 group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <div className="border-t border-gw-border-hairline bg-gw-surface-muted px-5 py-4 sm:pl-[4.75rem]">
              <p className="max-w-[66ch] text-[13px] leading-relaxed text-gw-text">{section.summary}</p>
              <ol className="mt-3.5 divide-y divide-gw-border-hairline">
                {section.lessons.map((lesson, lessonIndex) => (
                  <li key={lesson.title} className="flex items-center gap-3 py-2.5 text-[13.5px] text-gw-text">
                    <span className="font-mono text-[10px] text-gw-text-placeholder">{String(lessonIndex + 1).padStart(2, "0")}</span>
                    <span className="flex-1">{lesson.title}</span>
                    <span className="font-mono text-[10.5px] text-gw-text-faint">{lesson.duration_label}</span>
                  </li>
                ))}
              </ol>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
