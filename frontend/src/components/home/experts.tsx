import { Reveal } from "@/components/reveal";
import { initials, type InstructorSummary } from "./instructors";

const AVATAR_TONES = [
  { bg: "bg-gw-primary-soft", text: "text-gw-primary-hover" },
  { bg: "bg-gw-agent-bg", text: "text-gw-agent-2" },
];

export function Experts({ instructors }: { instructors: InstructorSummary[] }) {
  if (instructors.length === 0) return null;

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-16">
      <Reveal>
        <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-gw-text-faint mb-1.5">
          Who&apos;s teaching
        </div>
        <h2 className="font-serif text-[30px] tracking-tight">Learn from people who build it.</h2>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 mt-11">
        {instructors.map((instructor, i) => {
          const tone = AVATAR_TONES[i % AVATAR_TONES.length];
          return (
            <Reveal key={instructor.name} delay={i * 90}>
              <div className={i % 2 === 1 ? "lg:mt-7" : ""}>
                <div
                  className={`w-[64px] h-[64px] rounded-full flex items-center justify-center text-[19px] font-serif ${tone.bg} ${tone.text}`}
                >
                  {initials(instructor.name)}
                </div>
                <div className="text-[16.5px] font-semibold text-gw-ink mt-4">{instructor.name}</div>
                <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-gw-text-faint mt-1">
                  {instructor.category} · {instructor.count} course{instructor.count === 1 ? "" : "s"} · ★{" "}
                  {instructor.topRating.toFixed(1)}
                </div>
                <p className="font-serif italic text-[14.5px] leading-snug text-gw-text-muted mt-2.5 max-w-[26ch]">
                  Teaches &ldquo;{instructor.topCourseTitle}&rdquo;
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
